import sqlite3
import os
import json
import ast
import operator
import sys
import uuid
import re
from pathlib import Path
from datetime import datetime

# Dynamic path resolution — works on any machine
_ROOT = Path(__file__).resolve().parents[1]
_BACKEND = _ROOT / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.dependencies import get_rag_service

DB_PATH = str(_ROOT / "backend" / "data" / "workbench.db")
REPORTS_DIR = _ROOT / "backend" / "data" / "generated_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def DOCUMENT_SEARCH(query: str, top_k: int = 5) -> str:
    """Search the knowledge base for relevant document chunks."""
    try:
        rag = get_rag_service()
        results = rag.search(query, top_k=top_k)
        return json.dumps(results)
    except Exception as e:
        return f"Error: {e}"


def DOCUMENT_RETRIEVAL(doc_id: str, chunk_index: int) -> str:
    """Retrieve a specific chunk from a document."""
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT content FROM document_chunks WHERE document_id = ? AND chunk_index = ?",
            (doc_id, chunk_index),
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            return str(row["content"])
        return f"Error: Chunk {chunk_index} not found for document {doc_id}"
    except Exception as e:
        return f"Error: {e}"


def LOCAL_CALCULATOR(expression: str) -> str:
    """Safely evaluate a mathematical expression."""
    try:
        allowed_operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Truediv: operator.truediv,
            ast.Pow: operator.pow,
            ast.BitXor: operator.xor,
            ast.USub: operator.neg,
            ast.UAdd: operator.pos,
        }

        def _eval(node):
            if isinstance(node, ast.Num):
                return node.n
            elif isinstance(node, ast.Constant):
                if isinstance(node.value, (int, float)):
                    return node.value
                raise TypeError(f"Unsupported constant type: {type(node.value)}")
            elif isinstance(node, ast.BinOp):
                return allowed_operators[type(node.op)](
                    _eval(node.left), _eval(node.right)
                )
            elif isinstance(node, ast.UnaryOp):
                return allowed_operators[type(node.op)](_eval(node.operand))
            else:
                raise TypeError(f"Unsupported ast node: {type(node)}")

        tree = ast.parse(expression, mode="eval").body
        result = _eval(tree)
        return str(result)
    except Exception as e:
        return f"Error evaluating expression: {e}"


def DOCUMENT_METADATA(filename_or_id: str) -> str:
    """Get metadata for a document by filename or ID."""
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM documents WHERE id = ? OR filename = ?",
            (filename_or_id, filename_or_id),
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            return json.dumps(dict(row), default=str)
        return f"Error: Document {filename_or_id} not found"
    except Exception as e:
        return f"Error: {e}"


