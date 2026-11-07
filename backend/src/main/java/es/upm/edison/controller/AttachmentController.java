package es.upm.edison.controller;

import es.upm.edison.config.CurrentUser;
import es.upm.edison.dto.AttachmentResponse;
import es.upm.edison.service.AttachmentService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/** Upload screenshots to a draft, list idea screenshots, remove a screenshot and serve the file. */
@RestController
@RequestMapping("/api/ideas/{ideaId}/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public List<AttachmentResponse> list(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                         @PathVariable UUID ideaId) {
        return attachmentService.list(ideaId, userId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentResponse upload(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                     @PathVariable UUID ideaId,
                                     @RequestParam("file") MultipartFile file) {
        return attachmentService.upload(ideaId, userId, file);
    }

    @DeleteMapping("/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                       @PathVariable UUID ideaId,
                       @PathVariable UUID attachmentId) {
        attachmentService.remove(ideaId, attachmentId, userId);
    }

    @GetMapping("/{attachmentId}/file")
    public ResponseEntity<Resource> serveFile(@RequestHeader(value = CurrentUser.HEADER, required = false) UUID userId,
                                              @PathVariable UUID ideaId,
                                              @PathVariable UUID attachmentId) {
        AttachmentService.StoredImage image = attachmentService.loadFile(ideaId, attachmentId, userId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(image.fileName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(image.resource());
    }
}
