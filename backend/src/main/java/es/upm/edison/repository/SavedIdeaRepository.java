package es.upm.edison.repository;

import es.upm.edison.model.SavedIdea;
import es.upm.edison.model.SavedIdeaId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Part of the Idea repository in the MVC diagram (Idea, SavedIdea). */
public interface SavedIdeaRepository extends JpaRepository<SavedIdea, SavedIdeaId> {

    List<SavedIdea> findByUserIdOrderBySavedAtDesc(UUID userId);
}
