import { create } from 'zustand';
import { getDatabase } from '../db/database';
import { Task } from '../types';
import { randomUUID } from 'expo-crypto';
import { scheduleSync } from './syncScheduler';
import { scheduleTaskReminder, cancelTaskReminder } from '../utils/notifications';

type TaskStore = {
  tasks: Task[];
  loading: boolean;
  loadTasks: () => Promise<void>;
  addTask: (title: string, priority?: Task['priority'], due_date?: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskTitle: (id: string, title: string) => Promise<void>;
  bulkComplete: (ids: string[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  reorderTasks: (orderedIds: string[]) => Promise<void>;
  setTaskReminder: (id: string, time: string | null, date?: string | null) => Promise<void>;
};

function nowISO() {
  return new Date().toISOString();
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,

  loadTasks: async () => {
    set({ loading: true });
    const database = await getDatabase();
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC'
    );
    const tasks: Task[] = rows.map((r) => ({ ...r, completed: !!r.completed }));
    // Open tasks first, completed tasks below (preserving sort_order within each group)
    const open = tasks.filter((t) => !t.completed);
    const done = tasks.filter((t) => t.completed);
    set({ tasks: [...open, ...done], loading: false });
  },

  addTask: async (title, priority = 'medium', due_date) => {
    const database = await getDatabase();
    const id = randomUUID();
    const now = nowISO();
    // Get next sort_order
    const result = await database.getFirstAsync<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM tasks'
    );
    const nextOrder = (result?.max_order ?? -1) + 1;
    await database.runAsync(
      `INSERT INTO tasks
        (id, title, priority, due_date, completed, created_at, updated_at, synced, sort_order)
       VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?)`,
      id,
      title,
      priority,
      due_date ?? null,
      now,
      now,
      nextOrder
    );
    await get().loadTasks();
    scheduleSync();
  },

  toggleTask: async (id) => {
    const database = await getDatabase();
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const completed = !task.completed;
    const completed_at = completed ? nowISO() : null;
    const now = nowISO();
    await database.runAsync(
      `UPDATE tasks
       SET completed = ?, completed_at = ?, updated_at = ?, synced = 0
       WHERE id = ?`,
      completed ? 1 : 0,
      completed_at,
      now,
      id
    );

    // Cancel reminder if task is now completed
    if (completed) {
      await cancelTaskReminder(id);
    }

    await get().loadTasks();
    scheduleSync();
  },

  updateTaskTitle: async (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const database = await getDatabase();
    const now = nowISO();
    await database.runAsync(
      'UPDATE tasks SET title = ?, updated_at = ?, synced = 0 WHERE id = ?',
      trimmed,
      now,
      id
    );
    await get().loadTasks();
    scheduleSync();
  },

  deleteTask: async (id) => {
    const database = await getDatabase();
    const now = nowISO();
    await database.runAsync(
      "INSERT OR REPLACE INTO deleted_records (table_name, record_id, deleted_at) VALUES ('tasks', ?, ?)",
      id,
      now
    );
    await database.runAsync('DELETE FROM tasks WHERE id = ?', id);
    await cancelTaskReminder(id);
    await get().loadTasks();
    scheduleSync();
  },

  bulkComplete: async (ids) => {
    if (ids.length === 0) return;
    const database = await getDatabase();
    const now = nowISO();
    const placeholders = ids.map(() => '?').join(',');
    await database.runAsync(
      `UPDATE tasks
       SET completed = 1, completed_at = ?, updated_at = ?, synced = 0
       WHERE id IN (${placeholders})`,
      [now, now, ...ids]
    );
    for (const id of ids) {
      await cancelTaskReminder(id);
    }
    await get().loadTasks();
    scheduleSync();
  },

  bulkDelete: async (ids) => {
    if (ids.length === 0) return;
    const database = await getDatabase();
    const now = nowISO();
    for (const id of ids) {
      await database.runAsync(
        "INSERT OR REPLACE INTO deleted_records (table_name, record_id, deleted_at) VALUES ('tasks', ?, ?)",
        id,
        now
      );
      await cancelTaskReminder(id);
    }
    const placeholders = ids.map(() => '?').join(',');
    await database.runAsync(
      `DELETE FROM tasks WHERE id IN (${placeholders})`,
      ids
    );
    await get().loadTasks();
    scheduleSync();
  },

  reorderTasks: async (orderedIds) => {
    const database = await getDatabase();
    const now = nowISO();
    for (let i = 0; i < orderedIds.length; i++) {
      await database.runAsync(
        'UPDATE tasks SET sort_order = ?, updated_at = ?, synced = 0 WHERE id = ?',
        i,
        now,
        orderedIds[i]
      );
    }
    await get().loadTasks();
    scheduleSync();
  },

  setTaskReminder: async (id, time, date = null) => {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE tasks SET reminder_time = ?, reminder_date = ?, synced = 0 WHERE id = ?',
      time,
      time ? date : null,
      id
    );

    const task = get().tasks.find((t) => t.id === id);
    if (time && task) {
      await scheduleTaskReminder(id, task.title, time, date);
    } else {
      await cancelTaskReminder(id);
    }

    await get().loadTasks();
    scheduleSync();
  },
}));