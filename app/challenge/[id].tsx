import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore } from "@/store/useAuthStore";
import { useChallengeStore } from "@/store/useChallengeStore";
import { captureProofPhoto } from "@/utils/challengeProof";
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
    .sort((a, b) => b.totalCompletions - a.totalCompletions);

  const handleCheckIn = async () => {
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
        <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
          <Ionicons name="exit-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
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
              name={challenge.mode === "formal" ? "flag" : "infinite"}
              size={16}
              color={colors.tint}
            />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {challenge.mode === "formal"
                ? `Ends ${format(new Date(challenge.endDate!), "MMM d, yyyy")}`
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
        </View>

        {!checking && (
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
        )}

        <Text style={[styles.sectionHeader, { color: colors.text }]}>
          Leaderboard
        </Text>

        {sorted.map((p, i) => {
          const isMe = p.userId === user?.id;
          return (
            <View
              key={p.userId}
              style={[
                styles.leaderRow,
                { backgroundColor: isMe ? cardBg : "transparent", borderColor },
              ]}
            >
              <Text
                style={[
                  styles.rank,
                  { color: i === 0 ? "#f59e0b" : colors.icon },
                ]}
              >
                #{i + 1}
              </Text>
              {p.avatarUrl ? (
                <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.tint },
                  ]}
                >
                  <Text
                    style={{
                      color: scheme === "dark" ? "#151718" : "#fff",
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {p.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.leaderName, { color: colors.text }]}
                numberOfLines={1}
              >
                {isMe ? "You" : p.displayName}
              </Text>
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
              <Text style={[styles.leaderTotal, { color: colors.tint }]}>
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
});
