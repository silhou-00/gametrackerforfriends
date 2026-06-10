# PointDrop Voice Integration — Handoff Notes
# Status: Awaiting Agora employee response

---

## What We Learned (Research Phase)

### R1 Device Architecture
- R1 is a **fixed firmware device** (RaspberryPi-based) — not configurable by us
- Agent configuration is managed exclusively by Agora employees via their internal tool
- Channel name is NOT user-configurable in the companion app
- Current default agent: **Henny-R1** (Agent ID: `6D2B0U`, model: llama-3.3-70b-versatile, TTS: elevenlabs)

### Agora ConvoAI Platform — Two Separate Systems

**1. Tool Calling** (`enable_tools: true`)
- Standard LLM function calling — the LLM reads tool definitions and decides when to call them
- When LLM calls a tool, Agora POSTs to our webhook URL
- Configured once by Agora employee in their internal system
- Our webhook: `POST /api/voice/tool-call`

**2. Custom Information / RTM Presence** (`enable_rtm: true`)
- App pushes match data via Agora RTM Signaling when match starts
- Agora automatically injects it into LLM context as `context.presence` before each LLM call
- LLM reads it as additional context (not a tool call)
- Our backend calls Agora RTM REST API on `POST /api/voice/start`

### Reference: Agora IoT Sample Repo
- https://github.com/AgoraIO-Community/Conversational-AI-IOT-Sample/tree/bk7258/v2.0.1/server/aiot_server_demo_example
- Confirmed agent creation payload structure (Basic auth, properties.llm, advanced_features)
- Did NOT include tool calling — basic demo only
- Key finding: `enable_tools: false` by default, `enable_bhvs: true` for better voice detection

---

## What Was Built

### Backend (`backend/voice/`)

| File | What changed |
|------|-------------|
| `tools.py` | Added `get_current_match` tool + `match_id` param to all scoring tools + `get_agent_config_json()` |
| `service.py` | Replaced agent spawning with match context store (`set_active_match`, `get_active_match`, `clear_active_match`) + `set_rtm_presence()` for Agora RTM |
| `router.py` | New endpoints: `/start` (stores context), `/current-match` (for agent tool), `/agent-config` (JSON for Agora team), `/tool-call` (flexible webhook handler for multiple payload formats) |

### Frontend (`frontend/src/hooks/useVoiceSession.ts`)
- Simplified: no longer spawns Agora agents
- `startSession` → POST match context to `/api/voice/start`
- `active = true` after successful registration
- Polling unchanged (every 2s)
- No LLM API key needed anymore (Agora team manages the LLM)

### Deployment
- Backend deployed to: **https://gametrackerforfriends.onrender.com**
- `WEBHOOK_BASE_URL=https://gametrackerforfriends.onrender.com` set in Render env vars
- Health check: `GET /health` → `{"data":{"status":"ok"}}`

---

## What to Send the Agora Employee

### File 1 — Agent Config JSON
Hit in browser to download:
```
GET https://gametrackerforfriends.onrender.com/api/voice/agent-config
```
Save as `pointdrop-agent-config.json`. Contains:
- `name`: PointDrop Score Tracker
- `system_prompt`: reads context.presence first, then calls get_current_match
- `tools`: 5 tools (get_current_match, add_score, next_round, get_scores, end_match)
- `tool_call_url`: https://gametrackerforfriends.onrender.com/api/voice/tool-call
- `advanced_features`: enable_rtm + enable_bhvs
- `asr`: en-US

### File 2 — Custom Information Format (separate short doc)
```json
{
  "rtm_presence_user": "pointdrop-server",
  "fields": {
    "match_id": "unique match ID string",
    "players": "comma-separated player names e.g. Alice, Bob",
    "mode": "game mode name e.g. Standard"
  },
  "note": "Pushed via Agora RTM user-presence when a match starts. Agent should read from context.presence['pointdrop-server']."
}
```

