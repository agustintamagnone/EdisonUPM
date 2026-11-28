package es.upm.edison;

import es.upm.edison.model.*;
import es.upm.edison.repository.*;
import es.upm.edison.service.storage.ImageStorage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.*;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.*;
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
class UserBlockingIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired IdeaRepository ideas;
    @Autowired CommentRepository comments;
    @Autowired AttachmentRepository attachments;
    @Autowired SavedIdeaRepository saved;
    @Autowired ImageStorage images;

    private User admin, target, active;
    private String scope;
    private final List<String> imageKeys = new ArrayList<>();

    @BeforeEach
    void setUp() {
        scope = UUID.randomUUID().toString();
        admin = createUser(UserRole.ADMINISTRATOR);
        target = createUser(UserRole.STUDENT);
        active = createUser(UserRole.STUDENT);
    }

    @AfterEach
    void removeImageFiles() {
        imageKeys.forEach(images::delete);
    }

    private User createUser(UserRole role) {
        return users.save(new User("Blocking tester", UUID.randomUUID() + "@example.com", role,
                "$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y", false));
    }

    private Idea createIdea(User founder, IdeaStatus state, Visibility visibility) {
        Idea idea = new Idea(founder, scope + " " + UUID.randomUUID(), "Pitch", "Problem", "Solution");
        idea.setStatus(state);
        idea.setVisibility(visibility);
        idea.setTags(Set.of(IdeaTag.SOFTWARE));
        idea.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        if (state != IdeaStatus.DRAFT) idea.setPublishedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return ideas.save(idea);
    }

    private MockHttpSession login(User account) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/auth/login").with(csrf())
                        .param("email", account.getEmail()).param("password", "EdisonDemo2026!")
                        .param("accountType", account.getRole() == UserRole.INVESTOR ? "EXTERNAL_USER" : "UPM_ACCOUNT"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private void changeBlocked(User account, boolean blocked) throws Exception {
        mvc.perform(put("/api/users/{id}/blocked", account.getId())
                        .with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content("{\"blocked\":" + blocked + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(blocked ? "User blocked successfully" : "User unblocked successfully"))
                .andExpect(jsonPath("$.user.id").value(account.getId().toString()))
                .andExpect(jsonPath("$.user.blocked").value(blocked));
    }

    @Test
    void blockingHidesContentAndUnblockingRestoresItWithoutChangingOrDeletingData() throws Exception {
        Idea published = createIdea(target, IdeaStatus.PUBLISHED, Visibility.PUBLIC);
        Idea community = createIdea(target, IdeaStatus.PUBLISHED, Visibility.UPM_COMMUNITY);
        Idea draft = createIdea(target, IdeaStatus.DRAFT, Visibility.PUBLIC);
        Idea archived = createIdea(target, IdeaStatus.ARCHIVED, Visibility.PUBLIC);
        Idea unaffected = createIdea(active, IdeaStatus.PUBLISHED, Visibility.PUBLIC);
        Comment hidden = comments.save(new Comment(unaffected, target, "Target feedback", UUID.randomUUID()));
        Comment visible = comments.save(new Comment(unaffected, active, "Other feedback", UUID.randomUUID()));
        Comment underHiddenIdea = comments.save(new Comment(published, active, "Existing feedback", UUID.randomUUID()));
        saved.save(new SavedIdea(active, published));
        String key = images.store(new ByteArrayInputStream(new byte[]{(byte) 0x89, 'P', 'N', 'G'}), "png");
        imageKeys.add(key);
        Attachment screenshot = attachments.save(new Attachment(published, "test.png", "image/png", 4, key, 0));

        changeBlocked(target, true);
        // Filtering happens in both search queries and their count queries, before pagination.
        for (boolean matchmaking : List.of(false, true)) {
            var request = get("/api/ideas").param("q", scope).param("size", "1");
            if (matchmaking) request.param("tag", "SOFTWARE").param("stage", "PROTOTYPE");
            mvc.perform(request).andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].id").value(unaffected.getId().toString()))
                    .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.totalPages").value(1));
        }
        mvc.perform(get("/api/ideas").param("q", scope).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(5));
        for (Idea hiddenIdea : List.of(published, community, draft, archived)) {
            mvc.perform(get("/api/ideas/{id}", hiddenIdea.getId())).andExpect(status().isNotFound());
            mvc.perform(get("/api/ideas/{id}", hiddenIdea.getId()).with(user(active.getId().toString())))
                    .andExpect(status().isNotFound());
            mvc.perform(get("/api/ideas/{id}", hiddenIdea.getId()).with(user(admin.getId().toString())))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/ideas/{id}/comments", hiddenIdea.getId())).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/ideas/{id}/attachments", published.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/api/ideas/{id}/attachments/{attachmentId}/file", published.getId(), screenshot.getId()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/ideas/{id}/attachments/{attachmentId}/file", published.getId(), screenshot.getId())
                        .with(user(admin.getId().toString()))).andExpect(status().isOk());
        mvc.perform(get("/api/ideas/{id}/comments", unaffected.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.comments[0].id").value(visible.getId().toString()));
        mvc.perform(get("/api/ideas/{id}/comments", unaffected.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        mvc.perform(get("/api/users/me/saved-ideas").with(user(active.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/users/founders"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", not(hasItem(target.getId().toString()))));
        // Even an author cannot retrieve hidden content through edit/delete confirmations or retries.
        mvc.perform(put("/api/comments/{id}", underHiddenIdea.getId()).with(user(active.getId().toString())).with(csrf())
                        .contentType("application/json").content("{\"content\":\"Edit hidden feedback\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/comments/{id}", underHiddenIdea.getId()).with(user(active.getId().toString())).with(csrf()))
                .andExpect(status().isNotFound());
        String retry = "{\"content\":\"Retry\",\"clientRequestId\":\"" + underHiddenIdea.getClientRequestId() + "\"}";
        mvc.perform(post("/api/ideas/{id}/comments", published.getId()).with(user(active.getId().toString())).with(csrf())
                        .contentType("application/json").content(retry)).andExpect(status().isNotFound());
        mvc.perform(post("/api/ideas/{id}/comments", unaffected.getId()).with(user(active.getId().toString())).with(csrf())
                        .contentType("application/json").content(retry)).andExpect(status().isUnprocessableEntity());

        assertTrue(images.load(key).exists());
        assertTrue(attachments.existsById(screenshot.getId()));
        assertTrue(saved.existsById(new SavedIdeaId(active.getId(), published.getId())));
        assertEquals(CommentStatus.VISIBLE, comments.findById(hidden.getId()).orElseThrow().getStatus());
        for (Idea preserved : List.of(published, community, draft, archived)) {
            Idea stored = ideas.findById(preserved.getId()).orElseThrow();
            assertEquals(preserved.getStatus(), stored.getStatus());
            assertEquals(preserved.getVisibility(), stored.getVisibility());
            assertEquals(preserved.getPublishedAt(), stored.getPublishedAt());
        }

        changeBlocked(target, false);
        mvc.perform(get("/api/ideas").param("q", scope).param("tag", "SOFTWARE").param("stage", "PROTOTYPE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/ideas/{id}", published.getId())).andExpect(status().isOk());
        mvc.perform(get("/api/ideas/{id}", community.getId()).with(user(active.getId().toString())))
                .andExpect(status().isOk());
        mvc.perform(get("/api/ideas/{id}", draft.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/api/ideas/{id}", archived.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/api/ideas/{id}/comments", unaffected.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        mvc.perform(get("/api/ideas/{id}/comments", published.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.comments[0].id").value(underHiddenIdea.getId().toString()));
        mvc.perform(get("/api/users/me/saved-ideas").with(user(active.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(published.getId().toString()));
        mvc.perform(get("/api/users/founders"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem(target.getId().toString())));
        mvc.perform(get("/api/ideas/{id}/attachments/{attachmentId}/file", published.getId(), screenshot.getId()))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"STUDENT", "PROFESSOR", "INVESTOR"})
    void blockedAccountsCannotLogInAndCanLogInAgainAfterUnblocking(UserRole role) throws Exception {
        User account = createUser(role);
        changeBlocked(account, true);
        mvc.perform(post("/api/auth/login").with(csrf()).param("email", account.getEmail())
                        .param("password", "EdisonDemo2026!")
                        .param("accountType", role == UserRole.INVESTOR ? "EXTERNAL_USER" : "UPM_ACCOUNT"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid credentials or access option"));
        changeBlocked(account, false);
        login(account);
    }

    @Test
    void existingSessionsAreInvalidatedOnReadAndWriteRequestsAndDoNotBypassTheBlock() throws Exception {
        MockHttpSession readSession = login(target);
        MockHttpSession writeSession = login(target);
        changeBlocked(target, true);
        mvc.perform(get("/api/users/me").session(readSession))
                .andExpect(status().isUnauthorized()).andExpect(cookie().maxAge("JSESSIONID", 0));
        assertTrue(readSession.isInvalid());
        mvc.perform(post("/api/ideas").session(writeSession).with(csrf())
                        .header("X-User-Id", active.getId()).contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        assertTrue(writeSession.isInvalid());
        mvc.perform(get("/api/ideas")).andExpect(status().isOk());
        changeBlocked(target, false);
        assertTrue(readSession.isInvalid());
        MockHttpSession fresh = login(target);
        mvc.perform(get("/api/users/me").session(fresh)).andExpect(status().isOk());
    }

    @Test
    void onlyAdminCanChangeTheStateAndAdminAccountsCannotBeBlocked() throws Exception {
        for (UserRole role : List.of(UserRole.STUDENT, UserRole.PROFESSOR, UserRole.INVESTOR)) {
            User caller = createUser(role);
            for (boolean blocked : List.of(true, false)) {
                mvc.perform(put("/api/users/{id}/blocked", target.getId())
                                .with(user(caller.getId().toString()).roles("ADMINISTRATOR")).with(csrf())
                                .contentType("application/json").content("{\"blocked\":" + blocked + "}"))
                        .andExpect(status().isForbidden());
            }
        }
        for (User administrator : List.of(admin, createUser(UserRole.ADMINISTRATOR))) {
            mvc.perform(put("/api/users/{id}/blocked", administrator.getId()).with(user(admin.getId().toString())).with(csrf())
                            .contentType("application/json").content("{\"blocked\":true}"))
                    .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errors.blocked").isArray());
            assertFalse(users.findById(administrator.getId()).orElseThrow().isBlocked());
        }
        assertFalse(users.findById(target.getId()).orElseThrow().isBlocked());
    }

    @Test
    void authenticationCsrfValidationMissingUsersAndRepeatedRequestsAreHandled() throws Exception {
        mvc.perform(put("/api/users/{id}/blocked", target.getId()).with(csrf())
                        .contentType("application/json").content("{\"blocked\":true}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/users/{id}/blocked", target.getId()).with(user(admin.getId().toString()))
                        .contentType("application/json").content("{\"blocked\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/users/{id}/blocked", target.getId()).with(user(admin.getId().toString()))
                        .with(csrf().useInvalidToken()).contentType("application/json").content("{\"blocked\":true}"))
                .andExpect(status().isForbidden());
        for (String invalid : List.of("{}", "{\"blocked\":null}", "{\"blocked\":\"invalid\"}")) {
            mvc.perform(put("/api/users/{id}/blocked", target.getId()).with(user(admin.getId().toString())).with(csrf())
                            .contentType("application/json").content(invalid)).andExpect(status().isBadRequest());
        }
        mvc.perform(put("/api/users/{id}/blocked", UUID.randomUUID()).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content("{\"blocked\":true}"))
                .andExpect(status().isNotFound());
        assertFalse(users.findById(target.getId()).orElseThrow().isBlocked());
        changeBlocked(target, true);
        changeBlocked(target, true);
        changeBlocked(target, false);
        changeBlocked(target, false);
    }
}
