from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io

from .service import pdf_service

router = APIRouter(prefix="/pdf", tags=["pdf"])


class StandingEntry(BaseModel):
    name: str
    score: int
    is_winner: bool = False


class LogEntry(BaseModel):
    id: str
    match_id: str
    player_id: str
    action_type: str
    delta_value: int
    round: int
    created_at: str


class PlayerEntry(BaseModel):
    id: str
    name: str


class MatchEntry(BaseModel):
    id: str
    mode_name: Optional[str] = None
    title: Optional[str] = None
    status: str
    current_round: int = 1
    hash_signature: Optional[str] = None
    finished_at: Optional[str] = None
    created_at: Optional[str] = None


class ReportRequest(BaseModel):
    match: MatchEntry
    players: list[PlayerEntry]
    logs: list[LogEntry]
    standings: list[StandingEntry]


@router.post("/report")
async def generate_report(request: ReportRequest):
    """Generate and stream a PDF match report."""
    try:
        pdf_bytes = pdf_service.generate_report(
            match=request.match.model_dump(),
            players=[p.model_dump() for p in request.players],
            logs=[l.model_dump() for l in request.logs],
            standings=[s.model_dump() for s in request.standings],
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    filename = f"pointdrop-match-{request.match.id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
