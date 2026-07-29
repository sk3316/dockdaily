import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '@/store/useTaskStore';
import { Task } from '@/types';
import { useCelebration } from '@/hooks/use-celebration';
import { useAnimatedProgress } from '@/hooks/use-animated-progress';
import { useAppTheme } from '@/hooks/use-app-theme';
import { requestNotificationPermissions } from '@/utils/notifications';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function TasksScreen() {
  const { tasks, loadTasks, addTask, toggleTask, deleteTask, bulkComplete, bulkDelete, updateTaskTitle, reorderTasks, setTaskReminder } =
    useTaskStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };
  const [input, setInput] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [reminderPickerId, setReminderPickerId] = useState<string | null>(null);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const { scheme, colors } = useAppTheme();
  const { getFlashAnim, getScaleAnim, celebrate } = useCelebration();

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await addTask(input.trim());
    setInput('');
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const exitSearchMode = () => {
    setSearchMode(false);
    setSearchQuery('');
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

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const { width: progressBarWidth, backgroundColor: progressBarColor } = useAnimatedProgress(
    progress,
    colors.tint
  );

  const allSelected = filteredTasks.length > 0 && selectedIds.size === filteredTasks.length;

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

  const handleBulkDelete = async () => {
    await bulkDelete(Array.from(selectedIds));
    exitSelectMode();
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
    setEditingText('');
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

  const toggleReminderPicker = (task: Task) => {
    if (reminderPickerId === task.id) {
      setReminderPickerId(null);
      return;
    }
    if (task.reminder_time) {
      const [h, m] = task.reminder_time.split(':').map(Number);
      setPickerHour(h);
      setPickerMinute(m);
    } else {
      setPickerHour(9);
      setPickerMinute(0);
    }
    setReminderPickerId(task.id);
  };

  const commitReminder = async (task: Task) => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert('Permission needed', 'Enable notifications in Settings to use reminders.');
      return;
    }
    const formatted = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    await setTaskReminder(task.id, formatted);
    setReminderPickerId(null);
  };

  const removeReminder = async (task: Task) => {
    await setTaskReminder(task.id, null);
    setReminderPickerId(null);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Task>) => {
    const isSelected = selectedIds.has(item.id);
    const isEditing = editingId === item.id;
    const isPickerOpen = reminderPickerId === item.id;
    const flashAnim = getFlashAnim(item.id);
    const scaleAnim = getScaleAnim(item.id);
    const flashColor = flashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        'rgba(34,197,94,0)',
        scheme === 'dark' ? 'rgba(34,197,94,0.28)' : 'rgba(34,197,94,0.16)',
      ],
    });

    return (
      <ScaleDecorator>
        <View style={[styles.taskWrapper, { borderBottomColor: scheme === 'dark' ? '#2a2c2e' : '#eee' }]}>
          <AnimatedTouchableOpacity
            activeOpacity={selectMode ? 0.6 : 1}
            onPress={() => (selectMode ? toggleSelected(item.id) : undefined)}
            onLongPress={selectMode ? undefined : drag}
            disabled={isActive}
            style={[
              styles.taskRow,
              selectMode && isSelected && {
                backgroundColor: scheme === 'dark' ? '#1f2937' : '#eef2ff',
              },
              isActive && {
                backgroundColor: scheme === 'dark' ? '#1f2123' : '#f9f9f9',
                opacity: 0.7,
              },
              { backgroundColor: flashColor },
            ]}
          >
            <TouchableOpacity onPress={() => handleCheckboxPress(item)} style={styles.checkbox}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                  name={
                    selectMode
                      ? isSelected ? 'checkbox' : 'square-outline'
                      : item.completed ? 'checkbox' : 'square-outline'
                  }
                  size={24}
                  color={
                    selectMode
                      ? isSelected ? colors.tint : colors.icon
                      : item.completed ? '#22c55e' : colors.icon
                  }
                />
              </Animated.View>
            </TouchableOpacity>

            {isEditing ? (
              <TextInput
                style={[styles.taskTitle, styles.editInput, { color: colors.text, borderColor: colors.tint }]}
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
                <TouchableOpacity onPress={() => toggleReminderPicker(item)} style={{ padding: 4 }}>
                  <Ionicons
                    name={item.reminder_time ? 'notifications' : 'notifications-outline'}
                    size={18}
                    color={item.reminder_time ? colors.tint : colors.icon}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTask(item.id)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onLongPress={drag} delayLongPress={0} style={{ padding: 4 }}>
                  <Ionicons name="menu-outline" size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>
            )}
          </AnimatedTouchableOpacity>

          {isPickerOpen && (
            <View
              style={[
                styles.reminderPicker,
                { borderTopColor: scheme === 'dark' ? '#2a2c2e' : '#eee', backgroundColor: scheme === 'dark' ? '#1a1c1e' : '#fafafa' },
              ]}
            >
              <View style={styles.timePickerCol}>
                <TouchableOpacity onPress={() => setPickerHour((h) => (h + 1) % 24)} style={styles.timeArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.tint} />
                </TouchableOpacity>
                <Text style={[styles.timeValue, { color: colors.text }]}>{String(pickerHour).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setPickerHour((h) => (h - 1 + 24) % 24)} style={styles.timeArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.tint} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.timeSep, { color: colors.text }]}>:</Text>
              <View style={styles.timePickerCol}>
                <TouchableOpacity onPress={() => setPickerMinute((m) => (m + 5) % 60)} style={styles.timeArrow}>
                  <Ionicons name="chevron-up" size={18} color={colors.tint} />
                </TouchableOpacity>
                <Text style={[styles.timeValue, { color: colors.text }]}>{String(pickerMinute).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setPickerMinute((m) => (m - 5 + 60) % 60)} style={styles.timeArrow}>
                  <Ionicons name="chevron-down" size={18} color={colors.tint} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => commitReminder(item)} style={[styles.reminderSetButton, { backgroundColor: colors.tint }]}>
                <Text style={{ color: scheme === 'dark' ? '#151718' : '#fff', fontWeight: '700', fontSize: 13 }}>Set</Text>
              </TouchableOpacity>
              {item.reminder_time && (
                <TouchableOpacity onPress={() => removeReminder(item)} style={styles.reminderRemoveButton}>
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flexFill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: colors.text }]}>
            {selectMode ? `${selectedIds.size} selected` : 'Tasks'}
          </Text>

          <View style={styles.headerActions}>
            {!selectMode && tasks.length > 0 && (
              <TouchableOpacity
                onPress={() => (searchMode ? exitSearchMode() : setSearchMode(true))}
                style={styles.iconButton}
              >
                <Ionicons name={searchMode ? 'close' : 'search'} size={22} color={colors.text} />
              </TouchableOpacity>
            )}

            {!searchMode && tasks.length > 0 && (
              <TouchableOpacity onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))}>
                <Text style={[styles.selectToggle, { color: colors.tint }]}>
                  {selectMode ? 'Cancel' : 'Select'}
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
                  { backgroundColor: scheme === 'dark' ? '#2a2c2e' : '#eee' },
                ]}
              >
                <Animated.View
                  style={[styles.progressFill, { width: progressBarWidth, backgroundColor: progressBarColor }]}
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
              { backgroundColor: scheme === 'dark' ? '#1f2123' : '#f2f2f2', color: colors.text },
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
          <TouchableOpacity onPress={handleSelectAllToggle} style={styles.selectAllRow}>
            <Ionicons name={allSelected ? 'checkbox' : 'square-outline'} size={20} color={colors.tint} />
            <Text style={[styles.selectAllText, { color: colors.tint }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
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
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              {searchQuery.trim() ? `No tasks match "${searchQuery.trim()}"` : 'No tasks yet — add one below 👇'}
            </Text>
          }
        />
      </View>

      {selectMode ? (
        <View style={[styles.bulkBar, { borderTopColor: scheme === 'dark' ? '#2a2c2e' : '#eee', backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={handleBulkComplete}
            disabled={selectedIds.size === 0}
            style={[styles.bulkButton, { backgroundColor: colors.tint, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
          >
            <Ionicons name="checkmark-done" size={18} color={scheme === 'dark' ? '#151718' : '#fff'} />
            <Text style={[styles.bulkButtonText, { color: scheme === 'dark' ? '#151718' : '#fff' }]}>Complete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBulkDelete}
            disabled={selectedIds.size === 0}
            style={[styles.bulkButton, { backgroundColor: '#ef4444', opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={[styles.bulkButtonText, { color: '#fff' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.inputRow, { borderTopColor: scheme === 'dark' ? '#2a2c2e' : '#eee', backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: scheme === 'dark' ? '#1f2123' : '#f2f2f2', color: colors.text }]}
            placeholder="Add a task..."
            placeholderTextColor={colors.icon}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAdd} style={[styles.addButton, { backgroundColor: colors.tint }]}>
            <Ionicons name="add" size={24} color={scheme === 'dark' ? '#151718' : '#fff'} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  header: { fontSize: 28, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconButton: { padding: 2 },
  selectToggle: { fontSize: 16, fontWeight: '600' },
  searchInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  progressSection: { marginBottom: 12 },
  progressTrack: { marginBottom: 6 },
  progressTrackBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 13, fontWeight: '500' },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 4 },
  selectAllText: { fontSize: 15, fontWeight: '500' },
  taskWrapper: { borderBottomWidth: 1 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  checkbox: { padding: 2 },
  taskTitleTouchable: { flex: 1 },
  taskTitle: { flex: 1, fontSize: 16 },
  taskCompleted: { textDecorationLine: 'line-through', opacity: 0.5 },
  editInput: { borderBottomWidth: 1, paddingVertical: 2 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 12 : 20, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  addButton: { borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bulkBar: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 12 : 20, borderTopWidth: 1 },
  bulkButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 12 },
  bulkButtonText: { fontSize: 15, fontWeight: '600' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  timePickerCol: { alignItems: 'center', gap: 2 },
  timeArrow: { padding: 2 },
  timeValue: { fontSize: 18, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  timeSep: { fontSize: 18, fontWeight: '700' },
  reminderSetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  reminderRemoveButton: { padding: 4, marginLeft: 4 },
});
