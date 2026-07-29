import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useHabitStore } from "./useHabitStore";
import { fireRescueNotification } from "@/utils/notifications";

export type RescueItem = {
  habitId: string;
  habitTitle: string;
  message: string;
  previousStreak: number;
};

type RescueStore = {
  items: RescueItem[];
  checking: boolean;
  runRescueCheck: () => Promise<void>;
  dismiss: (habitId: string) => void;
};

export const useRescueStore = create<RescueStore>((set, get) => ({
  items: [],
  checking: false,

  runRescueCheck: async () => {
    if (get().checking) return; // avoid overlapping checks
    set({ checking: true });

    try {
      const broken = await useHabitStore.getState().checkForBrokenStreaks();

      if (broken.length === 0) {
        set({ checking: false });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      for (const { habit, previousStreak } of broken) {
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/habit-rescue`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                habitTitle: habit.title,
                previousStreak,
              }),
            },
          );

          const data = await response.json();
          if (!response.ok || !data.message) continue;

          const item: RescueItem = {
            habitId: habit.id,
            habitTitle: habit.title,
            message: data.message,
            previousStreak,
          };

          set((state) => ({ items: [...state.items, item] }));

          // Fire push notification immediately alongside the in-app card
          await fireRescueNotification(habit.title, data.message);
        } catch (err) {
          console.error("[Rescue] Failed for habit", habit.title, err);
        }
      }
    } catch (err) {
      console.error("[Rescue] runRescueCheck error:", err);
    } finally {
      set({ checking: false });
    }
  },

  dismiss: (habitId) => {
    set((state) => ({
      items: state.items.filter((i) => i.habitId !== habitId),
    }));
  },
}));
