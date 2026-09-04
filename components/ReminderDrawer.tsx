import { useAppTheme } from "@/hooks/use-app-theme";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { HabitReminderConfig, HabitReminderMode } from "@/types";
import { generateIntervalSlots } from "@/utils/notifications";

type Props = {
  visible: boolean;
  onClose: () => void;
  itemTitle: string;
  itemType: "habit" | "task";
  currentTime?: string | null; // HH:MM
  currentDate?: string | null; // YYYY-MM-DD
  currentConfig?: HabitReminderConfig | string | null;
  onSave: (
    time: string,
    date: string | null,
    config?: HabitReminderConfig
  ) => void;
  onRemove: () => void;
};

const INTERVAL_OPTIONS = [
  { label: "1 hr", minutes: 60 },
  { label: "1.5 hrs", minutes: 90 },
  { label: "2 hrs", minutes: 120 },
  { label: "3 hrs", minutes: 180 },
  { label: "4 hrs", minutes: 240 },
];

function parseReminderDate(currentDate?: string | null, isHabit = false): Date {
  if (currentDate) {
    const [y, m, d] = currentDate.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const parsed = new Date(y, m - 1, d, 0, 0, 0);
      if (isHabit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsed < today) {
          return today;
        }
      }
      return parsed;
    }
  }
  return new Date();
}

function parseTimeString(timeStr?: string | null, defaultH = 9, defaultM = 0): Date {
  const dt = new Date();
  if (timeStr) {
    const [h, min] = timeStr.split(":").map(Number);
    if (!isNaN(h) && !isNaN(min)) {
      dt.setHours(h, min, 0, 0);
      return dt;
    }
  }
  dt.setHours(defaultH, defaultM, 0, 0);
  return dt;
}

function formatTimeSlot(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
}

