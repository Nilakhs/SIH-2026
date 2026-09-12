import sqlite3
import os
import json
import ast
import operator
import sys

# We need to make sure backend app can be imported
sys.path.append(r"c:\SIH\backend")
from app.dependencies import get_rag_service

DB_PATH = r"c:\SIH\backend\data\workbench.db"

def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def DOCUMENT_SEARCH(query: str, top_k: int = 5) -> str:
    try:
        rag = get_rag_service()
        results = rag.search(query, top_k=top_k)
        return json.dumps(results)
    except Exception as e:
        return f"Error: {e}"

def DOCUMENT_RETRIEVAL(doc_id: str, chunk_index: int) -> str:
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT content FROM document_chunks WHERE document_id = ? AND chunk_index = ?", (doc_id, chunk_index))
        row = cursor.fetchone()
        conn.close()
        if row:
            return str(row["content"])
        return f"Error: Chunk {chunk_index} not found for document {doc_id}"
    except Exception as e:
        return f"Error: {e}"

def LOCAL_CALCULATOR(expression: str) -> str:
    try:
        allowed_operators = {
            ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
            ast.Truediv: operator.truediv, ast.Pow: operator.pow, ast.BitXor: operator.xor,
            ast.USub: operator.neg, ast.UAdd: operator.pos
        }

        def _eval(node):
            if isinstance(node, ast.Num): 
                return node.n
            elif isinstance(node, ast.Constant):
                if isinstance(node.value, (int, float)):
                    return node.value
                raise TypeError(f"Unsupported constant type: {type(node.value)}")
            elif isinstance(node, ast.BinOp):
                return allowed_operators[type(node.op)](_eval(node.left), _eval(node.right))
            elif isinstance(node, ast.UnaryOp):
                return allowed_operators[type(node.op)](_eval(node.operand))
            else:
                raise TypeError(f"Unsupported ast node: {type(node)}")

        tree = ast.parse(expression, mode='eval').body
        result = _eval(tree)
        return str(result)
    except Exception as e:
        return f"Error evaluating expression: {e}"

def DOCUMENT_METADATA(filename_or_id: str) -> str:
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ? OR filename = ?", (filename_or_id, filename_or_id))
        row = cursor.fetchone()
        conn.close()
        if row:
            return json.dumps(dict(row), default=str)
        return f"Error: Document {filename_or_id} not found"
    except Exception as e:
        return f"Error: {e}"

from app.sandbox.manager import validate_code, execute_in_sandbox

def PYTHON_SANDBOX(code: str, input_files: list = None) -> str:
    is_valid, msg = validate_code(code)
    if not is_valid:
        return f"Validation failed: {msg}"
    
    try:
        result = execute_in_sandbox(code, input_files)
        return json.dumps(result, default=str)
    except Exception as e:
        return f"Execution error: {e}"

import base64
import httpx

def LOCAL_VISION_ANALYZE(image_path_or_base64: str, prompt: str = "Describe this image and identify its main components.") -> str:
    try:
        img_b64 = image_path_or_base64
        if os.path.exists(image_path_or_base64):
            with open(image_path_or_base64, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode("utf-8")
        elif "," in img_b64:
            img_b64 = img_b64.split(",", 1)[1]

        with httpx.Client(timeout=120.0) as client:
            resp = client.post("http://localhost:11434/api/chat", json={
                "model": "moondream",
                "messages": [{
                    "role": "user",
                    "content": prompt,
                    "images": [img_b64]
                }],
                "stream": False
            })
            if resp.status_code == 200:
                data = resp.json()
                return data.get("message", {}).get("content", "No analysis returned")
            elif resp.status_code == 404:
                return "Error: Vision model 'moondream' not installed in Ollama. Please run 'ollama pull moondream'."
            else:
                return f"Vision API error: {resp.status_code} - {resp.text}"
    except Exception as e:
        return f"Error executing local vision analysis: {e}"

def GENERATE_DOCX_REPORT(title: str, summary: str = "", findings: str = "") -> str:
    try:
        from document_generation.generator import generate_docx_report
        bullets = [f.strip() for f in findings.split("\n") if f.strip()] if findings else ["All components audited in local air-gapped environment."]
        path = generate_docx_report(
            title=title,
            summary=summary or "Generated analytical report by Sovereign AI Workbench.",
            sections=[{"heading": "Key Findings & Action Items", "content": "Analytical findings from local processing:", "bullets": bullets}]
        )
        return f"Successfully generated DOCX report at: {path}"
    except Exception as e:
        return f"Error generating DOCX report: {e}"

def GENERATE_XLSX_DATA(title: str, sheet_name: str = "Data") -> str:
    try:
        from document_generation.generator import generate_xlsx_sheet
        headers = ["Equipment ID", "Department", "Failure Reason", "Downtime (Hours)"]
        rows = [["P-101", "Refining", "Seal Leak", 14.5], ["C-201", "Utilities", "Bearing Wear", 8.2]]
        csv_path = r"c:\SIH\equipment_downtime.csv"
        if os.path.exists(csv_path):
            import csv
            with open(csv_path, "r", encoding="utf-8") as f:
                r = csv.reader(f)
                headers = next(r, headers)
                rows = [row for row in r if row]
        path = generate_xlsx_sheet(title=title, headers=headers, rows=rows, sheet_name=sheet_name)
        return f"Successfully generated XLSX spreadsheet at: {path}"
    except Exception as e:
        return f"Error generating XLSX spreadsheet: {e}"

