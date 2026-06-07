// Spacing Tokens
// Base unit: 4px

const BASE_UNIT = 4;

export const SpacingTokens = {
  // Linear scale (multiples of 4px)
  0: 0,
  1: BASE_UNIT * 1, // 4px
  2: BASE_UNIT * 2, // 8px
  3: BASE_UNIT * 4, // 16px
  4: BASE_UNIT * 6, // 24px
  5: BASE_UNIT * 8, // 32px
  6: BASE_UNIT * 16, // 64px
  8: BASE_UNIT * 20, // 80px
  10: BASE_UNIT * 24, // 96px
  12: BASE_UNIT * 32, // 128px
  16: BASE_UNIT * 40, // 160px
  20: BASE_UNIT * 48, // 192px

  // Semantic spacing
  xs: BASE_UNIT * 1, // 4px
  sm: BASE_UNIT * 2, // 8px
  md: BASE_UNIT * 4, // 16px
  lg: BASE_UNIT * 6, // 24px
  xl: BASE_UNIT * 8, // 32px
  '2xl': BASE_UNIT * 12, // 48px
  '3xl': BASE_UNIT * 16, // 64px

  // Common spacing patterns
  padding: {
    xs: BASE_UNIT * 1,
    sm: BASE_UNIT * 2,
    md: BASE_UNIT * 4,
    lg: BASE_UNIT * 6,
    xl: BASE_UNIT * 8,
  },

  margin: {
    xs: BASE_UNIT * 1,
    sm: BASE_UNIT * 2,
    md: BASE_UNIT * 4,
    lg: BASE_UNIT * 6,
    xl: BASE_UNIT * 8,
  },

  gap: {
    xs: BASE_UNIT * 1,
    sm: BASE_UNIT * 2,
    md: BASE_UNIT * 4,
    lg: BASE_UNIT * 6,
    xl: BASE_UNIT * 8,
  },
};

export type SpacingToken = typeof SpacingTokens;
