import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { C } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';

type Tone = 'success' | 'connect' | 'warn' | 'error' | 'idle';

interface StatusPillProps {
  tone?: Tone;
  label: string;
  pulse?: boolean;
  onPress?: () => void;
}

const COLOR: Record<Tone, string> = {
  success: C.success, connect: C.connect, warn: C.warn, error: C.error, idle: C.ink50,
};
const SOFT: Record<Tone, string> = {
  success: C.successSoft, connect: C.connectSoft, warn: C.warnSoft, error: C.errorSoft, idle: C.ink06,
};

export function StatusPill({ tone = 'idle', label, pulse = false, onPress }: StatusPillProps) {
  const pingAnim = useRef(new Animated.Value(1)).current;
  const pingOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(pingAnim, { toValue: 2.4, duration: 1400, useNativeDriver: true }),
        Animated.timing(pingOpacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const col = COLOR[tone];
  const soft = SOFT[tone];

  const inner = (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      <View style={styles.dotWrap}>
        {pulse && (
          <Animated.View style={[
            styles.dot,
            { backgroundColor: col },
            { transform: [{ scale: pingAnim }], opacity: pingOpacity },
          ]} />
        )}
        <View style={[styles.dot, { backgroundColor: col }]} />
      </View>
      <Text style={[T.caption, { color: col, fontWeight: '700', letterSpacing: 0.2 }]}>{label}</Text>
    </View>
  );

  if (!onPress) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  dotWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
