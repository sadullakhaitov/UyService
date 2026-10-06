// UyService ranglari (TZ, 8-bo'lim). To'q yashil — ishonch, to'q sariq — mehnat/asbob rangi.
export const colors = {
  primary: '#0E5A4B',
  primaryPressed: '#0A4639',
  primarySoft: '#E6F2EE',
  primaryTint: '#CFE5DD',

  accent: '#E8772E',
  accentSoft: '#FDF0E6',
  accentInk: '#9A4A12',

  ink: '#0B2A24',
  ink2: '#4E625C',
  muted: '#7A8B85',
  onPrimary: '#FFFFFF',

  bg: '#F6F8F7',
  surface: '#FFFFFF',
  field: '#F1F4F2',
  line: '#E1E7E4',
  handle: '#D3DBD7',

  map: '#E9EEEB',
  mapBlock: '#DDE5E0',
  mapPark: '#D3E3D6',
  mapRoad: '#FFFFFF',

  success: '#1B7A4E',
  successSoft: '#E3F3EA',
  danger: '#B83A26',
  dangerSoft: '#FBE9E5',
  shadow: '#0B2A24',
} as const;

export const fonts = {
  regular: 'Manrope_500Medium',
  medium: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
  logo: 'Unbounded_700Bold',
} as const;

export const radius = {
  button: 16,
  card: 18,
  sheet: 28,
  chip: 22,
  tile: 16,
  field: 16,
} as const;

export const size = {
  touch: 44,
  button: 56,
  gutter: 16,
} as const;

export const shadow = {
  float: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheet: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
} as const;

export const type = {
  h1: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 28, color: colors.ink },
  h3: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyBold: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.ink2 },
} as const;
