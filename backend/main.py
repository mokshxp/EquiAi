import os
import io
import json
import math
import hashlib
import time
from datetime import datetime
from typing import Optional, List, Dict, Any

import pandas as pd
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="EquiAI Bias Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# In-memory audit log (blockchain-style chain)
# ─────────────────────────────────────────────
audit_chain: List[Dict] = []

def compute_block_hash(block: Dict) -> str:
    content = json.dumps({k: v for k, v in block.items() if k != "hash"}, sort_keys=True, default=str)
    return hashlib.sha256(content.encode()).hexdigest()

def add_to_chain(data: Dict) -> Dict:
    prev_hash = audit_chain[-1]["hash"] if audit_chain else "0" * 64
    block = {
        "index": len(audit_chain),
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
        "prev_hash": prev_hash,
    }
    block["hash"] = compute_block_hash(block)
    audit_chain.append(block)
    return block

# ─────────────────────────────────────────────
# Bias Detection Engine
# ─────────────────────────────────────────────

DEMOGRAPHIC_KEYWORDS = [
    "gender", "sex", "race", "ethnicity", "age", "religion",
    "income", "nationality", "disability", "marital", "education",
    "color", "caste", "tribe", "origin",
]

DECISION_KEYWORDS = [
    "selected", "approved", "hired", "accepted", "granted",
    "outcome", "decision", "result", "label", "target", "class",
    "passed", "admitted", "promoted", "rejected",
]

POSITIVE_VALUES = {
    "yes", "1", "true", "approved", "hired", "selected",
    "accepted", "granted", "passed", "admitted", "promoted",
}


def detect_columns(df: pd.DataFrame):
    """Auto-detect demographic and decision columns."""
    cols_lower = {col: col.lower().strip() for col in df.columns}
    
    demographic_cols = []
    decision_col = None
    
    for col, col_l in cols_lower.items():
        if any(kw in col_l for kw in DECISION_KEYWORDS):
            decision_col = col
        elif any(kw in col_l for kw in DEMOGRAPHIC_KEYWORDS):
            demographic_cols.append(col)
        elif col_l in ["name", "id", "index"]:
            continue  # skip ID columns
        # If still no decision col, pick last object or numeric col with few uniques
    
    # Fallback: if no decision col found, pick last column
    if decision_col is None:
        for col in reversed(df.columns):
            uniq = df[col].nunique()
            if uniq <= 5:
                decision_col = col
                break
    
    # Fallback: if still no demographic cols, pick non-decision, non-id cols
    if not demographic_cols:
        for col in df.columns:
            if col != decision_col and cols_lower[col] not in ["name", "id", "index"]:
                if df[col].nunique() <= 10:
                    demographic_cols.append(col)
    
    return demographic_cols, decision_col


def normalize_decision(val) -> bool:
    """Convert decision values to True/False."""
    return str(val).lower().strip() in POSITIVE_VALUES


def compute_disparate_impact(group_rates: Dict[str, float]) -> Dict:
    """Compute disparate impact ratios relative to the majority group."""
    if not group_rates:
        return {}
    
    majority_group = max(group_rates, key=group_rates.get)
    majority_rate = group_rates[majority_group]
    
    ratios = {}
    for group, rate in group_rates.items():
        if majority_rate > 0:
            ratios[group] = round(rate / majority_rate, 4)
        else:
            ratios[group] = 1.0
    
    return {
        "majority_group": majority_group,
        "majority_rate": round(majority_rate, 4),
        "ratios": ratios,
    }


