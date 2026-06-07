import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Modal } from '../../components/ui/Modal';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';

function Stamp({ text, size = 46 }: { text: string; size?: number }) {
  const initials = text.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const fontSize = Math.round(size * 0.36);
  return (
    <View style={[styles.stamp, { width: size, height: size, borderRadius: 12 }]}>
      <Text style={{ fontFamily: 'RobotoSlab_800ExtraBold', fontSize, color: C.primary }}>{initials}</Text>
    </View>
  );
}

function CreateGameModal({ onClose }: { onClose: () => void }) {
  const { createGame, showToast } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');

  const submit = async () => {
    if (!name.trim()) { showToast({ msg: 'Name your game first', tone: 'warn', icon: 'close' }); return; }
    const g = await createGame(name.trim());
    showToast({ msg: `"${name.trim()}" created`, tone: 'success', icon: 'check' });
    onClose();
    router.push(`/library/${g.id}`);
  };

  return (
    <Modal open onClose={onClose}>
      <View style={styles.modalInner}>
        <View style={styles.modalIconWrap}>
          <Icon name="library" size={26} color={C.primary} />
        </View>
        <Text style={[T.h2, { color: C.ink, textAlign: 'center', marginBottom: 6 }]}>New game</Text>
        <Text style={[T.small, { color: C.ink50, textAlign: 'center', marginBottom: 16 }]}>
          A parent category. Next you'll build its first mode.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          placeholder="e.g. Poker Night"
          placeholderTextColor={C.ink35}
          style={styles.input}
          autoFocus
        />
        <View style={styles.modalBtns}>
          <Button full tone="ghost" onPress={onClose}>Cancel</Button>
          <View style={{ width: 10 }} />
          <Button full onPress={submit}>Create &amp; add mode</Button>
        </View>
      </View>
    </Modal>
  );
}

export default function LibraryScreen() {
  const { games, modes, loadLibrary, toast } = useApp();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      loadLibrary();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Header
          title="Library"
          sub={`${games.length} game${games.length !== 1 ? 's' : ''} · tap to manage modes`}
        />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* New game CTA */}
          <Pressable
            onPress={() => setShowCreate(true)}
            style={({ pressed }) => [styles.newGameBtn, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.newGameIcon}>
              <Icon name="plus" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.h3, { color: '#fff', letterSpacing: 0.2 }]}>New game</Text>
              <Text style={[T.small, { color: 'rgba(255,255,255,0.82)', marginTop: 3 }]}>
                Start a category &amp; build its first mode
              </Text>
            </View>
            <Icon name="chevR" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>

          <SectionLabel>Your games</SectionLabel>
          <View style={styles.list}>
            {games.map(g => {
              const count = modes.filter(m => m.game_id === g.id).length;
              return (
                <Card key={g.id} onPress={() => router.push(`/library/${g.id}`)} pad={14}>
                  <View style={styles.gameRow}>
                    <Stamp text={g.name} />
                    <View style={{ flex: 1 }}>
                      <Text style={[T.h3, { color: C.ink }]}>{g.name}</Text>
                      <Text style={[T.small, { color: C.ink50, marginTop: 4 }]}>
                        {count} {count === 1 ? 'mode' : 'modes'}
                      </Text>
                    </View>
                    <Icon name="chevR" size={20} color={C.ink35} />
                  </View>
                </Card>
              );
            })}
            {games.length === 0 && (
              <View style={styles.empty}>
                <Text style={[T.body, { color: C.ink50, textAlign: 'center' }]}>
                  No games yet.{'\n'}Tap <Text style={{ color: C.primary }}>New game</Text> to get started.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        </Animated.View>

        {showCreate && <CreateGameModal onClose={() => setShowCreate(false)} />}
        <Toast toast={toast} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 100 },
  newGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 20,
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 15,
    ...SHADOW.lift,
  },
  newGameIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  list: { gap: 12 },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stamp: {
    backgroundColor: C.primarySoft,
    borderWidth: 1, borderColor: '#B08A4F',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  empty: {
    padding: 40, borderWidth: 1.5, borderColor: C.ink12,
    borderStyle: 'dashed', borderRadius: 16,
  },
  modalInner: { padding: 22 },
  modalIconWrap: {
    width: 52, height: 52, borderRadius: 15,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 12,
  },
  input: {
    borderWidth: 1.5, borderColor: C.ink12, backgroundColor: '#fff',
    borderRadius: 14, padding: 13, marginBottom: 16,
    fontFamily: 'Lato_700Bold', fontSize: 15, color: C.ink,
  },
  modalBtns: { flexDirection: 'row' },
});
