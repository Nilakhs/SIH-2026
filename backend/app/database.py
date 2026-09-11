import sqlite3
import os
import uuid
from datetime import datetime

# DB file: c:\SIH\backend\data\workbench.db
DB_DIR = r"c:\SIH\backend\data"
DB_PATH = os.path.join(DB_DIR, "workbench.db")

def init_db():
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
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
            error_msg TEXT
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
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Initialize DB on load
init_db()
