import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SectionLabel, Ornament } from '../../components/ui/SectionLabel';
import { Modal } from '../../components/ui/Modal';
import { Sheet } from '../../components/ui/Sheet';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';
import { describeMode, ruleTarget, ruleRounds, ruleWinRound, ruleBestOf, ruleBust } from '../../engine/rulesEngine';
import type { Rule, RulesConfig } from '../../engine/types';
import { uid } from '../../db/client';

const TRIGGERS = {
  on_point_added:    'When a point is scored',
  on_round_advanced: 'When a round ends',
  on_round_won:      'When a round is won',
};
const SUBJECTS = {
  'player.score':     "Scorer's total",
  'match.round':      'Current round',
  'opponent.max':     'Top rival score',
  'player.roundWins': 'Rounds won',
};
const OPERATORS = {
  EQ: '=', GT: '>', GTE: '≥', LT: '<', LTE: '≤', MOD: 'mod',
};
const CONSEQUENCES = {
  END_MATCH:     { label: 'End the match',      needsValue: false, needsWinner: true },
  WIN_ROUND:     { label: 'Win the round',       needsValue: false, needsWinner: true },
  SET_VALUE:     { label: "Set scorer's total",  needsValue: true,  needsWinner: false },
  MODIFY_VALUE:  { label: 'Adjust scorer by',    needsValue: true,  needsWinner: false },
  UPDATE_STATUS: { label: 'Eliminate scorer',    needsValue: false, needsWinner: false },
};
const TEMPLATES = [
  { label: 'Target score', make: () => [ruleTarget(5)] },
  { label: 'Best of 3', make: () => [ruleWinRound(21), ruleBestOf(2)] },
  { label: 'Exact + bust', make: () => [ruleBust(21, 15), { trigger_event: 'on_point_added', logical_gate: 'AND', conditions: [{ subject: 'player.score', operator: 'EQ', threshold: 21 }], consequence: { action: 'END_MATCH', winner: 'acting' } } as Rule] },
  { label: 'Round limit', make: () => [ruleRounds(6)] },
];

const newRule = (): Rule => ({
  id: uid('r'), trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GTE', threshold: 5 }],
  consequence: { action: 'END_MATCH', winner: 'acting' },
});

