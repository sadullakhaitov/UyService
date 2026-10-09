import type { ExpoConfig } from 'expo/config';

// Kalitlar .env faylidan olinadi (git'ga yuklanmaydi). Namuna: .env.example
// Xarita — OpenStreetMap (components/map/osm/html.ts), kalit kerak emas

const config: ExpoConfig = {
  name: 'UyService',
  slug: 'uyservice',
  scheme: 'uyservice',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
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
    // Brauzerda har ekran alohida fayl: avval faqat ochilgan ekran yuklanadi (admin panel mijozga yuklanmaydi)
    ['expo-router', { asyncRoutes: { web: true, default: 'development' } }],
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/splash-icon.png',
        imageWidth: 200,
        // Tungi rejimda ochilish ekrani — to'q fon, oq belgi
        dark: { backgroundColor: '#0E1513', image: './assets/splash-icon-dark.png' },
      },
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
      {
        photosPermission: 'Muammo rasmini ustaga yuborish uchun galereyaga ruxsat kerak.',
        cameraPermission: 'Pasport, selfi va ish namunalarini suratga olish uchun kameraga ruxsat kerak.',
      },
    ],
    ['expo-notifications', { color: '#0E5A4B' }],
  ],
  // EAS loyiha raqami (push uchun): `npx eas init` chiqargan ID — expo.dev → loyiha → Environment variables → EAS_PROJECT_ID
  extra: process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {},
  experiments: { typedRoutes: false },
};

export default config;
