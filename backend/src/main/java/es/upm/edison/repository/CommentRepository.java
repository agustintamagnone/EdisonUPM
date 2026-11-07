package es.upm.edison.repository;

import es.upm.edison.model.Comment;
import es.upm.edison.model.CommentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByIdeaIdAndStatusOrderByCreatedAtDesc(UUID ideaId, CommentStatus status);

    long countByIdeaIdAndStatus(UUID ideaId, CommentStatus status);

    Optional<Comment> findByAuthorIdAndClientRequestId(UUID authorId, UUID clientRequestId);
}
