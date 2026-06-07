// settings.jsx — Settings module: backup, data wipe, network diagnostics
const { useState: useSs, useEffect: useEs, useRef: useRs } = React;

function SettingsScreen({ app }) {
  const [wipe, setWipe] = useSs(false);
  const [backing, setBacking] = useSs(false);

  const backup = () => {
    setBacking(true);
    setTimeout(() => { setBacking(false); app.toast({ msg: 'pointdrop_backup.db.gz saved to Files', tone: 'success', icon: 'check' }); }, 1400);
  };

  return (
    <div style={{ paddingBottom: 96 }}>
      <Header title="Settings" sub="Utilities & diagnostics" />
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Database management */}
        <div>
          <SectionLabel>Database</SectionLabel>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: SHADOW.card, overflow:'hidden' }}>
            <Stat label="Local store" value="SQLite · 5 tables" />
            <Divider />
            <Stat label="Audit entries" value={`${app.matches.reduce((s, m) => s + m.logs.length, 0)} rows`} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button full tone="soft" onClick={backup} icon="download">{backing ? 'Compressing…' : 'Backup .db'}</Button>
            <Button full tone="danger" onClick={() => setWipe(true)} icon="trash">Wipe data</Button>
          </div>
        </div>

        {/* Network diagnostics — manual host server */}
        <div>
          <SectionLabel>Network diagnostics</SectionLabel>
          <HostServerPanel app={app} />
          <div style={{ font:`400 12px/1.4 ${FONT_BODY}`, color: C.ink50, marginTop: 10, padding: '0 2px' }}>
            The local server only runs while you host. Enable it to let hardware mics on your Wi-Fi reach this device; the bearer token rotates each session.
          </div>
        </div>

        {/* About */}
        <div>
          <SectionLabel>About</SectionLabel>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: SHADOW.card, overflow:'hidden' }}>
            <Stat label="PointDrop" value="v4.1 · Local-First" />
            <Divider />
            <Stat label="Sync" value="None — 100% on device" />
          </div>
        </div>
      </div>

      <Sheet open={wipe} onClose={() => setWipe(false)}>
        <div style={{ textAlign:'center', padding: '4px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, margin:'0 auto 14px', background: C.errorSoft, color: C.error, display:'grid', placeItems:'center' }}>
            <Icon name="trash" size={26} />
          </div>
          <div style={{ font:`800 19px/1.2 ${FONT_HEAD}`, color: C.ink, marginBottom: 8 }}>Wipe all local data?</div>
          <div style={{ font:`400 13.5px/1.5 ${FONT_BODY}`, color: C.ink50, marginBottom: 20 }}>
            This permanently deletes every game, mode, match and audit log from this device. There's no cloud backup — this can't be undone.
          </div>
          <div style={{ display:'flex', gap: 10 }}>
            <Button full tone="ghost" onClick={() => setWipe(false)}>Cancel</Button>
            <Button full tone="danger" onClick={() => { app.wipeAll(); setWipe(false); app.toast({ msg: 'Local data wiped', tone: 'error', icon: 'trash' }); }}>Wipe everything</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 14, padding: '14px 16px' }}>
      <span style={{ font:`600 14px/1 ${FONT_BODY}`, color: C.ink70, whiteSpace:'nowrap' }}>{label}</span>
      <span style={{ font:`700 13.5px/1 ${mono ? 'ui-monospace, Menlo, monospace' : FONT_BODY}`, color: C.ink, whiteSpace:'nowrap' }}>{value}</span>
    </div>
  );
}
function StatPill({ label, tone, pill }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 12, padding: '12px 16px' }}>
      <span style={{ font:`600 14px/1 ${FONT_BODY}`, color: C.ink70, whiteSpace:'nowrap' }}>{label}</span>
      <StatusPill tone={tone} label={pill} />
    </div>
  );
}
function Divider() { return <div style={{ height: 1, background: C.line }} />; }

