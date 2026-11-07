package es.upm.edison.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

import java.time.Instant;

/** An idea bookmarked by a user. */
@Entity
@Table(name = "saved_ideas")
public class SavedIdea {

    @EmbeddedId
    private SavedIdeaId id;

    @MapsId("userId")
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @MapsId("ideaId")
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "idea_id")
    private Idea idea;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private Instant savedAt = Instant.now();

    protected SavedIdea() {
    }

    public SavedIdea(User user, Idea idea) {
        this.id = new SavedIdeaId(user.getId(), idea.getId());
        this.user = user;
        this.idea = idea;
    }

    public SavedIdeaId getId() { return id; }
    public User getUser() { return user; }
    public Idea getIdea() { return idea; }
    public Instant getSavedAt() { return savedAt; }
}