### Message to Include When Sending Both Files
> Hi, attached are two files for the custom PointDrop agent configuration:
>
> 1. **pointdrop-agent-config.json** — full agent config (tools, system prompt, advanced features).
>    The `tool_call_url` field is the webhook your system should POST to when the LLM calls a tool.
>    Please enter this URL exactly as shown: `https://gametrackerforfriends.onrender.com/api/voice/tool-call`
>
> 2. **pointdrop-custom-info.json** — the RTM presence data format our app will push when a match starts.
>    The agent should read `context.presence['pointdrop-server']` for match_id, players, and mode
>    before each LLM invocation (requires `enable_rtm: true`).
>
> After the custom agent is created, we will bind the R1 device to it via the companion app
> (Agents tab → select agent → Device Binding → toggle R1 → Save).
> The webhook URL is permanently hosted and will not change.

---

## Known Gap — Pending Employee Clarification

### `get_scores` cannot return actual scores (yet)
**Problem:** SQLite DB lives on the phone — backend has no access to score data.
All other tools work fine (add_score, next_round, end_match push commands → app polls → app writes to SQLite).
`get_scores` currently returns a placeholder message.

**Planned fix (on hold):**
- App pushes score snapshot to `POST /api/voice/scores` after every `addPoint()` call
- Backend stores snapshot in memory
- `get_scores` webhook returns that snapshot → agent reads scores verbally

**Waiting on:** Employee confirmation that custom information (RTM) approach works as expected before implementing score sync.

---

## How the Full Flow Works (Once Agent is Created)

```
1. User opens PointDrop → Play → selects game/mode/players → Voice entry ON → Start match
2. App calls POST /api/voice/start → backend stores match context + calls Agora RTM presence API
3. Agora RTM injects {match_id, players, mode} into context.presence for the R1 session
4. User speaks on R1: "Alice plus 3"
5. R1 → Agora ConvoAI agent → LLM reads context.presence (or calls get_current_match)
6. LLM calls add_score(match_id, "Alice", 3) → Agora POSTs to webhook
7. Backend receives webhook → pushes command to queue
8. App polls GET /api/voice/commands/{matchId} every 2s → receives command
9. App calls addPoint(aliceId, 3) → SQLite updated → scoreboard re-renders
```

---

## Binding Custom Agent to R1 (After Agora Creates It)

1. Open companion app → **Agents** tab
2. New "PointDrop Score Tracker" agent appears
3. Tap it → **Agent Settings** → **Device Binding** → toggle **B940F1** (R1) ON
4. Tap **Save Binding Settings**
5. R1 now uses PointDrop agent

---

## Files Changed This Session

```
backend/voice/tools.py          — rewritten
backend/voice/service.py        — rewritten
backend/voice/router.py         — rewritten
backend/requirements.txt        — fixed encoding + removed weasyprint
backend/runtime.txt             — new (Python 3.11.9)
backend/render.yaml             — new (Render deploy config)
backend/railway.toml            — new (Railway config, unused)
backend/nixpacks.toml           — new (Nixpacks config, unused)
frontend/src/hooks/useVoiceSession.ts  — simplified (no agent spawning)
```

---

## Score Sync — Pending Implementation

When the Agora employee confirms the custom agent works, implement score sync so `get_scores` returns actual data:

**Backend:** Add `POST /api/voice/scores` endpoint
```python
# router.py
@router.post("/scores")
async def push_scores(req: ScoresRequest):
    # req: { match_id, scores: [{player_name, score}] }
    set_score_snapshot(req.match_id, req.scores)
    return {"ok": True}
```

**service.py:** Add `_score_snapshots: dict` store + `set_score_snapshot()` + update `get_scores` in `_handle_tool` to return snapshot.

**Frontend:** In `scoreboard.tsx`, after every `addPoint()` resolves, push:
```typescript
await fetch(`${serverUrl}/api/voice/scores`, {
  method: 'POST',
  body: JSON.stringify({ match_id: matchId, scores: players.map(p => ({ player_name: p.name, score: computedScore(p.id) })) })
})
```
