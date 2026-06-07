import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Manages an Agora ConvoAI voice session for the active scoreboard.
 * When enabled, spawns an agent on the backend, then polls for commands every 2 s.
 * Commands are resolved to player IDs by fuzzy name match and applied locally.
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
  const [agentId, setAgentId] = useState<string | null>(null);
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
    // end_match is handled server-side by the rules engine triggering on score
  }, [resolvePlayer, addPoint, nextRound]);

  const pollCommands = useCallback(async () => {
    if (!matchId || !serverUrl) return;
    try {
      const res = await fetch(`${serverUrl.trim()}/api/voice/commands/${matchId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      const { commands } = await res.json();
      if (commands?.length) {
        for (const cmd of commands) {
          await applyCommand(cmd);
        }
      }
    } catch {
      // backend unreachable — silently skip
    }
  }, [matchId, serverUrl, applyCommand]);

  const startSession = useCallback(async () => {
    if (!matchId || !serverUrl || !enabled) return;
    try {
      const llmApiKey = await AsyncStorage.getItem(VOICE_LLM_KEY_STORAGE) || '';
      const llmModel = await AsyncStorage.getItem(VOICE_LLM_MODEL_STORAGE) || 'gpt-4o-mini';

      if (!llmApiKey) {
        setError('LLM API key not configured in Settings → Voice');
        return;
      }

      const res = await fetch(`${serverUrl.trim()}/api/voice/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          players: players.map(p => ({ id: p.id, name: p.name })),
          mode_name: modeName,
          rules_summary: rulesSummary,
          llm_api_key: llmApiKey,
          llm_model: llmModel,
        }),
      });

      if (!res.ok) {
        const { detail } = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setError(detail || 'Failed to start voice session');
        return;
      }

      const { agent_id } = await res.json();
      if (mountedRef.current) {
        setAgentId(agent_id);
        setActive(true);
        setError(null);
      }
    } catch (e: any) {
      if (mountedRef.current) setError('Cannot reach backend for voice session');
    }
  }, [matchId, serverUrl, enabled, players, modeName, rulesSummary]);

  const stopSession = useCallback(async () => {
    if (!matchId || !serverUrl) return;
    try {
      await fetch(`${serverUrl.trim()}/api/voice/stop/${matchId}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    if (mountedRef.current) {
      setActive(false);
      setAgentId(null);
    }
  }, [matchId, serverUrl]);

  // Lifecycle: start/stop when enabled changes
  useEffect(() => {
    if (enabled && matchId) {
      startSession();
    }
    return () => {
      if (enabled && matchId) stopSession();
    };
  }, [enabled, matchId]);

  // Polling: every 2 s when active
  useEffect(() => {
    if (!active) return;
    pollRef.current = setInterval(pollCommands, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [active, pollCommands]);

  return { active, agentId, error };
}
