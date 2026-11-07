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
| Repository | `repository` | `IdeaRepository` (+ `CategoryRepository`, `SavedIdeaRepository`), `AttachmentRepository`, `CommentRepository`, `UserRepository` |
| Model | `model` | `User`, `Idea`, `Category`, `Attachment`, `Comment`, `SavedIdea`, enums `UserRole`, `IdeaStatus`, `Visibility`, `CommentStatus` |
| Infraestructura | `service.storage` | `ImageStorage` / `FileSystemImageStorage` (Image Storage) + MySQL (Relational Database) |

Otros paquetes: `dto` (peticiones/respuestas JSON), `exception` (errores y `GlobalExceptionHandler`), `config` (CORS, usuario actual).

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/categories` | Categorías |
| GET | `/api/ideas?q=&categoryId=&page=&size=` | Explorar/buscar ideas publicadas |
| GET | `/api/ideas/mine` | Mis ideas |
| GET | `/api/ideas/{id}` | Detalle de una idea |
| POST | `/api/ideas` | Paso 1 – crear borrador (Basics) |
| PUT | `/api/ideas/{id}/basics` | Paso 1 – editar Basics |
| PUT | `/api/ideas/{id}/classification` | Paso 2 – categorías (1-2) y etapa |
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

> **Autenticación (provisional):** mientras no haya login, el frontend envía el id del usuario en la cabecera `X-User-Id`. Sin cabecera = usuario anónimo. Ver `config/CurrentUser.java`.

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

**macOS:**

```bash
mysql -u root -p < database/00_create_database.sql
```

**Windows (PowerShell):** PowerShell no admite la redirección `<`, así que se usa la opción `-e "source ..."` del cliente de MySQL:

```powershell
mysql -u root -p -e "source database/00_create_database.sql"
```

> Si aparece `ERROR 1819 ... Your password does not satisfy the current policy requirements`, la contraseña del script no cumple la política de tu MySQL. Usa una más fuerte en `00_create_database.sql` (y en el backend), o consulta la política con `SHOW VARIABLES LIKE 'validate_password%';`.

> Alternativas en Windows: abrir **CMD** (`cmd.exe`) y usar el mismo comando que en macOS, o abrir el archivo `.sql` en **MySQL Workbench** y ejecutarlo con el rayo ⚡.

Crea la base `edison_upm` (utf8mb4) y el usuario `edison` con contraseña `Edison_Upm2026` y permisos solo sobre esa base. La contraseña cumple la política de contraseñas por defecto de MySQL (`validate_password`); si la cambias, cámbiala también en el backend (paso 5).

### 3. Crear las tablas

**macOS:**

```bash
mysql -u edison -p edison_upm < database/01_schema.sql
```

**Windows (PowerShell):**

```powershell
mysql -u edison -p edison_upm -e "source database/01_schema.sql"
```

> ⚠️ Este script **borra y recrea** las tablas. Úsalo para inicializar, no sobre datos reales.

### 4. (Opcional) Datos de ejemplo

**macOS:**

```bash
mysql -u edison -p edison_upm < database/02_seed.sql
```

**Windows (PowerShell):**

```powershell
mysql -u edison -p edison_upm -e "source database/02_seed.sql"
```

Incluye usuarios de prueba (p. ej. estudiante `11111111-1111-1111-1111-111111111111`, profesor `33333333-3333-3333-3333-333333333333`), categorías, una idea publicada y un borrador.

### 5. Conectar el backend

Por defecto el backend usa `jdbc:mysql://localhost:3306/edison_upm` con usuario `edison` y contraseña `Edison_Upm2026`. Para usar otros valores, **sin subirlos a Git**:

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
