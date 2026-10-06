// Rasm tanlash / suratga olish (pasport, selfi, ish namunalari, muammo rasmi).
// 5-bosqichda tanlangan rasmlar Supabase Storage'ga yuklanadi.
import * as ImagePicker from 'expo-image-picker';

export async function pickImages(limit = 1): Promise<string[]> {
  if (limit <= 0) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
  });
  return res.canceled ? [] : res.assets.map((a) => a.uri).slice(0, limit);
}

/** Kamera (selfi uchun old kamera). Ruxsat berilmasa yoki kamera yo'q bo'lsa — galereya */
export async function takePhoto({ front = false }: { front?: boolean } = {}): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      });
      return res.canceled ? null : res.assets[0].uri;
    }
  } catch {
    // simulyator / brauzer — kamera yo'q
  }
  return (await pickImages(1))[0] ?? null;
}
