import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';

interface SectionLabelProps {
  children: React.ReactNode;
  right?: React.ReactNode;
}

export function SectionLabel({ children, right }: SectionLabelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.lineRow}>
        <View style={styles.line} />
        <View style={styles.diamond} />
        <Text style={[T.label, styles.labelText]}>{children}</Text>
        <View style={styles.diamond} />
        <View style={styles.line} />
      </View>
      {right && <View style={styles.rightSlot}>{right}</View>}
    </View>
  );
}

export function Ornament({ label }: { label?: string }) {
  return (
    <View style={orn.ornament}>
      <View style={orn.line} />
      {label
        ? <Text style={[T.label, { color: '#B08A4F', textTransform: 'uppercase', fontSize: 10 }]}>{label}</Text>
        : <View style={orn.diamond} />
      }
      <View style={orn.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    marginBottom: 12,
    marginHorizontal: 2,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#B08A4F',
    opacity: 0.35,
  },
  diamond: {
    width: 5, height: 5,
    backgroundColor: '#B08A4F',
    opacity: 0.6,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 6,
  },
  labelText: {
    color: C.ink50,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontSize: 11,
  },
  rightSlot: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

const orn = StyleSheet.create({
  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  line: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(44,54,63,0.13)',
  },
  diamond: {
    width: 6, height: 6,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#B08A4F',
  },
});
