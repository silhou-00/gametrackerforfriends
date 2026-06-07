import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../context/AppContext';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { getServerUrl } from '../(tabs)/settings';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { Toast } from '../../components/ui/Toast';
import type { Player, AuditLog } from '../../engine/types';

function scoreOf(logs: AuditLog[], playerId: string) {
  return logs.filter(l => l.player_id === playerId).reduce((s, l) => s + l.delta_value, 0);
}

function roundScoreOf(logs: AuditLog[], playerId: string, round: number) {
  return logs
    .filter(l => l.player_id === playerId && l.round === round)
    .reduce((s, l) => s + l.delta_value, 0);
}

function RoundDiamonds({ wins, bestOf }: { wins: number; bestOf: number }) {
  const total = bestOf || 3;
  return (
    <View style={rd.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[rd.diamond, i < wins && rd.diamondFilled]} />
      ))}
    </View>
  );
}
const rd = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, marginTop: 6 },
  diamond: {
    width: 10, height: 10, borderRadius: 2,
    borderWidth: 1.5, borderColor: C.gold, backgroundColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  diamondFilled: { backgroundColor: C.gold },
});

function PlayerCard({
  player, score, roundScore, roundWins, bestOf, roundBased, onAdd, onSub,
}: {
  player: Player;
  score: number;
  roundScore: number;
  roundWins: number;
  bestOf: number;
  roundBased: boolean;
  onAdd: () => void;
  onSub: () => void;
}) {
  const flash = useRef(new Animated.Value(0)).current;

  const triggerFlash = (add: boolean) => {
    flash.setValue(add ? 1 : -1);
    Animated.timing(flash, { toValue: 0, duration: 400, useNativeDriver: false }).start();
    if (add) onAdd(); else onSub();
  };

  const bgColor = flash.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [C.errorSoft, C.surface, C.successSoft],
  });

  return (
    <Animated.View style={[pc.card, { backgroundColor: bgColor }]}>
      <Text style={[T.h3, { color: C.ink, textAlign: 'center' }]} numberOfLines={1}>{player.name}</Text>
      <Text style={[T.score, { color: C.primary, textAlign: 'center' }]}>{score}</Text>
      {roundBased && (
        <Text style={[T.small, { color: C.ink50, textAlign: 'center' }]}>+{roundScore} this round</Text>
      )}
      {roundBased && bestOf > 0 && (
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <RoundDiamonds wins={roundWins} bestOf={bestOf} />
        </View>
      )}
      <View style={pc.btns}>
        <Pressable onPress={() => triggerFlash(false)} style={[pc.btn, pc.subBtn]} hitSlop={6}>
          <Icon name="minus" size={22} color={C.ink70} />
        </Pressable>
        <Pressable onPress={() => triggerFlash(true)} style={[pc.btn, pc.addBtn]} hitSlop={6}>
          <Icon name="plus" size={22} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const pc = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 20, padding: 14,
    borderWidth: 1.5, borderColor: C.ink12,
    ...SHADOW.card,
  },
  btns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: { backgroundColor: C.primary },
  subBtn: { backgroundColor: C.bgSunk, borderWidth: 1, borderColor: C.ink12 },
});

