import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Icon } from './Icon';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TABS = [
  { name: 'library',  label: 'Library',  icon: 'library' },
  { name: 'play',     label: 'Play',     icon: 'play' },
  { name: 'history',  label: 'History',  icon: 'history' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

function TabItem({ t, focused, onPress }: { t: typeof TABS[0]; focused: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.84, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.tab}>
      <Animated.View style={[styles.iconWrap, focused && styles.iconWrapActive, { transform: [{ scale }] }]}>
        <Icon name={t.icon} size={22} color={focused ? C.primary : C.ink50} />
      </Animated.View>
      <Text style={[T.caption, { color: focused ? C.primary : C.ink50, fontWeight: focused ? '800' : '600' }]}>
        {t.label}
      </Text>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t, i) => (
        <TabItem
          key={t.name}
          t={t}
          focused={state.index === i}
          onPress={() => navigation.navigate(t.name)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 56,
    height: 30,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: C.primarySoft,
  },
});
