from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .service import spawn_agent, stop_agent, push_command, drain_commands, _active_agents

router = APIRouter(prefix="/voice", tags=["voice"])


# ── Request / Response schemas ────────────────────────────────────────────────

class PlayerInfo(BaseModel):
    id: str
    name: str


class StartSessionRequest(BaseModel):
    match_id: str
    players: list[PlayerInfo]
    mode_name: str
    rules_summary: str | None = None
    llm_api_key: str
    llm_model: str = "gpt-4o-mini"
    llm_url: str = "https://api.openai.com/v1/chat/completions"
    asr_language: str = "en-US"


class StartSessionResponse(BaseModel):
    agent_id: str
    channel: str


class ToolCallPayload(BaseModel):
    """Agora sends this when the LLM decides to call a PointDrop tool."""
    match_id: str
    tool_name: str
    arguments: dict


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest):
    """Spawn an Agora ConvoAI agent for a match."""
    try:
        agent_id = await spawn_agent(
            match_id=req.match_id,
            players=[p.dict() for p in req.players],
            mode_name=req.mode_name,
            rules_summary=req.rules_summary,
            llm_api_key=req.llm_api_key,
            llm_model=req.llm_model,
            llm_url=req.llm_url,
            asr_language=req.asr_language,
        )
        return {"agent_id": agent_id, "channel": f"pd-{req.match_id}"}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agora error: {e}")


@router.delete("/stop/{match_id}")
async def stop_session(match_id: str):
    """Stop a ConvoAI agent for a match."""
    agent_id = _active_agents.get(match_id)
    if not agent_id:
        return {"ok": True, "note": "no active session"}
    await stop_agent(match_id, agent_id)
    return {"ok": True}


@router.post("/tool-call")
async def tool_call_webhook(payload: ToolCallPayload):
    """
    Agora calls this webhook when the LLM invokes a PointDrop tool.
    We push the resolved command to the per-match queue; the app polls /commands.
    """
    match_id = payload.match_id
    args = payload.arguments

    if payload.tool_name == "add_score":
        push_command(match_id, {
            "action": "add_score",
            "player_name": args.get("player_name", ""),
            "delta": int(args.get("delta", 0)),
        })

    elif payload.tool_name == "next_round":
        push_command(match_id, {"action": "next_round"})

    elif payload.tool_name == "end_match":
        push_command(match_id, {
            "action": "end_match",
            "winner_name": args.get("winner_name"),
        })

    elif payload.tool_name == "get_scores":
        # get_scores is read-only; no command needed — return empty so Agora can voice the result
        pass

    return {"ok": True}


@router.get("/commands/{match_id}")
async def poll_commands(match_id: str):
    """
    The app polls this every ~2s to pick up voice-sourced score commands.
    Commands are drained (one-time read) so each is applied exactly once.
    """
    return {"commands": drain_commands(match_id)}


@router.get("/status/{match_id}")
async def session_status(match_id: str):
    agent_id = _active_agents.get(match_id)
    return {"active": bool(agent_id), "agent_id": agent_id}
