import AISuggestionSheet from "@/components/AISuggestionSheet";
import ReminderDrawer from "@/components/ReminderDrawer";
import { useAnimatedProgress } from "@/hooks/use-animated-progress";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useCelebration } from "@/hooks/use-celebration";
import { useAIStore } from "@/store/useAIStore";
import { useHabitStore } from "@/store/useHabitStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Habit } from "@/types";
import { requestNotificationPermissions } from "@/utils/notifications";
import { calculateStreak } from "@/utils/streak";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const HABIT_TYPES: { key: Habit["type"]; label: string }[] = [
  { key: "boolean", label: "Yes/No" },
  { key: "count", label: "Count" },
  { key: "duration", label: "Minutes" },
];

export default function HabitsScreen() {
  const {
    habits,
    logsToday,
    allLogs,
    loadHabits,
    loadTodayLogs,
    loadAllLogs,
    addHabit,
    logHabit,
    deleteHabit,
    reorderHabits,
    updateHabitTitle,
    setHabitReminder,
  } = useHabitStore();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadHabits(), loadTodayLogs(), loadAllLogs()]);
    setRefreshing(false);
  };

  const [input, setInput] = useState("");
  const [selectedType, setSelectedType] = useState<Habit["type"]>("boolean");
  const [targetInput, setTargetInput] = useState("1");
  const [editingCounterId, setEditingCounterId] = useState<string | null>(null);
  const [editingCounterText, setEditingCounterText] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const [reminderHabit, setReminderHabit] = useState<Habit | null>(null);
  const { scheme, colors } = useAppTheme();
  const { getFlashAnim, getScaleAnim, celebrate } = useCelebration();
  const { fetchSuggestions } = useAIStore();
  const { tasks } = useTaskStore();

  useEffect(() => {
    loadHabits();
    loadTodayLogs();
    loadAllLogs();
  }, [loadHabits, loadTodayLogs, loadAllLogs]);

  const logsByHabit = useMemo(() => {
    const map: Record<string, { value: number; completed: boolean }> = {};
    for (const log of logsToday)
      map[log.habit_id] = { value: log.value, completed: log.completed };
    return map;
  }, [logsToday]);

  const completedCount = useMemo(
    () => habits.filter((h) => logsByHabit[h.id]?.completed).length,
    [habits, logsByHabit],
  );
  const totalCount = habits.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const { width: progressBarWidth, backgroundColor: progressBarColor } =
    useAnimatedProgress(progress, colors.tint);

  const handleAdd = async () => {
    if (!input.trim()) return;
    const target =
      selectedType === "boolean"
        ? 1
        : Math.max(1, parseInt(targetInput, 10) || 1);
    await addHabit(input.trim(), selectedType, target);

    const updatedHabits = useHabitStore.getState().habits;
    const newHabit = updatedHabits.find((h) => h.title === input.trim());

    setInput("");
    setTargetInput("1");
    setSelectedType("boolean");

    if (newHabit) {
      Alert.alert(
        "✨ Want suggestions?",
        `Get AI-powered habits and tasks to help you succeed with "${newHabit.title}"?`,
        [
          { text: "No thanks", style: "cancel" },
          {
            text: "Yes, suggest!",
            onPress: () => {
              const openTasks = tasks.filter((t) => !t.completed);
              fetchSuggestions(newHabit, updatedHabits, openTasks);
            },
          },
        ],
      );
    }
  };

  const handleIncrement = (habit: Habit, delta: number) => {
    const current = logsByHabit[habit.id]?.value ?? 0;
    const next = Math.max(0, current + delta);
    if (current < habit.target && next >= habit.target) {
      celebrate(habit.id);
    }
    logHabit(habit.id, next, habit.target);
    if (editingCounterId === habit.id) {
      setEditingCounterId(null);
      setEditingCounterText("");
    }
  };

  const handleToggleBoolean = (habit: Habit) => {
    const current = logsByHabit[habit.id]?.completed ?? false;
    if (!current) {
      celebrate(habit.id);
    }
    logHabit(habit.id, current ? 0 : 1, habit.target);
  };

  const startEditingCounter = (habit: Habit) => {
    const current = logsByHabit[habit.id]?.value ?? 0;
    setEditingCounterId(habit.id);
    setEditingCounterText(String(current));
  };

  const saveCounterEdit = (habit: Habit) => {
    const parsed = parseInt(editingCounterText, 10);
    const current = logsByHabit[habit.id]?.value ?? 0;
    const value = isNaN(parsed) ? current : Math.max(0, parsed);
    const wasComplete = current >= habit.target;
    const nowComplete = value >= habit.target;
    if (!wasComplete && nowComplete) {
      celebrate(habit.id);
    }
    logHabit(habit.id, value, habit.target);
    setEditingCounterId(null);
    setEditingCounterText("");
  };

  const startEditingTitle = (habit: Habit) => {
    setEditingTitleId(habit.id);
    setEditingTitleText(habit.title);
  };

  const saveTitleEdit = async (habit: Habit) => {
    await updateHabitTitle(habit.id, editingTitleText);
    setEditingTitleId(null);
    setEditingTitleText("");
  };

  const cancelTitleEdit = () => {
    setEditingTitleId(null);
    setEditingTitleText("");
  };

  const handleSaveReminder = async (time: string, date: string | null) => {
    if (!reminderHabit) return;
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        "Permission needed",
        "Enable notifications in Settings to use reminders.",
      );
      return;
    }
    await setHabitReminder(reminderHabit.id, time, date);
  };

  const handleRemoveReminder = async () => {
    if (!reminderHabit) return;
    await setHabitReminder(reminderHabit.id, null);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Habit>) => {
    const log = logsByHabit[item.id];
    const value = log?.value ?? 0;
    const completed = log?.completed ?? false;
    const streak = calculateStreak(allLogs, item.id);
    const isEditingCounter = editingCounterId === item.id;
    const isEditingTitle = editingTitleId === item.id;
    const flashAnim = getFlashAnim(item.id);
    const scaleAnim = getScaleAnim(item.id);
    const flashColor = flashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        "rgba(34,197,94,0)",
        scheme === "dark" ? "rgba(34,197,94,0.28)" : "rgba(34,197,94,0.16)",
      ],
    });

    return (
      <ScaleDecorator>
        <AnimatedTouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          activeOpacity={1}
          style={[
            styles.habitRow,
            {
              borderBottomColor: scheme === "dark" ? "#2a2c2e" : "#eee",
              backgroundColor: flashColor,
            },
            isActive && {
              backgroundColor: scheme === "dark" ? "#1f2123" : "#f9f9f9",
              opacity: 0.7,
            },
          ]}
        >
          <View style={styles.habitInfo}>
            {isEditingTitle ? (
              <TextInput
                style={[
                  styles.habitTitleInput,
                  { color: colors.text, borderColor: colors.tint },
                ]}
                value={editingTitleText}
                onChangeText={setEditingTitleText}
                onSubmitEditing={() => saveTitleEdit(item)}
                onBlur={() => saveTitleEdit(item)}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity
                onPress={() => startEditingTitle(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.habitTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
            {!isEditingTitle && (
              <View style={styles.streakRow}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <Ionicons
                    name="flame"
                    size={14}
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
            )}
          </View>

          {item.type === "boolean" ? (
            <TouchableOpacity
              onPress={() => handleToggleBoolean(item)}
              style={styles.checkbox}
            >
              <Ionicons
                name={completed ? "checkbox" : "square-outline"}
                size={28}
                color={completed ? "#22c55e" : colors.icon}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => handleIncrement(item, -1)}
                style={styles.counterButton}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>

              {isEditingCounter ? (
                <View style={styles.counterEditRow}>
                  <TextInput
                    style={[
                      styles.counterInput,
                      { color: colors.text, borderColor: colors.tint },
                    ]}
                    value={editingCounterText}
                    onChangeText={(text) =>
                      setEditingCounterText(text.replace(/[^0-9]/g, ""))
                    }
                    onSubmitEditing={() => saveCounterEdit(item)}
                    onBlur={() => saveCounterEdit(item)}
                    keyboardType="number-pad"
                    autoFocus
                    selectTextOnFocus
                    maxLength={5}
                  />
                  <Text style={[styles.counterSuffix, { color: colors.text }]}>
                    /{item.target}
                    {item.type === "duration" ? "m" : ""}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => startEditingCounter(item)}>
                  <Text
                    style={[
                      styles.counterText,
                      { color: completed ? "#22c55e" : colors.text },
                    ]}
                  >
                    {value}/{item.target}
                    {item.type === "duration" ? "m" : ""}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleIncrement(item, 1)}
                style={styles.counterButton}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.rightActions}>
            <TouchableOpacity
              onPress={() => setReminderHabit(item)}
              style={{ padding: 4 }}
            >
              <Ionicons
                name={
                  item.reminder_time ? "notifications" : "notifications-outline"
                }
                size={18}
                color={item.reminder_time ? colors.tint : colors.icon}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteHabit(item.id)}
              style={{ padding: 4 }}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={0}
              style={{ padding: 4 }}
            >
              <Ionicons name="menu-outline" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </AnimatedTouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flexFill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        <Text style={[styles.header, { color: colors.text }]}>Habits</Text>

        {totalCount > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressTrackBg,
                  { backgroundColor: scheme === "dark" ? "#2a2c2e" : "#eee" },
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
            </View>
            <Text style={[styles.progressLabel, { color: colors.icon }]}>
              {completedCount}/{totalCount} completed today
            </Text>
          </View>
        )}

        <DraggableFlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderHabits(data.map((item) => item.id))}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          activationDistance={10}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
              progressBackgroundColor={
                scheme === "dark" ? "#1f2123" : "#ffffff"
              }
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No habits yet — add one below 👇
            </Text>
          }
        />
      </View>

      <View
        style={[
          styles.addSection,
          {
            borderTopColor: scheme === "dark" ? "#2a2c2e" : "#eee",
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.typeRow}>
          {HABIT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setSelectedType(t.key)}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    selectedType === t.key
                      ? colors.tint
                      : scheme === "dark"
                        ? "#1f2123"
                        : "#f2f2f2",
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedType === t.key
                      ? scheme === "dark"
                        ? "#151718"
                        : "#fff"
                      : colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: scheme === "dark" ? "#1f2123" : "#f2f2f2",
                color: colors.text,
              },
            ]}
            placeholder="Add a habit..."
            placeholderTextColor={colors.icon}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />

          {selectedType !== "boolean" && (
            <TextInput
              style={[
                styles.targetInput,
                {
                  backgroundColor: scheme === "dark" ? "#1f2123" : "#f2f2f2",
                  color: colors.text,
                },
              ]}
              placeholder="Target"
              placeholderTextColor={colors.icon}
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="number-pad"
            />
          )}

          <TouchableOpacity
            onPress={handleAdd}
            style={[styles.addButton, { backgroundColor: colors.tint }]}
          >
            <Ionicons
              name="add"
              size={24}
              color={scheme === "dark" ? "#151718" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <AISuggestionSheet />

      <ReminderDrawer
        visible={reminderHabit !== null}
        onClose={() => setReminderHabit(null)}
        itemTitle={reminderHabit?.title ?? ""}
        itemType="habit"
        currentTime={reminderHabit?.reminder_time}
        currentDate={reminderHabit?.reminder_date}
        onSave={handleSaveReminder}
        onRemove={handleRemoveReminder}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  header: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  progressSection: { marginBottom: 12 },
  progressTrack: { marginBottom: 6 },
  progressTrackBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 13, fontWeight: "500" },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: 16, fontWeight: "500" },
  habitTitleInput: {
    fontSize: 16,
    fontWeight: "500",
    borderBottomWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  streakText: { fontSize: 13, fontWeight: "500" },
  checkbox: { padding: 2 },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  counterText: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 50,
    textAlign: "center",
  },
  counterEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 50,
    justifyContent: "center",
  },
  counterInput: {
    fontSize: 14,
    fontWeight: "600",
    borderBottomWidth: 1,
    minWidth: 28,
    textAlign: "center",
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  counterSuffix: { fontSize: 14, fontWeight: "600" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 15 },
  addSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 20,
    borderTopWidth: 1,
    gap: 8,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  targetInput: {
    width: 70,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rightActions: { flexDirection: "row", alignItems: "center", gap: 4 },
});
