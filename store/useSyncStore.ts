import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { getDatabase } from '@/db/database';
import { useAuthStore } from './useAuthStore';
import { useTaskStore } from './useTaskStore';
import { useHabitStore } from './useHabitStore';

type SyncStore = {
  syncing: boolean;
  lastSynced: string | null;
  lastError: string | null;
  syncAll: () => Promise<void>;
  pushUnsynced: (userId?: string) => Promise<void>;
  pullFromSupabase: () => Promise<void>;
  resetSyncState: () => void;
};

let syncInProgress = false;
let syncQueued = false;

/** Map local SQLite task row → Supabase columns (no local-only fields like synced/sort_order). */
function toRemoteTask(t: any, userId: string) {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes ?? null,
    due_date: t.due_date ?? null,
    priority: t.priority ?? 'medium',
    completed: !!t.completed,
    completed_at: t.completed_at ?? null,
    created_at: t.created_at,
    updated_at: t.updated_at || t.created_at || new Date().toISOString(),
    user_id: userId,
  };
}

/** Map local SQLite habit row → Supabase columns. */
function toRemoteHabit(h: any, userId: string) {
  return {
    id: h.id,
    title: h.title,
    type: h.type ?? 'boolean',
    target: h.target ?? 1,
    frequency: h.frequency ?? 'daily',
    color: h.color ?? '#6366f1',
    created_at: h.created_at,
    user_id: userId,
  };
}

