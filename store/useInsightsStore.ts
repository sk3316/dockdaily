import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/lib/supabase";
import { Habit, HabitLog, Task } from "@/types";
import {
  calculateStreak,
  calculateLongestStreak,
  getLastNDays,
  getLocalDateString,
  parseLocalDateString,
} from "@/utils/streak";
import { differenceInDays } from "date-fns";

const CACHE_KEY = "weekly_insight_cache";
const CACHE_TIMESTAMP_KEY = "weekly_insight_timestamp";

type InsightsStore = {
  insight: string | null;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  loadCachedInsight: () => Promise<void>;
  fetchInsight: (
    habits: Habit[],
    allLogs: HabitLog[],
    tasks: Task[],
  ) => Promise<void>;
};

export const useInsightsStore = create<InsightsStore>((set) => ({
  insight: null,
  lastUpdated: null,
  loading: false,
  error: null,

  loadCachedInsight: async () => {
    try {
      const [cached, timestamp] = await Promise.all([
        SecureStore.getItemAsync(CACHE_KEY),
        SecureStore.getItemAsync(CACHE_TIMESTAMP_KEY),
      ]);
      if (cached) {
        set({ insight: cached, lastUpdated: timestamp });
      }
    } catch (err) {
      console.error("[Insights] Failed to load cache:", err);
    }
  },

  fetchInsight: async (habits, allLogs, tasks) => {
    set({ loading: true, error: null });

    try {
      const todayKey = getLocalDateString();
      const last14Days = getLastNDays(14, parseLocalDateString(todayKey));

      const habitStats = habits.map((h) => {
        const completedDays = last14Days.filter((date) =>
          allLogs.some(
            (l) => l.habit_id === h.id && l.date === date && l.completed,
          ),
        ).length;
        return {
          title: h.title,
          type: h.type,
          completedDays,
          currentStreak: calculateStreak(allLogs, h.id),
          longestStreak: calculateLongestStreak(allLogs, h.id),
        };
      });

      const completedLast14Days = tasks.filter(
        (t) =>
          t.completed &&
          t.completed_at &&
          differenceInDays(new Date(), new Date(t.completed_at)) <= 14,
      ).length;

      const openTasks = tasks.filter((t) => !t.completed);
      const oldestOpenTaskDays =
        openTasks.length > 0
          ? Math.max(
              ...openTasks.map((t) =>
                differenceInDays(new Date(), new Date(t.created_at)),
              ),
            )
          : 0;

      const taskStats = {
        completedLast14Days,
        currentlyOpen: openTasks.length,
        oldestOpenTaskDays,
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/weekly-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ habitStats, taskStats }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error ?? "Something went wrong", loading: false });
        return;
      }

      const now = new Date().toISOString();
      await SecureStore.setItemAsync(CACHE_KEY, data.insight);
      await SecureStore.setItemAsync(CACHE_TIMESTAMP_KEY, now);

      set({ insight: data.insight, lastUpdated: now, loading: false });
    } catch (err) {
      console.error("[Insights] fetchInsight error:", err);
      set({ error: "Network error — try again", loading: false });
    }
  },
}));
