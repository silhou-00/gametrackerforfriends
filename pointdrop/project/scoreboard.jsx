// scoreboard.jsx — Active Scoreboard (real scoring) + Victory
const { useState: useSc, useEffect: useEc, useRef: useRc } = React;

function PopNumber({ value, style }) {
  const [pop, setPop] = useSc(false);
  const prev = useRc(value);
  useEc(() => {
    if (prev.current !== value) { setPop(true); const t = setTimeout(() => setPop(false), 240); prev.current = value; return () => clearTimeout(t); }
  }, [value]);
  return <div style={{ ...style, transform: pop ? 'scale(1.18)' : 'scale(1)', transition: 'transform .22s cubic-bezier(.34,1.56,.64,1)' }}>{value}</div>;
}

function ScoreboardScreen({ app }) {
  const m = app.activeMatch;
  const [listening, setListening] = useSc(false);
  if (!m) return null;
  const cfg = m.mode.rules;
  const roundBased = m.roundBased;
  const scores = m.players.map(p => ({ ...p,
    score: roundBased ? roundScoreOf(m.logs, p.id, m.round) : scoreOf(m.logs, p.id),
    wins: (m.roundWins || {})[p.id] || 0 }));
  const leadScore = Math.max(...scores.map(s => s.score), 0);
  const endR = (cfg.rules || []).find(r => r.trigger_event === 'on_round_won' && r.consequence && r.consequence.action === 'END_MATCH');
  const bestOf = roundBased && endR && (endR.conditions || [])[0] ? endR.conditions[0].threshold : null;

  // simulated offline voice intent
  const voice = () => {
    setListening(true);
    setTimeout(() => {
      const p = m.players[Math.floor(Math.random() * m.players.length)];
      app.addPoint(p.id, 1, 'voice');
      app.toast({ msg: `Added 1 point to ${p.name}`, tone: 'primary', icon: 'mic' });
      setListening(false);
    }, 1100);
  };

  const roundTarget = `Round ${m.round}`;

  return (
    <div style={{ paddingBottom: 150, minHeight: '100%' }}>
      {/* status header */}
      <div style={{ padding: '6px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => app.confirmQuit()} className="pd-tap" style={{ marginLeft: -8, width: 38, height: 38, borderRadius: 12,
            border: 'none', background: 'transparent', color: C.ink, display:'grid', placeItems:'center', cursor:'pointer' }}>
            <Icon name="back" size={24} />
          </button>
          <div style={{ display: 'flex', gap: 7 }}>
            <StatusPill tone={listening ? 'connect' : 'idle'} pulse={listening} label={listening ? 'Listening' : 'Mic ready'} onClick={voice} />
            {m.paired && <StatusPill tone="success" label="ConvoAI" />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font:`800 24px/1.1 ${FONT_HEAD}`, color: C.ink, letterSpacing: -0.5 }}>{m.mode.name}</div>
            <div style={{ font:`400 13px/1 ${FONT_BODY}`, color: C.ink50, marginTop: 6 }}>{describeMode(cfg)}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ font:`800 13px/1 ${FONT_BODY}`, color: C.primary, whiteSpace: 'nowrap' }}>{roundTarget}</div>
          </div>
        </div>
      </div>

      {/* player grid */}
      <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {scores.map(p => {
          const lead = p.score === leadScore && leadScore > 0;
          return (
            <div key={p.id} style={{
              background: C.surface, borderRadius: 18, padding: '14px 14px 14px',
              border: `1.5px solid ${lead ? C.primary : C.line}`, boxShadow: SHADOW.card, position: 'relative',
            }}>
              {lead && <div style={{ position:'absolute', top: 12, right: 12, color: C.primary }}><Icon name="trophy" size={16} /></div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.bgSunk, color: C.ink70,
                  display:'grid', placeItems:'center', font:`800 11px/1 ${FONT_BODY}` }}>{p.name[0].toUpperCase()}</div>
                <div style={{ font:`700 14px/1.1 ${FONT_BODY}`, color: C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex: 1, minWidth: 0 }}>{p.name}</div>
              </div>
              {roundBased && (
                <div title={`${p.wins} round${p.wins===1?'':'s'} won`} style={{ display:'flex', alignItems:'center', gap: 5, marginTop: 10, minHeight: 12 }}>
                  {Array.from({ length: Math.max(bestOf || 0, p.wins) }).map((_, i) => (
                    <span key={i} style={{ width: 10, height: 10, transform:'rotate(45deg)', borderRadius: 2,
                      background: i < p.wins ? C.gold : 'transparent', border: `1.5px solid ${i < p.wins ? C.gold : C.ink12}` }} />
                  ))}
                  <span style={{ marginLeft: 'auto', font:`800 10px/1 ${FONT_BODY}`, letterSpacing: 0.5, textTransform:'uppercase', color: C.gold }}>{p.wins} won</span>
                </div>
              )}
              <PopNumber value={p.score} style={{ font:`800 52px/1 ${FONT_HEAD}`, color: lead ? C.primary : C.ink, textAlign:'center', margin: '8px 0 12px', letterSpacing: -1 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => app.addPoint(p.id, -1)} className="pd-tap" style={{
                  width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${C.ink12}`, background: C.surface,
                  color: C.ink70, display:'grid', placeItems:'center', cursor:'pointer' }}>
                  <Icon name="minus" size={20} />
                </button>
                <button onClick={() => app.addPoint(p.id, 1)} className="pd-tap" style={{
                  flex: 1, height: 44, borderRadius: 12, border: 'none', background: C.primary, color: '#fff',
                  display:'grid', placeItems:'center', cursor:'pointer', boxShadow: SHADOW.card }}>
                  <Icon name="plus" size={22} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* round + voice controls */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 18px 18px',
        background: `linear-gradient(transparent, ${C.bg} 26%)`, display: 'flex', gap: 10 }}>
        <button onClick={voice} className="pd-btn" style={{
          width: 56, height: 56, borderRadius: 16, border: `1.5px solid ${listening ? C.connect : C.ink12}`,
          background: listening ? C.connectSoft : C.surface, color: listening ? C.connect : C.ink70,
          display:'grid', placeItems:'center', cursor:'pointer', flexShrink: 0 }}>
          <Icon name="mic" size={24} />
        </button>
        <Button full size="lg" tone="ghost" onClick={() => app.nextRound()} icon="reset">
          {roundBased ? 'Skip round (tie)' : 'Next round'}
        </Button>
      </div>
    </div>
  );
}

// ── Victory ───────────────────────────────────────────────────
function VictoryScreen({ app }) {
  const m = app.activeMatch;
  if (!m) return null;
  const roundBased = m.roundBased;
  const standings = m.players.map(p => ({ ...p, score: scoreOf(m.logs, p.id), wins: (m.roundWins || {})[p.id] || 0 }))
    .sort((a, b) => roundBased ? (b.wins - a.wins || b.score - a.score) : (b.score - a.score));
  const winner = (m.winnerId && standings.find(s => s.id === m.winnerId)) || standings[0];

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="pd-fade-in" style={{ padding: '30px 24px 10px', textAlign: 'center' }}>
        <div style={{ width: 78, height: 78, borderRadius: 24, margin: '0 auto 18px', background: C.primarySoft,
          color: C.primary, display:'grid', placeItems:'center' }} className="pd-pop">
          <Icon name="trophy" size={42} />
        </div>
        <div style={{ font:`700 13px/1 ${FONT_BODY}`, letterSpacing: 1.4, textTransform:'uppercase', color: C.primary }}>Winner</div>
        <div style={{ font:`800 38px/1.05 ${FONT_HEAD}`, color: C.ink, margin: '8px 0 6px', letterSpacing: -0.8 }}>{winner.name}</div>
        <div style={{ font:`400 14px/1 ${FONT_BODY}`, color: C.ink50 }}>
          {m.mode.name} · {roundBased ? `${winner.wins} ${winner.wins === 1 ? 'round' : 'rounds'} won` : `${m.round} ${m.round === 1 ? 'round' : 'rounds'}`}
        </div>
      </div>

      <div style={{ padding: '18px 18px 0', flex: 1 }}>
        <SectionLabel>Final standings</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {standings.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 13,
              background: i === 0 ? C.primarySoft : C.surface, borderRadius: 14, padding: '13px 16px',
              border: `1px solid ${i === 0 ? 'transparent' : C.line}`, boxShadow: i === 0 ? 'none' : SHADOW.card }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? C.primary : C.bgSunk,
                color: i === 0 ? '#fff' : C.ink70, display:'grid', placeItems:'center', font:`800 13px/1 ${FONT_HEAD}` }}>{i + 1}</div>
              <div style={{ flex: 1, font:`700 16px/1 ${FONT_BODY}`, color: C.ink }}>{p.name}</div>
              <div style={{ font:`800 24px/1 ${FONT_HEAD}`, color: i === 0 ? C.primary : C.ink }}>{roundBased ? p.wins : p.score}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '11px 14px',
          background: C.successSoft, borderRadius: 12 }}>
          <Icon name="shield" size={18} color={C.success} />
          <div style={{ font:`600 12.5px/1.35 ${FONT_BODY}`, color: C.ink70 }}>
            Signed · HMAC SHA-256 <span style={{ fontFamily:'ui-monospace, Menlo, monospace', color: C.success }}>{m.hash}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button full size="lg" onClick={() => app.viewLedger(m.id)} icon="history">View turn-by-turn ledger</Button>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button full tone="ghost" onClick={() => app.rematch()}>Rematch</Button>
          <Button full tone="ghost" onClick={() => app.endToHome()}>Done</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScoreboardScreen, VictoryScreen });
