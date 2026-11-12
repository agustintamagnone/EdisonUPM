package es.upm.edison;

import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import es.upm.edison.model.User;
import es.upm.edison.model.UserRole;
import es.upm.edison.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Walks through the activity diagrams: publish an idea, attach a screenshot and
 * comment on it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IdeaLifecycleIntegrationTest {

        private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 };

        @Autowired
        private MockMvc mvc;
        @Autowired
        private UserRepository userRepository;

        @Autowired
        private PasswordEncoder encoder;
        private MockHttpSession founderSession;
        private MockHttpSession otherSession;
        private MockHttpSession professorSession;

        private User founder;
        private User otherStudent;
        private User professor;

        @BeforeEach
        void setUp() throws Exception {
                String suffix = UUID.randomUUID().toString();
                founder = userRepository.save(new User("Founder", "founder-" + suffix + "@upm.es", UserRole.STUDENT, encoder.encode("test-password")));
                otherStudent = userRepository.save(new User("Other", "other-" + suffix + "@upm.es", UserRole.STUDENT, encoder.encode("test-password")));
                professor = userRepository.save(new User("Prof", "prof-" + suffix + "@upm.es", UserRole.PROFESSOR, encoder.encode("test-password")));
                founderSession = login(founder);
                otherSession = login(otherStudent);
                professorSession = login(professor);
        }

        private MockHttpSession login(User user) throws Exception {
                return (MockHttpSession) mvc.perform(post("/api/auth/login").with(csrf())
                                .param("email", user.getEmail()).param("password", "test-password")
                                .param("accountType", "UPM_ACCOUNT"))
                                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
        }

        @Test
        void publishAttachAndComment() throws Exception {
                String basics = """
                                {"title":"CampusShare","elevatorPitch":"Share bikes","problemStatement":"Slow transport",
                                 "solutionDescription":"Shared bikes"}""";

                // Only students can create ideas
                mvc.perform(post("/api/ideas").with(csrf()).session(professorSession)
                                .contentType(MediaType.APPLICATION_JSON).content(basics))
                                .andExpect(status().isForbidden());

                // Step 1: Basics -> DRAFT
                MvcResult created = mvc.perform(post("/api/ideas").with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON).content(basics))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.status").value("DRAFT"))
                                .andReturn();
                String ideaId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

                // Publishing too early returns errors grouped by wizard step
                String publish = """
                                {"feedbackEnabled":true,"allowedCommenterRoles":["STUDENT","PROFESSOR"],
                                 "visibility":"PUBLIC","declarationAccepted":true}""";
                mvc.perform(post("/api/ideas/{id}/publish", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON).content(publish))
                                .andExpect(status().isUnprocessableEntity())
                                .andExpect(jsonPath("$.errors.mvpProof").isArray());

                // Step 2: tags, stage, screenshot and MVP link
                mvc.perform(put("/api/ideas/{id}/classification", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"tags\":[\"SOFTWARE\",\"GREEN_TECH\",\"HARDWARE\",\"CIRCULAR_ECONOMY\"],\"developmentStage\":\"PROTOTYPE\"}"))
                                .andExpect(status().isUnprocessableEntity());
                mvc.perform(put("/api/ideas/{id}/classification", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"tags\":[\"SOFTWARE\"],\"developmentStage\":\"FINISHED\"}"))
                                .andExpect(status().isBadRequest());
                mvc.perform(put("/api/ideas/{id}/classification", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"tags\":[\"SOFTWARE\",\"GREEN_TECH\"],\"developmentStage\":\"CONCEPT\"}"))
                                .andExpect(status().isOk());
                // Exactly 3 industry tags are allowed
                mvc.perform(put("/api/ideas/{id}/classification", ideaId).with(csrf())
                                .session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"tags\":[\"SOFTWARE\",\"GREEN_TECH\",\"HARDWARE\"],\"developmentStage\":\"CONCEPT\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.tags.length()").value(3));
                // Changing the stage updates the existing idea_stage row
                mvc.perform(put("/api/ideas/{id}/classification", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"tags\":[\"SOFTWARE\",\"GREEN_TECH\"],\"developmentStage\":\"PROTOTYPE\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.developmentStage").value("PROTOTYPE"))
                                .andExpect(jsonPath("$.tags.length()").value(2));

                mvc.perform(multipart("/api/ideas/{id}/attachments", ideaId)
                                .file(new MockMultipartFile("file", "fake.png", "image/png", "not an image".getBytes())).with(csrf())
                                .session(founderSession))
                                .andExpect(status().isUnprocessableEntity());
                mvc.perform(multipart("/api/ideas/{id}/attachments", ideaId)
                                .file(new MockMultipartFile("file", "screen.png", "image/png", PNG)).with(csrf())
                                .session(founderSession))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.displayOrder").value(0));

                mvc.perform(put("/api/ideas/{id}/mvp-link", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"mvpUrl\":\"javascript:alert(1)\"}"))
                                .andExpect(status().isUnprocessableEntity());
                mvc.perform(put("/api/ideas/{id}/mvp-link", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"mvpUrl\":\"https://campusshare.example\"}"))
                                .andExpect(status().isOk());

                // Step 3: publish
                mvc.perform(post("/api/ideas/{id}/publish", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON).content(publish))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                                .andExpect(jsonPath("$.screenshots.length()").value(1));

                // Anonymous users can browse PUBLIC ideas (by text and by tag) and see the
                // screenshot
                mvc.perform(get("/api/ideas").param("q", "campus"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[*].id", hasItem(ideaId)));
                mvc.perform(get("/api/ideas").param("tag", "GREEN_TECH"))
                                .andExpect(jsonPath("$.content[*].id", hasItem(ideaId)));
                mvc.perform(get("/api/ideas").param("tag", "HEALTH_TECH"))
                                .andExpect(jsonPath("$.content[*].id", not(hasItem(ideaId))));
                mvc.perform(get("/api/ideas/{id}", ideaId))
                                .andExpect(jsonPath("$.developmentStage").value("PROTOTYPE"));
                MvcResult attachments = mvc.perform(get("/api/ideas/{id}/attachments", ideaId))
                                .andExpect(status().isOk()).andReturn();
                String fileUrl = JsonPath.read(attachments.getResponse().getContentAsString(), "$[0].url");
                mvc.perform(get(fileUrl)).andExpect(status().isOk());

                // Comments: anonymous cannot post, unsafe links are rejected, retries are
                // idempotent
                mvc.perform(post("/api/ideas/{id}/comments", ideaId).with(csrf())
                                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Hi\"}"))
                                .andExpect(status().isUnauthorized());
                mvc.perform(post("/api/ideas/{id}/comments", ideaId).with(csrf()).session(otherSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"see javascript:alert(1)\"}"))
                                .andExpect(status().isUnprocessableEntity());

                String comment = "{\"content\":\"  Great idea! https://upm.es  \",\"clientRequestId\":\""
                                + UUID.randomUUID() + "\"}";
                MvcResult first = mvc
                                .perform(post("/api/ideas/{id}/comments", ideaId).with(csrf())
                                                .session(otherSession)
                                                .contentType(MediaType.APPLICATION_JSON).content(comment))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.content").value("Great idea! https://upm.es"))
                                .andReturn();
                String commentId = JsonPath.read(first.getResponse().getContentAsString(), "$.id");
                mvc.perform(post("/api/ideas/{id}/comments", ideaId).with(csrf()).session(otherSession)
                                .contentType(MediaType.APPLICATION_JSON).content(comment))
                                .andExpect(jsonPath("$.id").value(commentId));
                mvc.perform(get("/api/ideas/{id}/comments", ideaId))
                                .andExpect(jsonPath("$.count").value(1));

                // Only the author can delete; deletion is soft
                mvc.perform(delete("/api/comments/{id}", commentId).with(csrf()).session(professorSession))
                                .andExpect(status().isForbidden());
                mvc.perform(delete("/api/comments/{id}", commentId).with(csrf()).session(otherSession))
                                .andExpect(status().isNoContent());
                mvc.perform(get("/api/ideas/{id}/comments", ideaId))
                                .andExpect(jsonPath("$.count").value(0));

                // Saved ideas
                mvc.perform(put("/api/users/me/saved-ideas/{id}", ideaId).with(csrf()).session(professorSession))
                                .andExpect(status().isNoContent());
                mvc.perform(get("/api/users/me/saved-ideas").session(professorSession))
                                .andExpect(jsonPath("$[0].id").value(ideaId));

                // Published ideas can no longer be edited
                mvc.perform(put("/api/ideas/{id}/basics", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON).content(basics))
                                .andExpect(status().isUnprocessableEntity());
        }

        @Test
        void upmCommunityIdeasRequireLogin() throws Exception {
                MvcResult created = mvc.perform(post("/api/ideas").with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {"title":"Private","elevatorPitch":"p","problemStatement":"p","solutionDescription":"s"}"""))
                                .andReturn();
                String ideaId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

                // Drafts are only visible to the founder
                mvc.perform(get("/api/ideas/{id}", ideaId).session(otherSession))
                                .andExpect(status().isNotFound());

                mvc.perform(put("/api/ideas/{id}/classification", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"tags\":[\"ED_TECH\"],\"developmentStage\":\"CONCEPT\"}"));
                mvc.perform(post("/api/ideas/{id}/publish", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON).content("""
                                                {"feedbackEnabled":false,"allowedCommenterRoles":[],
                                                 "visibility":"UPM_COMMUNITY","declarationAccepted":true}"""))
                                .andExpect(status().isOk());

                mvc.perform(get("/api/ideas/{id}", ideaId)).andExpect(status().isUnauthorized());
                mvc.perform(get("/api/ideas/{id}", ideaId).session(professorSession))
                                .andExpect(status().isOk());

                // Feedback disabled: others cannot comment, the founder can
                mvc.perform(post("/api/ideas/{id}/comments", ideaId).with(csrf()).session(professorSession)
                                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Hello\"}"))
                                .andExpect(status().isForbidden());
                mvc.perform(post("/api/ideas/{id}/comments", ideaId).with(csrf()).session(founderSession)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"Update from the founder\"}"))
                                .andExpect(status().isCreated());
        }
}