export default function ScoreboardScreen() {
  const { activeMatch, addPoint, nextRound, confirmQuit, toast } = useApp();
  const router = useRouter();
  const { voice } = useLocalSearchParams<{ voice?: string }>();
  const voiceEnabled = voice === '1';
  const [showQuit, setShowQuit] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    getServerUrl().then(setServerUrl);
  }, []);

  // Navigate to victory when match finishes
  useEffect(() => {
    if (activeMatch?.match.status === 'finished') {
      router.replace('/play/victory');
    }
  }, [activeMatch?.match.status]);

  // Guard
  useEffect(() => {
    if (!activeMatch) router.replace('/(tabs)/library');
  }, []);

  const { active: voiceActive, error: voiceError } = useVoiceSession({
    enabled: voiceEnabled,
    matchId: activeMatch?.match.id,
    players: activeMatch?.players ?? [],
    modeName: activeMatch?.mode.name ?? '',
    serverUrl,
    addPoint,
    nextRound,
  });

  if (!activeMatch) return null;

  const { match, mode, players, logs, roundWins, roundBased } = activeMatch;

  const bestOf = (() => {
    try {
      const r = mode.rules?.rules?.find((x: any) => x.consequence?.action === 'END_MATCH' && x.trigger_event === 'on_round_won');
      return r?.conditions[0]?.threshold || 0;
    } catch { return 0; }
  })();

  const sorted = [...players];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => setShowQuit(true)} style={s.quitBtn} hitSlop={6}>
            <Icon name="close" size={20} color={C.ink70} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[T.h3, { color: C.ink }]}>{mode.name}</Text>
            {roundBased && (
              <Text style={[T.small, { color: C.ink50, marginTop: 2 }]}>Round {match.current_round}</Text>
            )}
            {voiceActive && (
              <View style={s.micBadge}>
                <Icon name="mic" size={12} color={C.success} />
                <Text style={[T.caption, { color: C.success }]}>Voice active</Text>
              </View>
            )}
            {voiceError && (
              <Text style={[T.caption, { color: C.error, marginTop: 2 }]} numberOfLines={1}>{voiceError}</Text>
            )}
          </View>
          {roundBased ? (
            <Pressable onPress={nextRound} style={s.roundBtn} hitSlop={6}>
              <Text style={[T.smallBold, { color: C.primary }]}>Next round</Text>
              <Icon name="chevR" size={14} color={C.primary} />
            </Pressable>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>

        {/* Player grid */}
        <ScrollView
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
        >
          {sorted.map((p, i) => {
            const score = scoreOf(logs, p.id);
            const rScore = roundScoreOf(logs, p.id, match.current_round);
            const rWins = roundWins[p.id] || 0;
            // Pair items: [0,1], [2,3], [4,5]...
            if (i % 2 !== 0) return null; // skip odd, rendered with previous
            const p2 = sorted[i + 1];
            return (
              <View key={p.id} style={s.row}>
                <PlayerCard
                  player={p}
                  score={score}
                  roundScore={rScore}
                  roundWins={rWins}
                  bestOf={bestOf}
                  roundBased={roundBased}
                  onAdd={() => addPoint(p.id, 1)}
                  onSub={() => addPoint(p.id, -1)}
                />
                {p2 ? (
                  <PlayerCard
                    player={p2}
                    score={scoreOf(logs, p2.id)}
                    roundScore={roundScoreOf(logs, p2.id, match.current_round)}
                    roundWins={roundWins[p2.id] || 0}
                    bestOf={bestOf}
                    roundBased={roundBased}
                    onAdd={() => addPoint(p2.id, 1)}
                    onSub={() => addPoint(p2.id, -1)}
                  />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Live standings strip */}
        <View style={s.standings}>
          {[...players]
            .sort((a, b) => scoreOf(logs, b.id) - scoreOf(logs, a.id))
            .map((p, i) => (
              <View key={p.id} style={s.standingPip}>
                <Text style={[T.caption, { color: i === 0 ? C.primary : C.ink50 }]} numberOfLines={1}>
                  {p.name.split(' ')[0]}
                </Text>
                <Text style={[T.label, { color: i === 0 ? C.primary : C.ink70, fontWeight: '800' }]}>
                  {scoreOf(logs, p.id)}
                </Text>
              </View>
            ))}
        </View>
      </View>

      {/* Quit confirm sheet */}
      <Sheet open={showQuit} onClose={() => setShowQuit(false)} title="Leave match?">
        <Text style={[T.body, { color: C.ink50, marginBottom: 20, paddingHorizontal: 4 }]}>
          This match won't be saved to history.
        </Text>
        <Button full tone="danger" onPress={() => { setShowQuit(false); confirmQuit(); router.replace('/(tabs)/library'); }}>
          Leave without saving
        </Button>
        <View style={{ height: 10 }} />
        <Button full tone="ghost" onPress={() => setShowQuit(false)}>Keep playing</Button>
      </Sheet>

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  quitBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: C.bgSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  micBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.successSoft, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  roundBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: C.primarySoft, borderRadius: 100, borderWidth: 1, borderColor: C.primary,
  },
  grid: {
    padding: 14, gap: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  standings: {
    flexDirection: 'row', gap: 6, flexWrap: 'nowrap',
    backgroundColor: C.bgSunk, borderTopWidth: 1, borderTopColor: C.line,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  standingPip: { alignItems: 'center', gap: 2, minWidth: 44, flex: 1 },
});
