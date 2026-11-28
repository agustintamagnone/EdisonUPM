package es.upm.edison.service;

import es.upm.edison.exception.ForbiddenException;
import es.upm.edison.exception.NotFoundException;
import es.upm.edison.exception.UnauthorizedException;
import es.upm.edison.exception.ValidationException;
import es.upm.edison.model.Idea;
import es.upm.edison.model.IdeaStatus;
import es.upm.edison.model.User;
import es.upm.edison.repository.IdeaRepository;

import java.util.UUID;

/** Access checks on ideas shared by IdeaService, AttachmentService, CommentService and UserService. */
final class IdeaAccess {

    private IdeaAccess() {
    }

    static Idea load(IdeaRepository ideas, UUID ideaId) {
        return ideas.findById(ideaId).orElseThrow(() -> new NotFoundException("Idea unavailable"));
    }

    /** Loads the idea and checks that {@code viewer} (may be null) can see it. */
    static Idea loadVisible(IdeaRepository ideas, UUID ideaId, User viewer) {
        Idea idea = load(ideas, ideaId);
        if (!idea.isVisibleTo(viewer)) {
            if (idea.getStatus() == IdeaStatus.PUBLISHED && viewer == null && !idea.getFounder().isBlocked()) {
                throw new UnauthorizedException("This idea is only visible to the UPM community. Please log in.");
            }
            throw new NotFoundException("Idea unavailable");
        }
        return idea;
    }

    /** Loads an idea in any state for its founder or an administrator. */
    static Idea loadOwn(IdeaRepository ideas, UUID ideaId, User user) {
        Idea idea = load(ideas, ideaId);
        if (!idea.isFoundedBy(user) && !user.isAdministrator()) {
            throw new ForbiddenException("Only the founder or an administrator can manage this idea");
        }
        return idea;
    }

    /** Loads a DRAFT idea for its founder or an administrator. */
    static Idea loadOwnDraft(IdeaRepository ideas, UUID ideaId, User user) {
        Idea idea = loadOwn(ideas, ideaId, user);
        if (idea.getStatus() != IdeaStatus.DRAFT) {
            throw new ValidationException("status", "Only DRAFT ideas can be edited");
        }
        return idea;
    }
}