def GENERATE_REPORT(
    title: str,
    content: str,
    format: str = "pdf",
    author: str = "Sovereign AI",
) -> str:
    """
    Generate a professional PDF or DOCX report from the AI's analysis.
    Returns JSON with the file path and download URL.

    Args:
        title: Report title
        content: Markdown-like report content (supports # headings, ** bold, bullet lists)
        format: 'pdf' or 'docx'
        author: Author name for the report metadata
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_title = re.sub(r"[^\w\s-]", "", title).strip().replace(" ", "_")[:50]
        file_id = str(uuid.uuid4())[:8]
        fmt = format.lower().strip()

        if fmt == "pdf":
            filename = f"{safe_title}_{timestamp}_{file_id}.pdf"
            filepath = REPORTS_DIR / filename
            _generate_pdf(title, content, author, str(filepath))
        elif fmt in ("docx", "word"):
            filename = f"{safe_title}_{timestamp}_{file_id}.docx"
            filepath = REPORTS_DIR / filename
            _generate_docx(title, content, author, str(filepath))
        else:
            return json.dumps({"error": f"Unsupported format: {format}. Use 'pdf' or 'docx'."})

        file_size = os.path.getsize(str(filepath))
        result = {
            "success": True,
            "filename": filename,
            "format": fmt,
            "file_size_kb": round(file_size / 1024, 1),
            "download_url": f"/api/reports/download/{filename}",
            "generated_at": datetime.now().isoformat(),
            "message": f"Report '{title}' generated successfully as {filename}",
        }
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": f"Report generation failed: {e}"})


def _parse_content_blocks(content: str) -> list:
    """Parse markdown-like content into structured blocks."""
    blocks = []
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("# "):
            blocks.append(("h1", stripped[2:]))
        elif stripped.startswith("## "):
            blocks.append(("h2", stripped[3:]))
        elif stripped.startswith("### "):
            blocks.append(("h3", stripped[4:]))
        elif stripped.startswith(("- ", "* ", "• ")):
            blocks.append(("bullet", stripped[2:]))
        elif stripped.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.")):
            blocks.append(("numbered", re.sub(r"^\d+\.\s*", "", stripped)))
        elif stripped == "" or stripped == "---":
            blocks.append(("space", ""))
        else:
            blocks.append(("para", stripped))
    return blocks


def _generate_pdf(title: str, content: str, author: str, filepath: str):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, HRFlowable, ListFlowable, ListItem
    )

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=title,
        author=author,
    )

    styles = getSampleStyleSheet()
    AMBER = colors.HexColor("#F59E0B")
    DARK = colors.HexColor("#1E293B")

    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Title"],
        fontSize=22, textColor=DARK, spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "SubtitleStyle", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#64748B"),
        spaceAfter=16,
    )
    h1_style = ParagraphStyle(
        "H1Style", parent=styles["Heading1"],
        fontSize=16, textColor=DARK, spaceBefore=14, spaceAfter=6,
        fontName="Helvetica-Bold", borderPad=(0, 0, 2, 0),
    )
    h2_style = ParagraphStyle(
        "H2Style", parent=styles["Heading2"],
        fontSize=13, textColor=colors.HexColor("#334155"),
        spaceBefore=10, spaceAfter=4, fontName="Helvetica-Bold",
    )
    h3_style = ParagraphStyle(
        "H3Style", parent=styles["Heading3"],
        fontSize=11, textColor=colors.HexColor("#475569"),
        spaceBefore=8, spaceAfter=3, fontName="Helvetica-BoldOblique",
    )
    body_style = ParagraphStyle(
        "BodyStyle", parent=styles["Normal"],
        fontSize=10, leading=15, textColor=DARK, spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "BulletStyle", parent=styles["Normal"],
        fontSize=10, leading=15, leftIndent=16,
        bulletIndent=4, textColor=DARK,
    )

    story = []
    # Title block
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(title, title_style))
    story.append(Paragraph(
        f"Generated by {author} • {datetime.now().strftime('%B %d, %Y at %H:%M')} • Sovereign AI Workbench",
        subtitle_style,
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=AMBER, spaceAfter=12))

    blocks = _parse_content_blocks(content)
    bullet_buffer = []

    def flush_bullets():
        if bullet_buffer:
            story.append(
                ListFlowable(
                    [ListItem(Paragraph(b, bullet_style), bulletColor=AMBER, leftIndent=16) for b in bullet_buffer],
                    bulletType="bullet",
                    start="•",
                )
            )
            story.append(Spacer(1, 4))
            bullet_buffer.clear()

    for btype, btext in blocks:
        if btype == "bullet":
            bullet_buffer.append(btext)
        else:
            flush_bullets()
            if btype == "h1":
                story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceBefore=4, spaceAfter=4))
                story.append(Paragraph(btext, h1_style))
            elif btype == "h2":
                story.append(Paragraph(btext, h2_style))
            elif btype == "h3":
                story.append(Paragraph(btext, h3_style))
            elif btype == "para" and btext:
                story.append(Paragraph(btext, body_style))
            elif btype in ("space", "numbered") and btext:
                story.append(Paragraph(f"• {btext}", bullet_style))
            elif btype == "space":
                story.append(Spacer(1, 6))

    flush_bullets()

    # Footer
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    story.append(Paragraph(
        "This report was generated by Sovereign AI Workbench — 100% on-premise, zero cloud dependency.",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#94A3B8"), alignment=1),
    ))

    doc.build(story)


def _generate_docx(title: str, content: str, author: str, filepath: str):
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()
    doc.core_properties.author = author
    doc.core_properties.title = title

    # Title
    title_para = doc.add_heading(title, 0)
    title_para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for run in title_para.runs:
        run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        run.font.size = Pt(22)

    sub = doc.add_paragraph(
        f"Generated by {author} • {datetime.now().strftime('%B %d, %Y at %H:%M')}"
    )
    sub.runs[0].font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
    sub.runs[0].font.size = Pt(9)

    doc.add_paragraph("─" * 60)

    blocks = _parse_content_blocks(content)
    for btype, btext in blocks:
        if btype == "h1":
            doc.add_heading(btext, level=1)
        elif btype == "h2":
            doc.add_heading(btext, level=2)
        elif btype == "h3":
            doc.add_heading(btext, level=3)
        elif btype == "bullet":
            doc.add_paragraph(btext, style="List Bullet")
        elif btype == "numbered":
            doc.add_paragraph(btext, style="List Number")
        elif btype == "para" and btext:
            doc.add_paragraph(btext)
        elif btype == "space":
            doc.add_paragraph("")

    doc.add_paragraph("─" * 60)
    footer = doc.add_paragraph(
        "This report was generated by Sovereign AI Workbench — 100% on-premise, zero cloud dependency."
    )
    footer.runs[0].font.size = Pt(8)
    footer.runs[0].font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    doc.save(filepath)


from app.sandbox.manager import validate_code, execute_in_sandbox


def PYTHON_SANDBOX(code: str, input_files: list = None) -> str:
    """Execute Python code in an isolated Docker sandbox."""
    is_valid, msg = validate_code(code)
    if not is_valid:
        return f"Validation failed: {msg}"
    try:
        result = execute_in_sandbox(code, input_files)
        return json.dumps(result, default=str)
    except Exception as e:
        return f"Execution error: {e}"
