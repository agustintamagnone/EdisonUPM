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
| GET | `/api/ideas?q=&tag=&stage=&page=&size=` | Explorar/buscar ideas publicadas; el administrador ve todos los estados |
| GET | `/api/ideas/mine` | Mis ideas |
| GET | `/api/ideas/{id}` | Detalle de una idea (las métricas solo se devuelven a usuarios autenticados) |
| PUT | `/api/ideas/{id}` | Propietario/admin: reemplazar el contenido editable; devuelve la idea actualizada |
| DELETE | `/api/ideas/{id}` | Propietario/admin: borrar definitivamente una idea y sus datos asociados; devuelve confirmación |
| POST | `/api/ideas` | Paso 1 – crear borrador (Basics) |
| PUT | `/api/ideas/{id}/basics` | Paso 1 – editar Basics |
| PUT | `/api/ideas/{id}/classification` | Paso 2 – tags, etapa de desarrollo y métricas de tracción opcionales |
| PUT | `/api/ideas/{id}/metrics` | Añadir o editar hasta cinco métricas de tracción de una idea propia |
| PUT / DELETE | `/api/ideas/{id}/mvp-link` | Paso 2 – enlace MVP |
| POST | `/api/ideas/{id}/publish` | Paso 3 – publicar (errores agrupados por paso: `basics`, `mvpProof`, `review`) |
| POST | `/api/ideas/{id}/archive` | Archivar |
| GET / POST | `/api/ideas/{id}/attachments` | Listar / subir captura (`multipart/form-data`, campo `file`) |
| DELETE | `/api/ideas/{id}/attachments/{attachmentId}` | Eliminar captura |
| GET | `/api/ideas/{id}/attachments/{attachmentId}/file` | Servir la imagen |
| GET / POST | `/api/ideas/{id}/comments` | Listar / publicar comentarios (`clientRequestId` opcional para idempotencia) |
| PUT | `/api/comments/{commentId}` | Autor/admin: editar comentario; `200` con mensaje y comentario actualizado |
| DELETE | `/api/comments/{commentId}` | Autor/admin: borrado definitivo; `200` con ID y mensaje de confirmación |
| GET / PUT | `/api/users/me` | Perfil propio |
| PUT | `/api/users/{id}/blocked` | Administrador: bloquear/desbloquear un usuario; devuelve confirmación y usuario actualizado |
| GET / PUT / DELETE | `/api/users/me/saved-ideas[/{ideaId}]` | Ideas guardadas |
| GET | `/api/users/founders`, `/api/users/mentors`, `/api/users/{id}` | Fundadores, mentores, perfiles |


---

### Editar y eliminar comentarios

Como usuario autenticado, quiero editar o eliminar mis propios comentarios para corregir o retirar mi feedback y recibir confirmación del resultado.

Ambas operaciones requieren sesión y CSRF. Puede ejecutarlas el autor del comentario o un administrador; ser propietario de la idea por sí solo no permite modificar comentarios ajenos.

- `PUT /api/comments/{commentId}` recibe `{"content":"Comentario corregido"}`. Valida el texto (obligatorio, hasta 500 caracteres después de quitar espacios exteriores y enlaces HTTP/HTTPS), guarda el cambio y actualiza `updatedAt`. Devuelve `200` con `message: "Comment updated successfully"` y `comment`, que contiene el `CommentResponse` actualizado. Conserva el ID, la idea, el autor, `createdAt` y la clave de creación `clientRequestId`.
- `DELETE /api/comments/{commentId}` no recibe cuerpo y elimina definitivamente la fila de la base de datos. Devuelve `200` con `{"id":"<UUID del comentario>","message":"Comment deleted successfully"}`. No elimina la idea ni los demás comentarios; el comentario borrado desaparece del listado y del contador.

Sin sesión, con CSRF válido, se devuelve `401`; CSRF ausente/inválido o un comentario ajeno sin permisos de administrador devuelve `403`. Un comentario inexistente o ya eliminado devuelve `404`; contenido inválido devuelve `422` con `errors.content`, y JSON malformado devuelve `400`. No se devuelve confirmación de éxito si la operación falla.

