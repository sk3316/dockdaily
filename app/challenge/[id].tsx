import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore } from "@/store/useAuthStore";
import { useChallengeStore } from "@/store/useChallengeStore";
import { captureProofPhoto } from "@/utils/challengeProof";
import { getLocalDateString } from "@/utils/streak";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistanceToNow } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";

  const {
    challenges,
    loadChallenges,
    submitCheckin,
    hasCheckedInToday,
    leaveChallenge,
    completeChallenge,
    timeline,
    timelineLoading,
    loadTimeline,
    reactToCheckin,
  } = useChallengeStore();
  const { user } = useAuthStore();

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const challenge = challenges.find((c) => c.id === id);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  useEffect(() => {
    if (!id) return;
    hasCheckedInToday(id).then((val) => {
      setCheckedInToday(val);
      setChecking(false);
    });
  }, [id, hasCheckedInToday]);

  useEffect(() => {
    if (id) loadTimeline(id);
  }, [id, loadTimeline]);

  const today = getLocalDateString();
  const isFormalExpired =
    challenge?.mode === "formal" &&
    !!challenge?.endDate &&
    today > challenge.endDate;
  const isEnded =
    challenge?.status === "completed" ||
    challenge?.status === "cancelled" ||
    isFormalExpired;

  // If formal challenge expired but not marked completed in DB yet, auto-complete it
  useEffect(() => {
    if (challenge && challenge.status === "active" && isFormalExpired) {
      void completeChallenge(challenge.id);
    }
  }, [challenge?.id, challenge?.status, isFormalExpired, completeChallenge]);

  if (!challenge) {
    return (
      <View
        style={[
          styles.flexFill,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  const sorted = [...challenge.participants]
    .filter((p) => p.status === "accepted")
    .sort((a, b) => {
      if (b.totalCompletions !== a.totalCompletions) {
        return b.totalCompletions - a.totalCompletions;
      }
      if (b.bestStreak !== a.bestStreak) {
        return b.bestStreak - a.bestStreak;
      }
      return b.currentStreak - a.currentStreak;
    });

  const winnerParticipant = challenge.winnerUserId
    ? challenge.participants.find((p) => p.userId === challenge.winnerUserId)
    : sorted.length > 0 && sorted[0].totalCompletions > 0
      ? sorted[0]
      : null;

  const isWinner = winnerParticipant?.userId === user?.id;
  const isCreator = challenge.createdBy === user?.id;

  const handleCheckIn = async () => {
    if (isEnded) {
      Alert.alert(
        "Challenge Ended",
        "This challenge is closed and check-ins are locked.",
      );
      return;
    }

    setCheckingIn(true);

    let proofUrl: string | null = null;
    if (challenge.requiresProof) {
      proofUrl = await captureProofPhoto();
      if (!proofUrl) {
        setCheckingIn(false);
        Alert.alert(
          "Photo required",
          "This challenge requires a photo to check in.",
        );
        return;
      }
    }

    const result = await submitCheckin(challenge.id, proofUrl);
    setCheckingIn(false);

    if (result.success) {
      setCheckedInToday(true);
      Alert.alert("Checked in! 🔥", "Your streak has been updated.");
    } else {
      Alert.alert("Error", result.error ?? "Failed to check in");
    }
  };

  const handleLeave = () => {
    Alert.alert("Leave challenge?", "You can rejoin later if invited again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          await leaveChallenge(challenge.id);
          router.back();
        },
      },
    ]);
  };

  const handleEndChallenge = () => {
    Alert.alert(
      "End Challenge & Declare Winner?",
      "This will close the challenge now, crown the top participant as the winner, and lock further check-ins.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End & Crown Winner",
          style: "destructive",
          onPress: async () => {
            const res = await completeChallenge(challenge.id);
            if (res.success) {
              Alert.alert(
                "Challenge Ended 🏆",
                "The winner has been declared and check-ins are locked.",
              );
            } else {
              Alert.alert("Error", res.error ?? "Failed to end challenge");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.flexFill, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={[styles.topBarTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {challenge.title}
        </Text>
        <View style={styles.topBarRight}>
          {isCreator && !isEnded && (
            <TouchableOpacity
              onPress={handleEndChallenge}
              style={styles.endTopButton}
              accessibilityLabel="End Challenge"
            >
              <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
            <Ionicons name="exit-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.metaCard, { backgroundColor: cardBg, borderColor }]}
        >
          <View style={styles.metaRow}>
            <Ionicons
              name={isEnded ? "checkmark-circle" : "radio-button-on"}
              size={16}
              color={isEnded ? "#22c55e" : colors.tint}
            />
            <Text
              style={[
                styles.metaText,
                { color: isEnded ? "#22c55e" : colors.tint, fontWeight: "700" },
              ]}
            >
              {isEnded ? "Completed & Closed" : "Active"}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name={challenge.mode === "formal" ? "flag" : "infinite"}
              size={16}
              color={colors.tint}
            />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {challenge.mode === "formal"
                ? isEnded
                  ? `Ended ${format(new Date(challenge.endDate!), "MMM d, yyyy")}`
                  : `Ends ${format(new Date(challenge.endDate!), "MMM d, yyyy")}`
                : "Ongoing rivalry"}
            </Text>
          </View>

          {challenge.requiresProof && (
            <View style={styles.metaRow}>
              <Ionicons name="camera" size={16} color={colors.tint} />
              <Text style={[styles.metaText, { color: colors.text }]}>
                Photo proof required
              </Text>
            </View>
          )}

          {isCreator && !isEnded && (
            <TouchableOpacity
              onPress={handleEndChallenge}
              style={[styles.endChallengeRowButton, { borderColor: "#f59e0b" }]}
            >
              <Ionicons name="trophy" size={14} color="#f59e0b" />
              <Text style={styles.endChallengeRowText}>
                End Challenge & Declare Winner
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isEnded ? (
          <View
            style={[
              styles.winnerCard,
              {
                backgroundColor: isWinner
                  ? scheme === "dark"
                    ? "#2a2208"
                    : "#fef9c3"
                  : cardBg,
                borderColor: isWinner ? "#f59e0b" : borderColor,
              },
            ]}
          >
            <View style={styles.winnerCardHeader}>
              <View style={styles.winnerTrophyBox}>
                <Ionicons
                  name={winnerParticipant ? "trophy" : "flag"}
                  size={32}
                  color="#f59e0b"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.winnerEyebrow}>
                  {winnerParticipant
                    ? "CHALLENGE WINNER"
                    : "CHALLENGE CLOSED"}
                </Text>
                <Text
                  style={[styles.winnerTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {isWinner
                    ? "🎉 You Won the Challenge!"
                    : winnerParticipant
                      ? `👑 ${winnerParticipant.displayName}`
                      : "Challenge Ended"}
                </Text>
                <Text style={[styles.winnerStats, { color: colors.icon }]}>
                  {winnerParticipant
                    ? `${winnerParticipant.totalCompletions} check-ins • ${winnerParticipant.bestStreak} day streak`
                    : "No check-ins recorded."}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.closedPill,
                {
                  backgroundColor:
                    scheme === "dark" ? "#15171888" : "#ffffffbb",
                  borderColor,
                },
              ]}
            >
              <Ionicons name="lock-closed" size={12} color={colors.icon} />
              <Text style={[styles.closedPillText, { color: colors.icon }]}>
                Challenge Closed • Check-ins are locked
              </Text>
            </View>
          </View>
        ) : (
          !checking && (
            <TouchableOpacity
              onPress={handleCheckIn}
              disabled={checkedInToday || checkingIn}
              style={[
                styles.checkinButton,
                {
                  backgroundColor: checkedInToday ? "#22c55e" : colors.tint,
                  opacity: checkingIn ? 0.6 : 1,
                },
              ]}
            >
              {checkingIn ? (
                <ActivityIndicator
                  color={scheme === "dark" ? "#151718" : "#fff"}
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      checkedInToday
                        ? "checkmark-circle"
                        : challenge.requiresProof
                          ? "camera"
                          : "flame"
                    }
                    size={20}
                    color={scheme === "dark" ? "#151718" : "#fff"}
                  />
                  <Text
                    style={[
                      styles.checkinButtonText,
                      { color: scheme === "dark" ? "#151718" : "#fff" },
                    ]}
                  >
                    {checkedInToday
                      ? "Checked in today"
                      : challenge.requiresProof
                        ? "Check in with photo"
                        : "Check in for today"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )
        )}

        <Text style={[styles.sectionHeader, { color: colors.text }]}>
          {isEnded ? "Final Leaderboard" : "Leaderboard"}
        </Text>

        {sorted.map((p, i) => {
          const isMe = p.userId === user?.id;
          const isThisWinner =
            isEnded && winnerParticipant?.userId === p.userId;

          return (
            <View
              key={p.userId}
              style={[
                styles.leaderRow,
                {
                  backgroundColor: isThisWinner
                    ? scheme === "dark"
                      ? "#2a220855"
                      : "#fef9c388"
                    : isMe
                      ? cardBg
                      : "transparent",
                  borderColor: isThisWinner ? "#f59e0b" : borderColor,
                  borderWidth: isThisWinner ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.rankContainer}>
                {isThisWinner ? (
                  <Ionicons name="trophy" size={16} color="#f59e0b" />
                ) : (
                  <Text
                    style={[
                      styles.rank,
                      { color: i === 0 ? "#f59e0b" : colors.icon },
                    ]}
                  >
                    #{i + 1}
                  </Text>
                )}
              </View>

              {p.avatarUrl ? (
                <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    {
                      backgroundColor: isThisWinner ? "#f59e0b" : colors.tint,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        scheme === "dark" && !isThisWinner
                          ? "#151718"
                          : "#fff",
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {p.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.leaderNameRow}>
                  <Text
                    style={[
                      styles.leaderName,
                      {
                        color: colors.text,
                        fontWeight: isThisWinner ? "700" : "600",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isMe ? "You" : p.displayName}
                  </Text>
                  {isThisWinner && (
                    <View style={styles.winnerPill}>
                      <Text style={styles.winnerPillText}>WINNER</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.leaderStats}>
                <Ionicons
                  name="flame"
                  size={13}
                  color={p.currentStreak > 0 ? "#f97316" : colors.icon}
                />
                <Text style={[styles.leaderStatText, { color: colors.icon }]}>
                  {p.currentStreak}
                </Text>
              </View>
              <Text
                style={[
                  styles.leaderTotal,
                  { color: isThisWinner ? "#f59e0b" : colors.tint },
                ]}
              >
                {p.totalCompletions}
              </Text>
            </View>
          );
        })}

        <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 24 }]}>
          Timeline
        </Text>

        {timelineLoading ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 10 }} />
        ) : timeline.length === 0 ? (
          <Text style={[styles.metaText, { color: colors.icon, paddingHorizontal: 0 }]}>
            No check-ins yet.
          </Text>
        ) : (
          timeline.map((entry) => (
            <View
              key={entry.id}
              style={[styles.timelineRow, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={styles.timelineHeader}>
                {entry.avatarUrl ? (
                  <Image source={{ uri: entry.avatarUrl }} style={styles.timelineAvatar} />
                ) : (
                  <View
                    style={[styles.timelineAvatarFallback, { backgroundColor: colors.tint }]}
                  >
                    <Text
                      style={{
                        color: scheme === "dark" ? "#151718" : "#fff",
                        fontWeight: "700",
                        fontSize: 11,
                      }}
                    >
                      {entry.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timelineName, { color: colors.text }]}>
                    {entry.userId === user?.id ? "You" : entry.displayName}
                  </Text>
                  <Text style={[styles.timelineTime, { color: colors.icon }]}>
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </Text>
                </View>
              </View>

              {entry.proofPhotoUrl && (
                <TouchableOpacity onPress={() => setLightboxUrl(entry.proofPhotoUrl)}>
                  <Image
                    source={{ uri: entry.proofPhotoUrl }}
                    style={styles.timelinePhoto}
                  />
                </TouchableOpacity>
              )}

              <View style={styles.reactionRow}>
                <TouchableOpacity
                  onPress={() => reactToCheckin(entry.id, challenge.id, "verified")}
                  style={[
                    styles.reactionButton,
                    entry.myReaction === "verified" && { backgroundColor: "#22c55e22" },
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={15} color="#22c55e" />
                  <Text style={[styles.reactionText, { color: "#22c55e" }]}>
                    {entry.verifiedCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => reactToCheckin(entry.id, challenge.id, "flagged")}
                  style={[
                    styles.reactionButton,
                    entry.myReaction === "flagged" && { backgroundColor: "#ef444422" },
                  ]}
                >
                  <Ionicons name="flag-outline" size={15} color="#ef4444" />
                  <Text style={[styles.reactionText, { color: "#ef4444" }]}>
                    {entry.flaggedCount}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={lightboxUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUrl(null)}
      >
        <TouchableOpacity
          style={styles.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setLightboxUrl(null)}
        >
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40 },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  container: { padding: 16, paddingBottom: 48 },
  metaCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13, fontWeight: "500" },
  checkinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
  },
  checkinButtonText: { fontSize: 16, fontWeight: "700" },
  sectionHeader: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  rank: { fontSize: 14, fontWeight: "700", width: 28 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  leaderName: { flex: 1, fontSize: 14, fontWeight: "600" },
  leaderStats: { flexDirection: "row", alignItems: "center", gap: 3 },
  leaderStatText: { fontSize: 12, fontWeight: "600" },
  leaderTotal: {
    fontSize: 15,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "right",
  },
  timelineRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  timelineHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  timelineAvatar: { width: 28, height: 28, borderRadius: 14 },
  timelineAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineName: { fontSize: 13, fontWeight: "700" },
  timelineTime: { fontSize: 11 },
  timelinePhoto: { width: "100%", height: 180, borderRadius: 10 },
  reactionRow: { flexDirection: "row", gap: 8 },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  reactionText: { fontSize: 12, fontWeight: "700" },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: { width: "95%", height: "80%" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  endTopButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  endChallengeRowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  endChallengeRowText: { fontSize: 13, fontWeight: "700", color: "#f59e0b" },
  winnerCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  winnerCardHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  winnerTrophyBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  winnerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#f59e0b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  winnerTitle: { fontSize: 17, fontWeight: "800" },
  winnerStats: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  closedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  closedPillText: { fontSize: 12, fontWeight: "600" },
  rankContainer: { width: 28, alignItems: "center", justifyContent: "center" },
  leaderNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  winnerPill: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  winnerPillText: { fontSize: 9, fontWeight: "800", color: "#fff" },
});
