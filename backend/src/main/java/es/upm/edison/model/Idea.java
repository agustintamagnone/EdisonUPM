package es.upm.edison.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "ideas")
public class Idea {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "elevator_pitch", nullable = false, length = 300)
    private String elevatorPitch;

    @Column(name = "problem_statement", nullable = false, length = 2000)
    private String problemStatement;

    @Column(name = "solution_description", nullable = false, length = 2000)
    private String solutionDescription;

    /** External MVP link (HTTP/HTTPS). Optional. */
    @Column(name = "mvp_url", length = 2048)
    private String mvpUrl;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private IdeaStatus status = IdeaStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private Visibility visibility = Visibility.PUBLIC;

    /**
     * Development stage, stored in its own table (idea_stage, one row per idea).
     * Mapped as a collection with at most one element; use {@link #getDevelopmentStage()}.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "idea_stage", joinColumns = @JoinColumn(name = "idea_id"))
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "stage", nullable = false, length = 20)
    private Set<DevelopmentStage> stage = EnumSet.noneOf(DevelopmentStage.class);

    @Column(name = "feedback_enabled", nullable = false)
    private boolean feedbackEnabled = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "idea_allowed_commenter_roles", joinColumns = @JoinColumn(name = "idea_id"))
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "role", nullable = false, length = 20)
    private Set<UserRole> allowedCommenterRoles = EnumSet.allOf(UserRole.class);

    /** 1..3 tags (enforced when publishing). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "idea_tags", joinColumns = @JoinColumn(name = "idea_id"))
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "tag", nullable = false, length = 20)
    private Set<IdeaTag> tags = EnumSet.noneOf(IdeaTag.class);

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "founder_id", nullable = false)
    private User founder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt;

    protected Idea() {
    }

    public Idea(User founder, String title, String elevatorPitch, String problemStatement, String solutionDescription) {
        this.founder = founder;
        this.title = title;
        this.elevatorPitch = elevatorPitch;
        this.problemStatement = problemStatement;
        this.solutionDescription = solutionDescription;
    }

    public boolean isFoundedBy(User user) {
        return user != null && founder.getId().equals(user.getId());
    }

    /**
     * The founder always sees the idea. Everybody else only sees PUBLISHED ideas:
     * PUBLIC ones without logging in, UPM_COMMUNITY ones only as an authenticated Student or Professor.
     */
    public boolean isVisibleTo(User viewer) {
        if (isFoundedBy(viewer)) {
            return true;
        }
        if (status != IdeaStatus.PUBLISHED) {
            return false;
        }
        return visibility == Visibility.PUBLIC || isUpmCommunityMember(viewer);
    }

    public static boolean isUpmCommunityMember(User user) {
        return user != null && (user.getRole() == UserRole.STUDENT || user.getRole() == UserRole.PROFESSOR);
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getElevatorPitch() { return elevatorPitch; }
    public void setElevatorPitch(String elevatorPitch) { this.elevatorPitch = elevatorPitch; }
    public String getProblemStatement() { return problemStatement; }
    public void setProblemStatement(String problemStatement) { this.problemStatement = problemStatement; }
    public String getSolutionDescription() { return solutionDescription; }
    public void setSolutionDescription(String solutionDescription) { this.solutionDescription = solutionDescription; }
    public String getMvpUrl() { return mvpUrl; }
    public void setMvpUrl(String mvpUrl) { this.mvpUrl = mvpUrl; }
    public IdeaStatus getStatus() { return status; }
    public void setStatus(IdeaStatus status) { this.status = status; }
    public Visibility getVisibility() { return visibility; }
    public void setVisibility(Visibility visibility) { this.visibility = visibility; }
    public DevelopmentStage getDevelopmentStage() {
        return stage.isEmpty() ? null : stage.iterator().next();
    }
    public void setDevelopmentStage(DevelopmentStage developmentStage) {
        this.stage.clear();
        if (developmentStage != null) {
            this.stage.add(developmentStage);
        }
    }
    public boolean isFeedbackEnabled() { return feedbackEnabled; }
    public void setFeedbackEnabled(boolean feedbackEnabled) { this.feedbackEnabled = feedbackEnabled; }
    public Set<UserRole> getAllowedCommenterRoles() { return allowedCommenterRoles; }
    public void setAllowedCommenterRoles(Set<UserRole> roles) {
        this.allowedCommenterRoles.clear();
        this.allowedCommenterRoles.addAll(roles);
    }
    public Set<IdeaTag> getTags() { return tags; }
    public void setTags(Set<IdeaTag> tags) {
        this.tags.clear();
        this.tags.addAll(tags);
    }
    public User getFounder() { return founder; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
}
