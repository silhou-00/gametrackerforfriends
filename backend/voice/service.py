"""
Agora ConvoAI agent lifecycle + in-memory command queue.

Flow:
  1. POST /api/voice/start  → spawn_agent() → Agora ConvoAI API
  2. Agora LLM calls tool   → tool_call_webhook() → push to command queue
  3. App polls              → GET /api/voice/commands/{matchId} → drain queue
  4. DELETE /api/voice/stop → stop_agent() → Agora ConvoAI API
"""

import base64
import time
from collections import defaultdict, deque
from typing import Any

import httpx

from config.settings import settings

AGORA_CONVO_AI_BASE = "https://api.agora.io/api/conversational-ai/v1"

# In-memory per-match command queues:  match_id → deque of command dicts
_command_queues: dict[str, deque] = defaultdict(deque)

# Active agents: match_id → agent_id
_active_agents: dict[str, str] = {}


def _basic_auth() -> str:
    raw = f"{settings.agora_customer_id}:{settings.agora_customer_secret}"
    return "Basic " + base64.b64encode(raw.encode()).decode()


async def spawn_agent(
    match_id: str,
    players: list[dict],
    mode_name: str,
    rules_summary: str | None,
    llm_api_key: str,
    llm_model: str = "gpt-4o-mini",
    llm_url: str = "https://api.openai.com/v1/chat/completions",
    tts_vendor: str = "microsoft",
    tts_params: dict | None = None,
    asr_language: str = "en-US",
) -> str:
    """Spawn a ConvoAI agent. Returns the agent_id."""
    from .tools import POINTDROP_TOOLS, build_system_prompt

    if not settings.agora_app_id:
        raise RuntimeError("AGORA_APP_ID not configured in .env")
    if not settings.agora_customer_id or not settings.agora_customer_secret:
        raise RuntimeError("AGORA_CUSTOMER_ID / AGORA_CUSTOMER_SECRET not configured in .env")

    channel = settings.agora_channel or f"pd-{match_id}"
    system_prompt = build_system_prompt(players, mode_name, rules_summary)

    if not settings.webhook_base_url:
        raise RuntimeError(
            "WEBHOOK_BASE_URL not set in .env — Agora needs a public URL to POST tool calls. "
            "Run: ngrok http 8000, then set WEBHOOK_BASE_URL=https://<id>.ngrok-free.app"
        )
    tool_call_url = f"{settings.webhook_base_url.rstrip('/')}/api/voice/tool-call"

    body: dict[str, Any] = {
        "name": f"pointdrop-{match_id}",
        "properties": {
            "channel": channel,
            "token": settings.agora_app_id,   # use App ID as token (no-auth mode)
            "agent_rtc_uid": "99999",
            "remote_rtc_uids": ["*"],          # accept any UID — covers R1 device
            "llm": {
                "url": llm_url,
                "api_key": llm_api_key,
                "model": llm_model,
                "system_messages": [{"role": "system", "content": system_prompt}],
                "greeting_message": f"Ready! I'm tracking scores for {mode_name}.",
                "max_tokens": 256,
                "tools": POINTDROP_TOOLS,
                "tool_call_url": tool_call_url,
            },
            "tts": {
                "vendor": tts_vendor,
                "params": tts_params or {
                    "voice_name": "en-US-BrianMultilingualNeural",
                },
            },
            "asr": {"language": asr_language},
        },
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{AGORA_CONVO_AI_BASE}/projects/{settings.agora_app_id}/agents",
            json=body,
            headers={
                "Authorization": _basic_auth(),
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    agent_id: str = data.get("agent_id") or data.get("id") or data["data"]["agent_id"]
    _active_agents[match_id] = agent_id
    return agent_id


async def stop_agent(match_id: str, agent_id: str) -> None:
    """Stop a ConvoAI agent."""
    if not settings.agora_app_id:
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.delete(
            f"{AGORA_CONVO_AI_BASE}/projects/{settings.agora_app_id}/agents/{agent_id}",
            headers={"Authorization": _basic_auth()},
        )

    _active_agents.pop(match_id, None)
    _command_queues.pop(match_id, None)


def push_command(match_id: str, command: dict) -> None:
    """Push a voice-sourced command into the match queue. Called from the tool-call webhook."""
    command["ts"] = int(time.time() * 1000)
    _command_queues[match_id].append(command)


def drain_commands(match_id: str) -> list[dict]:
    """Return all pending commands for a match and clear the queue."""
    q = _command_queues.get(match_id)
    if not q:
        return []
    cmds = list(q)
    q.clear()
    return cmds
