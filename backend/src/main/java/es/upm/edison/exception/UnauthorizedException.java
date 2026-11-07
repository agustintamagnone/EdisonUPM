package es.upm.edison.exception;

/** The action requires an authenticated user. */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
