Proposed integration specification for anonymous publishing and idea ratings
No files were modified. All schema, DTO, and endpoint changes below are proposals.
Current implementation
Spring Boot keeps the founder on ideas.founder_id. Idea summaries and details serialize the founder as UserResponse, which contains id, fullName, email, and role. Comments serialize their authors the same way. The frontend demonstrations use React state. The publishing wizard blocks submission while its anonymity demo is active, and the rating preview sends no requests. [Idea schema (line 34)](C:/Users/zRazvan/Desktop/Edison/Backend/database/01_schema.sql:34) · [Idea summary DTO (line 14)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/dto/IdeaSummaryResponse.java:14) · [User DTO (line 8)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/dto/UserResponse.java:8) · [Comment DTO (line 8)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/dto/CommentResponse.java:8) · [Anonymity demo](C:/Users/zRazvan/Desktop/Edison/Frontend/src/components/publish/AnonymousPublishingPreview.tsx) · [Rating demo](C:/Users/zRazvan/Desktop/Edison/Frontend/src/components/ideas/RatingPreview.tsx)
1. Anonymous publishing
Proposed database changes
- Keep ideas.founder_id and its foreign key. Continue using it for ownership, My Ideas, draft editing, attachments, and archiving.
- Add ideas.author_visibility with allowed values NAMED and ANONYMOUS, NOT NULL, and a default of NAMED. Backfill existing ideas as named. This setting is independent of the idea’s audience (PUBLIC or UPM_COMMUNITY).
- Optionally add author_revealed_at for internal auditing. The recommended policy is a one-way reveal after publication.
Proposed API and DTOs
Operation	Contract
Extend existing POST /api/ideas/{ideaId}/publish	Add optional authorVisibility to PublishIdeaRequest. An omitted or null value defaults to NAMED. A successful request returns 200 with the updated idea.
Add POST /api/ideas/{ideaId}/reveal-author	No request body. The authenticated owner can reveal a published idea. Return 200 with the updated idea. Repeating the request as the owner of an already named, published idea returns the same named representation.


Example publish request:
{
  "feedbackEnabled": true,
  "allowedCommenterRoles": ["STUDENT", "PROFESSOR"],
  "visibility": "PUBLIC",
  "declarationAccepted": true,
  "authorVisibility": "ANONYMOUS"
}
Proposed anonymous fragment of IdeaSummaryResponse and IdeaResponse. Other idea fields remain as they are today.
{
  "authorVisibility": "ANONYMOUS",
  "founder": null,
  "viewerIsOwner": false
}
For a named idea, retain the current founder object shape and return authorVisibility: "NAMED". viewerIsOwner is calculated from the authenticated session. An owner viewing an anonymous idea receives viewerIsOwner: true and the same founder: null projection. The frontend can use /api/users/me for private account information.
Authorization and service changes
- IdeaService and idea DTO mapping: Persist the preference in the existing draft-to-published transaction. Use a shared redaction rule for Pitch Board, idea details, My Ideas, saved ideas, and mutation responses. Reveal must verify ownership using the session principal and the stored founder ID, then update the setting transactionally. Administrator status alone grants no reveal permission.
- CommentService: Keep comments.author_id internally. On an anonymous idea, project the founder’s comments as {"authorVisibility":"ANONYMOUS","author":null}. The UI displays Anonymous Founder. Other commenters keep their existing author representation. Apply the projection to list, create, update, and idempotent replay responses. The proposed one-way reveal also names the founder’s earlier comments on that idea. Explain this consequence before confirming reveal.
- Comment replay and profile discovery: The current replay lookup uses author ID and request ID. Check idea access before returning a replay and verify that the stored comment belongs to the requested idea. Filter the founders directory so an account qualifies only through a named, published idea visible to the viewer. Public profiles may continue to exist independently of an anonymous idea. [Comment service (line 61)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/service/CommentService.java:61) · [Founders lookup (line 63)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/service/UserService.java:63)
Privacy requirements
For anonymous projections, omit founder identifiers, names, email, role, profile links, and stable aliases. Use the same generic label across anonymous ideas. Check attachment filenames and Content-Disposition headers for identifying information. Define a server-side policy for image metadata, and warn authors that screenshots, text, and MVP links can identify them. Exclude raw owner identifiers from public search and error responses. Keep any reveal audit log access-restricted, and prevent shared caches from reusing viewer-specific responses. [Attachment response headers (line 59)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/controller/AttachmentController.java:59)
2. Idea ratings
Proposed database changes
Create idea_ratings with these fields:
Field	Constraint
idea_id, user_id	Match the existing UUID column types. Use a composite primary key on (idea_id, user_id) and foreign keys to ideas and users.
stars	Required integer with a database check from 1 to 5.
created_at, updated_at	Required timestamps stored in UTC.


