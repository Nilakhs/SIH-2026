#!/usr/bin/env python3
"""
🛡️ Sovereign AI Workbench — Demo Seed Script
=============================================
Run this ONCE before your SIH demo to populate the system with:
  • Realistic departments (Operations, Maintenance, Quality, Safety)
  • Pre-created user accounts for each role
  • Sample predictive maintenance documents (PDF-style text)
  • A sample knowledge base query ready to demo

Usage:
    cd c:\SIH\backend
    venv\Scripts\python ..\demo_seed.py

After running, use these accounts:
    admin     / admin123     → Full access (ADMIN)
    analyst1  / demo@SIH26   → Analyst access
    viewer1   / demo@SIH26   → Read-only (VIEWER)
"""
import sqlite3
import uuid
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from passlib.context import CryptContext
from app.services.audit_service import log_action

DB_PATH = str(ROOT / "backend" / "data" / "workbench.db")
UPLOADS_DIR = ROOT / "backend" / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def seed_departments(conn):
    print("\n📁 Seeding departments...")
    departments = [
        ("Operations", "Plant operations and production monitoring"),
        ("Maintenance", "Equipment maintenance and predictive analytics"),
        ("Quality Control", "Process quality and compliance"),
        ("Safety", "HSE compliance and incident management"),
        ("IT", "Infrastructure and digital systems"),
    ]
    dept_ids = {}
    for name, desc in departments:
        existing = conn.execute("SELECT id FROM departments WHERE name = ?", (name,)).fetchone()
        if existing:
            dept_ids[name] = existing["id"]
            print(f"  ✓ Department exists: {name}")
        else:
            dept_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO departments (id, name, description) VALUES (?, ?, ?)",
                (dept_id, name, desc)
            )
            dept_ids[name] = dept_id
            print(f"  + Created: {name}")
    conn.commit()
    return dept_ids


