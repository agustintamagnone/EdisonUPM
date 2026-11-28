package es.upm.edison;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.upm.edison.model.*;
import es.upm.edison.repository.*;
import es.upm.edison.service.IdeaService;
import es.upm.edison.service.storage.ImageStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

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
class IdeaManagementIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired IdeaRepository ideas;
    @Autowired CommentRepository comments;
    @Autowired AttachmentRepository attachments;
    @Autowired SavedIdeaRepository saved;
    @Autowired ImageStorage images;
    @Autowired JdbcTemplate jdbc;
    @Autowired IdeaService service;
    @Autowired PlatformTransactionManager transactions;

    private User owner, other, admin;

    @BeforeEach
    void setUp() {
        owner = createUser(UserRole.STUDENT);
        other = createUser(UserRole.STUDENT);
        admin = createUser(UserRole.ADMINISTRATOR);
    }

    private User createUser(UserRole role) {
        return users.save(new User("Management tester", UUID.randomUUID() + "@example.com", role,
                "$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y", false));
    }

    private Idea createIdea(IdeaStatus status) {
        Idea idea = new Idea(owner, UUID.randomUUID().toString(), "Original pitch", "Problem", "Solution");
        idea.setStatus(status);
        idea.setTags(EnumSet.of(IdeaTag.SOFTWARE, IdeaTag.HARDWARE));
        idea.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        idea.setMetrics(List.of("Original metric"));
        idea.setMvpUrl("https://example.com/original");
        idea.setContact("owner@example.com");
        idea.setFeedbackEnabled(false);
        idea.setAllowedCommenterRoles(EnumSet.of(UserRole.PROFESSOR));
        if (status != IdeaStatus.DRAFT) idea.setPublishedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return ideas.save(idea);
    }

    private List<String> addRelatedData(Idea idea) {
        comments.save(new Comment(idea, other, "Visible comment", UUID.randomUUID()));
        Comment deleted = new Comment(idea, owner, "Deleted comment", UUID.randomUUID());
        deleted.setStatus(CommentStatus.DELETED);
        comments.save(deleted);
        saved.save(new SavedIdea(owner, idea));
        saved.save(new SavedIdea(other, idea));
        List<String> keys = new ArrayList<>();
        for (int index = 0; index < 2; index++) {
            String key = images.store(new ByteArrayInputStream(new byte[]{(byte) 0x89, 'P', 'N', 'G'}), "png");
            attachments.save(new Attachment(idea, "screen.png", "image/png", 4, key, index));
            keys.add(key);
        }
        return keys;
    }

    private int rows(String table, UUID ideaId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE idea_id = ?", Integer.class,
                ideaId.toString());
    }

    private Map<String, Object> editBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", " Updated idea ");
        body.put("elevatorPitch", " Updated pitch ");
        body.put("problemStatement", " Updated problem ");
        body.put("solutionDescription", " Updated solution ");
        body.put("contact", " contact@example.com ");
        body.put("tags", List.of("GREEN_TECH"));
        body.put("developmentStage", "MVP_LIVE");
        body.put("mvpUrl", " https://example.com/updated ");
        body.put("metrics", List.of(" 100 users ", " 2 pilots "));
        return body;
    }

    @ParameterizedTest
    @EnumSource(IdeaStatus.class)
    void deleteConfirmsAndRemovesAllRelatedDataAndFiles(IdeaStatus status) throws Exception {
        Idea idea = createIdea(status);
        List<String> keys = addRelatedData(idea);
        Idea unrelated = createIdea(IdeaStatus.PUBLISHED);
        comments.save(new Comment(unrelated, other, "Keep this comment", UUID.randomUUID()));
        saved.save(new SavedIdea(other, unrelated));

        mvc.perform(delete("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(idea.getId().toString()))
                .andExpect(jsonPath("$.message").value("Idea deleted successfully"));
        assertFalse(ideas.existsById(idea.getId()));
        for (String table : List.of("comments", "saved_ideas", "attachments", "idea_tags", "idea_stage",
                "idea_metrics", "idea_allowed_commenter_roles")) {
            assertEquals(0, rows(table, idea.getId()), table);
        }
        for (String key : keys) assertFalse(images.load(key).exists());
        assertTrue(ideas.existsById(unrelated.getId()));
        assertEquals(1, rows("comments", unrelated.getId()));
        assertEquals(1, rows("saved_ideas", unrelated.getId()));
        assertTrue(users.existsById(owner.getId()));
        mvc.perform(get("/api/ideas/{id}", idea.getId())).andExpect(status().isNotFound());
        mvc.perform(delete("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())).with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void rollbackKeepsTheIdeaRelatedDataAndFiles() {
        Idea idea = createIdea(IdeaStatus.PUBLISHED);
        List<String> keys = addRelatedData(idea);
        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            service.deleteIdea(idea.getId(), owner.getId());
            ideas.flush();
            transaction.setRollbackOnly();
        });
        assertTrue(ideas.existsById(idea.getId()));
        assertEquals(2, rows("comments", idea.getId()));
        assertEquals(2, rows("attachments", idea.getId()));
        for (String key : keys) assertTrue(images.load(key).exists());
        service.deleteIdea(idea.getId(), owner.getId());
    }

    @ParameterizedTest
    @EnumSource(IdeaStatus.class)
    void adminCanViewEditAndPermanentlyDeleteOthersIdeasInEveryState(IdeaStatus state) throws Exception {
        Idea idea = createIdea(state);
        idea.setVisibility(Visibility.UPM_COMMUNITY);
        ideas.save(idea);
        List<String> keys = addRelatedData(idea);
        mvc.perform(get("/api/ideas/{id}", idea.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value(state.name()));
        Attachment screenshot = attachments.findByIdeaIdOrderByDisplayOrderAsc(idea.getId()).getFirst();
        mvc.perform(get("/api/ideas/{id}/attachments/{attachmentId}/file", idea.getId(), screenshot.getId())
                        .with(user(admin.getId().toString())))
                .andExpect(status().isOk());
        mvc.perform(get("/api/ideas/{id}/comments", idea.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));

        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content(mapper.writeValueAsString(editBody())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Updated idea"))
                .andExpect(jsonPath("$.founder.id").value(owner.getId().toString()))
                .andExpect(jsonPath("$.status").value(state.name()));
        Idea updated = ideas.findById(idea.getId()).orElseThrow();
        assertEquals(idea.getPublishedAt(), updated.getPublishedAt());
        assertEquals(Visibility.UPM_COMMUNITY, updated.getVisibility());
        assertFalse(updated.isFeedbackEnabled());
        assertEquals(2, rows("comments", idea.getId()));

        mvc.perform(delete("/api/ideas/{id}", idea.getId()).with(user(admin.getId().toString())).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.message").value("Idea deleted successfully"));
        assertFalse(ideas.existsById(idea.getId()));
        for (String table : List.of("comments", "saved_ideas", "attachments", "idea_tags", "idea_stage",
                "idea_metrics", "idea_allowed_commenter_roles")) {
            assertEquals(0, rows(table, idea.getId()), table);
        }
        for (String key : keys) assertFalse(images.load(key).exists());
        assertTrue(users.existsById(owner.getId()));
    }

    @Test
    void adminCanCreateAndPublishAnIdeaUsingTheExistingWizard() throws Exception {
        String created = mvc.perform(post("/api/ideas").with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content(mapper.writeValueAsString(editBody())))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.founder.id").value(admin.getId().toString()))
                .andReturn().getResponse().getContentAsString();
        String id = mapper.readTree(created).get("id").asText();
        mvc.perform(put("/api/ideas/{id}/classification", id).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json")
                        .content("{\"tags\":[\"SOFTWARE\"],\"developmentStage\":\"PROTOTYPE\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/ideas/{id}/publish", id).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json")
                        .content("{\"visibility\":\"PUBLIC\",\"feedbackEnabled\":false,\"declarationAccepted\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PUBLISHED"));
        mvc.perform(get("/api/ideas/{id}", id)).andExpect(status().isOk());
    }

    @Test
    void adminStillNeedsCsrfAndValidContentAndClientAuthoritiesCannotGrantAdminPermissions() throws Exception {
        Idea idea = createIdea(IdeaStatus.PUBLISHED);
        Map<String, Object> body = editBody();
        body.put("tags", List.of("SOFTWARE", "HARDWARE", "GREEN_TECH", "HEALTH_TECH"));
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(admin.getId().toString())).with(csrf())
                        .contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(delete("/api/ideas/{id}", idea.getId()).with(user(admin.getId().toString())))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/ideas/{id}", idea.getId())
                        .with(user(other.getId().toString()).roles("ADMINISTRATOR")).with(csrf()))
                .andExpect(status().isForbidden());
        assertEquals(idea.getTitle(), ideas.findById(idea.getId()).orElseThrow().getTitle());
    }

    @ParameterizedTest
    @EnumSource(value = IdeaStatus.class, names = {"DRAFT", "PUBLISHED"})
    void editPersistsContentAndPreservesPublicationOwnershipAndPermissions(IdeaStatus state) throws Exception {
        Idea idea = createIdea(state);
        List<String> keys = addRelatedData(idea);
        Map<String, Object> body = editBody();
        body.put("status", "ARCHIVED");
        body.put("founder", Map.of("id", other.getId().toString()));
        body.put("publishedAt", "2030-01-01T00:00:00Z");
        body.put("visibility", "UPM_COMMUNITY");
        body.put("feedbackEnabled", true);
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())).with(csrf())
                        .contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated idea"))
                .andExpect(jsonPath("$.contact").value("contact@example.com"))
                .andExpect(jsonPath("$.developmentStage").value("MVP_LIVE"))
                .andExpect(jsonPath("$.metrics[0]").value("100 users"))
                .andExpect(jsonPath("$.screenshots.length()").value(2));
        Idea updated = ideas.findById(idea.getId()).orElseThrow();
        assertEquals(state, updated.getStatus());
        assertEquals(owner.getId(), updated.getFounder().getId());
        assertEquals(idea.getPublishedAt(), updated.getPublishedAt());
        assertEquals(Visibility.PUBLIC, updated.getVisibility());
        assertFalse(updated.isFeedbackEnabled());
        assertEquals(Set.of(UserRole.PROFESSOR), updated.getAllowedCommenterRoles());
        assertEquals(Set.of(IdeaTag.GREEN_TECH), updated.getTags());
        assertEquals("Updated pitch", updated.getElevatorPitch());
        assertEquals("Updated problem", updated.getProblemStatement());
        assertEquals("Updated solution", updated.getSolutionDescription());
        assertEquals("https://example.com/updated", updated.getMvpUrl());
        mvc.perform(get("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.metrics[1]").value("2 pilots"));
        assertEquals(2, rows("comments", idea.getId()));
        assertEquals(2, rows("saved_ideas", idea.getId()));
        for (String key : keys) assertTrue(images.load(key).exists());
        service.deleteIdea(idea.getId(), owner.getId());
    }

    @Test
    void draftCanRemainUnclassifiedAndOptionalFieldsCanBeCleared() throws Exception {
        Idea idea = createIdea(IdeaStatus.DRAFT);
        Map<String, Object> body = editBody();
        for (String field : List.of("contact", "tags", "developmentStage", "mvpUrl", "metrics")) body.remove(field);
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())).with(csrf())
                        .contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.contact").doesNotExist())
                .andExpect(jsonPath("$.tags").isEmpty()).andExpect(jsonPath("$.developmentStage").doesNotExist())
                .andExpect(jsonPath("$.mvpUrl").doesNotExist()).andExpect(jsonPath("$.metrics").isEmpty());
        Idea updated = ideas.findById(idea.getId()).orElseThrow();
        assertNull(updated.getContact());
        assertNull(updated.getMvpUrl());
        assertTrue(updated.getMetrics().isEmpty());
    }

    static Stream<Arguments> invalidEdits() {
        return Stream.of(
                Arguments.of("title", " ", "basics"),
                Arguments.of("title", "a".repeat(121), "basics"),
                Arguments.of("contact", "a".repeat(2001), "contact"),
                Arguments.of("tags", List.of(), "mvpProof"),
                Arguments.of("tags", List.of("SOFTWARE", "HARDWARE", "GREEN_TECH", "HEALTH_TECH"), "mvpProof"),
                Arguments.of("tags", Arrays.asList((String) null), "mvpProof"),
                Arguments.of("developmentStage", null, "mvpProof"),
                Arguments.of("mvpUrl", "javascript:alert(1)", "mvpUrl"),
                Arguments.of("metrics", List.of("1", "2", "3", "4", "5", "6"), "metrics"),
                Arguments.of("metrics", List.of(" "), "metrics"),
                Arguments.of("metrics", Arrays.asList((String) null), "metrics"),
                Arguments.of("metrics", List.of("a".repeat(201)), "metrics"));
    }

    @ParameterizedTest
    @MethodSource("invalidEdits")
    void invalidEditDoesNotPartiallyUpdateAnIdea(String field, Object value, String errorGroup) throws Exception {
        Idea idea = createIdea(IdeaStatus.PUBLISHED);
        Map<String, Object> body = editBody();
        body.put(field, value);
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())).with(csrf())
                        .contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errors." + errorGroup).isArray());
        Idea unchanged = ideas.findById(idea.getId()).orElseThrow();
        assertEquals(idea.getTitle(), unchanged.getTitle());
        assertEquals(Set.of(IdeaTag.SOFTWARE, IdeaTag.HARDWARE), unchanged.getTags());
        assertEquals(List.of("Original metric"), unchanged.getMetrics());
    }

    @Test
    void ownershipAuthenticationCsrfAndMissingIdsAreEnforced() throws Exception {
        Idea idea = createIdea(IdeaStatus.PUBLISHED);
        String body = mapper.writeValueAsString(editBody());
        for (User forbidden : List.of(other, createUser(UserRole.PROFESSOR), createUser(UserRole.INVESTOR))) {
            mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(forbidden.getId().toString())).with(csrf())
                            .contentType("application/json").content(body)).andExpect(status().isForbidden());
            mvc.perform(delete("/api/ideas/{id}", idea.getId()).with(user(forbidden.getId().toString())).with(csrf()))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(csrf()).contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/ideas/{id}", idea.getId()).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString()))
                        .contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/ideas/{id}", UUID.randomUUID()).with(user(owner.getId().toString())).with(csrf())
                        .contentType("application/json").content(body)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/ideas/{id}", UUID.randomUUID()).with(user(owner.getId().toString())).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())).with(csrf())
                        .contentType("application/json").content("{\"tags\":[\"UNKNOWN\"]}"))
                .andExpect(status().isBadRequest());
        assertTrue(ideas.existsById(idea.getId()));
        assertEquals(idea.getTitle(), ideas.findById(idea.getId()).orElseThrow().getTitle());
    }

    @Test
    void archivedIdeasCannotBeEdited() throws Exception {
        Idea idea = createIdea(IdeaStatus.ARCHIVED);
        mvc.perform(put("/api/ideas/{id}", idea.getId()).with(user(owner.getId().toString())).with(csrf())
                        .contentType("application/json").content(mapper.writeValueAsString(editBody())))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errors.status").isArray());
    }
}
