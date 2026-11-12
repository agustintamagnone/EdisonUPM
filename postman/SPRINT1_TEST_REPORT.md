# EdisonUPM – Sprint 1 Backend Test Report

**Date:** 12 November 2026 · **Code tested:** branch `main`, commit `a82d8a4` (Merge pull request #5), no local changes · **Verdict:** SPRINT 1 BACKEND PARTIALLY VERIFIED (the three user stories work; the CI task has no implementation)

## 1. Summary

| Check | Result |
|-------|--------|
| Java build (`mvn test`, Java 21, Maven 3.9) | ✅ BUILD SUCCESS, 50 source files compiled |
| Automated tests | ✅ 2 run, 2 passed, 0 failed, 0 skipped (H2 in-memory database, not MySQL) |
| MySQL scripts `00`, `01`, `02` | ✅ all ran without errors on a fresh MySQL 8.4.13 |
| Hibernate entity validation (`ddl-auto=validate`) | ✅ backend started on MySQL; it refuses to start if entities and tables do not match |
| Backend on `http://localhost:8080` | ✅ started in 3.1 s, responded to every request |
| Smoke test, 8 requests | ✅ 8/8 PASS, 45/45 assertions, run 3 times on the same database |
| Records in MySQL | ✅ idea, tags, stage, attachment and comment correctly linked |
| Uploaded image | ✅ file on disk and downloaded file identical to the uploaded PNG (same SHA-256) |
| Folder B reference requests | ✅ 21/21 returned the status the code is designed to return, no server errors |
| CI/CD pipeline | ❌ none in the repository (0 GitHub workflows) |

## 2. Test environment

Everything was disposable and isolated; no existing database was touched.

- MySQL 8.4.13 in a new Docker container with its data in memory (deleted when the container stops).
- Backend run with `mvn spring-boot:run` (Java 21) on a copy of the commit above, sharing the MySQL container's network.
- Smoke test executed with **Newman 6**, Postman's official command-line runner, in a throwaway container, using the exact collection and environment files in this folder. It runs the same test scripts as the Postman app; the collection was not clicked through in the Postman desktop app itself.
- One temporary change, **in the disposable database only**: user `'edison'@'127.0.0.1'` was added with the same rights as `'edison'@'localhost'` (see issue 1). No repository file was changed.

## 3. Smoke test – the eight requests

Users: founder = Lucia Martin (`1111…`), commenter = Carlos Ruiz (`2222…`), both STUDENT from `02_seed.sql`.

| # | Request | Expected | Actual | Status |
|---|---------|----------|--------|--------|
| 1 | `POST /api/ideas` | 201, new DRAFT idea owned by founder | 201 Created, status DRAFT, founder Lucia, `ideaId` saved – 7/7 checks | ✅ PASS |
| 2 | `PUT /api/ideas/{ideaId}/classification` | 200, tags SOFTWARE + ED_TECH, stage PROTOTYPE | 200 OK, tags and stage saved, still DRAFT – 5/5 | ✅ PASS |
| 3 | `POST /api/ideas/{ideaId}/attachments` | 201, PNG linked to the idea | 201 Created, `image/png`, 10 903 bytes, displayOrder 0, URL contains idea and attachment ids – 7/7 | ✅ PASS |
| 4 | `POST /api/ideas/{ideaId}/publish` | 200, PUBLISHED with screenshot | 200 OK, PUBLISHED, `publishedAt` set, PUBLIC, students may comment, screenshot listed – 7/7 | ✅ PASS |
| 5 | `GET /api/ideas?q={runTag}` (no login) | idea in public list | 200 OK, idea found, PUBLISHED, tags and stage correct – 4/4 | ✅ PASS |
| 6 | `GET /api/ideas/{ideaId}/attachments/{attachmentId}/file` | 200, the PNG bytes | 200 OK, `image/png`, `nosniff`, PNG signature, same size as upload – 5/5 | ✅ PASS |
| 7 | `POST /api/ideas/{ideaId}/comments` (commenter) | 201, comment on this idea by commenter | 201 Created, `ideaId` and author correct, fresh `clientRequestId` – 6/6 | ✅ PASS |
| 8 | `GET /api/ideas/{ideaId}/comments` (no login) | comment listed | 200 OK, comment found, `count` matches list, linked to idea and commenter – 4/4 | ✅ PASS |

**Rerun check:** the folder was run 3 times on the same database. Each run created a new idea, screenshot and comment, and all 45 assertions passed every time.

**Assertions not tested:** none. Every assertion in folder A ran and passed in Newman.

### MySQL check after the second run

```
idea      38b5e15c-…  "Smoke test idea SMOKE-1794439547196"  PUBLISHED  PUBLIC  founder Lucia Martin  stage PROTOTYPE  tags ED_TECH,SOFTWARE
attachment 4b8e13b2-…  idea 38b5e15c-…  edison-smoke-test.png  image/png  10903 bytes  order 0  storage key 857f1ea0-….png
comment   cad9fe77-…  idea 38b5e15c-…  author Carlos Ruiz  VISIBLE  "Smoke test comment for SMOKE-1794439547196 - looks promising"
```

The stored file `backend/storage/images/857f1ea0-….png`, the downloaded file and `fixtures/edison-smoke-test.png` all have SHA-256 `cd93f428…bfbaa1`.

### Database structure

8 tables: `users`, `ideas`, `idea_tags`, `idea_stage`, `idea_allowed_commenter_roles`, `attachments`, `comments`, `saved_ideas`. 9 foreign keys: everything belonging to an idea is deleted with it (CASCADE); ideas and comments keep their founder/author (deleting a user who has ideas is refused). Seed data: 5 users, 2 ideas (1 published, 1 draft), 1 comment.

## 4. All current API endpoints

28 endpoints in 4 controllers. "Observed" is from this test run (folder A, or folder B run once after folder A). Folder B has no automatic checks, so its results are informational.

| Method | Path | Purpose | Login | Observed |
|--------|------|---------|-------|----------|
| GET | `/api/tags` | List of tags | no | 200 |
| GET | `/api/development-stages` | List of stages | no | 200 |
| GET | `/api/ideas?q=&tag=&page=&size=` | Browse/search published ideas | optional | 200 (A5 and B) |
| GET | `/api/ideas/mine` | My ideas | yes | 200 |
| GET | `/api/ideas/{id}` | Idea details | optional | 200 |
| POST | `/api/ideas` | Create draft (student only) | yes | 201 (A1) |
| PUT | `/api/ideas/{id}/basics` | Edit title, pitch, problem, solution (draft) | yes | 422, correct: idea already published |
| PUT | `/api/ideas/{id}/classification` | Tags (1–3) and stage (draft) | yes | 200 (A2) |
| PUT | `/api/ideas/{id}/mvp-link` | Set MVP link (draft) | yes | 422, correct: idea already published |
| DELETE | `/api/ideas/{id}/mvp-link` | Remove MVP link (draft) | yes | 422, correct: idea already published |
| POST | `/api/ideas/{id}/publish` | Publish | yes | 200 (A4) |
| POST | `/api/ideas/{id}/archive` | Archive | yes | 200 |
| GET | `/api/ideas/{id}/attachments` | List screenshots | optional | 200 |
| POST | `/api/ideas/{id}/attachments` | Upload screenshot (draft) | yes | 201 (A3) |
| DELETE | `/api/ideas/{id}/attachments/{attachmentId}` | Delete screenshot (draft) | yes | 422, correct: idea already published |
| GET | `/api/ideas/{id}/attachments/{attachmentId}/file` | Download image | optional | 200 (A6) |
| GET | `/api/ideas/{id}/comments` | List comments | optional | 200 (A8) |
| POST | `/api/ideas/{id}/comments` | Post comment | yes | 201 (A7) |
| PUT | `/api/comments/{commentId}` | Edit own comment | yes | 200 |
| DELETE | `/api/comments/{commentId}` | Delete own comment (soft) | yes | 204 |
| GET | `/api/users/me` | My profile | yes | 200 |
| PUT | `/api/users/me` | Change my name | yes | 200 |
| GET | `/api/users/me/saved-ideas` | My saved ideas | yes | 200 |
| PUT | `/api/users/me/saved-ideas/{ideaId}` | Save idea | yes | 204 |
| DELETE | `/api/users/me/saved-ideas/{ideaId}` | Unsave idea | yes | 204 |
| GET | `/api/users/founders` | Users with published ideas | no | 200 |
| GET | `/api/users/mentors` | Professors | no | 200 |
| GET | `/api/users/{userId}` | User profile | no | 200 |

"Login" means the `X-User-Id` header. Request bodies and every possible error code are documented in each request of folder B.

## 5. Problems found

| # | Priority | Problem | Evidence | Who / task |
|---|----------|---------|----------|------------|
| 1 | Important (setup) | The Docker MySQL option in `README.md` cannot log in as `edison`. The script creates `'edison'@'localhost'`, but MySQL in Docker sees the backend as `127.0.0.1` (or a Docker address). | Backend start failed with `Access denied for user 'edison'@'127.0.0.1'`; it started after adding the same user for `127.0.0.1` in the test database. A native MySQL install was not tested. | Database (#36) |
| 2 | Important (process) | No CI/CD pipeline. No `.github/workflows`, 0 workflows on GitHub. | `git ls-files`, GitHub API | CI/CD (#60) |
| 3 | Important (testing) | Automated tests use H2 only, so the MySQL scripts are never tested automatically. | `application-test.properties` | Team |
| 4 | For the demo | No frontend in the repository (`README.md` says "coming soon"). The backend can be demonstrated with this Postman collection. | repository tree | Frontend owner |
| 5 | Minor | `01_schema.sql` comment says "1..2 tags"; the code allows 1–3 (and the tests check 3). | `database/01_schema.sql` | Database (#36) |

Known from the earlier audit and not Sprint 1 blockers: identity is a temporary header that anyone can set; user emails are returned to anonymous visitors; reusing a `clientRequestId` on a different idea returns the older comment.

## 6. Commands used

```bash
# Automated tests (inside maven:3.9-eclipse-temurin-21)
cd backend && mvn -B -ntp test
#  -> Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 ... BUILD SUCCESS

# Database: fresh MySQL 8.4, scripts run in order
mysql -uroot < database/00_create_database.sql
mysql -uedison edison_upm < database/01_schema.sql
mysql -uedison edison_upm < database/02_seed.sql

# Backend
cd backend && mvn -B -ntp spring-boot:run
#  -> Started EdisonUpmApplication in 3.067 seconds

# Smoke test
newman run EdisonUPM-Sprint1.postman_collection.json -e EdisonUPM-Local.postman_environment.json \
  --folder "A - Sprint 1 Smoke Test" --working-dir postman
#  -> requests 8 / failed 0, assertions 45 / failed 0
```
