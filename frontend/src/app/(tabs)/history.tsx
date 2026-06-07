import React, { useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { C } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';
import type { Match, Player, AuditLog } from '../../engine/types';

type MatchRow = Match & { players: Player[]; logs: AuditLog[] };

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function scoreOf(logs: AuditLog[], playerId: string) {
  return logs.filter(l => l.player_id === playerId).reduce((s, l) => s + l.delta_value, 0);
}

function MatchCard({ row, onPress }: { row: MatchRow; onPress: () => void }) {
  const winner = row.players.find(p => p.id === row.winner_id);
  const signed = !!row.hash_signature;
  const standings = [...row.players].sort((a, b) =>
    scoreOf(row.logs, b.id) - scoreOf(row.logs, a.id)
  );

  return (
    <Card onPress={onPress} pad={15}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[T.h3, { color: C.ink }]}>{row.mode_name || row.title}</Text>
          <Text style={[T.small, { color: C.ink50, marginTop: 3 }]}>
            {formatDate(row.finished_at || row.created_at)} · {row.players.length} players
          </Text>
        </View>
        <View style={[s.integrityPill, signed ? s.pillValid : s.pillTampered]}>
          <View style={[s.pillDot, { backgroundColor: signed ? C.success : C.error }]} />
          <Text style={[T.smallBold, { color: signed ? C.success : C.error }]}>
            {signed ? 'Signed' : 'UNSIGNED'}
          </Text>
        </View>
      </View>

      {winner && (
        <View style={s.winnerRow}>
          <Icon name="trophy" size={15} color={C.gold} />
          <Text style={[T.bodyBold, { color: C.ink }]}>{winner.name}</Text>
          <Text style={[T.small, { color: C.ink50 }]}>
            · {scoreOf(row.logs, winner.id)} pts
          </Text>
        </View>
      )}

      {/* Standings strip */}
      <View style={s.strip}>
        {standings.slice(0, 4).map((p, i) => (
          <View key={p.id} style={s.stripPip}>
            <Text style={[T.caption, { color: i === 0 ? C.primary : C.ink50 }]}>
              {p.name.split(' ')[0]}
            </Text>
            <Text style={[T.label, { color: i === 0 ? C.primary : C.ink70 }]}>
              {scoreOf(row.logs, p.id)}
            </Text>
          </View>
        ))}
      </View>

      <View style={s.cardFooter}>
        <Text style={[T.small, { color: C.ink35 }]}>
          {row.logs.length} turns · tap for full log
        </Text>
        <Icon name="chevR" size={16} color={C.ink35} />
      </View>
    </Card>
  );
}

export default function HistoryScreen() {
  const { matches, loadMatches, toast } = useApp();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      loadMatches();
    }, [])
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <Header
          title="History"
          sub={`${matches.length} completed match${matches.length !== 1 ? 'es' : ''}`}
        />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel>All matches</SectionLabel>
          <View style={s.list}>
            {matches.length === 0 && (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Icon name="history" size={26} color={C.ink35} />
                </View>
                <Text style={[T.body, { color: C.ink50, textAlign: 'center', marginTop: 10 }]}>
                  No matches yet.{'\n'}Start one from the Play tab.
                </Text>
              </View>
            )}
            {[...matches].reverse().map(m => (
              <MatchCard
                key={m.id}
                row={m}
                onPress={() => router.push(`/history/${m.id}`)}
              />
            ))}
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
  list: { gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  integrityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1,
  },
  pillValid: { backgroundColor: C.successSoft, borderColor: C.success },
  pillTampered: { backgroundColor: C.errorSoft, borderColor: C.error },
  pillDot: { width: 5, height: 5, borderRadius: 2.5 },
  winnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  strip: {
    flexDirection: 'row', gap: 12, backgroundColor: C.bgSunk,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  stripPip: { alignItems: 'center', gap: 2, minWidth: 40 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  empty: {
    padding: 40, borderWidth: 1.5, borderColor: C.ink12,
    borderStyle: 'dashed', borderRadius: 16, alignItems: 'center',
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: C.bgSunk,
    alignItems: 'center', justifyContent: 'center',
  },
});
