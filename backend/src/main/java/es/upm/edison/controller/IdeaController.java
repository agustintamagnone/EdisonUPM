package es.upm.edison.controller;

import es.upm.edison.config.CurrentUser;
import es.upm.edison.dto.IdeaBasicsRequest;
import es.upm.edison.dto.IdeaClassificationRequest;
import es.upm.edison.dto.IdeaResponse;
import es.upm.edison.dto.IdeaSummaryResponse;
import es.upm.edison.dto.MvpLinkRequest;
import es.upm.edison.dto.PageResponse;
import es.upm.edison.dto.PublishIdeaRequest;
import es.upm.edison.model.DevelopmentStage;
import es.upm.edison.model.IdeaTag;
import es.upm.edison.service.IdeaService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.security.Principal;
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

    @GetMapping("/tags")
    public List<IdeaTag> getTags() {
        return ideaService.getTags();
    }

    @GetMapping("/development-stages")
    public List<DevelopmentStage> getDevelopmentStages() {
        return ideaService.getDevelopmentStages();
    }

    @GetMapping("/ideas")
    public PageResponse<IdeaSummaryResponse> browse(Principal principal,
                                                    @RequestParam(required = false) String q,
                                                    @RequestParam(required = false) IdeaTag tag,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "12") int size) {
        return ideaService.browse(CurrentUser.id(principal), q, tag, page, size);
    }

    @GetMapping("/ideas/mine")
    public List<IdeaSummaryResponse> getMyIdeas(Principal principal) {
        return ideaService.getMyIdeas(CurrentUser.id(principal));
    }

    @GetMapping("/ideas/{ideaId}")
    public IdeaResponse getIdea(Principal principal,
                                @PathVariable UUID ideaId) {
        return ideaService.getIdea(ideaId, CurrentUser.id(principal));
    }

    // ---------- Drafts (publication wizard) ----------

    @PostMapping("/ideas")
    @ResponseStatus(HttpStatus.CREATED)
    public IdeaResponse createDraft(Principal principal,
                                    @RequestBody IdeaBasicsRequest request) {
        return ideaService.createDraft(CurrentUser.id(principal), request);
    }

    @PutMapping("/ideas/{ideaId}/basics")
    public IdeaResponse updateBasics(Principal principal,
                                     @PathVariable UUID ideaId,
                                     @RequestBody IdeaBasicsRequest request) {
        return ideaService.updateBasics(ideaId, CurrentUser.id(principal), request);
    }

    @PutMapping("/ideas/{ideaId}/classification")
    public IdeaResponse updateClassification(Principal principal,
                                             @PathVariable UUID ideaId,
                                             @RequestBody IdeaClassificationRequest request) {
        return ideaService.updateClassification(ideaId, CurrentUser.id(principal), request);
    }

    @PutMapping("/ideas/{ideaId}/mvp-link")
    public IdeaResponse setMvpLink(Principal principal,
                                   @PathVariable UUID ideaId,
                                   @RequestBody MvpLinkRequest request) {
        return ideaService.setMvpLink(ideaId, CurrentUser.id(principal), request);
    }

    @DeleteMapping("/ideas/{ideaId}/mvp-link")
    public IdeaResponse removeMvpLink(Principal principal,
                                      @PathVariable UUID ideaId) {
        return ideaService.removeMvpLink(ideaId, CurrentUser.id(principal));
    }

    // ---------- Publication ----------

    @PostMapping("/ideas/{ideaId}/publish")
    public IdeaResponse publish(Principal principal,
                                @PathVariable UUID ideaId,
                                @RequestBody PublishIdeaRequest request) {
        return ideaService.publish(ideaId, CurrentUser.id(principal), request);
    }

    @PostMapping("/ideas/{ideaId}/archive")
    public IdeaResponse archive(Principal principal,
                                @PathVariable UUID ideaId) {
        return ideaService.archive(ideaId, CurrentUser.id(principal));
    }
}
