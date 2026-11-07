package es.upm.edison.controller;

import es.upm.edison.config.CurrentUser;
import es.upm.edison.dto.CategoryResponse;
import es.upm.edison.dto.IdeaBasicsRequest;
import es.upm.edison.dto.IdeaClassificationRequest;
import es.upm.edison.dto.IdeaResponse;
import es.upm.edison.dto.IdeaSummaryResponse;
import es.upm.edison.dto.MvpLinkRequest;
import es.upm.edison.dto.PageResponse;
import es.upm.edison.dto.PublishIdeaRequest;
import es.upm.edison.service.IdeaService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Create and edit drafts, publish and archive ideas, browse and search ideas, manage MVP link. */
@RestController
@RequestMapping("/api")
public class IdeaController {

    private final IdeaService ideaService;

    public IdeaController(IdeaService ideaService) {
        this.ideaService = ideaService;
    }

    // ---------- Browse and search ----------

    @GetMapping("/categories")
    public List<CategoryResponse> getCategories() {
        return ideaService.getCategories();
    }

    @GetMapping("/ideas")
    public PageResponse<IdeaSummaryResponse> browse(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                                    @RequestParam(required = false) String q,
                                                    @RequestParam(required = false) UUID categoryId,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "12") int size) {
        return ideaService.browse(userId, q, categoryId, page, size);
    }

    @GetMapping("/ideas/mine")
    public List<IdeaSummaryResponse> getMyIdeas(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId) {
        return ideaService.getMyIdeas(userId);
    }

    @GetMapping("/ideas/{ideaId}")
    public IdeaResponse getIdea(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                @PathVariable UUID ideaId) {
        return ideaService.getIdea(ideaId, userId);
    }

    // ---------- Drafts (publication wizard) ----------

    @PostMapping("/ideas")
    @ResponseStatus(HttpStatus.CREATED)
    public IdeaResponse createDraft(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                    @RequestBody IdeaBasicsRequest request) {
        return ideaService.createDraft(userId, request);
    }

    @PutMapping("/ideas/{ideaId}/basics")
    public IdeaResponse updateBasics(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                     @PathVariable UUID ideaId,
                                     @RequestBody IdeaBasicsRequest request) {
        return ideaService.updateBasics(ideaId, userId, request);
    }

    @PutMapping("/ideas/{ideaId}/classification")
    public IdeaResponse updateClassification(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                             @PathVariable UUID ideaId,
                                             @RequestBody IdeaClassificationRequest request) {
        return ideaService.updateClassification(ideaId, userId, request);
    }

    @PutMapping("/ideas/{ideaId}/mvp-link")
    public IdeaResponse setMvpLink(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                   @PathVariable UUID ideaId,
                                   @RequestBody MvpLinkRequest request) {
        return ideaService.setMvpLink(ideaId, userId, request);
    }

    @DeleteMapping("/ideas/{ideaId}/mvp-link")
    public IdeaResponse removeMvpLink(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                      @PathVariable UUID ideaId) {
        return ideaService.removeMvpLink(ideaId, userId);
    }

    // ---------- Publication ----------

    @PostMapping("/ideas/{ideaId}/publish")
    public IdeaResponse publish(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                @PathVariable UUID ideaId,
                                @RequestBody PublishIdeaRequest request) {
        return ideaService.publish(ideaId, userId, request);
    }

    @PostMapping("/ideas/{ideaId}/archive")
    public IdeaResponse archive(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                @PathVariable UUID ideaId) {
        return ideaService.archive(ideaId, userId);
    }
}
