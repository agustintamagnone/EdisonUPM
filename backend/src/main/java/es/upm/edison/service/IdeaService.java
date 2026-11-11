package es.upm.edison.service;

import es.upm.edison.dto.AttachmentResponse;
import es.upm.edison.dto.IdeaBasicsRequest;
import es.upm.edison.dto.IdeaClassificationRequest;
import es.upm.edison.dto.IdeaResponse;
import es.upm.edison.dto.IdeaSummaryResponse;
import es.upm.edison.dto.MvpLinkRequest;
import es.upm.edison.dto.PageResponse;
import es.upm.edison.dto.PublishIdeaRequest;
import es.upm.edison.exception.ForbiddenException;
import es.upm.edison.exception.ValidationException;
import es.upm.edison.model.DevelopmentStage;
import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.IdeaTag;
import es.upm.edison.model.User;
import es.upm.edison.model.UserRole;
import es.upm.edison.model.Visibility;
import es.upm.edison.repository.AttachmentRepository;
import es.upm.edison.repository.IdeaRepository;
import es.upm.edison.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Validates idea information, manages the publication process (DRAFT →
 * PUBLISHED → ARCHIVED),
 * checks founder permissions and manages the MVP link.
 */
@Service
@Transactional
public class IdeaService {

    static final int TITLE_MAX = 120;
    static final int ELEVATOR_PITCH_MAX = 300;
    static final int LONG_TEXT_MAX = 2000;
    static final int MAX_TAGS = 3;
    static final int MVP_URL_MAX = 2048;

    /** Error groups match the steps of the publication wizard. */
    static final String STEP_BASICS = "basics";
    static final String STEP_MVP_PROOF = "mvpProof";
    static final String STEP_REVIEW = "review";

    private final IdeaRepository ideaRepository;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;

    public IdeaService(IdeaRepository ideaRepository,
            UserRepository userRepository,
            AttachmentRepository attachmentRepository) {
        this.ideaRepository = ideaRepository;
        this.userRepository = userRepository;
        this.attachmentRepository = attachmentRepository;
    }

    // ---------- Browse and search ----------

    public List<IdeaTag> getTags() {
        return Arrays.asList(IdeaTag.values());
    }

    public List<DevelopmentStage> getDevelopmentStages() {
        return Arrays.asList(DevelopmentStage.values());
    }

