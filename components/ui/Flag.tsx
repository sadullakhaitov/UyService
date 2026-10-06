import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import type { Lang } from '@/lib/i18n';

// Dumaloq bayroqlar (soddalashtirilgan)
export function Flag({ lang, size = 52 }: { lang: Lang; size?: number }) {
  const id = `flag-${lang}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <ClipPath id={id}>
          <Circle cx="30" cy="30" r="30" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        {lang === 'uz' ? (
          <>
            <Rect width="60" height="60" fill="#FFFFFF" />
            <Rect width="60" height="20" fill="#0099B5" />
            <Rect y="40" width="60" height="20" fill="#1EB53A" />
            <Rect y="19" width="60" height="2" fill="#CE1126" />
            <Rect y="39" width="60" height="2" fill="#CE1126" />
            <Circle cx="15" cy="10" r="6" fill="#FFFFFF" />
            <Circle cx="17.5" cy="10" r="5.2" fill="#0099B5" />
            {[0, 1, 2].map((k) => (
              <Circle key={k} cx={24 + k * 4} cy="7.5" r="0.9" fill="#FFFFFF" />
            ))}
            {[0, 1, 2].map((k) => (
              <Circle key={`b${k}`} cx={24 + k * 4} cy="11.5" r="0.9" fill="#FFFFFF" />
            ))}
          </>
        ) : lang === 'ru' ? (
          <>
            <Rect width="60" height="20" fill="#FFFFFF" />
            <Rect y="20" width="60" height="20" fill="#0039A6" />
            <Rect y="40" width="60" height="20" fill="#D52B1E" />
          </>
        ) : (
          <>
            <Rect width="60" height="60" fill="#012169" />
            <Path d="M0 0 L60 60 M60 0 L0 60" stroke="#FFFFFF" strokeWidth="12" />
            <Path d="M0 0 L60 60 M60 0 L0 60" stroke="#C8102E" strokeWidth="4" />
            <Path d="M30 0 V60 M0 30 H60" stroke="#FFFFFF" strokeWidth="16" />
            <Path d="M30 0 V60 M0 30 H60" stroke="#C8102E" strokeWidth="9" />
          </>
        )}
      </G>
      <Circle cx="30" cy="30" r="29.5" fill="none" stroke="#000000" strokeOpacity={0.08} />
    </Svg>
  );
}
