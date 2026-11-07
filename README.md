# Edison UPM

🇬🇧 **English** · 🇪🇸 [Español](README.es.md)

Ideas platform for the Universidad Politécnica de Madrid: students publish ideas (with screenshots and a link to their MVP) and the community leaves feedback.

```
EdisonUPM/
├── backend/     REST API (Spring Boot 3, Java 21) – MVC architecture
├── database/    MySQL scripts (database, schema and sample data)
└── frontend/    (coming soon) View – web client
```

## Backend architecture

Follows the **MVC Backend (v2)** diagram. Root package `es.upm.edison`:

| Layer | Package | Classes |
|-------|---------|---------|
| View | — | Frontend (web client, calls the API over HTTP/JSON) |
| Controller | `controller` | `IdeaController`, `AttachmentController`, `CommentController`, `UserController` |
| Service | `service` | `IdeaService`, `AttachmentService`, `CommentService`, `UserService` |
| Repository | `repository` | `IdeaRepository` (+ `CategoryRepository`, `SavedIdeaRepository`), `AttachmentRepository`, `CommentRepository`, `UserRepository` |
| Model | `model` | `User`, `Idea`, `Category`, `Attachment`, `Comment`, `SavedIdea`, enums `UserRole`, `IdeaStatus`, `Visibility`, `CommentStatus` |
| Infrastructure | `service.storage` | `ImageStorage` / `FileSystemImageStorage` (Image Storage) + MySQL (Relational Database) |

Other packages: `dto` (JSON requests/responses), `exception` (errors and `GlobalExceptionHandler`), `config` (CORS, current user).

### Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | Categories |
| GET | `/api/ideas?q=&categoryId=&page=&size=` | Browse/search published ideas |
| GET | `/api/ideas/mine` | My ideas |
| GET | `/api/ideas/{id}` | Idea details |
| POST | `/api/ideas` | Step 1 – create draft (Basics) |
| PUT | `/api/ideas/{id}/basics` | Step 1 – edit Basics |
| PUT | `/api/ideas/{id}/classification` | Step 2 – categories (1-2) and stage |
| PUT / DELETE | `/api/ideas/{id}/mvp-link` | Step 2 – MVP link |
| POST | `/api/ideas/{id}/publish` | Step 3 – publish (errors grouped by step: `basics`, `mvpProof`, `review`) |
| POST | `/api/ideas/{id}/archive` | Archive |
| GET / POST | `/api/ideas/{id}/attachments` | List / upload screenshot (`multipart/form-data`, field `file`) |
| DELETE | `/api/ideas/{id}/attachments/{attachmentId}` | Remove screenshot |
| GET | `/api/ideas/{id}/attachments/{attachmentId}/file` | Serve the image |
| GET / POST | `/api/ideas/{id}/comments` | List / post comments (optional `clientRequestId` for idempotency) |
| PUT / DELETE | `/api/comments/{commentId}` | Edit / delete (soft delete) own comment |
| GET / PUT | `/api/users/me` | Own profile |
| GET / PUT / DELETE | `/api/users/me/saved-ideas[/{ideaId}]` | Saved ideas |
| GET | `/api/users/founders`, `/api/users/mentors`, `/api/users/{id}` | Founders, mentors, profiles |

> **Authentication (temporary):** until there is a login, the frontend sends the user id in the `X-User-Id` header. No header = anonymous user. See `config/CurrentUser.java`.

---

## MySQL database – step-by-step guide

Each step has instructions for **macOS** and **Windows**. The Windows commands are meant for **PowerShell** (Windows Terminal).

### 1. Install / start MySQL

#### macOS (Homebrew)

```bash
brew install mysql          # if it is not installed
brew services start mysql   # starts the server and keeps it running at login
mysql_secure_installation   # (recommended) sets the root password
```

Check that it responds:

```bash
mysqladmin -u root -p ping   # -> mysqld is alive
```

#### Windows

1. Download **MySQL Installer** from <https://dev.mysql.com/downloads/installer/> (or, in PowerShell: `winget install Oracle.MySQL`).
2. In the installer choose **Server only** (or *Custom*, also adding *MySQL Shell* / *Workbench* if you want a graphical interface).
3. During configuration:
   - Port: **3306** (default).
   - Set the **root** password and write it down.
   - Keep **Configure MySQL Server as a Windows Service** and **Start the MySQL Server at System Startup** checked, so MySQL starts with Windows.
