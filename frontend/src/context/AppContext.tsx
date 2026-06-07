import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { Game, GameMode, Match, Player, AuditLog, RulesConfig, ActiveMatch } from '../engine/types';
import * as gamesDb from '../db/games';
import * as modesDb from '../db/gameModes';
import * as matchesDb from '../db/matches';
import * as playersDb from '../db/players';
import * as logsDb from '../db/auditLogs';
import { uid } from '../db/client';
import { evaluateRules, buildContext, winnerId, isRoundBased, signMatch as signMatchHmac } from '../engine/rulesEngine';
import { signMatch } from '../engine/hmac';

export interface ToastOpts {
  msg: string;
  tone?: 'primary' | 'success' | 'error' | 'warn' | 'connect';
  icon?: string;
  key?: number;
}

interface AppContextType {
  // Library state
  games: Game[];
  modes: GameMode[];
  loadLibrary: () => Promise<void>;
  createGame: (name: string) => Promise<Game>;
  renameGame: (id: string, name: string) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  createMode: (gameId: string, name: string, rules: RulesConfig) => Promise<GameMode>;
  updateMode: (id: string, patch: { name?: string; rules?: RulesConfig }) => Promise<void>;
  deleteMode: (id: string) => Promise<void>;

  // Match state
  activeMatch: ActiveMatch | null;
  matches: (Match & { players: Player[]; logs: AuditLog[] })[];
  loadMatches: () => Promise<void>;

  // Match actions
  startMatch: (mode: GameMode & { rules: RulesConfig }, roster: string[], paired: boolean) => Promise<void>;
  addPoint: (playerId: string, delta: number) => Promise<void>;
  nextRound: () => Promise<void>;
  rematch: () => Promise<void>;
  endToHome: () => void;
  confirmQuit: () => void;
  wipeAll: () => Promise<void>;

