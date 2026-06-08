import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from config.settings import settings
from .service import (
    set_active_match, get_active_match, clear_active_match,
    set_rtm_presence, push_command, drain_commands,
)
from .tools import get_agent_config_json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class PlayerInfo(BaseModel):
    id: str
    name: str


class StartSessionRequest(BaseModel):
    match_id: str
    players: list[PlayerInfo]
    mode_name: str
    rules_summary: str | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_session(req: StartSessionRequest):
    """Register active match context. Called by app when match starts with voice ON."""
    players = [p.dict() for p in req.players]
    set_active_match(req.match_id, players, req.mode_name, req.rules_summary)

    # Best-effort: push context into Agora RTM presence so agent reads context.presence
    await set_rtm_presence(req.match_id, players, req.mode_name)

    return {"ok": True, "match_id": req.match_id}


@router.delete("/stop/{match_id}")
async def stop_session(match_id: str):
    """Clear active match context when match ends or user quits."""
    clear_active_match(match_id)
    return {"ok": True}


@router.get("/current-match")
async def current_match():
    """
    Called by the Agora ConvoAI agent via the get_current_match tool.
    Returns active match context so the agent knows player names and match ID.
    """
    match = get_active_match()
    if not match:
        raise HTTPException(status_code=404, detail="No active match")
    return match


@router.post("/tool-call")
async def tool_call_webhook(request: Request):
    """
    Agora ConvoAI POSTs here when the LLM invokes a PointDrop tool.
    Handles both Agora's native format and our custom flat format.
    Logs the raw body on first call so we can verify the actual payload shape.
    """
    try:
        body = await request.json()
    except Exception:
        raw = await request.body()
        logger.error(f"tool-call: non-JSON body: {raw}")
        return {"ok": False, "error": "invalid JSON"}

    logger.info(f"tool-call webhook received: {json.dumps(body)}")

    # ── Agora native format: {"tool_calls": [{...}]} ──────────────────────────
    if "tool_calls" in body:
        results = []
        for tc in body["tool_calls"]:
            fn = tc.get("function", {})
            tool_name = tc.get("name") or fn.get("name", "")
            tool_call_id = tc.get("id", "")
            args_raw = fn.get("arguments") or tc.get("arguments") or "{}"
            args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw

            result = _handle_tool(tool_name, args)
            results.append({"tool_call_id": tool_call_id, "result": result})

        return {"results": results}

    # ── Agora flat format: {"tool_name": "...", "arguments": {...}} ───────────
    if "tool_name" in body:
        tool_name = body["tool_name"]
        args = body.get("arguments", {})
        match_id = args.get("match_id") or body.get("match_id", "")
        result = _handle_tool(tool_name, args)
        return {"ok": True, "result": result}

    # ── Fallback: try top-level name + arguments ──────────────────────────────
    tool_name = body.get("name", "")
    args = body.get("arguments") or body.get("args") or {}
    if isinstance(args, str):
        args = json.loads(args)
    if tool_name:
        result = _handle_tool(tool_name, args)
        return {"ok": True, "result": result}

    logger.warning(f"tool-call: unrecognised payload shape: {body}")
    return {"ok": True}


def _handle_tool(tool_name: str, args: dict) -> dict:
    """Dispatch a single tool call. Returns the result dict for the LLM."""
    match_id = args.get("match_id") or (get_active_match() or {}).get("match_id", "")

    if tool_name == "get_current_match":
        match = get_active_match()
        if not match:
            return {"error": "No active match — start a match in PointDrop first"}
        return match

    if tool_name == "get_scores":
        match = get_active_match()
        return {"match_id": match_id, "note": "scores are tracked in the PointDrop app"}

    if tool_name == "add_score":
        if match_id:
            push_command(match_id, {
                "action": "add_score",
                "player_name": args.get("player_name", ""),
                "delta": int(args.get("delta", 0)),
            })
        return {"ok": True, "action": "add_score", "player": args.get("player_name"), "delta": args.get("delta")}

    if tool_name == "next_round":
        if match_id:
            push_command(match_id, {"action": "next_round"})
        return {"ok": True, "action": "next_round"}

    if tool_name == "end_match":
        if match_id:
            push_command(match_id, {
                "action": "end_match",
                "winner_name": args.get("winner_name"),
            })
        return {"ok": True, "action": "end_match"}

    logger.warning(f"Unknown tool: {tool_name}")
    return {"ok": True}


@router.get("/commands/{match_id}")
async def poll_commands(match_id: str):
    """App polls this every ~2s. Returns and clears pending voice commands."""
    return {"commands": drain_commands(match_id)}


@router.get("/status/{match_id}")
async def session_status(match_id: str):
    match = get_active_match()
    active = match is not None and match.get("match_id") == match_id
    return {"active": active}


@router.get("/agent-config")
async def agent_config():
    """
    Returns the JSON config to send to the Agora team for custom agent setup.
    Includes tools, system prompt, webhook URL, and advanced_features.
    """
    if not settings.webhook_base_url:
        raise HTTPException(
            status_code=503,
            detail="WEBHOOK_BASE_URL not set in environment — deploy first and set this var",
        )
    return get_agent_config_json(settings.webhook_base_url)
