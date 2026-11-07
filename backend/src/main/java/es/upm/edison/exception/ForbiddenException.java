package es.upm.edison.exception;

/** The user is authenticated but is not allowed to perform the action (e.g. not the founder). */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
