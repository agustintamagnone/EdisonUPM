package es.upm.edison.service;

import es.upm.edison.dto.AttachmentResponse;
import es.upm.edison.exception.NotFoundException;
import es.upm.edison.exception.ValidationException;
import es.upm.edison.model.Attachment;
import es.upm.edison.model.Idea;
import es.upm.edison.model.User;
import es.upm.edison.repository.AttachmentRepository;
import es.upm.edison.repository.IdeaRepository;
import es.upm.edison.repository.UserRepository;
import es.upm.edison.service.storage.ImageStorage;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Screenshots of a draft idea: checks the founder owns the draft, enforces max. 5 screenshots,
 * validates type (PNG/JPG/WebP) and size (5 MB), stores/deletes image files and keeps the display order.
 */
@Service
@Transactional
public class AttachmentService {

    public static final int MAX_SCREENSHOTS = 5;
    public static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    /** Allowed content types and the extension used to store them. */
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp");

    private final AttachmentRepository attachmentRepository;
    private final IdeaRepository ideaRepository;
    private final UserRepository userRepository;
    private final ImageStorage imageStorage;

    public AttachmentService(AttachmentRepository attachmentRepository,
                             IdeaRepository ideaRepository,
                             UserRepository userRepository,
                             ImageStorage imageStorage) {
        this.attachmentRepository = attachmentRepository;
        this.ideaRepository = ideaRepository;
        this.userRepository = userRepository;
        this.imageStorage = imageStorage;
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> list(UUID ideaId, UUID currentUserId) {
        User viewer = userRepository.findCurrent(currentUserId).orElse(null);
        IdeaAccess.loadVisible(ideaRepository, ideaId, viewer);
        return attachmentRepository.findByIdeaIdOrderByDisplayOrderAsc(ideaId).stream()
                .map(AttachmentResponse::from)
                .toList();
    }

    public AttachmentResponse upload(UUID ideaId, UUID currentUserId, MultipartFile file) {
        Idea idea = IdeaAccess.loadOwnDraft(ideaRepository, ideaId, userRepository.requireCurrent(currentUserId));

        long count = attachmentRepository.countByIdeaId(ideaId);
        if (count >= MAX_SCREENSHOTS) {
            throw new ValidationException("file", "An idea can have at most " + MAX_SCREENSHOTS + " screenshots");
        }
        String extension = validateImage(file);

        String storageKey;
        try (InputStream content = file.getInputStream()) {
            storageKey = imageStorage.store(content, extension);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read uploaded file", e);
        }
        // If the database insert fails, do not leave an orphan file in the storage.
        afterRollback(() -> imageStorage.delete(storageKey));

        Attachment attachment = new Attachment(idea, originalName(file), file.getContentType(),
                file.getSize(), storageKey, (int) count);
        return AttachmentResponse.from(attachmentRepository.save(attachment));
    }

    public void remove(UUID ideaId, UUID attachmentId, UUID currentUserId) {
        IdeaAccess.loadOwnDraft(ideaRepository, ideaId, userRepository.requireCurrent(currentUserId));
        Attachment attachment = loadAttachment(ideaId, attachmentId);

        attachmentRepository.delete(attachment);
        // Delete the file only once the database change is committed.
        afterCommit(() -> imageStorage.delete(attachment.getStorageKey()));

        // Keep display order consecutive: 0, 1, 2...
        List<Attachment> remaining = attachmentRepository.findByIdeaIdOrderByDisplayOrderAsc(ideaId).stream()
                .filter(a -> !a.getId().equals(attachmentId))
                .toList();
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setDisplayOrder(i);
        }
    }

    @Transactional(readOnly = true)
    public StoredImage loadFile(UUID ideaId, UUID attachmentId, UUID currentUserId) {
        User viewer = userRepository.findCurrent(currentUserId).orElse(null);
        IdeaAccess.loadVisible(ideaRepository, ideaId, viewer);
        Attachment attachment = loadAttachment(ideaId, attachmentId);
        Resource resource = imageStorage.load(attachment.getStorageKey());
        if (!resource.exists()) {
            throw new NotFoundException("Screenshot file not found");
        }
        return new StoredImage(resource, attachment.getContentType(), attachment.getFileName());
    }

    public record StoredImage(Resource resource, String contentType, String fileName) {
    }

    // ---------- Helpers ----------

    private Attachment loadAttachment(UUID ideaId, UUID attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .filter(a -> a.getIdea().getId().equals(ideaId))
                .orElseThrow(() -> new NotFoundException("Screenshot not found"));
    }

    /** Returns the storage extension, or throws if the file is not a PNG/JPG/WebP of at most 5 MB. */
    private String validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("file", "Select an image file");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ValidationException("file", "The image must be at most 5 MB");
        }
        String extension = ALLOWED_TYPES.get(file.getContentType());
        if (extension == null || !hasExpectedSignature(file, extension)) {
            throw new ValidationException("file", "Only PNG, JPG and WebP images are allowed");
        }
        return extension;
    }

    /** Checks the first bytes of the file so a renamed non-image is not accepted. */
    private static boolean hasExpectedSignature(MultipartFile file, String extension) {
        try (InputStream in = file.getInputStream()) {
            byte[] header = in.readNBytes(12);
            return switch (extension) {
                case "png" -> startsWith(header, 0x89, 'P', 'N', 'G');
                case "jpg" -> startsWith(header, 0xFF, 0xD8, 0xFF);
                case "webp" -> startsWith(header, 'R', 'I', 'F', 'F')
                        && header.length >= 12 && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
                default -> false;
            };
        } catch (IOException e) {
            return false;
        }
    }

    private static boolean startsWith(byte[] data, int... expected) {
        if (data.length < expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((data[i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }

    private static String originalName(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null || name.isBlank()) {
            return "screenshot";
        }
        // Keep only the file name (some browsers send the full path) and limit its length.
        String baseName = Arrays.stream(name.split("[/\\\\]")).reduce((a, b) -> b).orElse(name);
        return baseName.length() > 255 ? baseName.substring(baseName.length() - 255) : baseName;
    }

    private static void afterCommit(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private static void afterRollback(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    action.run();
                }
            }
        });
    }
}
