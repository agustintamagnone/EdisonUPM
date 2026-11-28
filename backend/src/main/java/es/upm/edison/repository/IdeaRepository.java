package es.upm.edison.repository;

import es.upm.edison.model.Idea;
import es.upm.edison.model.DevelopmentStage;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.IdeaTag;
import es.upm.edison.model.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface IdeaRepository extends JpaRepository<Idea, UUID> {

    List<Idea> findByFounderIdOrderByCreatedAtDesc(UUID founderId);

    /** Delete collection rows through Hibernate and dependent entities through SQL cascades. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Idea i where i.id = :ideaId")
    void deletePermanentlyById(UUID ideaId);

    /** Browse ideas in the permitted states. Text and stage filters are optional. */
    @Query("""
            select i from Idea i
            where i.status in :statuses
              and (:includeBlocked = true or i.founder.blocked = false)
              and i.visibility in :visibilities
              and (:stage is null or :stage member of i.stage)
              and (:query is null
                   or lower(i.title) like lower(concat('%', :query, '%'))
                   or lower(i.elevatorPitch) like lower(concat('%', :query, '%')))
            """)
    Page<Idea> search(Collection<IdeaStatus> statuses, Collection<Visibility> visibilities, boolean includeBlocked,
                      DevelopmentStage stage, String query, Pageable pageable);

    /** Match any selected tag and rank by matches, then newest publication. */
    @Query(value = """
            select i from Idea i join i.tags t
            where i.status in :statuses
              and (:includeBlocked = true or i.founder.blocked = false)
              and i.visibility in :visibilities
              and t in :tags
              and (:stage is null or :stage member of i.stage)
              and (:query is null
                   or lower(i.title) like lower(concat('%', :query, '%'))
                   or lower(i.elevatorPitch) like lower(concat('%', :query, '%')))
            group by i
            order by count(t) desc, i.publishedAt desc, i.id asc
            """, countQuery = """
            select count(distinct i.id) from Idea i join i.tags t
            where i.status in :statuses
              and (:includeBlocked = true or i.founder.blocked = false)
              and i.visibility in :visibilities
              and t in :tags
              and (:stage is null or :stage member of i.stage)
              and (:query is null
                   or lower(i.title) like lower(concat('%', :query, '%'))
                   or lower(i.elevatorPitch) like lower(concat('%', :query, '%')))
            """)
    Page<Idea> searchByTags(Collection<IdeaStatus> statuses, Collection<Visibility> visibilities, boolean includeBlocked,
                            Collection<IdeaTag> tags, DevelopmentStage stage, String query, Pageable pageable);
}
