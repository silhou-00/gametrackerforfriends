// PointDrop Typography Tokens
export const FONT_HEAD = 'RobotoSlab_800ExtraBold';
export const FONT_HEAD_BOLD = 'RobotoSlab_700Bold';
export const FONT_HEAD_REG = 'RobotoSlab_400Regular';
export const FONT_BODY = 'Lato_400Regular';
export const FONT_BODY_BOLD = 'Lato_700Bold';

export const T = {
  score:    { fontFamily: FONT_HEAD,      fontSize: 52, letterSpacing: -1 },
  winner:   { fontFamily: FONT_HEAD,      fontSize: 38, letterSpacing: -0.8 },
  h1:       { fontFamily: FONT_HEAD,      fontSize: 24, letterSpacing: -0.3 },
  h2:       { fontFamily: FONT_HEAD,      fontSize: 20, letterSpacing: -0.2 },
  h3:       { fontFamily: FONT_HEAD_BOLD, fontSize: 17 },
  h4:       { fontFamily: FONT_HEAD_BOLD, fontSize: 15 },
  body:     { fontFamily: FONT_BODY,      fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: FONT_BODY_BOLD, fontSize: 15 },
  small:    { fontFamily: FONT_BODY,      fontSize: 13 },
  smallBold:{ fontFamily: FONT_BODY_BOLD, fontSize: 13 },
  caption:  { fontFamily: FONT_BODY,      fontSize: 11.5 },
  label:    { fontFamily: FONT_BODY_BOLD, fontSize: 11.5, letterSpacing: 1.4 },
  btn:      { fontFamily: FONT_BODY_BOLD, fontSize: 16,   letterSpacing: 0.2 },
  btnSm:    { fontFamily: FONT_BODY_BOLD, fontSize: 14,   letterSpacing: 0.2 },
  btnLg:    { fontFamily: FONT_BODY_BOLD, fontSize: 17,   letterSpacing: 0.2 },
};

// Legacy TypographyTokens kept for backwards compat with existing components
export const TypographyTokens = {
  fonts: { display: FONT_HEAD, body: FONT_BODY, mono: 'monospace' },
};
export type TypographyToken = typeof TypographyTokens;
