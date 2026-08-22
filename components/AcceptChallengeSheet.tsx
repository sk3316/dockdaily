import { useAppTheme } from "@/hooks/use-app-theme";
import { useChallengeStore } from "@/store/useChallengeStore";
import { useHabitStore } from "@/store/useHabitStore";
import { Habit } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  habits: Habit[];
  onAccepted: () => void;
};

export default function AcceptChallengeSheet({
  visible,
  onClose,
  challengeId,
  challengeTitle,
  habits,
  onAccepted,
}: Props) {
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";

  const {
    matchSuggestion,
    matching,
    suggestHabitMatch,
    clearMatchSuggestion,
    acceptChallenge,
  } = useChallengeStore();
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const { addHabit } = useHabitStore();

  useEffect(() => {
    if (visible && habits.length > 0) {
      suggestHabitMatch(
        challengeTitle,
        habits.map((h) => ({ id: h.id, title: h.title })),
      );
    }
    if (!visible) {
      clearMatchSuggestion();
      setSelectedHabitId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (matchSuggestion?.habitId) {
      setSelectedHabitId(matchSuggestion.habitId);
    }
  }, [matchSuggestion]);

  const handleConfirm = async () => {
    if (!selectedHabitId) return;
    setAccepting(true);
    await acceptChallenge(challengeId, selectedHabitId);
    setAccepting(false);
    onAccepted();
    onClose();
  };

  const handleCreateHabit = async () => {
    if (!newHabitTitle.trim()) return;
    await addHabit(newHabitTitle.trim(), 'boolean', 1);
    const updated = useHabitStore.getState().habits;
    const created = updated.find((h) => h.title === newHabitTitle.trim());
    if (created) setSelectedHabitId(created.id);
    setCreatingHabit(false);
    setNewHabitTitle('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Pick your habit
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtext, { color: colors.icon }]}>
          Which of your habits matches "{challengeTitle}"?
        </Text>

        {matching && (
          <View style={styles.matchingRow}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.matchingText, { color: colors.icon }]}>
              Finding the best match...
            </Text>
          </View>
        )}

        {matchSuggestion?.habitId && !matching && (
          <View
            style={[
              styles.suggestionBanner,
              { backgroundColor: cardBg, borderColor: colors.tint },
            ]}
          >
            <Ionicons name="sparkles" size={14} color={colors.tint} />
            <Text style={[styles.suggestionText, { color: colors.text }]}>
              {matchSuggestion.reason}
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.list}>
          {habits.map((h) => {
            const selected = selectedHabitId === h.id;
            const isSuggested = matchSuggestion?.habitId === h.id;
            return (
              <TouchableOpacity
                key={h.id}
                onPress={() => setSelectedHabitId(h.id)}
                style={[
                  styles.habitRow,
                  {
                    backgroundColor: selected ? colors.tint : cardBg,
                    borderColor,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected
                      ? scheme === "dark"
                        ? "#151718"
                        : "#fff"
                      : colors.text,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  {h.title}
                </Text>
                {isSuggested && (
                  <Ionicons
                    name="sparkles"
                    size={14}
                    color={
                      selected
                        ? scheme === "dark"
                          ? "#151718"
                          : "#fff"
                        : colors.tint
                    }
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {creatingHabit ? (
          <View style={[styles.createHabitRow, { borderColor }]}>
            <TextInput
              style={[styles.createHabitInput, { color: colors.text }]}
              placeholder="New habit name..."
              placeholderTextColor={colors.icon}
              value={newHabitTitle}
              onChangeText={setNewHabitTitle}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleCreateHabit}
              style={[styles.createHabitButton, { backgroundColor: colors.tint }]}
            >
              <Text
                style={{
                  color: scheme === "dark" ? "#151718" : "#fff",
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setCreatingHabit(true)}
            style={[
              styles.habitRow,
              { borderColor, borderStyle: "dashed", marginHorizontal: 16 },
            ]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.tint} />
            <Text style={{ color: colors.tint, fontWeight: "600", fontSize: 14 }}>
              Create new habit
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!selectedHabitId || accepting}
          style={[
            styles.confirmButton,
            {
              backgroundColor: colors.tint,
              opacity: !selectedHabitId || accepting ? 0.5 : 1,
            },
          ]}
        >
          {accepting ? (
            <ActivityIndicator color={scheme === "dark" ? "#151718" : "#fff"} />
          ) : (
            <Text
              style={{
                color: scheme === "dark" ? "#151718" : "#fff",
                fontWeight: "700",
                fontSize: 16,
              }}
            >
              Join challenge
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 12 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  subtext: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  matchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  matchingText: { fontSize: 13 },
  suggestionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: { flex: 1, fontSize: 13, lineHeight: 18 },
  list: { padding: 16, gap: 8 },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  confirmButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  createHabitRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  createHabitInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  createHabitButton: {
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
