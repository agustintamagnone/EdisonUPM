package es.upm.edison.repository;

import es.upm.edison.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {

    List<Attachment> findByIdeaIdOrderByDisplayOrderAsc(UUID ideaId);

    long countByIdeaId(UUID ideaId);
}
