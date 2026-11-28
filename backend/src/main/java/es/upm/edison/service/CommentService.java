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

/** Validates comments and author/admin permissions, and permanently deletes comments. */
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
        Idea idea = loadForComments(ideaId, viewer);
        List<Comment> storedComments = viewer != null && viewer.isAdministrator()
                ? commentRepository.findByIdeaIdOrderByCreatedAtDesc(idea.getId())
                : commentRepository.findByIdeaIdAndStatusAndAuthorBlockedFalseOrderByCreatedAtDesc(idea.getId(), CommentStatus.VISIBLE);
        List<CommentResponse> comments = storedComments.stream()
                .map(CommentResponse::from)
                .toList();
        return new CommentListResponse(comments.size(), comments);
    }

    public CommentResponse create(UUID ideaId, UUID currentUserId, CommentRequest request) {
        User author = userRepository.requireCurrent(currentUserId);
        Idea idea = loadForComments(ideaId, author);
        checkCanComment(idea, author);

        // Idempotent request: the same clientRequestId returns the comment already created.
        if (request.clientRequestId() != null) {
            Optional<Comment> existing = commentRepository.findByAuthorIdAndClientRequestId(author.getId(), request.clientRequestId());
            if (existing.isPresent()) {
                if (!existing.get().getIdea().getId().equals(ideaId)) {
                    throw new ValidationException("clientRequestId", "This creation key belongs to another idea");
                }
                return CommentResponse.from(existing.get());
            }
        }

        String content = validateContent(request.content());

        Comment comment = new Comment(idea, author, content, request.clientRequestId());
        return CommentResponse.from(commentRepository.save(comment));
    }

    public CommentResponse update(UUID commentId, UUID currentUserId, CommentRequest request) {
        Comment comment = loadManageableComment(commentId, userRepository.requireCurrent(currentUserId));
        comment.setContent(validateContent(request.content()));
        comment.setUpdatedAt(Instant.now());
        return CommentResponse.from(comment);
    }

    /** Permanently remove the comment; the idea and other comments are preserved. */
    public void delete(UUID commentId, UUID currentUserId) {
        Comment comment = loadManageableComment(commentId, userRepository.requireCurrent(currentUserId));
        commentRepository.delete(comment);
    }

    // ---------- Rules ----------

    private Idea loadForComments(UUID ideaId, User viewer) {
        Idea idea = IdeaAccess.loadVisible(ideaRepository, ideaId, viewer);
        if (idea.getStatus() != IdeaStatus.PUBLISHED && (viewer == null || !viewer.isAdministrator())) {
            throw new NotFoundException("Idea unavailable");
        }
        return idea;
    }

    /** Founders and administrators can answer; others need feedback enabled and an allowed role. */
    private static void checkCanComment(Idea idea, User user) {
        if (user.isAdministrator() || idea.isFoundedBy(user)) {
            return;
        }
        if (!idea.isFeedbackEnabled()) {
            throw new ForbiddenException("Feedback is disabled for this idea");
        }
        if (!idea.getAllowedCommenterRoles().contains(user.getRole())) {
            throw new ForbiddenException("Your role is not allowed to comment on this idea");
        }
    }

    private Comment loadManageableComment(UUID commentId, User user) {
        Comment comment = commentRepository.findById(commentId)
                .filter(c -> user.isAdministrator() || (c.getStatus() == CommentStatus.VISIBLE
                        && !c.getAuthor().isBlocked() && !c.getIdea().getFounder().isBlocked()))
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        if (!comment.isWrittenBy(user) && !user.isAdministrator()) {
            throw new ForbiddenException("Only the author or an administrator can modify this comment");
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
