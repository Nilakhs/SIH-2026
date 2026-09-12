import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import health, system, models, chat, documents, knowledge, agents, sandbox, sovereignty
from .routers.auth import router as auth_router
from .routers.audit import router as audit_router
from .routers.conversations import router as conversations_router
from .routers.users import router as users_router
from .routers.reports import router as reports_router
from .routers.drive import router as drive_router
from .services.lan_discovery import start_discovery_beacon, stop_discovery_beacon, get_local_ip


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — begin LAN discovery broadcast
    local_ip = get_local_ip()
    start_discovery_beacon(
        app_name="Sovereign AI Workbench",
        backend_port=8000,
        frontend_port=5173,
    )
    print(f"""
{'='*60}
  🛡️  Sovereign AI Workbench  |  SIH 2026
  Backend  : http://localhost:8000
  LAN URL  : http://{local_ip}:8000
  API Docs : http://localhost:8000/docs
  Default  : admin / admin123
  LAN Discovery: Broadcasting on 239.255.42.99:5007
{'='*60}
""")
    yield
    # Shutdown
    stop_discovery_beacon()


app = FastAPI(
    title="Sovereign AI Workbench API",
    version=settings.APP_VERSION,
    description="On-premise Agentic AI — SIH 2026 | Zero cloud dependency",
    lifespan=lifespan,
)

# Allow all origins for LAN access — devices on same network can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core existing routers
app.include_router(health.router, prefix="/api")
app.include_router(system.router, prefix="/api/system")
app.include_router(models.router, prefix="/api/models")
app.include_router(chat.router, prefix="/api/chat")
app.include_router(documents.router, prefix="/api/documents")
app.include_router(knowledge.router, prefix="/api")
app.include_router(agents.router)
app.include_router(sandbox.router, prefix="/api")
app.include_router(sovereignty.router, prefix="/api")

# New feature routers
app.include_router(auth_router)
app.include_router(audit_router)
app.include_router(conversations_router)
app.include_router(users_router)
app.include_router(reports_router)
app.include_router(drive_router)


@app.get("/")
async def root():
    local_ip = get_local_ip()
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "local_url": "http://localhost:8000",
        "lan_url": f"http://{local_ip}:8000",
    }


@app.get("/api/lan/servers")
async def discover_lan_servers():
    """Scan local network for other Sovereign AI Workbench instances."""
    from .services.lan_discovery import scan_for_servers
    servers = scan_for_servers(timeout=2.0)
    return {"servers": servers, "local_ip": get_local_ip()}
