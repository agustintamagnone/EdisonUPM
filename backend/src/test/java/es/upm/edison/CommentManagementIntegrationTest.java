package es.upm.edison;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.upm.edison.model.*;
import es.upm.edison.repository.CommentRepository;
import es.upm.edison.repository.IdeaRepository;
import es.upm.edison.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommentManagementIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired IdeaRepository ideas;
    @Autowired CommentRepository comments;

    private User author, founder, admin;
    private Idea idea;
    private Comment comment;

    @BeforeEach
    void setUp() {
        author = createUser(UserRole.STUDENT);
        founder = createUser(UserRole.STUDENT);
        admin = createUser(UserRole.ADMINISTRATOR);
        idea = new Idea(founder, "Comment management", "Pitch", "Problem", "Solution");
        idea.setStatus(IdeaStatus.PUBLISHED);
        idea = ideas.save(idea);
        Comment created = comments.save(new Comment(idea, author, "Original comment", UUID.randomUUID()));
        comment = comments.findById(created.getId()).orElseThrow();
    }

    private User createUser(UserRole role) {
        return users.save(new User("Comment tester", UUID.randomUUID() + "@example.com", role,
                "$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y", false));
    }

    private String body(String content) throws Exception {
        var fields = new HashMap<String, Object>();
        fields.put("content", content);
        // A creation request key must not change when a comment is edited.
        fields.put("clientRequestId", UUID.randomUUID());
        return mapper.writeValueAsString(fields);
    }

    @Test
    void editConfirmsAndPersistsTheUpdatedComment() throws Exception {
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())).with(csrf())
                        .contentType("application/json").content(body("  Updated https://upm.es  ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Comment updated successfully"))
                .andExpect(jsonPath("$.comment.id").value(comment.getId().toString()))
                .andExpect(jsonPath("$.comment.ideaId").value(idea.getId().toString()))
                .andExpect(jsonPath("$.comment.author.id").value(author.getId().toString()))
                .andExpect(jsonPath("$.comment.content").value("Updated https://upm.es"))
                .andExpect(jsonPath("$.comment.updatedAt").isNotEmpty());
        Comment updated = comments.findById(comment.getId()).orElseThrow();
        assertEquals("Updated https://upm.es", updated.getContent());
        assertEquals(comment.getCreatedAt(), updated.getCreatedAt());
        assertEquals(comment.getClientRequestId(), updated.getClientRequestId());
        assertEquals(CommentStatus.VISIBLE, updated.getStatus());
        assertNotNull(updated.getUpdatedAt());
        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.comments[0].content").value("Updated https://upm.es"));
    }

    @Test
    void deletionConfirmsAndPermanentlyRemovesOnlyTheRequestedComment() throws Exception {
        Comment keep = comments.save(new Comment(idea, founder, "Keep this comment", null));
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(comment.getId().toString()))
                .andExpect(jsonPath("$.message").value("Comment deleted successfully"));
        assertFalse(comments.existsById(comment.getId()));
        assertEquals(CommentStatus.VISIBLE, comments.findById(keep.getId()).orElseThrow().getStatus());
        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.comments.length()").value(1))
                .andExpect(jsonPath("$.comments[0].id").value(keep.getId().toString()));
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())).with(csrf())
                        .contentType("application/json").content(body("Cannot restore")))
                .andExpect(status().isNotFound());
    }

    static Stream<Arguments> invalidContents() {
        return Stream.of(
                Arguments.of((String) null), Arguments.of(""), Arguments.of("  "),
                Arguments.of("a".repeat(501)), Arguments.of("javascript:alert(1)"),
                Arguments.of("ftp://example.com/file"));
    }

    @ParameterizedTest
    @MethodSource("invalidContents")
    void invalidEditsReturnErrorsWithoutChangingTheComment(String content) throws Exception {
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())).with(csrf())
                        .contentType("application/json").content(body(content)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errors.content").isArray())
                .andExpect(jsonPath("$.message").value("Validation failed"));
        Comment unchanged = comments.findById(comment.getId()).orElseThrow();
        assertEquals("Original comment", unchanged.getContent());
        assertNull(unchanged.getUpdatedAt());
    }

    @Test
    void exactlyFiveHundredCharactersAreAccepted() throws Exception {
        String content = "a".repeat(500);
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())).with(csrf())
                        .contentType("application/json").content(body(content)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.comment.content").value(content));
    }

    @Test
    void nonAuthorsCannotEditOrDeleteAnotherAuthorsComment() throws Exception {
        for (User forbidden : List.of(founder, createUser(UserRole.PROFESSOR), createUser(UserRole.INVESTOR))) {
            mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(forbidden.getId().toString())).with(csrf())
                            .contentType("application/json").content(body("Not mine")))
                    .andExpect(status().isForbidden());
            mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(forbidden.getId().toString())).with(csrf()))
                    .andExpect(status().isForbidden());
        }
        Comment unchanged = comments.findById(comment.getId()).orElseThrow();
        assertEquals("Original comment", unchanged.getContent());
        assertEquals(CommentStatus.VISIBLE, unchanged.getStatus());
        assertNull(unchanged.getUpdatedAt());
    }

    @Test
    void authenticationAndCsrfAreRequired() throws Exception {
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(csrf()).header("X-User-Id", author.getId())
                        .contentType("application/json").content(body("Anonymous")))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(csrf()).header("X-User-Id", author.getId()))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(author.getId().toString()))
                        .contentType("application/json").content(body("No CSRF")))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(author.getId().toString()))
                        .with(csrf().useInvalidToken())).andExpect(status().isForbidden());
        assertEquals(CommentStatus.VISIBLE, comments.findById(comment.getId()).orElseThrow().getStatus());
    }

    @ParameterizedTest
    @EnumSource(IdeaStatus.class)
    void adminCanCreateEditAndDeleteCommentsOnAnyIdeaDespiteFeedbackRestrictions(IdeaStatus state) throws Exception {
        idea.setStatus(state);
        idea.setVisibility(Visibility.UPM_COMMUNITY);
        idea.setFeedbackEnabled(false);
        idea.setAllowedCommenterRoles(java.util.Set.of(UserRole.PROFESSOR));
        ideas.save(idea);

        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(post("/api/ideas/{id}/comments", idea.getId()).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content(body(" Admin comment ")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.content").value("Admin comment"))
                .andExpect(jsonPath("$.author.id").value(admin.getId().toString()));
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content(body(" Moderated comment ")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.message").value("Comment updated successfully"))
                .andExpect(jsonPath("$.comment.content").value("Moderated comment"))
                .andExpect(jsonPath("$.comment.author.id").value(author.getId().toString()));
        Comment updated = comments.findById(comment.getId()).orElseThrow();
        assertEquals(comment.getCreatedAt(), updated.getCreatedAt());
        assertEquals(comment.getClientRequestId(), updated.getClientRequestId());
        assertNotNull(updated.getUpdatedAt());
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(admin.getId().toString())).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(comment.getId().toString()))
                .andExpect(jsonPath("$.message").value("Comment deleted successfully"));
        assertFalse(comments.existsById(comment.getId()));
        assertTrue(ideas.existsById(idea.getId()));
        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));

        // A forged authority does not override the role stored in the database.
        mvc.perform(post("/api/ideas/{id}/comments", idea.getId())
                        .with(user(author.getId().toString()).roles("ADMINISTRATOR")).with(csrf())
                        .contentType("application/json").content(body("Forbidden")))
                .andExpect(state == IdeaStatus.PUBLISHED ? status().isForbidden() : status().isNotFound());
        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()))
                .andExpect(state == IdeaStatus.PUBLISHED ? status().isUnauthorized() : status().isNotFound());
    }

    @Test
    void onlyAdminCanSeeAndPermanentlyRemoveLegacySoftDeletedComments() throws Exception {
        comment.setStatus(CommentStatus.DELETED);
        comments.save(comment);
        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.comments[0].id").value(comment.getId().toString()));
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(author.getId().toString())).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(admin.getId().toString())).with(csrf()))
                .andExpect(status().isOk());
        assertFalse(comments.existsById(comment.getId()));
    }

    @Test
    void adminStillNeedsValidCommentContentAndCsrf() throws Exception {
        mvc.perform(put("/api/comments/{id}", comment.getId()).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content(body(" ")))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(delete("/api/comments/{id}", comment.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isForbidden());
        assertEquals("Original comment", comments.findById(comment.getId()).orElseThrow().getContent());
    }

    @Test
    void missingCommentsReturnNotFound() throws Exception {
        UUID missing = UUID.randomUUID();
        mvc.perform(put("/api/comments/{id}", missing).with(user(author.getId().toString())).with(csrf())
                        .contentType("application/json").content(body("Missing")))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/comments/{id}", missing).with(user(author.getId().toString())).with(csrf()))
                .andExpect(status().isNotFound());
    }
}
