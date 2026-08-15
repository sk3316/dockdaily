import { useAppTheme } from "@/hooks/use-app-theme";
import { useChatStore } from "@/store/useChatStore";
import { useHabitStore } from "@/store/useHabitStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SUGGESTED_QUESTIONS = [
  "What should I tackle first today?",
  "Which habit do I struggle with most?",
  "Any habits I should add based on my tasks?",
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function AskHabitsSheet({ visible, onClose }: Props) {
  const { scheme, colors } = useAppTheme();
  const { messages, loading, error, sendMessage, clearChat } = useChatStore();
  const { habits, allLogs } = useHabitStore();
  const { tasks } = useTaskStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";

  const handleSend = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text, habits, allLogs, tasks);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleClose = () => {
    clearChat();
    setInput("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.sheet, { backgroundColor: colors.background }]}
        behavior="padding"
      >
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={20} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Ask about your habits
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={40}
                color={colors.icon}
              />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                Ask anything about your habits and tasks
              </Text>
              <View style={styles.suggestedRow}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => handleSend(q)}
                    style={[
                      styles.suggestedChip,
                      { backgroundColor: cardBg, borderColor },
                    ]}
                  >
                    <Text
                      style={[styles.suggestedChipText, { color: colors.text }]}
                    >
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? [styles.userBubble, { backgroundColor: colors.tint }]
                  : [
                      styles.assistantBubble,
                      { backgroundColor: cardBg, borderColor },
                    ],
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  {
                    color:
                      msg.role === "user"
                        ? scheme === "dark"
                          ? "#151718"
                          : "#fff"
                        : colors.text,
                  },
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View
              style={[
                styles.assistantBubble,
                { backgroundColor: cardBg, borderColor },
              ]}
            >
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          )}

          {error && (
            <Text style={[styles.errorText, { color: "#ef4444" }]}>
              {error}
            </Text>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputRow,
            {
              borderTopColor: borderColor,
              paddingBottom: Math.max(12, insets.bottom + 8),
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: cardBg, color: colors.text },
            ]}
            placeholder="Ask a question..."
            placeholderTextColor={colors.icon}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.tint,
                opacity: !input.trim() || loading ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={scheme === "dark" ? "#151718" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  messagesContainer: { padding: 16, gap: 12, flexGrow: 1 },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
  suggestedRow: { gap: 8, marginTop: 8, width: "100%" },
  suggestedChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestedChipText: { fontSize: 13, fontWeight: "500" },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  errorText: { fontSize: 13, textAlign: "center", fontStyle: "italic" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
