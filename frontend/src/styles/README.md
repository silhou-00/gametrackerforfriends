# Design System

Game Tracker's comprehensive design system for consistent, game-integrated UI.

## Structure

```
styles/
├── tokens/           # Atomic design tokens (colors, typography, spacing, etc.)
│   ├── colors.ts     # Color palette (primary, accent, semantic, gradients)
│   ├── typography.ts # Font sizes, weights, line heights
│   ├── spacing.ts    # Padding, margin, gap scale (4px base unit)
│   ├── shadows.ts    # Elevation & shadow definitions
│   ├── radius.ts     # Border radius scale
│   └── index.ts      # Central export
├── themes/           # Theme definitions (light/dark mode)
│   ├── light.ts      # Bright, energetic theme
│   ├── dark.ts       # Deep, immersive theme
│   └── index.ts      # Theme export
└── components/       # Component-specific styles (future)
```

## Tokens

### Colors (`tokens/colors.ts`)

**Primary Brand:**
- `primary.main` (#0066ff) — main action color
- `primary.light` (#0080ff) — hover/light state
- `primary.dark` (#0052cc) — active/dark state

**Game States:**
- `game.leading` (#ffff00) — leading player highlight
- `game.winning` (#ffd700) — victory color
- `game.losing` (#ff6b6b) — defeat color

**Semantic:**
- `accent.success`, `accent.warning`, `accent.danger`, `accent.info`

**Mode-specific (Light/Dark):**
- `light.*` — light mode palette
- `dark.*` — dark mode palette

**Gradients:**
- `gradients.scoreboard` — blue gradient for scoreboards
- `gradients.victory` — gold gradient for winners
- `gradients.defeat` — red gradient for defeat

### Typography (`tokens/typography.ts`)

**Preset Styles:**
- `presets.title` — 30px, bold (headers)
- `presets.subtitle` — 20px, semibold (subheaders)
- `presets.body` — 16px, normal (body text)
- `presets.small` — 14px, normal (secondary text)
- `presets.code` — 12px, monospace (technical)

**Usage:**
```tsx
const styles = StyleSheet.create({
  heading: {
    ...TypographyTokens.presets.title,
  },
});
```

### Spacing (`tokens/spacing.ts`)

**Base Unit:** 4px

**Scale:** 1 (4px), 2 (8px), 3 (16px), 4 (24px), 5 (32px), 6 (64px)

**Semantic Names:** xs, sm, md, lg, xl, 2xl, 3xl

**Organized by context:**
- `padding.*` — padding values
- `margin.*` — margin values
- `gap.*` — flex gap values

**Usage:**
```tsx
const styles = StyleSheet.create({
  container: {
    padding: SpacingTokens.lg,    // 24px
    gap: SpacingTokens.md,        // 16px
  },
});
```

### Shadows (`tokens/shadows.ts`)

**Elevation Levels:**
- `elevation.xs` — subtle shadow (1px)
- `elevation.sm` — light shadow (2px)
- `elevation.md` — card shadow (4px)
- `elevation.lg` — raised shadow (8px)
- `elevation.xl` — floating shadow (16px)

**Game-specific Presets:**
- `game.card` — standard card depth
- `game.button` — button elevation
- `game.floating` — floating action button (FAB)

**Usage:**
```tsx
const styles = StyleSheet.create({
  card: {
    ...ShadowTokens.game.card,
  },
});
```

### Radius (`tokens/radius.ts`)

**Scale:** 0, 4, 8, 12, 16, 20, 24, 32, 9999 (full)

**Semantic Names:** none, xs, sm, md, lg, xl, 2xl, 3xl, full

**Component Presets:**
- `card` — 16px
- `button` — 8px
- `input` — 8px
- `badge` — 12px
- `avatar` — 9999 (circular)
- `fab` — 9999 (circular)

## Themes

### Light Theme (`themes/light.ts`)

Bright, energetic aesthetic for daytime use. Bold accents, clear contrast.

**Key Colors:**
- Background: #ffffff
- Surface: #f0f0f3
- Text: #000000
- Primary Action: #0066ff (bright blue)

### Dark Theme (`themes/dark.ts`)

Deep, immersive aesthetic for gaming. Eye-friendly, high contrast.

**Key Colors:**
- Background: #0a0a0a
- Surface: #1a1a2e
- Text: #ffffff
- Primary Action: #0080ff (brighter blue in dark)

### Using Themes

Themes are applied dynamically based on device color scheme:

```tsx
import { useColorScheme } from 'react-native';
import { Themes } from '@/styles/themes';

export default function Component() {
  const colorScheme = useColorScheme();
  const theme = Themes[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      {/* Component content */}
    </View>
  );
}
```

## Best Practices

### 1. Use Tokens, Not Magic Numbers

❌ **Don't:**
```tsx
const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#0066ff',
  },
});
```

✅ **Do:**
```tsx
import { SpacingTokens } from '@/styles/tokens/spacing';
import { ColorTokens } from '@/styles/tokens/colors';

const styles = StyleSheet.create({
  container: {
    padding: SpacingTokens.lg,
    backgroundColor: ColorTokens.primary.main,
  },
});
```

### 2. Reference Themes for Dynamic Colors

❌ **Don't:**
```tsx
const isDark = useColorScheme() === 'dark';
const bgColor = isDark ? '#1a1a2e' : '#ffffff';
```

✅ **Do:**
```tsx
import { Themes } from '@/styles/themes';

const colorScheme = useColorScheme();
const theme = Themes[colorScheme === 'dark' ? 'dark' : 'light'];
const bgColor = theme.colors.background;
```

### 3. Keep Component Styles in `styles/` Directory

New reusable component styles go in `styles/components/` as reference files.

### 4. Game-Feel Over Generic Defaults

- Use bold, distinctive typography
- Apply depth with shadows and gradients
- Use color for game state (leading, winning, losing)
- Animate score updates, round advances

## Extending the System

### Add a New Color

1. Edit `tokens/colors.ts`
2. Export from `tokens/index.ts`
3. Update both `themes/light.ts` and `themes/dark.ts` if needed

### Add a New Token Type

1. Create file in `tokens/` (e.g., `tokens/animations.ts`)
2. Export from `tokens/index.ts`
3. Import and use in components

### Customize a Theme

1. Edit `themes/light.ts` or `themes/dark.ts`
2. Change color values, add new component-specific styles
3. All components using the theme will automatically reflect changes
