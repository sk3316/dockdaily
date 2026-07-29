import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRescueStore } from "@/store/useRescueStore";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function HabitRescueCard() {
  const { items, dismiss } = useRescueStore();
  const { scheme, colors } = useAppTheme();

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View
          key={item.habitId}
          style={[
            styles.card,
            {
              backgroundColor: scheme === "dark" ? "#2a1f0f" : "#fff7ed",
              borderColor: "#f97316",
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="refresh-circle" size={20} color="#f97316" />
              <Text style={[styles.title, { color: colors.text }]}>
                {item.habitTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={() => dismiss(item.habitId)}>
              <Ionicons name="close" size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.message, { color: colors.text }]}>
            {item.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginBottom: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 14, fontWeight: "700" },
  message: { fontSize: 14, lineHeight: 20 },
});
