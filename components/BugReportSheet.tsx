import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore } from "@/store/useAuthStore";

type Category = "bug" | "feature" | "other";

const CATEGORIES: {
  key: Category;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "bug", label: "Bug", icon: "bug-outline" },
  { key: "feature", label: "Feature idea", icon: "bulb-outline" },
  { key: "other", label: "Other", icon: "chatbubble-outline" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function BugReportSheet({ visible, onClose }: Props) {
  const { scheme, colors } = useAppTheme();
  const { user, profile } = useAuthStore();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";

  const [category, setCategory] = useState<Category>("bug");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetAndClose = () => {
    setCategory("bug");
    setDescription("");
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;

    setSubmitting(true);

    try {
      const categoryLabel =
        CATEGORIES.find((c) => c.key === category)?.label ?? "Other";
      const displayName =
        profile?.display_name ?? user?.user_metadata?.full_name ?? "Anonymous";

      // Attach useful context as tags so it's visible in the Sentry dashboard
      Sentry.setTag("feedback_category", category);
      Sentry.setTag(
        "app_version",
        Application.nativeApplicationVersion ?? "unknown",
      );

      // Capture a lightweight event so the feedback has something to associate with
      const eventId = Sentry.captureMessage(
        `[${categoryLabel}] User feedback submitted`,
      );

      Sentry.captureFeedback({
        name: displayName,
        email: user?.email ?? "not-provided@dockdaily.app",
        message: `[${categoryLabel}]\n\n${description.trim()}`,
        associatedEventId: eventId,
      });

      setSubmitted(true);
      setTimeout(() => {
        resetAndClose();
      }, 1800);
    } catch (err) {
      console.error("[BugReport] Failed to submit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={[styles.sheet, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="bug-outline" size={20} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Report a bug
            </Text>
          </View>
          <TouchableOpacity onPress={resetAndClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {submitted ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Thanks for the feedback!
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.icon }]}>
              {"We'll look into it."}
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={[styles.label, { color: colors.text }]}>
              {"What's this about?"}
            </Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        category === c.key ? colors.tint : cardBg,
                      borderColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={c.icon}
                    size={16}
                    color={
                      category === c.key
                        ? scheme === "dark"
                          ? "#151718"
                          : "#fff"
                        : colors.text
                    }
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color:
                        category === c.key
                          ? scheme === "dark"
                            ? "#151718"
                            : "#fff"
                          : colors.text,
                    }}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>
              Tell us more
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: cardBg, color: colors.text, borderColor },
              ]}
              placeholder="What happened? What did you expect to happen?"
              placeholderTextColor={colors.icon}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!description.trim() || submitting}
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.tint,
                  opacity: !description.trim() || submitting ? 0.5 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator
                  color={scheme === "dark" ? "#151718" : "#fff"}
                />
              ) : (
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: scheme === "dark" ? "#151718" : "#fff" },
                  ]}
                >
                  Submit feedback
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 16, flex: 1 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 140,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonText: { fontSize: 16, fontWeight: "700" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successTitle: { fontSize: 18, fontWeight: "700" },
  successSubtitle: { fontSize: 14 },
});
