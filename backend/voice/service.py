"""
PointDrop voice session service.

Flow:
  1. App calls POST /api/voice/start  → stores match context + sets Agora RTM presence
  2. R1 device speaks                 → Agora ConvoAI agent processes
  3. Agent calls get_current_match    → GET /api/voice/current-match returns context
  4. Agent scores via add_score etc.  → POST /api/voice/tool-call → command queue
  5. App polls GET /api/voice/commands/{matchId} every 2s → applies commands locally
  6. App calls DELETE /api/voice/stop/{matchId} on quit → clears context
"""

import base64
import logging
import time
from collections import defaultdict, deque

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)

AGORA_RTM_BASE = "https://api.agora.io/v2/project"

# Active match context (single-match — one game at a time)
_active_match: dict | None = None

# Per-match command queues: match_id → deque of command dicts
_command_queues: dict[str, deque] = defaultdict(deque)


def _basic_auth() -> str:
    raw = f"{settings.agora_customer_id}:{settings.agora_customer_secret}"
    return "Basic " + base64.b64encode(raw.encode()).decode()


def set_active_match(
    match_id: str,
    players: list[dict],
    mode_name: str,
    rules_summary: str | None = None,
) -> None:
    global _active_match
    _active_match = {
        "match_id": match_id,
        "players": players,
        "mode_name": mode_name,
        "rules_summary": rules_summary,
        "started_at": int(time.time()),
    }
    logger.info(f"Active match set: {match_id} — {len(players)} players, mode={mode_name}")


def get_active_match() -> dict | None:
    return _active_match


def clear_active_match(match_id: str) -> None:
    global _active_match
    if _active_match and _active_match.get("match_id") == match_id:
        _active_match = None
        logger.info(f"Active match cleared: {match_id}")
    _command_queues.pop(match_id, None)


async def set_rtm_presence(match_id: str, players: list[dict], mode_name: str) -> bool:
    """
    Push match context into Agora RTM channel user-presence so the ConvoAI
    agent can read it from context.presence before each LLM invocation.

    Requires AGORA_APP_ID, AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET in .env.
    Silently skips if credentials are missing (get_current_match tool covers this case).
    """
    if not all([settings.agora_app_id, settings.agora_customer_id, settings.agora_customer_secret]):
        logger.warning("RTM presence skipped — Agora credentials not set")
        return False

    channel = settings.agora_channel or "pointdrop"
    player_names = ", ".join(p["name"] for p in players)

    # Agora RTM v2 — set temporary user properties for a server-side user in the channel
    url = f"{AGORA_RTM_BASE}/{settings.agora_app_id}/rtm/users/pointdrop-server/channel-temporary-user-properties"
    payload = {
        "channelName": channel,
        "channelType": "MESSAGE",
        "properties": {
            "match_id": match_id,
            "players": player_names,
            "mode": mode_name,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": _basic_auth(),
                    "Content-Type": "application/json",
                    "x-agora-uid": "pointdrop-server",
                },
            )
            if resp.status_code in (200, 201):
                logger.info(f"RTM presence set for match {match_id}")
                return True
            else:
                logger.warning(f"RTM presence failed: {resp.status_code} {resp.text}")
                return False
    except Exception as e:
        logger.warning(f"RTM presence error: {e}")
        return False


def push_command(match_id: str, command: dict) -> None:
    command["ts"] = int(time.time() * 1000)
    _command_queues[match_id].append(command)


def drain_commands(match_id: str) -> list[dict]:
    q = _command_queues.get(match_id)
    if not q:
        return []
    cmds = list(q)
    q.clear()
    return cmds
