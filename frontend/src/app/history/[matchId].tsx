import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useApp } from '../../context/AppContext';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Sheet } from '../../components/ui/Sheet';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';
import { verifyMatch } from '../../engine/hmac';
import { getServerUrl } from '../(tabs)/settings';
import type { AuditLog, Match, Player } from '../../engine/types';

function scoreOf(logs: AuditLog[], playerId: string) {
  return logs.filter(l => l.player_id === playerId).reduce((s, l) => s + l.delta_value, 0);
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function actionLabel(type: string, delta: number) {
  if (type === 'point_added') return delta > 0 ? `+${delta}` : `${delta}`;
  if (type === 'point_removed') return `${delta}`;
  if (type === 'penalty_applied') return `Penalty ${delta}`;
  if (type === 'bonus_applied') return `Bonus +${delta}`;
  return `${delta}`;
}

type MatchRow = Match & { players: Player[]; logs: AuditLog[] };

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { matches, toast, showToast } = useApp();
  const router = useRouter();

  const [integrity, setIntegrity] = useState<'checking' | 'valid' | 'invalid' | 'unsigned'>('checking');
  const [showPdf, setShowPdf] = useState(false);
  const [exporting, setExporting] = useState(false);

  const row = matches.find(m => m.id === matchId) as MatchRow | undefined;

  // HMAC verification
  useEffect(() => {
    if (!row) return;
    if (!row.hash_signature) { setIntegrity('unsigned'); return; }
    verifyMatch(row.id, row.logs, row.hash_signature).then(valid => {
      setIntegrity(valid ? 'valid' : 'invalid');
    });
  }, [row]);

  if (!row) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <Header title="Match" onBack={() => router.back()} />
        <View style={s.center}>
          <Text style={[T.body, { color: C.ink50 }]}>Match not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const winner = row.players.find(p => p.id === row.winner_id);
  const standings = [...row.players].sort((a, b) => scoreOf(row.logs, b.id) - scoreOf(row.logs, a.id));

  const integrityConfig = {
    checking: { color: C.ink35, bg: C.bgSunk,        border: C.ink12,  icon: 'check',  label: 'Verifying integrity…' },
    valid:    { color: C.success, bg: C.successSoft,  border: C.success, icon: 'check', label: 'Tamper-evident · signature valid' },
    invalid:  { color: C.error,   bg: C.errorSoft,    border: C.error,   icon: 'close', label: 'TAMPERED — signature mismatch' },
    unsigned: { color: C.warn,    bg: C.warnSoft,     border: C.warn,    icon: 'close', label: 'Unsigned match — no integrity guarantee' },
  }[integrity];

  const exportPdf = async () => {
    setExporting(true);
    try {
      const serverUrl = await getServerUrl();
      const payload = {
        match: row,
        players: row.players,
        logs: row.logs,
        standings: standings.map(p => ({
          name: p.name,
          score: scoreOf(row.logs, p.id),
          is_winner: p.id === row.winner_id,
        })),
      };
      const res = await fetch(`${serverUrl}/api/pdf/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      // Save to cache and share
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const path = `${FileSystem.cacheDirectory}pointdrop-match-${row.id}.pdf`;
          await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' });
          await Sharing.shareAsync(path, { mimeType: 'application/pdf' });
        } catch (e) {
          showToast({ msg: 'PDF saved but share failed', tone: 'warn', icon: 'close' });
        }
        setExporting(false);
      };
      reader.readAsDataURL(blob);
    } catch (e: any) {
      showToast({ msg: e?.message || 'PDF export failed', tone: 'error', icon: 'close' });
      setExporting(false);
    }
    setShowPdf(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <Header
          title={row.mode_name || row.title}
          sub={formatDate(row.finished_at || row.created_at)}
          onBack={() => router.back()}
          right={
            <Pressable onPress={() => setShowPdf(true)} style={s.pdfBtn} hitSlop={8}>
              <Icon name="pdf" size={20} color={C.ink70} />
            </Pressable>
          }
        />

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Integrity banner */}
          <View style={[s.integrityBanner, { backgroundColor: integrityConfig.bg, borderColor: integrityConfig.border }]}>
            {integrity === 'checking' ? (
              <ActivityIndicator size="small" color={C.ink50} />
            ) : (
              <Icon name={integrityConfig.icon} size={18} color={integrityConfig.color} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[T.bodyBold, { color: integrityConfig.color }]}>{integrityConfig.label}</Text>
              {row.hash_signature && integrity !== 'checking' && (
                <Text style={[T.caption, { color: C.ink35, marginTop: 4, letterSpacing: 1 }]} selectable>
                  {row.hash_signature.slice(0, 24)}…
                </Text>
              )}
            </View>
          </View>

          {/* Winner */}
          {winner && (
            <View style={s.winnerRow}>
              <Icon name="trophy" size={18} color={C.gold} />
              <Text style={[T.h3, { color: C.ink }]}>{winner.name} won</Text>
              <Text style={[T.body, { color: C.ink50 }]}>· {scoreOf(row.logs, winner.id)} pts</Text>
            </View>
          )}

          {/* Standings */}
          <SectionLabel>Standings</SectionLabel>
          <Card pad={14}>
            {standings.map((p, i) => (
              <View key={p.id} style={[s.standRow, i < standings.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.ink06 }]}>
                <Text style={[T.label, { color: C.ink35, width: 22 }]}>#{i + 1}</Text>
                <Text style={[T.bodyBold, { flex: 1, color: p.id === row.winner_id ? C.primary : C.ink }]}>{p.name}</Text>
                <Text style={[T.h4, { color: p.id === row.winner_id ? C.primary : C.ink70 }]}>
                  {scoreOf(row.logs, p.id)}
                </Text>
                {p.id === row.winner_id && <Icon name="trophy" size={14} color={C.gold} />}
              </View>
            ))}
          </Card>

          {/* Log ledger */}
          <SectionLabel>Score log · {row.logs.length} turns</SectionLabel>
          <View style={s.ledger}>
            {row.logs.length === 0 && (
              <View style={s.emptyLedger}>
                <Text style={[T.small, { color: C.ink50 }]}>No log entries.</Text>
              </View>
            )}
            {[...row.logs].reverse().map((log, i) => {
              const player = row.players.find(p => p.id === log.player_id);
              const isPositive = log.delta_value > 0;
              return (
                <View key={log.id} style={[s.logRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.ink06 }]}>
                  <View style={[s.logDelta, { backgroundColor: isPositive ? C.successSoft : C.errorSoft }]}>
                    <Text style={[T.smallBold, { color: isPositive ? C.success : C.error }]}>
                      {actionLabel(log.action_type, log.delta_value)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.bodyBold, { color: C.ink }]}>{player?.name ?? '—'}</Text>
                    <Text style={[T.small, { color: C.ink35 }]}>
                      Round {log.round} · {log.action_type.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* PDF export sheet */}
      <Sheet open={showPdf} onClose={() => setShowPdf(false)} title="Export PDF report">
        <Text style={[T.body, { color: C.ink50, marginBottom: 20 }]}>
          Generates a printable score report using your configured backend server.
        </Text>
        <Button full size="lg" icon="pdf" disabled={exporting} onPress={exportPdf}>
          {exporting ? 'Generating…' : 'Export to PDF'}
        </Button>
        <View style={{ height: 10 }} />
        <Button full tone="ghost" onPress={() => setShowPdf(false)}>Cancel</Button>
        {exporting && (
          <View style={s.exportProgress}>
            <ActivityIndicator color={C.primary} />
            <Text style={[T.small, { color: C.ink50 }]}>Contacting server…</Text>
          </View>
        )}
      </Sheet>

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 80 },
  pdfBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  integrityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 14,
  },
  winnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  standRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
  },
  ledger: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.ink12,
    overflow: 'hidden', ...SHADOW.card,
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  logDelta: {
    width: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 6,
  },
  emptyLedger: { padding: 24, alignItems: 'center' },
  exportProgress: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 14,
  },
});
