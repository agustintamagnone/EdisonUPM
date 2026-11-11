package es.upm.edison.dto;

import es.upm.edison.model.DevelopmentStage;
import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.IdeaTag;
import es.upm.edison.model.Visibility;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Lightweight idea used in listings (browse, "My ideas", saved ideas). */
public record IdeaSummaryResponse(
        UUID id,
        String title,
        String elevatorPitch,
        IdeaStatus status,
        Visibility visibility,
        DevelopmentStage developmentStage,
        List<IdeaTag> tags,
        UserResponse founder,
        Instant createdAt,
        Instant publishedAt) {

    public static IdeaSummaryResponse from(Idea idea) {
        return new IdeaSummaryResponse(
                idea.getId(),
                idea.getTitle(),
                idea.getElevatorPitch(),
                idea.getStatus(),
                idea.getVisibility(),
                idea.getDevelopmentStage(),
                idea.getTags().stream().sorted().toList(),
                UserResponse.from(idea.getFounder()),
                idea.getCreatedAt(),
                idea.getPublishedAt());
    }
}
