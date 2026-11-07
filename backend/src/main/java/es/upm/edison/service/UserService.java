package es.upm.edison.service;

import es.upm.edison.dto.IdeaSummaryResponse;
import es.upm.edison.dto.UpdateProfileRequest;
import es.upm.edison.dto.UserResponse;
import es.upm.edison.exception.NotFoundException;
import es.upm.edison.exception.ValidationException;
import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.SavedIdea;
import es.upm.edison.model.SavedIdeaId;
import es.upm.edison.model.User;
import es.upm.edison.model.UserRole;
import es.upm.edison.repository.IdeaRepository;
import es.upm.edison.repository.SavedIdeaRepository;
import es.upm.edison.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Manages user profiles and saved ideas, and finds founders, professors and mentors. */
@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final IdeaRepository ideaRepository;
    private final SavedIdeaRepository savedIdeaRepository;

    public UserService(UserRepository userRepository,
                       IdeaRepository ideaRepository,
                       SavedIdeaRepository savedIdeaRepository) {
        this.userRepository = userRepository;
        this.ideaRepository = ideaRepository;
        this.savedIdeaRepository = savedIdeaRepository;
    }

    // ---------- Profiles ----------

    @Transactional(readOnly = true)
    public UserResponse getUser(UUID userId) {
        return userRepository.findById(userId)
                .map(UserResponse::from)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public UserResponse getMe(UUID currentUserId) {
        return UserResponse.from(userRepository.requireCurrent(currentUserId));
    }

    public UserResponse updateMe(UUID currentUserId, UpdateProfileRequest request) {
        User user = userRepository.requireCurrent(currentUserId);
        user.setFullName(request.fullName().trim());
        return UserResponse.from(user);
    }

    // ---------- Founders and mentors ----------

    @Transactional(readOnly = true)
    public List<UserResponse> getFounders() {
        return userRepository.findFoundersWithIdeasIn(IdeaStatus.PUBLISHED).stream().map(UserResponse::from).toList();
    }

    /** Mentors are the professors of the university. */
    @Transactional(readOnly = true)
    public List<UserResponse> getMentors() {
        return userRepository.findByRoleInOrderByFullNameAsc(List.of(UserRole.PROFESSOR)).stream()
                .map(UserResponse::from)
                .toList();
    }

    // ---------- Saved ideas ----------

    @Transactional(readOnly = true)
    public List<IdeaSummaryResponse> getSavedIdeas(UUID currentUserId) {
        User user = userRepository.requireCurrent(currentUserId);
        return savedIdeaRepository.findByUserIdOrderBySavedAtDesc(user.getId()).stream()
                .map(SavedIdea::getIdea)
                .filter(idea -> idea.isVisibleTo(user))
                .map(IdeaSummaryResponse::from)
                .toList();
    }

    public void saveIdea(UUID currentUserId, UUID ideaId) {
        User user = userRepository.requireCurrent(currentUserId);
        Idea idea = IdeaAccess.loadVisible(ideaRepository, ideaId, user);
        if (idea.getStatus() != IdeaStatus.PUBLISHED) {
            throw new ValidationException("ideaId", "Only published ideas can be saved");
        }
        SavedIdeaId id = new SavedIdeaId(user.getId(), idea.getId());
        if (!savedIdeaRepository.existsById(id)) {
            savedIdeaRepository.save(new SavedIdea(user, idea));
        }
    }

    public void unsaveIdea(UUID currentUserId, UUID ideaId) {
        User user = userRepository.requireCurrent(currentUserId);
        savedIdeaRepository.deleteById(new SavedIdeaId(user.getId(), ideaId));
    }
}
