package es.upm.edison.dto;

import java.util.List;

/** Current content authored by one user, including content hidden from public views. */
public record UserActivityResponse(
        UserResponse user,
        int ideaCount,
        List<IdeaSummaryResponse> ideas,
        int commentCount,
        List<CommentResponse> comments) {
}
