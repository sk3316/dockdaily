import AcceptChallengeSheet from "@/components/AcceptChallengeSheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore } from "@/store/useAuthStore";
import { useChallengeStore } from "@/store/useChallengeStore";
import { useHabitStore } from "@/store/useHabitStore";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChallengesScreen() {
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f2f2f2";

  const {
    challenges,
    loading,
    loadChallenges,
    acceptChallenge,
    declineChallenge,
  } = useChallengeStore();
  const { user } = useAuthStore();
  const { habits } = useHabitStore();
  const [acceptingChallenge, setAcceptingChallenge] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const myUserId = user?.id;

  const pendingInvites = challenges.filter((c) =>
    c.participants.some((p) => p.userId === myUserId && p.status === "invited"),
  );

  const activeChallenges = challenges.filter(
    (c) =>
      c.status === "active" &&
      c.participants.some(
        (p) => p.userId === myUserId && p.status === "accepted",
      ),
  );

  const handleAccept = (challengeId: string, challengeTitle: string) => {
    if (habits.length === 0) {
      Alert.alert(
        "No habits yet",
        "Add a habit first so you can link it to this challenge.",
      );
      return;
    }
    setAcceptingChallenge({ id: challengeId, title: challengeTitle });
  };

  const handleDecline = (challengeId: string) => {
    Alert.alert(
      "Decline challenge?",
      "You can always join another one later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => declineChallenge(challengeId),
        },
      ],
    );
  };

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <View style={[styles.staticHeader, { borderBottomColor: borderColor }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: colors.text }]}>
            Challenges
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/create-challenge" as any)}
            style={[styles.newButton, { backgroundColor: colors.tint }]}
          >
            <Ionicons
              name="add"
              size={20}
              color={scheme === "dark" ? "#151718" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pendingInvites.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.text }]}>
                Invites ({pendingInvites.length})
              </Text>
              {pendingInvites.map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.inviteCard,
                    { backgroundColor: cardBg, borderColor: colors.tint },
                  ]}
                >
                  <View style={styles.inviteHeader}>
                    <Ionicons
                      name="mail-unread"
                      size={18}
                      color={colors.tint}
                    />
                    <Text style={[styles.inviteTitle, { color: colors.text }]}>
                      {c.title}
                    </Text>
                  </View>
                  <Text style={[styles.inviteSubtext, { color: colors.icon }]}>
                    {c.mode === "formal"
                      ? `Ends ${format(new Date(c.endDate!), "MMM d")}`
                      : "Ongoing rivalry"}
                    {c.requiresProof ? " · Photo proof required" : ""}
                  </Text>
                  <View style={styles.inviteActions}>
                    <TouchableOpacity
                      onPress={() => handleAccept(c.id, c.title)}
                      style={[
                        styles.acceptButton,
                        { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text
                        style={{
                          color: scheme === "dark" ? "#151718" : "#fff",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Accept
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDecline(c.id)}
                      style={styles.declineButton}
                    >
                      <Text
                        style={{
                          color: "#ef4444",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          <Text
            style={[
              styles.sectionHeader,
              {
                color: colors.text,
                marginTop: pendingInvites.length > 0 ? 24 : 0,
              },
            ]}
          >
            Active Challenges{" "}
            {activeChallenges.length > 0 ? `(${activeChallenges.length})` : ""}
          </Text>

          {activeChallenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={40} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No active challenges yet — start one with a friend
              </Text>
            </View>
          ) : (
            activeChallenges.map((c) => {
              const sorted = [...c.participants]
                .filter((p) => p.status === "accepted")
                .sort((a, b) => b.totalCompletions - a.totalCompletions);
              const me = sorted.find((p) => p.userId === myUserId);
              const myRank = sorted.findIndex((p) => p.userId === myUserId) + 1;

              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => router.push(`/challenge/${c.id}` as any)}
                  style={[
                    styles.challengeCard,
                    { backgroundColor: cardBg, borderColor },
                  ]}
                >
                  <View style={styles.challengeCardHeader}>
                    <Text
                      style={[
                        styles.challengeCardTitle,
                        { color: colors.text },
                      ]}
                    >
                      {c.title}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.icon}
                    />
                  </View>
                  <View style={styles.challengeCardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="people" size={14} color={colors.icon} />
                      <Text style={[styles.metaText, { color: colors.icon }]}>
                        {sorted.length}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flame" size={14} color="#f97316" />
                      <Text style={[styles.metaText, { color: colors.icon }]}>
                        {me?.currentStreak ?? 0} streak
                      </Text>
                    </View>
                    {myRank > 0 && (
                      <View style={styles.metaItem}>
                        <Ionicons name="podium" size={14} color={colors.tint} />
                        <Text
                          style={[
                            styles.metaText,
                            { color: colors.tint, fontWeight: "700" },
                          ]}
                        >
                          #{myRank} of {sorted.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <AcceptChallengeSheet
        visible={acceptingChallenge !== null}
        onClose={() => setAcceptingChallenge(null)}
        challengeId={acceptingChallenge?.id ?? ""}
        challengeTitle={acceptingChallenge?.title ?? ""}
        habits={habits}
        onAccepted={loadChallenges}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  staticHeader: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: { fontSize: 28, fontWeight: "700" },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionHeader: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  inviteCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  inviteTitle: { fontSize: 15, fontWeight: "700" },
  inviteSubtext: { fontSize: 12, marginBottom: 12 },
  inviteActions: { flexDirection: "row", gap: 10 },
  acceptButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  declineButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, textAlign: "center" },
  challengeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  challengeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  challengeCardTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  challengeCardMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontWeight: "600" },
});
