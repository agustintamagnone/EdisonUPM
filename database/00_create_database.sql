-- =============================================================
-- Edison UPM - Database and application user
-- Run ONCE as an administrator (root):
--   mysql -u root -p < database/00_create_database.sql
-- Change the password 'Edison_Upm2026' for anything other than local development.
-- It meets MySQL's default password policy (validate_password MEDIUM).
-- =============================================================

CREATE DATABASE IF NOT EXISTS edison_upm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'edison'@'localhost' IDENTIFIED BY 'Edison_Upm2026';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON edison_upm.* TO 'edison'@'localhost';
FLUSH PRIVILEGES;
