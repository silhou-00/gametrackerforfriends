// play.jsx — Play module: Match Setup → Active Scoreboard → Victory
const { useState: useS, useEffect: useE, useRef: useR } = React;

// ── Match Setup ───────────────────────────────────────────────
function MatchSetupScreen({ app, params }) {
  const preMode = params && params.mode;
  const [gameId, setGameId] = useS(preMode ? preMode.gameId : app.games[0].id);
  const [modeId, setModeId] = useS(preMode ? preMode.id : null);
  const [roster, setRoster] = useS(['Mathew', 'Priya', 'Devon']);
  const [draft, setDraft] = useS('');
  const [hwOpen, setHwOpen] = useS(false);
  const [paired, setPaired] = useS(false);
  const [picker, setPicker] = useS(null); // 'game' | 'mode'

  const gameModes = app.modes.filter(m => m.gameId === gameId);
  const mode = app.modes.find(m => m.id === modeId) || (preMode || null);
  const game = app.games.find(g => g.id === gameId);

  const addPlayer = () => {
    const n = draft.trim();
    if (!n) return;
    setRoster(r => [...r, n]); setDraft('');
  };
  const canStart = mode && roster.length >= 1;

  return (
    <div style={{ paddingBottom: 120 }}>
      <Header title="New match" sub="Set the game and roster" />
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Selector label="Game" value={game ? game.name : 'Choose…'} onClick={() => setPicker('game')} />
          <Selector label="Mode" value={mode ? mode.name : 'Choose…'} sub={mode ? describeMode(mode.rules) : null}
            onClick={() => setPicker('mode')} disabled={!gameModes.length} />
        </div>

        <div>
          <div style={{ font:`700 13px/1 ${FONT_BODY}`, color: C.ink70, marginBottom: 10 }}>Roster · {roster.length}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {roster.map((p, i) => (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap: 7,
                padding: '8px 10px 8px 13px', borderRadius: 100, background: C.surface, border: `1px solid ${C.line}`,
                font:`700 13.5px/1 ${FONT_BODY}`, color: C.ink, boxShadow: SHADOW.card }}>
                {p}
                <button onClick={() => setRoster(r => r.filter((_, j) => j !== i))} className="pd-tap"
                  style={{ border:'none', background: C.bgSunk, width: 20, height: 20, borderRadius:'50%', cursor:'pointer',
                    display:'grid', placeItems:'center', color: C.ink50 }}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add player"
              onKeyDown={e => e.key === 'Enter' && addPlayer()} className="pd-input" style={{ flex: 1 }} />
            <Button tone="soft" onClick={addPlayer} icon="plus">Add</Button>
          </div>
        </div>

        {/* Hardware voice toggle */}
        <Card pad={14} style={{ background: paired ? C.successSoft : C.surface, borderColor: paired ? 'transparent' : C.line }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: paired ? '#fff' : C.bgSunk,
              display: 'grid', placeItems: 'center', color: paired ? C.success : C.ink50 }}>
              <Icon name="mic" size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font:`700 15px/1.2 ${FONT_BODY}`, color: C.ink }}>Hardware voice</div>
              <div style={{ font:`400 12.5px/1.3 ${FONT_BODY}`, color: paired ? C.success : C.ink50, marginTop: 2 }}>
                {paired ? 'ConvoAI paired · LAN-Auth active' : 'Pair an external mic over Wi-Fi'}
              </div>
            </div>
            <button onClick={() => paired ? setPaired(false) : setHwOpen(true)} className="pd-tap" style={{
              border: 'none', cursor: 'pointer', borderRadius: 100, padding: '8px 14px',
              background: paired ? '#fff' : C.primarySoft, color: paired ? C.success : C.primary,
              font:`800 13px/1 ${FONT_BODY}` }}>
              {paired ? 'Unpair' : 'Enable'}
            </button>
          </div>
        </Card>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 18px 16px',
        background: `linear-gradient(transparent, ${C.bg} 24%)` }}>
        <Button full size="lg" disabled={!canStart}
          onClick={() => app.startMatch({ mode, roster, paired })}>
          {canStart ? 'Start match' : 'Pick a mode to start'}
        </Button>
      </div>

      <PickerSheet open={picker === 'game'} onClose={() => setPicker(null)} title="Choose game"
        options={app.games.map(g => ({ id: g.id, label: g.name, sub: `${app.modes.filter(m=>m.gameId===g.id).length} modes` }))}
        value={gameId} onPick={id => { setGameId(id); setModeId(null); setPicker(null); }} />
      <PickerSheet open={picker === 'mode'} onClose={() => setPicker(null)} title="Choose mode"
        options={gameModes.map(m => ({ id: m.id, label: m.name, sub: describeMode(m.rules) }))}
        value={modeId} onPick={id => { setModeId(id); setPicker(null); }} />

      <PairingSheet open={hwOpen} onClose={() => setHwOpen(false)} app={app}
        onPaired={() => { setPaired(true); setHwOpen(false); app.toast({ msg: 'Hardware paired · ConvoAI', tone: 'success', icon: 'check' }); }} />
    </div>
  );
}

