// Design Tokens - Central export
// All design system values are defined here

export { ColorTokens } from './colors';
export { TypographyTokens } from './typography';
export { SpacingTokens } from './spacing';
export { ShadowTokens } from './shadows';
export { RadiusTokens } from './radius';

import { ColorTokens } from './colors';
import { TypographyTokens } from './typography';
import { SpacingTokens } from './spacing';
import { ShadowTokens } from './shadows';
import { RadiusTokens } from './radius';

export const DesignTokens = {
  colors: ColorTokens,
  typography: TypographyTokens,
  spacing: SpacingTokens,
  shadows: ShadowTokens,
  radius: RadiusTokens,
} as const;

export type DesignTokenType = typeof DesignTokens;
