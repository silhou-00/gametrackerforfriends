from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from middleware.error_handler import global_exception_handler
from pdf.router import router as pdf_router
from voice.router import router as voice_router
from shared.schemas import HealthResponse

# Optional rate limiter (requires: pip install slowapi)
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address)
    _slowapi_available = True
except ImportError:
    limiter = None
    _slowapi_available = False

app = FastAPI(
    title="PointDrop PDF Service",
    version="1.0.0",
    description="Stateless PDF report generation for PointDrop match data.",
)

# Rate limiting state
if _slowapi_available and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow all local network origins so mobile devices can reach the server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global exception handler
app.add_exception_handler(Exception, global_exception_handler)

# Routers
app.include_router(pdf_router, prefix="/api")        # /api/pdf/report
app.include_router(voice_router, prefix="/api")      # /api/voice/*


@app.get("/health", response_model=HealthResponse)
async def health():
    return {"data": {"status": "ok", "service": "pointdrop-pdf"}, "error": None}


@app.get("/", response_model=HealthResponse)
async def root():
    return {"data": {"status": "ok", "service": "pointdrop-pdf"}, "error": None}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.app_env == "development",
    )
