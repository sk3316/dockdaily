import { useAppTheme } from "@/hooks/use-app-theme";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  itemTitle: string;
  itemType: "habit" | "task";
  currentTime?: string | null; // HH:MM
  currentDate?: string | null; // YYYY-MM-DD
  onSave: (time: string, date: string | null) => void;
  onRemove: () => void;
};

function parseReminderDate(currentDate?: string | null): Date {
  if (currentDate) {
    const [y, m, d] = currentDate.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d, 0, 0, 0);
    }
  }
  return new Date();
}

function parseReminderTime(currentTime?: string | null): Date {
  const dt = new Date();
  if (currentTime) {
    const [h, min] = currentTime.split(":").map(Number);
    if (!isNaN(h) && !isNaN(min)) {
      dt.setHours(h, min, 0, 0);
      return dt;
    }
  }
  dt.setHours(9, 0, 0, 0);
  return dt;
}

export default function ReminderDrawer({
  visible,
  onClose,
  itemTitle,
  itemType,
  currentTime,
  currentDate,
  onSave,
  onRemove,
}: Props) {
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";

  const [selectedDate, setSelectedDate] = useState(() =>
    parseReminderDate(currentDate)
  );
  const [selectedTime, setSelectedTime] = useState(() =>
    parseReminderTime(currentTime)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedDate(parseReminderDate(currentDate));
      setSelectedTime(parseReminderTime(currentTime));
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible, currentTime, currentDate]);

  const handleSave = () => {
    const timeStr = format(selectedTime, "HH:mm");
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    onSave(timeStr, dateStr);
    onClose();
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  const dateLabel = itemType === "habit" ? "Start date" : "Date";

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
          <View style={styles.headerLeft}>
            <Ionicons name="notifications" size={20} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {itemType === "habit" ? "Habit reminder" : "Task reminder"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text
          style={[styles.itemTitle, { color: colors.icon }]}
          numberOfLines={1}
        >
          {itemTitle}
        </Text>

        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.row, { backgroundColor: cardBg, borderColor }]}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="calendar-outline" size={20} color={colors.tint} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {dateLabel}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.tint }]}>
                {format(selectedDate, "EEE, MMM d, yyyy")}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.icon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { backgroundColor: cardBg, borderColor }]}
            onPress={() => setShowTimePicker(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="time-outline" size={20} color={colors.tint} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                Time
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.tint }]}>
                {format(selectedTime, "h:mm a")}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.icon} />
            </View>
          </TouchableOpacity>

          {itemType === "habit" && (
            <Text style={[styles.hint, { color: colors.icon }]}>
              This habit will remind you daily starting from the selected date.
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
          >
            <Text
              style={[
                styles.saveButtonText,
                { color: scheme === "dark" ? "#151718" : "#fff" },
              ]}
            >
              Set reminder
            </Text>
          </TouchableOpacity>

          {currentTime && (
            <TouchableOpacity
              onPress={handleRemove}
              style={styles.removeButton}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={styles.removeButtonText}>Remove reminder</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === "set" && date) {
              setSelectedDate(date);
            }
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="clock"
          onChange={(event, date) => {
            setShowTimePicker(false);
            if (event.type === "set" && date) {
              setSelectedTime(date);
            }
          }}
        />
      )}
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
  itemTitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 10,
    fontWeight: "500",
  },
  content: { padding: 16, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14, fontWeight: "600" },
  hint: { fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: "700" },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  removeButtonText: { fontSize: 14, fontWeight: "600", color: "#ef4444" },
});
