import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  RobotoSlab_400Regular,
  RobotoSlab_700Bold,
  RobotoSlab_800ExtraBold,
} from '@expo-google-fonts/roboto-slab';
import {
  Lato_400Regular,
  Lato_700Bold,
} from '@expo-google-fonts/lato';
import { AppProvider } from '../context/AppContext';
import { initDatabase } from '../db/client';
import { C } from '../styles/tokens/colors';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  const [fontsLoaded] = useFonts({
    RobotoSlab_400Regular,
    RobotoSlab_700Bold,
    RobotoSlab_800ExtraBold,
    Lato_400Regular,
    Lato_700Bold,
  });

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch(e => {
        console.error('DB init failed', e);
        setDbReady(true); // still proceed
      });
  }, []);

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <AppProvider>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
        animationDuration: 260,
      }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="library/[gameId]" />
        <Stack.Screen name="play/scoreboard" options={{ gestureEnabled: false }} />
        <Stack.Screen name="play/victory" options={{ gestureEnabled: false }} />
        <Stack.Screen name="history/[matchId]" />
      </Stack>
    </AppProvider>
  );
}
