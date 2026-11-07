package es.upm.edison.repository;

import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface IdeaRepository extends JpaRepository<Idea, UUID> {

    List<Idea> findByFounderIdOrderByCreatedAtDesc(UUID founderId);

    /** Browse and search published ideas. {@code query} and {@code categoryId} are optional filters. */
    @Query("""
            select distinct i from Idea i left join i.categories c
            where i.status = :status
              and i.visibility in :visibilities
              and (:categoryId is null or c.id = :categoryId)
              and (:query is null
                   or lower(i.title) like lower(concat('%', :query, '%'))
                   or lower(i.elevatorPitch) like lower(concat('%', :query, '%')))
            """)
    Page<Idea> search(IdeaStatus status, Collection<Visibility> visibilities, UUID categoryId, String query, Pageable pageable);
}
