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
  GTE: '≥  reaches',
  GT:  '>  exceeds',
  EQ:  '=  exactly',
  LTE: '≤  at or under',
  LT:  '<  below',
  MOD: '÷  every multiple of',
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

function SentenceChip({ label, active, onPress }: {
  label: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [mm.sentChip, active && mm.sentChipActive, pressed && { opacity: 0.8 }]}
    >
      <Text style={[T.smallBold, { color: active ? C.primary : C.ink, flexShrink: 1 }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={{ color: active ? C.primary : C.ink35, fontSize: 10, marginLeft: 3 }}>▾</Text>
    </Pressable>
  );
}

function HelpGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={[T.label, { color: C.ink50, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function HelpRow({ bold, desc }: { bold: string; desc: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[T.bodyBold, { color: C.ink }]}>{bold}</Text>
      <Text style={[T.small, { color: C.ink70, marginTop: 2, lineHeight: 18 }]}>{desc}</Text>
    </View>
  );
}

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
  const [roundScoped, setRoundScoped] = useState(editMode?.rules?.round_scoped_scores || false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeField, setActiveField] = useState<{ rIdx: number; field: string; cIdx?: number } | null>(null);

  const isActive = (rIdx: number, field: string, cIdx?: number) =>
    activeField?.rIdx === rIdx && activeField?.field === field && activeField?.cIdx === cIdx;

  const toggleField = (rIdx: number, field: string, cIdx?: number) =>
    setActiveField(prev =>
      prev && prev.rIdx === rIdx && prev.field === field && prev.cIdx === cIdx
        ? null : { rIdx, field, cIdx }
    );

  const updateTrigger = (rIdx: number, v: string) =>
    setRules(rs => rs.map((r, i) => i === rIdx ? { ...r, trigger_event: v as any } : r));

  const toggleLogicalGate = (rIdx: number) =>
    setRules(rs => rs.map((r, i) => i === rIdx ? {
      ...r, logical_gate: r.logical_gate === 'AND' ? 'OR' as const : 'AND' as const,
    } : r));

  const updateConsequence = (rIdx: number, v: string, meta: typeof CONSEQUENCES[keyof typeof CONSEQUENCES]) =>
    setRules(rs => rs.map((r, i) => i === rIdx ? {
      ...r,
      consequence: {
        action: v as any,
        ...(meta.needsWinner ? { winner: 'acting' as const } : {}),
        ...(meta.needsValue ? { value: 0 } : {}),
      },
    } : r));

  const updateConsequenceValue = (rIdx: number, value: number) =>
    setRules(rs => rs.map((r, i) => i === rIdx ? {
      ...r, consequence: { ...r.consequence, value },
    } : r));

  const updateCond = (rIdx: number, cIdx: number, field: string, value: any) =>
    setRules(rs => rs.map((r, i) => i === rIdx ? {
      ...r,
      conditions: r.conditions.map((c, ci) => ci === cIdx ? { ...c, [field]: value } : c),
    } : r));

  const addCond = (rIdx: number) =>
    setRules(rs => rs.map((r, i) => i === rIdx ? {
      ...r,
      conditions: [...r.conditions, { subject: 'player.score' as const, operator: 'GT' as const, threshold: 0 }],
    } : r));

  const removeCond = (rIdx: number, cIdx: number) =>
    setRules(rs => rs.map((r, i) => i === rIdx ? {
      ...r,
      conditions: r.conditions.filter((_, ci) => ci !== cIdx),
    } : r));

  const save = async () => {
    if (!name.trim()) { showToast({ msg: 'Name the mode first', tone: 'warn', icon: 'close' }); return; }
    if (!rules.length) { showToast({ msg: 'Add at least one rule', tone: 'warn', icon: 'close' }); return; }
    const payload: RulesConfig = { rules, auto_reset: autoReset, round_scoped_scores: roundScoped };
    if (editMode) {
      await updateMode(editMode.id, { name: name.trim(), rules: payload });
      showToast({ msg: `"${name.trim()}" updated`, tone: 'success', icon: 'check' });
    } else {
      await createMode(gameId, name.trim(), payload);
      showToast({ msg: `"${name.trim()}" saved`, tone: 'success', icon: 'check' });
    }
    onClose();
  };

  const preview = describeMode({ rules, auto_reset: autoReset });

  return (
    <Modal open fullPage onClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── HELP VIEW ──────────────────────────────────────── */}
        {showHelp ? (
          <>
            <View style={mm.header}>
              <Pressable onPress={() => setShowHelp(false)} style={mm.closeBtn} hitSlop={6}>
                <Text style={{ fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 16, color: C.ink70 }}>←</Text>
              </Pressable>
              <Text style={[T.h2, { color: C.ink, flex: 1, marginLeft: 10 }]}>How rules work</Text>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={mm.helpExplain}>
                <Text style={[T.small, { color: C.ink70, lineHeight: 20 }]}>
                  Each rule is a sentence:{' '}
                  <Text style={{ color: C.primary, fontFamily: 'Lato_700Bold' }}>When</Text> something happens →{' '}
                  <Text style={{ color: C.primary, fontFamily: 'Lato_700Bold' }}>if</Text> a number check passes →{' '}
                  <Text style={{ color: C.primary, fontFamily: 'Lato_700Bold' }}>then</Text> do something.
                </Text>
              </View>

              <HelpGroup title="WHEN — Triggers">
                <HelpRow bold="A point is scored" desc="Fires on every + or − tap and on voice commands." />
                <HelpRow bold="A round ends" desc="Fires when the Next Round button is tapped." />
                <HelpRow bold="A round is won" desc="Fires automatically after a 'Win the round' consequence." />
              </HelpGroup>

              <HelpGroup title="IF — Subjects (what to measure)">
                <HelpRow bold="Scorer's total" desc="The acting player's current score (this round only in round-based modes)." />
                <HelpRow bold="Current round" desc="The round number the match is on." />
                <HelpRow bold="Top rival score" desc="The highest score among all other players." />
                <HelpRow bold="Rounds won" desc="How many rounds the acting player has won." />
              </HelpGroup>

              <HelpGroup title="IF — Operators (the check)">
                <HelpRow bold="≥  reaches" desc="True when subject hits this value or higher. Use for win conditions." />
                <HelpRow bold=">  exceeds" desc="True when subject goes strictly above. Use for bust penalties." />
                <HelpRow bold="=  exactly" desc="True only at this exact value. Risky if points can skip the number." />
                <HelpRow bold="≤  at or under" desc="True when subject is this value or lower." />
                <HelpRow bold="<  below" desc="True when subject is strictly less than this value." />
                <HelpRow bold="÷  every multiple of" desc="True when subject divides evenly — e.g. every 5th point scored." />
              </HelpGroup>

              <HelpGroup title="THEN — Consequences">
                <HelpRow bold="End the match" desc="Locks scoring and declares a winner." />
                <HelpRow bold="Win the round" desc="Awards the round, round scores reset to 0, round number advances." />
                <HelpRow bold="Set scorer's total" desc="Forces score to a specific number. Classic bust penalty (e.g. set to 15)." />
                <HelpRow bold="Adjust scorer by" desc="Adds or subtracts a bonus/penalty on top of current score." />
                <HelpRow bold="Eliminate scorer" desc="Marks the player as eliminated." />
              </HelpGroup>
            </ScrollView>
          </>
        ) : (

        /* ── BUILDER VIEW ──────────────────────────────────── */
        <>
          <View style={mm.header}>
            <Text style={[T.h2, { color: C.ink, flex: 1 }]}>{editMode ? 'Edit mode' : 'New mode'}</Text>
            <Pressable onPress={() => setShowHelp(true)} style={[mm.closeBtn, { marginRight: 8 }]} hitSlop={6}>
              <Text style={{ fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 15, color: C.ink70 }}>?</Text>
            </Pressable>
            <Pressable onPress={onClose} style={mm.closeBtn} hitSlop={6}>
              <Icon name="close" size={18} color={C.ink70} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={mm.body} showsVerticalScrollIndicator={false}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Mode name — e.g. First to 5"
              placeholderTextColor={C.ink35}
              style={mm.input}
            />

            <View style={mm.descPreview}>
              <Text style={[T.caption, { color: C.ink50, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }]}>
                How it plays
              </Text>
              <Text style={[T.bodyBold, { color: rules.length ? C.ink70 : C.ink35 }]}>
                {rules.length ? preview : 'Build rules below to see a description'}
              </Text>
            </View>

            <Ornament label="Build the rules" />

            <View style={mm.chips}>
              {TEMPLATES.map(t => (
                <Pressable key={t.label} onPress={() => setRules(r => [...r, ...t.make().map(x => ({ ...x, id: uid('r') }))])}
                  style={({ pressed }) => [mm.chip, pressed && { opacity: 0.8 }]}>
                  <Text style={[T.smallBold, { color: C.ink70 }]}>+ {t.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={mm.ruleList}>
              {rules.map((r, i) => (
                <View key={r.id || i} style={mm.ruleCard}>
                  <View style={mm.ruleCardHeader}>
                    <View style={mm.ruleNum}>
                      <Text style={{ fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 11, color: C.primary }}>{i + 1}</Text>
                    </View>
                    <Text style={[T.smallBold, { color: C.ink50, flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Rule {i + 1}</Text>
                    <Pressable onPress={() => setRules(rs => rs.filter((_, j) => j !== i))} hitSlop={6}>
                      <Icon name="trash" size={16} color={C.ink35} />
                    </Pressable>
                  </View>

                  {/* WHEN */}
                  <View style={mm.sentRow}>
                    <Text style={mm.sentWord}>When</Text>
                    <SentenceChip
                      label={TRIGGERS[r.trigger_event as keyof typeof TRIGGERS]}
                      active={isActive(i, 'trigger')}
                      onPress={() => toggleField(i, 'trigger')}
                    />
                  </View>
                  {isActive(i, 'trigger') && (
                    <View style={mm.inlineOpts}>
                      {Object.entries(TRIGGERS).map(([v, l]) => (
                        <Pressable key={v} onPress={() => { updateTrigger(i, v); setActiveField(null); }}
                          style={[mm.selectOpt, r.trigger_event === v && mm.selectOptActive]}>
                          <Text style={[T.caption, { color: r.trigger_event === v ? C.primary : C.ink50 }]}>{l}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Gate toggle (2+ conditions) */}
                  {r.conditions.length >= 2 && (
                    <View style={mm.gateRow}>
                      <Text style={[T.caption, { color: C.ink50 }]}>Match</Text>
                      <Pressable onPress={() => toggleLogicalGate(i)} style={mm.gateChip}>
                        <Text style={[T.smallBold, { color: C.primary }]}>
                          {r.logical_gate === 'AND' ? 'all conditions' : 'any condition'}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* IF rows */}
                  {r.conditions.map((c, ci) => (
                    <View key={ci}>
                      <View style={mm.sentRow}>
                        <Text style={mm.sentWord}>{ci === 0 ? 'if' : r.logical_gate === 'AND' ? 'and' : 'or'}</Text>
                        <SentenceChip
                          label={SUBJECTS[c.subject as keyof typeof SUBJECTS]}
                          active={isActive(i, 'subject', ci)}
                          onPress={() => toggleField(i, 'subject', ci)}
                        />
                        <SentenceChip
                          label={OPERATORS[c.operator as keyof typeof OPERATORS]}
                          active={isActive(i, 'operator', ci)}
                          onPress={() => toggleField(i, 'operator', ci)}
                        />
                        <TextInput
                          value={String(c.threshold)}
                          onChangeText={v => updateCond(i, ci, 'threshold', isNaN(Number(v)) ? v : Number(v))}
                          keyboardType="numeric"
                          style={mm.inlineNum}
                        />
                        {r.conditions.length > 1 && (
                          <Pressable onPress={() => removeCond(i, ci)} hitSlop={8}>
                            <Icon name="close" size={14} color={C.ink35} />
                          </Pressable>
                        )}
                      </View>
                      {isActive(i, 'subject', ci) && (
                        <View style={mm.inlineOpts}>
                          {Object.entries(SUBJECTS).map(([v, l]) => (
                            <Pressable key={v} onPress={() => { updateCond(i, ci, 'subject', v); setActiveField(null); }}
                              style={[mm.selectOpt, c.subject === v && mm.selectOptActive]}>
                              <Text style={[T.caption, { color: c.subject === v ? C.primary : C.ink50 }]}>{l}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      {isActive(i, 'operator', ci) && (
                        <View style={mm.inlineOpts}>
                          {Object.entries(OPERATORS).map(([v, l]) => (
                            <Pressable key={v} onPress={() => { updateCond(i, ci, 'operator', v); setActiveField(null); }}
                              style={[mm.selectOpt, c.operator === v && mm.selectOptActive]}>
                              <Text style={[T.caption, { color: c.operator === v ? C.primary : C.ink50 }]}>{l}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}

                  <Pressable onPress={() => addCond(i)} style={mm.addCondInline}>
                    <Text style={[T.smallBold, { color: C.ink50 }]}>+ add condition</Text>
                  </Pressable>

                  {/* THEN */}
                  <View style={[mm.sentRow, { marginTop: 10 }]}>
                    <Text style={mm.sentWord}>then</Text>
                    <SentenceChip
                      label={CONSEQUENCES[r.consequence.action as keyof typeof CONSEQUENCES].label}
                      active={isActive(i, 'consequence')}
                      onPress={() => toggleField(i, 'consequence')}
                    />
                    {CONSEQUENCES[r.consequence.action as keyof typeof CONSEQUENCES].needsValue && (
                      <TextInput
                        value={String(r.consequence.value ?? 0)}
                        onChangeText={v => updateConsequenceValue(i, isNaN(Number(v)) ? 0 : Number(v))}
                        keyboardType="numeric"
                        style={mm.inlineNum}
                      />
                    )}
                  </View>
                  {isActive(i, 'consequence') && (
                    <View style={mm.inlineOpts}>
                      {Object.entries(CONSEQUENCES).map(([v, m]) => (
                        <Pressable key={v} onPress={() => { updateConsequence(i, v, m); setActiveField(null); }}
                          style={[mm.selectOpt, r.consequence.action === v && mm.selectOptActive]}>
                          <Text style={[T.caption, { color: r.consequence.action === v ? C.primary : C.ink50 }]}>{m.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
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
                <Text style={[T.bodyBold, { color: C.ink }]}>Round-scoped scores</Text>
                <Text style={[T.small, { color: C.ink50, marginTop: 3 }]}>Rules evaluate against this round's score only</Text>
              </View>
              <Switch
                value={roundScoped}
                onValueChange={setRoundScoped}
                trackColor={{ true: C.primary, false: C.ink12 }}
                thumbColor="#fff"
              />
            </View>
            <View style={[mm.toggleRow, { marginTop: 14 }]}>
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
        </>
        )}

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
  descPreview: {
    backgroundColor: C.bgSunk, borderRadius: 14,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: C.line,
  },
  helpExplain: {
    backgroundColor: C.primarySoft, borderRadius: 14,
    padding: 14, marginBottom: 22,
    borderWidth: 1, borderColor: '#B08A4F',
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
  // Sentence builder
  sentRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 6, flexWrap: 'wrap',
  },
  sentWord: {
    fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 13,
    color: C.ink35, minWidth: 36,
  },
  sentChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.ink12, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#fff', flexShrink: 1,
  },
  sentChipActive: {
    borderColor: C.primary, backgroundColor: C.primarySoft,
  },
  inlineOpts: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginBottom: 8, marginLeft: 42,
  },
  inlineNum: {
    width: 60, textAlign: 'center', borderWidth: 1.5, borderColor: C.ink12,
    backgroundColor: '#fff', borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 4,
    fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 14, color: C.ink,
  },
  gateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 6, marginLeft: 42,
  },
  gateChip: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: C.primarySoft,
  },
  addCondInline: {
    marginLeft: 42, marginTop: 4, marginBottom: 4,
  },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectOpt: {
    borderWidth: 1, borderColor: C.ink12, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  selectOptActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
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
