package es.upm.edison;

import es.upm.edison.model.*;
import es.upm.edison.repository.CommentRepository;
import es.upm.edison.repository.IdeaRepository;
import es.upm.edison.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:idea_management;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=file:../database/01_schema.sql",
        "spring.jpa.hibernate.ddl-auto=validate",
        "edison.storage.images-dir=target/idea-management-images"
})
class UserActivityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired IdeaRepository ideas;
    @Autowired CommentRepository comments;

    private User admin, target, other;

    @BeforeEach
    void setUp() {
        admin = createUser(UserRole.ADMINISTRATOR);
        target = createUser(UserRole.STUDENT);
        other = createUser(UserRole.STUDENT);
    }

    private User createUser(UserRole role) {
        return users.save(new User("Activity tester", UUID.randomUUID() + "@example.com", role,
                "$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y", false));
    }

    private Idea createIdea(User founder, IdeaStatus state) {
        Idea idea = new Idea(founder, UUID.randomUUID().toString(), "Pitch", "Problem", "Solution");
        idea.setStatus(state);
        idea.setVisibility(Visibility.UPM_COMMUNITY);
        idea.setTags(Set.of(IdeaTag.SOFTWARE));
        idea.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        if (state != IdeaStatus.DRAFT) idea.setPublishedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return ideas.save(idea);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void adminSeesOnlyTheSelectedUsersContentIncludingHiddenAndUnpublishedContent(boolean blocked) throws Exception {
        target.setBlocked(blocked);
        users.save(target);
        List<Idea> owned = new ArrayList<>();
        for (IdeaStatus state : IdeaStatus.values()) owned.add(createIdea(target, state));
        Idea unrelated = createIdea(other, IdeaStatus.DRAFT);
        Comment ownIdeaComment = comments.save(new Comment(owned.getFirst(), target, "Own idea feedback", UUID.randomUUID()));
        Comment otherIdeaComment = comments.save(new Comment(unrelated, target, "Other idea feedback", UUID.randomUUID()));
        Comment legacy = new Comment(unrelated, target, "Legacy hidden feedback", UUID.randomUUID());
        legacy.setStatus(CommentStatus.DELETED);
        legacy = comments.save(legacy);
        comments.save(new Comment(owned.getFirst(), other, "Someone else's feedback", UUID.randomUUID()));

        mvc.perform(get("/api/users/{id}/activity", target.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(target.getId().toString()))
                .andExpect(jsonPath("$.user.fullName").value(target.getFullName()))
                .andExpect(jsonPath("$.user.email").value(target.getEmail()))
                .andExpect(jsonPath("$.user.role").value("STUDENT"))
                .andExpect(jsonPath("$.user.blocked").value(blocked))
                .andExpect(jsonPath("$.ideaCount").value(3)).andExpect(jsonPath("$.ideas.length()").value(3))
                .andExpect(jsonPath("$.ideas[*].id", containsInAnyOrder(owned.stream().map(idea -> idea.getId().toString()).toArray())))
                .andExpect(jsonPath("$.ideas[*].status", containsInAnyOrder("DRAFT", "PUBLISHED", "ARCHIVED")))
                .andExpect(jsonPath("$.ideas[0].founder.id").value(target.getId().toString()))
                .andExpect(jsonPath("$.commentCount").value(3)).andExpect(jsonPath("$.comments.length()").value(3))
                .andExpect(jsonPath("$.comments[*].id", containsInAnyOrder(ownIdeaComment.getId().toString(),
                        otherIdeaComment.getId().toString(), legacy.getId().toString())))
                .andExpect(jsonPath("$.comments[*].content", containsInAnyOrder("Own idea feedback", "Other idea feedback", "Legacy hidden feedback")))
                .andExpect(jsonPath("$.comments[*].ideaId", containsInAnyOrder(owned.getFirst().getId().toString(),
                        unrelated.getId().toString(), unrelated.getId().toString())))
                .andExpect(jsonPath("$.comments[0].author.id").value(target.getId().toString()))
                .andExpect(jsonPath("$.user.password").doesNotExist()).andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.ideas[0].founder.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.comments[0].author.passwordHash").doesNotExist());
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void usersWithoutContentReturnZeroCountsAndEmptyListsForAnyRole(UserRole role) throws Exception {
        User empty = role == UserRole.ADMINISTRATOR ? admin : createUser(role);
        mvc.perform(get("/api/users/{id}/activity", empty.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value(role.name()))
                .andExpect(jsonPath("$.ideaCount").value(0)).andExpect(jsonPath("$.ideas").isEmpty())
                .andExpect(jsonPath("$.commentCount").value(0)).andExpect(jsonPath("$.comments").isEmpty());
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"STUDENT", "PROFESSOR", "INVESTOR"})
    void nonAdminsCannotReadEvenTheirOwnActivityOrForgeTheirRole(UserRole role) throws Exception {
        User caller = createUser(role);
        for (UUID id : List.of(caller.getId(), target.getId(), UUID.randomUUID())) {
            mvc.perform(get("/api/users/{id}/activity", id)
                            .with(user(caller.getId().toString()).roles("ADMINISTRATOR")))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void anonymousRequestsAndSpoofedUserHeadersCannotAccessActivity() throws Exception {
        mvc.perform(get("/api/users/{id}/activity", target.getId()).header("X-User-Id", admin.getId()))
                .andExpect(status().isUnauthorized());
        // The existing public profile remains accessible.
        mvc.perform(get("/api/users/{id}", target.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(target.getId().toString()));
    }

    @Test
    void missingAndMalformedUserIdsReturnTheExistingApiErrors() throws Exception {
        mvc.perform(get("/api/users/{id}/activity", UUID.randomUUID()).with(user(admin.getId().toString())))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/users/invalid-id/activity").with(user(admin.getId().toString())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void existingBlockEndpointUpdatesTheStateShownInActivityWithoutRemovingContent() throws Exception {
        createIdea(target, IdeaStatus.PUBLISHED);
        for (boolean blocked : List.of(true, false)) {
            mvc.perform(put("/api/users/{id}/blocked", target.getId()).with(user(admin.getId().toString())).with(csrf())
                            .contentType("application/json").content("{\"blocked\":" + blocked + "}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.user.blocked").value(blocked));
            mvc.perform(get("/api/users/{id}/activity", target.getId()).with(user(admin.getId().toString())))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.user.blocked").value(blocked))
                    .andExpect(jsonPath("$.ideaCount").value(1)).andExpect(jsonPath("$.ideas.length()").value(1));
        }
    }

    @Test
    void permanentlyDeletedContentDisappearsFromTheListsAndCounts() throws Exception {
        Idea owned = createIdea(target, IdeaStatus.PUBLISHED);
        Idea unrelated = createIdea(other, IdeaStatus.PUBLISHED);
        comments.save(new Comment(owned, target, "Deleted with the idea", UUID.randomUUID()));
        Comment deleted = comments.save(new Comment(unrelated, target, "Deleted individually", UUID.randomUUID()));
        mvc.perform(delete("/api/ideas/{id}", owned.getId()).with(user(admin.getId().toString())).with(csrf()))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/comments/{id}", deleted.getId()).with(user(admin.getId().toString())).with(csrf()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/users/{id}/activity", target.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ideaCount").value(0)).andExpect(jsonPath("$.ideas").isEmpty())
                .andExpect(jsonPath("$.commentCount").value(0)).andExpect(jsonPath("$.comments").isEmpty());
    }
}
