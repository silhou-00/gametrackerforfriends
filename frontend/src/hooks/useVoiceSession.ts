import { useEffect, useRef, useState, useCallback } from 'react';
import type { Player } from '../engine/types';

export const VOICE_LLM_KEY_STORAGE = 'pointdrop_voice_llm_key';
export const VOICE_LLM_MODEL_STORAGE = 'pointdrop_voice_llm_model';

interface VoiceSessionOpts {
  enabled: boolean;
  matchId: string | undefined;
  players: Player[];
  modeName: string;
  rulesSummary?: string;
  serverUrl: string;
  addPoint: (playerId: string, delta: number) => Promise<void>;
  nextRound: () => Promise<void>;
}

/**
 * Registers the active match with the backend (which sets Agora RTM presence),
 * then polls for voice commands every 2s and applies them locally.
 * The R1 device / Agora ConvoAI agent handles all voice processing.
 */
export function useVoiceSession({
  enabled,
  matchId,
  players,
  modeName,
  rulesSummary,
  serverUrl,
  addPoint,
  nextRound,
}: VoiceSessionOpts) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const resolvePlayer = useCallback((name: string): Player | null => {
    const lower = name.toLowerCase().trim();
    return (
      players.find(p => p.name.toLowerCase() === lower) ||
      players.find(p => p.name.toLowerCase().startsWith(lower)) ||
      players.find(p => lower.includes(p.name.toLowerCase().split(' ')[0])) ||
      null
    );
  }, [players]);

  const applyCommand = useCallback(async (cmd: Record<string, any>) => {
    if (cmd.action === 'add_score') {
      const player = resolvePlayer(cmd.player_name || '');
      if (player) await addPoint(player.id, Number(cmd.delta ?? 0));
    } else if (cmd.action === 'next_round') {
      await nextRound();
    }
  }, [resolvePlayer, addPoint, nextRound]);

  const pollCommands = useCallback(async () => {
    if (!matchId || !serverUrl) return;
    try {
      const res = await fetch(`${serverUrl.trim()}/api/voice/commands/${matchId}`);
      if (!res.ok) return;
      const { commands } = await res.json();
      if (commands?.length) {
        for (const cmd of commands) await applyCommand(cmd);
      }
    } catch {
      // backend unreachable — silently skip poll
    }
  }, [matchId, serverUrl, applyCommand]);

  const startSession = useCallback(async () => {
    if (!matchId || !serverUrl || !enabled) return;
    try {
      const res = await fetch(`${serverUrl.trim()}/api/voice/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          players: players.map(p => ({ id: p.id, name: p.name })),
          mode_name: modeName,
          rules_summary: rulesSummary,
        }),
      });

      if (!res.ok) {
        const { detail } = await res.json().catch(() => ({ detail: 'Unknown error' }));
        if (mountedRef.current) setError(detail || 'Failed to register match');
        return;
      }

      if (mountedRef.current) {
        setActive(true);
        setError(null);
      }
    } catch {
      if (mountedRef.current) setError('Cannot reach backend — check Settings → Host server');
    }
  }, [matchId, serverUrl, enabled, players, modeName, rulesSummary]);

  const stopSession = useCallback(async () => {
    if (!matchId || !serverUrl) return;
    try {
      await fetch(`${serverUrl.trim()}/api/voice/stop/${matchId}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    if (mountedRef.current) setActive(false);
  }, [matchId, serverUrl]);

  // Start/stop when enabled changes
  useEffect(() => {
    if (enabled && matchId) startSession();
    return () => { if (enabled && matchId) stopSession(); };
  }, [enabled, matchId]);

  // Poll every 2s when active
  useEffect(() => {
    if (!active) return;
    pollRef.current = setInterval(pollCommands, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, pollCommands]);

  return { active, error };
}