def compute_bias_score(disparate_impact_result: Dict) -> float:
    """
    Bias score 0–100.
    0 = perfectly fair, 100 = maximally biased.
    Based on min disparate impact ratio across all groups.
    """
    ratios = disparate_impact_result.get("ratios", {})
    if not ratios:
        return 0.0
    
    min_ratio = min(ratios.values())
    # Map: ratio 1.0 → score 0, ratio 0.0 → score 100
    # Using penalty below 0.8 threshold heavily
    if min_ratio >= 1.0:
        return 0.0
    elif min_ratio >= 0.8:
        # Mild range: 0–20
        score = (1.0 - min_ratio) / 0.2 * 20
    elif min_ratio >= 0.5:
        # Moderate: 20–70
        score = 20 + (0.8 - min_ratio) / 0.3 * 50
    else:
        # Severe: 70–100
        score = 70 + (0.5 - min_ratio) / 0.5 * 30
    
    return round(min(score, 100.0), 2)


def analyze_bias(df: pd.DataFrame, decision_col: str, demographic_cols: List[str]) -> Dict:
    """Full bias analysis for all demographic columns."""
    
    df = df.copy()
    df["__decision__"] = df[decision_col].apply(normalize_decision)
    
    overall_positive_rate = df["__decision__"].mean()
    total_rows = len(df)
    selected_count = df["__decision__"].sum()
    
    column_analyses = {}
    
    for dem_col in demographic_cols:
        groups = df.groupby(dem_col)
        group_rates = {}
        group_counts = {}
        
        for name, grp in groups:
            rate = grp["__decision__"].mean()
            group_rates[str(name)] = round(float(rate), 4)
            group_counts[str(name)] = {
                "total": len(grp),
                "selected": int(grp["__decision__"].sum()),
                "rate": round(float(rate), 4),
            }
        
        di = compute_disparate_impact(group_rates)
        bias_score = compute_bias_score(di)
        
        # Determine bias level per column
        min_ratio = min(di["ratios"].values()) if di.get("ratios") else 1.0
        if min_ratio < 0.8:
            bias_level = "BIASED"
            bias_color = "red"
        elif min_ratio < 0.9:
            bias_level = "WARNING"
            bias_color = "yellow"
        else:
            bias_level = "FAIR"
            bias_color = "green"
        
        flagged_groups = [
            g for g, r in di.get("ratios", {}).items() if r < 0.8
        ]
        
        column_analyses[dem_col] = {
            "group_counts": group_counts,
            "group_rates": group_rates,
            "disparate_impact": di,
            "bias_score": bias_score,
            "bias_level": bias_level,
            "bias_color": bias_color,
            "flagged_groups": flagged_groups,
            "min_ratio": round(min_ratio, 4),
        }
    
    # Overall bias score = max across all columns
    all_scores = [v["bias_score"] for v in column_analyses.values()]
    overall_bias_score = max(all_scores) if all_scores else 0.0
    
    if overall_bias_score >= 40:
        overall_bias_level = "BIASED"
    elif overall_bias_score >= 20:
        overall_bias_level = "WARNING"
    else:
        overall_bias_level = "FAIR"
    
    return {
        "total_rows": total_rows,
        "selected_count": int(selected_count),
        "overall_positive_rate": round(float(overall_positive_rate), 4),
        "decision_column": decision_col,
        "demographic_columns": demographic_cols,
        "column_analyses": column_analyses,
        "overall_bias_score": overall_bias_score,
        "overall_bias_level": overall_bias_level,
    }


# ─────────────────────────────────────────────
# Gemini AI Explainer
# ─────────────────────────────────────────────

async def get_ai_explanation(bias_results: Dict) -> str:
    """Get plain-English bias explanation from Gemini."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your_gemini_api_key_here":
        return generate_rule_based_explanation(bias_results)
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        summary = build_bias_summary_text(bias_results)
        
        prompt = f"""You are an AI fairness expert. Analyze the following bias audit results and provide:
1. A clear, plain-English explanation of the bias found (2-3 sentences)
2. The root causes of this bias (bullet points)
3. Specific actionable recommendations to fix it (bullet points)
4. Legal and ethical implications (1-2 sentences)

Bias Audit Results:
{summary}

Overall Bias Score: {bias_results['overall_bias_score']}/100
Bias Level: {bias_results['overall_bias_level']}

