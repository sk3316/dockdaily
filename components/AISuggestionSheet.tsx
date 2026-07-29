import { useAppTheme } from '@/hooks/use-app-theme';
import { useAIStore } from '@/store/useAIStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useTaskStore } from '@/store/useTaskStore';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AISuggestionSheet() {
  const { suggestions, loading, error, sheetVisible, triggerHabit, dismissSheet } = useAIStore();
  const { addTask } = useTaskStore();
  const { addHabit } = useHabitStore();
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === 'dark' ? '#2a2c2e' : '#eee';
  const cardBg = scheme === 'dark' ? '#1f2123' : '#f8f8f8';

  const [acceptedHabits, setAcceptedHabits] = useState<Set<number>>(new Set());
  const [acceptedTasks, setAcceptedTasks] = useState<Set<number>>(new Set());

  const handleAcceptHabit = async (index: number) => {
    const habit = suggestions?.habits[index];
    if (!habit) return;
    await addHabit(habit.title, habit.type, habit.target);
    setAcceptedHabits((prev) => new Set([...prev, index]));
  };

  const handleAcceptTask = async (index: number) => {
    const task = suggestions?.tasks[index];
    if (!task) return;
    await addTask(task.title);
    setAcceptedTasks((prev) => new Set([...prev, index]));
  };

  const handleClose = () => {
    setAcceptedHabits(new Set());
    setAcceptedTasks(new Set());
    dismissSheet();
  };

  return (
    <Modal
      visible={sheetVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={20} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              AI Suggestions
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {triggerHabit && (
          <Text style={[styles.subheader, { color: colors.icon }]}>
            Based on &quot;{triggerHabit.title}&quot;
          </Text>
        )}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.icon }]}>
                Getting personalized suggestions...
              </Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            </View>
          )}

          {suggestions && !loading && (
            <>
              {suggestions.insight && (
                <View style={[styles.insightCard, { backgroundColor: scheme === 'dark' ? '#1a2a1a' : '#f0fdf4', borderColor: '#22c55e' }]}>
                  <Ionicons name="bulb-outline" size={16} color="#22c55e" />
                  <Text style={[styles.insightText, { color: scheme === 'dark' ? '#86efac' : '#166534' }]}>
                    {suggestions.insight}
                  </Text>
                </View>
              )}

              {suggestions.habits.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    💪 Supporting habits
                  </Text>
                  {suggestions.habits.map((habit, i) => (
                    <View key={i} style={[styles.suggestionCard, { backgroundColor: cardBg, borderColor }]}>
                      <View style={styles.suggestionInfo}>
                        <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                          {habit.title}
                        </Text>
                        <Text style={[styles.suggestionReason, { color: colors.icon }]}>
                          {habit.reason}
                        </Text>
                        <Text style={[styles.suggestionMeta, { color: colors.tint }]}>
                          {habit.type === 'boolean' ? 'Yes/No' : habit.type === 'count' ? `Count · ${habit.target}x` : `${habit.target} min`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleAcceptHabit(i)}
                        disabled={acceptedHabits.has(i)}
                        style={[
                          styles.acceptButton,
                          {
                            backgroundColor: acceptedHabits.has(i) ? '#22c55e' : colors.tint,
                            opacity: acceptedHabits.has(i) ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={acceptedHabits.has(i) ? 'checkmark' : 'add'}
                          size={18}
                          color={scheme === 'dark' ? '#151718' : '#fff'}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {suggestions.tasks.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    📋 Setup tasks
                  </Text>
                  {suggestions.tasks.map((task, i) => (
                    <View key={i} style={[styles.suggestionCard, { backgroundColor: cardBg, borderColor }]}>
                      <View style={styles.suggestionInfo}>
                        <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                          {task.title}
                        </Text>
                        <Text style={[styles.suggestionReason, { color: colors.icon }]}>
                          {task.reason}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleAcceptTask(i)}
                        disabled={acceptedTasks.has(i)}
                        style={[
                          styles.acceptButton,
                          {
                            backgroundColor: acceptedTasks.has(i) ? '#22c55e' : colors.tint,
                            opacity: acceptedTasks.has(i) ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={acceptedTasks.has(i) ? 'checkmark' : 'add'}
                          size={18}
                          color={scheme === 'dark' ? '#151718' : '#fff'}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity
                onPress={handleClose}
                style={[styles.doneButton, { backgroundColor: colors.tint }]}
              >
                <Text style={[styles.doneButtonText, { color: scheme === 'dark' ? '#151718' : '#fff' }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  subheader: { fontSize: 13, paddingHorizontal: 16, paddingTop: 10 },
  content: { padding: 16, paddingBottom: 48 },
  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 16 },
  loadingText: { fontSize: 15 },
  errorContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  errorText: { fontSize: 15, textAlign: 'center' },
  insightCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  insightText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  suggestionInfo: { flex: 1, gap: 3 },
  suggestionTitle: { fontSize: 15, fontWeight: '600' },
  suggestionReason: { fontSize: 12, lineHeight: 16 },
  suggestionMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: { fontSize: 16, fontWeight: '700' },
});