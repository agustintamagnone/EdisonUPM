package es.upm.edison.dto;

import es.upm.edison.model.Comment;

import java.time.Instant;
import java.util.UUID;

public record CommentResponse(
        UUID id,
        UUID ideaId,
        UserResponse author,
        String content,
        Instant createdAt,
        Instant updatedAt) {

    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getIdea().getId(),
                UserResponse.from(comment.getAuthor()),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.getUpdatedAt());
    }
}
