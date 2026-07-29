import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Image,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useHabitStore } from '@/store/useHabitStore';
import { calculateStreak, calculateLongestStreak } from '@/utils/streak';
import { useMemo, useState } from 'react';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePreferenceStore } from '@/store/usePreferenceStore';
import { useSyncStore } from '@/store/useSyncStore';
import BugReportSheet from '@/components/BugReportSheet';

export default function ProfileScreen() {
  const { user, profile, session, signInWithGoogle, signOut, deleteAccount } = useAuthStore();
  const { tasks } = useTaskStore();
  const { habits, allLogs } = useHabitStore();
//   const scheme = useColorScheme();
//   const colors = Colors[scheme ?? 'light'];
const { scheme, colors } = useAppTheme();
  const cardBg = scheme === 'dark' ? '#1f2123' : '#f2f2f2';
  const borderColor = scheme === 'dark' ? '#2a2c2e' : '#eee';

  const tasksCompleted = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);

  const longestStreak = useMemo(() => {
    let max = 0;
    for (const h of habits) {
      const s = calculateLongestStreak(allLogs, h.id);
      if (s > max) max = s;
    }
    return max;
  }, [habits, allLogs]);

  const activeStreaks = useMemo(
    () => habits.filter((h) => calculateStreak(allLogs, h.id) > 0).length,
    [habits, allLogs]
  );

  const displayName = profile?.display_name ?? user?.user_metadata?.full_name ?? 'You';
  const initials = displayName
    .split(' ')
    .filter((n: string) => n.length > 0)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleExport = async () => {
    try {
      const data = {
        exported_at: new Date().toISOString(),
        tasks: tasks.map(({ id, title, notes, due_date, priority, completed, completed_at, created_at }) => ({
          id, title, notes, due_date, priority, completed, completed_at, created_at
        })),
        habits: habits.map(({ id, title, type, target, frequency, created_at }) => ({
          id, title, type, target, frequency, created_at
        })),
      };

      await Share.share({
        message: JSON.stringify(data, null, 2),
        title: 'DockDaily Export',
      });
    } catch (error) {
      // User cancelled or sharing unavailable — silently ignore
      console.log('[Export] Share cancelled or failed:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your tasks, habits, and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Error', error);
            }
          },
        },
      ]
    );
  };

  const { theme, setTheme, notificationsEnabled, setNotificationsEnabled, reminderTime, setReminderTime } =
    usePreferenceStore();
  const { syncing, lastSynced, lastError, syncAll } = useSyncStore();

  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerHour, setPickerHour] = useState(
    parseInt(reminderTime.split(':')[0], 10)
  );
  const [pickerMinute, setPickerMinute] = useState(
    parseInt(reminderTime.split(':')[1], 10)
  );
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [bugReportVisible, setBugReportVisible] = useState(false);

  const commitTime = async () => {
    const formatted = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    await setReminderTime(formatted);
    setTimePickerOpen(false);
  };

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHandle]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />
      </View>

      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          {session && profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatarBubble, { backgroundColor: colors.tint }]}>
              <Text style={[styles.avatarInitials, { color: scheme === 'dark' ? '#151718' : '#fff' }]}>
                {session ? initials : '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.displayName, { color: colors.text }]}>
            {session ? displayName : 'Guest'}
          </Text>
          {user?.email && (
            <Text style={[styles.email, { color: colors.icon }]}>{user.email}</Text>
          )}
        </View>

        {!session && (
          <TouchableOpacity
            onPress={signInWithGoogle}
            style={[styles.googleButton, { borderColor }]}
          >
            <Ionicons name="logo-google" size={20} color={colors.text} />
            <Text style={[styles.googleButtonText, { color: colors.text }]}>
              Sign in with Google
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Ionicons name="checkmark-done" size={20} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>{tasksCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Tasks done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Ionicons name="flame" size={20} color="#f97316" />
            <Text style={[styles.statValue, { color: colors.text }]}>{longestStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Best streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Ionicons name="trending-up" size={20} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>{activeStreaks}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Active streaks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Ionicons name="list" size={20} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text }]}>{habits.length}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Habits tracked</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
<View style={[styles.section, { borderColor }]}>
  <View style={styles.menuRow}>
    <Ionicons name="color-palette-outline" size={20} color={colors.tint} />
    <Text style={[styles.menuLabel, { color: colors.text }]}>Theme</Text>
    <View style={styles.themeChips}>
      {(['system', 'light', 'dark'] as const).map((t) => (
        <TouchableOpacity
          key={t}
          onPress={() => setTheme(t)}
          style={[
            styles.themeChip,
            {
              backgroundColor: theme === t ? colors.tint : 'transparent',
              borderColor,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme === t
                ? (scheme === 'dark' ? '#151718' : '#fff')
                : colors.text,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>

  <View style={[styles.divider, { backgroundColor: borderColor }]} />

  <View style={styles.menuRow}>
    <Ionicons name="notifications-outline" size={20} color={colors.tint} />
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, { color: colors.text, flex: 0 }]}>
        Daily reminder
      </Text>
      {permissionDenied && (
        <TouchableOpacity onPress={() => Linking.openSettings()}>
          <Text style={styles.permissionDeniedText}>
            Permission denied — tap to open Settings
          </Text>
        </TouchableOpacity>
      )}
    </View>
    <TouchableOpacity
      onPress={async () => {
        if (notificationsEnabled) {
          setPermissionDenied(false);
          await setNotificationsEnabled(false);
        } else {
          // Attempt to enable — store handles permission request
          // Check if it got denied by seeing if store reverted to false
          await setNotificationsEnabled(true);
          const stillOff = !usePreferenceStore.getState().notificationsEnabled;
          if (stillOff) setPermissionDenied(true);
          else setPermissionDenied(false);
        }
      }}
      style={[
        styles.toggle,
        { backgroundColor: notificationsEnabled ? colors.tint : borderColor },
      ]}
    >
      <View
        style={[
          styles.toggleKnob,
          { transform: [{ translateX: notificationsEnabled ? 18 : 2 }] },
        ]}
      />
    </TouchableOpacity>
  </View>

  {notificationsEnabled && (
    <>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => setTimePickerOpen((v) => !v)}
      >
        <Ionicons name="time-outline" size={20} color={colors.tint} />
        <Text style={[styles.menuLabel, { color: colors.text }]}>
          Reminder time
        </Text>
        <Text style={[styles.reminderTime, { color: colors.tint }]}>
          {reminderTime}
        </Text>
        <Ionicons
          name={timePickerOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.icon}
        />
      </TouchableOpacity>

      {timePickerOpen && (
        <View style={[styles.timePicker, { borderTopColor: borderColor }]}>
          <View style={styles.timePickerCol}>
            <TouchableOpacity
              onPress={() => setPickerHour((h) => (h + 1) % 24)}
              style={styles.timeArrow}
            >
              <Ionicons name="chevron-up" size={20} color={colors.tint} />
            </TouchableOpacity>
            <Text style={[styles.timeValue, { color: colors.text }]}>
              {String(pickerHour).padStart(2, '0')}
            </Text>
            <TouchableOpacity
              onPress={() => setPickerHour((h) => (h - 1 + 24) % 24)}
              style={styles.timeArrow}
            >
              <Ionicons name="chevron-down" size={20} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.timeSep, { color: colors.text }]}>:</Text>

          <View style={styles.timePickerCol}>
            <TouchableOpacity
              onPress={() => setPickerMinute((m) => (m + 5) % 60)}
              style={styles.timeArrow}
            >
              <Ionicons name="chevron-up" size={20} color={colors.tint} />
            </TouchableOpacity>
            <Text style={[styles.timeValue, { color: colors.text }]}>
              {String(pickerMinute).padStart(2, '0')}
            </Text>
            <TouchableOpacity
              onPress={() => setPickerMinute((m) => (m - 5 + 60) % 60)}
              style={styles.timeArrow}
            >
              <Ionicons name="chevron-down" size={20} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={commitTime}
            style={[styles.timeConfirm, { backgroundColor: colors.tint }]}
          >
            <Text style={{ color: scheme === 'dark' ? '#151718' : '#fff', fontWeight: '700' }}>
              Set
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  )}
</View>

{session && (
  <>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>Sync</Text>
    <View style={[styles.section, { borderColor }]}>
      <TouchableOpacity style={styles.menuRow} onPress={syncAll} disabled={syncing}>
        <Ionicons
          name={syncing ? 'sync' : 'cloud-upload-outline'}
          size={20}
          color={colors.tint}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuLabel, { color: colors.text }]}>
            {syncing ? 'Syncing...' : 'Sync now'}
          </Text>
          {lastSynced && (
            <Text style={[styles.syncSubtext, { color: colors.icon }]}>
              Last synced {new Date(lastSynced).toLocaleTimeString()}
            </Text>
          )}
          {lastError && (
            <Text style={[styles.syncSubtext, { color: '#ef4444' }]}>
              Sync error: {lastError}
            </Text>
          )}
        </View>
        {!syncing && <Ionicons name="chevron-forward" size={16} color={colors.icon} />}
      </TouchableOpacity>
    </View>
  </>
)}




        <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        <View style={[styles.section, { borderColor }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setBugReportVisible(true)}
          >
            <Ionicons name="bug-outline" size={20} color={colors.tint} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Report a bug</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.icon} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <View style={[styles.section, { borderColor }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/about' as any)}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.tint} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Privacy & data</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push({ pathname: '/about', params: { scrollToBottom: 'true' } } as any)}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.tint} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>About DockDaily</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.icon} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { borderColor }]}>
          <TouchableOpacity style={styles.menuRow} onPress={handleExport}>
            <Ionicons name="download-outline" size={20} color={colors.tint} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Export my data</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          {session ? (
            <TouchableOpacity style={styles.menuRow} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuLabel, { color: '#ef4444' }]}>Sign out</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.icon} />
            </TouchableOpacity>
          ) : (
            <View style={styles.menuRow}>
              <Ionicons name="information-circle-outline" size={20} color={colors.icon} />
              <Text style={[styles.menuLabel, { color: colors.icon }]}>
                Sign in to sync across devices
              </Text>
            </View>
          )}

          {session && (
            <>
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <TouchableOpacity style={styles.menuRow} onPress={handleDeleteAccount}>
                <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
                <Text style={[styles.menuLabel, { color: '#ef4444' }]}>
                  Delete account
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.icon} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={() => router.push('/about' as any)}>
          <Text style={[styles.version, { color: colors.icon }]}>DockDaily v1.0.0 · Privacy & About</Text>
        </TouchableOpacity>
      </ScrollView>

      <BugReportSheet
        visible={bugReportVisible}
        onClose={() => setBugReportVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  modalHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarTitle: { fontSize: 18, fontWeight: '700' },
  container: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  avatarInitials: { fontSize: 28, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 24,
  },
  googleButtonText: { fontSize: 15, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '47%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  section: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  permissionDeniedText: {
    fontSize: 12,
    color: '#f97316',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: { height: 1, marginHorizontal: 16 },
  version: { textAlign: 'center', fontSize: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 20, marginLeft: 4 },
  themeChips: { flexDirection: 'row', gap: 6 },
  themeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  toggle: { width: 42, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  reminderTime: { fontSize: 15, fontWeight: '600' },
  syncSubtext: { fontSize: 12, marginTop: 2 },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  timePickerCol: { alignItems: 'center', gap: 8 },
  timeArrow: { padding: 4 },
  timeValue: { fontSize: 28, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  timeSep: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  timeConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
});