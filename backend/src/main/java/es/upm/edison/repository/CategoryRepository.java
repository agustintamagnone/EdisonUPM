package es.upm.edison.repository;

import es.upm.edison.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Part of the Idea repository in the MVC diagram (Idea, Category, SavedIdea). */
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findAllByOrderByNameAsc();
}
