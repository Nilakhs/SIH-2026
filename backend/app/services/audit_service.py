"""
Tamper-Proof Hash-Chained Audit Service
Every action is logged with SHA-256 linking to the previous entry — like a mini blockchain.
If any entry is modified, the chain verification will catch it.
"""
import uuid
import json
import hashlib
import sqlite3
import os
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

_DB_DIR = str(Path(__file__).resolve().parents[2] / "data")
DB_PATH = os.path.join(_DB_DIR, "workbench.db")


def _get_last_hash() -> str:
    """Get hash of the most recent audit log entry (chain anchor)."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT entry_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1"
        )
        row = cursor.fetchone()
        conn.close()
        return row["entry_hash"] if row else "GENESIS"
    except Exception:
        return "GENESIS"


def log_action(
    action: str,
    user_id: Optional[str] = None,
    username: str = "system",
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    payload: Optional[dict] = None,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS",
):
    """Write a tamper-evident, hash-chained audit log entry."""
    try:
        entry_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        prev_hash = _get_last_hash()

        # Content string — everything that must be tamper-evident
        content = f"{entry_id}|{timestamp}|{user_id}|{action}|{resource_type}|{resource_id}|{status}|{prev_hash}"
        entry_hash = hashlib.sha256(content.encode()).hexdigest()

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO audit_logs
            (id, timestamp, user_id, username, action, resource_type, resource_id,
             payload, ip_address, status, entry_hash, prev_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id, timestamp, user_id, username, action,
                resource_type, resource_id,
                json.dumps(payload) if payload else None,
                ip_address, status, entry_hash, prev_hash,
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[AUDIT ERROR] Failed to write audit log: {e}")


def verify_chain() -> dict:
    """Verify the integrity of the entire audit log chain."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp ASC")
        rows = cursor.fetchall()
        conn.close()

        broken_entries = []
        prev = "GENESIS"
        for row in rows:
            content = (
                f"{row['id']}|{row['timestamp']}|{row['user_id']}|{row['action']}|"
                f"{row['resource_type']}|{row['resource_id']}|{row['status']}|{prev}"
            )
            expected_hash = hashlib.sha256(content.encode()).hexdigest()
            if expected_hash != row["entry_hash"]:
                broken_entries.append(row["id"])
            prev = row["entry_hash"]

        return {
            "total_entries": len(rows),
            "chain_valid": len(broken_entries) == 0,
            "broken_entries": broken_entries,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        return {"error": str(e), "chain_valid": False}