Use an atomic upsert keyed by (idea_id, user_id). A repeated submission of the same value leaves the count unchanged. Compute totals from the stored rows initially. Keep ratings when an idea is archived and exclude them from the API while it is archived. Cascade rating removal on a hard delete of the idea or account.
Proposed API and DTOs
Operation	Contract
Add GET /api/ideas/{ideaId}/ratings	Returns 200 with RatingSummaryResponse for a published idea the caller can view. Guests can read the summary for public ideas.
Add PUT /api/ideas/{ideaId}/ratings/me	Accepts SetRatingRequest. Creates the caller’s rating with 201 or replaces it with 200. Both responses return the updated RatingSummaryResponse.


{ "stars": 4 }
{
  "average": 4.25,
  "count": 8,
  "viewerRating": 4,
  "viewerCanRate": true
}
average is a JSON number rounded to two decimal places, or null when count is zero. viewerRating is null for a guest or a viewer who has never rated. viewerCanRate reflects server-side eligibility.

Recommended policy: Any authenticated non-owner who can view the published idea can rate it. Comment permissions remain independent. Confirm the self-rating rule before implementation. A new RatingService should derive the rater from the session, reuse idea visibility checks, validate the integer range, and return a consistent aggregate after the write. Coordinate rating writes with archive and delete so a concurrent status change cannot leave a newly accepted rating on an unavailable idea. Drafts, archived ideas, and deleted ideas return 404 from the rating endpoints, including for the owner.
3. Shared authorization, frontend, and rollout
- Authorization and errors: Keep the existing session cookie and CSRF flow for writes. Retain current idea visibility rules, including the sign-in challenge for guests opening a UPM-only publication. Use the existing ApiError shape. Return 403 for an authenticated non-owner revealing a visible idea or for a disallowed self-rating, 409 when an owner tries to reveal a visible idea in an invalid lifecycle state, 400 for malformed input, and 422 for a well-formed rating outside the allowed range. Reject fractional values before numeric coercion. [Idea access rules (line 24)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/service/IdeaAccess.java:24) · [Security config (line 67)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/config/SecurityConfig.java:67) · [Error DTO (line 7)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/java/es/upm/edison/exception/ApiError.java:7)
- Frontend integration: Make founder and comment author fields nullable. Replace founder.id ownership comparisons with viewerIsOwner, and render the anonymous label without profile links. Replace the demo reveal with an owner-only action and a confirmation that covers earlier comments. Reuse StarRatingInput, initialize it from viewerRating, submit through the authenticated API client, and display the returned average and count. Keep the last confirmed rating visible if a write fails. [Current idea detail bindings (line 45)](C:/Users/zRazvan/Desktop/Edison/Frontend/src/app/ideas/[ideaId]/page.tsx:45) · [Frontend API and CSRF usage (line 12)](C:/Users/zRazvan/Desktop/Edison/Frontend/src/utils/ideas.ts:12)
- Compatibility and deployment: Apply an additive migration before starting Hibernate with ddl-auto=validate. Deploy frontend readers that tolerate nullable authors and absent rating data. Enable anonymous publication only after every backend instance that serves idea or comment data applies redaction. An older backend build would expose anonymous founder data if it served those records, so rollback must retain a redaction-capable reader. Existing named ideas and legacy publish requests keep their current behavior. [Hibernate configuration (line 11)](C:/Users/zRazvan/Desktop/Edison/Backend/backend/src/main/resources/application.properties:11)
4. Recommended tests
1. Redaction across every response. Publish an anonymous idea and inspect browse, detail, saved, My Ideas, comment list and replay, directory, and attachment responses. Assert that identifiers, names, emails, roles, and identifying filenames are absent. Include guest, owner, non-owner, and administrator sessions.
2. Reveal and compatibility. Verify owner reveal, repeated reveal, non-owner and missing-CSRF rejection, invalid lifecycle handling, and the transition of earlier founder comments to named. Verify an old publish request still creates a named idea.
3. Rating integrity. Test the 1 and 5 boundaries, missing and fractional values, self-rating policy, visibility, empty aggregates, and viewer-specific values. Verify an update changes the average while preserving the count. Race two first writes from the same user and race a rating with archive.
4. Lifecycle and browser checks. Verify archived ratings are inaccessible, hard deletion removes rating rows, and different sessions cannot see each other’s rating. In Chrome, check anonymous cards and comments, owner reveal, keyboard rating input, and failed or expired-session recovery. Run migration, foreign-key, and concurrency tests against a disposable MySQL instance.