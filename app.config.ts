import type { ExpoConfig } from 'expo/config';

// Kalitlar .env faylidan olinadi (git'ga yuklanmaydi). Namuna: .env.example
// Xarita — Yandex (EXPO_PUBLIC_YANDEX_MAPS_KEY), u kod ichida o'qiladi: components/map/yandex/useYandexMap.ts

const config: ExpoConfig = {
  name: 'UyService',
  slug: 'uyservice',
  scheme: 'uyservice',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#F6F8F7',
  ios: {
    bundleIdentifier: 'uz.uyservice.app',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Usta manzilingizni topishi uchun joylashuvingiz kerak.',
    },
  },
  android: {
    package: 'uz.uyservice.app',
    adaptiveIcon: {
      backgroundColor: '#0E5A4B',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    output: 'single',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      { backgroundColor: '#0E5A4B', image: './assets/splash-icon.png', imageWidth: 160 },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Usta manzilingizni topishi uchun joylashuvingiz kerak.',
      },
    ],
    [
      'expo-image-picker',
      { photosPermission: 'Muammo rasmini ustaga yuborish uchun galereyaga ruxsat kerak.' },
    ],
  ],
  experiments: { typedRoutes: false },
};

export default config;
