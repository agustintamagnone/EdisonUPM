# Idea Search Filters

> Task 2.2.11 (US 2.2 – Matchmaking engine). **Design proposal**: defines the filters of the idea search and how investor preferences turn into a match. Not implemented yet.
> Related: `docs/Diagrams/Sprint 2/Investor Preferences Data Model.png`, `docs/Diagrams/Sprint 2/Component Diagram (Sprint 2).png`

## Today (Sprint 1)

`GET /api/ideas` accepts `q` (text in title or elevator pitch) and **one** `tag`. Results are PUBLISHED ideas the viewer can see, newest first.

## Filters

All filters are optional query parameters of `GET /api/ideas`. They extend what exists today, so the current calls keep working.

| Filter | Parameter | Type / values | Example | Rule |
|---|---|---|---|---|
| Text | `q` | String, 2..100 characters | `q=bike` | Matches title or elevator pitch, case-insensitive (as today) |
| Tags | `tag` (repeatable) | `IdeaTag` codes | `tag=SOFTWARE&tag=GREEN_TECH` | Idea has **any** of the tags |
| Development stage | `stage` (repeatable) | `DevelopmentStage` codes | `stage=PROTOTYPE&stage=MVP_LIVE` | Idea is in **any** of the stages |
| Has MVP link | `hasMvp` | `true` | `hasMvp=true` | Idea has an MVP link (`mvpUrl` not empty) |
| Has screenshots | `hasScreenshots` | `true` | `hasScreenshots=true` | Idea has at least 1 screenshot |
| Published since | `publishedFrom` | Date `YYYY-MM-DD` | `publishedFrom=2026-09-01` | `publishedAt` on or after that day |
| Sort | `sort` | `newest` (default), `match` | `sort=match` | `match` only for investors with preferences (see below) |
| Page | `page`, `size` | Integers; `size` 1..50, default 12 | `page=0&size=12` | As today |

**Combining filters**
- Different filters are combined with **AND**: `tag=SOFTWARE&stage=MVP_LIVE` → software ideas that are also MVP live.
- Several values of the same filter are combined with **OR**: `tag=SOFTWARE&tag=HARDWARE` → software or hardware ideas.
- Visibility rules do not change: only PUBLISHED ideas, and UPM_COMMUNITY ideas only for students and professors. **Investors only see PUBLIC ideas.**

**Validation** (400 Bad Request with the existing `ApiError`)
- Unknown tag or stage code.
- `q` shorter than 2 or longer than 100 characters.
- `publishedFrom` that is not a valid date, or is in the future.
- `sort=match` for a user who is not an investor or has no saved preferences.

## Investor preferences → "Matches for you"

An investor saves their preferences once (task 2.2.9): preferred **tags**, preferred **stages** and up to 10 **keywords**. They are used in two places:

1. **Pre-filled filters**: when an investor opens the search, the frontend fills `tag` and `stage` with their preferences. The investor can change them; nothing is saved by searching.
2. **Match score** (`sort=match` and `GET /api/matches`): each visible idea gets a score:

| Criterion | Points |
|---|---|
| Each idea tag that is in the investor's preferred tags | +2 (max. 6) |
| Idea stage is one of the preferred stages | +2 |
| Each keyword found in the title or elevator pitch | +1 (max. 3) |

- Ideas with score **0** are not shown in "Matches for you".
- Ties are sorted by newest `publishedAt`.
- Each result explains **why** it matched, e.g. `["Tag: Software", "Stage: MVP live", "Keyword: mobility"]`, so the investor understands the match.
- An empty preference ("any tag") gives no points for that criterion; it does not exclude ideas.

**Example** (Solar Locker is a made-up idea) – Investor prefers tags SOFTWARE, GREEN_TECH; stage MVP_LIVE; keyword "mobility":

| Idea | Tags | Stage | Score | Why |
|---|---|---|---|---|
| CampusShare | SOFTWARE | PROTOTYPE | 2 | Tag: Software |
| Solar Locker | GREEN_TECH, HARDWARE | MVP_LIVE | 4 | Tag: Green Tech · Stage: MVP live |
| StudyBuddy AI | ED_TECH | CONCEPT | 0 | Not shown |

## Proposed endpoints

| Endpoint | Who | Use |
|---|---|---|
| `GET /api/ideas?…` | Everyone (as today) | Search with the filters above |
| `GET /api/investors/me/preferences` | Investor | Read own preferences (empty if never saved) |
| `PUT /api/investors/me/preferences` | Investor | Save preferences `{ "preferredTags": [...], "preferredStages": [...], "keywords": [...] }` |
| `GET /api/matches?page=&size=` | Investor | Ideas with score > 0, best first, each with `score` and `reasons` |

## Decisions to confirm with the team

- Score weights (2 / 2 / 1) are a starting point; they are easy to change in `MatchmakingService`.
- Matches are calculated on each request (no table of matches). Enough for the current number of ideas; revisit if it grows.
- Should investors ever see UPM_COMMUNITY ideas? This design keeps the Sprint 1 rule (no).
