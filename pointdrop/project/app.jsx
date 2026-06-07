// app.jsx — PointDrop shell: navigation, dynamic rules engine, modals, device frame
const { useState: useA, useRef: useAR } = React;

const REGISTRY = {
  library: LibraryScreen, modes: ModeSelectorScreen,
  setup: MatchSetupScreen, scoreboard: ScoreboardScreen, victory: VictoryScreen,
  history: HistoryScreen, detail: MatchDetailScreen, settings: SettingsScreen,
};
const IMMERSIVE = new Set(['scoreboard', 'victory']);
const DOCKED = { modes: 'New mode' };
const INITIAL_STACKS = () => ({
  library: [{ name: 'library' }], play: [{ name: 'setup' }],
  history: [{ name: 'history' }], settings: [{ name: 'settings' }],
});

// build the live evaluation context for the rules engine
function buildCtx(logs, players, actingId, round, roundBased, roundWins) {
  roundWins = roundWins || {};
  const sc = (p) => roundBased ? roundScoreOf(logs, p.id, round) : scoreOf(logs, p.id);
  const scores = players.map(p => ({ id: p.id, s: sc(p) }));
  const acting = scores.find(x => x.id === actingId);
  // round-based modes rank by round-wins first, then live score; otherwise by score
  const rank = (x) => roundBased ? (roundWins[x.id] || 0) * 1e6 + x.s : x.s;
  const leader = scores.reduce((m, x) => (rank(x) > rank(m) ? x : m), scores[0] || { id: null, s: 0 });
  const opponentMax = scores.filter(x => x.id !== actingId).reduce((m, x) => Math.max(m, x.s), 0);
  return { actingScore: acting ? acting.s : 0, round, opponentMax,
    leaderId: leader.id, leaderScore: leader.s, actingRoundWins: roundWins[actingId] || 0, roundWins };
}
function winnerId(cons, ctx, actingId) {
  const w = cons && cons.winner;
  if (w === 'leader' || w === 'player_with_highest_score') return ctx.leaderId;
  return actingId || ctx.leaderId;
}

