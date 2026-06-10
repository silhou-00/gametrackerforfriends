import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';

function Diamond({ filled }: { filled: boolean }) {
  return (
    <View style={[s.diamond, filled && s.diamondFilled]} />
  );
}

export default function RoundWinScreen() {
  const {
    activeMatch, roundWinEvent, clearRoundWinEvent,
    finishMatchEarly, confirmQuit, toast,
  } = useApp();
  const router = useRouter();
  const [showEndOptions, setShowEndOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const trophyScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(trophyScale, { toValue: 1, useNativeDriver: true, tension: 90, friction: 6 }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  // Guard: if no event or match, go home
  useEffect(() => {
    if (!roundWinEvent && !activeMatch) {
      router.replace('/(tabs)/library');
    }
  }, []);

  if (!activeMatch || !roundWinEvent) return null;

  const { players, roundWins, mode } = activeMatch;

  const bestOf: number = (() => {
    try {
      const r = mode.rules?.rules?.find(
        (x: any) => x.consequence?.action === 'END_MATCH' && x.trigger_event === 'on_round_won'
      );
      return Number(r?.conditions[0]?.threshold) || 0;
    } catch { return 0; }
  })();

  const handleNextRound = () => {
    clearRoundWinEvent();
    router.back();
  };

  const handleSaveEnd = async () => {
    setSaving(true);
    await finishMatchEarly();
    clearRoundWinEvent();
    router.replace('/play/victory');
  };

  const handleDiscard = () => {
    confirmQuit();
    clearRoundWinEvent();
    router.replace('/(tabs)/library');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Trophy */}
        <Animated.View style={[s.trophyWrap, { transform: [{ scale: trophyScale }] }]}>
          <View style={s.trophyCircle}>
            <Icon name="trophy" size={44} color={C.gold} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity }}>
          {/* Winner banner */}
          <View style={s.bannerWrap}>
            <Text style={[T.caption, { color: C.gold, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 }]}>
              Round {roundWinEvent.round} complete
            </Text>
            <Text style={[T.winner, { color: C.ink, textAlign: 'center' }]} numberOfLines={2}>
              {roundWinEvent.winnerName}
            </Text>
            <Text style={[T.h3, { color: C.ink50, textAlign: 'center', marginTop: 4 }]}>
              wins the round
            </Text>
          </View>

          {/* Round wins per player */}
          {bestOf > 0 && (
            <View style={s.card}>
              <Text style={[T.label, { color: C.ink50, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 14 }]}>
                Round standings
              </Text>
              {players.map(p => {
                const wins = roundWins[p.id] || 0;
                const isWinner = p.id === players.find(x => x.name === roundWinEvent.winnerName)?.id;
                return (
                  <View key={p.id} style={[s.playerRow, isWinner && s.playerRowWinner]}>
                    <Text style={[T.bodyBold, { color: isWinner ? C.primary : C.ink, flex: 1 }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View style={s.diamonds}>
                      {Array.from({ length: bestOf }).map((_, i) => (
                        <Diamond key={i} filled={i < wins} />
                      ))}
                    </View>
                    <Text style={[T.smallBold, { color: isWinner ? C.primary : C.ink50, marginLeft: 10, minWidth: 22, textAlign: 'right' }]}>
                      {wins}/{bestOf}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <View style={s.actions}>
            <Button full size="lg" onPress={handleNextRound} icon="chevR">
              Next round
            </Button>

            <View style={{ height: 12 }} />

            {!showEndOptions ? (
              <Button full size="lg" tone="ghost" onPress={() => setShowEndOptions(true)}>
                End match
              </Button>
            ) : (
              <View style={s.endOptions}>
                <Text style={[T.small, { color: C.ink50, textAlign: 'center', marginBottom: 14 }]}>
                  Save progress or discard this match?
                </Text>
                <Button
                  full tone="danger" size="lg"
                  onPress={handleSaveEnd}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save & end match'}
                </Button>
                <View style={{ height: 10 }} />
                <Button full tone="ghost" size="lg" onPress={handleDiscard}>
                  Discard match
                </Button>
                <View style={{ height: 10 }} />
                <Pressable onPress={() => setShowEndOptions(false)} style={s.cancelLink}>
                  <Text style={[T.smallBold, { color: C.ink50 }]}>← Keep playing</Text>
                </Pressable>
              </View>
            )}
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
  trophyWrap: { alignItems: 'center', marginTop: 48, marginBottom: 8 },
  trophyCircle: {
    width: 96, height: 96, borderRadius: 30,
    backgroundColor: C.warnSoft, borderWidth: 2, borderColor: C.gold,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.lift,
  },
  bannerWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  card: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.ink12,
    borderRadius: 20, padding: 18, marginBottom: 24,
    ...SHADOW.card,
  },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.ink06,
  },
  playerRowWinner: {
    backgroundColor: C.primarySoft, borderRadius: 12,
    paddingHorizontal: 8, marginHorizontal: -8, borderBottomColor: 'transparent',
  },
  diamonds: { flexDirection: 'row', gap: 5 },
  diamond: {
    width: 10, height: 10, borderRadius: 2,
    borderWidth: 1.5, borderColor: C.gold, backgroundColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  diamondFilled: { backgroundColor: C.gold },
  actions: { gap: 0 },
  endOptions: {
    backgroundColor: C.bgSunk, borderRadius: 18,
    borderWidth: 1, borderColor: C.ink12,
    padding: 18,
  },
  cancelLink: { alignItems: 'center', paddingVertical: 4 },
});
