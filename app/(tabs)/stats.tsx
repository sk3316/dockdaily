import AskHabitsSheet from "@/components/AskHabitsSheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useHabitStore } from "@/store/useHabitStore";
import { useInsightsStore } from "@/store/useInsightsStore";
import { useTaskStore } from "@/store/useTaskStore";
import {
  calculateLongestStreak,
  calculateStreak,
  getLastNDays,
  getLocalDateString,
  parseLocalDateString,
} from "@/utils/streak";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function StatsScreen() {
  const { tasks, loadTasks } = useTaskStore();
  const { habits, allLogs, loadHabits, loadAllLogs } = useHabitStore();
  // const scheme = useColorScheme();
  // const colors = Colors[scheme ?? 'light'];
  const { scheme, colors } = useAppTheme();

  useEffect(() => {
    loadTasks();
    loadHabits();
    loadAllLogs();
  }, [loadTasks, loadHabits, loadAllLogs]);

  const {
    insight,
    lastUpdated,
    loading,
    error,
    loadCachedInsight,
    fetchInsight,
  } = useInsightsStore();

  useEffect(() => {
    loadCachedInsight();
  }, [loadCachedInsight]);

  const handleRefreshInsight = () => {
    fetchInsight(habits, allLogs, tasks);
  };

  // Recompute day lists when the calendar date changes (avoids stale data after midnight)
  const todayKey = getLocalDateString();
  const last7Days = useMemo(
    () => getLastNDays(7, parseLocalDateString(todayKey)),
    [todayKey],
  );
  const last14Days = useMemo(
    () => getLastNDays(14, parseLocalDateString(todayKey)),
    [todayKey],
  );

  const completedDatesByHabit = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const h of habits) {
      map[h.id] = new Set(
        allLogs
          .filter((l) => l.habit_id === h.id && l.completed)
          .map((l) => l.date),
      );
    }
    return map;
  }, [habits, allLogs]);

  const weeklyActivity = useMemo(() => {
    return last7Days.map((date) => {
      const habitsCompleted = allLogs.filter(
        (l) => l.date === date && l.completed,
      ).length;
      const tasksCompleted = tasks.filter(
        (t) =>
          t.completed &&
          t.completed_at &&
          format(new Date(t.completed_at), "yyyy-MM-dd") === date,
      ).length;
      return {
        date,
        habitsCompleted,
        tasksCompleted,
        total: habitsCompleted + tasksCompleted,
      };
    });
  }, [last7Days, allLogs, tasks]);

  const maxWeeklyValue = Math.max(1, ...weeklyActivity.map((d) => d.total));

  const tasksCompletedAllTime = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks],
  );

  const longestStreakInfo = useMemo(() => {
    let max = 0;
    let title = "";
    for (const h of habits) {
      const longest = calculateLongestStreak(allLogs, h.id);
      if (longest > max) {
        max = longest;
        title = h.title;
      }
    }
    return { max, title };
  }, [habits, allLogs]);

  const activeStreaks = useMemo(
    () => habits.filter((h) => calculateStreak(allLogs, h.id) > 0).length,
    [habits, allLogs],
  );

  const weekHabitCompletions = weeklyActivity.reduce(
    (sum, d) => sum + d.habitsCompleted,
    0,
  );
  const weekHabitPossible = habits.length * 7;
  const weekCompletionRate =
    weekHabitPossible > 0
      ? Math.round((weekHabitCompletions / weekHabitPossible) * 100)
      : 0;

  const cardBg = scheme === "dark" ? "#1f2123" : "#f2f2f2";
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";

  const [chatVisible, setChatVisible] = useState(false);

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <View style={[styles.staticHeader, { borderBottomColor: borderColor }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: colors.text }]}>Stats</Text>
          <TouchableOpacity
            onPress={() => setChatVisible(true)}
            style={[styles.askButton, { backgroundColor: colors.tint }]}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={16}
              color={scheme === "dark" ? "#151718" : "#fff"}
            />
            <Text
              style={[
                styles.askButtonText,
                { color: scheme === "dark" ? "#151718" : "#fff" },
              ]}
            >
              Ask AI
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tasks.length === 0 && habits.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            Add some tasks and habits to see your stats here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flexFill}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardsGrid}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={styles.statCardHeader}>
                <Ionicons name="flame" size={16} color="#f97316" />
                <Text style={[styles.statLabel, { color: colors.icon }]}>
                  Longest Streak
                </Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {longestStreakInfo.max}
              </Text>
              {longestStreakInfo.title ? (
                <Text
                  style={[styles.statSubtext, { color: colors.icon }]}
                  numberOfLines={1}
                >
                  {longestStreakInfo.title}
                </Text>
              ) : null}
            </View>

            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={styles.statCardHeader}>
                <Ionicons name="checkmark-done" size={16} color={colors.tint} />
                <Text style={[styles.statLabel, { color: colors.icon }]}>
                  Tasks Done
                </Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {tasksCompletedAllTime}
              </Text>
              <Text style={[styles.statSubtext, { color: colors.icon }]}>
                all time
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={styles.statCardHeader}>
                <Ionicons name="trending-up" size={16} color={colors.tint} />
                <Text style={[styles.statLabel, { color: colors.icon }]}>
                  Active Streaks
                </Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {activeStreaks}/{habits.length}
              </Text>
              <Text style={[styles.statSubtext, { color: colors.icon }]}>
                habits going
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={styles.statCardHeader}>
                <Ionicons name="calendar" size={16} color={colors.tint} />
                <Text style={[styles.statLabel, { color: colors.icon }]}>
                  This Week
                </Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {weekCompletionRate}%
              </Text>
              <Text style={[styles.statSubtext, { color: colors.icon }]}>
                habit check-ins
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.insightCard,
              { backgroundColor: cardBg, borderColor: colors.tint },
            ]}
          >
            <View style={styles.insightHeader}>
              <View style={styles.insightHeaderLeft}>
                <Ionicons name="sparkles" size={18} color={colors.tint} />
                <Text style={[styles.insightTitle, { color: colors.text }]}>
                  Weekly Insight
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleRefreshInsight}
                disabled={loading}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={loading ? colors.icon : colors.tint}
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.insightLoading}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text
                  style={[styles.insightLoadingText, { color: colors.icon }]}
                >
                  Analyzing your patterns...
                </Text>
              </View>
            ) : error ? (
              <Text style={[styles.insightError, { color: colors.icon }]}>
                {"Couldn't load insight — tap refresh to try again"}
              </Text>
            ) : insight ? (
              <>
                <Text style={[styles.insightText, { color: colors.text }]}>
                  {insight}
                </Text>
                {lastUpdated && (
                  <Text
                    style={[styles.insightTimestamp, { color: colors.icon }]}
                  >
                    Updated{" "}
                    {formatDistanceToNow(new Date(lastUpdated), {
                      addSuffix: true,
                    })}
                  </Text>
                )}
              </>
            ) : (
              <TouchableOpacity
                onPress={handleRefreshInsight}
                style={styles.insightEmptyButton}
              >
                <Text style={[styles.insightEmptyText, { color: colors.tint }]}>
                  Tap to generate your first insight
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text
            style={[
              styles.sectionHeader,
              { color: colors.text, marginTop: 28 },
            ]}
          >
            Weekly Activity
          </Text>
          <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
            <View style={styles.barsRow}>
              {weeklyActivity.map((day) => {
                const heightPct =
                  day.total > 0
                    ? Math.max(8, (day.total / maxWeeklyValue) * 100)
                    : 4;
                const isToday = day.date === last7Days[last7Days.length - 1];
                return (
                  <View key={day.date} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${heightPct}%`,
                            backgroundColor: isToday
                              ? colors.tint
                              : colors.icon,
                            opacity: isToday ? 1 : 0.55,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.icon }]}>
                      {format(parseLocalDateString(day.date), "EEEEE")}
                    </Text>
                    <Text style={[styles.barValue, { color: colors.text }]}>
                      {day.total}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text
            style={[
              styles.sectionHeader,
              { color: colors.text, marginTop: 28 },
            ]}
          >
            Habit Consistency
          </Text>

          {habits.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No habits yet — add some in the Habits tab
            </Text>
          ) : (
            habits.map((habit) => {
              const streak = calculateStreak(allLogs, habit.id);
              const longest = calculateLongestStreak(allLogs, habit.id);
              const completedDates =
                completedDatesByHabit[habit.id] ?? new Set<string>();

              return (
                <View
                  key={habit.id}
                  style={[styles.habitCard, { borderBottomColor: borderColor }]}
                >
                  <View style={styles.habitCardHeader}>
                    <Text
                      style={[styles.habitCardTitle, { color: colors.text }]}
                    >
                      {habit.title}
                    </Text>
                    <View style={styles.habitCardStreaks}>
                      <Ionicons
                        name="flame"
                        size={13}
                        color={streak > 0 ? "#f97316" : colors.icon}
                      />
                      <Text
                        style={[
                          styles.habitCardStreakText,
                          { color: colors.icon },
                        ]}
                      >
                        {streak} now · {longest} best
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dotsRow}>
                    {last14Days.map((date) => (
                      <View
                        key={date}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: completedDates.has(date)
                              ? colors.tint
                              : scheme === "dark"
                                ? "#2a2c2e"
                                : "#e5e5e5",
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
      <AskHabitsSheet
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  staticHeader: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  header: { fontSize: 28, fontWeight: "700" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  askButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  askButtonText: { fontSize: 13, fontWeight: "700" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 8 },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  statCard: { width: "48%", borderRadius: 14, padding: 14 },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  statLabel: { fontSize: 12, fontWeight: "600" },
  statValue: { fontSize: 24, fontWeight: "700" },
  statSubtext: { fontSize: 12, marginTop: 2 },
  sectionHeader: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  chartCard: { borderRadius: 14, padding: 16 },
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 130,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: { height: 90, width: 20, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  barValue: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  habitCard: { paddingVertical: 14, borderBottomWidth: 1 },
  habitCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  habitCardTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  habitCardStreaks: { flexDirection: "row", alignItems: "center", gap: 4 },
  habitCardStreakText: { fontSize: 12, fontWeight: "500" },
  dotsRow: { flexDirection: "row", gap: 4 },
  dot: { width: 18, height: 18, borderRadius: 4 },
  insightCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1.5,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  insightHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  insightTitle: { fontSize: 15, fontWeight: "700" },
  insightText: { fontSize: 14, lineHeight: 21 },
  insightTimestamp: { fontSize: 11, marginTop: 8 },
  insightLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  insightLoadingText: { fontSize: 13 },
  insightError: { fontSize: 13, fontStyle: "italic" },
  insightEmptyButton: { paddingVertical: 8 },
  insightEmptyText: { fontSize: 14, fontWeight: "600" },
});
