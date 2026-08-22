import * as ImagePicker from "expo-image-picker";

// TODO: replace with the values used by BotReSpawn. Cloudinary accounts/presets
// are not project-specific unless a separate one was provisioned for DockDaily.
const CLOUDINARY_CLOUD_NAME = "diqfxv3h1";
const CLOUDINARY_UPLOAD_PRESET = "dockdaily_challenge_proof";

export async function captureProofPhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    type: "image/jpeg",
    name: "proof.jpg",
  } as any);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    console.error("[ChallengeProof] Cloudinary upload failed");
    return null;
  }

  const data = await response.json();
  return data.secure_url ?? null;
}
