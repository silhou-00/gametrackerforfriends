"""
PointDrop tool definitions for the Agora ConvoAI agent.
Hit GET /api/voice/agent-config to get the ready-made JSON for the Agora team.
"""

import json

POINTDROP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_current_match",
            "description": (
                "Call this FIRST at the start of every conversation to get the active match. "
                "Returns match_id, player names, and game mode. "
                "Use the returned match_id in all subsequent tool calls. "
                "Also check context.presence for pre-loaded match data before calling this."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_score",
            "description": (
                "Add or subtract points for a player. "
                "Positive delta adds points, negative subtracts. "
                "Examples: 'Player 1 plus 3', 'subtract 2 from Alice', 'Bob gets 5 points'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "match_id": {
                        "type": "string",
                        "description": "Match ID from get_current_match or context.presence",
                    },
                    "player_name": {
                        "type": "string",
                        "description": "Player name as spoken — partial match is fine",
                    },
                    "delta": {
                        "type": "integer",
                        "description": "Points to add (positive) or subtract (negative)",
                    },
                },
                "required": ["match_id", "player_name", "delta"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "next_round",
            "description": "Advance to the next round. Call when user says 'next round', 'new round', or similar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "match_id": {
                        "type": "string",
                        "description": "Match ID from get_current_match or context.presence",
                    },
                },
                "required": ["match_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_scores",
            "description": "Read back the current scores. Call when user asks 'what are the scores?' or similar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "match_id": {
                        "type": "string",
                        "description": "Match ID from get_current_match or context.presence",
                    },
                },
                "required": ["match_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "end_match",
            "description": "End the match. Call when user says 'end game', 'game over', or declares a winner.",
            "parameters": {
                "type": "object",
                "properties": {
                    "match_id": {
                        "type": "string",
                        "description": "Match ID from get_current_match or context.presence",
                    },
                    "winner_name": {
                        "type": "string",
                        "description": "Winning player name (optional)",
                    },
                },
                "required": ["match_id"],
            },
        },
    },
]

SYSTEM_PROMPT = (
    "You are PointDrop's AI scorekeeper. "
    "At the start of every conversation: "
    "1. Check context.presence for match data (match_id, players, mode). "
    "2. If not present, call get_current_match to retrieve it. "
    "Always use the match_id from step 1 or 2 in every subsequent tool call. "
    "Confirm every scoring action in one short sentence. "
    "Never invent player names — only use names from the match data."
)


def get_agent_config_json(webhook_base_url: str) -> dict:
    return {
        "name": "PointDrop Score Tracker",
        "system_prompt": SYSTEM_PROMPT,
        "tools": POINTDROP_TOOLS,
        "tool_call_url": f"{webhook_base_url.rstrip('/')}/api/voice/tool-call",
        "advanced_features": {
            "enable_rtm": True,
            "enable_bhvs": True,
        },
        "asr": {"language": "en-US"},
        "greeting": "PointDrop scorekeeper ready. Starting a match?",
    }
