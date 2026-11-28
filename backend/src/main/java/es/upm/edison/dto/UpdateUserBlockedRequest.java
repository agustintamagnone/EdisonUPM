package es.upm.edison.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateUserBlockedRequest(@NotNull Boolean blocked) {
}
