package es.upm.edison.dto;

import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.UserRole;
import es.upm.edison.model.Visibility;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public record IdeaResponse(
        UUID id,
        String title,
        String elevatorPitch,
        String problemStatement,
        String solutionDescription,
        String mvpUrl,
        IdeaStatus status,
        Visibility visibility,
        String developmentStage,
        boolean feedbackEnabled,
        Set<UserRole> allowedCommenterRoles,
        List<CategoryResponse> categories,
        UserResponse founder,
        List<AttachmentResponse> screenshots,
        Instant createdAt,
        Instant publishedAt) {

    public static IdeaResponse from(Idea idea, List<AttachmentResponse> screenshots) {
        return new IdeaResponse(
                idea.getId(),
                idea.getTitle(),
                idea.getElevatorPitch(),
                idea.getProblemStatement(),
                idea.getSolutionDescription(),
                idea.getMvpUrl(),
                idea.getStatus(),
                idea.getVisibility(),
                idea.getDevelopmentStage(),
                idea.isFeedbackEnabled(),
                Set.copyOf(idea.getAllowedCommenterRoles()),
                idea.getCategories().stream().map(CategoryResponse::from).toList(),
                UserResponse.from(idea.getFounder()),
                screenshots,
                idea.getCreatedAt(),
                idea.getPublishedAt());
    }
}
