# Edison UPM

🇬🇧 [English](README.md) · 🇪🇸 **Español**

Plataforma de ideas de la Universidad Politécnica de Madrid: los estudiantes publican ideas (con capturas y enlace al MVP) y la comunidad deja feedback.

```
EdisonUPM/
├── backend/     API REST (Spring Boot 3, Java 21) – arquitectura MVC
├── database/    Scripts MySQL (base de datos, esquema y datos de ejemplo)
└── frontend/    (se añadirá) Vista – cliente web
```

## Arquitectura del backend

Sigue el diagrama **MVC Backend (v2)**. Paquete raíz `es.upm.edison`:

| Capa | Paquete | Clases |
|------|---------|--------|
| View | — | Frontend (cliente web, llama a la API por HTTP/JSON) |
| Controller | `controller` | `IdeaController`, `AttachmentController`, `CommentController`, `UserController` |
| Service | `service` | `IdeaService`, `AttachmentService`, `CommentService`, `UserService` |
| Repository | `repository` | `IdeaRepository` (+ `SavedIdeaRepository`), `AttachmentRepository`, `CommentRepository`, `UserRepository` |
| Model | `model` | `User`, `Idea`, `Attachment`, `Comment`, `SavedIdea`, enums `UserRole`, `IdeaStatus`, `Visibility`, `IdeaTag`, `DevelopmentStage`, `CommentStatus` |
| Infraestructura | `service.storage` | `ImageStorage` / `FileSystemImageStorage` (Image Storage) + MySQL (Relational Database) |

Otros paquetes: `dto` (peticiones/respuestas JSON), `exception` (errores y `GlobalExceptionHandler`), `config` (CORS, usuario actual).

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/tags` | Tags disponibles (`GREEN_TECH`, `SOFTWARE`, `HARDWARE`, `HEALTH_TECH`, `ED_TECH`, `CIRCULAR_ECONOMY`) |
| GET | `/api/development-stages` | Etapas disponibles (`CONCEPT`, `PROTOTYPE`, `MVP_LIVE`) |
| GET | `/api/ideas?q=&tag=&page=&size=` | Explorar/buscar ideas publicadas |
| GET | `/api/ideas/mine` | Mis ideas |
| GET | `/api/ideas/{id}` | Detalle de una idea |
| POST | `/api/ideas` | Paso 1 – crear borrador (Basics) |
| PUT | `/api/ideas/{id}/basics` | Paso 1 – editar Basics |
| PUT | `/api/ideas/{id}/classification` | Paso 2 – tags (1-2) y etapa de desarrollo |
| PUT / DELETE | `/api/ideas/{id}/mvp-link` | Paso 2 – enlace MVP |
| POST | `/api/ideas/{id}/publish` | Paso 3 – publicar (errores agrupados por paso: `basics`, `mvpProof`, `review`) |
| POST | `/api/ideas/{id}/archive` | Archivar |
| GET / POST | `/api/ideas/{id}/attachments` | Listar / subir captura (`multipart/form-data`, campo `file`) |
| DELETE | `/api/ideas/{id}/attachments/{attachmentId}` | Eliminar captura |
| GET | `/api/ideas/{id}/attachments/{attachmentId}/file` | Servir la imagen |
| GET / POST | `/api/ideas/{id}/comments` | Listar / publicar comentarios (`clientRequestId` opcional para idempotencia) |
| PUT / DELETE | `/api/comments/{commentId}` | Editar / borrar (soft delete) comentario propio |
| GET / PUT | `/api/users/me` | Perfil propio |
| GET / PUT / DELETE | `/api/users/me/saved-ideas[/{ideaId}]` | Ideas guardadas |
| GET | `/api/users/founders`, `/api/users/mentors`, `/api/users/{id}` | Fundadores, mentores, perfiles |


---

## Base de datos MySQL – guía paso a paso

Cada paso tiene instrucciones para **macOS** y **Windows**. Los comandos de Windows están pensados para **PowerShell** (Terminal de Windows).

### 1. Instalar / arrancar MySQL

#### macOS (Homebrew)

```bash
brew install mysql          # si no está instalado
brew services start mysql   # arranca el servidor y lo deja activo al iniciar sesión
mysql_secure_installation   # (recomendado) define la contraseña de root
```

Comprueba que responde:

```bash
mysqladmin -u root -p ping   # -> mysqld is alive
```

#### Windows

1. Descarga **MySQL Installer** desde <https://dev.mysql.com/downloads/installer/> (o, en PowerShell: `winget install Oracle.MySQL`).
2. En el instalador elige **Server only** (o *Custom* añadiendo también *MySQL Shell* / *Workbench* si quieres una interfaz gráfica).
3. Durante la configuración:
   - Puerto: **3306** (por defecto).
   - Define la contraseña de **root** y apúntala.
   - Deja marcado **Configure MySQL Server as a Windows Service** y **Start the MySQL Server at System Startup**: así MySQL arranca solo con Windows.
4. Añade el cliente `mysql` al `PATH` para poder usarlo desde cualquier terminal (ajusta la versión a la que hayas instalado):

   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\MySQL\MySQL Server 8.4\bin", "User")
   ```

   Cierra y vuelve a abrir la terminal para que el cambio se aplique.

