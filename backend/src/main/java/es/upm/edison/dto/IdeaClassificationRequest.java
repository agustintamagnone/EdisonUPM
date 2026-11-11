package es.upm.edison.dto;

import es.upm.edison.model.DevelopmentStage;
import es.upm.edison.model.IdeaTag;

import java.util.Set;

/** Wizard step 2 "MVP & proof": 1, 2 or 3 tags and the development stage. */
public record IdeaClassificationRequest(Set<IdeaTag> tags, DevelopmentStage developmentStage) {
}
