"""
PointDrop tool definitions for the ConvoAI LLM.
The LLM calls these when it recognises a scoring intent from speech.
"""

POINTDROP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_score",
            "description": (
                "Add or subtract points for a player. "
                "Use positive delta to add, negative to subtract. "
                "Call this whenever the user says something like "
                "'Player 1 plus 3' or 'subtract 2 from Alice'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "player_name": {
                        "type": "string",
                        "description": "Exact or partial name of the player as spoken",
                    },
                    "delta": {
                        "type": "integer",
                        "description": "Points to add (positive) or subtract (negative)",
                    },
                },
                "required": ["player_name", "delta"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "next_round",
            "description": (
                "Advance to the next round. "
                "Call when the user says 'next round', 'new round', or similar."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_scores",
            "description": "Read back the current scores for all players.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "end_match",
            "description": (
                "End the match and declare a winner. "
                "Call when the user says 'end the game', 'finish', or when a target score is reached."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "winner_name": {
                        "type": "string",
                        "description": "Name of the winning player (optional)",
                    }
                },
                "required": [],
            },
        },
    },
]


def build_system_prompt(players: list[dict], mode_name: str, rules_summary: str | None) -> str:
    player_list = ", ".join(p["name"] for p in players)
    base = (
        f"You are PointDrop's AI scorekeeper for a game of '{mode_name}'. "
        f"The players are: {player_list}. "
        "Listen for score updates, round changes, or requests to read scores. "
        "Respond with very short confirmations — no more than one sentence. "
        "Use the provided tools to record every scoring action."
    )
    if rules_summary:
        base += f" Rules: {rules_summary}."
    return base
