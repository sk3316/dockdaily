import { useAppTheme } from "@/hooks/use-app-theme";
import { useHabitStore } from "@/store/useHabitStore";
import { Habit } from "@/types";
import {
  calculateStreak,
  getLastNDays,
  getLocalDateString,
  parseLocalDateString,
} from "@/utils/streak";
import { Ionicons } from "@expo/vector-icons";
import { format, subDays } from "date-fns";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HabitHistorySheet({ visible, onClose }: Props) {
  const { scheme, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { habits, allLogs, logHabitForDate } = useHabitStore();

  const [hintMessage, setHintMessage] = useState<string | null>(null);

  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";
  const cellBg = scheme === "dark" ? "#151718" : "#ffffff";

  // Compute 21 days window (from 20 days ago up to today)
  const todayKey = getLocalDateString();
  const yesterdayKey = useMemo(
    () => getLocalDateString(subDays(parseLocalDateString(todayKey), 1)),
    [todayKey],
  );

  const days21 = useMemo(() => {
    return getLastNDays(21, parseLocalDateString(todayKey));
  }, [todayKey]);

  // Lookup map: habitId_date -> HabitLog
  const logsMap = useMemo(() => {
    const map = new Map<string, { value: number; completed: boolean }>();
    for (const log of allLogs) {
      map.set(`${log.habit_id}_${log.date}`, {
        value: log.value,
        completed: log.completed,
      });
    }
    return map;
  }, [allLogs]);

  const handleCellPress = async (habit: Habit, dateStr: string) => {
    const isEditable = dateStr === todayKey || dateStr === yesterdayKey;

    if (!isEditable) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
      setHintMessage("Logs older than 48 hours are locked to protect streak history.");
      setTimeout(() => setHintMessage(null), 3000);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = `${habit.id}_${dateStr}`;
    const current = logsMap.get(key);
    const isCurrentlyCompleted = current?.completed ?? false;

    if (habit.type === "boolean") {
      const newValue = isCurrentlyCompleted ? 0 : habit.target;
      await logHabitForDate(habit.id, dateStr, newValue, habit.target);
    } else {
      // For count or duration, toggle between 0 and target
      const newValue = isCurrentlyCompleted ? 0 : habit.target;
      await logHabitForDate(habit.id, dateStr, newValue, habit.target);
    }
  };

  const formattedRange = useMemo(() => {
    if (days21.length === 0) return "";
    const startDate = parseLocalDateString(days21[0]);
    const endDate = parseLocalDateString(days21[days21.length - 1]);
    return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
  }, [days21]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top > 0 ? insets.top + 8 : 16,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24,
          },
        ]}
      >
        {/* Header Bar */}
        <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.titleWithBadge}>
              <Text style={[styles.title, { color: colors.text }]}>
                Habit History
              </Text>
              <View style={[styles.periodBadge, { backgroundColor: colors.tint + "20" }]}>
                <Text style={[styles.periodBadgeText, { color: colors.tint }]}>
                  21 Days
                </Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              {formattedRange}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: cardBg }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Legend / Status Info */}
        <View style={[styles.legendBar, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.tint }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>Done</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "transparent", borderColor: colors.icon, borderWidth: 1 }]} />
            <Text style={[styles.legendText, { color: colors.icon }]}>Missed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendEditPill, { borderColor: colors.tint }]}>
              <Ionicons name="pencil" size={10} color={colors.tint} />
            </View>
            <Text style={[styles.legendText, { color: colors.text }]}>
              Editable (48h)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.icon} />
            <Text style={[styles.legendText, { color: colors.icon }]}>Locked</Text>
          </View>
        </View>

        {/* Hint Banner (when tapping locked days) */}
        {hintMessage && (
          <View style={[styles.hintBanner, { backgroundColor: colors.tint + "15", borderColor: colors.tint }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.tint} />
            <Text style={[styles.hintText, { color: colors.tint }]}>
              {hintMessage}
            </Text>
          </View>
        )}

        {/* Matrix Grid */}
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Habits Yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.icon }]}>
              Create habits to track your daily progress across the last 21 days.
            </Text>
          </View>
        ) : (
          <View style={[styles.matrixContainer, { borderColor }]}>
            <ScrollView
              style={styles.flexFill}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ minWidth: "100%" }}
              >
                <View>
                  {/* Date Column Headers */}
                  <View style={[styles.tableRow, styles.headerRowBorder, { borderBottomColor: borderColor }]}>
                    {/* Sticky Habit Header Cell */}
                    <View style={[styles.habitNameCell, { backgroundColor: cardBg, borderRightColor: borderColor }]}>
                      <Text style={[styles.columnHeaderLabel, { color: colors.icon }]}>
                        HABIT
                      </Text>
                    </View>

                    {/* 21 Date Cells */}
                    {days21.map((dateStr) => {
                      const isToday = dateStr === todayKey;
                      const isYesterday = dateStr === yesterdayKey;
                      const dateObj = parseLocalDateString(dateStr);
                      const dayOfWeek = format(dateObj, "EEEEE"); // M, T, W, T, F, S, S
                      const dayNumber = format(dateObj, "d");

                      return (
                        <View
                          key={dateStr}
                          style={[
                            styles.dateHeaderCell,
                            isToday && [styles.todayCellHighlight, { borderColor: colors.tint }],
                            isYesterday && [styles.yesterdayCellHighlight, { borderColor: colors.tint + "60" }],
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayOfWeekText,
                              { color: isToday ? colors.tint : colors.icon },
                              isToday && { fontWeight: "800" },
                            ]}
                          >
                            {dayOfWeek}
                          </Text>
                          <Text
                            style={[
                              styles.dayNumberText,
                              { color: isToday ? colors.text : colors.icon },
                              isToday && { fontWeight: "800" },
                            ]}
                          >
                            {dayNumber}
                          </Text>
                          {isToday && (
                            <View style={[styles.todayBadge, { backgroundColor: colors.tint }]}>
                              <Text style={styles.todayBadgeText}>TODAY</Text>
                            </View>
                          )}
                          {isYesterday && (
                            <View style={[styles.yesterdayBadge, { backgroundColor: cardBg, borderColor }]}>
                              <Text style={[styles.yesterdayBadgeText, { color: colors.icon }]}>
                                YEST
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Habit Rows */}
                  {habits.map((habit) => {
                    const streak = calculateStreak(allLogs, habit.id);

                    return (
                      <View
                        key={habit.id}
                        style={[styles.tableRow, { borderBottomColor: borderColor }]}
                      >
                        {/* Habit Title Column */}
                        <View
                          style={[
                            styles.habitNameCell,
                            { backgroundColor: cardBg, borderRightColor: borderColor },
                          ]}
                        >
                          <View style={styles.habitTitleRow}>
                            <View
                              style={[
                                styles.habitColorChip,
                                { backgroundColor: habit.color || colors.tint },
                              ]}
                            />
                            <Text
                              style={[styles.habitTitleText, { color: colors.text }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {habit.title}
                            </Text>
                          </View>
                          <View style={styles.streakSubRow}>
                            <Ionicons
                              name="flame"
                              size={11}
                              color={streak > 0 ? "#f97316" : colors.icon}
                            />
                            <Text
                              style={[
                                styles.streakText,
                                { color: streak > 0 ? "#f97316" : colors.icon },
                              ]}
                            >
                              {streak}d
                            </Text>
                          </View>
                        </View>

                        {/* 21 Day Cells for this habit */}
                        {days21.map((dateStr) => {
                          const isToday = dateStr === todayKey;
                          const isYesterday = dateStr === yesterdayKey;
                          const isEditable = isToday || isYesterday;

                          const log = logsMap.get(`${habit.id}_${dateStr}`);
                          const completed = log?.completed ?? false;
                          const value = log?.value ?? 0;

                          return (
                            <TouchableOpacity
                              key={dateStr}
                              activeOpacity={isEditable ? 0.6 : 0.8}
                              onPress={() => handleCellPress(habit, dateStr)}
                              style={[
                                styles.gridCell,
                                isToday && [styles.todayCellHighlight, { borderColor: colors.tint + "40" }],
                                isYesterday && [styles.yesterdayCellHighlight, { borderColor: colors.tint + "25" }],
                              ]}
                            >
                              {completed ? (
                                <View
                                  style={[
                                    styles.completedDot,
                                    { backgroundColor: habit.color || colors.tint },
                                  ]}
                                >
                                  {habit.type === "boolean" ? (
                                    <Ionicons name="checkmark" size={13} color="#ffffff" />
                                  ) : (
                                    <Text style={styles.completedCountText}>
                                      {value >= habit.target ? "✓" : value}
                                    </Text>
                                  )}
                                </View>
                              ) : (
                                <View
                                  style={[
                                    styles.missedDot,
                                    {
                                      backgroundColor: cellBg,
                                      borderColor: isEditable ? colors.tint + "50" : borderColor,
                                    },
                                    isEditable && styles.editableMissedDot,
                                  ]}
                                >
                                  {!isEditable && (
                                    <Ionicons
                                      name="lock-closed"
                                      size={8}
                                      color={colors.icon + "60"}
                                    />
                                  )}
                                  {isEditable && (
                                    <View
                                      style={[
                                        styles.editableInnerDot,
                                        { backgroundColor: colors.tint + "40" },
                                      ]}
                                    />
                                  )}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  flexFill: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  headerTitleGroup: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "500",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  legendBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendEditPill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  matrixContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerRowBorder: {
    paddingVertical: 8,
  },
  habitNameCell: {
    width: 130,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    borderRightWidth: 1,
    zIndex: 2,
  },
  columnHeaderLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  habitTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  habitColorChip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  habitTitleText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  streakSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
    paddingLeft: 14,
  },
  streakText: {
    fontSize: 10,
    fontWeight: "600",
  },
  dateHeaderCell: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    marginHorizontal: 1,
  },
  dayOfWeekText: {
    fontSize: 10,
    fontWeight: "600",
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  todayCellHighlight: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderRadius: 6,
    borderWidth: 1,
  },
  yesterdayCellHighlight: {
    backgroundColor: "rgba(99, 102, 241, 0.04)",
    borderRadius: 6,
    borderWidth: 1,
  },
  todayBadge: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
  },
  todayBadgeText: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "900",
  },
  yesterdayBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
  },
  yesterdayBadgeText: {
    fontSize: 7,
    fontWeight: "700",
  },
  gridCell: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 1,
  },
  completedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
  completedCountText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  missedDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editableMissedDot: {
    borderStyle: "dashed",
    borderWidth: 1.5,
  },
  editableInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
