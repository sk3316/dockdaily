// Bridges habit completion and challenge check-ins bidirectionally without
// creating a circular import between useHabitStore and useChallengeStore.

export async function syncHabitToChallenge(habitId: string) {
  const { useChallengeStore } = await import("./useChallengeStore");
  const { useAuthStore } = await import("./useAuthStore");

  const user = useAuthStore.getState().user;
  if (!user) return;

  const { challenges, submitCheckin, hasCheckedInToday } =
    useChallengeStore.getState();

  for (const challenge of challenges) {
    if (challenge.status !== "active") continue;
    const myParticipant = challenge.participants.find(
      (p) =>
        p.userId === user.id &&
        p.status === "accepted" &&
        p.habitId === habitId,
    );
    if (!myParticipant) continue;

    const already = await hasCheckedInToday(challenge.id);
    if (already) continue;

    if (challenge.requiresProof) {
      const { captureProofPhoto } = await import("@/utils/challengeProof");
      const photoUrl = await captureProofPhoto();
      if (!photoUrl) continue; // user cancelled camera — habit stays completed locally either way
      await submitCheckin(challenge.id, photoUrl);
    } else {
      await submitCheckin(challenge.id, null);
    }
  }
}

export async function syncChallengeToHabit(habitId: string | null) {
  if (!habitId) return;
  const { useHabitStore } = await import("./useHabitStore");
  const { habits, logHabit, logsToday } = useHabitStore.getState();

  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;

  const alreadyLogged = logsToday.find(
    (l) => l.habit_id === habitId,
  )?.completed;
  if (alreadyLogged) return;

  await logHabit(habitId, habit.target, habit.target);
}
