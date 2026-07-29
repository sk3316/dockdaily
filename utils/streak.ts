import { HabitLog } from '@/types';
import { format, subDays } from 'date-fns';

// Local-timezone-safe "today" string (YYYY-MM-DD). Using this instead of
// `new Date().toISOString().split('T')[0]` matters because toISOString()
// converts to UTC first — for timezones ahead of UTC (e.g. IST, UTC+5:30)
// that silently misattributes anything logged between local midnight and
// ~5:30am to the previous day.
export function getLocalDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

// Converts a stored "YYYY-MM-DD" string back into a Date at local midnight.
// Plain `new Date('YYYY-MM-DD')` parses as UTC midnight per the JS spec,
// which can roll back a day in negative-offset timezones — this avoids that.
export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getLastNDays(n: number, baseDate: Date = new Date()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(getLocalDateString(subDays(baseDate, i)));
  }
  return days;
}

export function calculateStreak(allLogs: HabitLog[], habitId: string): number {
  const completedDates = new Set(
    allLogs.filter((l) => l.habit_id === habitId && l.completed).map((l) => l.date)
  );

  let checkDate = new Date();
  const todayKey = getLocalDateString(checkDate);

  if (!completedDates.has(todayKey)) {
    checkDate = subDays(checkDate, 1);
  }

  let streak = 0;
  while (completedDates.has(getLocalDateString(checkDate))) {
    streak++;
    checkDate = subDays(checkDate, 1);
  }

  return streak;
}

export function calculateLongestStreak(allLogs: HabitLog[], habitId: string): number {
  const completedDates = Array.from(
    new Set(allLogs.filter((l) => l.habit_id === habitId && l.completed).map((l) => l.date))
  ).sort();

  if (completedDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < completedDates.length; i++) {
    const diffDays = Math.round(
      (parseLocalDateString(completedDates[i]).getTime() -
        parseLocalDateString(completedDates[i - 1]).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}