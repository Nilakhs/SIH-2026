import os
import glob
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from document_generation.generator import (
    generate_docx_report,
    generate_xlsx_sheet,
    generate_pptx_deck,
    GENERATED_DIR
)
from audit import log_audit_event

router = APIRouter(tags=["generation"])

class GenerateRequest(BaseModel):
    format: str  # "docx" | "xlsx" | "pptx"
    title: str
    subtitle: Optional[str] = "Air-Gapped Sovereign AI Report"
    summary: Optional[str] = ""
    sections: Optional[List[Dict[str, Any]]] = None
    tables: Optional[List[Dict[str, Any]]] = None
    headers: Optional[List[str]] = None
    rows: Optional[List[List[Any]]] = None
    slides: Optional[List[Dict[str, Any]]] = None
    use_sample_dataset: Optional[bool] = False

class GeneratedFileItem(BaseModel):
    filename: str
    format: str
    size_bytes: int
    size_formatted: str
    created_at: str
    download_url: str

def _format_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size / (1024 * 1024):.1f} MB"

@router.get("/list", response_model=List[GeneratedFileItem])
async def list_generated_files():
    try:
        files = []
        for filepath in glob.glob(os.path.join(GENERATED_DIR, "*")):
            if os.path.isfile(filepath):
                fname = os.path.basename(filepath)
                stat = os.stat(filepath)
                ext = fname.split(".")[-1].lower() if "." in fname else "unknown"
                created_iso = datetime.datetime.fromtimestamp(stat.st_mtime, tz=datetime.timezone.utc).isoformat()
                files.append(GeneratedFileItem(
                    filename=fname,
                    format=ext,
                    size_bytes=stat.st_size,
                    size_formatted=_format_size(stat.st_size),
                    created_at=created_iso,
                    download_url=f"/api/generation/download/{fname}"
                ))
        files.sort(key=lambda x: x.created_at, reverse=True)
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list generated files: {e}")

@router.post("/create")
async def create_document(req: GenerateRequest):
    fmt = req.format.lower().strip()
    clean_title = req.title.strip() or "Sovereign AI Report"
    
    # Check if user requested to populate from available dataset (equipment_downtime.csv)
    dataset_headers = req.headers or []
    dataset_rows = req.rows or []
    if req.use_sample_dataset or (not dataset_rows and not req.sections):
        # Look for equipment_downtime.csv
        csv_candidates = [
            r"c:\SIH\equipment_downtime.csv",
            r"c:\SIH\test_equipment_downtime.csv"
        ]
        for cp in csv_candidates:
            if os.path.exists(cp):
                try:
                    import csv
                    with open(cp, "r", encoding="utf-8") as f:
                        reader = csv.reader(f)
                        dataset_headers = next(reader, [])
                        dataset_rows = [row for row in reader if row]
                    break
                except Exception:
                    pass

    generated_path = None
    try:
        if fmt == "docx":
            sec = req.sections or [
                {
                    "heading": "Operational Findings & Analysis",
                    "content": "This document was generated automatically by the Sovereign AI analytical engine following local telemetry and sensor review.",
                    "bullets": [
                        "Identified highest downtime impact concentrated in critical rotating equipment.",
                        "Preventative maintenance scheduled to avert catastrophic failure.",
                        "All data processed locally with 0 cloud leakage."
                    ]
                }
            ]
            tbls = req.tables or []
            if dataset_headers and dataset_rows and not tbls:
                tbls.append({
                    "title": "Equipment Failure & Downtime Summary",
                    "headers": dataset_headers,
                    "rows": dataset_rows[:10]
                })

            generated_path = generate_docx_report(
                title=clean_title,
                subtitle=req.subtitle or "Air-Gapped Sovereign AI Report",
                summary=req.summary or "Executive overview of equipment performance, operational risks, and maintenance priorities.",
                sections=sec,
                tables=tbls
            )

        elif fmt == "xlsx":
            headers = dataset_headers or ["Metric", "Department", "Value", "Status"]
            rows = dataset_rows or [
                ["Pump P-101", "Refining", "14.5 hrs", "Critical"],
                ["Compressor C-201", "Utilities", "8.2 hrs", "Warning"],
                ["Turbine T-301", "Powerhouse", "2.1 hrs", "Normal"]
            ]
            generated_path = generate_xlsx_sheet(
                title=clean_title,
                headers=headers,
                rows=rows,
                sheet_name="Downtime_Analysis"
            )

        elif fmt == "pptx":
            slides = req.slides or [
                {
                    "title": "Executive Summary & Operational Status",
                    "bullets": [
                        "Review of plant machinery uptime across all operational zones.",
                        "Automated local analysis detected abnormal downtime in Refining.",
                        "Preventative component replacement ordered for rotating seals."
                    ],
                    "metric_value": "98.4%",
                    "metric_label": "Plant Availability Target"
                },
                {
                    "title": "Equipment Failure Insights",
                    "bullets": [
                        "High frequency bearing wear detected in secondary pumps.",
                        "Recommended vibration monitoring at 4-hour intervals.",
                        "Zero data egress: All telemetry audited air-gapped on site."
                    ],
                    "metric_value": "24.8 hrs",
                    "metric_label": "Total Logged Downtime"
                }
            ]
            generated_path = generate_pptx_deck(
                title=clean_title,
                subtitle=req.subtitle or "Industrial Operations Briefing",
                slides=slides
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format '{fmt}'. Supported formats: docx, xlsx, pptx.")

        fname = os.path.basename(generated_path)
        stat = os.stat(generated_path)

        # Log audit event
        try:
            log_audit_event(
                event_type="DOCUMENT_GENERATION",
                task_type="document_generation",
                model="local_template_engine",
                image_filename=fname,
                status="COMPLETED",
                summary=f"Generated {fmt.upper()} document: {fname} ({_format_size(stat.st_size)})"
            )
        except Exception:
            pass

        return {
            "success": True,
            "filename": fname,
            "format": fmt,
            "size_bytes": stat.st_size,
            "size_formatted": _format_size(stat.st_size),
            "download_url": f"/api/generation/download/{fname}",
            "message": f"Successfully generated {fmt.upper()} document: {fname}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document generation failed: {e}")

@router.get("/download/{filename}")
async def download_file(filename: str):
    # Prevent directory traversal
    clean_filename = os.path.basename(filename)
    filepath = os.path.join(GENERATED_DIR, clean_filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    ext = clean_filename.split(".")[-1].lower()
    media_types = {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "pdf": "application/pdf"
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(filepath, filename=clean_filename, media_type=media_type)

@router.delete("/{filename}")
async def delete_generated_file(filename: str):
    clean_filename = os.path.basename(filename)
    filepath = os.path.join(GENERATED_DIR, clean_filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        os.remove(filepath)
        return {"success": True, "message": f"Deleted {clean_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")
