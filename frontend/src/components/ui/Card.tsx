import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { C } from '../../styles/tokens/colors';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  pad?: number;
  active?: boolean;
}

export function Card({ children, onPress, style, pad = 16, active = false }: CardProps) {
  const inner = (
    <View style={[
      styles.card,
      { padding: pad },
      active && styles.cardActive,
      style,
    ]}>
      {children}
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    // D&D tome border: gold top edge, dark ink sides/bottom
    borderTopWidth: 3,
    borderTopColor: '#B08A4F',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(44,54,63,0.20)',
    borderRightWidth: 2,
    borderRightColor: 'rgba(44,54,63,0.20)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(44,54,63,0.20)',
    // Deep shadow
    shadowColor: '#1C1610',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  cardActive: {
    borderTopColor: C.primary,
    borderLeftColor: C.primary,
    borderRightColor: C.primary,
    borderBottomColor: C.primary,
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.985 }],
  },
});
