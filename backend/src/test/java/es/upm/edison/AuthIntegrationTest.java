package es.upm.edison;

import com.jayway.jsonpath.JsonPath;
import es.upm.edison.model.User;
import es.upm.edison.model.UserRole;
import es.upm.edison.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;

    private User createUser(UserRole role) {
        return users.save(new User("Test", UUID.randomUUID() + "@example.com", role,
                encoder.encode("test-password")));
    }

    private MvcResult token(MockHttpSession session) throws Exception {
        var request = get("/api/auth/csrf");
        if (session != null) request.session(session);
        return mvc.perform(request).andExpect(status().isOk()).andReturn();
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void loginUsesStoredRoleAndChecksAccessOption(UserRole role) throws Exception {
        User user = createUser(role);
        String option = role == UserRole.INVESTOR ? "EXTERNAL_USER" : "UPM_ACCOUNT";
        String wrongOption = role == UserRole.INVESTOR ? "UPM_ACCOUNT" : "EXTERNAL_USER";
        mvc.perform(post("/api/auth/login").with(csrf()).param("email", user.getEmail())
                        .param("password", "test-password").param("accountType", wrongOption))
                .andExpect(status().isUnauthorized());
        var result = mvc.perform(post("/api/auth/login").with(csrf())
                        .param("email", "  " + user.getEmail().toUpperCase() + "  ")
                        .param("password", "test-password").param("accountType", option)
                        .param("role", "ADMINISTRATOR"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value(role.name()))
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        mvc.perform(get("/api/users/me").session(session).header("X-User-Id", UUID.randomUUID()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(user.getId().toString()));
        mvc.perform(put("/api/users/me").session(session).with(csrf())
                        .contentType("application/json").content("{\"fullName\":\"Changed\",\"role\":\"INVESTOR\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value(role.name()));
    }

    @Test
    void credentialsAndMissingOptionAreRejected() throws Exception {
        User user = createUser(UserRole.STUDENT);
        for (String email : new String[]{user.getEmail(), "unknown@example.com"}) {
            mvc.perform(post("/api/auth/login").with(csrf()).param("email", email)
                            .param("password", "wrong").param("accountType", "UPM_ACCOUNT"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").with(csrf()).param("email", user.getEmail())
                        .param("password", "test-password"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).param("email", user.getEmail())
                        .param("password", "a".repeat(73)).param("accountType", "UPM_ACCOUNT"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void realCsrfFlowRotatesSessionAndLogoutInvalidatesIt() throws Exception {
        User user = createUser(UserRole.STUDENT);
        var initial = token(null);
        var session = (MockHttpSession) initial.getRequest().getSession(false);
        String originalId = session.getId();
        String csrfToken = JsonPath.read(initial.getResponse().getContentAsString(), "$.token");
        mvc.perform(post("/api/auth/login").session(session).param("email", user.getEmail())
                        .param("password", "test-password").param("accountType", "UPM_ACCOUNT"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").session(session).header("X-CSRF-TOKEN", csrfToken)
                        .param("email", user.getEmail()).param("password", "test-password")
                        .param("accountType", "UPM_ACCOUNT"))
                .andExpect(status().isOk());
        assertNotEquals(originalId, session.getId());
        mvc.perform(put("/api/users/me").session(session).header("X-CSRF-TOKEN", csrfToken)
                        .contentType("application/json").content("{\"fullName\":\"Changed\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", "invalid"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/me").session(session)).andExpect(status().isOk());
        var refreshed = token(session);
        String freshToken = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.token");
        mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", freshToken))
                .andExpect(status().isNoContent()).andExpect(cookie().maxAge("JSESSIONID", 0));
        assertTrue(session.isInvalid());
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
        token(null);
    }

    @Test
    void anonymousPublicAccessAndSpoofedHeaders() throws Exception {
        User user = createUser(UserRole.STUDENT);
        for (String path : new String[]{"/api/ideas", "/api/tags", "/api/development-stages",
                "/api/users/founders", "/api/users/mentors", "/api/users/" + user.getId()}) {
            mvc.perform(get(path)).andExpect(status().isOk());
        }
        mvc.perform(get("/api/users/me").header("X-User-Id", user.getId()))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/ideas").with(csrf()).header("X-User-Id", user.getId())
                        .contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(options("/api/users/me").header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "PUT")
                        .header("Access-Control-Request-Headers", "X-CSRF-TOKEN,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        mvc.perform(options("/api/users/me").header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "PUT"))
                .andExpect(status().isForbidden());
    }

    @Test
    void sqlInstallationCreatesDemoAccountsAndRelatedData() throws Exception {
        String schema = Files.readString(Path.of("..", "database", "01_schema.sql"));
        String seed = Files.readString(Path.of("..", "database", "02_seed.sql"));
        try (var connection = java.sql.DriverManager.getConnection(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE", "sa", "")) {
            runSql(connection, schema);
            runSql(connection, seed);
            try (var rows = connection.createStatement().executeQuery("SELECT COUNT(*) FROM ideas")) {
                assertTrue(rows.next()); assertEquals(2, rows.getInt(1));
            }
            try (var rows = connection.createStatement().executeQuery("SELECT COUNT(*) FROM comments")) {
                assertTrue(rows.next()); assertEquals(1, rows.getInt(1));
            }
            try (var rows = connection.createStatement().executeQuery("SELECT password_hash FROM users")) {
                int count = 0;
                while (rows.next()) {
                    count++;
                    assertTrue(encoder.matches("EdisonDemo2026!", rows.getString(1)));
                    assertEquals(60, rows.getString(1).length());
                }
                assertEquals(5, count);
            }
        }
    }

    private void runSql(java.sql.Connection connection, String sql) {
        org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection,
                // H2 MySQL mode does not implement UTC_TIMESTAMP.
                new org.springframework.core.io.ByteArrayResource(sql.replace("UTC_TIMESTAMP(6)", "CURRENT_TIMESTAMP(6)").getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
}