function App() {
  const seed = useAR(seedWorld()).current;
  const [games, setGames] = useA(seed.games);
  const [modes, setModes] = useA(seed.modes);
  const [matches, setMatches] = useA(seed.matches);
  const [activeMatch, setActive] = useA(null);
  const [tab, setTab] = useA('library');
  const [stacks, setStacks] = useA(INITIAL_STACKS);
  const [dir, setDir] = useA('fade');
  const [navKey, setNavKey] = useA(0);
  const [toast, setToastState] = useA(null);
  const [modal, setModal] = useA(null);
  const toastTimer = useAR(null);

  const bump = (d) => { setDir(d); setNavKey(k => k + 1); };
  const push = (name, params) => { setStacks(s => ({ ...s, [tab]: [...s[tab], { name, params }] })); bump('fwd'); };
  const pop = () => { setStacks(s => (s[tab].length > 1 ? { ...s, [tab]: s[tab].slice(0, -1) } : s)); bump('back'); };
  const switchTab = (t) => { if (t === tab) return; setTab(t); bump('fade'); };
  const setStack = (t, arr) => setStacks(s => ({ ...s, [t]: arr }));

  const toastFn = (opts) => { clearTimeout(toastTimer.current); setToastState({ ...opts, key: Date.now() }); toastTimer.current = setTimeout(() => setToastState(null), 2600); };
  const openModal = (m) => setModal(m);
  const closeModal = () => setModal(null);

  // ── Library actions ──
  const createGame = (name) => { const id = uid('g'); setGames(g => [...g, { id, name, created: 'Jun 2026' }]); return id; };
  const submitNewGame = (name) => { const id = createGame(name); setModal({ type: 'createMode', gameId: id }); };
  const createMode = ({ gameId, name, rules }) => setModes(m => [...m, { id: uid('m'), gameId, name, rules }]);
  const updateMode = (id, patch) => setModes(ms => ms.map(m => m.id === id ? { ...m, ...patch } : m));
  const renameGame = (id, name) => setGames(gs => gs.map(g => g.id === id ? { ...g, name } : g));
  const deleteGame = (id) => { setGames(gs => gs.filter(g => g.id !== id)); setModes(ms => ms.filter(m => m.gameId !== id)); setStack('library', [{ name: 'library' }]); bump('back'); };

  // ── Match lifecycle ──
  const startFromMode = (mode) => { setStack('play', [{ name: 'setup', params: { mode } }]); switchTab('play'); };

  const startMatch = ({ mode, roster, paired }) => {
    const game = games.find(g => g.id === mode.gameId);
    const players = roster.map(name => ({ id: uid('p'), name }));
    const roundBased = isRoundBased(mode.rules);
    setActive({ id: uid('match'), mode, paired, players, logs: [], round: 1, status: 'active',
      eliminated: [], roundWins: {}, roundBased, note: null, title: game ? game.name : mode.name, modeName: mode.name, rules: mode.rules });
    setStack('play', [{ name: 'scoreboard' }]); bump('fwd');
  };

  const recordToHistory = (match) => {
    const hash = 'a3f' + Math.random().toString(16).slice(2, 8);
    setMatches(ms => [...ms, { id: match.id, title: match.title, modeName: match.mode.name,
      rulesLabel: describeMode(match.mode.rules), dateLabel: 'Today', tampered: false, status: 'finished',
      players: match.players, logs: match.logs, round: match.round, hash }]);
    return hash;
  };
  const finish = (match, winId) => {
    const hash = recordToHistory(match);
    setActive({ ...match, status: 'finished', hash, winnerId: winId });
    setStack('play', [{ name: 'scoreboard' }, { name: 'victory' }]); bump('fwd');
  };

  // DYNAMIC: append a point, then let the engine evaluate consequences
  const addPoint = (playerId, delta, source) => {
    if (!activeMatch || activeMatch.status !== 'active') return;
    const m = activeMatch;
    const nameOf = id => m.players.find(p => p.id === id)?.name || 'Player';
    let logs = [...m.logs, { id: uid('log'), playerId, action: delta > 0 ? 'point_added' : 'point_removed', delta, round: m.round, ts: Date.now() }];

    let ctx = buildCtx(logs, m.players, playerId, m.round, m.roundBased, m.roundWins);
    const cons = evaluateRules(m.rules, 'on_point_added', ctx);

    if (cons) {
      if (cons.action === 'END_MATCH') { finish({ ...m, logs }, winnerId(cons, ctx, playerId)); return; }
      if (cons.action === 'WIN_ROUND') {
        const winId = winnerId(cons, ctx, playerId);
        const roundWins = { ...(m.roundWins || {}), [winId]: ((m.roundWins || {})[winId] || 0) + 1 };
        const wonRound = m.round;
        const updated = { ...m, logs, roundWins, round: m.round + 1 };
        toastFn({ msg: `${nameOf(winId)} takes round ${wonRound}`, tone: 'success', icon: 'trophy' });
        const ctx2 = buildCtx(logs, m.players, winId, updated.round, m.roundBased, roundWins);
        const end = evaluateRules(m.rules, 'on_round_won', ctx2);
        if (end && end.action === 'END_MATCH') { finish(updated, winnerId(end, ctx2, winId)); return; }
        setActive(updated); return;
      }
      if (cons.action === 'SET_VALUE') {
        const corr = cons.value - ctx.actingScore;
        logs = [...logs, { id: uid('log'), playerId, action: 'penalty_applied', delta: corr, round: m.round, ts: Date.now() }];
        toastFn({ msg: `${nameOf(playerId)} → set to ${cons.value}`, tone: 'error', icon: 'reset' });
      } else if (cons.action === 'MODIFY_VALUE') {
        logs = [...logs, { id: uid('log'), playerId, action: 'bonus_applied', delta: cons.value, round: m.round, ts: Date.now() }];
        toastFn({ msg: `${nameOf(playerId)} +${cons.value} bonus`, tone: 'success', icon: 'plus' });
      } else if (cons.action === 'UPDATE_STATUS') {
        toastFn({ msg: `${nameOf(playerId)} eliminated`, tone: 'warn', icon: 'close' });
        setActive({ ...m, logs, eliminated: [...m.eliminated, playerId] }); return;
      }
      // re-check end conditions once after a value mutation
      const ctx2 = buildCtx(logs, m.players, playerId, m.round, m.roundBased, m.roundWins);
      const end = evaluateRules(m.rules, 'on_point_added', ctx2);
      if (end && end.action === 'END_MATCH') { finish({ ...m, logs }, winnerId(end, ctx2, playerId)); return; }
    }
    setActive({ ...m, logs });
  };

  const nextRound = () => {
    if (!activeMatch || activeMatch.status !== 'active') return;
    const m = activeMatch;
    const newRound = m.round + 1;
    const ctx = buildCtx(m.logs, m.players, null, newRound, m.roundBased, m.roundWins);
    const cons = evaluateRules(m.rules, 'on_round_advanced', ctx);
    if (cons && cons.action === 'END_MATCH') { finish({ ...m, round: m.round }, winnerId(cons, ctx, null)); return; }
    setActive({ ...m, round: newRound });
    toastFn({ msg: `Round ${newRound}`, tone: 'primary', icon: 'reset' });
  };

  const viewLedger = (id) => { setStack('history', [{ name: 'history' }, { name: 'detail', params: { matchId: id } }]); switchTab('history'); };
  const rematch = () => {
    const m = activeMatch;
    const players = m.players.map(p => ({ id: uid('p'), name: p.name }));
    setActive({ ...m, id: uid('match'), players, logs: [], round: 1, status: 'active', eliminated: [], roundWins: {}, hash: undefined, winnerId: undefined });
    setStack('play', [{ name: 'scoreboard' }]); bump('back');
    toastFn({ msg: 'Rematch · roster reset to 0', tone: 'success', icon: 'reset' });
  };
  const endToHome = () => { setActive(null); setStack('play', [{ name: 'setup' }]); switchTab('play'); };
  const confirmQuit = () => { endToHome(); toastFn({ msg: 'Match left — not recorded', tone: 'warn' }); };
  const wipeAll = () => { setGames([]); setModes([]); setMatches([]); setActive(null); setStacks(INITIAL_STACKS()); setTab('library'); bump('fade'); };

  const cur = stacks[tab];
  const top = cur[cur.length - 1];
  const Screen = REGISTRY[top.name];
  const immersive = IMMERSIVE.has(top.name);
  const docked = !immersive && DOCKED[top.name];

  const app = {
    games, modes, matches, activeMatch, tab,
    push, pop, switchTab, openModal, closeModal,
    createGame, submitNewGame, createMode, updateMode, renameGame, deleteGame,
    startFromMode, startMatch, addPoint, nextRound,
    viewLedger, rematch, endToHome, confirmQuit, wipeAll, toast: toastFn,
  };

  const animClass = dir === 'fwd' ? 'pd-screen-fwd' : dir === 'back' ? 'pd-screen-back' : 'pd-screen-fade';

  return (
    <div style={{
      width: 412, height: 892, borderRadius: 44, overflow: 'hidden', position: 'relative',
      background: C.bg, border: '11px solid #1E150D',
      boxShadow: '0 44px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(176,138,79,0.5)',
      display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT_BODY,
    }}>
      <div className="pd-paper" style={{ background: C.bg }}><AndroidStatusBar dark={false} /></div>

      <div className="pd-paper" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: C.bg }}>
        <div key={navKey} className={animClass} style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
          <Screen app={app} params={top.params} />
        </div>
        {docked && <DockedAction label={docked} onClick={() => openModal(top.name === 'library' ? { type: 'createGame' } : { type: 'createMode', gameId: top.params.gameId })} />}
        <Toast toast={toast} />
        {modal && <ModalHost app={app} modal={modal} onClose={closeModal} />}
      </div>

      {!immersive && <TabBar tab={tab} onTab={switchTab} />}
      <div className="pd-paper" style={{ background: immersive ? C.bg : C.surface }}><AndroidNavBar dark={false} /></div>
    </div>
  );
}

function ModalHost({ app, modal, onClose }) {
  if (modal.type === 'createGame') return <CreateGameModal app={app} onClose={onClose} />;
  if (modal.type === 'createMode') return <ModeCreatorModal app={app} gameId={modal.gameId} onClose={onClose} />;
  if (modal.type === 'editMode')   return <ModeCreatorModal app={app} gameId={modal.gameId} editMode={modal.mode} onClose={onClose} />;
  if (modal.type === 'gameConfig') return <GameConfigModal app={app} gameId={modal.gameId} onClose={onClose} />;
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
