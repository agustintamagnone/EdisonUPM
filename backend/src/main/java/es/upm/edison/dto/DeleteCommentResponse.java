package es.upm.edison.dto;

import java.util.UUID;

public record DeleteCommentResponse(UUID id, String message) {
}