4. Add the `mysql` client to the `PATH` so you can use it from any terminal (adjust the version to the one you installed):

   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\MySQL\MySQL Server 8.4\bin", "User")
   ```

   Close and reopen the terminal for the change to take effect.

Check that the service is running and responds:

```powershell
Get-Service MySQL*            # Status must be "Running"
mysqladmin -u root -p ping    # -> mysqld is alive
```

> If the service is stopped: `Start-Service MySQL84` (the exact name is shown by `Get-Service MySQL*`), or use *services.msc*.

**Docker alternative** (macOS and Windows with Docker Desktop, without installing MySQL):

```bash
docker run -d --name edison-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.4
```

### 2. Create the database and the application user

From the repository root.

**macOS:**

```bash
mysql -u root -p < database/00_create_database.sql
```

**Windows (PowerShell):** PowerShell does not support the `<` redirection, so use the MySQL client's `-e "source ..."` option:

```powershell
mysql -u root -p -e "source database/00_create_database.sql"
```

> Windows alternatives: open **CMD** (`cmd.exe`) and use the same command as on macOS, or open the `.sql` file in **MySQL Workbench** and run it with the lightning bolt ⚡.

This creates the `edison_upm` database (utf8mb4) and the user `edison` with password `Edison_Upm2026`, with permissions on that database only. The password meets MySQL's default password policy (`validate_password`); if you change it, change it in the backend too (step 5).

### 3. Create the tables

**macOS:**

```bash
mysql -u edison -p edison_upm < database/01_schema.sql
```

**Windows (PowerShell):**

```powershell
mysql -u edison -p edison_upm -e "source database/01_schema.sql"
```

> ⚠️ This script **drops and recreates** the tables. Use it to initialize, not on real data.

### 4. (Optional) Sample data

**macOS:**

```bash
mysql -u edison -p edison_upm < database/02_seed.sql
```

**Windows (PowerShell):**

```powershell
mysql -u edison -p edison_upm -e "source database/02_seed.sql"
```

Includes test users (e.g. student `11111111-1111-1111-1111-111111111111`, professor `33333333-3333-3333-3333-333333333333`), categories, one published idea and one draft.

### 5. Connect the backend

By default the backend uses `jdbc:mysql://localhost:3306/edison_upm` with user `edison` and password `Edison_Upm2026`. To use other values, **without committing them to Git**:

- Environment variables: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. For the current terminal:
  - macOS: `export DB_PASSWORD=my-password`
  - Windows (PowerShell): `$env:DB_PASSWORD = "my-password"`
- Or, on both systems, copy `backend/src/main/resources/application-local.properties.example` to `application-local.properties` (it is in `.gitignore`).

Hibernate runs in `validate` mode: on startup it checks that the entities match the tables created by `01_schema.sql`, but it never changes them.

---

## Run the backend

Requirements: **Java 21+** and **Maven**.

- macOS: `brew install openjdk@21 maven`
- Windows: `winget install Microsoft.OpenJDK.21` and Maven from <https://maven.apache.org/download.cgi> (unzip it and add its `bin` folder to the `PATH`, as with MySQL). Check with `java -version` and `mvn -v` in a new terminal. IntelliJ IDEA ships with Maven, so you can also run the project from there.

The command is the same on macOS and Windows:

```bash
cd backend
mvn spring-boot:run
```

The API runs at `http://localhost:8080`. Quick check:

```bash
curl http://localhost:8080/api/ideas
```

On Windows (PowerShell) you can also use `Invoke-RestMethod http://localhost:8080/api/ideas` or open the URL in the browser.

Uploaded screenshots are stored in `backend/storage/images` (configurable with `IMAGES_DIR`). The frontend origin allowed by CORS is set with `CORS_ALLOWED_ORIGINS` (default `http://localhost:5173,http://localhost:3000`).

### Tests

```bash
cd backend
mvn test
```

The tests use an in-memory H2 database (MySQL mode), so they do not need MySQL.
