# Idea Tags and Development Stage Model

> Task #106 (US #72 – Add tags to Ideas). Documents the model **as implemented** in Sprint 2.
> Diagram: `docs/Diagrams/Sprint 2/Idea Tags and Stage Data Model.png`

Every idea is classified with **tags** (what it is about) and a **development stage** (how far it is). Both are **fixed lists**: users choose values from them, nobody creates or edits tags. FRONT and UX must use exactly these codes, which are the only values the backend accepts.

## Tags (`IdeaTag`)

| Code (API / DB) | Display label | Meaning |
|---|---|---|
| `GREEN_TECH` | Green Tech | Clean energy, emissions, sustainability technology |
| `SOFTWARE` | Software | Apps, platforms, web or mobile products |
| `HARDWARE` | Hardware | Physical devices, electronics, robotics |
| `HEALTH_TECH` | HealthTech | Health, medicine and wellbeing |
| `ED_TECH` | EdTech | Education and learning |
| `CIRCULAR_ECONOMY` | Circular Economy | Reuse, recycling, waste reduction |

**Rules**
- A **draft** can have 0 to 3 tags.
- To **publish**, an idea needs **1, 2 or 3 tags**.
- The same tag cannot be added twice to an idea.

## Development stages (`DevelopmentStage`)

| Code (API / DB) | Display label | Meaning |
|---|---|---|
| `CONCEPT` | Idea | Only the idea; nothing built yet |
| `PROTOTYPE` | Prototype | A first working version exists |
| `MVP_LIVE` | MVP live | A minimum viable product is available to users |

**Rules**
- **One stage per idea** (or none while it is a draft).
- To **publish**, the stage is **required**.

## How it is used

**API** (JSON field names):

```json
{
  "tags": ["SOFTWARE", "GREEN_TECH"],
  "developmentStage": "PROTOTYPE"
}
```

| Endpoint | Use |
|---|---|
| `GET /api/tags` | List of tag codes |
| `GET /api/development-stages` | List of stage codes |
| `PUT /api/ideas/{id}/classification` | Save tags and stage of a draft (wizard step 2) |
| `GET /api/ideas?tag=SOFTWARE` | Browse published ideas filtered by tag |

- The API sends and receives **codes only**. The display labels live in the frontend (`frontend/src/utils/ideaDisplay.ts`: `TAG_LABELS`, `STAGE_LABELS`).
- A code that does not exist (e.g. `"developmentStage": "DONE"`) returns **400 Bad Request**. Breaking a rule (e.g. 4 tags, or publishing without a stage) returns **422** with the errors of the step.

**Database** (`database/01_schema.sql`):

| Table | Columns | Key | Notes |
|---|---|---|---|
| `idea_tags` | `idea_id CHAR(36)`, `tag VARCHAR(20)` | PK (`idea_id`, `tag`), FK → `ideas.id` (cascade) | `CHECK` limits `tag` to the 6 codes. The 3-tag limit is checked by the backend, not the DB. |
| `idea_stage` | `idea_id CHAR(36)`, `stage VARCHAR(20)` | PK (`idea_id`), FK → `ideas.id` (cascade) | `CHECK` limits `stage` to the 3 codes. One row per idea at most; no row until it is chosen. |

**Backend**: enums `model/IdeaTag.java` and `model/DevelopmentStage.java`; mapped in `model/Idea.java`; rules in `service/IdeaService.java` (`validateClassification`, `MAX_TAGS = 3`).

## Changes compared with the task description

The task text was written before the last changes. What is implemented differs in:

| Task said | Implemented |
|---|---|
| An idea has 1 or 2 tags | **1 to 3 tags** (changed in `fix: update tags rules`) |
| `idea_stage (idea_id, stage)`, PK both fields | PK is **`idea_id`** only, so the database itself guarantees one stage per idea |
| Example label `GREEN_TECH` → "Green tech" | Frontend shows **"Green Tech"**; `CONCEPT` is shown as **"Idea"** |
