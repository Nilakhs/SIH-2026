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
