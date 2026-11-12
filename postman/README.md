# EdisonUPM – Postman collection (Sprint 1)

This folder lets anyone on the team test the EdisonUPM backend in a few clicks.

| File | What it is |
|------|------------|
| `EdisonUPM-Sprint1.postman_collection.json` | The requests (Postman Collection v2.1) |
| `EdisonUPM-Local.postman_environment.json` | Variables for a backend running on your computer |
| `fixtures/edison-smoke-test.png` | A small, real PNG image used by the upload request |
| `SPRINT1_TEST_REPORT.md` | Results of the Sprint 1 test run |

## What the collection contains

**Folder A – Sprint 1 Smoke Test** (8 requests, each with automatic checks). It walks through the whole Sprint 1 story:

1. `POST /api/ideas` – a student creates an idea draft
2. `PUT /api/ideas/{{ideaId}}/classification` – tags and development stage
3. `POST /api/ideas/{{ideaId}}/attachments` – upload a screenshot
4. `POST /api/ideas/{{ideaId}}/publish` – publish the idea
5. `GET /api/ideas` – the idea appears in the public list
6. `GET /api/ideas/{{ideaId}}/attachments/{{attachmentId}}/file` – download the screenshot
7. `POST /api/ideas/{{ideaId}}/comments` – another student comments
8. `GET /api/ideas/{{ideaId}}/comments` – the comment appears

**Folder B – Complete API Reference** (21 requests, no automatic checks). Every other endpoint in the controllers, grouped by feature. Open a request and read its **Documentation** tab for the body format and the status codes it can return. Some of these change data (edit, delete, archive), so use them on a test database.

## About `X-User-Id` (there is no login yet)

The backend does not have login yet. Instead, a request says who is acting with the header `X-User-Id: <user UUID>`. The environment uses two fictional students from `database/02_seed.sql`:

| Variable | User | Role |
|----------|------|------|
| `founderId` | `11111111-1111-1111-1111-111111111111` (Lucia Martin) | creates and publishes the idea |
| `commenterId` | `22222222-2222-2222-2222-222222222222` (Carlos Ruiz) | writes the comment |

Requests without the header behave like a visitor who is not logged in.

## 1. Start the backend

You need the database tables and sample users loaded, and the backend running on `http://localhost:8080`.

**Option A – MySQL installed on your computer.** Follow steps 1–5 of the main `README.md` (create the database, run `01_schema.sql` and `02_seed.sql`), then:

```bash
cd backend
mvn spring-boot:run
```

**Option B – everything in Docker (no Java, Maven or MySQL install needed).** This is the same setup used for the Sprint 1 test run. Run from the repository root (macOS/Linux terminal). Replace `<root-pw>` with any password you choose for this throwaway database, and `<edison-pw>` with the password written in `database/00_create_database.sql`.

```bash
# 1. A throwaway MySQL. Port 8080 is opened here because the backend will share this container's network.
docker run -d --name edison-mysql -p 127.0.0.1:8080:8080 -e MYSQL_ROOT_PASSWORD=<root-pw> mysql:8.4
# wait about 20 seconds for MySQL to start, then:
docker exec -i -e MYSQL_PWD=<root-pw> edison-mysql mysql -uroot < database/00_create_database.sql
docker exec -i -e MYSQL_PWD=<root-pw> edison-mysql mysql -uroot edison_upm < database/01_schema.sql
docker exec -i -e MYSQL_PWD=<root-pw> edison-mysql mysql -uroot edison_upm < database/02_seed.sql

# 2. Needed only in Docker: the script creates the user for 'localhost', but inside Docker the
#    backend arrives as '127.0.0.1'. This adds the same user, same rights, for 127.0.0.1.
docker exec -i -e MYSQL_PWD=<root-pw> edison-mysql mysql -uroot -e \
  "CREATE USER 'edison'@'127.0.0.1' IDENTIFIED BY '<edison-pw>'; GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON edison_upm.* TO 'edison'@'127.0.0.1';"

# 3. Run the backend with Java 21 + Maven inside a container that shares MySQL's network.
cd backend
docker run --rm --network container:edison-mysql -v "$PWD":/work -w /work maven:3.9-eclipse-temurin-21 mvn spring-boot:run
```

