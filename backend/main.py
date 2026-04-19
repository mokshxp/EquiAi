import os
import io
import json
import math
import hashlib
import time
from datetime import datetime
from typing import Optional, List, Dict, Any

from typing import Optional, List, Dict, Any

import pandas as pd
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# For advanced scheduling/cron
# from apscheduler.schedulers.background import BackgroundScheduler

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


# ─────────────────────────────────────────────
# Global Jurisdictions Engine
# ─────────────────────────────────────────────
JURISDICTIONS = {
    "US_EEOC":     {"threshold": 0.80, "standard": "US EEOC 80% Rule"},
    "EU_AI_ACT":   {"threshold": 0.85, "standard": "EU AI Act 85% Standard"},
    "UK_EQUALITY": {"threshold": 0.80, "standard": "UK Equality Act 2010"},
    "INDIA":       {"threshold": 0.75, "standard": "India Constitution Art. 15"},
    "GLOBAL_MIN":  {"threshold": 0.80, "standard": "UN Global Baseline"},
}

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
    Fairness score 0–100.
    100 = perfectly fair (DI=1.0), 0 = severe bias (DI=0.0).
    """
    ratios = disparate_impact_result.get("ratios", {})
    if not ratios:
        return 100.0 # If no groups to compare, treat as fair
    
    min_ratio = min(ratios.values())
    # Score is simply the min ratio as a percentage
    score = min_ratio * 100
    
    return round(min(max(score, 0.0), 100.0), 2)


def analyze_bias(df: pd.DataFrame, decision_col: str, demographic_cols: List[str], jurisdiction_key: str = "GLOBAL_MIN") -> Dict:
    """Full bias analysis for all demographic columns, dynamically applying jurisdiction logic."""
    
    jur_info = JURISDICTIONS.get(jurisdiction_key, JURISDICTIONS["GLOBAL_MIN"])
    threshold = jur_info["threshold"]
    
    df = df.copy()
    df["__decision__"] = df[decision_col].apply(normalize_decision)
    
    overall_positive_rate = df["__decision__"].mean()
    total_rows = len(df)
    selected_count = df["__decision__"].sum()
    
    column_analyses = {}
    
    for dem_col in demographic_cols:
        col_lower = dem_col.lower()
        is_bucketed = False
        
        # --- Specialized Grouping Logic ---
        if 'age' in col_lower:
            # Group into Young (<30) vs Senior (30+)
            df_temp = pd.to_numeric(df[dem_col], errors='coerce')
            processed_series = df_temp.apply(
                lambda x: "Young (<30)" if pd.notna(x) and x < 30 else "Senior (30+)" if pd.notna(x) else "Unknown"
            )
            is_bucketed = True
        elif 'education' in col_lower or 'degree' in col_lower:
            # Group into Undergraduate vs Advanced
            mapping = {
                'bachelor': 'Undergraduate', 'graduate': 'Advanced', 
                'master': 'Advanced', 'phd': 'Advanced', 
                'doctor': 'Advanced', 'high school': 'Basic', 
                'diploma': 'Basic'
            }
            processed_series = df[dem_col].apply(
                lambda x: next((v for k,v in mapping.items() if k in str(x).lower()), "Other")
            )
            is_bucketed = True
        elif pd.api.types.is_numeric_dtype(df[dem_col]) and df[dem_col].nunique() > 10:
            # Generic Numeric Bucketing (Income, Experience, etc.)
            median_val = df[dem_col].median()
            processed_series = df[dem_col].apply(
                lambda x: f"High (>{median_val})" if pd.notna(x) and x >= median_val else f"Low (<{median_val})"
            )
            is_bucketed = True
        else:
            processed_series = df[dem_col]

        # Count groups
        groups = df.assign(processed=processed_series).groupby('processed')
            
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
        
        min_ratio = min(di["ratios"].values()) if di.get("ratios") else 1.0
        
        if min_ratio >= threshold:
            bias_level = "FAIR"
            bias_color = "green"
            severity = "Low"
        elif min_ratio >= (threshold - 0.20):
            bias_level = "MODERATE"
            bias_color = "yellow"
            severity = "Medium"
        elif min_ratio >= (threshold - 0.40):
            bias_level = "HIGH_BIAS"
            bias_color = "orange"
            severity = "High"
        else:
            bias_level = "SEVERE"
            bias_color = "red"
            severity = "Critical"

        # Add Comparison Insight (Safely)
        comparison_insight = "Selection rates are relatively balanced"
        if di and di.get("majority_group") and group_rates:
            try:
                maj_group = di.get("majority_group")
                min_group = min(group_rates, key=group_rates.get)
                min_rate = group_rates.get(min_group, 0)
                maj_rate = group_rates.get(maj_group, 0)
                
                if min_rate > 0 and maj_group != min_group:
                    ratio_diff = float(maj_rate / min_rate)
                    if ratio_diff > 1.1:
                        comparison_insight = f"{min_group} selected ~{ratio_diff:.1f}x less than {maj_group}"
            except Exception:
                pass # Fallback to default insight if calculation fails
        
        flagged_groups = [
            g for g, r in di.get("ratios", {}).items() if r < threshold
        ]
        
        column_analyses[dem_col] = {
            "group_counts": group_counts,
            "group_rates": group_rates,
            "disparate_impact": di,
            "bias_score": bias_score,
            "bias_level": bias_level,
            "bias_color": bias_color,
            "severity": severity,
            "comparison_insight": comparison_insight,
            "flagged_groups": flagged_groups,
            "min_ratio": round(min_ratio, 4),
            "threshold_applied": threshold,
            "is_smart_bucketed": is_bucketed,
        }
    
    all_scores = [v["bias_score"] for v in column_analyses.values()]
    # Overall logic based on the worst-case attribute
    overall_bias_score = min(all_scores) if all_scores else 100.0
    
    overall_min_ratio = overall_bias_score / 100.0
    
    if overall_min_ratio >= threshold:
        overall_bias_level = "FAIR"
    elif overall_min_ratio >= (threshold - 0.20):
        overall_bias_level = "MODERATE"
    elif overall_min_ratio >= (threshold - 0.40):
        overall_bias_level = "HIGH_BIAS"
    else:
        overall_bias_level = "SEVERE"
    
    return {
        "total_rows": total_rows,
        "selected_count": int(selected_count),
        "overall_positive_rate": round(float(overall_positive_rate), 4),
        "decision_column": decision_col,
        "demographic_columns": demographic_cols,
        "column_analyses": column_analyses,
        "overall_bias_score": overall_bias_score,
        "overall_bias_level": overall_bias_level,
        "jurisdiction_standard": jur_info["standard"],
        "jurisdiction_threshold": threshold,
    }


# ─────────────────────────────────────────────
# Gemini AI Explainer
# ─────────────────────────────────────────────

async def get_ai_explanation(bias_results: Dict, jurisdiction_info: str = "Global Standard", language: str = "English") -> str:
    """Get plain-English bias explanation from Gemini in multi-language and tailored to SDG/jurisdiction."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your_gemini_api_key_here":
        return generate_rule_based_explanation(bias_results)
    
    try:
        import asyncio
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        summary = build_bias_summary_text(bias_results)
        
        prompt = f"""You are an AI fairness auditor producing an enterprise compliance report.

Write the response in {language}.
Relevant Legal Framework: {jurisdiction_info}

Analyze this demographic data:
{summary}

Format your response exactly with these headers without Markdown headings `#`:
EXECUTIVE SUMMARY
Is this dataset biased under the {jurisdiction_info}? Explain why.

UN SDG ALIGNMENT
Map the findings specifically to UN Sustainable Development Goals (e.g. SDG 5 for gender, SDG 10 for inequalities). Be specific.

ROOT CAUSES
Why are the selection rates different? What is happening in the data?

REMEDIATION STEPS
Provide 2 highly specific, technical ML/Data actions to fix this.

Keep it professional, highly analytical, and legally framed."""

        response = await asyncio.wait_for(model.generate_content_async(prompt), timeout=6.0)
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
    
    if level == "SEVERE":
        parts.append(f"🚨 **Critical Bias Detected** (Fairness Score: {score}/100)\n\n")
    elif level == "HIGH_BIAS":
        parts.append(f"🚨 **High Risk Bias Detected** (Fairness Score: {score}/100)\n\n")
    elif level == "MODERATE":
        parts.append(f"⚠️ **Potential Bias Warning** (Fairness Score: {score}/100)\n\n")
    else:
        parts.append(f"✅ **No Significant Bias Detected** (Fairness Score: {score}/100)\n\n")

    biased_cols = [col for col, an in bias_results["column_analyses"].items() if an["bias_level"] != "FAIR"]
    fair_cols = [col for col, an in bias_results["column_analyses"].items() if an["bias_level"] == "FAIR"]
    
    if biased_cols:
        parts.append(f"Bias detected primarily in **{', '.join(biased_cols)}**. ")
    if fair_cols:
        parts.append(f"**{', '.join(fair_cols)}** {'shows' if len(fair_cols)==1 else 'show'} no significant bias. ")
    
    if not biased_cols:
        parts.append("The dataset appears overall fair across demographic groups.")

    return "".join(parts)
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
    """Generate a PDF audit report using fpdf2."""
    try:
        from fpdf import FPDF
        
        # Use FPDF2 class
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
        pdf.cell(60, 10, f"  {level}", fill=True)
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
                flag = " (!)" if ratio < 0.8 else ""
                pdf.cell(0, 6, f"    {group}: {data['selected']}/{data['total']} selected ({data['rate']*100:.1f}%)  |  DI Ratio: {ratio:.3f}{flag}", ln=True)
            
            pdf.ln(3)
        
        # AI Explanation
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 8, "AI Explanation & Recommendations", ln=True)
        pdf.ln(2)
        pdf.set_font("Helvetica", size=10)
        
        explanation = audit_data.get("ai_explanation", "No explanation available.")
        # Sanitize for fpdf (remove non-latin-1)
        clean_exp = explanation.replace("**", "").replace("*", "").replace("#", "").replace("`", "")
        # Very important: fpdf2 default fonts only support latin-1. We encode/decode to strip others.
        safe_exp = clean_exp.encode('latin-1', 'ignore').decode('latin-1')
        
        pdf.multi_cell(0, 6, safe_exp)
        
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
        
        # In fpdf2, output() returns bytes directly
        return pdf.output()
    
    except Exception as e:
        print(f"PDF Error: {str(e)}")
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

    if df.empty:
        raise HTTPException(status_code=422, detail="CSV file is empty.")
    if len(df.columns) < 2:
        raise HTTPException(status_code=422, detail="CSV must have at least 2 columns.")

    demographic_cols, decision_col = detect_columns(df)
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
async def analyze_csv(
    file: UploadFile = File(...),
    jurisdiction: str = Form("US_EEOC"),
    language: str = Form("English")
):
    """Instant bias analysis — returns results immediately without waiting for AI."""
    try:
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
            raise HTTPException(status_code=422, detail="Could not detect a decision/outcome column. Ensure your CSV has a column like 'Selected', 'Approved', 'Hired', etc.")

        if not demographic_cols:
            raise HTTPException(status_code=422, detail="Could not detect demographic columns. Ensure your CSV has columns like 'Gender', 'Race', 'Age', etc.")

        bias_results = analyze_bias(df, decision_col, demographic_cols, jurisdiction_key=jurisdiction)
        jur_info = JURISDICTIONS.get(jurisdiction, JURISDICTIONS["GLOBAL_MIN"])

        # Instant rule-based explanation — no Gemini network call here
        ai_explanation = generate_rule_based_explanation(bias_results)

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
            "jurisdiction_info": jur_info["standard"],
            "language": language,
            "preview": df.head(20).where(pd.notnull(df.head(20)), None).to_dict(orient="records"),
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        err_msg = "".join(traceback.format_exception(type(e), e, e.__traceback__))
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {err_msg}")


