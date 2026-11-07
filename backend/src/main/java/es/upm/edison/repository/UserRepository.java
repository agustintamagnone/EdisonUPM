package es.upm.edison.repository;

import es.upm.edison.exception.UnauthorizedException;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.User;
import es.upm.edison.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    /** The user making the request, if any ({@code null} id means anonymous). */
    default Optional<User> findCurrent(UUID currentUserId) {
        return currentUserId == null ? Optional.empty() : findById(currentUserId);
    }

    default User requireCurrent(UUID currentUserId) {
        return findCurrent(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("You must be logged in to perform this action"));
    }

    Optional<User> findByEmailIgnoreCase(String email);

    List<User> findByRoleInOrderByFullNameAsc(List<UserRole> roles);

    @Query("select distinct i.founder from Idea i where i.status = :status order by i.founder.fullName")
    List<User> findFoundersWithIdeasIn(IdeaStatus status);
}
