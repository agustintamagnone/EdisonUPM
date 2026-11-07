package es.upm.edison.exception;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Business validation errors, grouped by field or by wizard step
 * (e.g. "basics", "mvpProof", "review") so the frontend can reopen the first invalid step.
 */
public class ValidationException extends RuntimeException {

    private final Map<String, List<String>> errors;

    public ValidationException(Map<String, List<String>> errors) {
        super("Validation failed");
        this.errors = new LinkedHashMap<>(errors);
    }

    public ValidationException(String group, String message) {
        this(Map.of(group, List.of(message)));
    }

    public Map<String, List<String>> getErrors() {
        return errors;
    }
}
