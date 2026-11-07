package es.upm.edison.exception;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ApiError(Instant timestamp, int status, String message, Map<String, List<String>> errors) {

    public static ApiError of(int status, String message) {
        return new ApiError(Instant.now(), status, message, Map.of());
    }
}
