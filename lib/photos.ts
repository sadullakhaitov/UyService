// Rasm tanlash / suratga olish (pasport, selfi, ish namunalari, muammo rasmi).
// 5-bosqichda tanlangan rasmlar Supabase Storage'ga yuklanadi.
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

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

/**
 * Profil surati telefonda saqlanib qolishi uchun: brauzerda tanlangan rasm vaqtinchalik (blob:) havola bo'ladi
 * va sahifa yangilanganda yo'qoladi — shuning uchun kichraytirib (≤ 320 px) data: URL'ga aylantiramiz.
 * Telefonda fayl manzili o'zi saqlanadi. 5-bosqichda Supabase Storage'ga yuklanadi.
 */
export async function keepablePhoto(uri: string, max = 320): Promise<string> {
  if (Platform.OS !== 'web' || !uri.startsWith('blob:')) return uri;
  try {
    const img = new window.Image();
    img.src = uri;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * k);
    canvas.height = Math.round(img.naturalHeight * k);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return uri;
  }
}
