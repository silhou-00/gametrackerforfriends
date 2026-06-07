import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  Switch, FlatList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';
import { describeMode } from '../../engine/rulesEngine';
import type { Game, GameMode } from '../../engine/types';

export default function PlayScreen() {
  const { games, modes, activeMatch, startMatch, toast, showToast, loadLibrary } = useApp();
  const router = useRouter();
  const { modeId } = useLocalSearchParams<{ modeId?: string }>();

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      loadLibrary();
    }, [])
  );

  // Pre-select mode from deep link (e.g. from library)
  useEffect(() => {
    if (!modeId || !modes.length) return;
    const m = modes.find(x => x.id === modeId);
    if (!m) return;
    const g = games.find(x => x.id === m.game_id);
    setSelectedMode(m);
    if (g) setSelectedGame(g);
  }, [modeId, modes, games]);

  // Navigate to scoreboard if there's already an active match
  useEffect(() => {
    if (activeMatch?.match.status === 'active') {
      router.replace('/play/scoreboard');
    }
  }, []);

  const gameModes = selectedGame
    ? modes.filter(m => m.game_id === selectedGame.id)
    : [];

  const validPlayers = playerNames.filter(n => n.trim().length > 0);

  const canStart = selectedMode && validPlayers.length >= 2;

  const addPlayer = () => setPlayerNames(p => [...p, '']);
  const removePlayer = (i: number) => {
    if (playerNames.length <= 2) return;
    setPlayerNames(p => p.filter((_, j) => j !== i));
  };
  const setName = (i: number, v: string) => setPlayerNames(p => p.map((x, j) => j === i ? v : x));

  const handleStart = async () => {
    if (!selectedMode || !canStart) return;
    if (validPlayers.length < 2) {
      showToast({ msg: 'Need at least 2 players', tone: 'warn', icon: 'close' });
      return;
    }
    setStarting(true);
    try {
      const modeWithRules = {
        ...selectedMode,
        rules: selectedMode.rules ?? JSON.parse(selectedMode.rules_config),
      };
      await startMatch(modeWithRules as any, validPlayers, false);
      router.push(`/play/scoreboard?voice=${voiceEnabled ? '1' : '0'}`);
    } catch (e) {
      showToast({ msg: 'Failed to start match', tone: 'error', icon: 'close' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <Header title="Play" sub="Set up a new match" />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Active match resume banner */}
          {activeMatch?.match.status === 'active' && (
            <Pressable
              onPress={() => router.push('/play/scoreboard')}
              style={({ pressed }) => [s.resumeBanner, pressed && { opacity: 0.88 }]}
            >
              <View style={s.resumeLeft}>
                <View style={s.resumeDot} />
                <View>
                  <Text style={[T.bodyBold, { color: C.ink }]}>Match in progress</Text>
                  <Text style={[T.small, { color: C.ink50, marginTop: 2 }]}>
                    {activeMatch.mode.name} · Round {activeMatch.match.current_round}
                  </Text>
                </View>
              </View>
              <View style={s.resumeBtn}>
                <Text style={[T.label, { color: C.primary }]}>Resume</Text>
                <Icon name="chevR" size={16} color={C.primary} />
              </View>
            </Pressable>
          )}

          {/* Game selector */}
          <SectionLabel>Choose a game</SectionLabel>
          {games.length === 0 ? (
            <Card pad={14}>
              <Text style={[T.body, { color: C.ink50, textAlign: 'center' }]}>
                No games yet.{'\n'}Go to Library to create one.
              </Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.gameChips}
            >
              {games.map(g => {
                const active = selectedGame?.id === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => { setSelectedGame(g); setSelectedMode(null); }}
                    style={[s.gameChip, active && s.gameChipActive]}
                  >
                    <Text style={[T.bodyBold, { color: active ? C.primary : C.ink70 }]}>{g.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Mode selector */}
          {selectedGame && (
            <>
              <SectionLabel>{selectedGame.name} · modes</SectionLabel>
              {gameModes.length === 0 ? (
                <Card pad={14}>
                  <Text style={[T.body, { color: C.ink50, textAlign: 'center' }]}>
                    No modes yet.{'\n'}Go to Library → {selectedGame.name}.
                  </Text>
                </Card>
              ) : (
                <View style={s.modeList}>
                  {gameModes.map(m => {
                    const active = selectedMode?.id === m.id;
                    const rules = m.rules ?? (() => { try { return JSON.parse(m.rules_config); } catch { return null; } })();
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => setSelectedMode(m)}
                        style={[s.modeCard, active && s.modeCardActive]}
                      >
                        <View style={s.modeRadio}>
                          <View style={[s.modeRadioInner, active && s.modeRadioInnerActive]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[T.bodyBold, { color: active ? C.primary : C.ink }]}>{m.name}</Text>
                          {rules && (
                            <Text style={[T.small, { color: C.ink50, marginTop: 3 }]}>{describeMode(rules)}</Text>
                          )}
                        </View>
                        {active && <Icon name="check" size={18} color={C.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* Roster */}
          <SectionLabel>Players</SectionLabel>
          <View style={s.roster}>
            {playerNames.map((n, i) => (
              <View key={i} style={s.playerRow}>
                <View style={s.playerNum}>
                  <Text style={{ fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 12, color: C.primary }}>{i + 1}</Text>
                </View>
                <TextInput
                  value={n}
                  onChangeText={v => setName(i, v)}
                  placeholder={`Player ${i + 1}`}
                  placeholderTextColor={C.ink35}
                  style={s.playerInput}
                  returnKeyType="next"
                />
                {playerNames.length > 2 && (
                  <Pressable onPress={() => removePlayer(i)} style={s.removeBtn} hitSlop={8}>
                    <Icon name="close" size={16} color={C.ink35} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={addPlayer} style={s.addPlayerBtn}>
              <Icon name="plus" size={16} color={C.ink50} />
              <Text style={[T.small, { color: C.ink50 }]}>Add player</Text>
            </Pressable>
          </View>

          {/* Voice toggle */}
          <View style={s.voiceRow}>
            <View style={s.voiceLeft}>
              <Icon name="mic" size={18} color={voiceEnabled ? C.primary : C.ink35} />
              <View>
                <Text style={[T.bodyBold, { color: C.ink }]}>Voice entry</Text>
                <Text style={[T.small, { color: C.ink50, marginTop: 2 }]}>Say "Player 1 plus 3" to score</Text>
              </View>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ true: C.primary, false: C.ink12 }}
              thumbColor="#fff"
            />
          </View>

          {/* Start CTA */}
          <View style={s.startWrap}>
            <Button
              full size="lg" icon="play"
              disabled={!canStart || starting}
              onPress={handleStart}
            >
              {starting ? 'Starting…' : 'Start match'}
            </Button>
            {!canStart && (
              <Text style={[T.small, { color: C.ink35, textAlign: 'center', marginTop: 8 }]}>
                {!selectedMode ? 'Select a game and mode first' : 'Add at least 2 players'}
              </Text>
            )}
          </View>
        </ScrollView>
        </Animated.View>
        <Toast toast={toast} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 100 },
  resumeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.successSoft, borderWidth: 1, borderColor: C.success,
    borderRadius: 16, padding: 14, marginBottom: 18,
  },
  resumeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resumeDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: C.success,
  },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gameChips: { paddingLeft: 0, paddingRight: 8, gap: 10, flexDirection: 'row', marginBottom: 8 },
  gameChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: C.bgSunk, borderWidth: 1.5, borderColor: C.ink12,
    borderRadius: 100,
  },
  gameChipActive: {
    backgroundColor: C.primarySoft, borderColor: C.primary,
  },
  modeList: { gap: 10, marginBottom: 8 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.ink12,
    borderRadius: 16, padding: 14,
  },
  modeCardActive: {
    borderColor: C.primary, backgroundColor: C.primarySoft,
  },
  modeRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.ink12,
    alignItems: 'center', justifyContent: 'center',
  },
  modeRadioInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent',
  },
  modeRadioInnerActive: {
    backgroundColor: C.primary,
  },
  roster: { gap: 10, marginBottom: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  playerNum: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  playerInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.ink12, backgroundColor: C.surface,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Lato_400Regular', fontSize: 15, color: C.ink,
  },
  removeBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: C.bgSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  addPlayerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.ink12, borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 11,
  },
  voiceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: 16, padding: 14, marginVertical: 16,
  },
  voiceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  startWrap: { marginTop: 4 },
});
