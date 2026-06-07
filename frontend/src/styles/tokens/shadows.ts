// Shadow & Elevation Tokens
// Game tracker uses depth for immersive feel

export const ShadowTokens = {
  // Elevation levels
  elevation: {
    none: {
      shadowColor: 'transparent',
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      elevation: 1,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    sm: {
      shadowColor: '#000',
      elevation: 2,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    md: {
      shadowColor: '#000',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    lg: {
      shadowColor: '#000',
      elevation: 8,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    xl: {
      shadowColor: '#000',
      elevation: 16,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
  },

  // Game-specific shadows
  game: {
    card: {
      shadowColor: '#000',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    button: {
      shadowColor: '#000',
      elevation: 3,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    floating: {
      shadowColor: '#000',
      elevation: 8,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
  },

  // Border styles for depth layering
  borders: {
    thin: 1,
    medium: 2,
    thick: 3,
    extraThick: 4,
  },

  // Outline styles (dark outer border for depth)
  outlines: {
    button: {
      borderWidth: 3,
      borderColor: 'rgba(0, 0, 0, 0.3)',
    },
    card: {
      borderWidth: 4,
      borderColor: 'rgba(0, 0, 0, 0.2)',
    },
    badge: {
      borderWidth: 2,
      borderColor: 'rgba(0, 0, 0, 0.25)',
    },
  },
};

export type ShadowToken = typeof ShadowTokens;
