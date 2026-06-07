// Border Radius Tokens

export const RadiusTokens = {
  // Scale (in pixels)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  full: 9999, // fully rounded (circle/pill)

  // Semantic names
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,

  // Component presets
  card: 16,
  button: 8,
  input: 8,
  badge: 12,
  avatar: 9999, // circular
  fab: 9999, // circular for floating action button
};

export type RadiusToken = typeof RadiusTokens;
