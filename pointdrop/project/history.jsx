// history.jsx — History module: Match list → Ledger → PDF export
const { useState: useSh, useEffect: useEh } = React;

function HistoryScreen({ app }) {
  const matches = app.matches.slice().reverse();
  return (
    <div style={{ paddingBottom: 96 }}>
      <Header title="History" sub={`${matches.length} completed sessions`} />
      <div style={{ padding: '0 18px' }}>
        <SectionLabel>Archived matches</SectionLabel>
        {matches.length === 0 && (
          <div style={{ textAlign:'center', padding: '50px 20px', color: C.ink50, font:`400 14px/1.5 ${FONT_BODY}` }}>
            No matches yet.<br/>Finished games are signed and saved here.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.map(mt => {
            const standings = mt.players.map(p => ({ ...p, score: scoreOf(mt.logs, p.id) })).sort((a, b) => b.score - a.score);
            const winner = standings[0];
            return (
              <Card key={mt.id} onClick={() => app.push('detail', { matchId: mt.id })} pad={15}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <div style={{ font:`700 16px/1.2 ${FONT_HEAD}`, color: C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth: 0 }}>{mt.title}</div>
                      {mt.tampered && <span style={{ font:`800 10px/1 ${FONT_BODY}`, letterSpacing:0.5, color: C.error, flexShrink: 0,
                        background: C.errorSoft, padding:'3px 7px', borderRadius: 6 }}>TAMPERED</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 5, font:`400 12.5px/1 ${FONT_BODY}`, color: C.ink50, whiteSpace:'nowrap' }}>
                      <span>{mt.modeName}</span>
                      <span style={{ width: 3, height: 3, borderRadius:'50%', background: C.ink35, flexShrink: 0 }} />
                      <span>{mt.dateLabel}</span>
                    </div>
                  </div>
                  <Icon name="chevR" size={18} color={C.ink35} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, whiteSpace: 'nowrap' }}>
                  <Icon name="trophy" size={15} color={C.primary} />
                  <span style={{ font:`700 13.5px/1 ${FONT_BODY}`, color: C.ink }}>{winner.name}</span>
                  <span style={{ font:`400 13px/1 ${FONT_BODY}`, color: C.ink50 }}>won · {winner.score} pts</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ font:`400 12px/1 ${FONT_BODY}`, color: C.ink35, flexShrink: 0 }}>{mt.players.length} players</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchDetailScreen({ app, params }) {
  const mt = app.matches.find(m => m.id === params.matchId);
  const [pdf, setPdf] = useSh(false);
  if (!mt) return null;
  const standings = mt.players.map(p => ({ ...p, score: scoreOf(mt.logs, p.id) })).sort((a, b) => b.score - a.score);
  const nameOf = id => mt.players.find(p => p.id === id)?.name || '—';
  // build chronological ledger with running totals
  const running = {};
  const ledger = mt.logs.map(l => {
    running[l.playerId] = (running[l.playerId] || 0) + l.delta;
    return { ...l, total: running[l.playerId], name: nameOf(l.playerId) };
  }).reverse();

  return (
    <div style={{ paddingBottom: 96 }}>
      <Header title={mt.title} sub={`${mt.modeName} · ${mt.dateLabel}`} onBack={app.pop}
        right={<button onClick={() => setPdf(true)} className="pd-tap" style={{ border:'none', background: C.primarySoft,
          color: C.primary, width: 40, height: 40, borderRadius: 12, display:'grid', placeItems:'center', cursor:'pointer' }}>
          <Icon name="download" size={20} /></button>} />

      <div style={{ padding: '0 18px' }}>
        {/* integrity banner */}
        <div style={{ display:'flex', alignItems:'center', gap: 10, padding: '12px 14px', borderRadius: 14, marginBottom: 16,
          background: mt.tampered ? C.errorSoft : C.successSoft }}>
          <Icon name="shield" size={20} color={mt.tampered ? C.error : C.success} />
          <div style={{ flex: 1 }}>
            <div style={{ font:`700 13.5px/1.2 ${FONT_BODY}`, color: mt.tampered ? C.error : C.ink }}>
              {mt.tampered ? 'Signature mismatch' : 'Integrity verified'}
            </div>
            <div style={{ font:`400 11.5px/1.2 ${FONT_BODY}`, color: C.ink50, marginTop: 2, fontFamily: mt.tampered ? FONT_BODY : 'ui-monospace, Menlo, monospace' }}>
              {mt.tampered ? 'AuditLogs edited outside the app' : `HMAC ${mt.hash}`}
            </div>
          </div>
        </div>

        {/* standings strip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
          {standings.map((p, i) => (
            <div key={p.id} style={{ flexShrink: 0, minWidth: 92, background: i===0?C.primarySoft:C.surface, borderRadius: 14,
              padding: '12px 14px', border: `1px solid ${i===0?'transparent':C.line}`, boxShadow: i===0?'none':SHADOW.card }}>
              <div style={{ font:`700 12px/1 ${FONT_BODY}`, color: C.ink70, whiteSpace:'nowrap' }}>{i+1}. {p.name}</div>
              <div style={{ font:`800 28px/1 ${FONT_HEAD}`, color: i===0?C.primary:C.ink, marginTop: 6 }}>{p.score}</div>
            </div>
          ))}
        </div>

        <SectionLabel>Turn-by-turn ledger · {mt.logs.length} entries</SectionLabel>
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: SHADOW.card, overflow:'hidden' }}>
          {ledger.map((l, i) => (
            <div key={l.id} style={{ display:'flex', alignItems:'center', gap: 12, padding: '11px 15px',
              borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: l.delta > 0 ? C.successSoft : C.errorSoft, color: l.delta > 0 ? C.success : C.error,
                display:'grid', placeItems:'center', font:`800 13px/1 ${FONT_BODY}` }}>{l.delta > 0 ? `+${l.delta}` : l.delta}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font:`700 14px/1.2 ${FONT_BODY}`, color: C.ink }}>{l.name}</div>
                <div style={{ font:`400 11.5px/1 ${FONT_BODY}`, color: C.ink50, marginTop: 2 }}>
                  {l.action.replace('_', ' ')} · R{l.round}
                </div>
              </div>
              <div style={{ font:`800 16px/1 ${FONT_HEAD}`, color: C.ink }}>{l.total}</div>
            </div>
          ))}
        </div>
      </div>

      <PdfExportSheet open={pdf} onClose={() => setPdf(false)} app={app} match={mt} />
    </div>
  );
}

function PdfExportSheet({ open, onClose, app, match }) {
  const [phase, setPhase] = useSh('idle'); // idle, checking, rendering, done, offline
  useEh(() => { if (open) setPhase('idle'); }, [open]);
  const run = (online = true) => {
    if (!online) { setPhase('offline'); return; }
    setPhase('checking');
    setTimeout(() => setPhase('rendering'), 900);
    setTimeout(() => setPhase('done'), 2200);
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ font:`800 18px/1.1 ${FONT_HEAD}`, color: C.ink, marginBottom: 4 }}>Export PDF report</div>
      <div style={{ font:`400 13px/1.4 ${FONT_BODY}`, color: C.ink50, marginBottom: 18 }}>
        Renders remotely via the FastAPI engine — needs internet.
      </div>

      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row icon="lan" label="Audit logs bundled" detail={`${match.logs.length} entries · ${match.players.length} players`} tone="success" />
          <Row icon="shield" label="Signature attached" detail={match.tampered ? 'flagged tampered' : match.hash} tone={match.tampered ? 'error' : 'success'} />
          <div style={{ marginTop: 8 }}><Button full size="lg" onClick={() => run(true)} icon="download">Generate & share</Button></div>
          <button onClick={() => run(false)} style={{ border:'none', background:'transparent', color: C.ink50,
            font:`600 12.5px/1 ${FONT_BODY}`, cursor:'pointer', padding: 6 }}>Simulate offline</button>
        </div>
      )}
      {(phase === 'checking' || phase === 'rendering') && (
        <div style={{ padding: '14px 0', display:'flex', flexDirection:'column', gap: 14 }}>
          <Row icon="wifi" label="Connectivity verified" detail="Online" tone="success" done />
          <div style={{ display:'flex', alignItems:'center', gap: 13 }}>
            <span className="pd-spin" style={{ width: 26, height: 26, borderRadius:'50%', border:`2.5px solid ${C.connect}`, borderTopColor:'transparent' }} />
            <div>
              <div style={{ font:`700 14.5px/1.2 ${FONT_BODY}`, color: C.ink }}>{phase === 'checking' ? 'Transmitting payload' : 'Rendering with WeasyPrint'}</div>
              <div style={{ font:`400 12px/1 ${FONT_BODY}`, color: C.ink50, marginTop: 2 }}>Jinja2 → HTML → PDF · in-memory stream</div>
            </div>
          </div>
        </div>
      )}
      {phase === 'done' && (
        <div className="pd-fade-in" style={{ textAlign:'center', padding: '6px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, margin:'0 auto 14px', background: C.successSoft, color: C.success, display:'grid', placeItems:'center' }} className="pd-pop">
            <Icon name="check" size={30} />
          </div>
          <div style={{ font:`800 18px/1.2 ${FONT_HEAD}`, color: C.ink, marginBottom: 6 }}>Report ready</div>
          <div style={{ font:`400 13px/1.5 ${FONT_BODY}`, color: C.ink50, marginBottom: 18 }}>
            Streamed back as StreamingResponse — zero files on the server. Sent to your OS share sheet.
          </div>
          <Button full size="lg" onClick={() => { onClose(); app.toast({ msg: 'Opened in share sheet', tone: 'success', icon: 'check' }); }}>Done</Button>
        </div>
      )}
      {phase === 'offline' && (
        <div className="pd-fade-in" style={{ textAlign:'center', padding: '6px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, margin:'0 auto 14px', background: C.errorSoft, color: C.error, display:'grid', placeItems:'center' }}>
            <Icon name="close" size={28} />
          </div>
          <div style={{ font:`800 18px/1.2 ${FONT_HEAD}`, color: C.ink, marginBottom: 6 }}>You're offline</div>
          <div style={{ font:`400 13px/1.5 ${FONT_BODY}`, color: C.ink50, marginBottom: 18 }}>
            PDF generation needs an internet connection. Your scores are safe locally — export when you're back online.
          </div>
          <Button full tone="ghost" onClick={() => setPhase('idle')}>Try again</Button>
        </div>
      )}
    </Sheet>
  );
}

function Row({ icon, label, detail, tone, done }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '11px 13px', background: C.bgSunk, borderRadius: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: C.surface, color: C[tone] || C.ink70, display:'grid', placeItems:'center', flexShrink:0 }}>
        <Icon name={done ? 'check' : icon} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font:`700 13.5px/1.2 ${FONT_BODY}`, color: C.ink }}>{label}</div>
        <div style={{ font:`400 11.5px/1 ${FONT_BODY}`, color: C.ink50, marginTop: 2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily: 'ui-monospace, Menlo, monospace' }}>{detail}</div>
      </div>
    </div>
  );
}

Object.assign(window, { HistoryScreen, MatchDetailScreen });
