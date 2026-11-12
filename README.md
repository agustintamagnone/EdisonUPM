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
| Repository | `repository` | `IdeaRepository` (+ `SavedIdeaRepository`), `AttachmentRepository`, `CommentRepository`, `UserRepository` |
| Model | `model` | `User`, `Idea`, `Attachment`, `Comment`, `SavedIdea`, enums `UserRole`, `IdeaStatus`, `Visibility`, `IdeaTag`, `DevelopmentStage`, `CommentStatus` |
| Infrastructure | `service.storage` | `ImageStorage` / `FileSystemImageStorage` (Image Storage) + MySQL (Relational Database) |

Other packages: `dto` (JSON requests/responses), `exception` (errors and `GlobalExceptionHandler`), `config` (CORS, current user).

### Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tags` | Available tags (`GREEN_TECH`, `SOFTWARE`, `HARDWARE`, `HEALTH_TECH`, `ED_TECH`, `CIRCULAR_ECONOMY`) |
| GET | `/api/development-stages` | Available stages (`CONCEPT`, `PROTOTYPE`, `MVP_LIVE`) |
| GET | `/api/ideas?q=&tag=&page=&size=` | Browse/search published ideas |
| GET | `/api/ideas/mine` | My ideas |
| GET | `/api/ideas/{id}` | Idea details |
| POST | `/api/ideas` | Step 1 – create draft (Basics) |
| PUT | `/api/ideas/{id}/basics` | Step 1 – edit Basics |
| PUT | `/api/ideas/{id}/classification` | Step 2 – tags (1-2) and development stage |
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

**Save the credentials once.** So that the scripts do not ask for a password every time, store the `root` password with `mysql_config_editor` (it ships with MySQL on macOS and Windows). It asks for the password once and saves it, obfuscated, in `~/.mylogin.cnf` (`%APPDATA%\MySQL\.mylogin.cnf` on Windows):

```bash
mysql_config_editor set --login-path=edison-root --user=root --password
```

(If root has no password, just press Enter.) From then on, `--login-path=edison-root` connects as root without asking.

**macOS:**

```bash
mysql --login-path=edison-root < database/00_create_database.sql
```

**Windows (PowerShell):** PowerShell does not support the `<` redirection, so use the MySQL client's `-e "source ..."` option:

```powershell
mysql --login-path=edison-root -e "source database/00_create_database.sql"
```

> Windows alternatives: open **CMD** (`cmd.exe`) and use the same command as on macOS, or open the `.sql` file in **MySQL Workbench** and run it with the lightning bolt ⚡.

This creates the `edison_upm` database (utf8mb4) and the user `edison`, with permissions on that database only. The user's password is set in `00_create_database.sql`.

Now save the `edison` user's credentials once too (enter the password from `00_create_database.sql` when asked):

```bash
mysql_config_editor set --login-path=edison --user=edison --password
```

> To check what is saved: `mysql_config_editor print --all` (passwords are shown as `*****`). To delete one: `mysql_config_editor remove --login-path=edison`.

### 3. Create the tables

**macOS:**

```bash
mysql --login-path=edison edison_upm < database/01_schema.sql
```

**Windows (PowerShell):**

```powershell
mysql --login-path=edison edison_upm -e "source database/01_schema.sql"
```

> ⚠️ This script **drops and recreates** the tables. Use it to initialize, not on real data.

### 4. (Optional) Sample data

**macOS:**

```bash
mysql --login-path=edison edison_upm < database/02_seed.sql
```

**Windows (PowerShell):**

```powershell
mysql --login-path=edison edison_upm -e "source database/02_seed.sql"
```

Includes test users (e.g. student `11111111-1111-1111-1111-111111111111`, professor `33333333-3333-3333-3333-333333333333`), one published idea and one draft, with their tags and stage.

### 5. Connect the backend

By default the backend uses `jdbc:mysql://localhost:3306/edison_upm` with the user `edison` and the password from `00_create_database.sql`. To use other values, **without committing them to Git**:

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

The backend uses Spring Security's native form login, HTTP sessions in memory, BCrypt (cost 10), CSRF and logout. There is no registration, password recovery, JWT, OAuth or real UPM integration.

### API contract

| Method and path | Result |
|---|---|
| GET `/api/auth/csrf` | 200 with `token`, `headerName` and `parameterName`; creates a session if needed |
| POST `/api/auth/login` | 200 with `UserResponse`; 401 for invalid credentials or access option |
| GET `/api/users/me` | 200 with the authenticated user; 401 without a session |
| POST `/api/auth/logout` | 204; invalidates the session and removes `JSESSIONID` |

Login accepts **application/x-www-form-urlencoded**, not JSON: `email`, `password` and `accountType`. Email matching is case-insensitive and trims surrounding whitespace.

- `UPM_ACCOUNT`: stored roles STUDENT, PROFESSOR and ADMINISTRATOR.
- `EXTERNAL_USER`: stored role INVESTOR.

The access option only checks the account type; it never assigns a role. Neither login nor profile updates allow role changes. Responses never contain passwords or hashes. Unknown email, incorrect password, or missing/mismatched option return the same 401 error.

`X-User-Id` is ignored. Public GET endpoints remain anonymous and existing service permission checks remain in place. ADMINISTRATOR can log in via UPM_ACCOUNT but retains existing permissions: UPM_COMMUNITY visibility remains limited to students and professors.

### Sessions, cookies and frontend

All POST/PUT/DELETE requests, including login and logout, require CSRF. Missing/invalid tokens return 403. Fetch a token before login and refresh it after login and logout. If the session expires, fetch a new token and log in again.

