package es.upm.edison.service;

import es.upm.edison.dto.CommentListResponse;
import es.upm.edison.dto.CommentRequest;
import es.upm.edison.dto.CommentResponse;
import es.upm.edison.exception.ForbiddenException;
import es.upm.edison.exception.NotFoundException;
import es.upm.edison.exception.ValidationException;
import es.upm.edison.model.Comment;
import es.upm.edison.model.CommentStatus;
import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.User;
import es.upm.edison.repository.CommentRepository;
import es.upm.edison.repository.IdeaRepository;
import es.upm.edison.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Validates comments, checks feedback permissions and applies soft deletion. */
@Service
@Transactional
public class CommentService {

    /** Anything that looks like "scheme:" followed by a link (e.g. https://..., javascript:...). */
    private static final Pattern URL_SCHEME = Pattern.compile("\\b([a-zA-Z][a-zA-Z0-9+.-]*):(//)?\\S+");
    private static final List<String> DANGEROUS_SCHEMES = List.of("javascript", "data", "vbscript", "file");

    private final CommentRepository commentRepository;
    private final IdeaRepository ideaRepository;
    private final UserRepository userRepository;

    public CommentService(CommentRepository commentRepository,
                          IdeaRepository ideaRepository,
                          UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.ideaRepository = ideaRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CommentListResponse list(UUID ideaId, UUID currentUserId) {
        User viewer = userRepository.findCurrent(currentUserId).orElse(null);
        Idea idea = loadPublishedVisible(ideaId, viewer);
        List<CommentResponse> comments = commentRepository
                .findByIdeaIdAndStatusOrderByCreatedAtDesc(idea.getId(), CommentStatus.VISIBLE).stream()
                .map(CommentResponse::from)
                .toList();
        return new CommentListResponse(comments.size(), comments);
    }

    public CommentResponse create(UUID ideaId, UUID currentUserId, CommentRequest request) {
        User author = userRepository.requireCurrent(currentUserId);

        // Idempotent request: the same clientRequestId returns the comment already created.
        if (request.clientRequestId() != null) {
            Optional<Comment> existing = commentRepository.findByAuthorIdAndClientRequestId(author.getId(), request.clientRequestId());
            if (existing.isPresent()) {
                return CommentResponse.from(existing.get());
            }
        }

        // Verify again: idea PUBLISHED, user permission and content.
        Idea idea = loadPublishedVisible(ideaId, author);
        checkCanComment(idea, author);
        String content = validateContent(request.content());

        Comment comment = new Comment(idea, author, content, request.clientRequestId());
        return CommentResponse.from(commentRepository.save(comment));
    }

    public CommentResponse update(UUID commentId, UUID currentUserId, CommentRequest request) {
        Comment comment = loadOwnVisibleComment(commentId, userRepository.requireCurrent(currentUserId));
        comment.setContent(validateContent(request.content()));
        comment.setUpdatedAt(Instant.now());
        return CommentResponse.from(comment);
    }

    /** Soft deletion: the comment is kept in the database with status DELETED. */
    public void delete(UUID commentId, UUID currentUserId) {
        Comment comment = loadOwnVisibleComment(commentId, userRepository.requireCurrent(currentUserId));
        comment.setStatus(CommentStatus.DELETED);
        comment.setUpdatedAt(Instant.now());
    }

    // ---------- Rules ----------

    private Idea loadPublishedVisible(UUID ideaId, User viewer) {
        Idea idea = IdeaAccess.loadVisible(ideaRepository, ideaId, viewer);
        if (idea.getStatus() != IdeaStatus.PUBLISHED) {
            throw new NotFoundException("Idea unavailable");
        }
        return idea;
    }

    /** The founder can always answer; other users need feedback enabled and an allowed role. */
    private static void checkCanComment(Idea idea, User user) {
        if (idea.isFoundedBy(user)) {
            return;
        }
        if (!idea.isFeedbackEnabled()) {
            throw new ForbiddenException("Feedback is disabled for this idea");
        }
        if (!idea.getAllowedCommenterRoles().contains(user.getRole())) {
            throw new ForbiddenException("Your role is not allowed to comment on this idea");
        }
    }

    private Comment loadOwnVisibleComment(UUID commentId, User user) {
        Comment comment = commentRepository.findById(commentId)
                .filter(c -> c.getStatus() == CommentStatus.VISIBLE)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        if (!comment.isWrittenBy(user)) {
            throw new ForbiddenException("You can only modify your own comments");
        }
        return comment;
    }

    /** Trims the content and checks: not empty, max. 500 characters, only HTTP/HTTPS URLs. */
    static String validateContent(String rawContent) {
        String content = rawContent == null ? "" : rawContent.trim();
        List<String> errors = new ArrayList<>();
        if (content.isEmpty()) {
            errors.add("The comment cannot be empty");
        } else if (content.length() > Comment.MAX_LENGTH) {
            errors.add("The comment must have at most " + Comment.MAX_LENGTH + " characters");
        }
        Matcher matcher = URL_SCHEME.matcher(content);
        while (matcher.find()) {
            String scheme = matcher.group(1).toLowerCase();
            boolean isLink = matcher.group(2) != null || DANGEROUS_SCHEMES.contains(scheme);
            if (isLink && !scheme.equals("http") && !scheme.equals("https")) {
                errors.add("Only HTTP and HTTPS links are allowed");
                break;
            }
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(Map.of("content", errors));
        }
        return content;
    }
}
