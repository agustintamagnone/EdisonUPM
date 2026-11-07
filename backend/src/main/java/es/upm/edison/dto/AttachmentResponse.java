package es.upm.edison.dto;

import es.upm.edison.model.Attachment;

import java.time.Instant;
import java.util.UUID;

public record AttachmentResponse(
        UUID id,
        String fileName,
        String contentType,
        long sizeBytes,
        int displayOrder,
        String url,
        Instant uploadedAt) {

    public static AttachmentResponse from(Attachment attachment) {
        String url = "/api/ideas/%s/attachments/%s/file".formatted(attachment.getIdea().getId(), attachment.getId());
        return new AttachmentResponse(
                attachment.getId(),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getDisplayOrder(),
                url,
                attachment.getUploadedAt());
    }
}
