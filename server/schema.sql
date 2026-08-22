-- Run once against an empty todoapp database:
--   psql -U postgres -d todoapp -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id                        SERIAL PRIMARY KEY,
  email                     VARCHAR(255) UNIQUE NOT NULL,
  password_hash             VARCHAR(255) NOT NULL,
  is_verified               BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token        VARCHAR(255),
  verification_token_expires TIMESTAMP,
  created_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  deadline     TIMESTAMP NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Required by connect-pg-simple for PostgreSQL-backed sessions
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default",
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
