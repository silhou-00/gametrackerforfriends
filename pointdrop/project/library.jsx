// library.jsx — Library module: Games list → Mode selector (create = modals)
// Game "stamp" badge
function Stamp({ text, size = 46 }) {
  const initials = text.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: `radial-gradient(120% 120% at 30% 25%, ${C.primarySoft} 0%, #E7C7B5 100%)`,
      color: C.primary, display: 'grid', placeItems: 'center',
      font: `800 ${size * 0.36}px/1 ${FONT_HEAD}`, letterSpacing: -0.5,
      border: `1px solid ${C.gold}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 5px rgba(120,60,40,0.18)`,
    }}>{initials}</div>
  );
}

// docked action button (pinned just above the nav by App)
function DockedAction({ label, onClick }) {
  return (
    <button onClick={onClick} className="pd-btn" style={{
      position: 'absolute', right: 16, bottom: 14, zIndex: 25,
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderRadius: 16,
      border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
      boxShadow: SHADOW.lift, font: `800 14px/1 ${FONT_BODY}`,
    }}>
      <Icon name="plus" size={20} /> {label}
    </button>
  );
}

// ── 1. Game Library ───────────────────────────────────────────
function LibraryScreen({ app }) {
  const games = app.games;
  return (
    <div style={{ paddingBottom: 28 }}>
      <Header title="Library" sub={`${games.length} games · tap to manage modes`} />
      <div style={{ padding: '0 18px' }}>
        {/* New game — primary action, docked under the header like a tome's first tab */}
        <button onClick={() => app.openModal({ type: 'createGame' })} className="pd-btn" style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20,
          border: `1.5px solid ${C.gold}`, background: C.primary, color: '#fff', cursor: 'pointer',
          borderRadius: 16, padding: '15px 18px', boxShadow: SHADOW.lift, textAlign: 'left',
        }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.28)', display: 'grid', placeItems: 'center' }}>
            <Icon name="plus" size={22} color="#fff" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', font: `800 16px/1.1 ${FONT_HEAD}`, letterSpacing: 0.2 }}>New game</span>
            <span style={{ display: 'block', font: `400 12.5px/1.2 ${FONT_BODY}`, color: 'rgba(255,255,255,0.82)', marginTop: 3 }}>Start a category &amp; build its first mode</span>
          </span>
          <Icon name="chevR" size={20} color="rgba(255,255,255,0.85)" />
        </button>

        <SectionLabel>Your games</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {games.map(g => {
            const count = app.modes.filter(m => m.gameId === g.id).length;
            return (
              <Card key={g.id} onClick={() => app.push('modes', { gameId: g.id })} pad={14}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Stamp text={g.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `700 17px/1.2 ${FONT_HEAD}`, color: C.ink }}>{g.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 4, font: `400 13px/1 ${FONT_BODY}`, color: C.ink50, whiteSpace:'nowrap' }}>
                      <span>{count} {count === 1 ? 'mode' : 'modes'}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.ink35, flexShrink: 0 }} />
                      <span>{g.created}</span>
                    </div>
                  </div>
                  <Icon name="chevR" size={20} color={C.ink35} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 2. Mode Selector (drill-down) ─────────────────────────────
function ModeSelectorScreen({ app, params }) {
  const game = app.games.find(g => g.id === params.gameId);
  const modes = app.modes.filter(m => m.gameId === params.gameId);
  if (!game) return null;
  return (
    <div style={{ paddingBottom: 96 }}>
      <Header title={game.name} sub="Rule variations" onBack={app.pop}
        right={<button onClick={() => app.openModal({ type: 'gameConfig', gameId: game.id })} className="pd-tap" style={{
          border:'none', background: C.bgSunk, color: C.ink70, width: 40, height: 40, borderRadius: 12,
          display:'grid', placeItems:'center', cursor:'pointer' }}>
          <Icon name="edit" size={19} /></button>} />
      <div style={{ padding: '0 18px' }}>
        <SectionLabel>{modes.length} {modes.length === 1 ? 'mode' : 'modes'}</SectionLabel>
        {modes.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', border:`1.5px dashed ${C.ink12}`, borderRadius: 16,
            color: C.ink50, font:`400 13.5px/1.5 ${FONT_BODY}` }}>
            No modes yet.<br/>Tap <b style={{ color: C.primary }}>New mode</b> to build your first rule set.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modes.map(m => (
            <Card key={m.id} pad={16}>
              <div style={{ font: `700 16.5px/1.2 ${FONT_HEAD}`, color: C.ink }}>{m.name}</div>
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 10px', borderRadius: 8, background: C.bgSunk, whiteSpace: 'nowrap',
                font: `700 12px/1 ${FONT_BODY}`, color: C.ink70 }}>
                <span style={{ width: 5, height: 5, borderRadius:'50%', background: C.gold, flexShrink:0 }} />
                {describeMode(m.rules)}
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                <Button tone="primary" size="sm" icon="play" onClick={() => app.startFromMode(m)}>Start match</Button>
                <Button tone="ghost" size="sm" icon="edit" onClick={() => app.openModal({ type: 'editMode', gameId: game.id, mode: m })}>Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LibraryScreen, ModeSelectorScreen, Stamp, DockedAction });