Comprueba que el servicio está en marcha y que responde:

```powershell
Get-Service MySQL*            # Status debe ser "Running"
mysqladmin -u root -p ping    # -> mysqld is alive
```

> Si el servicio está parado: `Start-Service MySQL84` (el nombre exacto aparece en `Get-Service MySQL*`), o desde *services.msc*.

**Alternativa con Docker** (macOS y Windows con Docker Desktop, sin instalar MySQL):

```bash
docker run -d --name edison-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.4
```

### 2. Crear la base de datos y el usuario de la aplicación

Desde la raíz del repositorio.

**Guarda las credenciales una sola vez.** Para que los scripts no pidan contraseña cada vez, guarda la contraseña de `root` con `mysql_config_editor` (viene con MySQL en macOS y Windows). Te la pide una vez y la guarda, ofuscada, en `~/.mylogin.cnf` (`%APPDATA%\MySQL\.mylogin.cnf` en Windows):

```bash
mysql_config_editor set --login-path=edison-root --user=root --password
```

(Si root no tiene contraseña, pulsa Enter.) A partir de ahí, `--login-path=edison-root` se conecta como root sin preguntar.

**macOS:**

```bash
mysql --login-path=edison-root < database/00_create_database.sql
```

**Windows (PowerShell):** PowerShell no admite la redirección `<`, así que se usa la opción `-e "source ..."` del cliente de MySQL:

```powershell
mysql --login-path=edison-root -e "source database/00_create_database.sql"
```

> Alternativas en Windows: abrir **CMD** (`cmd.exe`) y usar el mismo comando que en macOS, o abrir el archivo `.sql` en **MySQL Workbench** y ejecutarlo con el rayo ⚡.

Crea la base `edison_upm` (utf8mb4) y el usuario `edison`, con permisos solo sobre esa base. La contraseña del usuario está definida en `00_create_database.sql`.

Ahora guarda también las credenciales del usuario `edison`, una sola vez (cuando te la pida, escribe la contraseña de `00_create_database.sql`):

```bash
mysql_config_editor set --login-path=edison --user=edison --password
```

> Para ver qué hay guardado: `mysql_config_editor print --all` (las contraseñas salen como `*****`). Para borrar una: `mysql_config_editor remove --login-path=edison`.

### 3. Crear las tablas

**macOS:**

```bash
mysql --login-path=edison edison_upm < database/01_schema.sql
```

**Windows (PowerShell):**

```powershell
mysql --login-path=edison edison_upm -e "source database/01_schema.sql"
```

> ⚠️ Este script **borra y recrea** las tablas. Úsalo para inicializar, no sobre datos reales.

### 4. (Opcional) Datos de ejemplo

**macOS:**

```bash
mysql --login-path=edison edison_upm < database/02_seed.sql
```

**Windows (PowerShell):**

```powershell
mysql --login-path=edison edison_upm -e "source database/02_seed.sql"
```

Incluye usuarios de prueba (p. ej. estudiante `11111111-1111-1111-1111-111111111111`, profesor `33333333-3333-3333-3333-333333333333`), una idea publicada y un borrador, con sus tags y etapa.

### 5. Conectar el backend

Por defecto el backend usa `jdbc:mysql://localhost:3306/edison_upm` con el usuario `edison` y la contraseña de `00_create_database.sql`. Para usar otros valores, **sin subirlos a Git**:

- Variables de entorno: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. Para la terminal actual:
  - macOS: `export DB_PASSWORD=mi-clave`
  - Windows (PowerShell): `$env:DB_PASSWORD = "mi-clave"`
