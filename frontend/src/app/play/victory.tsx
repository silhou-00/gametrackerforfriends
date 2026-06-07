import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';
import type { AuditLog } from '../../engine/types';

function scoreOf(logs: AuditLog[], playerId: string) {
  return logs.filter(l => l.player_id === playerId).reduce((s, l) => s + l.delta_value, 0);
}

export default function VictoryScreen() {
  const { activeMatch, rematch, endToHome, toast } = useApp();
  const router = useRouter();

  const trophyScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!activeMatch || activeMatch.match.status !== 'finished') {
      router.replace('/(tabs)/library');
      return;
    }
    Animated.sequence([
      Animated.spring(trophyScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!activeMatch || activeMatch.match.status !== 'finished') {
    return null;
  }

  const { match, mode, players, logs, roundWins, hash, winnerId } = activeMatch;
  const winner = players.find(p => p.id === winnerId);
  const standings = [...players].sort((a, b) => {
    if (roundWins[b.id] !== undefined && roundWins[a.id] !== undefined) {
      const rDiff = (roundWins[b.id] || 0) - (roundWins[a.id] || 0);
      if (rDiff !== 0) return rDiff;
    }
    return scoreOf(logs, b.id) - scoreOf(logs, a.id);
  });

  const hashDisplay = hash ? hash.slice(0, 16) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Trophy pop */}
        <Animated.View style={[s.trophyWrap, { transform: [{ scale: trophyScale }] }]}>
          <View style={s.trophyCircle}>
            <Icon name="trophy" size={52} color={C.gold} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity }}>
          {/* Winner banner */}
          {winner ? (
            <View style={s.winnerBanner}>
              <Text style={[T.winner, { color: C.primary, textAlign: 'center' }]}>{winner.name}</Text>
              <Text style={[T.h3, { color: C.ink50, textAlign: 'center', marginTop: 4 }]}>wins!</Text>
              <Text style={[T.small, { color: C.ink35, textAlign: 'center', marginTop: 6 }]}>
                {scoreOf(logs, winner.id)} pts · {mode.name}
              </Text>
            </View>
          ) : (
            <View style={s.winnerBanner}>
              <Text style={[T.h2, { color: C.ink, textAlign: 'center' }]}>Match complete</Text>
            </View>
          )}

          {/* Standings */}
          <View style={s.standingsCard}>
            <Text style={[T.label, { color: C.ink50, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }]}>
              Final standings
            </Text>
            {standings.map((p, i) => {
              const isWinner = p.id === winnerId;
              const rWins = roundWins[p.id] || 0;
              const total = scoreOf(logs, p.id);
              return (
                <View key={p.id} style={[s.standingRow, isWinner && s.standingRowWinner]}>
                  <Text style={[s.rankText, { color: isWinner ? C.primary : C.ink35 }]}>
                    #{i + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.bodyBold, { color: isWinner ? C.primary : C.ink }]}>{p.name}</Text>
                    {Object.keys(roundWins).length > 0 && (
                      <Text style={[T.small, { color: C.ink50, marginTop: 2 }]}>
                        {rWins} round{rWins !== 1 ? 's' : ''} won
                      </Text>
                    )}
                  </View>
                  <Text style={[T.h3, { color: isWinner ? C.primary : C.ink70 }]}>{total}</Text>
                  {isWinner && <Icon name="trophy" size={16} color={C.gold} />}
                </View>
              );
            })}
          </View>

          {/* HMAC integrity banner */}
          <View style={[s.hashBanner, hashDisplay ? s.hashValid : s.hashMissing]}>
            <Icon
              name={hashDisplay ? 'check' : 'close'}
              size={16}
              color={hashDisplay ? C.success : C.warn}
            />
            <View style={{ flex: 1 }}>
              <Text style={[T.smallBold, { color: hashDisplay ? C.success : C.warn }]}>
                {hashDisplay ? 'Match signed & tamper-evident' : 'Match unsigned — score integrity unverified'}
              </Text>
              {hashDisplay && (
                <Text style={[T.caption, { color: C.ink35, marginTop: 3, letterSpacing: 1 }]} selectable>
                  {hashDisplay}
                </Text>
              )}
            </View>
          </View>

          {/* CTAs */}
          <View style={s.ctaWrap}>
            <Button
              full size="lg" tone="ghost" icon="reset"
              onPress={async () => { await rematch(); router.replace('/play/scoreboard'); }}
            >
              Rematch
            </Button>
            <View style={{ height: 12 }} />
            <Button
              full size="lg"
              onPress={() => { endToHome(); router.replace('/(tabs)/library'); }}
            >
              Done
            </Button>
          </View>
        </Animated.View>
      </ScrollView>
      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  trophyWrap: { alignItems: 'center', marginTop: 40, marginBottom: 10 },
  trophyCircle: {
    width: 110, height: 110, borderRadius: 34,
    backgroundColor: C.warnSoft, borderWidth: 2, borderColor: C.gold,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.lift,
  },
  winnerBanner: { alignItems: 'center', marginBottom: 28 },
  standingsCard: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.ink12,
    borderRadius: 20, padding: 18, marginBottom: 16,
    ...SHADOW.card,
  },
  standingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.ink06,
  },
  standingRowWinner: {
    backgroundColor: C.primarySoft, borderRadius: 12, paddingHorizontal: 8,
    marginHorizontal: -8, borderBottomColor: 'transparent',
  },
  rankText: {
    fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 13, width: 28, textAlign: 'center',
  },
  hashBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 24,
  },
  hashValid: { backgroundColor: C.successSoft, borderColor: C.success },
  hashMissing: { backgroundColor: C.warnSoft, borderColor: C.warn },
  ctaWrap: { marginBottom: 20 },
});
