// Light Theme
// Bright, energetic game-centric aesthetic

import { ColorTokens } from '../tokens/colors';

export const LightTheme = {
  name: 'light',

  colors: {
    // Primary & Actions
    primary: ColorTokens.primary.main,
    primaryLight: ColorTokens.primary.light,
    primaryDark: ColorTokens.primary.dark,

    // Backgrounds
    background: ColorTokens.light.background,
    surface: ColorTokens.light.surface,
    surfaceLight: ColorTokens.light.surfaceLight,

    // Text
    text: ColorTokens.light.text,
    textSecondary: ColorTokens.light.textSecondary,

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
    border: ColorTokens.light.border,
    borderLight: ColorTokens.neutral.gray300,

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.1)',
  },

  // Component-specific colors
  components: {
    card: {
      background: ColorTokens.light.surface,
      border: ColorTokens.light.border,
    },
    button: {
      primary: ColorTokens.primary.main,
      primaryHover: ColorTokens.primary.light,
      primaryActive: ColorTokens.primary.dark,
      secondary: ColorTokens.light.surface,
      secondaryText: ColorTokens.light.text,
    },
    input: {
      background: ColorTokens.light.background,
      border: ColorTokens.light.border,
      borderFocus: ColorTokens.primary.main,
      text: ColorTokens.light.text,
    },
    badge: {
      success: ColorTokens.accent.success,
      warning: ColorTokens.accent.warning,
      danger: ColorTokens.accent.danger,
    },
  },
} as const;

export type LightThemeType = typeof LightTheme;