function Selector({ label, value, sub, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} className={disabled ? '' : 'pd-card-tap'} style={{
      width: '100%', textAlign: 'left', border: `1px solid ${C.line}`, background: disabled ? C.bgSunk : C.surface,
      borderRadius: 16, padding: '13px 16px', cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 12, boxShadow: disabled ? 'none' : SHADOW.card, opacity: disabled ? 0.6 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font:`700 11.5px/1 ${FONT_BODY}`, letterSpacing: 0.6, textTransform:'uppercase', color: C.ink50 }}>{label}</div>
        <div style={{ font:`700 16px/1.2 ${FONT_HEAD}`, color: C.ink, marginTop: 5 }}>{value}</div>
        {sub && <div style={{ font:`400 12.5px/1 ${FONT_BODY}`, color: C.primary, marginTop: 4 }}>{sub}</div>}
      </div>
      <Icon name="chevR" size={18} color={C.ink35} />
    </button>
  );
}

function PickerSheet({ open, onClose, title, options, value, onPick }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ font:`800 18px/1.1 ${FONT_HEAD}`, color: C.ink, marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.length === 0 && <div style={{ font:`400 14px/1.4 ${FONT_BODY}`, color: C.ink50, padding: '10px 2px' }}>No modes yet — create one in Library.</div>}
        {options.map(o => {
          const on = o.id === value;
          return (
            <button key={o.id} onClick={() => onPick(o.id)} className="pd-card-tap" style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              padding: '13px 14px', borderRadius: 14, cursor: 'pointer',
              border: `1.5px solid ${on ? C.primary : C.line}`, background: on ? C.primarySoft : C.surface,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ font:`700 15.5px/1.2 ${FONT_BODY}`, color: C.ink }}>{o.label}</div>
                {o.sub && <div style={{ font:`400 12.5px/1 ${FONT_BODY}`, color: C.ink50, marginTop: 3 }}>{o.sub}</div>}
              </div>
              {on && <Icon name="check" size={20} color={C.primary} />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ── Hardware pairing flow (Wi-Fi → mDNS → LAN-Auth) ────────────
function PairingSheet({ open, onClose, onPaired, app }) {
  const [step, setStep] = useS(0); // 0 wifi, 1 mdns, 2 token, 3 mobiledata(blocked)
  const [token] = useS(() => Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase());
  useE(() => { if (open) setStep(0); }, [open]);
  useE(() => {
    if (!open) return;
    if (step === 0) { const t = setTimeout(() => setStep(1), 1300); return () => clearTimeout(t); }
    if (step === 1) { const t = setTimeout(() => setStep(2), 1900); return () => clearTimeout(t); }
  }, [step, open]);

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ font:`800 18px/1.1 ${FONT_HEAD}`, color: C.ink, marginBottom: 4 }}>Enable hardware voice</div>
      <div style={{ font:`400 13px/1.4 ${FONT_BODY}`, color: C.ink50, marginBottom: 18 }}>Local-network pairing · Agora / ConvoAI</div>

      {step === 3 ? (
        <PairStep tone="error" icon="close" title="Wi-Fi required"
          body="Hardware pairing needs an active Wi-Fi connection. You're on mobile data — the local server stays off to protect battery and security.">
          <Button full tone="ghost" onClick={() => setStep(0)}>Back to Wi-Fi</Button>
        </PairStep>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PairLine done={step > 0} active={step === 0} tone="connect"
            label="Verifying network" detail={step > 0 ? 'Wi-Fi · HomeNet 5G' : 'Checking OS network APIs…'} />
          <PairLine done={step > 1} active={step === 1} tone="connect"
            label="Broadcasting mDNS" detail={step > 1 ? 'game-tracker.local · UDP 5353' : step === 1 ? 'Discovering devices…' : 'Zero-config / Bonjour'} />
          <PairLine done={step >= 2} active={step === 2} tone="success"
            label="LAN-Auth handshake" detail={step >= 2 ? 'Listening · POST :8080/voice-command' : 'Background HTTP daemon'} />

          {step >= 2 && (
            <div className="pd-fade-in" style={{ marginTop: 6 }}>
              <div style={{ font:`700 12px/1 ${FONT_BODY}`, color: C.ink70, marginBottom: 8 }}>
                Enter this token in the hardware portal
              </div>
              <div style={{ display:'flex', alignItems:'center', gap: 12, background: '#23292F', borderRadius: 14, padding: '16px 18px' }}>
                <Icon name="shield" size={22} color={C.success} />
                <div style={{ flex: 1, font:`700 22px/1 ui-monospace, Menlo, monospace`, color: '#E8DDD3', letterSpacing: 2 }}>{token}</div>
                <span style={{ font:`700 11px/1 ${FONT_BODY}`, color: '#9FB8E0' }}>Bearer</span>
              </div>
              <div style={{ font:`400 11.5px/1.4 ${FONT_BODY}`, color: C.ink50, marginTop: 8 }}>
                Unmatched headers are dropped with 401 Unauthorized.
              </div>
              <div style={{ marginTop: 16 }}><Button full size="lg" onClick={onPaired} icon="check">Confirm paired</Button></div>
            </div>
          )}

          {step < 2 && (
            <button onClick={() => setStep(3)} style={{ marginTop: 8, border:'none', background:'transparent',
              color: C.ink50, font:`600 12.5px/1 ${FONT_BODY}`, cursor:'pointer', textAlign:'center' }}>
              On mobile data instead?
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
function PairLine({ done, active, label, detail, tone }) {
  const col = done ? C[tone] : active ? C[tone] : C.ink35;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: done ? C[tone] : 'transparent', border: done ? 'none' : `2px solid ${active ? col : C.ink12}`,
        display: 'grid', placeItems: 'center', color: '#fff' }}>
        {done ? <Icon name="check" size={16} /> : active ? <span className="pd-spin" style={{ width: 14, height: 14, borderRadius:'50%', border:`2px solid ${col}`, borderTopColor:'transparent' }} /> : null}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ font:`700 14.5px/1.2 ${FONT_BODY}`, color: done || active ? C.ink : C.ink50 }}>{label}</div>
        <div style={{ font:`400 12px/1.2 ${FONT_BODY}`, color: C.ink50, marginTop: 2 }}>{detail}</div>
      </div>
    </div>
  );
}
function PairStep({ tone, icon, title, body, children }) {
  return (
    <div className="pd-fade-in" style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px', background: C[tone + 'Soft'] || C.errorSoft,
        display: 'grid', placeItems: 'center', color: C[tone] }}><Icon name={icon} size={28} /></div>
      <div style={{ font:`800 18px/1.2 ${FONT_HEAD}`, color: C.ink, marginBottom: 8 }}>{title}</div>
      <div style={{ font:`400 13.5px/1.5 ${FONT_BODY}`, color: C.ink50, marginBottom: 18 }}>{body}</div>
      {children}
    </div>
  );
}

Object.assign(window, { MatchSetupScreen });
