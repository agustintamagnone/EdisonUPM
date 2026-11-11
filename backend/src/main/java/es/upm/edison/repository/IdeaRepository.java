package es.upm.edison.repository;

import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.IdeaTag;
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

    /** Browse and search published ideas. {@code query} and {@code tag} are optional filters. */
    @Query("""
            select distinct i from Idea i left join i.tags t
            where i.status = :status
              and i.visibility in :visibilities
              and (:tag is null or t = :tag)
              and (:query is null
                   or lower(i.title) like lower(concat('%', :query, '%'))
                   or lower(i.elevatorPitch) like lower(concat('%', :query, '%')))
            """)
    Page<Idea> search(IdeaStatus status, Collection<Visibility> visibilities, IdeaTag tag, String query, Pageable pageable);
}