Keep your response professional, empathetic, and actionable. Format with clear sections."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return generate_rule_based_explanation(bias_results)


def build_bias_summary_text(bias_results: Dict) -> str:
    lines = []
    lines.append(f"Dataset: {bias_results['total_rows']} records, {bias_results['selected_count']} selected ({bias_results['overall_positive_rate']*100:.1f}% rate)")
    
    for col, analysis in bias_results["column_analyses"].items():
        lines.append(f"\n[{col.upper()} Analysis] - Bias Score: {analysis['bias_score']}/100")
        for group, data in analysis["group_counts"].items():
            lines.append(f"  {group}: {data['selected']}/{data['total']} selected ({data['rate']*100:.1f}%)")
        if analysis["flagged_groups"]:
            lines.append(f"  ⚠️ Flagged groups (Disparate Impact < 0.8): {', '.join(analysis['flagged_groups'])}")
        lines.append(f"  Majority group: {analysis['disparate_impact'].get('majority_group')} ({analysis['disparate_impact'].get('majority_rate',0)*100:.1f}%)")
    
    return "\n".join(lines)


def generate_rule_based_explanation(bias_results: Dict) -> str:
    """Fallback rule-based explanation when AI API is unavailable."""
    level = bias_results["overall_bias_level"]
    score = bias_results["overall_bias_score"]
    
    parts = []
    
    if level == "BIASED":
        parts.append(f"🚨 **Critical Bias Detected** (Score: {score}/100)\n\nThis dataset shows statistically significant bias that violates the standard 80% Disparate Impact rule. Certain demographic groups are being systematically disadvantaged in the selection process.\n")
    elif level == "WARNING":
        parts.append(f"⚠️ **Potential Bias Warning** (Score: {score}/100)\n\nThis dataset shows patterns that may indicate bias. While not at critical levels, the disparate impact ratios suggest some groups may be receiving less favorable outcomes.\n")
    else:
        parts.append(f"✅ **No Significant Bias Detected** (Score: {score}/100)\n\nThe dataset appears to be relatively fair across demographic groups, with disparate impact ratios above the 0.8 threshold.\n")
    
    parts.append("**Root Causes (Common Patterns):**")
    
    for col, analysis in bias_results["column_analyses"].items():
        if analysis["flagged_groups"]:
            parts.append(f"\n• **{col}**: Groups {', '.join(analysis['flagged_groups'])} have selection rates significantly below the majority group ({analysis['disparate_impact'].get('majority_group')}). This may reflect historical inequities, proxy discrimination, or biased training data.")
    
    parts.append("\n**Recommendations:**")
    parts.append("• Conduct a thorough audit of the selection criteria and decision-making process")
    parts.append("• Remove or anonymize demographic features that correlate with protected attributes")
    parts.append("• Apply fairness-aware machine learning techniques (reweighting, adversarial debiasing)")
    parts.append("• Implement regular bias monitoring with automated alerts")
    parts.append("• Consult with domain experts and affected communities")
    parts.append("• Review for proxy variables that indirectly encode demographic information")
    
    parts.append("\n**Legal & Ethical Implications:**")
    if level == "BIASED":
        parts.append("⚖️ This level of disparate impact may violate equal opportunity laws (e.g., Title VII in the US, Equality Act in the UK). Immediate corrective action is strongly recommended.")
    else:
        parts.append("⚖️ While formal legal thresholds may not be crossed, proactive fairness measures help build trust and reduce long-term legal risk.")
    
    return "\n".join(parts)


# ─────────────────────────────────────────────
# PDF Report Generator
# ─────────────────────────────────────────────

