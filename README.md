# Edison UPM

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

### 1. Instalar / arrancar MySQL (macOS con Homebrew)

```bash
brew install mysql          # si no está instalado
brew services start mysql   # arranca el servidor y lo deja activo al iniciar sesión
mysql_secure_installation   # (recomendado) define la contraseña de root
```

Comprueba que responde:

```bash
mysqladmin -u root -p ping   # -> mysqld is alive
```

> Si `mysqld` falla con `Library not loaded: ... libabsl_...dylib`, la instalación de Homebrew quedó desfasada tras actualizar dependencias: ejecuta `brew reinstall mysql` (o `brew upgrade mysql`).

**Alternativa con Docker** (sin instalar MySQL):

```bash
docker run -d --name edison-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.4
```

### 2. Crear la base de datos y el usuario de la aplicación

Desde la raíz del repositorio:

```bash
mysql -u root -p < database/00_create_database.sql
```

Crea la base `edison_upm` (utf8mb4) y el usuario `edison` / contraseña `edison` con permisos solo sobre esa base.

### 3. Crear las tablas

```bash
mysql -u edison -p edison_upm < database/01_schema.sql
```

> ⚠️ Este script **borra y recrea** las tablas. Úsalo para inicializar, no sobre datos reales.

### 4. (Opcional) Datos de ejemplo

```bash
mysql -u edison -p edison_upm < database/02_seed.sql
```

Incluye usuarios de prueba (p. ej. estudiante `11111111-1111-1111-1111-111111111111`, profesor `33333333-3333-3333-3333-333333333333`), categorías, una idea publicada y un borrador.

### 5. Conectar el backend

Por defecto el backend usa `jdbc:mysql://localhost:3306/edison_upm` con usuario/contraseña `edison`. Para usar otros valores, **sin subirlos a Git**:

- Variables de entorno: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, o
- Copia `backend/src/main/resources/application-local.properties.example` a `application-local.properties` (está en `.gitignore`).

Hibernate está en modo `validate`: al arrancar comprueba que las entidades coinciden con las tablas creadas por `01_schema.sql`, pero nunca las modifica.

---

## Ejecutar el backend

Requisitos: Java 21+ y Maven.

```bash
cd backend
mvn spring-boot:run
```

La API queda en `http://localhost:8080`. Prueba rápida:

```bash
curl http://localhost:8080/api/ideas
```

Las capturas subidas se guardan en `backend/storage/images` (configurable con `IMAGES_DIR`). El origen del frontend permitido por CORS se configura con `CORS_ALLOWED_ORIGINS` (por defecto `http://localhost:5173,http://localhost:3000`).

### Tests

```bash
cd backend
mvn test
```

Los tests usan una base de datos H2 en memoria (modo MySQL), así que no necesitan MySQL.
