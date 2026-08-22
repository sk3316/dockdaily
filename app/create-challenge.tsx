import { useAppTheme } from "@/hooks/use-app-theme";
import { useChallengeStore } from "@/store/useChallengeStore";
import { useFriendsStore } from "@/store/useFriendsStore";
import { useHabitStore } from "@/store/useHabitStore";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateChallengeScreen() {
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";

  const { habits } = useHabitStore();
  const { friends } = useFriendsStore();
  const { createChallenge } = useChallengeStore();

  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"formal" | "informal">("informal");
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [requiresProof, setRequiresProof] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set(),
  );
  const [creating, setCreating] = useState(false);

  const handleSelectHabit = (habitId: string, habitTitle: string) => {
    setSelectedHabitId(habitId);
    if (!title.trim()) {
      setTitle(habitTitle);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!selectedHabitId) {
      Alert.alert(
        "Pick a habit",
        "Choose which of your habits this challenge is about.",
      );
      return;
    }
    if (!title.trim()) {
      Alert.alert("Add a title", "Give your challenge a name.");
      return;
    }
    if (selectedFriendIds.size === 0) {
      Alert.alert("Invite someone", "Pick at least one friend to challenge.");
      return;
    }

    setCreating(true);
    const result = await createChallenge({
      title: title.trim(),
      mode,
      endDate: mode === "formal" ? format(endDate, "yyyy-MM-dd") : null,
      requiresProof,
      myHabitId: selectedHabitId,
      friendIds: Array.from(selectedFriendIds),
    });
    setCreating(false);

    if (result.success) {
      Alert.alert("Challenge created! 🎉", "Your friends have been invited.");
      router.back();
    } else {
      Alert.alert("Error", result.error ?? "Failed to create challenge");
    }
  };

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          New Challenge
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.label, { color: colors.text }]}>Which habit?</Text>
        <View style={styles.chipRow}>
          {habits.map((h) => (
            <TouchableOpacity
              key={h.id}
              onPress={() => handleSelectHabit(h.id, h.title)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedHabitId === h.id ? colors.tint : cardBg,
                  borderColor,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedHabitId === h.id
                      ? scheme === "dark"
                        ? "#151718"
                        : "#fff"
                      : colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {h.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>
          Challenge title
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: cardBg, color: colors.text, borderColor },
          ]}
          placeholder="e.g. 30-Day Water Challenge"
          placeholderTextColor={colors.icon}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>
          Mode
        </Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            onPress={() => setMode("informal")}
            style={[
              styles.chip,
              {
                backgroundColor: mode === "informal" ? colors.tint : cardBg,
                borderColor,
              },
            ]}
          >
            <Text
              style={{
                color:
                  mode === "informal"
                    ? scheme === "dark"
                      ? "#151718"
                      : "#fff"
                    : colors.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              Ongoing rivalry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("formal")}
            style={[
              styles.chip,
              {
                backgroundColor: mode === "formal" ? colors.tint : cardBg,
                borderColor,
              },
            ]}
          >
            <Text
              style={{
                color:
                  mode === "formal"
                    ? scheme === "dark"
                      ? "#151718"
                      : "#fff"
                    : colors.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              Formal, time-boxed
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "formal" && (
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.row,
              { backgroundColor: cardBg, borderColor, marginTop: 12 },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.tint} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Ends</Text>
            <Text style={[styles.rowValue, { color: colors.tint }]}>
              {format(endDate, "MMM d, yyyy")}
            </Text>
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.row,
            { backgroundColor: cardBg, borderColor, marginTop: 20 },
          ]}
        >
          <Ionicons name="camera-outline" size={18} color={colors.tint} />
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Require photo proof
          </Text>
          <TouchableOpacity
            onPress={() => setRequiresProof((v) => !v)}
            style={[
              styles.toggle,
              { backgroundColor: requiresProof ? colors.tint : borderColor },
            ]}
          >
            <View
              style={[
                styles.toggleKnob,
                { transform: [{ translateX: requiresProof ? 18 : 2 }] },
              ]}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>
          Invite friends{" "}
          {selectedFriendIds.size > 0
            ? `(${selectedFriendIds.size} selected)`
            : ""}
        </Text>
        {friends.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No friends yet — add some from the Friends screen first.
          </Text>
        ) : (
          friends.map((f) => {
            const selected = selectedFriendIds.has(f.friendId);
            return (
              <TouchableOpacity
                key={f.friendId}
                onPress={() => toggleFriend(f.friendId)}
                style={[styles.friendRow, { borderBottomColor: borderColor }]}
              >
                <Ionicons
                  name={selected ? "checkbox" : "square-outline"}
                  size={22}
                  color={selected ? colors.tint : colors.icon}
                />
                <Text style={[styles.friendName, { color: colors.text }]}>
                  {f.displayName}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          onPress={handleCreate}
          disabled={creating}
          style={[
            styles.createButton,
            { backgroundColor: colors.tint, opacity: creating ? 0.6 : 1 },
          ]}
        >
          {creating ? (
            <ActivityIndicator color={scheme === "dark" ? "#151718" : "#fff"} />
          ) : (
            <Text
              style={{
                color: scheme === "dark" ? "#151718" : "#fff",
                fontWeight: "700",
                fontSize: 16,
              }}
            >
              Create challenge
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === "set" && date) setEndDate(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40 },
  topBarTitle: { fontSize: 18, fontWeight: "700" },
  container: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  rowValue: { fontSize: 14, fontWeight: "700" },
  toggle: { width: 42, height: 24, borderRadius: 12, justifyContent: "center" },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  emptyText: { fontSize: 13, fontStyle: "italic" },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  friendName: { fontSize: 15, fontWeight: "500" },
  createButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
});
