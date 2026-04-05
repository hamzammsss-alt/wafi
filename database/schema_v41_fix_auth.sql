-- Fix Authentication Tables
-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
);
