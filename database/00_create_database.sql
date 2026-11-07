-- =============================================================
-- Edison UPM - Database and application user
-- Run ONCE as an administrator (root):
--   mysql -u root -p < database/00_create_database.sql
-- Change the password 'edison' for anything other than local development.
-- =============================================================

CREATE DATABASE IF NOT EXISTS edison_upm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'edison'@'localhost' IDENTIFIED BY 'edison';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON edison_upm.* TO 'edison'@'localhost';
FLUSH PRIVILEGES;
