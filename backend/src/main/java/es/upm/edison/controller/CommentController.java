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
import org.springframework.web.bind.annotation.RequestHeader;
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
    public CommentListResponse list(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                    @PathVariable UUID ideaId) {
        return commentService.list(ideaId, userId);
    }

    @PostMapping("/ideas/{ideaId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse create(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                  @PathVariable UUID ideaId,
                                  @RequestBody CommentRequest request) {
        return commentService.create(ideaId, userId, request);
    }

    @PutMapping("/comments/{commentId}")
    public CommentResponse update(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                  @PathVariable UUID commentId,
                                  @RequestBody CommentRequest request) {
        return commentService.update(commentId, userId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                       @PathVariable UUID commentId) {
        commentService.delete(commentId, userId);
    }
}
