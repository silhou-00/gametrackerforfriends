// PointDrop Design Tokens — Parchment / Tabletop palette
export const C = {
  // Backgrounds
  bg:          '#FAF7F2',   // Warm parchment
  bgSunk:      '#EDE8DF',   // Deeper parchment for wells
  surface:     '#FFFFFF',   // Card stock
  surfaceAlt:  '#FDFAF6',

  // Brand
  primary:     '#D97757',   // Terracotta
  primaryInk:  '#FFF8F2',
  primarySoft: '#F5E0D5',

  // Text
  ink:         '#2C363F',   // Soft charcoal
  ink70:       'rgba(44,54,63,0.70)',
  ink50:       'rgba(44,54,63,0.52)',
  ink35:       'rgba(44,54,63,0.34)',
  ink12:       'rgba(44,54,63,0.13)',
  ink06:       'rgba(44,54,63,0.06)',

  // State palette
  connect:     '#5C80BC',   // Muted Steel Blue
  success:     '#4A7C59',   // Forest Green
  warn:        '#D4A373',   // Sand
  error:       '#B0413E',   // Rust Red

  connectSoft: '#DEE6F1',
  successSoft: '#DCE8DE',
  warnSoft:    '#EFE2C7',
  errorSoft:   '#EEDAD7',

  // Accents
  gold:        '#B08A4F',
  line:        'rgba(44,54,63,0.13)',
};

export const SHADOW = {
  card:  {
    shadowColor: '#2C363F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  lift: {
    shadowColor: '#2C363F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  modal: {
    shadowColor: '#1C160E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.40,
    shadowRadius: 40,
    elevation: 20,
  },
};