**Cambio de contrato para el frontend:** la edición devuelve ahora el comentario dentro de `response.comment`, acompañado del mensaje. El borrado devuelve `200` con JSON, en lugar de `204` sin cuerpo. El POST de creación y el GET de listado mantienen su formato. El frontend puede mostrar los mensajes tras recibir la respuesta satisfactoria; sus controles visuales no se modifican en este cambio.

### Editar y borrar una idea

Ambas operaciones requieren sesión y la cabecera CSRF vigente. Puede utilizarlas el propietario o un administrador. Los endpoints actuales del asistente de publicación siguen disponibles.

`PUT /api/ideas/{id}` devuelve `200` con el `IdeaResponse` actualizado. Reemplaza el contenido editable, en lugar de aplicar cambios parciales:

```json
{
  "title": "CampusShare",
  "elevatorPitch": "Compartir bicicletas entre campus",
  "problemStatement": "El transporte entre campus es lento",
  "solutionDescription": "Una aplicación de reserva de bicicletas compartidas",
  "contact": "founder@example.com",
  "tags": ["SOFTWARE", "GREEN_TECH"],
  "developmentStage": "PROTOTYPE",
  "mvpUrl": "https://example.com/campusshare",
  "metrics": ["50 usuarios semanales"]
}
```

Los cuatro textos básicos son obligatorios. Omitir/enviar `null` en `contact` o `mvpUrl` los vacía; omitir/enviar `null` en `metrics` equivale a una lista vacía. Un borrador puede seguir sin tags ni etapa; las ideas publicadas y archivadas necesitan entre 1 y 3 tags y una etapa. Se permiten cinco métricas de hasta 200 caracteres y un contacto de hasta 2.000 caracteres. Se conservan propietario, estado, fecha de publicación, audiencia, permisos de feedback, capturas y comentarios. Solo el administrador puede editar ideas archivadas. Los endpoints de subida y eliminación de capturas siguen limitados a borradores.

`DELETE /api/ideas/{id}` no recibe cuerpo y admite borradores, publicaciones e ideas archivadas. Devuelve `200` con `{"id":"<UUID de la idea>","message":"Idea deleted successfully"}`. Elimina definitivamente la idea, todos sus comentarios (también los marcados como borrados), favoritos, adjuntos, tags, etapa, métricas y permisos de comentaristas. Aprovecha las cascadas de las claves foráneas existentes; no requiere cambios de esquema. Los archivos de imagen se eliminan después de confirmar la transacción; un rollback los conserva. Si falla la limpieza de un archivo después del commit, el error se registra y se continúa con los demás; el borrado en base de datos queda confirmado.

Sin sesión, una petición con CSRF válido devuelve `401`; sin CSRF válido devuelve `403`. Otro usuario sin permisos de administrador recibe `403`, una idea inexistente `404`, contenido inválido o editar una archivada sin ser administrador `422`, y JSON malformado/enums desconocidos `400`. Repetir un borrado devuelve `404`.

### Permisos del administrador

El rol se obtiene del usuario autenticado almacenado en la base de datos. El administrador utiliza la API existente:

- `GET /api/ideas` incluye borradores, publicaciones e ideas archivadas de ambas audiencias, con los mismos filtros de texto, tags, etapa y paginación. `/api/ideas/mine` sigue mostrando únicamente las ideas propias.
- Puede consultar los detalles, las capturas y `GET /api/ideas/{id}/comments` en cualquier estado. El listado de comentarios incluye filas antiguas marcadas como `DELETED`; se conserva la columna de estado por compatibilidad, pero los nuevos borrados son definitivos.
- Puede editar/eliminar cualquier idea o comentario, crear ideas propias mediante el asistente de publicación y comentar aunque el feedback esté desactivado o su rol no esté permitido. La edición conserva el propietario/autor original y el estado de la idea.
- Se mantienen las validaciones, las sesiones y CSRF. Los demás roles conservan sus permisos y los endpoints públicos siguen admitiendo acceso anónimo.

