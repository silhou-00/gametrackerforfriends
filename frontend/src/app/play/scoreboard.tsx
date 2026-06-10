import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

function WinPips({ wins, bestOf }: { wins: number; bestOf: number }) {
  if (bestOf > 0) {
    return (
      <View style={wp.row}>
        {Array.from({ length: bestOf as number }).map((_, i) => (
          <View key={i} style={[wp.pip, i < wins && wp.pipFilled]} />
        ))}
      </View>
    );
  }
  return (
    <View style={wp.row}>
      {wins > 0 ? (
        Array.from({ length: Math.min(wins, 6) }).map((_, i) => (
          <View key={i} style={wp.pipFilled} />
        ))
      ) : (
        <View style={wp.pip} />
      )}
    </View>
  );
}

const wp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  pip: {
    width: 8, height: 8, borderRadius: 1.5,
    borderWidth: 1.5, borderColor: C.gold, backgroundColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  pipFilled: {
    width: 8, height: 8, borderRadius: 1.5,
    backgroundColor: C.gold,
    transform: [{ rotate: '45deg' }],
  },
});

const AVATAR_PALETTE = ['#D4785A', '#5A8ED4', '#5ABF8A', '#D4B85A', '#9A5AD4', '#5AD4C3'];

function PlayerCard({
  player, score, roundScore, roundWins, bestOf, roundBased, scopedScores, playerIndex, isLeader, onAdd, onSub,
}: {
  player: Player;
  score: number;
  roundScore: number;
  roundWins: number;
  bestOf: number;
  roundBased: boolean;
  scopedScores: boolean;
  playerIndex: number;
  isLeader: boolean;
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

  const [wrapH, setWrapH] = useState(0);
  const scoreFontSize = wrapH > 0 ? Math.max(28, Math.min(72, Math.round(wrapH * 0.48))) : 56;
  const avatarColor = AVATAR_PALETTE[playerIndex % AVATAR_PALETTE.length];

  return (
    <Animated.View style={[pc.card, isLeader && pc.cardLeader, { backgroundColor: bgColor }]}>
      {/* Top: avatar + name + wins */}
      <View style={pc.top}>
        <View style={[pc.avatar, { backgroundColor: avatarColor }]}>
          <Text style={pc.avatarText}>{player.name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={[T.h3, { color: C.ink, textAlign: 'center' }]} numberOfLines={1}>
          {player.name}
        </Text>
        {roundBased && (
          <View style={pc.winsRow}>
            {bestOf > 0 && <WinPips wins={roundWins} bestOf={bestOf} />}
            <Text style={[T.caption, { color: roundWins > 0 ? C.gold : C.ink35, marginLeft: bestOf > 0 ? 5 : 0 }]}>
              {roundWins}W
            </Text>
          </View>
        )}
      </View>

      {/* Middle: score fills remaining space, vertically centered */}
      <View style={pc.scoreWrap} onLayout={e => setWrapH(e.nativeEvent.layout.height)}>
        <Text style={[T.score, { color: C.primary, fontSize: scoreFontSize, lineHeight: scoreFontSize * 1.1 }]}>
          {scopedScores ? roundScore : score}
        </Text>
        {scopedScores && score !== roundScore && (
          <Text style={[T.caption, { color: C.ink35, marginTop: 2 }]}>{score} total</Text>
        )}
        {!scopedScores && roundBased && roundScore !== 0 && (
          <Text style={[T.caption, { color: roundScore > 0 ? C.success : C.error, marginTop: 2 }]}>
            {roundScore > 0 ? `+${roundScore}` : roundScore} this round
          </Text>
        )}
      </View>

      {/* Bottom: buttons */}
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
  top: { alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: {
    fontFamily: 'Lato_700Bold', fontSize: 22, color: '#fff',
  },
  winsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 6, gap: 2,
  },
  scoreWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  btns: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: { backgroundColor: C.primary },
  subBtn: { backgroundColor: C.bgSunk, borderWidth: 1, borderColor: C.ink12 },
  cardLeader: {
    borderColor: C.gold,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
});

export default function ScoreboardScreen() {
  const { activeMatch, addPoint, nextRound, confirmQuit, toast, roundWinEvent, games } = useApp();
  const router = useRouter();
  const { voice } = useLocalSearchParams<{ voice?: string }>();
  const voiceEnabled = voice === '1';
  const [showQuit, setShowQuit] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    getServerUrl().then(setServerUrl);
  }, []);

  useEffect(() => {
    if (!roundWinEvent) return;
    router.push('/play/roundwin');
  }, [roundWinEvent]);

  useEffect(() => {
    if (activeMatch?.match.status === 'finished') {
      router.replace('/play/victory');
    }
  }, [activeMatch?.match.status]);

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
  const gameName = games.find(g => g.id === mode.game_id)?.name ?? mode.name;

  const bestOf: number = (() => {
    try {
      const r = mode.rules?.rules?.find(
        (x: any) => x.consequence?.action === 'END_MATCH' && x.trigger_event === 'on_round_won'
      );
      return Number(r?.conditions[0]?.threshold) || 0;
    } catch { return 0; }
  })();

  const scopedScores = mode.rules?.round_scoped_scores ?? false;
  const sorted = [...players];

  const maxWins = Math.max(0, ...players.map(p => roundWins[p.id] || 0));
  const leaderId = maxWins > 0 && players.filter(p => (roundWins[p.id] || 0) === maxWins).length === 1
    ? players.find(p => (roundWins[p.id] || 0) === maxWins)?.id ?? null
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.container}>

        {/* ── Header ───────────────────────────────────────────── */}
        <View style={s.header}>
          <Pressable onPress={() => setShowQuit(true)} style={s.quitBtn} hitSlop={6}>
            <Icon name="close" size={20} color={C.ink70} />
          </Pressable>
          <View pointerEvents="none" style={s.headerCenter}>
            <Text style={[T.h3, { color: C.ink }]} numberOfLines={1}>{gameName}</Text>
            <Text style={[T.caption, { color: C.ink50, marginTop: 1 }]} numberOfLines={1}>{mode.name}</Text>
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
              <Text style={s.roundBtnText}>End round</Text>
              <Icon name="chevR" size={13} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        {/* ── Round banner ─────────────────────────────────────── */}
        {roundBased && (
          <View style={s.roundBanner}>
            <View style={s.roundLine} />
            <View style={s.roundCenter}>
              <Text style={s.roundLabel}>ROUND</Text>
              <Text style={s.roundNum}>{match.current_round}</Text>
            </View>
            <View style={s.roundLine} />
          </View>
        )}

        {/* ── Player grid ──────────────────────────────────────── */}
        {(() => {
          const needsScroll = sorted.length > 10;
          const makeCard = (p: Player, idx: number) => (
            <PlayerCard
              key={p.id}
              player={p}
              score={scoreOf(logs, p.id)}
              roundScore={roundScoreOf(logs, p.id, match.current_round)}
              roundWins={roundWins[p.id] || 0}
              bestOf={bestOf}
              roundBased={roundBased}
              scopedScores={scopedScores}
              playerIndex={idx}
              isLeader={p.id === leaderId}
              onAdd={() => addPoint(p.id, 1)}
              onSub={() => addPoint(p.id, -1)}
            />
          );
          const rows = sorted
            .filter((_, i) => i % 2 === 0)
            .map((p, ri) => {
              const p2 = sorted[ri * 2 + 1];
              return (
                <View key={p.id} style={[s.row, !needsScroll && { flex: 1 }]}>
                  {makeCard(p, ri * 2)}
                  {p2 ? makeCard(p2, ri * 2 + 1) : <View style={{ flex: 1 }} />}
                </View>
              );
            });
          return needsScroll ? (
            <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
              {rows}
            </ScrollView>
          ) : (
            <View style={s.gridFill}>{rows}</View>
          );
        })()}

        {/* ── Live standings strip ──────────────────────────────── */}
        <View style={s.standings}>
          {[...players]
            .sort((a, b) => {
              const sa = scopedScores ? roundScoreOf(logs, a.id, match.current_round) : scoreOf(logs, a.id);
              const sb = scopedScores ? roundScoreOf(logs, b.id, match.current_round) : scoreOf(logs, b.id);
              return sb - sa;
            })
            .map((p, i) => {
              const displayScore = scopedScores
                ? roundScoreOf(logs, p.id, match.current_round)
                : scoreOf(logs, p.id);
              return (
                <View key={p.id} style={s.standingPip}>
                  <Text style={[T.caption, { color: i === 0 ? C.primary : C.ink50 }]} numberOfLines={1}>
                    {p.name.split(' ')[0]}
                  </Text>
                  <Text style={[T.label, { color: i === 0 ? C.primary : C.ink70, fontWeight: '800' }]}>
                    {displayScore}
                  </Text>
                </View>
              );
            })}
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  quitBtn: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: C.bgSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    position: 'absolute', left: 0, right: 0, alignItems: 'center',
  },
  micBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.successSoft, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },

  // Round banner
  roundBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  roundLine: {
    flex: 1, height: 1.5,
    backgroundColor: C.gold, opacity: 0.35,
  },
  roundCenter: {
    alignItems: 'center', paddingHorizontal: 22,
  },
  roundLabel: {
    fontFamily: 'Lato_700Bold', fontSize: 10,
    color: C.gold, letterSpacing: 3.5,
    textTransform: 'uppercase',
  },
  roundNum: {
    fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 36,
    color: C.primary, lineHeight: 42,
  },

  // Round button (header)
  roundBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 11, paddingVertical: 8,
    backgroundColor: C.primary, borderRadius: 100,
  },
  roundBtnText: {
    fontFamily: 'Lato_700Bold', fontSize: 12, color: '#fff',
  },

  // Grid
  grid: { padding: 14, gap: 12 },
  gridFill: { flex: 1, padding: 14, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },

  // Standings
  standings: {
    flexDirection: 'row', gap: 6, flexWrap: 'nowrap',
    backgroundColor: C.bgSunk, borderTopWidth: 1, borderTopColor: C.line,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  standingPip: { alignItems: 'center', gap: 2, minWidth: 44, flex: 1 },
});
