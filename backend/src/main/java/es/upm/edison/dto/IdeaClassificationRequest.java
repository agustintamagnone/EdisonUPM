package es.upm.edison.dto;

import java.util.Set;
import java.util.UUID;

/** Wizard step 2 "MVP & proof": 1 or 2 categories and the development stage. */
public record IdeaClassificationRequest(Set<UUID> categoryIds, String developmentStage) {
}
