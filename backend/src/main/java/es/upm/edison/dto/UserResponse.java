package es.upm.edison.dto;

import es.upm.edison.model.User;
import es.upm.edison.model.UserRole;

import java.util.UUID;

public record UserResponse(UUID id, String fullName, String email, UserRole role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}