  // Toast
  toast: ToastOpts | null;
  showToast: (opts: ToastOpts) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [modes, setModes] = useState<GameMode[]>([]);
  const [matches, setMatches] = useState<(Match & { players: Player[]; logs: AuditLog[] })[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [toast, setToast] = useState<ToastOpts | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((opts: ToastOpts) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ ...opts, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // ── Library ──────────────────────────────────────────────────
  const loadLibrary = useCallback(async () => {
    const [gs, ms] = await Promise.all([gamesDb.listGames(), loadAllModes()]);
    setGames(gs);
    setModes(ms);
  }, []);

  async function loadAllModes(): Promise<GameMode[]> {
    const gs = await gamesDb.listGames();
    const all: GameMode[] = [];
    for (const g of gs) {
      const ms = await modesDb.listModes(g.id);
      all.push(...ms);
    }
    return all;
  }

  const createGame = useCallback(async (name: string): Promise<Game> => {
    const g = await gamesDb.createGame(name);
    setGames(prev => [...prev, g]);
    return g;
  }, []);

  const renameGame = useCallback(async (id: string, name: string) => {
    await gamesDb.renameGame(id, name);
    setGames(prev => prev.map(g => g.id === id ? { ...g, name } : g));
  }, []);

  const deleteGame = useCallback(async (id: string) => {
    await gamesDb.deleteGame(id);
    setGames(prev => prev.filter(g => g.id !== id));
    setModes(prev => prev.filter(m => m.game_id !== id));
  }, []);

  const createMode = useCallback(async (gameId: string, name: string, rules: RulesConfig): Promise<GameMode> => {
    const m = await modesDb.createMode(gameId, name, rules);
    setModes(prev => [...prev, m]);
    return m;
  }, []);

  const updateMode = useCallback(async (id: string, patch: { name?: string; rules?: RulesConfig }) => {
    await modesDb.updateMode(id, patch);
    setModes(prev => prev.map(m => m.id === id ? { ...m, ...patch, rules_config: patch.rules ? JSON.stringify(patch.rules) : m.rules_config } : m));
  }, []);

  const deleteMode = useCallback(async (id: string) => {
    await modesDb.deleteMode(id);
    setModes(prev => prev.filter(m => m.id !== id));
  }, []);

  // ── Match lifecycle ───────────────────────────────────────────
  const loadMatches = useCallback(async () => {
    const finished = await matchesDb.listFinishedMatches();
    const withData = await Promise.all(
      finished.map(async (mt) => {
        const [players, logs] = await Promise.all([
          playersDb.listPlayers(mt.id),
          logsDb.listLogs(mt.id),
        ]);
        return { ...mt, players, logs };
      })
    );
    setMatches(withData);
  }, []);

  const startMatch = useCallback(async (
    mode: GameMode & { rules: RulesConfig },
    roster: string[],
    paired: boolean
  ) => {
    const match = await matchesDb.createMatch(mode.id, mode.game_id, mode.name);
    const players = await Promise.all(roster.map(name => playersDb.addPlayer(match.id, name)));
    const roundBased = isRoundBased(mode.rules);
    setActiveMatch({
      match, mode, players, logs: [],
      roundWins: {}, roundBased, paired,
    });
  }, []);

  const addPoint = useCallback(async (playerId: string, delta: number) => {
    if (!activeMatch || activeMatch.match.status !== 'active') return;
    const { match, mode, players, roundWins } = activeMatch;
    const round = match.current_round;

    const newLog = await logsDb.appendLog(
      match.id, playerId,
      delta > 0 ? 'point_added' : 'point_removed',
      delta, round
    );
    const logs = [...activeMatch.logs, newLog];

    const ctx = buildContext(logs, players, playerId, round, activeMatch.roundBased, roundWins);
    const cons = evaluateRules(mode.rules, 'on_point_added', ctx);

    if (cons) {
      if (cons.action === 'END_MATCH') {
        const wId = winnerId(cons, ctx, playerId);
        const hash = await signMatch(match.id, logs);
        await matchesDb.finishMatch(match.id, hash, wId, round);
        setActiveMatch(prev => prev ? { ...prev, logs, match: { ...prev.match, status: 'finished' }, hash, winnerId: wId } : prev);
        return;
      }

      if (cons.action === 'WIN_ROUND') {
        const wId = winnerId(cons, ctx, playerId);
        const newRoundWins = { ...roundWins, [wId]: (roundWins[wId] || 0) + 1 };
        const wonRound = round;
        await matchesDb.advanceRound(match.id);
        await matchesDb.updateRoundWins(match.id, newRoundWins);
        showToast({ msg: `${players.find(p => p.id === wId)?.name} takes round ${wonRound}`, tone: 'success', icon: 'trophy' });

        const newRound = round + 1;
        const ctx2 = buildContext(logs, players, wId, newRound, activeMatch.roundBased, newRoundWins);
        const end = evaluateRules(mode.rules, 'on_round_won', ctx2);
        if (end && end.action === 'END_MATCH') {
          const endWId = winnerId(end, ctx2, wId);
          const hash = await signMatch(match.id, logs);
          await matchesDb.finishMatch(match.id, hash, endWId, newRound);
          setActiveMatch(prev => prev ? {
            ...prev, logs,
            match: { ...prev.match, current_round: newRound, status: 'finished' },
            roundWins: newRoundWins, hash, winnerId: endWId,
          } : prev);
          return;
        }
        setActiveMatch(prev => prev ? {
          ...prev, logs,
          match: { ...prev.match, current_round: newRound },
          roundWins: newRoundWins,
        } : prev);
        return;
      }

      if (cons.action === 'SET_VALUE') {
        const correction = cons.value! - ctx.actingScore;
        const corrLog = await logsDb.appendLog(match.id, playerId, 'penalty_applied', correction, round);
        const updatedLogs = [...logs, corrLog];
        showToast({ msg: `${players.find(p => p.id === playerId)?.name} → set to ${cons.value}`, tone: 'error', icon: 'reset' });
        setActiveMatch(prev => prev ? { ...prev, logs: updatedLogs } : prev);
        return;
      }

      if (cons.action === 'MODIFY_VALUE') {
        const bonusLog = await logsDb.appendLog(match.id, playerId, 'bonus_applied', cons.value!, round);
        const updatedLogs = [...logs, bonusLog];
        showToast({ msg: `${players.find(p => p.id === playerId)?.name} +${cons.value} bonus`, tone: 'success', icon: 'plus' });
        setActiveMatch(prev => prev ? { ...prev, logs: updatedLogs } : prev);
        return;
      }

      if (cons.action === 'UPDATE_STATUS') {
        showToast({ msg: `${players.find(p => p.id === playerId)?.name} eliminated`, tone: 'warn', icon: 'close' });
      }
    }

    setActiveMatch(prev => prev ? { ...prev, logs } : prev);
  }, [activeMatch, showToast]);

  const nextRound = useCallback(async () => {
    if (!activeMatch || activeMatch.match.status !== 'active') return;
    const { match, mode, players, roundWins } = activeMatch;
    const newRound = match.current_round + 1;
    await matchesDb.advanceRound(match.id);
    const ctx = buildContext(activeMatch.logs, players, '', newRound, activeMatch.roundBased, roundWins);
    const cons = evaluateRules(mode.rules, 'on_round_advanced', ctx);
    if (cons && cons.action === 'END_MATCH') {
      const wId = winnerId(cons, ctx, '');
      const hash = await signMatch(match.id, activeMatch.logs);
      await matchesDb.finishMatch(match.id, hash, wId, match.current_round);
      setActiveMatch(prev => prev ? {
        ...prev, match: { ...prev.match, status: 'finished' }, hash, winnerId: wId,
      } : prev);
      return;
    }
    setActiveMatch(prev => prev ? { ...prev, match: { ...prev.match, current_round: newRound } } : prev);
    showToast({ msg: `Round ${newRound}`, tone: 'primary', icon: 'reset' });
  }, [activeMatch, showToast]);

  const rematch = useCallback(async () => {
    if (!activeMatch) return;
    const { mode, players } = activeMatch;
    const match = await matchesDb.createMatch(mode.id, mode.game_id, mode.name);
    const newPlayers = await Promise.all(players.map(p => playersDb.addPlayer(match.id, p.name)));
    setActiveMatch({
      match, mode, players: newPlayers, logs: [],
      roundWins: {}, roundBased: activeMatch.roundBased, paired: activeMatch.paired,
    });
    showToast({ msg: 'Rematch · roster reset to 0', tone: 'success', icon: 'reset' });
  }, [activeMatch, showToast]);

  const endToHome = useCallback(() => {
    setActiveMatch(null);
  }, []);

  const confirmQuit = useCallback(() => {
    setActiveMatch(null);
    showToast({ msg: 'Match left — not recorded', tone: 'warn' });
  }, [showToast]);

  const wipeAll = useCallback(async () => {
    const db = await import('../db/client').then(m => m.getDb());
    await db.execAsync('DELETE FROM AuditLogs; DELETE FROM Players; DELETE FROM Matches; DELETE FROM GameModes; DELETE FROM Games;');
    setGames([]);
    setModes([]);
    setMatches([]);
    setActiveMatch(null);
    showToast({ msg: 'Local data wiped', tone: 'error', icon: 'trash' });
  }, [showToast]);

  return (
    <AppContext.Provider value={{
      games, modes, loadLibrary, createGame, renameGame, deleteGame,
      createMode, updateMode, deleteMode,
      activeMatch, matches, loadMatches,
      startMatch, addPoint, nextRound, rematch, endToHome, confirmQuit, wipeAll,
      toast, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
