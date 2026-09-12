"""
🛡️ Sovereign AI Workbench — LAN Launcher
=========================================
Run this script to start the workbench accessible on your local network.
No internet needed. Works with mobile hotspot, office WiFi, or ad-hoc LAN.

Usage:
    python lan_launcher.py

Other devices can then open:
    http://<YOUR_IP>:5173   ← Frontend (React UI)
    http://<YOUR_IP>:8000   ← Backend API
"""
import os
import sys
import socket
import subprocess
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def print_banner(local_ip: str):
    print("\n" + "=" * 62)
    print("  🛡️  SOVEREIGN AI WORKBENCH  |  SIH 2026")
    print("=" * 62)
    print(f"  Backend API  : http://localhost:8000")
    print(f"  Frontend UI  : http://localhost:5173")
    print()
    print(f"  📡 LAN Access (share these with other devices):")
    print(f"  Backend API  : http://{local_ip}:8000")
    print(f"  Frontend UI  : http://{local_ip}:5173")
    print()
    print(f"  🔑 Default Login : admin / admin123")
    print(f"  📋 API Docs      : http://localhost:8000/docs")
    print("=" * 62)

    # Print QR code for the frontend URL in terminal
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(f"http://{local_ip}:5173")
        qr.make(fit=True)
        print(f"\n  📱 QR Code — scan to open on phone/tablet:")
        qr.print_ascii(invert=True)
    except ImportError:
        print(f"\n  📱 Open on other devices: http://{local_ip}:5173")
        print("     (Install qrcode for QR terminal display: pip install qrcode)")

    print("\n  Press Ctrl+C to stop all services.\n")


def update_vite_config(local_ip: str):
    """Patch vite.config.ts to expose frontend on all network interfaces."""
    vite_config = ROOT / "frontend" / "vite.config.ts"
    content = vite_config.read_text(encoding="utf-8")
    
    if "host: true" not in content and "host:" not in content:
        content = content.replace(
            "plugins: [react()]",
            "plugins: [react()],\n    server: { host: true, port: 5173 }"
        )
        vite_config.write_text(content, encoding="utf-8")
        print("  ✅ vite.config.ts patched for LAN access")


def run_backend():
    """Start FastAPI backend bound to all interfaces."""
    backend_dir = ROOT / "backend"
    venv_python = backend_dir / "venv" / "Scripts" / "python.exe"
    python = str(venv_python) if venv_python.exists() else sys.executable
    
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT)
    
    proc = subprocess.Popen(
        [python, "-m", "uvicorn", "app.main:app",
         "--host", "0.0.0.0",
         "--port", "8000",
         "--reload"],
        cwd=str(backend_dir),
        env=env,
    )
    return proc


def run_frontend():
    """Start Vite frontend dev server."""
    frontend_dir = ROOT / "frontend"
    proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host"],
        cwd=str(frontend_dir),
        shell=True,
    )
    return proc


def main():
    local_ip = get_local_ip()
    update_vite_config(local_ip)

    print("\n  Starting services...")
    backend_proc = run_backend()
    time.sleep(2)
    frontend_proc = run_frontend()

    print_banner(local_ip)

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\n\n  🛑 Stopping all services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("  Services stopped. Goodbye!\n")


if __name__ == "__main__":
    main()
