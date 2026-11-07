package es.upm.edison.config;

/**
 * Identifies the user making a request.
 * <p>
 * TEMPORARY: until authentication (e.g. UPM SSO / JWT with Spring Security) is added, the frontend
 * sends the user id in the {@value #HEADER} header. Requests without it are treated as anonymous.
 */
public final class CurrentUser {

    public static final String HEADER = "X-User-Id";

    private CurrentUser() {
    }
}