The session cookie uses HttpOnly, SameSite=Lax and cookie-only tracking. Sessions expire after 30 minutes of inactivity; the session ID changes on login. Restarting the backend logs users out. Set `SESSION_COOKIE_SECURE=true` for HTTPS; HTTP localhost uses false.

The frontend must use `credentials: "include"` and send the token in the indicated CSRF header. CORS allows credentials from the explicit `CORS_ALLOWED_ORIGINS` (default localhost:5173 and localhost:3000). Frontend and backend must be on the same site; localhost with different ports works. This configuration does not support unrelated frontend/backend sites.

```javascript
const API = "http://localhost:8080";
async function getCsrf() {
  const response = await fetch(`${API}/api/auth/csrf`, { credentials: "include" });
  if (!response.ok) throw new Error(`CSRF: ${response.status}`);
  return response.json();
}
let csrf = await getCsrf();
const login = await fetch(`${API}/api/auth/login`, {
  method: "POST",
  credentials: "include",
  headers: { [csrf.headerName]: csrf.token },
  body: new URLSearchParams({
    email: "lucia.martin@alumnos.upm.es",
    password: "EdisonDemo2026!",
    accountType: "UPM_ACCOUNT"
  })
});
if (!login.ok) throw new Error(`Login: ${login.status}`);
const user = await login.json();
csrf = await getCsrf();
const me = await fetch(`${API}/api/users/me`, { credentials: "include" });
// Otras escrituras también necesitan credentials y la cabecera CSRF vigente.
const logout = await fetch(`${API}/api/auth/logout`, {
  method: "POST", credentials: "include",
  headers: { [csrf.headerName]: csrf.token }
});
if (!logout.ok) throw new Error(`Logout: ${logout.status}`);
csrf = await getCsrf();
```

### Local database and fictional accounts

For a fresh installation, follow this README's MySQL setup: run `00_create_database.sql`, `01_schema.sql` and `02_seed.sql` in that order. Scripts do not run automatically at startup. `01_schema.sql` drops and recreates tables.

All fictional accounts use **`EdisonDemo2026!`**, exclusively for local development. Only the BCrypt hash is stored. Fixed user IDs are kept so sample ideas and comments can reference their authors; IDs cannot be used to authenticate.

| Email | accountType | Role |
|---|---|---|
| lucia.martin@alumnos.upm.es | UPM_ACCOUNT | STUDENT |
| carlos.ruiz@alumnos.upm.es | UPM_ACCOUNT | STUDENT |
| elena.gomez@upm.es | UPM_ACCOUNT | PROFESSOR |
| admin.edison@upm.es | UPM_ACCOUNT | ADMINISTRATOR |
| javier.ortega@example.com | EXTERNAL_USER | INVESTOR |

### Check login without a frontend (PowerShell)

First install and start MySQL using the steps above, then run `00_create_database.sql`, `01_schema.sql` and `02_seed.sql` in that order. Backend connection credentials must match your MySQL configuration. Remember that `01_schema.sql` drops existing tables.

From the repository root, start the backend in one terminal:

```powershell
cd backend
mvn spring-boot:run
```

In another PowerShell terminal, run this flow. No frontend is required:

```powershell
$api = "http://localhost:8080"

# Public request without a session: should succeed.
Invoke-RestMethod "$api/api/ideas"

# Obtain CSRF and retain session cookies.
$csrf = Invoke-RestMethod "$api/api/auth/csrf" -SessionVariable edisonSession
$headers = @{}
$headers[$csrf.headerName] = $csrf.token

# Login: returns the user with role STUDENT, without a password or hash.
Invoke-RestMethod "$api/api/auth/login" -Method Post `
    -WebSession $edisonSession -Headers $headers `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        email = "lucia.martin@alumnos.upm.es"
        password = "EdisonDemo2026!"
        accountType = "UPM_ACCOUNT"
    }

# Returns the same authenticated user.
Invoke-RestMethod "$api/api/users/me" -WebSession $edisonSession

# Refresh CSRF after login before logging out.
$csrf = Invoke-RestMethod "$api/api/auth/csrf" -WebSession $edisonSession
$headers = @{}
$headers[$csrf.headerName] = $csrf.token
$logout = Invoke-WebRequest "$api/api/auth/logout" -Method Post `
    -WebSession $edisonSession -Headers $headers -UseBasicParsing
$logout.StatusCode # Should be 204.

# After logout, expect 401 (PowerShell reports it as an exception).
Invoke-RestMethod "$api/api/users/me" -WebSession $edisonSession
```

To test other accounts, repeat from the CSRF request using the email and `accountType` from the table above. Investors must use `EXTERNAL_USER`. Also check these errors; PowerShell reports HTTP error responses as exceptions:

| Check | Expected result |
|---|---|
| Incorrect password or unknown email | 401 |
| UPM account with `EXTERNAL_USER`, or investor with `UPM_ACCOUNT` | 401 |
| Login or logout without a CSRF header | 403 |
| `/api/users/me` without a session, even when sending `X-User-Id` | 401 |

### Validation

Run `cd backend` and `mvn clean test`. Tests use H2 and require no external MySQL. They cover all four roles, credentials and access options, profile permissions, real CSRF tokens, session ID rotation, logout, CORS, spoofed headers and existing idea, screenshot and comment flows.

Installation scripts are also tested using H2 in MySQL mode, replacing only `UTC_TIMESTAMP(6)` with `CURRENT_TIMESTAMP(6)` in the test. This does not replace running them on real MySQL. Tests do not modify your local database.
