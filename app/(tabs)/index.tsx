import { useAnimatedProgress } from "@/hooks/use-animated-progress";
import { useCelebration } from "@/hooks/use-celebration";
import { useHabitStore } from "@/store/useHabitStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Habit, Task } from "@/types";
import { calculateStreak } from "@/utils/streak";
import { Ionicons } from "@expo/vector-icons";
import { format, isToday } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Image,
  LayoutAnimation,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import HabitRescueCard from "@/components/HabitRescueCard";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function TodayScreen() {
  const { tasks, loadTasks, toggleTask } = useTaskStore();
  const {
    habits,
    logsToday,
    allLogs,
    loadHabits,
    loadTodayLogs,
    loadAllLogs,
    logHabit,
  } = useHabitStore();
  // const scheme = useColorScheme();
  // const colors = Colors[scheme ?? 'light'];
  const { scheme, colors } = useAppTheme();
  const { getFlashAnim, getScaleAnim, celebrate } = useCelebration();

  const [habitsExpanded, setHabitsExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadTasks(),
      loadHabits(),
      loadTodayLogs(),
      loadAllLogs(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadTasks();
    loadHabits();
    loadTodayLogs();
    loadAllLogs();
  }, [loadTasks, loadHabits, loadTodayLogs, loadAllLogs]);

  const logsByHabit = useMemo(() => {
    const map: Record<string, { value: number; completed: boolean }> = {};
    for (const log of logsToday)
      map[log.habit_id] = { value: log.value, completed: log.completed };
    return map;
  }, [logsToday]);

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const completedTodayTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.completed && t.completed_at && isToday(new Date(t.completed_at)),
      ),
    [tasks],
  );

  const taskTotal = openTasks.length + completedTodayTasks.length;
  const taskDone = completedTodayTasks.length;

  const habitsDone = habits.filter((h) => logsByHabit[h.id]?.completed).length;
  const habitsTotal = habits.length;

  const combinedTotal = taskTotal + habitsTotal;
  const combinedDone = taskDone + habitsDone;
  const combinedProgress = combinedTotal > 0 ? combinedDone / combinedTotal : 0;

  // Animated progress bar with green color transition
  const { width: progressBarWidth, backgroundColor: progressBarColor } =
    useAnimatedProgress(combinedProgress, colors.tint);

  const handleToggleBooleanHabit = (habit: Habit) => {
    const current = logsByHabit[habit.id]?.completed ?? false;
    if (!current) {
      celebrate(habit.id);
    }
    logHabit(habit.id, current ? 0 : 1, habit.target);
  };

  const handleIncrementHabit = (habit: Habit, delta: number) => {
    const current = logsByHabit[habit.id]?.value ?? 0;
    const next = Math.max(0, current + delta);
    if (current < habit.target && next >= habit.target) {
      celebrate(habit.id);
    }
    logHabit(habit.id, next, habit.target);
  };

  const handleToggleTask = (task: Task) => {
    if (!task.completed) {
      celebrate(task.id);
    }
    toggleTask(task.id);
  };

  const toggleHabitsSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHabitsExpanded((prev) => !prev);
  };

  const toggleTasksSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasksExpanded((prev) => !prev);
  };

  const { user, profile } = useAuthStore();
  const displayName =
    profile?.display_name ?? user?.user_metadata?.full_name ?? "";
  const initials = displayName
    ? displayName
        .split(" ")
        .filter((n: string) => n.length > 0)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <View style={[styles.staticHeader, { borderBottomColor: borderColor }]}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.date, { color: colors.icon }]}>
              {format(new Date(), "EEEE, MMMM d")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={[
              styles.avatarButton,
              !profile?.avatar_url && { backgroundColor: colors.tint },
            ]}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text
                style={[
                  styles.avatarText,
                  { color: scheme === "dark" ? "#151718" : "#fff" },
                ]}
              >
                {initials}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: scheme === "dark" ? "#1f2123" : "#f2f2f2" },
          ]}
        >
          {combinedTotal === 0 ? (
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Add a task or habit to start tracking today
            </Text>
          ) : (
            <>
              <View style={styles.summaryTextRow}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {"Today's progress"}
                </Text>
                <Text
                  style={[
                    styles.summaryCount,
                    { color: combinedProgress >= 1 ? "#22c55e" : colors.tint },
                  ]}
                >
                  {combinedDone}/{combinedTotal}
                </Text>
              </View>
              <View
                style={[
                  styles.progressTrackBg,
                  { backgroundColor: scheme === "dark" ? "#333" : "#e0e0e0" },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressBarWidth,
                      backgroundColor: progressBarColor,
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.flexFill}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
            progressBackgroundColor={scheme === "dark" ? "#1f2123" : "#ffffff"}
          />
        }
      >
        <HabitRescueCard />

        <TouchableOpacity
          onPress={toggleHabitsSection}
          activeOpacity={0.6}
          style={styles.sectionHeaderRow}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons
              name={habitsExpanded ? "chevron-down" : "chevron-forward"}
              size={18}
              color={colors.icon}
            />
            <Text style={[styles.sectionHeader, { color: colors.text }]}>
              Habits
            </Text>
          </View>
          <Text
            style={[
              styles.sectionCount,
              {
                color:
                  habitsDone === habitsTotal && habitsTotal > 0
                    ? "#22c55e"
                    : colors.icon,
              },
            ]}
          >
            {habitsDone}/{habitsTotal}
          </Text>
        </TouchableOpacity>

        {habitsExpanded &&
          (habits.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No habits yet — add some in the Habits tab
            </Text>
          ) : (
            habits.map((habit) => {
              const log = logsByHabit[habit.id];
              const value = log?.value ?? 0;
              const completed = log?.completed ?? false;
              const streak = calculateStreak(allLogs, habit.id);
              const flashAnim = getFlashAnim(habit.id);
              const scaleAnim = getScaleAnim(habit.id);
              const flashColor = flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  "rgba(34,197,94,0)",
                  scheme === "dark"
                    ? "rgba(34,197,94,0.28)"
                    : "rgba(34,197,94,0.16)",
                ],
              });

              return (
                <Animated.View
                  key={habit.id}
                  style={[
                    styles.itemRow,
                    {
                      borderBottomColor: borderColor,
                      backgroundColor: flashColor,
                    },
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      {habit.title}
                    </Text>
                    <View style={styles.streakRow}>
                      <Animated.View
                        style={{ transform: [{ scale: scaleAnim }] }}
                      >
                        <Ionicons
                          name="flame"
                          size={13}
                          color={streak > 0 ? "#f97316" : colors.icon}
                        />
                      </Animated.View>
                      <Text
                        style={[
                          styles.streakText,
                          { color: streak > 0 ? "#f97316" : colors.icon },
                        ]}
                      >
                        {streak} day{streak === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>

                  {habit.type === "boolean" ? (
                    <TouchableOpacity
                      onPress={() => handleToggleBooleanHabit(habit)}
                    >
                      <Animated.View
                        style={{ transform: [{ scale: scaleAnim }] }}
                      >
                        <Ionicons
                          name={completed ? "checkbox" : "square-outline"}
                          size={26}
                          color={completed ? "#22c55e" : colors.icon}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.counterRow}>
                      <TouchableOpacity
                        onPress={() => handleIncrementHabit(habit, -1)}
                        style={styles.counterButton}
                      >
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.counterText,
                          { color: completed ? "#22c55e" : colors.text },
                        ]}
                      >
                        {value}/{habit.target}
                        {habit.type === "duration" ? "m" : ""}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleIncrementHabit(habit, 1)}
                        style={styles.counterButton}
                      >
                        <Ionicons name="add" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              );
            })
          ))}

        <TouchableOpacity
          onPress={toggleTasksSection}
          activeOpacity={0.6}
          style={[styles.sectionHeaderRow, { marginTop: 24 }]}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons
              name={tasksExpanded ? "chevron-down" : "chevron-forward"}
              size={18}
              color={colors.icon}
            />
            <Text style={[styles.sectionHeader, { color: colors.text }]}>
              Tasks
            </Text>
          </View>
          <Text style={[styles.sectionCount, { color: colors.icon }]}>
            {openTasks.length} open
          </Text>
        </TouchableOpacity>

        {tasksExpanded &&
          (openTasks.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              {tasks.length > 0
                ? "All tasks completed! 🎉"
                : "No tasks yet — add some in the Tasks tab"}
            </Text>
          ) : (
            <>
              {openTasks.map((task) => {
                const scaleAnim = getScaleAnim(task.id);

                return (
                  <View
                    key={task.id}
                    style={[styles.itemRow, { borderBottomColor: borderColor }]}
                  >
                    <TouchableOpacity
                      onPress={() => handleToggleTask(task)}
                      style={styles.checkbox}
                    >
                      <Animated.View
                        style={{ transform: [{ scale: scaleAnim }] }}
                      >
                        <Ionicons
                          name="square-outline"
                          size={24}
                          color={colors.icon}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: colors.text, flex: 1 },
                      ]}
                    >
                      {task.title}
                    </Text>
                  </View>
                );
              })}
            </>
          ))}
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  greeting: { fontSize: 26, fontWeight: "700" },
  date: { fontSize: 15, marginTop: 2, marginBottom: 16 },
  summaryCard: { borderRadius: 16, padding: 16 },
  summaryTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryTitle: { fontSize: 15, fontWeight: "600" },
  summaryCount: { fontSize: 15, fontWeight: "700" },
  progressTrackBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 4,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionHeader: { fontSize: 20, fontWeight: "700" },
  sectionCount: { fontSize: 14, fontWeight: "500" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "500" },
  completedItemTitle: { fontWeight: "600" },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  streakText: { fontSize: 12, fontWeight: "500" },
  checkbox: { padding: 2 },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  counterButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  counterText: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 46,
    textAlign: "center",
  },
  emptyText: { fontSize: 14, marginBottom: 16 },
  doneLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  greetingText: { flex: 1 },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
