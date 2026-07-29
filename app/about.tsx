import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/use-app-theme';

const SECTIONS = [
  {
    title: '📋 What data we collect',
    content: `DockDaily collects only what's needed to make the app work:

- Your Google account name, email, and profile photo — used to identify your account
- Tasks and habits you create, including titles, completion status, streaks, and logs
- App preferences such as theme and notification settings (stored locally on your device)

We do not collect location data, contacts, browsing history, or any data unrelated to your tasks and habits.`,
  },
  {
    title: '☁️ How your data is stored',
    content: `Your data lives in two places:

- On your device — tasks, habits, and logs are stored locally in a SQLite database. This means the app works fully offline.

- In the cloud (when signed in) — your data is synced to Supabase, a secure PostgreSQL database hosted on AWS infrastructure. All data is encrypted in transit via HTTPS and encrypted at rest.

Your data is scoped strictly to your account using Row Level Security (RLS) — no other user can access your data.`,
  },
  {
    title: '🤖 AI suggestions',
    content: `When you use the AI habit suggestion feature, the titles of your habits and tasks are sent to Groq's API (powered by open-source LLMs like Llama 3.1) to generate suggestions.

This request is routed through a secure server-side proxy — your Groq API key is never exposed in the app.

No personally identifiable information beyond habit/task titles is sent.

You are never required to use the AI feature.`,
  },
  {
    title: '🔐 How we use your data',
    content: `Your data is used only to:

- Display your tasks, habits, and progress in the app
- Sync your data across your devices when signed in
- Generate AI suggestions when you explicitly request them

We do not sell your data. We do not share your data with third parties except:

- Supabase — for secure cloud storage and authentication
- Google — for sign-in via OAuth
- Groq — for AI habit suggestions

These services have their own privacy policies that govern how they handle data.`,
  },
  {
    title: '🗑️ Your rights',
    content: `You are in full control of your data:

- Export — download all your tasks and habits as JSON at any time from this profile screen
- Sign out — removes your session from this device
- Delete account — permanently deletes your account and all associated data from our servers

If you have questions or requests about your data, contact us at the email listed in the About section below.`,
  },
  {
    title: 'ℹ️ About DockDaily',
    content: `DockDaily is a personal habit and task tracker built to help you stay consistent with the things that matter.

Version: 1.0.0
Built with: React Native, Expo, Supabase, Groq AI (Llama)
Developer: Shitanshu Priyadarshi
Contact: contacttoshitu26@gmail.com

© 2026 DockDaily. All rights reserved.`,
  },
];

export default function AboutScreen() {
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === 'dark' ? '#2a2c2e' : '#eee';
  const cardBg = scheme === 'dark' ? '#1f2123' : '#f8f8f8';
  
  const { scrollToBottom } = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollToBottom === 'true') {
      // Small timeout to ensure layout is measured before scrolling
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [scrollToBottom]);

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Privacy & About</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.icon }]}>
          We believe you should know exactly what happens with your data. Here's everything, plainly explained.
        </Text>

        {SECTIONS.map((section, i) => (
          <View
            key={i}
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.cardContent, { color: colors.icon }]}>
              {section.content}
            </Text>
          </View>
        ))}

        <Text style={[styles.footer, { color: colors.icon }]}>
          Last updated: July 2025
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40 },
  topBarTitle: { fontSize: 18, fontWeight: '700' },
  container: { padding: 16, paddingBottom: 48 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardContent: { fontSize: 14, lineHeight: 22 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