export default function ReminderDrawer({
  visible,
  onClose,
  itemTitle,
  itemType,
  currentTime,
  currentDate,
  currentConfig,
  onSave,
  onRemove,
}: Props) {
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";
  const pillBg = scheme === "dark" ? "#2a2c2e" : "#ebebeb";

  // Parse initial config
  const initialConfig = useMemo<HabitReminderConfig | null>(() => {
    if (!currentConfig) return null;
    if (typeof currentConfig === "string") {
      try {
        return JSON.parse(currentConfig);
      } catch {
        return null;
      }
    }
    return currentConfig;
  }, [currentConfig]);

  const [mode, setMode] = useState<HabitReminderMode>(() => {
    if (itemType === "task") return "single";
    return initialConfig?.mode ?? "single";
  });

  const [selectedDate, setSelectedDate] = useState(() =>
    parseReminderDate(currentDate ?? initialConfig?.startDate, itemType === "habit")
  );

  // Single mode time
  const [singleTime, setSingleTime] = useState(() =>
    parseTimeString(initialConfig?.time ?? currentTime, 9, 0)
  );

  // Specific times mode state (array of "HH:MM")
  const [timesList, setTimesList] = useState<string[]>(() => {
    if (initialConfig?.times && initialConfig.times.length > 0) {
      return [...initialConfig.times];
    }
    if (currentTime) {
      return [currentTime];
    }
    return ["10:00", "14:00", "20:00"];
  });

  // Interval mode state
  const [intervalStart, setIntervalStart] = useState(() =>
    parseTimeString(initialConfig?.interval?.startTime ?? "10:00", 10, 0)
  );
  const [intervalEnd, setIntervalEnd] = useState(() =>
    parseTimeString(initialConfig?.interval?.endTime ?? "20:00", 20, 0)
  );
  const [intervalStep, setIntervalStep] = useState<number>(
    () => initialConfig?.interval?.stepMinutes ?? 120
  );

  // Date/time picker control
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    "single" | "add_slot" | "interval_start" | "interval_end" | null
  >(null);
  const [tempPickerTime, setTempPickerTime] = useState(new Date());

  // Reset when drawer becomes visible
  useEffect(() => {
    if (visible) {
      let cfg: HabitReminderConfig | null = null;
      if (currentConfig) {
        if (typeof currentConfig === "string") {
          try {
            cfg = JSON.parse(currentConfig);
          } catch {}
        } else {
          cfg = currentConfig;
        }
      }

      setMode(itemType === "task" ? "single" : cfg?.mode ?? "single");
      setSelectedDate(
        parseReminderDate(currentDate ?? cfg?.startDate, itemType === "habit")
      );
      setSingleTime(parseTimeString(cfg?.time ?? currentTime, 9, 0));

      if (cfg?.times && cfg.times.length > 0) {
        setTimesList([...cfg.times]);
      } else if (currentTime) {
        setTimesList([currentTime]);
      } else {
        setTimesList(["10:00", "14:00", "20:00"]);
      }

      setIntervalStart(
        parseTimeString(cfg?.interval?.startTime ?? "10:00", 10, 0)
      );
      setIntervalEnd(
        parseTimeString(cfg?.interval?.endTime ?? "20:00", 20, 0)
      );
      setIntervalStep(cfg?.interval?.stepMinutes ?? 120);

      setShowDatePicker(false);
      setPickerTarget(null);
    }
  }, [visible, currentTime, currentDate, currentConfig, itemType]);

  // Interval preview calculation
  const intervalSlots = useMemo(() => {
    const startStr = format(intervalStart, "HH:mm");
    const endStr = format(intervalEnd, "HH:mm");
    return generateIntervalSlots(startStr, endStr, intervalStep);
  }, [intervalStart, intervalEnd, intervalStep]);

  const handleOpenTimePicker = (
    target: "single" | "add_slot" | "interval_start" | "interval_end"
  ) => {
    if (target === "single") {
      setTempPickerTime(singleTime);
    } else if (target === "interval_start") {
      setTempPickerTime(intervalStart);
    } else if (target === "interval_end") {
      setTempPickerTime(intervalEnd);
    } else {
      setTempPickerTime(new Date());
    }
    setPickerTarget(target);
  };

  const handleTimePickerChange = (event: any, date?: Date) => {
    const target = pickerTarget;
    setPickerTarget(null);
    if (event.type !== "set" || !date || !target) return;

    if (target === "single") {
      setSingleTime(date);
    } else if (target === "interval_start") {
      setIntervalStart(date);
    } else if (target === "interval_end") {
      setIntervalEnd(date);
    } else if (target === "add_slot") {
      const timeStr = format(date, "HH:mm");
      if (!timesList.includes(timeStr)) {
        const next = [...timesList, timeStr].sort();
        setTimesList(next);
      }
    }
  };

  const handleRemoveSlot = (index: number) => {
    setTimesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (itemType === "task" || mode === "single") {
      const timeStr = format(singleTime, "HH:mm");
      const config: HabitReminderConfig = {
        mode: "single",
        time: timeStr,
        startDate: dateStr,
      };
      onSave(timeStr, dateStr, config);
    } else if (mode === "times") {
      if (timesList.length === 0) {
        const fallback = "09:00";
        const config: HabitReminderConfig = {
          mode: "times",
          times: [fallback],
          startDate: dateStr,
        };
        onSave(fallback, dateStr, config);
      } else {
        const config: HabitReminderConfig = {
          mode: "times",
          times: timesList,
          startDate: dateStr,
        };
        onSave(timesList[0], dateStr, config);
      }
    } else if (mode === "interval") {
      const startStr = format(intervalStart, "HH:mm");
      const endStr = format(intervalEnd, "HH:mm");
      const config: HabitReminderConfig = {
        mode: "interval",
        interval: {
          startTime: startStr,
          endTime: endStr,
          stepMinutes: intervalStep,
        },
        startDate: dateStr,
      };
      const primary = intervalSlots[0] || startStr;
      onSave(primary, dateStr, config);
    }

    onClose();
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  const hasExistingReminder = Boolean(currentTime || currentConfig);
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

        {/* Header */}
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

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mode Selector (Habits only) */}
          {itemType === "habit" && (
            <View style={[styles.modeSelector, { backgroundColor: cardBg, borderColor }]}>
              <TouchableOpacity
                style={[
                  styles.modeTab,
                  mode === "single" && [styles.activeModeTab, { backgroundColor: colors.tint }],
                ]}
                onPress={() => setMode("single")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    { color: mode === "single" ? (scheme === "dark" ? "#151718" : "#fff") : colors.icon },
                  ]}
                >
                  Once a day
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTab,
                  mode === "times" && [styles.activeModeTab, { backgroundColor: colors.tint }],
                ]}
                onPress={() => setMode("times")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    { color: mode === "times" ? (scheme === "dark" ? "#151718" : "#fff") : colors.icon },
                  ]}
                >
                  Custom times
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTab,
                  mode === "interval" && [styles.activeModeTab, { backgroundColor: colors.tint }],
                ]}
                onPress={() => setMode("interval")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    { color: mode === "interval" ? (scheme === "dark" ? "#151718" : "#fff") : colors.icon },
                  ]}
                >
                  Interval
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Start Date row */}
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

          {/* MODE 1: Single time (or task) */}
          {(itemType === "task" || mode === "single") && (
            <>
              <TouchableOpacity
                style={[styles.row, { backgroundColor: cardBg, borderColor }]}
                onPress={() => handleOpenTimePicker("single")}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="time-outline" size={20} color={colors.tint} />
                  <Text style={[styles.rowLabel, { color: colors.text }]}>
                    Time
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: colors.tint }]}>
                    {format(singleTime, "h:mm a")}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.icon} />
                </View>
              </TouchableOpacity>

              <Text style={[styles.hint, { color: colors.icon }]}>
                {itemType === "habit"
                  ? "This habit will remind you daily at this time."
                  : "This task will remind you on the chosen date and time."}
              </Text>
            </>
          )}

          {/* MODE 2: Specific Times */}
          {itemType === "habit" && mode === "times" && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.cardHeader}>
                <View style={styles.rowLeft}>
                  <Ionicons name="time-outline" size={20} color={colors.tint} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Daily reminder times ({timesList.length})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButtonSmall, { backgroundColor: colors.tint }]}
                  onPress={() => handleOpenTimePicker("add_slot")}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={scheme === "dark" ? "#151718" : "#fff"}
                  />
                  <Text
                    style={[
                      styles.addButtonSmallText,
                      { color: scheme === "dark" ? "#151718" : "#fff" },
                    ]}
                  >
                    Add time
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.slotsGrid}>
                {timesList.map((timeStr, index) => (
                  <View
                    key={timeStr + index}
                    style={[styles.timeChip, { backgroundColor: pillBg, borderColor }]}
                  >
                    <Text style={[styles.timeChipText, { color: colors.text }]}>
                      {formatTimeSlot(timeStr)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveSlot(index)}
                      style={styles.timeChipRemove}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {timesList.length === 0 && (
                <Text style={[styles.emptySlotsText, { color: colors.icon }]}>
                  {"Tap \"+ Add time\" to set reminder slots (e.g. 10:00 AM, 2:00 PM)"}
                </Text>
              )}

              <Text style={[styles.cardHint, { color: colors.icon }]}>
                Ideal for medication or vitamins taken at specific times throughout the day.
              </Text>
            </View>
          )}

          {/* MODE 3: Interval */}
          {itemType === "habit" && mode === "interval" && (
            <>
              {/* Active Window */}
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}>
                  Active Window
                </Text>

                <TouchableOpacity
                  style={[styles.rowInner, { borderColor }]}
                  onPress={() => handleOpenTimePicker("interval_start")}
                >
                  <Text style={[styles.rowLabel, { color: colors.text }]}>
                    Starting from
                  </Text>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color: colors.tint }]}>
                      {format(intervalStart, "h:mm a")}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.icon} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rowInner, { borderColor, borderTopWidth: 1 }]}
                  onPress={() => handleOpenTimePicker("interval_end")}
                >
                  <Text style={[styles.rowLabel, { color: colors.text }]}>
                    Until
                  </Text>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color: colors.tint }]}>
                      {format(intervalEnd, "h:mm a")}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.icon} />
                  </View>
                </TouchableOpacity>

                {/* Interval Pill Stepper */}
                <Text
                  style={[
                    styles.cardTitle,
                    { color: colors.text, marginTop: 14, marginBottom: 8 },
                  ]}
                >
                  Repeat every
                </Text>
                <View style={styles.pillsRow}>
                  {INTERVAL_OPTIONS.map((opt) => {
                    const isSelected = intervalStep === opt.minutes;
                    return (
                      <TouchableOpacity
                        key={opt.minutes}
                        style={[
                          styles.intervalPill,
                          {
                            backgroundColor: isSelected ? colors.tint : pillBg,
                            borderColor: isSelected ? colors.tint : borderColor,
                          },
                        ]}
                        onPress={() => setIntervalStep(opt.minutes)}
                      >
                        <Text
                          style={[
                            styles.intervalPillText,
                            {
                              color: isSelected
                                ? scheme === "dark"
                                  ? "#151718"
                                  : "#fff"
                                : colors.text,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Schedule Live Preview */}
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: cardBg, borderColor },
                ]}
              >
                <View style={styles.previewHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.tint} />
                  <Text style={[styles.previewTitle, { color: colors.text }]}>
                    {intervalSlots.length} reminders scheduled daily
                  </Text>
                </View>

                <View style={styles.previewSlotsRow}>
                  {intervalSlots.map((slot) => (
                    <View
                      key={slot}
                      style={[
                        styles.previewSlotBadge,
                        { backgroundColor: pillBg, borderColor },
                      ]}
                    >
                      <Text
                        style={[styles.previewSlotText, { color: colors.text }]}
                      >
                        {formatTimeSlot(slot)}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.cardHint, { color: colors.icon, marginTop: 10 }]}>
                  Never reminds during sleeping hours outside your active window.
                </Text>
              </View>
            </>
          )}

          {/* Action Buttons */}
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

          {hasExistingReminder && (
            <TouchableOpacity
              onPress={handleRemove}
              style={styles.removeButton}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={styles.removeButtonText}>Remove reminder</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Date Picker Modal */}
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

      {/* Time Picker Modal */}
      {pickerTarget !== null && (
        <DateTimePicker
          value={tempPickerTime}
          mode="time"
          display="clock"
          onChange={handleTimePickerChange}
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
  scrollArea: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  // Mode Segmented Control
  modeSelector: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  activeModeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14, fontWeight: "600" },
  hint: { fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },

  // Card
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  addButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonSmallText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Specific times chips
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timeChipRemove: {
    marginLeft: 2,
  },
  emptySlotsText: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },

  // Interval Pills
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intervalPill: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  intervalPillText: {
    fontSize: 13,
  },

  // Preview Card
  previewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  previewSlotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  previewSlotBadge: {
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  previewSlotText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Bottom Buttons
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
