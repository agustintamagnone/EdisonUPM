package es.upm.edison.controller;

import es.upm.edison.config.CurrentUser;
import es.upm.edison.dto.CommentListResponse;
import es.upm.edison.dto.CommentRequest;
import es.upm.edison.dto.CommentResponse;
import es.upm.edison.service.CommentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.security.Principal;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** List and post comments, edit and delete own comments. */
@RestController
@RequestMapping("/api")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/ideas/{ideaId}/comments")
    public CommentListResponse list(Principal principal,
                                    @PathVariable UUID ideaId) {
        return commentService.list(ideaId, CurrentUser.id(principal));
    }

    @PostMapping("/ideas/{ideaId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse create(Principal principal,
                                  @PathVariable UUID ideaId,
                                  @RequestBody CommentRequest request) {
        return commentService.create(ideaId, CurrentUser.id(principal), request);
    }

    @PutMapping("/comments/{commentId}")
    public CommentResponse update(Principal principal,
                                  @PathVariable UUID commentId,
                                  @RequestBody CommentRequest request) {
        return commentService.update(commentId, CurrentUser.id(principal), request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal,
                       @PathVariable UUID commentId) {
        commentService.delete(commentId, CurrentUser.id(principal));
    }
}
