import sqlite3
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_DIR = str(Path(__file__).resolve().parents[1] / "data")
DB_PATH = os.path.join(DB_DIR, "workbench.db")


def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Departments
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Users with RBAC roles: ADMIN, ANALYST, VIEWER
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT,
            role TEXT NOT NULL DEFAULT 'ANALYST',
            department_id TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            FOREIGN KEY(department_id) REFERENCES departments(id)
        )
    """)

    # Documents (extended with uploader + department)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT,
            file_path TEXT,
            mime_type TEXT,
            file_size INTEGER,
            status TEXT,
            page_count INTEGER,
            upload_time TIMESTAMP,
            error_msg TEXT,
            uploaded_by TEXT,
            department_id TEXT,
            FOREIGN KEY(uploaded_by) REFERENCES users(id),
            FOREIGN KEY(department_id) REFERENCES departments(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT,
            chunk_index INTEGER,
            metadata TEXT,
            content TEXT,
            FOREIGN KEY(document_id) REFERENCES documents(id)
        )
    """)

    # Conversation memory
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT,
            model TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            sources TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id)
        )
    """)

    # Tamper-proof hash-chained audit log
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT,
            username TEXT,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id TEXT,
            payload TEXT,
            ip_address TEXT,
            status TEXT DEFAULT 'SUCCESS',
            entry_hash TEXT,
            prev_hash TEXT
        )
    """)

    conn.commit()

    # Seed default department
    cursor.execute("SELECT COUNT(*) FROM departments")
    if cursor.fetchone()[0] == 0:
        dept_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO departments (id, name, description) VALUES (?, ?, ?)",
            (dept_id, "General", "Default department for all users"),
        )
        conn.commit()
    else:
        cursor.execute("SELECT id FROM departments LIMIT 1")
        dept_id = cursor.fetchone()[0]

    # Seed default admin user
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        admin_id = str(uuid.uuid4())
        hashed = pwd_context.hash("admin123")
        cursor.execute(
            """INSERT INTO users
               (id, username, email, hashed_password, full_name, role, department_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (admin_id, "admin", "admin@sovereign.ai", hashed,
             "System Administrator", "ADMIN", dept_id),
        )
        conn.commit()

    conn.close()


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # WAL mode for concurrent reads without locking
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


# Initialize DB on module load
init_db()
