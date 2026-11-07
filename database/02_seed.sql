-- =============================================================
-- Edison UPM - Sample data for local development
--   mysql -u edison -p edison_upm < database/02_seed.sql
-- Use these user ids in the X-User-Id header while there is no login.
-- =============================================================

INSERT INTO users (id, full_name, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Lucia Martin',  'lucia.martin@alumnos.upm.es', 'STUDENT'),
  ('22222222-2222-2222-2222-222222222222', 'Carlos Ruiz',   'carlos.ruiz@alumnos.upm.es',  'STUDENT'),
  ('33333333-3333-3333-3333-333333333333', 'Elena Gomez',   'elena.gomez@upm.es',          'PROFESSOR'),
  ('44444444-4444-4444-4444-444444444444', 'Admin Edison',  'admin.edison@upm.es',         'ADMINISTRATOR'),
  ('55555555-5555-5555-5555-555555555555', 'Javier Ortega', 'javier.ortega@example.com',   'INVESTOR');

INSERT INTO categories (id, name) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Education'),
  ('c0000000-0000-0000-0000-000000000002', 'Health'),
  ('c0000000-0000-0000-0000-000000000003', 'Sustainability'),
  ('c0000000-0000-0000-0000-000000000004', 'Mobility'),
  ('c0000000-0000-0000-0000-000000000005', 'FinTech'),
  ('c0000000-0000-0000-0000-000000000006', 'Artificial Intelligence'),
  ('c0000000-0000-0000-0000-000000000007', 'Social Impact');

-- One published idea with a comment, and one draft
INSERT INTO ideas (id, founder_id, title, elevator_pitch, problem_statement, solution_description,
                   mvp_url, status, visibility, development_stage, feedback_enabled, created_at, published_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'CampusShare', 'Share bikes and scooters between UPM campuses.',
   'Moving between UPM campuses is slow and expensive for students.',
   'A booking app for shared bikes and scooters with stations on every campus.',
   'https://example.com/campusshare', 'PUBLISHED', 'PUBLIC', 'Prototype', TRUE,
   UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'StudyBuddy AI', 'An AI tutor trained on UPM course material.',
   'Students lack personalised help outside office hours.',
   'A chat assistant that answers questions using the course notes.',
   NULL, 'DRAFT', 'PUBLIC', NULL, TRUE, UTC_TIMESTAMP(6), NULL);

INSERT INTO idea_categories (idea_id, category_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004');

INSERT INTO idea_allowed_commenter_roles (idea_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'STUDENT'),
  ('a0000000-0000-0000-0000-000000000001', 'PROFESSOR'),
  ('a0000000-0000-0000-0000-000000000001', 'INVESTOR');

INSERT INTO comments (id, idea_id, author_id, content, status, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333',
   'Great idea! Have you talked to the university mobility office?', 'VISIBLE', UTC_TIMESTAMP(6));
