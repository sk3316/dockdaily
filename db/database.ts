import * as SQLite from 'expo-sqlite';
import {
  CREATE_TASKS_TABLE,
  CREATE_HABITS_TABLE,
  CREATE_HABIT_LOGS_TABLE,
  CREATE_DELETED_RECORDS_TABLE,
  CREATE_HABIT_LOGS_UNIQUE_INDEX,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('dockdaily.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

export async function initDatabase() {
  const database = await getDatabase();
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync(CREATE_TASKS_TABLE);
  await database.execAsync(CREATE_HABITS_TABLE);
  await database.execAsync(CREATE_HABIT_LOGS_TABLE);
  await database.execAsync(CREATE_DELETED_RECORDS_TABLE);

  // Migrations: add sort_order column for existing users
  try {
    await database.execAsync('ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  } catch (_) {
    // Column already exists — ignore
  }
  try {
    await database.execAsync('ALTER TABLE habits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  } catch (_) {
    // Column already exists — ignore
  }

  // Per-item reminder time (tasks + habits)
  try {
    await database.execAsync('ALTER TABLE tasks ADD COLUMN reminder_time TEXT');
  } catch (_) {
    // Column already exists — ignore
  }
  try {
    await database.execAsync('ALTER TABLE habits ADD COLUMN reminder_time TEXT');
  } catch (_) {
    // Column already exists — ignore
  }

  // Track last known streak for rescue detection after missed days
  try {
    await database.execAsync(
      'ALTER TABLE habits ADD COLUMN last_known_streak INTEGER NOT NULL DEFAULT 0'
    );
  } catch (_) {
    // Column already exists — ignore
  }

  // NEW: Add reminder_date column for date+time reminders
  try {
    await database.execAsync('ALTER TABLE tasks ADD COLUMN reminder_date TEXT');
  } catch (_) {
    // Column already exists — ignore
  }
  try {
    await database.execAsync('ALTER TABLE habits ADD COLUMN reminder_date TEXT');
  } catch (_) {
    // Column already exists — ignore
  }

  // Recurring & interval habit reminder configuration (JSON)
  try {
    await database.execAsync('ALTER TABLE habits ADD COLUMN reminder_config TEXT');
  } catch (_) {
    // Column already exists — ignore
  }

  // Deduplicate habit_logs before adding unique index
  try {
    await database.execAsync(`
      DELETE FROM habit_logs WHERE id NOT IN (
        SELECT MIN(id) FROM habit_logs GROUP BY habit_id, date
      );
    `);
    await database.execAsync(CREATE_HABIT_LOGS_UNIQUE_INDEX);
  } catch (_) {
    // Index already exists or dedupe not needed — ignore
  }

  console.log('[DB] Tables ready');
}

export async function clearDatabase() {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM tasks;');
  await database.execAsync('DELETE FROM habits;');
  await database.execAsync('DELETE FROM habit_logs;');
  await database.execAsync('DELETE FROM deleted_records;');
  console.log('[DB] Cleared all tables');
}