/** Map local SQLite habit_log row → Supabase columns. */
function toRemoteHabitLog(l: any, userId: string) {
  return {
    id: l.id,
    habit_id: l.habit_id,
    date: l.date,
    value: l.value ?? 0,
    completed: !!l.completed,
    user_id: userId,
  };
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  syncing: false,
  lastSynced: null,
  lastError: null,

  resetSyncState: () => {
    set({ lastSynced: null, syncing: false, lastError: null });
  },

  syncAll: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (syncInProgress) {
      syncQueued = true;
      return;
    }

    syncInProgress = true;
    set({ syncing: true, lastError: null });
    try {
      do {
        syncQueued = false;
        await get().pushUnsynced();
        await get().pullFromSupabase();
        set({ lastSynced: new Date().toISOString() });
      } while (syncQueued);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Sync] syncAll error:', err);
      set({ lastError: message });
    } finally {
      syncInProgress = false;
      set({ syncing: false });
    }
  },

  pushUnsynced: async (userId?: string) => {
    const user = userId ?? useAuthStore.getState().user?.id;
    if (!user) return;
    const db = await getDatabase();

    // Push deleted records
    const deleted = await db.getAllAsync<any>(
      'SELECT * FROM deleted_records'
    );

    if (deleted.length > 0) {
      const taskDeletes = deleted.filter((d) => d.table_name === 'tasks');
      if (taskDeletes.length > 0) {
        const ids = taskDeletes.map((d) => d.record_id);
        const { error } = await supabase.from('tasks').delete().in('id', ids);
        if (!error) {
          const placeholders = ids.map(() => '?').join(',');
          await db.runAsync(
            `DELETE FROM deleted_records WHERE table_name = 'tasks' AND record_id IN (${placeholders})`,
            ids
          );
          console.log(`[Sync] Deleted ${ids.length} tasks from Supabase`);
        } else {
          console.error('[Sync] Error deleting tasks from Supabase:', error);
          set({ lastError: error.message });
        }
      }

      const habitDeletes = deleted.filter((d) => d.table_name === 'habits');
      if (habitDeletes.length > 0) {
        const ids = habitDeletes.map((d) => d.record_id);

        const { error: logError } = await supabase.from('habit_logs').delete().in('habit_id', ids);
        if (!logError) {
          const { error: habitError } = await supabase.from('habits').delete().in('id', ids);
          if (!habitError) {
            const placeholders = ids.map(() => '?').join(',');
            await db.runAsync(
              `DELETE FROM deleted_records WHERE table_name = 'habits' AND record_id IN (${placeholders})`,
              ids
            );
            console.log(`[Sync] Deleted ${ids.length} habits and their logs from Supabase`);
          } else {
            console.error('[Sync] Error deleting habits from Supabase:', habitError);
            set({ lastError: habitError.message });
          }
        } else {
          console.error('[Sync] Error deleting habit logs from Supabase:', logError);
          set({ lastError: logError.message });
        }
      }
    }

    // Push unsynced tasks — explicit columns only (remote has no sort_order/synced)
    const unsyncedTasks = await db.getAllAsync<any>(
      'SELECT * FROM tasks WHERE synced = 0'
    );
    if (unsyncedTasks.length > 0) {
      const payload = unsyncedTasks.map((t) => toRemoteTask(t, user));
      console.log(`[Sync] Pushing ${payload.length} tasks...`);
      const { error } = await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
      if (!error) {
        const ids = unsyncedTasks.map((t) => t.id);
        const placeholders = ids.map(() => '?').join(',');
        await db.runAsync(
          `UPDATE tasks SET synced = 1 WHERE id IN (${placeholders})`,
          ids
        );
        console.log(`[Sync] Pushed ${unsyncedTasks.length} tasks`);
      } else {
        console.error('[Sync] Error pushing tasks:', error);
        set({ lastError: error.message });
      }
    }

    // Push unsynced habits
    const unsyncedHabits = await db.getAllAsync<any>(
      'SELECT * FROM habits WHERE synced = 0'
    );
    if (unsyncedHabits.length > 0) {
      const payload = unsyncedHabits.map((h) => toRemoteHabit(h, user));
      console.log(`[Sync] Pushing ${payload.length} habits...`);
      const { error } = await supabase.from('habits').upsert(payload, { onConflict: 'id' });
      if (!error) {
        const ids = unsyncedHabits.map((h) => h.id);
        const placeholders = ids.map(() => '?').join(',');
        await db.runAsync(
          `UPDATE habits SET synced = 1 WHERE id IN (${placeholders})`,
          ids
        );
        console.log(`[Sync] Pushed ${unsyncedHabits.length} habits`);
      } else {
        console.error('[Sync] Error pushing habits:', error);
        set({ lastError: error.message });
      }
    }

    // Push unsynced habit logs
    const unsyncedLogs = await db.getAllAsync<any>(
      'SELECT * FROM habit_logs WHERE synced = 0'
    );
    if (unsyncedLogs.length > 0) {
      const payload = unsyncedLogs.map((l) => toRemoteHabitLog(l, user));
      console.log(`[Sync] Pushing ${payload.length} habit logs...`);
      const { error } = await supabase.from('habit_logs').upsert(payload, {
        onConflict: 'habit_id,date',
      });
      if (!error) {
        const ids = unsyncedLogs.map((l) => l.id);
        const placeholders = ids.map(() => '?').join(',');
        await db.runAsync(
          `UPDATE habit_logs SET synced = 1 WHERE id IN (${placeholders})`,
          ids
        );
        console.log(`[Sync] Pushed ${unsyncedLogs.length} habit logs`);
      } else {
        console.error('[Sync] Error pushing habit logs:', error);
        set({ lastError: error.message });
      }
    }
  },

  pullFromSupabase: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    const db = await getDatabase();

    const deleted = await db.getAllAsync<any>(
      'SELECT table_name, record_id FROM deleted_records'
    );
    const deletedTaskIds = new Set<string>(
      deleted.filter((d) => d.table_name === 'tasks').map((d) => d.record_id)
    );
    const deletedHabitIds = new Set<string>(
      deleted.filter((d) => d.table_name === 'habits').map((d) => d.record_id)
    );

    const { data: remoteTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    if (tasksError) {
      console.error('[Sync] Error pulling tasks:', tasksError);
      set({ lastError: tasksError.message });
    } else if (remoteTasks) {
      const remoteTaskIds = new Set(remoteTasks.map((t) => t.id));
      const localSyncedTasks = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM tasks WHERE synced = 1'
      );
      for (const local of localSyncedTasks) {
        if (!remoteTaskIds.has(local.id) && !deletedTaskIds.has(local.id)) {
          await db.runAsync('DELETE FROM tasks WHERE id = ?', local.id);
          console.log(`[Sync] Removed orphan local task ${local.id}`);
        }
      }

      for (const remote of remoteTasks) {
        if (deletedTaskIds.has(remote.id)) {
          console.log(`[Sync] Skipping pulled task ${remote.id} because it was deleted locally`);
          continue;
        }

        const local = await db.getFirstAsync<any>(
          'SELECT * FROM tasks WHERE id = ?', remote.id
        );
        if (!local) {
          await db.runAsync(
            `INSERT INTO tasks
              (id, title, notes, due_date, priority, completed, completed_at, created_at, updated_at, synced, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            remote.id, remote.title, remote.notes ?? null,
            remote.due_date ?? null, remote.priority,
            remote.completed ? 1 : 0, remote.completed_at ?? null,
            remote.created_at, remote.updated_at ?? '',
            remote.sort_order ?? 0
          );
        } else if ((remote.updated_at ?? '') > (local.updated_at ?? '')) {
          await db.runAsync(
            `UPDATE tasks
             SET title = ?, notes = ?, due_date = ?, priority = ?,
                 completed = ?, completed_at = ?, updated_at = ?, synced = 1, sort_order = ?
             WHERE id = ?`,
            remote.title, remote.notes ?? null, remote.due_date ?? null,
            remote.priority, remote.completed ? 1 : 0,
            remote.completed_at ?? null, remote.updated_at ?? '',
            remote.sort_order !== undefined && remote.sort_order !== null ? remote.sort_order : (local.sort_order ?? 0),
            remote.id
          );
        }
      }
      console.log(`[Sync] Pulled ${remoteTasks.length} tasks`);
    }

    const { data: remoteHabits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id);

    if (habitsError) {
      console.error('[Sync] Error pulling habits:', habitsError);
      set({ lastError: habitsError.message });
    } else if (remoteHabits) {
      const remoteHabitIds = new Set(remoteHabits.map((h) => h.id));
      const localSyncedHabits = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM habits WHERE synced = 1'
      );
      for (const local of localSyncedHabits) {
        if (!remoteHabitIds.has(local.id) && !deletedHabitIds.has(local.id)) {
          await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ?', local.id);
          await db.runAsync('DELETE FROM habits WHERE id = ?', local.id);
          console.log(`[Sync] Removed orphan local habit ${local.id}`);
        }
      }

      for (const remote of remoteHabits) {
        if (deletedHabitIds.has(remote.id)) {
          console.log(`[Sync] Skipping pulled habit ${remote.id} because it was deleted locally`);
          continue;
        }

        const local = await db.getFirstAsync<any>(
          'SELECT * FROM habits WHERE id = ?', remote.id
        );
        if (!local) {
          await db.runAsync(
            `INSERT INTO habits
              (id, title, type, target, frequency, color, created_at, synced, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            remote.id, remote.title, remote.type, remote.target,
            remote.frequency, remote.color ?? '#6366f1', remote.created_at,
            remote.sort_order ?? 0
          );
        } else {
          await db.runAsync(
            `UPDATE habits
             SET title = ?, type = ?, target = ?, frequency = ?, color = ?, synced = 1, sort_order = ?
             WHERE id = ?`,
            remote.title, remote.type, remote.target,
            remote.frequency, remote.color ?? local.color ?? '#6366f1',
            local.sort_order ?? 0,
            remote.id
          );
        }
      }
      console.log(`[Sync] Pulled ${remoteHabits.length} habits`);
    }

    const { data: remoteLogs, error: logsError } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id);

    if (logsError) {
      console.error('[Sync] Error pulling habit logs:', logsError);
      set({ lastError: logsError.message });
    } else if (remoteLogs) {
      for (const remote of remoteLogs) {
        if (deletedHabitIds.has(remote.habit_id)) {
          console.log(`[Sync] Skipping pulled habit log for habit ${remote.habit_id} because the habit was deleted locally`);
          continue;
        }

        const local = await db.getFirstAsync<any>(
          'SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?',
          remote.habit_id, remote.date
        );
        if (!local) {
          await db.runAsync(
            `INSERT INTO habit_logs
              (id, habit_id, date, value, completed, synced)
             VALUES (?, ?, ?, ?, ?, 1)`,
            remote.id, remote.habit_id, remote.date,
            remote.value, remote.completed ? 1 : 0
          );
        } else if (local.id !== remote.id || local.value !== remote.value || local.completed !== (remote.completed ? 1 : 0)) {
          await db.runAsync(
            `UPDATE habit_logs
             SET id = ?, value = ?, completed = ?, synced = 1
             WHERE id = ?`,
            remote.id, remote.value, remote.completed ? 1 : 0, local.id
          );
        }
      }
      console.log(`[Sync] Pulled ${remoteLogs.length} habit logs`);
    }

    await useTaskStore.getState().loadTasks();
    await useHabitStore.getState().loadHabits();
    await useHabitStore.getState().loadAllLogs();
    await useHabitStore.getState().loadTodayLogs();
  },
}));
