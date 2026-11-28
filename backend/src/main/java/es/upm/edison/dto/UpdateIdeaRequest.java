package es.upm.edison.dto;

import es.upm.edison.model.DevelopmentStage;
import es.upm.edison.model.IdeaTag;

import java.util.List;
import java.util.Set;

/** Full replacement of editable content; ownership, publication and permissions are unchanged. */
public record UpdateIdeaRequest(
        String title,
        String elevatorPitch,
        String problemStatement,
        String solutionDescription,
        String contact,
        Set<IdeaTag> tags,
        DevelopmentStage developmentStage,
        String mvpUrl,
        List<String> metrics) {
}
