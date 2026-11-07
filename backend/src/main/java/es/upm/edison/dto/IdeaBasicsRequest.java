package es.upm.edison.dto;

/** Wizard step 1 "Basics". Validated in IdeaService so errors can be grouped by step. */
public record IdeaBasicsRequest(String title, String elevatorPitch, String problemStatement, String solutionDescription) {
}