function ModeModal({
  gameId,
  editMode,
  onClose,
}: {
  gameId: string;
  editMode?: any;
  onClose: () => void;
}) {
  const { createMode, updateMode, showToast } = useApp();
  const [name, setName] = useState(editMode?.name || '');
  const [rules, setRules] = useState<Rule[]>(() =>
    editMode?.rules?.rules?.map((r: any) => ({ id: r.id || uid('r'), ...r })) || [newRule()]
  );
  const [autoReset, setAutoReset] = useState(editMode?.rules?.auto_reset || false);

  const save = async () => {
    if (!name.trim()) { showToast({ msg: 'Name the mode first', tone: 'warn', icon: 'close' }); return; }
    if (!rules.length) { showToast({ msg: 'Add at least one rule', tone: 'warn', icon: 'close' }); return; }
    const payload: RulesConfig = { rules, auto_reset: autoReset };
    if (editMode) {
      await updateMode(editMode.id, { name: name.trim(), rules: payload });
      showToast({ msg: `"${name.trim()}" updated`, tone: 'success', icon: 'check' });
    } else {
      await createMode(gameId, name.trim(), payload);
      showToast({ msg: `"${name.trim()}" saved`, tone: 'success', icon: 'check' });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={mm.header}>
          <Text style={[T.h2, { color: C.ink, flex: 1 }]}>{editMode ? 'Edit mode' : 'New mode'}</Text>
          <Pressable onPress={onClose} style={mm.closeBtn}>
            <Icon name="close" size={18} color={C.ink70} />
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={mm.body} showsVerticalScrollIndicator={false}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Mode name — e.g. First to 5"
            placeholderTextColor={C.ink35}
            style={mm.input}
            autoFocus
          />
          <Ornament label="Build the rules" />

          {/* Template chips */}
          <View style={mm.chips}>
            {TEMPLATES.map(t => (
              <Pressable key={t.label} onPress={() => setRules(r => [...r, ...t.make().map(x => ({ ...x, id: uid('r') }))])}
                style={({ pressed }) => [mm.chip, pressed && { opacity: 0.8 }]}>
                <Text style={[T.smallBold, { color: C.ink70 }]}>+ {t.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Rule cards */}
          <View style={mm.ruleList}>
            {rules.map((r, i) => (
              <View key={r.id || i} style={mm.ruleCard}>
                <View style={mm.ruleCardHeader}>
                  <View style={mm.ruleNum}><Text style={{ fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 11, color: C.primary }}>{i + 1}</Text></View>
                  <Text style={[T.label, { color: C.ink50, textTransform: 'uppercase', flex: 1 }]}>Trigger</Text>
                  <Pressable onPress={() => setRules(rs => rs.filter((_, j) => j !== i))}>
                    <Icon name="trash" size={16} color={C.ink35} />
                  </Pressable>
                </View>
                <View style={mm.selectRow}>
                  {Object.entries(TRIGGERS).map(([v, l]) => (
                    <Pressable key={v} onPress={() => setRules(rs => rs.map((x, j) => j === i ? { ...x, trigger_event: v as any } : x))}
                      style={[mm.selectOpt, r.trigger_event === v && mm.selectOptActive]}>
                      <Text style={[T.caption, { color: r.trigger_event === v ? C.primary : C.ink50 }]}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[T.label, { color: C.ink50, textTransform: 'uppercase', marginVertical: 8 }]}>If…</Text>
                {r.conditions.map((c, ci) => (
                  <View key={ci} style={mm.condRow}>
                    <View style={[mm.miniSelect, { flex: 2 }]}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {Object.entries(SUBJECTS).map(([v, l]) => (
                          <Pressable key={v} onPress={() => setRules(rs => rs.map((x, j) => j === i ? { ...x, conditions: x.conditions.map((k, ki) => ki === ci ? { ...k, subject: v as any } : k) } : x))}
                            style={[mm.miniOpt, c.subject === v && mm.miniOptActive]}>
                            <Text style={[T.caption, { color: c.subject === v ? C.primary : C.ink50 }]}>{l}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                    <View style={mm.opSelect}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {Object.entries(OPERATORS).map(([v, g]) => (
                          <Pressable key={v} onPress={() => setRules(rs => rs.map((x, j) => j === i ? { ...x, conditions: x.conditions.map((k, ki) => ki === ci ? { ...k, operator: v as any } : k) } : x))}
                            style={[mm.miniOpt, c.operator === v && mm.miniOptActive]}>
                            <Text style={[T.bodyBold, { color: c.operator === v ? C.primary : C.ink50 }]}>{g}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                    <TextInput
                      value={String(c.threshold)}
                      onChangeText={v => setRules(rs => rs.map((x, j) => j === i ? { ...x, conditions: x.conditions.map((k, ki) => ki === ci ? { ...k, threshold: isNaN(Number(v)) ? v : Number(v) } : k) } : x))}
                      keyboardType="numeric"
                      style={mm.numBox}
                    />
                  </View>
                ))}
                <Pressable onPress={() => setRules(rs => rs.map((x, j) => j === i ? { ...x, conditions: [...x.conditions, { subject: 'player.score', operator: 'GT', threshold: 0 }] } : x))}
                  style={mm.addCondBtn}>
                  <Text style={[T.smallBold, { color: C.ink50 }]}>+ Add condition</Text>
                </Pressable>

                <Text style={[T.label, { color: C.ink50, textTransform: 'uppercase', marginVertical: 8 }]}>Then…</Text>
                <View style={mm.selectRow}>
                  {Object.entries(CONSEQUENCES).map(([v, m]) => (
                    <Pressable key={v} onPress={() => setRules(rs => rs.map((x, j) => j === i ? { ...x, consequence: { action: v as any, ...(m.needsWinner ? { winner: 'acting' as const } : {}), ...(m.needsValue ? { value: 0 } : {}) } } : x))}
                      style={[mm.selectOpt, r.consequence.action === v && mm.selectOptActive]}>
                      <Text style={[T.caption, { color: r.consequence.action === v ? C.primary : C.ink50 }]}>{m.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            {!rules.length && (
              <View style={mm.emptyRules}>
                <Text style={[T.small, { color: C.ink50, textAlign: 'center' }]}>No rules. Add template above or blank rule below.</Text>
              </View>
            )}
          </View>

          <Pressable onPress={() => setRules(r => [...r, newRule()])} style={mm.addRuleBtn}>
            <Text style={[T.bodyBold, { color: C.ink70 }]}>+ Add blank rule</Text>
          </Pressable>

          <Ornament />
          <View style={mm.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[T.bodyBold, { color: C.ink }]}>Auto-reset on win</Text>
              <Text style={[T.small, { color: C.ink50, marginTop: 3 }]}>Archive &amp; re-spawn roster at 0</Text>
            </View>
            <Switch
              value={autoReset}
              onValueChange={setAutoReset}
              trackColor={{ true: C.primary, false: C.ink12 }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>

        <View style={mm.footer}>
          <Button full size="lg" onPress={save}>Save mode</Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ModeSelectorScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { games, modes, loadLibrary, renameGame, deleteGame, toast, showToast } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showNewMode, setShowNewMode] = useState(false);
  const [editMode, setEditMode] = useState<any>(null);
  const [showGameSheet, setShowGameSheet] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameName, setRenameName] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const game = games.find((g: any) => g.id === gameId);
  const gameModes = modes.filter((m: any) => m.game_id === gameId);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      loadLibrary();
    }, [gameId])
  );

  const openRename = () => {
    setRenameName(game?.name || '');
    setShowGameSheet(false);
    setTimeout(() => setShowRename(true), 320);
  };

  const openDelete = () => {
    setShowGameSheet(false);
    setTimeout(() => setShowDeleteConfirm(true), 320);
  };

  const doRename = async () => {
    if (!renameName.trim()) return;
    await renameGame(gameId, renameName.trim());
    showToast({ msg: 'Game renamed', tone: 'success', icon: 'check' });
    setShowRename(false);
  };

  const doDelete = async () => {
    await deleteGame(gameId);
    setShowDeleteConfirm(false);
    router.back();
  };

  if (!game) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <Header
          title={game.name}
          sub="Rule variations"
          onBack={() => router.back()}
          right={
            <Pressable
              onPress={() => setShowGameSheet(true)}
              style={s.moreBtn}
              hitSlop={6}
            >
              <Icon name="dots" size={20} color={C.ink70} />
            </Pressable>
          }
        />

        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel>{gameModes.length} {gameModes.length === 1 ? 'mode' : 'modes'}</SectionLabel>
            <View style={s.list}>
              {gameModes.length === 0 && (
                <View style={s.empty}>
                  <Text style={[T.body, { color: C.ink50, textAlign: 'center' }]}>
                    No modes yet.{'\n'}Tap <Text style={{ color: C.primary }}>New mode</Text> to build your first rule set.
                  </Text>
                </View>
              )}
              {gameModes.map((m: any) => (
                <Card key={m.id} pad={16}>
                  <Text style={[T.h3, { color: C.ink }]}>{m.name}</Text>
                  <View style={s.ruleBadge}>
                    <View style={s.ruleDot} />
                    <Text style={[T.smallBold, { color: C.ink70 }]}>{describeMode(m.rules)}</Text>
                  </View>
                  <View style={s.modeBtns}>
                    <Button
                      tone="primary" size="sm" icon="play"
                      onPress={() => router.push(`/(tabs)/play?modeId=${m.id}`)}
                    >
                      Start match
                    </Button>
                    <View style={{ width: 9 }} />
                    <Button tone="ghost" size="sm" icon="edit" onPress={() => setEditMode(m)}>Edit</Button>
                  </View>
                </Card>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* FAB */}
        <Pressable
          onPress={() => setShowNewMode(true)}
          style={({ pressed }) => [s.fab, { bottom: insets.bottom + 28 }, pressed && { opacity: 0.88 }]}
        >
          <Icon name="plus" size={20} color="#fff" />
          <Text style={[T.btnSm, { color: '#fff' }]}>New mode</Text>
        </Pressable>

        {/* Game actions sheet */}
        <Sheet open={showGameSheet} onClose={() => setShowGameSheet(false)}>
          <Text style={[T.h3, { color: C.ink, marginBottom: 4 }]}>{game.name}</Text>
          <Text style={[T.small, { color: C.ink50, marginBottom: 20 }]}>Manage this game</Text>
          <Pressable style={s.sheetAction} onPress={openRename}>
            <View style={s.sheetActionIcon}>
              <Icon name="edit" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.bodyBold, { color: C.ink }]}>Rename game</Text>
              <Text style={[T.small, { color: C.ink50, marginTop: 2 }]}>Change the display name</Text>
            </View>
            <Icon name="chevR" size={18} color={C.ink35} />
          </Pressable>
          <View style={s.sheetDivider} />
          <Pressable style={s.sheetAction} onPress={openDelete}>
            <View style={[s.sheetActionIcon, { backgroundColor: C.errorSoft }]}>
              <Icon name="trash" size={20} color={C.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.bodyBold, { color: C.error }]}>Delete game</Text>
              <Text style={[T.small, { color: C.ink50, marginTop: 2 }]}>Removes all modes permanently</Text>
            </View>
            <Icon name="chevR" size={18} color={C.ink35} />
          </Pressable>
        </Sheet>

        {/* Rename modal */}
        {showRename && (
          <Modal open onClose={() => setShowRename(false)}>
            <View style={s.renameModal}>
              <Text style={[T.h2, { color: C.ink, marginBottom: 16 }]}>Rename game</Text>
              <TextInput
                value={renameName}
                onChangeText={setRenameName}
                placeholder="Game name"
                placeholderTextColor={C.ink35}
                style={s.renameInput}
                autoFocus
                selectTextOnFocus
              />
              <Button full onPress={doRename}>Save</Button>
              <View style={{ height: 10 }} />
              <Button full tone="ghost" onPress={() => setShowRename(false)}>Cancel</Button>
            </View>
          </Modal>
        )}

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <Modal open onClose={() => setShowDeleteConfirm(false)}>
            <View style={s.renameModal}>
              <View style={s.deleteIconWrap}>
                <Icon name="trash" size={28} color={C.error} />
              </View>
              <Text style={[T.h2, { color: C.ink, textAlign: 'center', marginBottom: 8 }]}>Delete "{game.name}"?</Text>
              <Text style={[T.body, { color: C.ink50, textAlign: 'center', marginBottom: 24 }]}>
                All modes for this game will be permanently deleted. Matches are kept.
              </Text>
              <Button full tone="danger" onPress={doDelete}>Yes, delete</Button>
              <View style={{ height: 10 }} />
              <Button full tone="ghost" onPress={() => setShowDeleteConfirm(false)}>Cancel</Button>
            </View>
          </Modal>
        )}

        {showNewMode && (
          <ModeModal gameId={gameId} onClose={() => setShowNewMode(false)} />
        )}
        {editMode && editMode.id && (
          <ModeModal gameId={gameId} editMode={editMode} onClose={() => setEditMode(null)} />
        )}
        <Toast toast={toast} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 120 },
  moreBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.bgSunk,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { gap: 12 },
  empty: { padding: 40, borderWidth: 1.5, borderColor: C.ink12, borderStyle: 'dashed', borderRadius: 16, alignItems: 'center' },
  ruleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: C.bgSunk, alignSelf: 'flex-start', marginTop: 8,
  },
  ruleDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#B08A4F' },
  modeBtns: { flexDirection: 'row', marginTop: 14 },
  fab: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 14,
    ...SHADOW.lift,
  },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12,
  },
  sheetActionIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sheetDivider: {
    height: 1, backgroundColor: C.line, marginVertical: 4,
  },
  renameModal: { padding: 24 },
  renameInput: {
    borderWidth: 1.5, borderColor: C.ink12, backgroundColor: C.bgSunk,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16,
    fontFamily: 'Lato_700Bold', fontSize: 15, color: C.ink,
  },
  deleteIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.errorSoft, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
});

const mm = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 18, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.bgSunk, alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 18, paddingBottom: 8 },
  footer: { padding: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  input: {
    borderWidth: 1.5, borderColor: C.ink12, backgroundColor: '#fff',
    borderRadius: 14, padding: 13, marginBottom: 16,
    fontFamily: 'Lato_700Bold', fontSize: 15, color: C.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: {
    borderWidth: 1.5, borderColor: '#B08A4F', backgroundColor: C.warnSoft,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7,
  },
  ruleList: { gap: 12 },
  ruleCard: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.line,
    borderRadius: 16, padding: 14,
  },
  ruleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ruleNum: {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectOpt: {
    borderWidth: 1, borderColor: C.ink12, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  selectOptActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  condRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 },
  miniSelect: { flexDirection: 'row', gap: 4 },
  miniOpt: {
    borderWidth: 1, borderColor: C.ink12, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 5, marginRight: 4,
  },
  miniOptActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  opSelect: { flexDirection: 'row', gap: 4 },
  numBox: {
    width: 56, textAlign: 'center', borderWidth: 1.5, borderColor: C.ink12,
    backgroundColor: C.surfaceAlt, borderRadius: 10,
    padding: 9, fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 15, color: C.ink,
  },
  addCondBtn: {
    marginTop: 8, borderWidth: 1.5, borderColor: C.ink12, borderStyle: 'dashed',
    borderRadius: 10, padding: 8, alignItems: 'center',
  },
  emptyRules: {
    padding: 24, borderWidth: 1.5, borderColor: C.ink12,
    borderStyle: 'dashed', borderRadius: 14, alignItems: 'center',
  },
  addRuleBtn: {
    marginTop: 12, borderWidth: 1.5, borderColor: C.ink35, borderStyle: 'dashed',
    borderRadius: 14, padding: 12, alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
  },
});
