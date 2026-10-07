// Rasm tanlash / suratga olish (pasport, selfi, ish namunalari, muammo rasmi).
// Brauzerda tanlangan rasm vaqtinchalik (blob:) havola — sahifa yangilansa yo'qoladi, shuning uchun bu yerdan
// har doim saqlab qo'ysa bo'ladigan manzil qaytadi (keepablePhoto). 5-bosqichda rasmlar Supabase Storage'ga yuklanadi.
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Odatiy eng katta tomon (px): muammo rasmi, ish namunasi. Hujjat uchun kattaroq — DOC_MAX */
export const PHOTO_MAX = 800;
export const DOC_MAX = 1280;
/** Profil surati */
export const AVATAR_MAX = 320;

export async function pickImages(limit = 1, max = PHOTO_MAX): Promise<string[]> {
  if (limit <= 0) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
  });
  if (res.canceled) return [];
  return Promise.all(res.assets.slice(0, limit).map((a) => keepablePhoto(a.uri, max)));
}

/** Kamera (selfi uchun old kamera). Ruxsat berilmasa yoki kamera yo'q bo'lsa — galereya */
export async function takePhoto({ front = false, max = PHOTO_MAX }: { front?: boolean; max?: number } = {}): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      });
      return res.canceled ? null : keepablePhoto(res.assets[0].uri, max);
    }
  } catch {
    // simulyator / brauzer — kamera yo'q
  }
  return (await pickImages(1, max))[0] ?? null;
}

/**
 * Brauzerda tanlangan rasm vaqtinchalik (blob:) havola bo'ladi va sahifa yangilanganda yo'qoladi — shuning uchun
 * kichraytirib (eng katta tomoni ≤ max px) data: URL'ga aylantiramiz (localStorage'ga sig'ishi uchun JPEG).
 * Telefonda fayl manzili o'zi saqlanadi. 5-bosqichda Supabase Storage'ga yuklanadi.
 */
export async function keepablePhoto(uri: string, max = PHOTO_MAX): Promise<string> {
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