def seed_users(conn, dept_ids):
    print("\n👥 Seeding demo users...")
    users = [
        ("analyst1", "analyst1@sovereign.ai", "demo@SIH26", "Raj Kumar", "ANALYST", "Maintenance"),
        ("analyst2", "analyst2@sovereign.ai", "demo@SIH26", "Priya Sharma", "ANALYST", "Operations"),
        ("viewer1", "viewer1@sovereign.ai", "demo@SIH26", "Ankit Verma", "VIEWER", "Quality Control"),
        ("safety_lead", "safety@sovereign.ai", "demo@SIH26", "Meera Nair", "ANALYST", "Safety"),
    ]
    for username, email, password, full_name, role, dept_name in users:
        existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if existing:
            print(f"  ✓ User exists: {username}")
            continue
        user_id = str(uuid.uuid4())
        hashed = pwd_context.hash(password)
        dept_id = dept_ids.get(dept_name)
        conn.execute(
            """INSERT INTO users (id, username, email, hashed_password, full_name, role, department_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, username, email, hashed, full_name, role, dept_id)
        )
        print(f"  + Created: {username} ({role}, {dept_name})")
    conn.commit()


def seed_documents(conn, dept_ids):
    print("\n📄 Seeding sample documents...")

    docs = [
        {
            "filename": "Pump_Vibration_Analysis_Q3_2026.txt",
            "content": """PUMP VIBRATION ANALYSIS REPORT — Q3 2026
==========================================
Equipment: Centrifugal Pump P-201 (Feed Water Pump)
Location: Unit 3, Bay 7
Period: July 1 – September 30, 2026

EXECUTIVE SUMMARY
-----------------
This report analyzes vibration data for pump P-201 collected over Q3 2026.
The analysis indicates EARLY-STAGE BEARING DEGRADATION requiring attention
within the next 45 days to prevent unplanned downtime.

VIBRATION READINGS (mm/s RMS)
------------------------------
Week 1:  2.3  (NORMAL — threshold: 4.5 mm/s)
Week 4:  2.8  (NORMAL)
Week 8:  3.9  (WARNING — 87% of threshold)
Week 12: 4.1  (WARNING — 91% of threshold)
Week 13: 4.4  (CRITICAL — 98% of threshold)

FREQUENCY SPECTRUM ANALYSIS
-----------------------------
- 1x RPM (24.5 Hz): 1.8 mm/s — Normal imbalance
- 2x RPM (49 Hz):   0.4 mm/s — Normal
- BPFO (Ball Pass Frequency Outer Race): 3.2 mm/s — ELEVATED
  → Indicates outer race bearing defect developing

ROOT CAUSE ANALYSIS
-------------------
Outer race bearing defect progressing from Stage 2 to Stage 3.
Contributing factors:
  • Inadequate lubrication (grease interval exceeded by 23 days)
  • Elevated inlet temperature (+4°C above design)
  • Slight shaft misalignment (0.12 mm — within tolerance but elevated)

RECOMMENDATIONS
---------------
1. Schedule bearing replacement within 30 days (Priority: HIGH)
2. Reduce lubrication interval from 90 days to 60 days
3. Check shaft alignment at next scheduled outage
4. Increase monitoring frequency to weekly

COST ANALYSIS
-------------
Planned maintenance cost:    ₹85,000
Estimated unplanned failure: ₹12,40,000 (downtime + emergency repair)
Cost avoidance potential:    ₹11,55,000

Prepared by: Maintenance Analytics AI System
Date: 2026-09-10
""",
            "dept": "Maintenance",
        },
        {
            "filename": "Motor_Temperature_Monitoring_Report.txt",
            "content": """MOTOR TEMPERATURE MONITORING REPORT
====================================
Equipment: Compressor Motor M-105
Location: Compressor House, Unit 1
Monitoring Period: August 2026

TEMPERATURE DATA (°C)
---------------------
Baseline Normal: 72°C (±5°C)
Alert Threshold: 85°C
Trip Setpoint:   95°C

Date       | Winding | Bearing | Ambient | Status
-----------|---------|---------|---------|--------
Aug 01     |   71    |   68    |   38    | NORMAL
Aug 07     |   73    |   69    |   39    | NORMAL
Aug 14     |   78    |   74    |   40    | CAUTION
Aug 21     |   83    |   79    |   41    | WARNING
Aug 28     |   87    |   82    |   42    | ALERT ⚠️

THERMAL IMAGING FINDINGS
------------------------
Hot spot detected at:
  - Drive End Bearing: 82°C (reference: 68°C baseline) → +14°C rise
  - Connection box terminal R: 79°C → Possible loose connection
  - Stator winding slot 7: 88°C → Insulation degradation suspected

POWER QUALITY ANALYSIS
-----------------------
Voltage imbalance: 2.8% (acceptable: <2%)
Current imbalance: 4.1% (acceptable: <10%)
Power factor: 0.84 (design: 0.88)
THD (Total Harmonic Distortion): 6.2%

FAILURE PROBABILITY
-------------------
Remaining Useful Life (RUL): 35 ± 8 days (at current rate of degradation)
Probability of failure within 30 days: 67%
Probability of failure within 60 days: 94%

IMMEDIATE ACTIONS REQUIRED
---------------------------
1. Inspect and torque-check connection box terminals (within 48 hours)
2. Clean cooling fins and check fan rotation
3. Reduce load to 85% until maintenance completed
4. Schedule winding insulation resistance test

Prepared by: Predictive Maintenance Module v2.1
""",
            "dept": "Maintenance",
        },
        {
            "filename": "Refinery_Safety_Incident_Log_2026.txt",
            "content": """REFINERY SAFETY INCIDENT LOG — 2026
=====================================
Prepared by: Safety & HSE Department
Classification: CONFIDENTIAL — Internal Use Only

INCIDENT SUMMARY TABLE
-----------------------
ID      | Date       | Type          | Severity | Status
--------|------------|---------------|----------|----------
INC-001 | 2026-01-12 | Near Miss      | LOW      | Closed
INC-002 | 2026-02-28 | Spill <5L     | MEDIUM   | Closed
INC-003 | 2026-03-15 | Fire Alarm     | HIGH     | Closed
INC-004 | 2026-05-04 | Equipment Fail | MEDIUM   | Closed
INC-005 | 2026-07-22 | Leak Detection | HIGH     | Under Investigation
INC-006 | 2026-09-01 | Near Miss      | LOW      | Open

DAYS WITHOUT LTI (Lost Time Incident): 284 days

INCIDENT TREND ANALYSIS
------------------------
Q1 2026: 2 incidents (0 LTI) — IMPROVED from Q1 2025 (5 incidents)
Q2 2026: 2 incidents (0 LTI) — STABLE
Q3 2026: 2 incidents (0 LTI) — ON TRACK

HIGH PRIORITY OPEN ACTIONS
---------------------------
1. INC-005 Investigation: Gas leak in Unit 4 pipeline
   - Root cause: Stress corrosion cracking at weld joint HJ-442
   - Repair status: 80% complete (completion: 2026-09-20)
   - Interim measure: Section isolated, flow rerouted via bypass

SAFETY PERFORMANCE INDICATORS
------------------------------
TRIR (Total Recordable Incident Rate): 0.42 (Industry avg: 1.8)
LTIFR (Lost Time Injury Frequency Rate): 0.00
Near Miss Reporting Rate: 94% (target: >90%)
Safety Training Completion: 98.2%

Certification Status: ISO 45001:2018 — CURRENT (expires 2027-06-30)
""",
            "dept": "Safety",
        },
    ]

    for doc in docs:
        filepath = UPLOADS_DIR / doc["filename"]
        filepath.write_text(doc["content"], encoding="utf-8")

        existing = conn.execute("SELECT id FROM documents WHERE filename = ?", (doc["filename"],)).fetchone()
        if existing:
            print(f"  ✓ Document exists: {doc['filename']}")
            continue

        doc_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO documents
               (id, filename, file_path, mime_type, file_size, status, page_count, upload_time, department_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                doc_id,
                doc["filename"],
                str(filepath),
                "text/plain",
                len(doc["content"]),
                "COMPLETED",
                1,
                datetime.now(timezone.utc).isoformat(),
                dept_ids.get(doc["dept"]),
            )
        )
        print(f"  + Seeded: {doc['filename']}")

    conn.commit()


def seed_conversations(conn):
    print("\n💬 Seeding sample conversation starters...")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = 'analyst1'")
    user = cursor.fetchone()
    if not user:
        print("  ✗ analyst1 not found, skipping conversations")
        return

    user_id = user["id"]
    convs = [
        {
            "title": "Pump P-201 Vibration Analysis",
            "model": "qwen2.5:7b-instruct-q4_K_M",
            "messages": [
                ("user", "Analyze the vibration data for pump P-201 and tell me if I should be worried"),
                ("assistant", "Based on the Q3 2026 vibration analysis report, **Pump P-201 is in WARNING status** and requires immediate attention.\n\nKey findings:\n- Vibration level reached **4.4 mm/s** (98% of 4.5 mm/s threshold)\n- Ball Pass Frequency Outer Race (BPFO) elevated to **3.2 mm/s** — this is a clear indicator of outer race bearing defect\n- The bearing has progressed from Stage 2 to Stage 3 degradation\n\n**Recommended actions:**\n1. 🔴 Schedule bearing replacement within **30 days** (HIGH priority)\n2. Reduce lubrication interval to 60 days\n3. Increase monitoring to weekly\n\nThe cost of planned maintenance is **₹85,000** vs estimated failure cost of **₹12.4 lakh**. Act now to save ₹11.55 lakh in unplanned downtime costs."),
            ],
        },
        {
            "title": "Motor M-105 Temperature Trend",
            "model": "qwen2.5:7b-instruct-q4_K_M",
            "messages": [
                ("user", "What is the remaining useful life of motor M-105?"),
                ("assistant", "Based on the thermal monitoring data for **Motor M-105**, the Remaining Useful Life (RUL) analysis is concerning:\n\n**RUL Estimate: 35 ± 8 days** (at current degradation rate)\n\n| Risk Horizon | Failure Probability |\n|---|---|\n| 30 days | **67%** |\n| 60 days | **94%** |\n\nThe temperature at the drive end bearing has risen **+14°C above baseline** in just 4 weeks, which is the most alarming trend.\n\n**Immediate actions (within 48 hours):**\n1. Inspect connection box terminal R (possible loose connection at 79°C)\n2. Clean cooling fins\n3. Reduce load to 85% capacity\n\nWould you like me to generate a formal maintenance work order report as a PDF?"),
            ],
        },
    ]

    for conv_data in convs:
        cursor.execute("SELECT id FROM conversations WHERE title = ? AND user_id = ?", (conv_data["title"], user_id))
        existing = cursor.fetchone()
        if existing:
            print(f"  ✓ Conversation exists: {conv_data['title']}")
            continue

        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (conv_id, user_id, conv_data["title"], conv_data["model"], now, now)
        )
        for role, content in conv_data["messages"]:
            msg_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (msg_id, conv_id, role, content, now)
            )
        print(f"  + Created conversation: {conv_data['title']}")

    conn.commit()


def main():
    print("=" * 60)
    print("  Sovereign AI Workbench - Demo Seeder")
    print("  SIH 2026 | Problem Statement SIH26117")
    print("=" * 60)

    # Ensure DB schema is initialized
    from app.database import init_db
    init_db()
    print("DB schema ready.")

    conn = get_conn()
    try:
        dept_ids = seed_departments(conn)
        seed_users(conn, dept_ids)
        seed_documents(conn, dept_ids)
        seed_conversations(conn)

        print("\n" + "=" * 60)
        print("  ✅ Demo seed complete!")
        print()
        print("  Demo Accounts:")
        print("  ┌─────────────┬──────────────┬──────────┐")
        print("  │ Username    │ Password     │ Role     │")
        print("  ├─────────────┼──────────────┼──────────┤")
        print("  │ admin       │ admin123     │ ADMIN    │")
        print("  │ analyst1    │ demo@SIH26   │ ANALYST  │")
        print("  │ analyst2    │ demo@SIH26   │ ANALYST  │")
        print("  │ viewer1     │ demo@SIH26   │ VIEWER   │")
        print("  │ safety_lead │ demo@SIH26   │ ANALYST  │")
        print("  └─────────────┴──────────────┴──────────┘")
        print()
        print("  Sample documents seeded:")
        print("  • Pump P-201 Vibration Analysis Report")
        print("  • Motor M-105 Temperature Monitoring")
        print("  • Refinery Safety Incident Log 2026")
        print()
        print("  🎯 Demo script tip:")
        print("  1. Login as analyst1")
        print('  2. Ask: "Should pump P-201 be replaced? Generate a PDF report."')
        print("  3. Watch the AI search docs, analyze data, write PDF")
        print("  4. Download the report from Generated Files page")
        print("=" * 60)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