No se necesitan migraciones de esquema ni endpoints específicos de administración. Para comprobarlo manualmente, inicia sesión con `admin.edison@upm.es`, contraseña `EdisonDemo2026!` y opción `UPM_ACCOUNT`, siguiendo las instrucciones de sesión/CSRF de abajo, y utiliza los mismos endpoints sobre contenido de otro usuario.

### Bloqueo y desbloqueo de usuarios

Un administrador puede enviar `PUT /api/users/{id}/blocked`, con su sesión, la cabecera CSRF vigente y un cuerpo JSON:

```json
{"blocked": true}
```

Devuelve `200` con `message: "User blocked successfully"` y `user`, que contiene el usuario actualizado, incluido `blocked: true`. Con `{"blocked": false}` se desbloquea y el mensaje es `"User unblocked successfully"`. Repetir la misma petición devuelve éxito con el mismo estado.

- Un administrador no puede ser bloqueado, ni por otro administrador ni por sí mismo: `422` con `errors.blocked`. Otros roles reciben `403`; una petición sin sesión con CSRF válido recibe `401`. Un usuario inexistente devuelve `404` y un campo `blocked` ausente, nulo o inválido devuelve `400`.
- Una cuenta bloqueada no puede iniciar sesión: recibe el mismo `401` que unas credenciales incorrectas. Si tenía una sesión abierta, su siguiente petición válida cierra esa sesión mediante Spring Security, elimina la cookie y devuelve `401`. La comprobación consulta el estado actual de MySQL, sin mantener un registro propio de sesiones.
- Sus ideas se ocultan a los usuarios no administradores en búsquedas, matchmaking, favoritos, detalles, capturas y archivos. Sus comentarios desaparecen de los listados y contadores, incluso en ideas de otros autores. Los comentarios de cualquier autor bajo una idea oculta tampoco son accesibles. El listado público de fundadores excluye a los bloqueados; los perfiles conservan su formato y el campo `blocked`.
- El administrador conserva acceso al contenido oculto para moderarlo. El bloqueo no elimina filas, favoritos ni imágenes, ni cambia `IdeaStatus`, `CommentStatus`, fechas o permisos de publicación.
- Al desbloquear, el usuario puede iniciar sesión y el contenido recupera su visibilidad anterior: los borradores y las ideas archivadas siguen sujetos a sus restricciones habituales. Las sesiones que se hayan cerrado no se recuperan.

Se reutiliza la columna `users.blocked` existente; no hay que modificar ni recrear la base de datos. El seed incluye cinco cuentas activas y una cuenta bloqueada de prueba.

Para comprobarlo, inicia sesión como un estudiante y como el administrador en clientes separados. Como administrador, bloquea al estudiante: comprueba el `401` de su sesión y de un nuevo login, y que sus ideas/comentarios desaparezcan para visitantes mientras el administrador puede consultarlos. Desbloquéalo y repite el login y las consultas: el contenido debe reaparecer sin perder datos.

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

Para una base de datos existente, ejecuta `database/03_idea_metrics.sql` para añadir la tabla de métricas opcionales sin borrar los datos:

```bash
mysql --login-path=edison edison_upm < database/03_idea_metrics.sql
```

En PowerShell:

```powershell
mysql --login-path=edison edison_upm -e "source database/03_idea_metrics.sql"
```

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

La opción solo comprueba el tipo de cuenta: nunca asigna un rol. Ni el login ni la actualización del perfil permiten modificarlo. Las respuestas no contienen contraseñas ni hashes. Un email desconocido, contraseña incorrecta, cuenta bloqueada u opción ausente/incompatible devuelve el mismo error 401.

`X-User-Id` se ignora. Los endpoints GET públicos siguen siendo anónimos y los servicios comprueban los permisos. ADMINISTRATOR entra mediante UPM_ACCOUNT y puede gestionar todas las ideas y comentarios, incluido el contenido UPM_COMMUNITY; estudiantes y profesores conservan el acceso comunitario y los inversores ven las publicaciones públicas.

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
| paco.jones@example.com | UPM_ACCOUNT | STUDENT |

La cuenta `paco.jones@example.com` está bloqueada inicialmente: su login devuelve `401` hasta que un administrador la desbloquee. Las otras cinco cuentas están activas.

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
