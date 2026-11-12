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
import java.security.Principal;
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
    public UserResponse getMe(Principal principal) {
        return userService.getMe(CurrentUser.id(principal));
    }

    @PutMapping("/me")
    public UserResponse updateMe(Principal principal,
                                 @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateMe(CurrentUser.id(principal), request);
    }

    // ---------- Saved ideas ----------

    @GetMapping("/me/saved-ideas")
    public List<IdeaSummaryResponse> getSavedIdeas(Principal principal) {
        return userService.getSavedIdeas(CurrentUser.id(principal));
    }

    @PutMapping("/me/saved-ideas/{ideaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveIdea(Principal principal,
                         @PathVariable UUID ideaId) {
        userService.saveIdea(CurrentUser.id(principal), ideaId);
    }

    @DeleteMapping("/me/saved-ideas/{ideaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsaveIdea(Principal principal,
                           @PathVariable UUID ideaId) {
        userService.unsaveIdea(CurrentUser.id(principal), ideaId);
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
