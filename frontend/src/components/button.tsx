import { Pressable, StyleSheet, useColorScheme } from 'react-native';
import { ThemedText } from './themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '@/constants/theme';
import { Themes } from '@/styles/themes';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  onPress,
  label,
  variant = 'primary',
  disabled = false,
  size = 'md',
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const theme = Themes[colorScheme === 'dark' ? 'dark' : 'light'];

  const gradientColors = {
    primary: ['#0066ff', '#0052cc'],
    secondary: [theme.components.button.secondary, theme.components.button.secondary],
    success: ['#00cc66', '#00aa55'],
    danger: ['#ff6b6b', '#ee5a6f'],
  };

  const sizeStyles = {
    sm: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
    md: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
    lg: { paddingHorizontal: Spacing.five, paddingVertical: Spacing.three },
  };

  const textColor = variant === 'secondary' ? theme.colors.text : '#fff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={gradientColors[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyles[size]]}
      >
        <ThemedText
          style={[
            styles.label,
            { color: textColor },
            size === 'lg' && styles.labelLg,
          ]}
        >
          {label}
        </ThemedText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  labelLg: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.6,
  },
});