- O bien, en ambos sistemas, copia `backend/src/main/resources/application-local.properties.example` a `application-local.properties` (está en `.gitignore`).

Hibernate está en modo `validate`: al arrancar comprueba que las entidades coinciden con las tablas creadas por `01_schema.sql`, pero nunca las modifica.

---

## Ejecutar el backend

Requisitos: **Java 21+** y **Maven**.

- macOS: `brew install openjdk@21 maven`
- Windows: `winget install Microsoft.OpenJDK.21` y Maven desde <https://maven.apache.org/download.cgi> (descomprime el zip y añade su carpeta `bin` al `PATH`, igual que con MySQL). Comprueba con `java -version` y `mvn -v` en una terminal nueva. IntelliJ IDEA trae Maven integrado, así que también puedes ejecutar el proyecto desde ahí.

El comando es el mismo en macOS y Windows:

```bash
cd backend
mvn spring-boot:run
```

La API queda en `http://localhost:8080`. Prueba rápida:

```bash
curl http://localhost:8080/api/ideas
```

En Windows (PowerShell) también puedes usar `Invoke-RestMethod http://localhost:8080/api/ideas` o abrir la URL en el navegador.

Las capturas subidas se guardan en `backend/storage/images` (configurable con `IMAGES_DIR`). El origen del frontend permitido por CORS se configura con `CORS_ALLOWED_ORIGINS` (por defecto `http://localhost:5173,http://localhost:3000`).

### Tests

```bash
cd backend
mvn test
```

Los tests usan una base de datos H2 en memoria (modo MySQL), así que no necesitan MySQL.

El backend utiliza Spring Security: login por formulario, sesiones HTTP en memoria, BCrypt (coste 10), CSRF y logout nativos. No incorpora registro, recuperación de contraseña, JWT, OAuth ni autenticación real de UPM.

### Contrato de la API

| Método y ruta | Resultado |
|---|---|
| GET `/api/auth/csrf` | 200 con `token`, `headerName` y `parameterName`; crea sesión si hace falta |
| POST `/api/auth/login` | 200 con `UserResponse`; 401 para credenciales u opción incorrectas |
| GET `/api/users/me` | 200 con el usuario autenticado; 401 sin sesión |
| POST `/api/auth/logout` | 204, invalida sesión y elimina `JSESSIONID` |

El login recibe **application/x-www-form-urlencoded**, no JSON: `email`, `password` y `accountType`. El email se compara sin distinguir mayúsculas y eliminando espacios exteriores.

- `UPM_ACCOUNT`: roles almacenados STUDENT, PROFESSOR y ADMINISTRATOR.
- `EXTERNAL_USER`: rol almacenado INVESTOR.

La opción solo comprueba el tipo de cuenta: nunca asigna un rol. Ni el login ni la actualización del perfil permiten modificarlo. Las respuestas no contienen contraseñas ni hashes. Un email desconocido, contraseña incorrecta u opción ausente/incompatible devuelve el mismo error 401.

`X-User-Id` se ignora. Los endpoints GET públicos siguen siendo anónimos y se mantienen las comprobaciones de permisos en los servicios. ADMINISTRATOR puede entrar mediante UPM_ACCOUNT, pero conserva los permisos anteriores: UPM_COMMUNITY continúa limitado a estudiantes y profesores.

### Sesiones, cookies y frontend

Todos los POST/PUT/DELETE, incluidos login y logout, requieren CSRF. Token ausente o inválido: 403. Obtener un token antes del login y renovarlo tras login y logout. Si caduca la sesión, obtener otro token y repetir el login.

La cookie utiliza HttpOnly, SameSite=Lax y transporte exclusivo por cookie. La sesión caduca tras 30 minutos de inactividad; su identificador cambia al autenticar. Reiniciar el backend cierra las sesiones. En HTTPS configurar `SESSION_COOKIE_SECURE=true`; HTTP localhost utiliza false.

El frontend debe usar `credentials: "include"` y enviar el token CSRF en la cabecera indicada. CORS permite credenciales desde los orígenes explícitos de `CORS_ALLOWED_ORIGINS` (por defecto localhost:5173 y localhost:3000). Frontend y backend deben estar en el mismo sitio; localhost con distintos puertos funciona. Esta configuración no admite despliegues en sitios sin relación entre sí.

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

### Base local y usuarios ficticios