def generate_pdf_report(audit_data: Dict) -> bytes:
    """Generate a PDF audit report."""
    try:
        from fpdf import FPDF
        
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_fill_color(30, 30, 50)
        pdf.rect(0, 0, 210, 40, 'F')
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 22)
        pdf.set_xy(10, 10)
        pdf.cell(0, 10, "EquiAI - Bias Audit Report", ln=True)
        pdf.set_font("Helvetica", size=10)
        pdf.set_xy(10, 25)
        pdf.cell(0, 8, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", ln=True)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_xy(10, 50)
        
        # Summary
        results = audit_data.get("bias_results", {})
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 8, "Executive Summary", ln=True)
        pdf.set_font("Helvetica", size=11)
        pdf.ln(2)
        
        level = results.get("overall_bias_level", "N/A")
        score = results.get("overall_bias_score", 0)
        
        color_map = {"BIASED": (220, 50, 50), "WARNING": (230, 160, 0), "FAIR": (40, 167, 69)}
        r, g, b = color_map.get(level, (100, 100, 100))
        
        pdf.set_fill_color(r, g, b)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(60, 10, f"  {level}", fill=True, border=0)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(12)
        
        pdf.set_font("Helvetica", size=11)
        pdf.cell(0, 7, f"Overall Bias Score: {score}/100", ln=True)
        pdf.cell(0, 7, f"Total Records: {results.get('total_rows', 'N/A')}", ln=True)
        pdf.cell(0, 7, f"Selected: {results.get('selected_count', 'N/A')} ({results.get('overall_positive_rate', 0)*100:.1f}%)", ln=True)
        pdf.cell(0, 7, f"Decision Column: {results.get('decision_column', 'N/A')}", ln=True)
        pdf.ln(5)
        
        # Column analyses
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 8, "Demographic Analysis", ln=True)
        pdf.ln(2)
        
        for col, analysis in results.get("column_analyses", {}).items():
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_fill_color(240, 240, 250)
            pdf.cell(0, 8, f"  {col}  |  Bias Score: {analysis['bias_score']}/100  |  {analysis['bias_level']}", fill=True, ln=True)
            pdf.set_font("Helvetica", size=10)
            pdf.ln(1)
            
            for group, data in analysis.get("group_counts", {}).items():
                ratio = analysis["disparate_impact"]["ratios"].get(group, 1.0)
                flag = " ⚠" if ratio < 0.8 else ""
                pdf.cell(0, 6, f"    {group}: {data['selected']}/{data['total']} selected ({data['rate']*100:.1f}%)  |  DI Ratio: {ratio:.3f}{flag}", ln=True)
            
            pdf.ln(3)
        
        # AI Explanation
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 8, "AI Explanation & Recommendations", ln=True)
        pdf.ln(2)
        pdf.set_font("Helvetica", size=10)
        
        explanation = audit_data.get("ai_explanation", "No explanation available.")
        # Strip markdown for PDF
        clean_exp = explanation.replace("**", "").replace("*", "").replace("#", "").replace("`", "")
        
        pdf.multi_cell(0, 6, clean_exp)
        
        # Blockchain entry
        block = audit_data.get("blockchain_block", {})
        if block:
            pdf.ln(5)
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Audit Chain Entry", ln=True)
            pdf.set_font("Helvetica", size=9)
            pdf.cell(0, 6, f"Block Index: {block.get('index', 'N/A')}", ln=True)
            pdf.cell(0, 6, f"Hash: {block.get('hash', 'N/A')}", ln=True)
            pdf.cell(0, 6, f"Prev Hash: {block.get('prev_hash', 'N/A')}", ln=True)
            pdf.cell(0, 6, f"Timestamp: {block.get('timestamp', 'N/A')}", ln=True)
        
        return pdf.output(dest='S').encode('latin-1')
    
    except Exception as e:
        # Minimal fallback
        return f"PDF generation failed: {str(e)}".encode()


