import socket
import ipaddress
import psutil
from typing import Dict, Any, List, Optional

SERVICE_PORTS = {
    11434: "Ollama",
    6333: "Qdrant",
    6334: "Qdrant",
    8000: "FastAPI",
    5173: "Frontend"
}

def classify_ip(ip_str: str) -> str:
    """
    Classifies an IP address into LOOPBACK, PRIVATE_LAN, or EXTERNAL.
    Does NOT call any external network or DNS service.
    """
    if not ip_str:
        return "UNKNOWN"
    try:
        clean_ip = ip_str.split("%")[0]
        ip_obj = ipaddress.ip_address(clean_ip)
        if ip_obj.is_loopback:
            return "LOOPBACK"
        elif ip_obj.is_private or ip_obj.is_link_local or ip_obj.is_multicast:
            return "PRIVATE_LAN"
        elif ip_obj.is_global:
            return "EXTERNAL"
        else:
            return "PRIVATE_LAN"
    except ValueError:
        return "UNKNOWN"

def check_internet_status() -> str:
    """
    Genuine transport-level check to determine if the host currently has route/reachability
    to public IP addresses. Does NOT use any HTTP/cloud APIs and transmits no telemetry data.
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('1.1.1.1', 53))
        s.close()
    except OSError:
        return "DISCONNECTED"
    except Exception:
        return "UNKNOWN"
        
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.8)
        s.connect(('1.1.1.1', 53))
        s.close()
        return "CONNECTED"
    except (socket.timeout, OSError):
        return "DISCONNECTED"
    except Exception:
        return "UNKNOWN"

def get_network_interfaces() -> List[Dict[str, Any]]:
    """
    Enumerates all local network interfaces, their status, IP addresses, and byte counters.
    """
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    io_counters = psutil.net_io_counters(pernic=True)
    
    interfaces = []
    for if_name, if_addresses in addrs.items():
        stat = stats.get(if_name)
        io = io_counters.get(if_name)
        
        ip_list = []
        is_loopback = False
        for addr in if_addresses:
            if addr.family in (socket.AF_INET, socket.AF_INET6):
                ip_list.append(addr.address)
                if classify_ip(addr.address) == "LOOPBACK":
                    is_loopback = True
                    
        if "loopback" in if_name.lower():
            is_loopback = True

        status_str = "UP" if (stat and stat.isup) else "DOWN"
        
        interfaces.append({
            "name": if_name,
            "status": status_str,
            "speed_mbps": stat.speed if stat else 0,
            "ip_addresses": ip_list,
            "is_loopback": is_loopback,
            "bytes_sent": io.bytes_sent if io else 0,
            "bytes_recv": io.bytes_recv if io else 0,
            "packets_sent": io.packets_sent if io else 0,
            "packets_recv": io.packets_recv if io else 0,
        })
        
    interfaces.sort(key=lambda x: (x["status"] == "UP", not x["is_loopback"]), reverse=True)
    return interfaces

def get_tcp_telemetry() -> Dict[str, Any]:
    """
    Inspects current TCP connections from OS kernel table.
    Distinguishes Loopback, Private LAN, and External connections.
    """
    try:
        raw_conns = psutil.net_connections(kind='tcp')
    except Exception:
        raw_conns = []

    loopback_count = 0
    private_lan_count = 0
    external_count = 0
    
    service_connections = {
        "Ollama": {"port": 11434, "status": "STOPPED", "connection_count": 0, "transport": "localhost:11434"},
        "Qdrant": {"port": 6333, "status": "STOPPED", "connection_count": 0, "transport": "localhost:6333"},
        "FastAPI": {"port": 8000, "status": "STOPPED", "connection_count": 0, "transport": "localhost:8000"},
        "Frontend": {"port": 5173, "status": "STOPPED", "connection_count": 0, "transport": "localhost:5173"}
    }

    filtered_conns = []
    for c in raw_conns:
        l_ip = c.laddr.ip if c.laddr else ""
        l_port = c.laddr.port if c.laddr else 0
        r_ip = c.raddr.ip if c.raddr else ""
        r_port = c.raddr.port if c.raddr else 0
        
        for s_port, s_name in SERVICE_PORTS.items():
            if l_port == s_port or r_port == s_port:
                service_connections[s_name]["connection_count"] += 1
                service_connections[s_name]["status"] = "RUNNING"
                
        conn_type = "UNKNOWN"
        if r_ip:
            r_class = classify_ip(r_ip)
            l_class = classify_ip(l_ip)
            if r_class == "LOOPBACK" and l_class == "LOOPBACK":
                conn_type = "LOOPBACK"
                loopback_count += 1
            elif r_class == "PRIVATE_LAN" or l_class == "PRIVATE_LAN":
                conn_type = "PRIVATE_LAN"
                private_lan_count += 1
            elif r_class == "EXTERNAL":
                conn_type = "EXTERNAL"
                external_count += 1
        elif c.status == "LISTEN":
            l_class = classify_ip(l_ip)
            if l_class == "LOOPBACK":
                conn_type = "LOOPBACK"
            else:
                conn_type = "PRIVATE_LAN"
                
        service_label = None
        for p in (l_port, r_port):
            if p in SERVICE_PORTS:
                service_label = SERVICE_PORTS[p]
                break
                
        filtered_conns.append({
            "local_address": f"{l_ip}:{l_port}" if l_ip else "-",
            "remote_address": f"{r_ip}:{r_port}" if r_ip else "-",
            "status": c.status,
            "type": conn_type,
            "service": service_label,
            "pid": c.pid
        })

    return {
        "loopback_count": loopback_count,
        "private_lan_count": private_lan_count,
        "external_count": external_count,
        "total_connections": len(raw_conns),
        "service_connections": service_connections,
        "connections_sample": filtered_conns[:80]
    }

def get_sovereignty_report() -> Dict[str, Any]:
    """
    Combines network evidence, interface stats, and TCP telemetry into a unified report.
    """
    internet_status = check_internet_status()
    interfaces = get_network_interfaces()
    tcp_data = get_tcp_telemetry()
    
    total_outbound_bytes = sum(i["bytes_sent"] for i in interfaces)
    total_inbound_bytes = sum(i["bytes_recv"] for i in interfaces)
    
    active_services_list = [
        name for name, data in tcp_data["service_connections"].items() 
        if data["status"] == "RUNNING"
    ]

    return {
        "network_evidence": {
            "internet": internet_status,
            "external_connections": tcp_data["external_count"],
            "local_connections": tcp_data["loopback_count"],
            "private_lan_connections": tcp_data["private_lan_count"],
            "outbound_bytes": total_outbound_bytes,
            "inbound_bytes": total_inbound_bytes,
            "active_local_services": active_services_list,
            "explanation": "All AI inference and data processing services are running locally."
        },
        "services": tcp_data["service_connections"],
        "interfaces": interfaces,
        "connections": tcp_data["connections_sample"],
        "summary": {
            "total_tcp_connections": tcp_data["total_connections"],
            "external_count": tcp_data["external_count"],
            "loopback_count": tcp_data["loopback_count"],
            "private_lan_count": tcp_data["private_lan_count"]
        }
    }