@app.post("/api/explain")
async def get_ai_explain(request: Request):
    """Non-blocking endpoint: call AFTER results load to upgrade explanation with Gemini AI."""
    try:
        body = await request.json()
        bias_results = body.get("bias_results", {})
        jurisdiction_info = body.get("jurisdiction_info", "Global Standard")
        language = body.get("language", "English")

        explanation = await get_ai_explanation(
            bias_results,
            jurisdiction_info=jurisdiction_info,
            language=language
        )
        return {"explanation": explanation}
    except Exception:
        return {"explanation": "AI explanation temporarily unavailable."}


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


class WebhookPayload(BaseModel):
    """Payload for real-time and CI/CD webhook integrations."""
    decisions: List[Dict[str, Any]]
    decision_column: str = "selected"
    demographic_columns: List[str] = ["gender", "race"]
    jurisdiction: str = "GLOBAL_MIN"


@app.post("/api/webhook/evaluate")
async def webhook_evaluate(payload: WebhookPayload):
    """
    Real-Time Bias Evaluation Webhook.
    Receives JSON decisions on-the-fly and runs the fairness audit.
    If 'overall_bias_score' drops below jurisdiction threshold, it triggers an alert.
    """
    if not payload.decisions:
        raise HTTPException(status_code=400, detail="No decisions provided.")
    
    df = pd.DataFrame(payload.decisions)
    
    if payload.decision_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Decision column '{payload.decision_column}' missing.")
    
    missing_demographics = [col for col in payload.demographic_columns if col not in df.columns]
    if missing_demographics:
        raise HTTPException(status_code=400, detail=f"Missing demographic columns: {missing_demographics}")
        
    bias_results = analyze_bias(df, payload.decision_column, payload.demographic_columns, jurisdiction_key=payload.jurisdiction)
    
    jur_info = JURISDICTIONS.get(payload.jurisdiction, JURISDICTIONS["GLOBAL_MIN"])
    alert_triggered = bias_results["overall_bias_score"] < (jur_info["threshold"] * 100)
    
    block = add_to_chain({
        "type": "webhook_eval",
        "bias_score": bias_results["overall_bias_score"],
        "alert": alert_triggered,
        "records": len(df),
        "jurisdiction": payload.jurisdiction
    })
    
    return {
        "status": "success",
        "alert_triggered": alert_triggered,
        "bias_results": bias_results,
        "blockchain_hash": block["hash"]
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
