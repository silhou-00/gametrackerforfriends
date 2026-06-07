import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Icon } from './Icon';

interface HeaderProps {
  title: string;
  sub?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function Header({ title, sub, onBack, right }: HeaderProps) {
  return (
    <View style={styles.container}>
      {/* Left slot */}
      <View style={styles.side}>
        {onBack && (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Icon name="back" size={22} color={C.ink} />
          </Pressable>
        )}
      </View>

      {/* Center — title + ornament flanking */}
      <View style={styles.centerBlock} pointerEvents="none">
        <View style={styles.titleRow}>
          <View style={styles.flanker} />
          <View style={styles.flankerDiamond} />
          <Text style={[T.h2, styles.titleText]} numberOfLines={1}>{title}</Text>
          <View style={styles.flankerDiamond} />
          <View style={styles.flanker} />
        </View>
        {sub && (
          <Text style={[T.small, styles.subText]} numberOfLines={1}>{sub}</Text>
        )}
      </View>

      {/* Right slot */}
      <View style={styles.side}>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(44,54,63,0.12)',
    backgroundColor: C.bg,
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(44,54,63,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(44,54,63,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  titleText: {
    color: C.ink,
    textAlign: 'center',
    flexShrink: 1,
    paddingHorizontal: 8,
  },
  flanker: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#B08A4F',
    opacity: 0.45,
  },
  flankerDiamond: {
    width: 5, height: 5,
    backgroundColor: '#B08A4F',
    opacity: 0.55,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 4,
  },
  subText: {
    color: C.ink50,
    marginTop: 3,
    textAlign: 'center',
  },
});
