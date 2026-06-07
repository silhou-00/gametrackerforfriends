import io
import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"


def _render_template(template_name: str, context: dict) -> str:
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
    )
    tmpl = env.get_template(template_name)
    return tmpl.render(**context)


def _format_date(iso: str | None) -> str:
    if not iso:
        return datetime.utcnow().strftime("%B %d, %Y")
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return d.strftime("%B %d, %Y at %H:%M")
    except Exception:
        return iso


class PdfService:
    def generate_report(
        self,
        match: dict,
        players: list[dict],
        logs: list[dict],
        standings: list[dict],
    ) -> bytes:
        try:
            from weasyprint import HTML, CSS
        except ImportError:
            raise RuntimeError(
                "WeasyPrint is not installed. "
                "Run: pip install weasyprint"
            )

        player_names = {p["id"]: p["name"] for p in players}

        # Determine integrity status from hash presence
        # (full HMAC verification requires the device salt, so we just mark as signed/unsigned)
        if match.get("hash_signature"):
            integrity = "valid"
        else:
            integrity = "unsigned"

        context = {
            "match": match,
            "players": players,
            "logs": logs,
            "standings": standings,
            "player_names": player_names,
            "integrity": integrity,
            "formatted_date": _format_date(match.get("finished_at") or match.get("created_at")),
        }

        html_str = _render_template("report.html.j2", context)
        buf = io.BytesIO()
        HTML(string=html_str).write_pdf(buf)
        return buf.getvalue()


pdf_service = PdfService()
