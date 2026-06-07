import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Icon } from './Icon';

type Tone = 'primary' | 'ghost' | 'soft' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  tone?: Tone;
  full?: boolean;
  size?: Size;
  disabled?: boolean;
  icon?: string;
}

const PADS: Record<Size, { paddingVertical: number; paddingHorizontal: number }> = {
  sm: { paddingVertical: 9,  paddingHorizontal: 14 },
  md: { paddingVertical: 14, paddingHorizontal: 18 },
  lg: { paddingVertical: 17, paddingHorizontal: 20 },
};
const FS: Record<Size, object> = {
  sm: T.btnSm,
  md: T.btn,
  lg: T.btnLg,
};

export function Button({ children, onPress, tone = 'primary', full = false, size = 'md', disabled = false, icon }: ButtonProps) {
  const toneStyle = disabled
    ? { backgroundColor: C.ink12, borderWidth: 0 }
    : tone === 'primary' ? { backgroundColor: C.primary, borderWidth: 0 }
    : tone === 'ghost'   ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.ink12 }
    : tone === 'soft'    ? { backgroundColor: C.primarySoft, borderWidth: 0 }
    : /* danger */         { backgroundColor: C.errorSoft, borderWidth: 0 };

  const textColor = disabled ? C.ink35
    : tone === 'primary' ? '#fff'
    : tone === 'ghost'   ? C.ink
    : tone === 'soft'    ? C.primary
    : C.error;

  const iconSize = size === 'sm' ? 17 : 19;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        PADS[size],
        toneStyle,
        full && styles.full,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon && (
        <View style={{ marginRight: 8 }}>
          <Icon name={icon} size={iconSize} color={textColor} />
        </View>
      )}
      <Text style={[FS[size], { color: textColor }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  full: { width: '100%' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
