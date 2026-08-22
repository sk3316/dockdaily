import { useAppTheme } from "@/hooks/use-app-theme";
import { useFriendsStore } from "@/store/useFriendsStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function FriendsScreen() {
  const { scheme, colors } = useAppTheme();
  const borderColor = scheme === "dark" ? "#2a2c2e" : "#eee";
  const cardBg = scheme === "dark" ? "#1f2123" : "#f8f8f8";

  const {
    friends,
    loading,
    myInviteCode,
    generatingCode,
    redeeming,
    loadFriends,
    generateInviteCode,
    redeemInviteCode,
    removeFriend,
  } = useFriendsStore();

  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleGenerateCode = async () => {
    const code = await generateInviteCode();
    if (code) {
      await Share.share({
        message: `Join me on DockDaily! Use my invite code: ${code}`,
      });
    }
  };

  const handleRedeem = async () => {
    if (!codeInput.trim()) return;
    const result = await redeemInviteCode(codeInput);
    if (result.success) {
      Alert.alert(
        "Friend added! 🎉",
        `You're now friends with ${result.friendName}`,
      );
      setCodeInput("");
    } else {
      Alert.alert(
        "Couldn't add friend",
        result.error ?? "Something went wrong",
      );
    }
  };

  const handleRemoveFriend = (friendId: string, name: string) => {
    Alert.alert("Remove friend", `Remove ${name} from your friends?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFriend(friendId),
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
        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          Friends
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.push("/create-challenge" as any)}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.tint, marginBottom: 16 },
          ]}
        >
          <Ionicons
            name="trophy-outline"
            size={18}
            color={scheme === "dark" ? "#151718" : "#fff"}
          />
          <Text
            style={[
              styles.primaryButtonText,
              { color: scheme === "dark" ? "#151718" : "#fff" },
            ]}
          >
            Start a challenge
          </Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Invite a friend
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.icon }]}>
            Generate a code and share it — they enter it below to connect with
            you.
          </Text>
          <TouchableOpacity
            onPress={handleGenerateCode}
            disabled={generatingCode}
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.tint,
                opacity: generatingCode ? 0.6 : 1,
              },
            ]}
          >
            {generatingCode ? (
              <ActivityIndicator
                color={scheme === "dark" ? "#151718" : "#fff"}
              />
            ) : (
              <>
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={scheme === "dark" ? "#151718" : "#fff"}
                />
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: scheme === "dark" ? "#151718" : "#fff" },
                  ]}
                >
                  Generate & share code
                </Text>
              </>
            )}
          </TouchableOpacity>
          {myInviteCode && (
            <Text
              style={[styles.codeDisplay, { color: colors.tint, borderColor }]}
            >
              {myInviteCode}
            </Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Add a friend
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.icon }]}>
            Got a code from a friend? Enter it here.
          </Text>
          <View style={styles.codeInputRow}>
            <TextInput
              style={[styles.codeInput, { color: colors.text, borderColor }]}
              placeholder="ABCD123"
              placeholderTextColor={colors.icon}
              value={codeInput}
              onChangeText={(t) => setCodeInput(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={7}
            />
            <TouchableOpacity
              onPress={handleRedeem}
              disabled={redeeming || !codeInput.trim()}
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.tint,
                  opacity: redeeming || !codeInput.trim() ? 0.5 : 1,
                },
              ]}
            >
              {redeeming ? (
                <ActivityIndicator
                  size="small"
                  color={scheme === "dark" ? "#151718" : "#fff"}
                />
              ) : (
                <Text
                  style={{
                    color: scheme === "dark" ? "#151718" : "#fff",
                    fontWeight: "700",
                  }}
                >
                  Add
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your friends {friends.length > 0 ? `(${friends.length})` : ""}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 20 }} />
        ) : friends.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No friends yet — share your invite code above to connect with
            someone.
          </Text>
        ) : (
          friends.map((friend) => (
            <View
              key={friend.friendId}
              style={[styles.friendRow, { borderBottomColor: borderColor }]}
            >
              {friend.avatarUrl ? (
                <Image
                  source={{ uri: friend.avatarUrl }}
                  style={styles.friendAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.friendAvatarFallback,
                    { backgroundColor: colors.tint },
                  ]}
                >
                  <Text
                    style={{
                      color: scheme === "dark" ? "#151718" : "#fff",
                      fontWeight: "700",
                    }}
                  >
                    {friend.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.friendName, { color: colors.text }]}>
                {friend.displayName}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  handleRemoveFriend(friend.friendId, friend.displayName)
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
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
  topBarTitle: { fontSize: 18, fontWeight: "700" },
  container: { padding: 16, paddingBottom: 48 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSubtext: { fontSize: 13, lineHeight: 18 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "700" },
  codeDisplay: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  codeInputRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    letterSpacing: 2,
  },
  addButton: {
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 4,
  },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 20 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendAvatar: { width: 40, height: 40, borderRadius: 20 },
  friendAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  friendName: { flex: 1, fontSize: 15, fontWeight: "500" },
});
