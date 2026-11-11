-- =============================================================
-- Edison UPM - Schema (MVC Backend v2 model)
--   mysql --login-path=edison edison_upm < database/01_schema.sql
-- Ids are UUIDs stored as CHAR(36). Dates are stored in UTC.
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS saved_ideas;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS idea_allowed_commenter_roles;
DROP TABLE IF EXISTS ideas;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- User ----------
CREATE TABLE users (
  id         CHAR(36)     NOT NULL,
  full_name  VARCHAR(120) NOT NULL,
  email      VARCHAR(254) NOT NULL,
  role       VARCHAR(20)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  CONSTRAINT ck_users_role CHECK (role IN ('STUDENT', 'PROFESSOR', 'ADMINISTRATOR', 'INVESTOR'))
) ENGINE = InnoDB;

-- ---------- Category ----------
CREATE TABLE categories (
  id    CHAR(36)    NOT NULL,
  name  VARCHAR(60) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_name (name)
) ENGINE = InnoDB;

-- ---------- Idea ----------
CREATE TABLE ideas (
  id                    CHAR(36)      NOT NULL,
  founder_id            CHAR(36)      NOT NULL,
  title                 VARCHAR(120)  NOT NULL,
  elevator_pitch        VARCHAR(300)  NOT NULL,
  problem_statement     VARCHAR(2000) NOT NULL,
  solution_description  VARCHAR(2000) NOT NULL,
  mvp_url               VARCHAR(2048) NULL,
  status                VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
  visibility            VARCHAR(20)   NOT NULL DEFAULT 'PUBLIC',
  development_stage     VARCHAR(60)   NULL,
  feedback_enabled      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at            DATETIME(6)   NOT NULL,
  published_at          DATETIME(6)   NULL,
  PRIMARY KEY (id),
  KEY idx_ideas_founder (founder_id),
  KEY idx_ideas_status_published (status, published_at),
  CONSTRAINT fk_ideas_founder FOREIGN KEY (founder_id) REFERENCES users (id),
  CONSTRAINT ck_ideas_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  CONSTRAINT ck_ideas_visibility CHECK (visibility IN ('PUBLIC', 'UPM_COMMUNITY'))
) ENGINE = InnoDB;

CREATE TABLE idea_tags (
    idea_id CHAR(36)    NOT NULL,
    tag VARCHAR (20)    NOT NULL,
    PRIMARY KEY (idea_id, tag),
    CONSTRAINT fk_tags_idea FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
    CONSTRAINT ck_tags_status CHECK (tag IN ('GREEN_TECH', 'SOFTWARE', 'HARDWARE', 'HEALTH_TECH', 'ED_TECH', 'CIRCULAR_ECONOMY'))
);

CREATE TABLE idea_stage (
   idea_id CHAR(36)    NOT NULL,
   stage VARCHAR (20)    NOT NULL,
   PRIMARY KEY (idea_id, stage),
   CONSTRAINT fk_stage_idea FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
   CONSTRAINT ck_stage_status CHECK (stage IN ('CONCEPT', 'PROTOTYPE', 'MVP_LIVE'))
);

-- Idea.allowedCommenterRoles : Set<UserRole>
CREATE TABLE idea_allowed_commenter_roles (
  idea_id  CHAR(36)    NOT NULL,
  role     VARCHAR(20) NOT NULL,
  PRIMARY KEY (idea_id, role),
  CONSTRAINT fk_allowed_roles_idea FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
  CONSTRAINT ck_allowed_roles_role CHECK (role IN ('STUDENT', 'PROFESSOR', 'ADMINISTRATOR', 'INVESTOR'))
) ENGINE = InnoDB;

-- ---------- Attachment (screenshots, 0..5 per idea) ----------
CREATE TABLE attachments (
  id             CHAR(36)     NOT NULL,
  idea_id        CHAR(36)     NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  content_type   VARCHAR(50)  NOT NULL,
  size_bytes     BIGINT       NOT NULL,
  storage_key    VARCHAR(255) NOT NULL,
  display_order  INT          NOT NULL,
  uploaded_at    DATETIME(6)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_attachments_storage_key (storage_key),
  KEY idx_attachments_idea (idea_id, display_order),
  CONSTRAINT fk_attachments_idea FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
  CONSTRAINT ck_attachments_type CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  CONSTRAINT ck_attachments_size CHECK (size_bytes > 0 AND size_bytes <= 5242880)
) ENGINE = InnoDB;

-- ---------- Comment ----------
CREATE TABLE comments (
  id                 CHAR(36)     NOT NULL,
  idea_id            CHAR(36)     NOT NULL,
  author_id          CHAR(36)     NOT NULL,
  content            VARCHAR(500) NOT NULL,
  status             VARCHAR(20)  NOT NULL DEFAULT 'VISIBLE',
  client_request_id  CHAR(36)     NULL,
  created_at         DATETIME(6)  NOT NULL,
  updated_at         DATETIME(6)  NULL,
  PRIMARY KEY (id),
  KEY idx_comments_idea (idea_id, status, created_at),
  UNIQUE KEY uk_comments_idempotency (author_id, client_request_id),
  CONSTRAINT fk_comments_idea FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id),
  CONSTRAINT ck_comments_status CHECK (status IN ('VISIBLE', 'DELETED'))
) ENGINE = InnoDB;

-- ---------- SavedIdea ----------
CREATE TABLE saved_ideas (
  user_id   CHAR(36)    NOT NULL,
  idea_id   CHAR(36)    NOT NULL,
  saved_at  DATETIME(6) NOT NULL,
  PRIMARY KEY (user_id, idea_id),
  KEY idx_saved_ideas_idea (idea_id),
  CONSTRAINT fk_saved_ideas_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_ideas_idea FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE
) ENGINE = InnoDB;
