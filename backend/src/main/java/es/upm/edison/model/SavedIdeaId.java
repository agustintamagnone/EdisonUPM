package es.upm.edison.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class SavedIdeaId implements Serializable {

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "user_id", length = 36)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "idea_id", length = 36)
    private UUID ideaId;

    protected SavedIdeaId() {
    }

    public SavedIdeaId(UUID userId, UUID ideaId) {
        this.userId = userId;
        this.ideaId = ideaId;
    }

    public UUID getUserId() { return userId; }
    public UUID getIdeaId() { return ideaId; }

    @Override
    public boolean equals(Object o) {
        return o instanceof SavedIdeaId other && Objects.equals(userId, other.userId) && Objects.equals(ideaId, other.ideaId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, ideaId);
    }
}