Wait for the line `Started EdisonUpmApplication`. To stop and delete everything afterwards: press `Ctrl+C`, then `docker rm -f edison-mysql`.

**Check it works:** open <http://localhost:8080/api/tags> in a browser. You should see `["GREEN_TECH","SOFTWARE",...]`.

> ⚠️ `01_schema.sql` **deletes and recreates** all tables. Never run it on a database with data you want to keep.

## 2. Import into Postman

1. Open Postman (the desktop app is best, because the upload request reads a file from your computer).
2. Click **Import** and drop in both JSON files from this folder.
3. In the top-right environment selector, choose **EdisonUPM Local**. The smoke test checks this and fails request 1 if no environment is selected.

## 3. Select the PNG file

Request 3 uploads `fixtures/edison-smoke-test.png`. Postman finds it only if its **working directory** is this `postman` folder:

- **Easiest:** open request **3. Upload screenshot** → **Body** → **form-data** → in the `file` row click **Select Files** and choose `postman/fixtures/edison-smoke-test.png` (or any small PNG of your own).
- **Or:** Postman **Settings → General → Working Directory** → choose this `postman` folder.

The checks expect a PNG. Max 5 MB.

## 4. Run the smoke test in the correct order

**Whole folder (recommended):** right-click **A – Sprint 1 Smoke Test** → **Run folder** → keep the order 1 to 8 → **Run**.

**One by one:** click requests 1 → 8 in order and press **Send** on each. Do not skip any request: each one uses the ids saved by the requests before it.

You can run the folder again and again. Request 1 creates a new `runTag` and clears the old ids each time, so every run creates a new idea, screenshot and comment.

## 5. How the variables are updated

| Variable | Set by | Used by |
|----------|--------|---------|
| `baseUrl`, `founderId`, `commenterId` | you (in the environment) | all requests |
| `runTag` | request 1 (before sending) | title, search and comment text |
| `ideaId` | request 1 (from the response) | requests 2–8 |
| `attachmentId`, `attachmentUrl`, `attachmentSize` | request 3 | requests 4 and 6 |
| `clientRequestId` | request 7 (a new random id before sending) | request 7 |
| `commentId` | request 7 | request 8 and folder B |

You can see the current values with the eye icon next to the environment selector. To point at another computer or port, change only `baseUrl`.

## 6. Reading the results

- **Test Results tab:** green **PASS** for each check. A full smoke run shows **45 passed, 0 failed**.
- **Status codes you may see:**

| Code | Meaning | Typical cause |
|------|---------|---------------|
| 200 / 201 / 204 | Success | |
| 400 | The request is malformed | invalid JSON, unknown tag or stage, id that is not a UUID |
| 401 | Not logged in | `X-User-Id` missing, or not a user in the database (seed not loaded?) |
| 403 | Not allowed | wrong role (only students create ideas) or not the owner |
| 404 | Not found or not visible | wrong id, or the idea is a draft or archived |
| 413 | File too large | image over 5 MB |
| 422 | Validation failed | read `errors` in the body; e.g. `errors.mvpProof`, `errors.content`, or the idea is no longer a draft |

- **Could not get any response / ECONNREFUSED:** the backend is not running, or `baseUrl` is wrong.
- **Request 3 fails with 400 or 422:** the PNG file was not found or is not a PNG (see section 3).
- **Request 1 fails "Environment is selected":** choose **EdisonUPM Local** in the environment selector.
- **Requests 2–8 fail after a failed request 1:** fix request 1 first; the others need its `ideaId`.

## 7. Sharing with the team

- These files are plain JSON in the repository, so teammates get them with the rest of the code.
- If you change requests in Postman: right-click the collection → **Export** → **Collection v2.1**, and save it over `EdisonUPM-Sprint1.postman_collection.json`. For the environment: **Environments** → `...` → **Export**.
- Do not put real passwords or tokens in the environment file. Today it contains only the local URL and fictional seed user ids.
- Optional, without the Postman app: Postman's command-line runner can run the same folder from this directory:

```bash
docker run --rm --network container:edison-mysql -v "$PWD":/etc/newman postman/newman:6-alpine \
  run EdisonUPM-Sprint1.postman_collection.json -e EdisonUPM-Local.postman_environment.json \
  --folder "A - Sprint 1 Smoke Test" --working-dir /etc/newman
```
