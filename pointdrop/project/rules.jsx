// rules.jsx — dynamic rule builder + centered create/config modals
const { useState: useRS } = React;

// styled native select (compact, reliable)
function MiniSelect({ value, onChange, options, flex }) {
  return (
    <div style={{ position: 'relative', flex: flex || 'none' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        appearance: 'none', WebkitAppearance: 'none', width: '100%',
        border: `1.5px solid ${C.ink12}`, background: C.surfaceAlt, color: C.ink,
        borderRadius: 10, padding: '9px 26px 9px 11px', font: `700 13px/1 ${FONT_BODY}`,
        cursor: 'pointer', outline: 'none',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.ink50 }}>
        <Icon name="chevR" size={13} />
      </span>
    </div>
  );
}

function NumBox({ value, onChange, w = 64 }) {
  return (
    <input type="number" value={value} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      style={{ width: w, textAlign: 'center', border: `1.5px solid ${C.ink12}`, background: C.surfaceAlt,
        borderRadius: 10, padding: '9px 6px', font: `800 15px/1 ${FONT_HEAD}`, color: C.ink, outline: 'none' }} />
  );
}

function ToggleRow({ label, sub, value, onToggle }) {
  return (
    <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap: 12, cursor:'pointer' }}>
      <div style={{ flex: 1 }}>
        <div style={{ font:`700 15px/1.2 ${FONT_BODY}`, color: C.ink }}>{label}</div>
        {sub && <div style={{ font:`400 12.5px/1.3 ${FONT_BODY}`, color: C.ink50, marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ width: 50, height: 30, borderRadius: 100, padding: 3, background: value ? C.primary : C.ink12, flexShrink: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff',
          transform: `translateX(${value ? 20 : 0}px)`, transition: 'transform .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
    </div>
  );
}

// ── one rule block ─────────────────────────────────────────────
function RuleCard({ rule, idx, onChange, onDelete }) {
  const set = (patch) => onChange({ ...rule, ...patch });
  const setCond = (ci, patch) => set({ conditions: rule.conditions.map((c, i) => i === ci ? { ...c, ...patch } : c) });
  const addCond = () => set({ conditions: [...rule.conditions, { subject: 'player.score', operator: 'GT', threshold: 0 }] });
  const delCond = (ci) => set({ conditions: rule.conditions.filter((_, i) => i !== ci) });
  const cAction = rule.consequence.action;
  const meta = CONSEQUENCES[cAction];

  return (
    <div style={{ background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, boxShadow: SHADOW.card }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 22, height: 22, borderRadius: 7, background: C.primarySoft, color: C.primary,
          display: 'grid', placeItems: 'center', font: `800 11px/1 ${FONT_HEAD}`, flexShrink: 0 }}>{idx + 1}</div>
        <div style={{ font: `800 10.5px/1 ${FONT_BODY}`, letterSpacing: 1, textTransform: 'uppercase', color: C.ink50 }}>Trigger</div>
        <div style={{ flex: 1 }} />
        <button onClick={onDelete} className="pd-tap" style={{ border: 'none', background: 'transparent', color: C.ink35, cursor: 'pointer', display:'grid', placeItems:'center' }}>
          <Icon name="trash" size={16} />
        </button>
      </div>

      <MiniSelect value={rule.trigger_event} onChange={v => set({ trigger_event: v })}
        options={Object.entries(TRIGGERS).map(([value, label]) => ({ value, label }))} flex={1} />

      <div style={{ font: `800 10.5px/1 ${FONT_BODY}`, letterSpacing: 1, textTransform: 'uppercase', color: C.ink50, margin: '14px 0 8px' }}>If…</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rule.conditions.map((c, ci) => (
          <div key={ci}>
            {ci > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 6px' }}>
                <button onClick={() => set({ logical_gate: rule.logical_gate === 'AND' ? 'OR' : 'AND' })} style={{
                  border: `1.5px solid ${C.gold}`, background: C.warnSoft, color: C.gold, borderRadius: 100,
                  padding: '3px 12px', font: `800 11px/1 ${FONT_BODY}`, cursor: 'pointer', letterSpacing: 1 }}>
                  {rule.logical_gate}
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <MiniSelect value={c.subject} onChange={v => setCond(ci, { subject: v })}
                options={Object.entries(SUBJECTS).map(([value, m]) => ({ value, label: m.label }))} flex={1.4} />
              <MiniSelect value={c.operator} onChange={v => setCond(ci, { operator: v })}
                options={Object.entries(OPERATORS).map(([value, m]) => ({ value, label: m.glyph }))} flex={0.8} />
              <NumBox value={c.threshold} onChange={v => setCond(ci, { threshold: v })} />
              {rule.conditions.length > 1 && (
                <button onClick={() => delCond(ci)} className="pd-tap" style={{ border:'none', background:'transparent', color:C.ink35, cursor:'pointer' }}>
                  <Icon name="close" size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button onClick={addCond} style={{ marginTop: 8, border: `1.5px dashed ${C.ink12}`, background: 'transparent',
        color: C.ink50, borderRadius: 10, padding: '7px 10px', font: `700 12px/1 ${FONT_BODY}`, cursor: 'pointer', width: '100%' }}>
        + Add condition
      </button>

      <div style={{ font: `800 10.5px/1 ${FONT_BODY}`, letterSpacing: 1, textTransform: 'uppercase', color: C.ink50, margin: '14px 0 8px' }}>Then…</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <MiniSelect value={cAction} onChange={v => set({ consequence: { action: v,
          ...(CONSEQUENCES[v].needsWinner ? { winner: rule.consequence.winner || 'acting' } : {}),
          ...(CONSEQUENCES[v].needsValue ? { value: rule.consequence.value ?? 0 } : {}) } })}
          options={Object.entries(CONSEQUENCES).map(([value, m]) => ({ value, label: m.label }))} flex={1.4} />
        {meta.needsWinner && (
          <MiniSelect value={rule.consequence.winner} onChange={v => set({ consequence: { ...rule.consequence, winner: v } })}
            options={[{ value: 'acting', label: 'Scorer' }, { value: 'leader', label: 'Leader' }]} flex={1} />
        )}
        {meta.needsValue && <NumBox value={rule.consequence.value} onChange={v => set({ consequence: { ...rule.consequence, value: v } })} />}
      </div>
    </div>
  );
}

// strip internal ids for the serialized preview
function cleanRules(rulesArr, autoReset) {
  const out = { rules: rulesArr.map(r => ({
    trigger_event: r.trigger_event,
    evaluations: [{ logical_gate: r.logical_gate, conditions: r.conditions.map(c => ({ subject: c.subject, operator: c.operator, threshold: c.threshold })) }],
    consequences: [r.consequence],
  })) };
  if (autoReset) out.auto_reset = true;
  return out;
}
function rsHighlight(json) {
  return json.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/("(\\.|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?)/g, (m) => {
      let col = '#9FD0C2';
      if (/^"/.test(m)) col = /:$/.test(m) ? '#E0A989' : '#C9D98A';
      else if (/true|false/.test(m)) col = '#9FB8E0';
      return `<span style="color:${col}">${m}</span>`;
    });
}

const newRule = () => ({ id: uid('r'), trigger_event: 'on_point_added', logical_gate: 'AND',
  conditions: [{ subject: 'player.score', operator: 'GTE', threshold: '' }],
  consequence: { action: 'END_MATCH', winner: 'acting' } });

const TEMPLATES = [
  { label: 'Target score', make: () => [ruleTarget(5)] },
  { label: 'Best of 3 rounds', make: () => [ruleWinRound(21), ruleBestOf(2)] },
  { label: 'Exact + bust', make: () => [ruleBust(21, 15), ruleExactWin(21)] },
  { label: 'Round limit', make: () => [ruleRounds(6)] },
  { label: 'Bonus every 3rd', make: () => [{ id: uid('r'), trigger_event: 'on_point_added', logical_gate: 'AND',
      conditions: [{ subject: 'player.score', operator: 'MOD', threshold: 3 }], consequence: { action: 'MODIFY_VALUE', value: 2 } }] },
];

// ── Mode creator modal (the dynamic builder) ───────────────────
function ModeCreatorModal({ app, gameId, editMode, onClose }) {
  const game = app.games.find(g => g.id === gameId);
  const [name, setName] = useRS(editMode ? editMode.name : '');
  const [rules, setRules] = useRS(() => {
    const base = editMode ? (editMode.rules.rules || []) : [newRule()];
    return base.map(r => ({ id: r.id || uid('r'), trigger_event: r.trigger_event, logical_gate: r.logical_gate || 'AND',
      conditions: r.conditions || [{ subject: 'player.score', operator: 'GTE', threshold: '' }],
      consequence: r.consequence || { action: 'END_MATCH', winner: 'acting' } }));
  });
  const [autoReset, setAutoReset] = useRS(editMode ? !!editMode.rules.auto_reset : false);
  const [showJson, setShowJson] = useRS(false);

  const cfg = cleanRules(rules, autoReset);
  const save = () => {
    if (!name.trim()) { app.toast({ msg: 'Name the mode first', tone: 'warn', icon: 'close' }); return; }
    if (!rules.length) { app.toast({ msg: 'Add at least one rule', tone: 'warn', icon: 'close' }); return; }
    const payload = { rules: rules.map(r => ({
      trigger_event: r.trigger_event, logical_gate: r.logical_gate,
      conditions: r.conditions, consequence: r.consequence })), auto_reset: autoReset };
    if (editMode) { app.updateMode(editMode.id, { name: name.trim(), rules: payload }); app.toast({ msg: `\u201c${name.trim()}\u201d updated`, tone: 'success', icon: 'check' }); }
    else { app.createMode({ gameId, name: name.trim(), rules: payload }); app.toast({ msg: `\u201c${name.trim()}\u201d saved`, tone: 'success', icon: 'check' }); }
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} maxH="92%">
      {/* header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ font: `800 19px/1.1 ${FONT_HEAD}`, color: C.ink, whiteSpace: 'nowrap' }}>{editMode ? 'Edit mode' : 'New mode'}</div>
            <div style={{ font: `400 12.5px/1 ${FONT_BODY}`, color: C.ink50, marginTop: 3, whiteSpace: 'nowrap' }}>{game ? `in ${game.name}` : ''}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="pd-tap" style={{ border:'none', background: C.bgSunk, width: 34, height: 34, borderRadius: 10, display:'grid', placeItems:'center', cursor:'pointer', color: C.ink70 }}>
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      {/* scroll body */}
      <div style={{ overflow: 'auto', padding: '16px 18px 8px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Mode name — e.g. First to 5" className="pd-input" autoFocus />

        <div style={{ margin: '16px 0 10px' }}><Ornament label="Build the rules" /></div>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setRules(r => [...r, ...t.make()])} className="pd-tap" style={{
              border: `1.5px solid ${C.gold}`, background: C.warnSoft, color: C.ink70, borderRadius: 100,
              padding: '7px 12px', font: `700 12px/1 ${FONT_BODY}`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              + {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map((r, i) => (
            <RuleCard key={r.id} rule={r} idx={i}
              onChange={nr => setRules(rs => rs.map((x, j) => j === i ? nr : x))}
              onDelete={() => setRules(rs => rs.filter((_, j) => j !== i))} />
          ))}
          {!rules.length && (
            <div style={{ textAlign: 'center', padding: '24px', color: C.ink50, font: `400 13px/1.5 ${FONT_BODY}`, border: `1.5px dashed ${C.ink12}`, borderRadius: 14 }}>
              No rules. Add a template above or a blank rule below.
            </div>
          )}
        </div>

        <button onClick={() => setRules(r => [...r, newRule()])} style={{ marginTop: 12, width: '100%',
          border: `1.5px dashed ${C.ink35}`, background: 'transparent', color: C.ink70, borderRadius: 14,
          padding: '12px', font: `800 13px/1 ${FONT_BODY}`, cursor: 'pointer' }}>
          + Add blank rule
        </button>

        <div style={{ margin: '18px 0 12px' }}><Ornament /></div>

        <ToggleRow label="Auto-reset on win" sub="Archive & re-spawn the roster at 0" value={autoReset} onToggle={() => setAutoReset(v => !v)} />

        <button onClick={() => setShowJson(s => !s)} style={{ marginTop: 16, width: '100%', textAlign:'left',
          border: 'none', background: 'transparent', cursor: 'pointer', display:'flex', alignItems:'center', gap: 8,
          font: `800 10.5px/1 ${FONT_BODY}`, letterSpacing: 1.4, textTransform: 'uppercase', color: C.ink50 }}>
          <span style={{ transform: showJson ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display:'inline-flex' }}><Icon name="chevR" size={13} /></span>
          rules_config · serialized
        </button>
        {showJson && (
          <pre style={{ margin: '8px 0 0', background: '#231C15', color: '#E8DDD3', borderRadius: 12, padding: 14,
            font: `500 11.5px/1.5 ui-monospace, Menlo, monospace`, overflow: 'auto', maxHeight: 220 }}>
            <code dangerouslySetInnerHTML={{ __html: rsHighlight(JSON.stringify(cfg, null, 2)) }} />
          </pre>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.line}`, flexShrink: 0, background: C.surface }}>
        <Button full size="lg" onClick={save}>Save mode</Button>
      </div>
    </Modal>
  );
}

// ── Create game modal (small, centered) ────────────────────────
function CreateGameModal({ app, onClose }) {
  const [name, setName] = useRS('');
  const submit = () => {
    if (!name.trim()) { app.toast({ msg: 'Name your game first', tone: 'warn', icon: 'close' }); return; }
    app.submitNewGame(name.trim()); // creates game then opens mode creator
  };
  return (
    <Modal open={true} onClose={onClose} maxH="auto">
      <div style={{ padding: '22px 20px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, margin: '0 auto 12px', background: C.primarySoft, color: C.primary, display:'grid', placeItems:'center' }} className="pd-pop">
            <Icon name="library" size={26} />
          </div>
          <div style={{ font: `800 20px/1.1 ${FONT_HEAD}`, color: C.ink }}>New game</div>
          <div style={{ font: `400 13px/1.4 ${FONT_BODY}`, color: C.ink50, marginTop: 6 }}>A parent category. Next you'll build its first mode.</div>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. Poker Night" className="pd-input" autoFocus />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button full tone="ghost" onClick={onClose}>Cancel</Button>
          <Button full onClick={submit}>Create & add mode</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Game config modal (edit / rename / delete) ─────────────────
function GameConfigModal({ app, gameId, onClose }) {
  const game = app.games.find(g => g.id === gameId);
  const [name, setName] = useRS(game ? game.name : '');
  const [confirmDel, setConfirmDel] = useRS(false);
  if (!game) return null;
  return (
    <Modal open={true} onClose={onClose} maxH="auto">
      <div style={{ padding: '20px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ font: `800 19px/1.1 ${FONT_HEAD}`, color: C.ink, flex: 1 }}>Game settings</div>
          <button onClick={onClose} className="pd-tap" style={{ border:'none', background: C.bgSunk, width: 34, height: 34, borderRadius: 10, display:'grid', placeItems:'center', cursor:'pointer', color: C.ink70 }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div style={{ font:`700 13px/1 ${FONT_BODY}`, color: C.ink70, marginBottom: 9 }}>Game name</div>
        <input value={name} onChange={e => setName(e.target.value)} className="pd-input" />
        <div style={{ marginTop: 14 }}>
          <Button full onClick={() => { if (name.trim()) { app.renameGame(gameId, name.trim()); app.toast({ msg: 'Game renamed', tone: 'success', icon: 'check' }); onClose(); } }}>Save changes</Button>
        </div>

        <div style={{ margin: '18px 0 14px' }}><Ornament /></div>

        {!confirmDel ? (
          <Button full tone="danger" icon="trash" onClick={() => setConfirmDel(true)}>Delete this game</Button>
        ) : (
          <div style={{ background: C.errorSoft, borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ font:`700 14px/1.3 ${FONT_BODY}`, color: C.error, marginBottom: 4 }}>Delete “{game.name}”?</div>
            <div style={{ font:`400 12.5px/1.4 ${FONT_BODY}`, color: C.ink70, marginBottom: 12 }}>Its modes are removed too. This can't be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button full tone="ghost" onClick={() => setConfirmDel(false)}>Keep</Button>
              <Button full tone="danger" onClick={() => { app.deleteGame(gameId); app.toast({ msg: 'Game deleted', tone: 'error', icon: 'trash' }); onClose(); }}>Delete</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

Object.assign(window, { ModeCreatorModal, CreateGameModal, GameConfigModal });
