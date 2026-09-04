import ReminderDrawer from "@/components/ReminderDrawer";
import { useAnimatedProgress } from "@/hooks/use-animated-progress";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useCelebration } from "@/hooks/use-celebration";
import { useTaskStore } from "@/store/useTaskStore";
import { Task } from "@/types";
import { requestNotificationPermissions } from "@/utils/notifications";
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

export default function TasksScreen() {
  const {
    tasks,
    loadTasks,
    addTask,
    toggleTask,
    deleteTask,
    bulkComplete,
    bulkDelete,
    updateTaskTitle,
    reorderTasks,
    setTaskReminder,
  } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };
  const [input, setInput] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [reminderTask, setReminderTask] = useState<Task | null>(null);
  const { scheme, colors } = useAppTheme();
  const { getFlashAnim, getScaleAnim, celebrate } = useCelebration();

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await addTask(input.trim());
    setInput("");
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const exitSearchMode = () => {
    setSearchMode(false);
    setSearchQuery("");
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, searchQuery]);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks],
  );
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const { width: progressBarWidth, backgroundColor: progressBarColor } =
    useAnimatedProgress(progress, colors.tint);

  const allSelected =
    filteredTasks.length > 0 && selectedIds.size === filteredTasks.length;

  const handleSelectAllToggle = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleBulkComplete = async () => {
    await bulkComplete(Array.from(selectedIds));
    exitSelectMode();
  };

  const confirmDeleteTask = (task: Task) => {
    const title = "Delete Task";
    const message = `Are you sure you want to delete "${task.title}"?`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) {
        deleteTask(task.id);
      }
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTask(task.id),
      },
    ]);
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const title = "Delete Tasks";
    const message = `Are you sure you want to delete ${count} selected task${count === 1 ? "" : "s"}?`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) {
        bulkDelete(Array.from(selectedIds)).then(exitSelectMode);
      }
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await bulkDelete(Array.from(selectedIds));
          exitSelectMode();
        },
      },
    ]);
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditingText(task.title);
  };

  const saveEdit = async () => {
    if (editingId) {
      await updateTaskTitle(editingId, editingText);
    }
    setEditingId(null);
    setEditingText("");
  };

  const handleCheckboxPress = (item: Task) => {
    if (selectMode) {
      toggleSelected(item.id);
      return;
    }
    if (!item.completed) {
      celebrate(item.id);
    }
    toggleTask(item.id);
  };

  const handleSaveReminder = async (time: string, date: string | null) => {
    if (!reminderTask) return;
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        "Permission needed",
        "Enable notifications in Settings to use reminders.",
      );
      return;
    }
    await setTaskReminder(reminderTask.id, time, date);
  };

  const handleRemoveReminder = async () => {
    if (!reminderTask) return;
    await setTaskReminder(reminderTask.id, null);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Task>) => {
    const isSelected = selectedIds.has(item.id);
    const isEditing = editingId === item.id;
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
          activeOpacity={selectMode ? 0.6 : 1}
          onPress={() => (selectMode ? toggleSelected(item.id) : undefined)}
          onLongPress={selectMode ? undefined : drag}
          disabled={isActive}
          style={[
            styles.taskRow,
            { borderBottomColor: scheme === "dark" ? "#2a2c2e" : "#eee" },
            selectMode &&
              isSelected && {
                backgroundColor: scheme === "dark" ? "#1f2937" : "#eef2ff",
              },
            isActive && {
              backgroundColor: scheme === "dark" ? "#1f2123" : "#f9f9f9",
              opacity: 0.7,
            },
            { backgroundColor: flashColor },
          ]}
        >
          <TouchableOpacity
            onPress={() => handleCheckboxPress(item)}
            style={styles.checkbox}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={
                  selectMode
                    ? isSelected
                      ? "checkbox"
                      : "square-outline"
                    : item.completed
                      ? "checkbox"
                      : "square-outline"
                }
                size={24}
                color={
                  selectMode
                    ? isSelected
                      ? colors.tint
                      : colors.icon
                    : item.completed
                      ? "#22c55e"
                      : colors.icon
                }
              />
            </Animated.View>
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              style={[
                styles.taskTitle,
                styles.editInput,
                { color: colors.text, borderColor: colors.tint },
              ]}
              value={editingText}
              onChangeText={setEditingText}
              onSubmitEditing={saveEdit}
              onBlur={saveEdit}
              autoFocus
              returnKeyType="done"
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              style={styles.taskTitleTouchable}
              disabled={selectMode}
              onPress={() => startEditing(item)}
              onLongPress={selectMode ? undefined : drag}
            >
              <Text
                style={[
                  styles.taskTitle,
                  { color: colors.text },
                  item.completed && styles.taskCompleted,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          )}

          {!selectMode && !isEditing && (
            <View style={styles.rightActions}>
              <TouchableOpacity
                onPress={() => setReminderTask(item)}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name={
                    item.reminder_time
                      ? "notifications"
                      : "notifications-outline"
                  }
                  size={18}
                  color={item.reminder_time ? colors.tint : colors.icon}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDeleteTask(item)}
                style={{ padding: 4 }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={0}
                style={{ padding: 4 }}
              >
                <Ionicons name="menu-outline" size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>
          )}
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
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: colors.text }]}>
            {selectMode ? `${selectedIds.size} selected` : "Tasks"}
          </Text>

          <View style={styles.headerActions}>
            {!selectMode && tasks.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  searchMode ? exitSearchMode() : setSearchMode(true)
                }
                style={styles.iconButton}
              >
                <Ionicons
                  name={searchMode ? "close" : "search"}
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}

            {!searchMode && tasks.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  selectMode ? exitSelectMode() : setSelectMode(true)
                }
              >
                <Text style={[styles.selectToggle, { color: colors.tint }]}>
                  {selectMode ? "Cancel" : "Select"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!selectMode && totalCount > 0 && (
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
              {completedCount}/{totalCount} completed
            </Text>
          </View>
        )}

        {searchMode && (
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: scheme === "dark" ? "#1f2123" : "#f2f2f2",
                color: colors.text,
              },
            ]}
            placeholder="Search tasks..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
        )}

        {selectMode && (
          <TouchableOpacity
            onPress={handleSelectAllToggle}
            style={styles.selectAllRow}
          >
            <Ionicons
              name={allSelected ? "checkbox" : "square-outline"}
              size={20}
              color={colors.tint}
            />
            <Text style={[styles.selectAllText, { color: colors.tint }]}>
              {allSelected ? "Deselect All" : "Select All"}
            </Text>
          </TouchableOpacity>
        )}

        <DraggableFlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderTasks(data.map((item) => item.id))}
          contentContainerStyle={{ paddingBottom: 100 }}
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
              {searchQuery.trim()
                ? `No tasks match "${searchQuery.trim()}"`
                : "No tasks yet — add one below 👇"}
            </Text>
          }
        />
      </View>

      {selectMode ? (
        <View
          style={[
            styles.bulkBar,
            {
              borderTopColor: scheme === "dark" ? "#2a2c2e" : "#eee",
              backgroundColor: colors.background,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleBulkComplete}
            disabled={selectedIds.size === 0}
            style={[
              styles.bulkButton,
              {
                backgroundColor: colors.tint,
                opacity: selectedIds.size === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons
              name="checkmark-done"
              size={18}
              color={scheme === "dark" ? "#151718" : "#fff"}
            />
            <Text
              style={[
                styles.bulkButtonText,
                { color: scheme === "dark" ? "#151718" : "#fff" },
              ]}
            >
              Complete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBulkDelete}
            disabled={selectedIds.size === 0}
            style={[
              styles.bulkButton,
              {
                backgroundColor: "#ef4444",
                opacity: selectedIds.size === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={[styles.bulkButtonText, { color: "#fff" }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.inputRow,
            {
              borderTopColor: scheme === "dark" ? "#2a2c2e" : "#eee",
              backgroundColor: colors.background,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: scheme === "dark" ? "#1f2123" : "#f2f2f2",
                color: colors.text,
              },
            ]}
            placeholder="Add a task..."
            placeholderTextColor={colors.icon}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
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
      )}

      <ReminderDrawer
        key={reminderTask?.id ?? "none"}
        visible={reminderTask !== null}
        onClose={() => setReminderTask(null)}
        itemTitle={reminderTask?.title ?? ""}
        itemType="task"
        currentTime={reminderTask?.reminder_time}
        currentDate={reminderTask?.reminder_date}
        onSave={handleSaveReminder}
        onRemove={handleRemoveReminder}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  header: { fontSize: 28, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconButton: { padding: 2 },
  selectToggle: { fontSize: 16, fontWeight: "600" },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  progressSection: { marginBottom: 12 },
  progressTrack: { marginBottom: 6 },
  progressTrackBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 13, fontWeight: "500" },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    marginBottom: 4,
  },
  selectAllText: { fontSize: 15, fontWeight: "500" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  checkbox: { padding: 2 },
  taskTitleTouchable: { flex: 1 },
  taskTitle: { flex: 1, fontSize: 16 },
  taskCompleted: { textDecorationLine: "line-through", opacity: 0.5 },
  editInput: { borderBottomWidth: 1, paddingVertical: 2 },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 15 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 20,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
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
  bulkBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 20,
    borderTopWidth: 1,
  },
  bulkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  bulkButtonText: { fontSize: 15, fontWeight: "600" },
  rightActions: { flexDirection: "row", alignItems: "center", gap: 4 },
});
