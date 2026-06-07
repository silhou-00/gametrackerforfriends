// Dark Theme
// Deep, immersive game-centric aesthetic (eye-friendly for gaming)

import { ColorTokens } from '../tokens/colors';

export const DarkTheme = {
  name: 'dark',

  colors: {
    // Primary & Actions
    primary: ColorTokens.primary.light, // brighter primary in dark mode
    primaryLight: '#0099ff',
    primaryDark: ColorTokens.primary.main,

    // Backgrounds
    background: ColorTokens.dark.background,
    surface: ColorTokens.dark.surface,
    surfaceLight: ColorTokens.dark.surfaceLight,

    // Text
    text: ColorTokens.dark.text,
    textSecondary: ColorTokens.dark.textSecondary,

    // Semantic
    success: ColorTokens.accent.success,
    warning: ColorTokens.accent.warning,
    danger: ColorTokens.accent.danger,
    info: ColorTokens.accent.info,

    // Game states
    leading: ColorTokens.game.leading,
    winning: ColorTokens.game.winning,
    losing: ColorTokens.game.losing,

    // Borders
    border: ColorTokens.dark.border,
    borderLight: ColorTokens.neutral.gray700,

    // Overlays
    overlay: 'rgba(255, 255, 255, 0.1)',
    overlayLight: 'rgba(255, 255, 255, 0.05)',
  },

  // Component-specific colors
  components: {
    card: {
      background: ColorTokens.dark.surface,
      border: ColorTokens.dark.border,
    },
    button: {
      primary: ColorTokens.primary.light,
      primaryHover: '#0099ff',
      primaryActive: ColorTokens.primary.main,
      secondary: ColorTokens.dark.surface,
      secondaryText: ColorTokens.dark.text,
    },
    input: {
      background: ColorTokens.dark.surfaceLight,
      border: ColorTokens.dark.border,
      borderFocus: ColorTokens.primary.light,
      text: ColorTokens.dark.text,
    },
    badge: {
      success: ColorTokens.accent.success,
      warning: ColorTokens.accent.warning,
      danger: ColorTokens.accent.danger,
    },
  },
} as const;

export type DarkThemeType = typeof DarkTheme;