// ── Manual host-server control (interactive demo) ──────────────
function HostServerPanel({ app }) {
  const [phase, setPhase] = useSs('off');   // off | starting | on
  const [step, setStep] = useSs(0);
  const timers = useRs([]);
  const clearT = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEs(() => () => clearT(), []);

  const enable = () => {
    clearT(); setPhase('starting'); setStep(0);
    timers.current.push(setTimeout(() => setStep(1), 850));
    timers.current.push(setTimeout(() => setStep(2), 1750));
    timers.current.push(setTimeout(() => { setPhase('on'); app.toast({ msg: 'Local host live · :8080', tone: 'success', icon: 'check' }); }, 2650));
  };
  const disable = () => { clearT(); setPhase('off'); setStep(0); app.toast({ msg: 'Local host stopped', tone: 'warn', icon: 'close' }); };

  const on = phase === 'on', starting = phase === 'starting';
  const steps = [
    { label: 'Binding listener', detail: ':8080 /voice-command' },
    { label: 'Broadcasting mDNS', detail: 'game-tracker.local · UDP 5353' },
    { label: 'LAN-Auth handshake', detail: 'Bearer token rotated' },
  ];

  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${on ? C.success : C.line}`, boxShadow: SHADOW.card, overflow: 'hidden' }}>
      {/* control row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: on ? C.successSoft : starting ? C.connectSoft : C.bgSunk, color: on ? C.success : starting ? C.connect : C.ink50 }}>
          <Icon name="lan" size={21} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font:`700 14.5px/1.2 ${FONT_BODY}`, color: C.ink }}>Local host server</div>
          <div style={{ font:`400 12px/1.2 ${FONT_BODY}`, color: on ? C.success : C.ink50, marginTop: 2 }}>
            {on ? 'Hosting · accepting hardware mics' : starting ? 'Starting services…' : 'Off · not discoverable'}
          </div>
        </div>
        {on ? (
          <button onClick={disable} className="pd-tap" style={{ border:'none', cursor:'pointer', borderRadius: 100, padding:'9px 16px',
            background: C.errorSoft, color: C.error, font:`800 13px/1 ${FONT_BODY}` }}>Stop</button>
        ) : (
          <button onClick={enable} disabled={starting} className={starting ? '' : 'pd-tap'} style={{ border:'none', cursor: starting ? 'default' : 'pointer', borderRadius: 100, padding:'9px 16px',
            background: starting ? C.bgSunk : C.primary, color: starting ? C.ink50 : '#fff', font:`800 13px/1 ${FONT_BODY}` }}>
            {starting ? 'Enabling…' : 'Enable host'}
          </button>
        )}
      </div>

      {/* starting sequence */}
      {starting && (
        <div className="pd-fade-in" style={{ borderTop: `1px solid ${C.line}`, padding: '6px 16px 12px' }}>
          {steps.map((s, i) => {
            const done = step > i, active = step === i;
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap: 12, padding: '9px 0' }}>
                <div style={{ width: 24, height: 24, borderRadius:'50%', flexShrink:0, display:'grid', placeItems:'center', color:'#fff',
                  background: done ? C.success : 'transparent', border: done ? 'none' : `2px solid ${active ? C.connect : C.ink12}` }}>
                  {done ? <Icon name="check" size={14} /> : active ? <span className="pd-spin" style={{ width: 12, height: 12, borderRadius:'50%', border:`2px solid ${C.connect}`, borderTopColor:'transparent' }} /> : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font:`700 13.5px/1.2 ${FONT_BODY}`, color: done || active ? C.ink : C.ink50 }}>{s.label}</div>
                  <div style={{ font:`400 11.5px/1.2 'ui-monospace, Menlo, monospace'`, color: C.ink50, marginTop: 2, fontFamily:'ui-monospace, Menlo, monospace' }}>{s.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* live endpoint table */}
      {on && (
        <div className="pd-fade-in">
          <Divider />
          <StatPill label="Wi-Fi state" tone="success" pill="Connected · HomeNet 5G" />
          <Divider />
          <Stat label="Local IP" value="192.168.1.34" mono />
          <Divider />
          <Stat label="mDNS host" value="game-tracker.local" mono />
          <Divider />
          <Stat label="Listener port" value=":8080 /voice-command" mono />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SettingsScreen });
