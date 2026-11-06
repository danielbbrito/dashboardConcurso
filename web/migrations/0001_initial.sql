CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  provider_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE disciplines (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  block TEXT NOT NULL CHECK (block IN ('basico', 'especifico')),
  exam_items INTEGER NOT NULL CHECK (exam_items > 0),
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE question_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_date TEXT NOT NULL,
  discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
  questions_attempted INTEGER NOT NULL CHECK (questions_attempted >= 1),
  correct_answers INTEGER NOT NULL CHECK (correct_answers BETWEEN 0 AND questions_attempted),
  guesses INTEGER NOT NULL DEFAULT 0 CHECK (guesses BETWEEN 0 AND questions_attempted),
  correct_guesses INTEGER NOT NULL DEFAULT 0 CHECK (correct_guesses BETWEEN 0 AND guesses),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('muito_facil', 'facil', 'medio', 'dificil')),
  topic TEXT,
  subtopic TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (correct_guesses <= correct_answers),
  CHECK (topic IS NOT NULL OR subtopic IS NULL)
);

CREATE INDEX question_sessions_user_date_idx ON question_sessions(user_id, study_date);
CREATE INDEX question_sessions_user_discipline_date_idx ON question_sessions(user_id, discipline_id, study_date);
CREATE INDEX question_sessions_user_topic_date_idx ON question_sessions(user_id, topic, study_date);

CREATE TABLE discipline_notes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discipline_id INTEGER NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, discipline_id)
);

CREATE TABLE study_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_date TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0 AND hours <= 24),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX study_hours_user_date_idx ON study_hours(user_id, study_date);

CREATE TABLE studied_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_date TEXT NOT NULL,
  discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
  topic TEXT NOT NULL CHECK (length(trim(topic)) > 0),
  subtopic TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX studied_topics_user_date_idx ON studied_topics(user_id, study_date);
CREATE INDEX studied_topics_user_discipline_date_idx ON studied_topics(user_id, discipline_id, study_date);

CREATE TABLE study_cycle_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
  position INTEGER NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0 AND hours <= 60),
  UNIQUE (user_id, position),
  UNIQUE (user_id, discipline_id)
);