Para instalar desde cero, sigue los pasos de MySQL de este README: ejecuta `00_create_database.sql`, `01_schema.sql` y `02_seed.sql`, en ese orden. Los scripts no se ejecutan automáticamente al arrancar el backend. `01_schema.sql` borra y recrea las tablas.

Todas las cuentas ficticias usan **`EdisonDemo2026!`**, exclusivamente para desarrollo local. Solo se almacena su hash BCrypt. Se mantienen los IDs fijos para que las ideas y comentarios de ejemplo puedan referenciar a sus autores; los IDs no permiten iniciar sesión.

| Email | accountType | Rol |
|---|---|---|
| lucia.martin@alumnos.upm.es | UPM_ACCOUNT | STUDENT |
| carlos.ruiz@alumnos.upm.es | UPM_ACCOUNT | STUDENT |
| elena.gomez@upm.es | UPM_ACCOUNT | PROFESSOR |
| admin.edison@upm.es | UPM_ACCOUNT | ADMINISTRATOR |
| javier.ortega@example.com | EXTERNAL_USER | INVESTOR |

### Comprobar el login sin frontend (PowerShell)

Primero instala y arranca MySQL siguiendo los pasos anteriores y carga los scripts `00_create_database.sql`, `01_schema.sql` y `02_seed.sql`, en ese orden. Las credenciales de conexión del backend deben coincidir con las configuradas en MySQL. Recuerda que `01_schema.sql` borra las tablas existentes.

Desde la raíz del proyecto, arranca el backend en una terminal:

```powershell
cd backend
mvn spring-boot:run
```

En otra terminal PowerShell, ejecuta este recorrido. No necesita frontend:

```powershell
$api = "http://localhost:8080"

# Consulta pública sin sesión: debe funcionar.
Invoke-RestMethod "$api/api/ideas"

# Obtener CSRF y conservar las cookies de sesión.
$csrf = Invoke-RestMethod "$api/api/auth/csrf" -SessionVariable edisonSession
$headers = @{}
$headers[$csrf.headerName] = $csrf.token

# Login: debe devolver el usuario con rol STUDENT, sin contraseña ni hash.
Invoke-RestMethod "$api/api/auth/login" -Method Post `
    -WebSession $edisonSession -Headers $headers `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        email = "lucia.martin@alumnos.upm.es"
        password = "EdisonDemo2026!"
        accountType = "UPM_ACCOUNT"
    }

# Debe devolver el mismo usuario autenticado.
Invoke-RestMethod "$api/api/users/me" -WebSession $edisonSession

# Tras el login hay que renovar CSRF antes de cerrar sesión.
$csrf = Invoke-RestMethod "$api/api/auth/csrf" -WebSession $edisonSession
$headers = @{}
$headers[$csrf.headerName] = $csrf.token
$logout = Invoke-WebRequest "$api/api/auth/logout" -Method Post `
    -WebSession $edisonSession -Headers $headers -UseBasicParsing
$logout.StatusCode # Debe ser 204.

# Tras el logout debe responder 401 (PowerShell lo muestra como excepción).
Invoke-RestMethod "$api/api/users/me" -WebSession $edisonSession
```

Para probar otras cuentas, repite desde la obtención de CSRF con el email y `accountType` de la tabla anterior. El inversor debe utilizar `EXTERNAL_USER`. Comprueba también estos errores; PowerShell muestra las respuestas HTTP de error como excepciones:

| Prueba | Resultado esperado |
|---|---|
| Contraseña incorrecta o email inexistente | 401 |
| Cuenta UPM con `EXTERNAL_USER`, o inversor con `UPM_ACCOUNT` | 401 |
| Login o logout sin cabecera CSRF | 403 |
| `/api/users/me` sin sesión, aunque se envíe `X-User-Id` | 401 |

### Validación

`cd backend` y `mvn clean test`. Los tests utilizan H2, sin MySQL externo. Cubren los cuatro roles, credenciales y opción de acceso, permisos de perfil, CSRF real, renovación del identificador de sesión, logout, CORS, suplantación por cabecera y los flujos existentes de ideas, capturas y comentarios.

Los scripts de instalación se prueban también con H2 en modo MySQL, sustituyendo únicamente `UTC_TIMESTAMP(6)` por `CURRENT_TIMESTAMP(6)` en el test. Esto no reemplaza una ejecución en MySQL real. La base local del usuario no se modifica al ejecutar los tests.
