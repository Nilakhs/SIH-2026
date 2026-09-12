import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import health, system, models, chat, documents, knowledge, agents, sandbox, sovereignty

app = FastAPI(title="Sovereign AI Workbench API", version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(system.router, prefix="/api/system")
app.include_router(models.router, prefix="/api/models")
app.include_router(chat.router, prefix="/api/chat")
app.include_router(documents.router, prefix="/api/documents")
app.include_router(knowledge.router, prefix="/api")
app.include_router(agents.router)
app.include_router(sandbox.router, prefix="/api")
app.include_router(sovereignty.router, prefix="/api")

@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "status": "running"}
