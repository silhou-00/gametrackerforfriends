// Themes - Light & Dark mode definitions

export { LightTheme } from './light';
export { DarkTheme } from './dark';

import { LightTheme } from './light';
import { DarkTheme } from './dark';

export const Themes = {
  light: LightTheme,
  dark: DarkTheme,
} as const;

export type Theme = typeof LightTheme | typeof DarkTheme;
export type ThemeName = keyof typeof Themes;
