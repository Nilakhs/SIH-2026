import os
import datetime
from typing import List, Dict, Any, Optional
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from pptx import Presentation
from pptx.util import Inches as PptxInches, Pt as PptxPt
from pptx.dml.color import RGBColor as PptxRGBColor

GENERATED_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "data", "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

def _set_cell_background(cell, fill_hex: str):
    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def generate_docx_report(
    title: str,
    subtitle: str = "Air-Gapped Sovereign AI Report",
    summary: str = "",
    sections: Optional[List[Dict[str, Any]]] = None,
    tables: Optional[List[Dict[str, Any]]] = None,
    author: str = "Sovereign AI Workbench",
    filename: Optional[str] = None
) -> str:
    if not filename:
        clean_title = "".join(c for c in title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_').lower()
        filename = f"{clean_title}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
    if not filename.endswith('.docx'):
        filename += '.docx'

    filepath = os.path.join(GENERATED_DIR, filename)
    doc = Document()

    # Document Header metadata
    header_p = doc.add_paragraph()
    header_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hdr_run = header_p.add_run("SOVEREIGN AI WORKBENCH • AIR-GAPPED INTERNAL AUDIT")
    hdr_run.font.size = Pt(8.5)
    hdr_run.font.color.rgb = RGBColor(100, 116, 139)
    hdr_run.font.bold = True

    # Main Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    t_run = title_p.add_run(title)
    t_run.font.size = Pt(22)
    t_run.font.bold = True
    t_run.font.color.rgb = RGBColor(15, 23, 42)

    # Subtitle & Date
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(18)
    sub_run = sub_p.add_run(f"{subtitle}  |  Generated: {datetime.datetime.now().strftime('%d %B %Y, %H:%M UTC')}")
    sub_run.font.size = Pt(10)
    sub_run.font.color.rgb = RGBColor(71, 85, 105)

    # Executive Summary Box
    if summary:
        sum_heading = doc.add_heading("Executive Summary", level=1)
        sum_heading.paragraph_format.space_before = Pt(14)
        sum_heading.paragraph_format.space_after = Pt(6)
        
        sum_box = doc.add_table(rows=1, cols=1)
        sum_box.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = sum_box.cell(0, 0)
        _set_cell_background(cell, "F1F5F9")
        cell_p = cell.paragraphs[0]
        cell_p.paragraph_format.space_before = Pt(8)
        cell_p.paragraph_format.space_after = Pt(8)
        c_run = cell_p.add_run(summary)
        c_run.font.size = Pt(10)
        c_run.font.italic = True
        c_run.font.color.rgb = RGBColor(30, 41, 59)
        doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Content Sections
    if sections:
        for sec in sections:
            sec_title = sec.get("heading", "Section")
            sec_body = sec.get("content", "")
            bullets = sec.get("bullets", [])

            h = doc.add_heading(sec_title, level=2)
            h.paragraph_format.space_before = Pt(12)
            h.paragraph_format.space_after = Pt(4)

            if sec_body:
                p = doc.add_paragraph(sec_body)
                p.paragraph_format.space_after = Pt(6)
                p.style.font.size = Pt(10.5)

            for b in bullets:
                bp = doc.add_paragraph(b, style='List Bullet')
                bp.paragraph_format.space_after = Pt(3)

    # Tables
    if tables:
        for tbl in tables:
            tbl_title = tbl.get("title")
            headers = tbl.get("headers", [])
            rows = tbl.get("rows", [])

            if tbl_title:
                th = doc.add_heading(tbl_title, level=3)
                th.paragraph_format.space_before = Pt(12)
                th.paragraph_format.space_after = Pt(4)

            if headers and rows:
                doc_table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
                doc_table.alignment = WD_TABLE_ALIGNMENT.CENTER

                # Format Header
                for col_idx, header_text in enumerate(headers):
                    c = doc_table.cell(0, col_idx)
                    _set_cell_background(c, "1E293B")
                    p = c.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    r = p.add_run(str(header_text))
                    r.font.bold = True
                    r.font.size = Pt(9.5)
                    r.font.color.rgb = RGBColor(248, 250, 252)

                # Format Rows
                for r_idx, row_data in enumerate(rows):
                    bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
                    for col_idx, val in enumerate(row_data):
                        c = doc_table.cell(r_idx + 1, col_idx)
                        _set_cell_background(c, bg)
                        p = c.paragraphs[0]
                        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        r = p.add_run(str(val))
                        r.font.size = Pt(9.5)
                        r.font.color.rgb = RGBColor(30, 41, 59)
                doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Sign-off / Verification section
    doc.add_paragraph().paragraph_format.space_before = Pt(16)
    sign_table = doc.add_table(rows=2, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c1 = sign_table.cell(0, 0)
    c2 = sign_table.cell(0, 1)
    c1.paragraphs[0].add_run("Generated By:\nSovereign AI Analytical Engine").font.size = Pt(9)
    c2.paragraphs[0].add_run("Security Verification:\nAir-Gapped Local Environment (No Cloud)").font.size = Pt(9)

    doc.save(filepath)
    return filepath

def generate_xlsx_sheet(
    title: str,
    headers: List[str],
    rows: List[List[Any]],
    sheet_name: str = "Data",
    filename: Optional[str] = None,
    summary_row: bool = True
) -> str:
    if not filename:
        clean_title = "".join(c for c in title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_').lower()
        filename = f"{clean_title}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    if not filename.endswith('.xlsx'):
        filename += '.xlsx'

    filepath = os.path.join(GENERATED_DIR, filename)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name[:30]

    # Title row
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=max(len(headers), 4))
    title_cell = ws.cell(row=1, column=1)
    title_cell.value = title.upper()
    title_cell.font = Font(size=14, bold=True, color="0F172A")
    title_cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 28

    # Subtitle
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=max(len(headers), 4))
    sub_cell = ws.cell(row=2, column=1)
    sub_cell.value = f"Sovereign AI Workbench Analysis  •  Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M UTC')}"
    sub_cell.font = Font(size=9, italic=True, color="64748B")
    ws.row_dimensions[2].height = 18

    # Table Header at Row 4
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(size=10, bold=True, color="F8FAFC")
    border_thin = Border(
        left=Side(style='thin', color="CBD5E1"),
        right=Side(style='thin', color="CBD5E1"),
        top=Side(style='thin', color="CBD5E1"),
        bottom=Side(style='thin', color="CBD5E1")
    )

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.value = h
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin
    ws.row_dimensions[4].height = 24

    # Data Rows
    alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    for r_idx, row_vals in enumerate(rows, 5):
        is_alt = (r_idx % 2 == 0)
        for col_idx, val in enumerate(row_vals, 1):
            cell = ws.cell(row=r_idx, column=col_idx)
            cell.value = val
            cell.font = Font(size=9.5, color="1E293B")
            cell.border = border_thin
            if is_alt:
                cell.fill = alt_fill
            # Align numbers right, text left
            if isinstance(val, (int, float)):
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[r_idx].height = 20

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(filepath)
    return filepath

def generate_pptx_deck(
    title: str,
    subtitle: str = "Executive Briefing",
    slides: Optional[List[Dict[str, Any]]] = None,
    filename: Optional[str] = None
) -> str:
    if not filename:
        clean_title = "".join(c for c in title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_').lower()
        filename = f"{clean_title}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pptx"
    if not filename.endswith('.pptx'):
        filename += '.pptx'

    filepath = os.path.join(GENERATED_DIR, filename)
    prs = Presentation()
    prs.slide_width = PptxInches(13.333)
    prs.slide_height = PptxInches(7.5)

    blank_slide_layout = prs.slide_layouts[6]

    # 1. Title Slide
    slide = prs.slides.add_slide(blank_slide_layout)
    
    # Title text box
    tb = slide.shapes.add_textbox(PptxInches(1.0), PptxInches(2.2), PptxInches(11.3), PptxInches(3.0))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = PptxPt(40)
    p.font.bold = True
    p.font.color.rgb = PptxRGBColor(15, 23, 42)

    p2 = tf.add_paragraph()
    p2.text = subtitle
    p2.font.size = PptxPt(20)
    p2.font.color.rgb = PptxRGBColor(71, 85, 105)
    p2.space_before = PptxPt(14)

    p3 = tf.add_paragraph()
    p3.text = f"Sovereign AI Workbench  •  Air-Gapped Local Presentation  •  {datetime.datetime.now().strftime('%B %Y')}"
    p3.font.size = PptxPt(12)
    p3.font.color.rgb = PptxRGBColor(148, 163, 184)
    p3.space_before = PptxPt(20)

    # 2. Content Slides
    if slides:
        for s_data in slides:
            s = prs.slides.add_slide(blank_slide_layout)
            s_title = s_data.get("title", "Topic")
            bullets = s_data.get("bullets", [])
            metric_label = s_data.get("metric_label")
            metric_value = s_data.get("metric_value")

            # Header Banner
            tb_hdr = s.shapes.add_textbox(PptxInches(0.8), PptxInches(0.6), PptxInches(11.7), PptxInches(1.0))
            tf_hdr = tb_hdr.text_frame
            ph = tf_hdr.paragraphs[0]
            ph.text = s_title
            ph.font.size = PptxPt(28)
            ph.font.bold = True
            ph.font.color.rgb = PptxRGBColor(15, 23, 42)

            # Bullets on left
            left_w = 7.5 if metric_value else 11.5
            tb_body = s.shapes.add_textbox(PptxInches(0.8), PptxInches(1.8), PptxInches(left_w), PptxInches(4.8))
            tf_body = tb_body.text_frame
            tf_body.word_wrap = True

            for idx, b in enumerate(bullets):
                pb = tf_body.paragraphs[0] if idx == 0 else tf_body.add_paragraph()
                pb.text = f"•  {b}"
                pb.font.size = PptxPt(16)
                pb.font.color.rgb = PptxRGBColor(51, 65, 85)
                pb.space_before = PptxPt(10)

            # Callout card on right if metric provided
            if metric_value:
                card = s.shapes.add_textbox(PptxInches(8.8), PptxInches(2.2), PptxInches(3.8), PptxInches(2.8))
                tf_card = card.text_frame
                tf_card.word_wrap = True
                
                pcm = tf_card.paragraphs[0]
                pcm.text = str(metric_value)
                pcm.font.size = PptxPt(44)
                pcm.font.bold = True
                pcm.font.color.rgb = PptxRGBColor(217, 119, 6) # amber-600
                
                pcl = tf_card.add_paragraph()
                pcl.text = metric_label or "Key Metric"
                pcl.font.size = PptxPt(14)
                pcl.font.bold = True
                pcl.font.color.rgb = PptxRGBColor(71, 85, 105)
                pcl.space_before = PptxPt(6)

    prs.save(filepath)
    return filepath
