package es.upm.edison;

import es.upm.edison.model.Idea;
import es.upm.edison.model.DevelopmentStage;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.IdeaTag;
import es.upm.edison.model.User;
import es.upm.edison.model.UserRole;
import es.upm.edison.model.Visibility;
import es.upm.edison.repository.IdeaRepository;
import es.upm.edison.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

import static es.upm.edison.model.IdeaTag.*;
import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class IdeaSearchIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired IdeaRepository ideas;
    @Autowired UserRepository users;

    private String scope;
    private User founder;
    private Idea full, softwareGreen, softwareHardware, software, green, health, untagged, community;

    @BeforeEach
    void setUp() {
        scope = UUID.randomUUID().toString();
        founder = createUser(UserRole.STUDENT);
        // Stronger matches are deliberately older than weaker matches.
        full = createIdea("Full", 10, SOFTWARE, GREEN_TECH, HARDWARE);
        softwareGreen = createIdea("Software green", 20, SOFTWARE, GREEN_TECH);
        softwareHardware = createIdea("Software hardware", 30, SOFTWARE, HARDWARE);
        green = createIdea("Green", 40, GREEN_TECH);
        software = createIdea("Software", 50, SOFTWARE);
        health = createIdea("Health", 60, HEALTH_TECH);
        untagged = createIdea("Untagged", 70);
        community = createIdea("Community", 100, SOFTWARE, GREEN_TECH, HARDWARE);
        community.setVisibility(Visibility.UPM_COMMUNITY);
        Idea draft = createIdea("Draft", 90, SOFTWARE, GREEN_TECH, HARDWARE);
        draft.setStatus(IdeaStatus.DRAFT);
        draft.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        Idea archived = createIdea("Archived", 80, SOFTWARE, GREEN_TECH, HARDWARE);
        archived.setStatus(IdeaStatus.ARCHIVED);
        archived.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        full.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        softwareGreen.setDevelopmentStage(DevelopmentStage.CONCEPT);
        softwareHardware.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        software.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        green.setDevelopmentStage(DevelopmentStage.MVP_LIVE);
        health.setDevelopmentStage(DevelopmentStage.CONCEPT);
        community.setDevelopmentStage(DevelopmentStage.PROTOTYPE);
        ideas.flush();
    }

    private User createUser(UserRole role) {
        return users.save(new User("Search tester", UUID.randomUUID() + "@example.com", role,
                "$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y"));
    }

    private Idea createIdea(String name, int minute, IdeaTag... tags) {
        Idea idea = new Idea(founder, scope + " " + name, "Pitch", "Problem", "Solution");
        idea.setTags(tags.length == 0 ? EnumSet.noneOf(IdeaTag.class) : EnumSet.copyOf(List.of(tags)));
        idea.setStatus(IdeaStatus.PUBLISHED);
        idea.setPublishedAt(Instant.parse("2026-01-01T00:00:00Z").plusSeconds(minute * 60L));
        return ideas.save(idea);
    }

    private MockHttpServletRequestBuilder search(String... tags) {
        var request = get("/api/ideas").param("q", scope);
        if (tags.length > 0) request.param("tag", tags);
        return request;
    }

    private String[] ids(Idea... values) {
        return java.util.Arrays.stream(values).map(idea -> idea.getId().toString()).toArray(String[]::new);
    }

    @Test
    void singleTagKeepsExistingFilteringAndNewestFirstOrder() throws Exception {
        mvc.perform(search("SOFTWARE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(software, softwareHardware, softwareGreen, full))))
                .andExpect(jsonPath("$.totalElements").value(4));
    }

    @Test
    void twoTagsPutBothMatchesBeforeSingleMatches() throws Exception {
        mvc.perform(search("SOFTWARE", "GREEN_TECH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(softwareGreen, full, software, green, softwareHardware))))
                .andExpect(jsonPath("$.totalElements").value(5));
    }

    @Test
    void threeTagsRankThreeThenTwoThenOneMatches() throws Exception {
        mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(full, softwareHardware, softwareGreen, software, green))))
                .andExpect(jsonPath("$.totalElements").value(5));
    }

    @Test
    void paginationUsesGlobalRankingAndCountsIdeasRatherThanTagRows() throws Exception {
        Idea[][] pages = {{full, softwareHardware}, {softwareGreen, software}, {green}};
        for (int page = 0; page < pages.length; page++) {
            mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE")
                            .param("page", String.valueOf(page)).param("size", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[*].id", contains(ids(pages[page]))))
                    .andExpect(jsonPath("$.page").value(page))
                    .andExpect(jsonPath("$.totalElements").value(5))
                    .andExpect(jsonPath("$.totalPages").value(3));
        }
    }

    @Test
    void noTagsRetainsNewestFirstBrowsingIncludingUntaggedIdeas() throws Exception {
        mvc.perform(search())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(untagged, health, software, green,
                        softwareHardware, softwareGreen, full))));
    }

    @Test
    void repeatedTagsDoNotIncreaseScoresOrTheDistinctTagLimit() throws Exception {
        mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE", "SOFTWARE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(full, softwareHardware, softwareGreen, software, green))));
    }

    @Test
    void textSearchStillFiltersTitleAndPitchBeforeRanking() throws Exception {
        String marker = "pitch-" + scope;
        softwareGreen.setElevatorPitch(marker);
        software.setElevatorPitch(marker);
        ideas.flush();
        mvc.perform(get("/api/ideas").param("tag", "SOFTWARE", "GREEN_TECH").param("q", marker.toUpperCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(softwareGreen, software))));
        mvc.perform(get("/api/ideas").param("tag", "GREEN_TECH").param("q", scope + " Software hardware"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void rankingPreservesRoleBasedVisibility(UserRole role) throws Exception {
        User viewer = createUser(role);
        Idea[] expected = role == UserRole.STUDENT || role == UserRole.PROFESSOR
                ? new Idea[]{community, full, softwareHardware, softwareGreen, software, green}
                : new Idea[]{full, softwareHardware, softwareGreen, software, green};
        mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE")
                        .with(user(viewer.getId().toString()).roles(role.name())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(expected))))
                .andExpect(jsonPath("$.totalElements").value(expected.length));
    }

    @Test
    void invalidTagsAndMoreThanThreeDistinctTagsAreRejected() throws Exception {
        mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE", "HEALTH_TECH"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.tag").isArray());
        mvc.perform(search("UNKNOWN_TAG")).andExpect(status().isBadRequest());
    }

    @Test
    void equalScoresAndPublicationDatesUseIdForStablePagination() throws Exception {
        Idea tie = createIdea("Tie", 30, SOFTWARE, HARDWARE);
        ideas.flush();
        List<Idea> tied = List.of(tie, softwareHardware).stream()
                .sorted(java.util.Comparator.comparing(idea -> idea.getId().toString())).toList();
        mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(full, tied.get(0)))))
                .andExpect(jsonPath("$.totalElements").value(6));
        mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE").param("size", "2").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(tied.get(1), softwareGreen))));
    }

    @ParameterizedTest
    @EnumSource(DevelopmentStage.class)
    void singleStageWithoutTagsFiltersAndKeepsNewestFirstOrder(DevelopmentStage stage) throws Exception {
        Idea[] expected = switch (stage) {
            case CONCEPT -> new Idea[]{health, softwareGreen};
            case PROTOTYPE -> new Idea[]{software, softwareHardware, full};
            case MVP_LIVE -> new Idea[]{green};
        };
        mvc.perform(search().param("stage", stage.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(expected))))
                .andExpect(jsonPath("$.totalElements").value(expected.length));
    }

    @Test
    void stageFiltersBeforeTagRankingAndPagination() throws Exception {
        Idea[][] pages = {{full, softwareHardware}, {software}};
        for (int page = 0; page < pages.length; page++) {
            mvc.perform(search("SOFTWARE", "GREEN_TECH", "HARDWARE")
                            .param("stage", "PROTOTYPE").param("size", "2").param("page", String.valueOf(page)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[*].id", contains(ids(pages[page]))))
                    .andExpect(jsonPath("$.totalElements").value(3))
                    .andExpect(jsonPath("$.totalPages").value(2));
        }
    }

    @Test
    void stageAndTextSearchCombineWithAndSemantics() throws Exception {
        mvc.perform(get("/api/ideas").param("q", scope + " Software").param("stage", "PROTOTYPE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(software, softwareHardware))));
        mvc.perform(search("HARDWARE").param("stage", "MVP_LIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void stageDoesNotReplaceVisibilityOrPublicationChecks() throws Exception {
        User viewer = createUser(UserRole.PROFESSOR);
        mvc.perform(search("SOFTWARE").param("stage", "PROTOTYPE")
                        .with(user(viewer.getId().toString()).roles(viewer.getRole().name())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains(ids(community, software, softwareHardware, full))))
                .andExpect(jsonPath("$.totalElements").value(4));
    }

    @Test
    void unknownStageIsRejected() throws Exception {
        mvc.perform(search().param("stage", "FINISHED"))
                .andExpect(status().isBadRequest());
    }
}
