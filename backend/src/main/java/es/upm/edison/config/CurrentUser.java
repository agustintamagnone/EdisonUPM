package es.upm.edison.config;

import java.security.Principal;
import java.util.UUID;

/** Resolves the UUID established by Spring Security; null means anonymous. */
public final class CurrentUser {
    private CurrentUser() {
    }

    public static UUID id(Principal principal) {
        return principal == null ? null : UUID.fromString(principal.getName());
    }
}