    @Transactional(readOnly = true)
    public PageResponse<IdeaSummaryResponse> browse(UUID currentUserId, String query, IdeaTag tag, int page, int size) {
        User viewer = userRepository.findCurrent(currentUserId).orElse(null);
        Set<Visibility> visibilities = Idea.isUpmCommunityMember(viewer)
                ? Set.of(Visibility.PUBLIC, Visibility.UPM_COMMUNITY)
                : Set.of(Visibility.PUBLIC);
        String normalizedQuery = (query == null || query.isBlank()) ? null : query.trim();
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Direction.DESC, "publishedAt"));
        return PageResponse.from(
                ideaRepository.search(IdeaStatus.PUBLISHED, visibilities, tag, normalizedQuery, pageable),
                IdeaSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public IdeaResponse getIdea(UUID ideaId, UUID currentUserId) {
        User viewer = userRepository.findCurrent(currentUserId).orElse(null);
        return toResponse(IdeaAccess.loadVisible(ideaRepository, ideaId, viewer));
    }

    @Transactional(readOnly = true)
    public List<IdeaSummaryResponse> getMyIdeas(UUID currentUserId) {
        User user = userRepository.requireCurrent(currentUserId);
        return ideaRepository.findByFounderIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(IdeaSummaryResponse::from)
                .toList();
    }

    // ---------- Wizard step 1: Basics ----------

    public IdeaResponse createDraft(UUID currentUserId, IdeaBasicsRequest request) {
        User founder = userRepository.requireCurrent(currentUserId);
        if (founder.getRole() != UserRole.STUDENT) {
            throw new ForbiddenException("Only students can publish ideas");
        }
        throwIfInvalid(validateBasics(request.title(), request.elevatorPitch(),
                request.problemStatement(), request.solutionDescription()));

        Idea idea = new Idea(founder, request.title().trim(), request.elevatorPitch().trim(),
                request.problemStatement().trim(), request.solutionDescription().trim());
        return toResponse(ideaRepository.save(idea));
    }

    public IdeaResponse updateBasics(UUID ideaId, UUID currentUserId, IdeaBasicsRequest request) {
        Idea idea = IdeaAccess.loadOwnDraft(ideaRepository, ideaId, userRepository.requireCurrent(currentUserId));
        throwIfInvalid(validateBasics(request.title(), request.elevatorPitch(),
                request.problemStatement(), request.solutionDescription()));

        idea.setTitle(request.title().trim());
        idea.setElevatorPitch(request.elevatorPitch().trim());
        idea.setProblemStatement(request.problemStatement().trim());
        idea.setSolutionDescription(request.solutionDescription().trim());
        return toResponse(idea);
    }

    // ---------- Wizard step 2: MVP & proof ----------

    public IdeaResponse updateClassification(UUID ideaId, UUID currentUserId, IdeaClassificationRequest request) {
        Idea idea = IdeaAccess.loadOwnDraft(ideaRepository, ideaId, userRepository.requireCurrent(currentUserId));
        Set<IdeaTag> tags = request.tags() == null ? Set.of() : request.tags();

        List<String> errors = validateClassification(tags.size(), request.developmentStage());
        if (!errors.isEmpty()) {
            throw new ValidationException(Map.of(STEP_MVP_PROOF, errors));
        }

        idea.setTags(tags.isEmpty() ? EnumSet.noneOf(IdeaTag.class) : EnumSet.copyOf(tags));
        idea.setDevelopmentStage(request.developmentStage());
        return toResponse(idea);
    }

    public IdeaResponse setMvpLink(UUID ideaId, UUID currentUserId, MvpLinkRequest request) {
        Idea idea = IdeaAccess.loadOwnDraft(ideaRepository, ideaId, userRepository.requireCurrent(currentUserId));
        String url = request.mvpUrl() == null ? "" : request.mvpUrl().trim();
        if (!isValidHttpUrl(url)) {
            throw new ValidationException("mvpUrl", "The MVP link must be a valid HTTP or HTTPS URL");
        }
        idea.setMvpUrl(url);
        return toResponse(idea);
    }

    public IdeaResponse removeMvpLink(UUID ideaId, UUID currentUserId) {
        Idea idea = IdeaAccess.loadOwnDraft(ideaRepository, ideaId, userRepository.requireCurrent(currentUserId));
        idea.setMvpUrl(null);
        return toResponse(idea);
    }

    // ---------- Wizard step 3: Review & publish ----------

    public IdeaResponse publish(UUID ideaId, UUID currentUserId, PublishIdeaRequest request) {
        Idea idea = IdeaAccess.loadOwnDraft(ideaRepository, ideaId, userRepository.requireCurrent(currentUserId));

        Map<String, List<String>> errors = new LinkedHashMap<>();
        errors.putAll(validateBasics(idea.getTitle(), idea.getElevatorPitch(),
                idea.getProblemStatement(), idea.getSolutionDescription()));

        List<String> mvpErrors = new ArrayList<>(
                validateClassification(idea.getTags().size(), idea.getDevelopmentStage()));
        if (attachmentRepository.countByIdeaId(idea.getId()) > AttachmentService.MAX_SCREENSHOTS) {
            mvpErrors.add("An idea can have at most " + AttachmentService.MAX_SCREENSHOTS + " screenshots");
        }
        addIfAny(errors, STEP_MVP_PROOF, mvpErrors);

        List<String> reviewErrors = new ArrayList<>();
        if (request.visibility() == null) {
            reviewErrors.add("Select the visibility (PUBLIC or UPM_COMMUNITY)");
        }
        Set<UserRole> allowedRoles = request.allowedCommenterRoles() == null ? Set.of()
                : request.allowedCommenterRoles();
        if (request.feedbackEnabled() && allowedRoles.isEmpty()) {
            reviewErrors.add("Select at least one role allowed to comment, or disable feedback");
        }
        if (!request.declarationAccepted()) {
            reviewErrors.add("You must accept the publication declaration");
        }
        addIfAny(errors, STEP_REVIEW, reviewErrors);

        // On error the idea stays DRAFT and the frontend reopens the first invalid
        // step.
        throwIfInvalid(errors);

        idea.setStatus(IdeaStatus.PUBLISHED);
        idea.setPublishedAt(Instant.now());
        idea.setVisibility(request.visibility());
        idea.setFeedbackEnabled(request.feedbackEnabled());
        idea.setAllowedCommenterRoles(allowedRoles);
        return toResponse(idea);
    }

    public IdeaResponse archive(UUID ideaId, UUID currentUserId) {
        User user = userRepository.requireCurrent(currentUserId);
        Idea idea = IdeaAccess.load(ideaRepository, ideaId);
        if (!idea.isFoundedBy(user)) {
            throw new ForbiddenException("Only the founder can archive this idea");
        }
        if (idea.getStatus() == IdeaStatus.ARCHIVED) {
            throw new ValidationException("status", "The idea is already archived");
        }
        idea.setStatus(IdeaStatus.ARCHIVED);
        return toResponse(idea);
    }

    // ---------- Validation helpers ----------

    private Map<String, List<String>> validateBasics(String title, String elevatorPitch,
            String problemStatement, String solutionDescription) {
        List<String> errors = new ArrayList<>();
        requireText(errors, "Title", title, TITLE_MAX);
        requireText(errors, "Elevator pitch", elevatorPitch, ELEVATOR_PITCH_MAX);
        requireText(errors, "Problem statement", problemStatement, LONG_TEXT_MAX);
        requireText(errors, "Solution description", solutionDescription, LONG_TEXT_MAX);
        return errors.isEmpty() ? Map.of() : Map.of(STEP_BASICS, errors);
    }

    private List<String> validateClassification(int tagCount, DevelopmentStage developmentStage) {
        List<String> errors = new ArrayList<>();
        if (tagCount < 1) {
            errors.add("Select at least 1 tag");
        }
        if (tagCount > MAX_TAGS) {
            errors.add("Select 1, 2 or 3 tags");
        }
        if (developmentStage == null) {
            errors.add("Development stage is required");
        }
        return errors;
    }

    private static void requireText(List<String> errors, String field, String value, int maxLength) {
        if (value == null || value.isBlank()) {
            errors.add(field + " is required");
        } else if (value.trim().length() > maxLength) {
            errors.add(field + " must have at most " + maxLength + " characters");
        }
    }

    static boolean isValidHttpUrl(String value) {
        if (value == null || value.isBlank() || value.length() > MVP_URL_MAX) {
            return false;
        }
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            return scheme != null
                    && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    && uri.getHost() != null;
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private static void addIfAny(Map<String, List<String>> errors, String group, List<String> groupErrors) {
        if (!groupErrors.isEmpty()) {
            errors.put(group, groupErrors);
        }
    }

    private static void throwIfInvalid(Map<String, List<String>> errors) {
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }

    private IdeaResponse toResponse(Idea idea) {
        List<AttachmentResponse> screenshots = idea.getId() == null ? List.of()
                : attachmentRepository.findByIdeaIdOrderByDisplayOrderAsc(idea.getId()).stream()
                        .map(AttachmentResponse::from)
                        .toList();
        return IdeaResponse.from(idea, screenshots);
    }
}
