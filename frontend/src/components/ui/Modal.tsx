import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { C, SHADOW } from '../../styles/tokens/colors';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  fullPage?: boolean;
}

export function Modal({ open, onClose, children, fullPage = false }: ModalProps) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const translateY = useRef(new Animated.Value(fullPage ? 60 : 24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 260, mass: 0.8 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 280, mass: 0.9 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.94, duration: 140, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: fullPage ? 60 : 16, duration: 140, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  if (!open) return null;

  return (
    <View style={[styles.overlay, fullPage && styles.overlayFull]}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[
        styles.modal,
        fullPage && styles.modalFull,
        {
          transform: fullPage ? [{ translateY }] : [{ scale }, { translateY }],
          opacity,
        },
      ]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 55,
  },
  overlayFull: {
    justifyContent: 'flex-end',
    padding: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28,20,12,0.50)',
  },
  modal: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#B08A4F',
    overflow: 'hidden',
    maxHeight: '90%',
    ...SHADOW.modal,
  },
  modalFull: {
    height: '96%',
    maxHeight: '96%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