# ─────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "EquiAI Bias Detection API v1.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    """Upload and parse a CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {str(e)}")
    
    # Basic validation
    if df.empty:
        raise HTTPException(status_code=422, detail="CSV file is empty.")
    if len(df.columns) < 2:
        raise HTTPException(status_code=422, detail="CSV must have at least 2 columns.")
    
    demographic_cols, decision_col = detect_columns(df)
    
    # Replace NaN with None for JSON serialization
    df = df.where(pd.notnull(df), None)
    
    preview_rows = df.head(20).to_dict(orient="records")
    
    return {
        "filename": file.filename,
        "total_rows": len(df),
        "columns": list(df.columns),
        "detected_demographic_cols": demographic_cols,
        "detected_decision_col": decision_col,
        "preview": preview_rows,
        "column_types": {col: str(df[col].dtype) for col in df.columns},
        "unique_counts": {col: int(df[col].nunique()) for col in df.columns},
    }


@app.post("/api/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    """Full bias analysis pipeline: parse → detect → analyze → AI explanation → blockchain."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {str(e)}")
    
    if df.empty:
        raise HTTPException(status_code=422, detail="CSV file is empty.")
    
    demographic_cols, decision_col = detect_columns(df)
    
    if not decision_col:
        raise HTTPException(status_code=422, detail="Could not detect a decision/outcome column. Please ensure your CSV has a column like 'Selected', 'Approved', 'Hired', etc.")
    
    if not demographic_cols:
        raise HTTPException(status_code=422, detail="Could not detect demographic columns. Please ensure your CSV has columns like 'Gender', 'Race', 'Age', etc.")
    
    # Run bias analysis
    bias_results = analyze_bias(df, decision_col, demographic_cols)
    
    # Get AI explanation
    ai_explanation = await get_ai_explanation(bias_results)
    
    # Store in blockchain
    audit_payload = {
        "filename": file.filename,
        "bias_score": bias_results["overall_bias_score"],
        "bias_level": bias_results["overall_bias_level"],
        "decision_column": decision_col,
        "demographic_columns": demographic_cols,
        "total_rows": bias_results["total_rows"],
    }
    block = add_to_chain(audit_payload)
    
    return {
        "status": "success",
        "filename": file.filename,
        "bias_results": bias_results,
        "ai_explanation": ai_explanation,
        "blockchain_block": block,
        "preview": df.head(20).where(pd.notnull(df.head(20)), None).to_dict(orient="records"),
    }


@app.get("/api/chain")
async def get_audit_chain():
    """Get the full blockchain audit log."""
    return {
        "chain_length": len(audit_chain),
        "chain": audit_chain,
        "valid": all(
            (i == 0 or block["prev_hash"] == audit_chain[i-1]["hash"])
            for i, block in enumerate(audit_chain)
        )
    }


@app.post("/api/export/json")
async def export_json(file: UploadFile = File(...)):
    """Export full audit as JSON."""
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    demographic_cols, decision_col = detect_columns(df)
    bias_results = analyze_bias(df, decision_col, demographic_cols)
    ai_explanation = await get_ai_explanation(bias_results)
    block = add_to_chain({"export": "json", "filename": file.filename})
    
    export_data = {
        "report_metadata": {
            "generated_at": datetime.utcnow().isoformat(),
            "tool": "EquiAI v1.0",
            "filename": file.filename,
        },
        "bias_results": bias_results,
        "ai_explanation": ai_explanation,
        "blockchain_block": block,
    }
    
    json_bytes = json.dumps(export_data, indent=2, default=str).encode()
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=equiai_audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"}
    )


@app.post("/api/export/pdf")
async def export_pdf(file: UploadFile = File(...)):
    """Export full audit as PDF."""
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    demographic_cols, decision_col = detect_columns(df)
    bias_results = analyze_bias(df, decision_col, demographic_cols)
    ai_explanation = await get_ai_explanation(bias_results)
    block = add_to_chain({"export": "pdf", "filename": file.filename})
    
    audit_data = {
        "bias_results": bias_results,
        "ai_explanation": ai_explanation,
        "blockchain_block": block,
    }
    
    pdf_bytes = generate_pdf_report(audit_data)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=equiai_audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
