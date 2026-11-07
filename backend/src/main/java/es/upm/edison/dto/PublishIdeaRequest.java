package es.upm.edison.dto;

import es.upm.edison.model.UserRole;
import es.upm.edison.model.Visibility;

import java.util.Set;

/** Wizard step 3 "Review & publish". */
public record PublishIdeaRequest(
        boolean feedbackEnabled,
        Set<UserRole> allowedCommenterRoles,
        Visibility visibility,
        boolean declarationAccepted) {
}
