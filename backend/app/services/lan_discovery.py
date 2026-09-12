"""
LAN Discovery Service — UDP multicast broadcast
Allows any device on the same local network to auto-find this server.
No internet required. Works on 192.168.x.x / 10.x.x.x private networks.
Perfect for demo: connect judge's laptop to phone hotspot and auto-discover!
"""
import socket
import json
import threading
import time
from datetime import datetime, timezone

MULTICAST_GROUP = "239.255.42.99"
MULTICAST_PORT = 5007
BEACON_INTERVAL = 3  # seconds between broadcasts

_stop_event = threading.Event()


def get_local_ip() -> str:
    """Get this machine's LAN IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def _broadcast_loop(app_name: str, backend_port: int, frontend_port: int):
    """Continuously broadcast server presence as UDP multicast beacons."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
    local_ip = get_local_ip()
    hostname = socket.gethostname()

    while not _stop_event.is_set():
        beacon = json.dumps({
            "app": app_name,
            "host": local_ip,
            "hostname": hostname,
            "backend_port": backend_port,
            "frontend_port": frontend_port,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).encode("utf-8")
        try:
            sock.sendto(beacon, (MULTICAST_GROUP, MULTICAST_PORT))
        except Exception as e:
            print(f"[LAN Discovery] Beacon error: {e}")
        time.sleep(BEACON_INTERVAL)
    sock.close()


def start_discovery_beacon(
    app_name: str = "Sovereign AI Workbench",
    backend_port: int = 8000,
    frontend_port: int = 5173,
):
    """Start LAN discovery beacon in a background daemon thread."""
    _stop_event.clear()
    t = threading.Thread(
        target=_broadcast_loop,
        args=(app_name, backend_port, frontend_port),
        daemon=True,
    )
    t.start()
    print(f"[LAN Discovery] Broadcasting on {MULTICAST_GROUP}:{MULTICAST_PORT} every {BEACON_INTERVAL}s")
    return t


def stop_discovery_beacon():
    _stop_event.set()


def scan_for_servers(timeout: float = 3.0) -> list:
    """
    Listen for beacons from other Sovereign AI Workbench instances on the LAN.
    Call this from a client device to find the server automatically.
    """
    servers = {}
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("", MULTICAST_PORT))
        mreq = socket.inet_aton(MULTICAST_GROUP) + socket.inet_aton("0.0.0.0")
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        sock.settimeout(timeout)

        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                data, addr = sock.recvfrom(1024)
                beacon = json.loads(data.decode("utf-8"))
                key = beacon["host"]
                beacon["discovered_from"] = addr[0]
                servers[key] = beacon
            except socket.timeout:
                break
            except Exception:
                continue
        sock.close()
    except Exception as e:
        print(f"[LAN Discovery] Scan error: {e}")

    return list(servers.values())
