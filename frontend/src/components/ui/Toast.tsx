import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Icon } from './Icon';
import type { ToastOpts } from '../../context/AppContext';

interface ToastProps {
  toast: ToastOpts | null;
}

const TONE_COLOR: Record<string, string> = {
  primary: C.ink,
  success: C.success,
  error:   C.error,
  connect: C.connect,
  warn:    C.warn,
};

export function Toast({ toast }: ToastProps) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [toast?.key]);

  if (!toast) return null;

  const bg = TONE_COLOR[toast.tone || 'primary'] || C.ink;

  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: bg },
      { transform: [{ translateY }], opacity },
    ]}>
      {toast.icon && (
        <View style={{ marginRight: 10 }}>
          <Icon name={toast.icon} size={18} color="#fff" />
        </View>
      )}
      <Text style={[T.smallBold, { color: '#fff', flex: 1, lineHeight: 18 }]}>{toast.msg}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 60,
    ...SHADOW.lift,
  },
});
