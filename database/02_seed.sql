-- =============================================================
-- Edison UPM - Sample data for local development
--   mysql --login-path=edison edison_upm < database/02_seed.sql
-- Fictional demonstration accounts only. Demo password: EdisonDemo2026!
-- =============================================================

INSERT INTO users (id, full_name, email, role, password_hash) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Lucia Martin',  'lucia.martin@alumnos.upm.es', 'STUDENT', '$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y'),
  ('22222222-2222-2222-2222-222222222222', 'Carlos Ruiz',   'carlos.ruiz@alumnos.upm.es',  'STUDENT', '$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y'),
  ('33333333-3333-3333-3333-333333333333', 'Elena Gomez',   'elena.gomez@upm.es',          'PROFESSOR', '$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y'),
  ('44444444-4444-4444-4444-444444444444', 'Admin Edison',  'admin.edison@upm.es',         'ADMINISTRATOR', '$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y'),
  ('55555555-5555-5555-5555-555555555555', 'Javier Ortega', 'javier.ortega@example.com',   'INVESTOR', '$2a$10$PDYn7y.lkCZahYv8TXpueuadGTy/1bvCQsT0MfC6rafEpiUIm.87y');

-- One published idea with a comment, and one draft
INSERT INTO ideas (id, founder_id, title, elevator_pitch, problem_statement, solution_description,
                   mvp_url, status, visibility, feedback_enabled, created_at, published_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'CampusShare', 'Share bikes and scooters between UPM campuses.',
   'Moving between UPM campuses is slow and expensive for students.',
   'A booking app for shared bikes and scooters with stations on every campus.',
   'https://example.com/campusshare', 'PUBLISHED', 'PUBLIC', TRUE,
   UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'StudyBuddy AI', 'An AI tutor trained on UPM course material.',
   'Students lack personalised help outside office hours.',
   'A chat assistant that answers questions using the course notes.',
   NULL, 'DRAFT', 'PUBLIC', TRUE, UTC_TIMESTAMP(6), NULL);

INSERT INTO idea_tags (idea_id, tag) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'SOFTWARE'),
  ('a0000000-0000-0000-0000-000000000002', 'HARDWARE'),
  ('a0000000-0000-0000-0000-000000000002', 'GREEN_TECH');

INSERT INTO idea_stage (idea_id, stage) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'PROTOTYPE'),
  ('a0000000-0000-0000-0000-000000000002', 'CONCEPT');

INSERT INTO idea_allowed_commenter_roles (idea_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'STUDENT'),
  ('a0000000-0000-0000-0000-000000000001', 'PROFESSOR'),
  ('a0000000-0000-0000-0000-000000000001', 'INVESTOR');

INSERT INTO comments (id, idea_id, author_id, content, status, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333',
   'Great idea! Have you talked to the university mobility office?', 'VISIBLE', UTC_TIMESTAMP(6));
