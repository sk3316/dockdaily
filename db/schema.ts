export const CREATE_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT '',
  synced INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,
  reminder_date TEXT
);
`;

export const CREATE_HABITS_TABLE = `
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'boolean',
  target INTEGER NOT NULL DEFAULT 1,
  frequency TEXT NOT NULL DEFAULT 'daily',
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,
  reminder_date TEXT,
  reminder_config TEXT,
  last_known_streak INTEGER NOT NULL DEFAULT 0
);
`;

export const CREATE_HABIT_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
);
`;

export const CREATE_DELETED_RECORDS_TABLE = `
CREATE TABLE IF NOT EXISTS deleted_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  UNIQUE(table_name, record_id)
);
`;

export const CREATE_HABIT_LOGS_UNIQUE_INDEX = `
CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_habit_date ON habit_logs(habit_id, date);
`;