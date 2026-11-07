package es.upm.edison.controller;

import es.upm.edison.config.CurrentUser;
import es.upm.edison.dto.IdeaSummaryResponse;
import es.upm.edison.dto.UpdateProfileRequest;
import es.upm.edison.dto.UserResponse;
import es.upm.edison.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** View user profiles, update own profile, browse founders and mentors, manage saved ideas. */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ---------- Own profile ----------

    @GetMapping("/me")
    public UserResponse getMe(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId) {
        return userService.getMe(userId);
    }

    @PutMapping("/me")
    public UserResponse updateMe(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                 @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateMe(userId, request);
    }

    // ---------- Saved ideas ----------

    @GetMapping("/me/saved-ideas")
    public List<IdeaSummaryResponse> getSavedIdeas(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId) {
        return userService.getSavedIdeas(userId);
    }

    @PutMapping("/me/saved-ideas/{ideaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveIdea(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                         @PathVariable UUID ideaId) {
        userService.saveIdea(userId, ideaId);
    }

    @DeleteMapping("/me/saved-ideas/{ideaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsaveIdea(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                           @PathVariable UUID ideaId) {
        userService.unsaveIdea(userId, ideaId);
    }

    // ---------- Founders, mentors and profiles ----------

    @GetMapping("/founders")
    public List<UserResponse> getFounders() {
        return userService.getFounders();
    }

    @GetMapping("/mentors")
    public List<UserResponse> getMentors() {
        return userService.getMentors();
    }

    @GetMapping("/{userId}")
    public UserResponse getUser(@PathVariable UUID userId) {
        return userService.getUser(userId);
    }
}
