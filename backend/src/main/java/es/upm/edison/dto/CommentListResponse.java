package es.upm.edison.dto;

import java.util.List;

/** "Community Feedback": visible comments, newest first, plus the count shown in the UI. */
public record CommentListResponse(long count, List<CommentResponse> comments) {
}
