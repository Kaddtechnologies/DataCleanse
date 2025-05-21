from __future__ import annotations

import io
import json
import re
import itertools
import uuid
from pathlib import Path
from typing import List, Dict, Optional, Any, Tuple

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator # field_validator for newer Pydantic

# Assuming thefuzz is installed: pip install thefuzz python-levenshtein
from thefuzz import fuzz as _fuzz

# --- Pydantic Models (defined above, copied here for self-containment if run separately) ---
class DeduplicationColumnMap(BaseModel):
    customer_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tpi: Optional[str] = None

    @field_validator('customer_name') # Example: ensure customer_name is provided if it's critical
    def customer_name_must_be_provided(cls, v: Optional[str], values: Any) -> Optional[str]:
        # If customer_name is absolutely essential for your logic, you can enforce it.
        # For broader applicability, the main logic will check for None.
        # if v is None:
        #     raise ValueError("customer_name mapping is required for deduplication.")
        return v

class DuplicateRecordDetail(BaseModel):
    Row: int
    Name: Optional[str] = None
    Address: Optional[str] = None
    Name_score: Optional[int] = None
    Addr_score: Optional[int] = None
    Overall_score: int
    IsLowConfidence: bool
    LLM_conf: Optional[float] = None
    uid: str

class MasterRecord(BaseModel):
    MasterRow: int
    MasterName: Optional[str] = None
    MasterAddress: Optional[str] = None
    DuplicateCount: int
    AvgSimilarity: float
    IsLowConfidenceGroup: bool
    Duplicates: list[DuplicateRecordDetail]
    master_uid: str

class DeduplicationStats(BaseModel):
    high_confidence_duplicates_groups: int # Count of master groups
    medium_confidence_duplicates_groups: int # Count of master groups
    low_confidence_duplicates_groups: int # Count of master groups where at least one duplicate is low confidence
    block_stats: Dict[str, Any]
    total_master_records_with_duplicates: int
    total_potential_duplicate_records: int


class DeduplicationResponse(BaseModel):
    message: str
    results: Optional[Dict[str, Any]] = None # Make results optional for error cases
    error: Optional[str] = None


# --- Fuzzy Matching Helper ---
def neo_token_set_ratio(a: Optional[str], b: Optional[str]) -> int:
    if a is None or b is None:
        return 0
    return _fuzz.token_set_ratio(str(a), str(b))

# --- Text Normalization Helper ---
def normalize(text: Any) -> str:
    text = str(text).lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text) # Keep spaces
    text = re.sub(r"\s+", " ", text) # Normalize multiple spaces to single
    return text.strip()

# --- Core Deduplication Logic ---
def build_duplicate_df(df: pd.DataFrame, col_map: DeduplicationColumnMap) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Identifies potential duplicates in the DataFrame based on the provided column mapping.
    """
    # Validate that essential columns from col_map exist in df.columns
    mapped_cols_from_user_file = [val for val in col_map.model_dump().values() if val is not None]
    for user_col_name in mapped_cols_from_user_file:
        if user_col_name not in df.columns:
            raise ValueError(f"Mapped column '{user_col_name}' not found in the uploaded file. Available columns: {df.columns.tolist()}")

    # Create a working copy with only the necessary mapped columns + original index
    # Ensure we only try to select columns that were actually mapped by the user
    cols_to_select = [user_col_name for user_col_name in mapped_cols_from_user_file if user_col_name in df.columns]
    
    if not cols_to_select:
        raise ValueError("No valid columns were mapped or found in the uploaded file for deduplication.")

    work = df[cols_to_select].copy()
    work["ExcelRow"] = df.index # Keep original row index (0-based)

    # Normalize relevant fields
    # These are the internal logical names we use
    logical_fields_for_norm = ["customer_name", "address", "city", "country"]
    for logical_field in logical_fields_for_norm:
        user_column_name = getattr(col_map, logical_field, None)
        if user_column_name and user_column_name in work.columns:
            work[f"{logical_field}_norm"] = work[user_column_name].apply(normalize)
        else:
            # Ensure the normalized column exists even if not mapped, to prevent KeyErrors later
            work[f"{logical_field}_norm"] = ""


    # Blocking: Group records to reduce comparisons
    # Uses normalized customer_name (first 4 chars) and city (first char)
    blocks: dict[str, list[int]] = {}
    # Check if customer_name was mapped and normalized
    customer_name_norm_col_exists = "customer_name_norm" in work.columns and col_map.customer_name is not None
    city_norm_col_exists = "city_norm" in work.columns and col_map.city is not None

    for i, row in work.iterrows(): # i is the original DataFrame index here
        name_prefix = row["customer_name_norm"][:4] if customer_name_norm_col_exists and pd.notna(row["customer_name_norm"]) else "xxxx"
        city_prefix = row["city_norm"][0] if city_norm_col_exists and pd.notna(row["city_norm"]) and row["city_norm"] else "y"
        
        # Ensure name_prefix is not empty if customer_name_norm was empty or too short
        if not name_prefix: name_prefix = "xxxx" # Default prefix if name is empty/short

        blocks.setdefault(f"{name_prefix}_{city_prefix}", []).append(i)


    block_stats = {
        "total_blocks": len(blocks),
        "max_block_size": max(map(len, blocks.values())) if blocks else 0,
        "avg_block_size": (sum(map(len, blocks.values())) / len(blocks)) if blocks else 0,
        "records_in_blocks": sum(map(len, blocks.values()))
    }

    master_records_dict: dict[int, dict] = {} # Key is master record's original index

    # Compare records within each block
    for block_indices in blocks.values():
        if len(block_indices) < 2: # Skip blocks with less than 2 records
            continue
        for i1_idx, i2_idx in itertools.combinations(block_indices, 2):
            r1 = work.loc[i1_idx]
            r2 = work.loc[i2_idx]

            name_s = 0
            if col_map.customer_name and col_map.customer_name in r1 and col_map.customer_name in r2:
                name_s = neo_token_set_ratio(r1[col_map.customer_name], r2[col_map.customer_name])
            
            # If primary focus is name, and name similarity is too low, skip
            if col_map.customer_name and name_s < 70: # Threshold for name similarity
                continue

            addr_s = 0
            if col_map.address and col_map.address in r1 and col_map.address in r2:
                addr_s = neo_token_set_ratio(r1[col_map.address], r2[col_map.address])
            
            # Calculate overall similarity (can be adjusted based on which fields are present)
            # Simple average if both present, otherwise just the one present, or 0 if neither
            scores_present = []
            if col_map.customer_name: scores_present.append(name_s)
            if col_map.address: scores_present.append(addr_s)
            
            overall = round(sum(scores_present) / len(scores_present)) if scores_present else 0

            if overall < 70: # Overall threshold
                continue

            # Construct duplicate record detail
            dup_detail = {
                "Row": int(r2["ExcelRow"]) + 2, # 1-based for Excel +1 for header
                "Name": str(r2[col_map.customer_name]) if col_map.customer_name and col_map.customer_name in r2 else None,
                "Address": str(r2[col_map.address]) if col_map.address and col_map.address in r2 else None,
                "Name_score": name_s if col_map.customer_name else None,
                "Addr_score": addr_s if col_map.address else None,
                "Overall_score": overall,
                "IsLowConfidence": overall < 90, # True if score is 70-89
                "LLM_conf": None, # Placeholder, not used
                "uid": str(uuid.uuid4())
            }

            master_row_excel_num = int(r1["ExcelRow"]) + 2
            
            if master_row_excel_num not in master_records_dict:
                master_records_dict[master_row_excel_num] = {
                    "MasterRow": master_row_excel_num,
                    "MasterName": str(r1[col_map.customer_name]) if col_map.customer_name and col_map.customer_name in r1 else None,
                    "MasterAddress": str(r1[col_map.address]) if col_map.address and col_map.address in r1 else None,
                    "Duplicates": [],
                    "master_uid": str(uuid.uuid4())
                }
            master_records_dict[master_row_excel_num]["Duplicates"].append(dup_detail)

    # Convert dictionary of master records to a list of MasterRecord-like dicts
    masters_list = []
    for m_data in master_records_dict.values():
        sims = [d["Overall_score"] for d in m_data["Duplicates"]]
        avg_sim = round(sum(sims) / len(sims)) if sims else 0
        
        masters_list.append({
            "MasterRow": m_data["MasterRow"],
            "MasterName": m_data["MasterName"],
            "MasterAddress": m_data["MasterAddress"],
            "DuplicateCount": len(m_data["Duplicates"]),
            "AvgSimilarity": avg_sim,
            "IsLowConfidenceGroup": any(d["IsLowConfidence"] for d in m_data["Duplicates"]),
            "Duplicates": m_data["Duplicates"],
            "master_uid": m_data["master_uid"]
        })
    
    # Create DataFrame from the list of master records
    # Sort by average similarity to bring more likely duplicates to the top
    results_df = pd.DataFrame(masters_list)
    if not results_df.empty:
        results_df = results_df.sort_values("AvgSimilarity", ascending=False).reset_index(drop=True)
        
    return results_df, block_stats


# --- FastAPI App Setup ---
app = FastAPI(
    title="Simplified Duplicate Finder API",
    description="Accepts a file and column mappings to find duplicates.",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for simplicity, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoint ---
@app.post("/deduplicate/", response_model=DeduplicationResponse)
async def run_deduplication(
    file: UploadFile = File(..., description="CSV or XLSX file to be deduplicated."),
    column_map_json: str = Form(..., description="JSON string of DeduplicationColumnMap Pydantic model.")
):
    """
    Processes an uploaded file with specified column mappings to find duplicates.
    """
    try:
        # Parse the column mapping JSON string
        try:
            column_map_data = json.loads(column_map_json)
            column_map = DeduplicationColumnMap(**column_map_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format for column mapping.")
        except Exception as e: # Catches Pydantic validation errors
            raise HTTPException(status_code=400, detail=f"Invalid column mapping data: {str(e)}")

        # Read file content
        content = await file.read()
        
        # Determine file type and read into DataFrame
        if file.filename.endswith(".csv"):
            try:
                # Basic CSV read, consider adding encoding detection if needed
                df_raw = pd.read_csv(io.BytesIO(content), dtype=str, na_filter=False, keep_default_na=False)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error reading CSV file: {str(e)}")
        elif file.filename.endswith((".xls", ".xlsx")):
            try:
                df_raw = pd.read_excel(io.BytesIO(content), dtype=str, na_filter=False, keep_default_na=False)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload CSV or Excel.")

        if df_raw.empty:
            return DeduplicationResponse(message="Uploaded file is empty.", error="File empty")

        # Run deduplication logic
        try:
            dup_df, block_stats_dict = build_duplicate_df(df_raw, column_map)
        except ValueError as ve: # Catch specific errors from build_duplicate_df
             return DeduplicationResponse(message=f"Deduplication error: {str(ve)}", error=str(ve))


        # Prepare statistics
        # These counts are based on "master" groups of duplicates
        high_conf_groups = dup_df[dup_df["AvgSimilarity"] >= 98] if not dup_df.empty else pd.DataFrame()
        medium_conf_groups = dup_df[
            (dup_df["AvgSimilarity"] < 98) & (dup_df["AvgSimilarity"] >= 90)
        ] if not dup_df.empty else pd.DataFrame()
        
        # Low confidence groups are those where any duplicate has IsLowConfidence = True (overall < 90)
        # Or, more simply, groups with AvgSimilarity < 90, as IsLowConfidenceGroup is already calculated
        low_conf_groups = dup_df[dup_df["IsLowConfidenceGroup"]] if not dup_df.empty else pd.DataFrame()
        
        total_potential_duplicate_records_count = 0
        if not dup_df.empty:
            total_potential_duplicate_records_count = dup_df['DuplicateCount'].sum()


        stats = DeduplicationStats(
            high_confidence_duplicates_groups=len(high_conf_groups),
            medium_confidence_duplicates_groups=len(medium_conf_groups),
            low_confidence_duplicates_groups=len(low_conf_groups), # Count of groups containing at least one low confidence duplicate
            block_stats=block_stats_dict,
            total_master_records_with_duplicates=len(dup_df),
            total_potential_duplicate_records=total_potential_duplicate_records_count
        )

        # Convert DataFrame to list of dicts for the response
        # This should align with the MasterRecord Pydantic model
        duplicates_list = dup_df.to_dict(orient="records") if not dup_df.empty else []
        
        # Validate with Pydantic models before sending (optional, good for debugging)
        # validated_duplicates = [MasterRecord(**item) for item in duplicates_list]
        # validated_stats = DeduplicationStats(**stats.model_dump())


        return DeduplicationResponse(
            message="Deduplication process completed.",
            results={
                "duplicate_group_count": len(duplicates_list), # Number of master records with duplicates
                "total_potential_duplicates": stats.total_potential_duplicate_records, # Sum of all individual duplicates found
                "duplicates": duplicates_list, # List of MasterRecord-like dicts
                "stats": stats.model_dump() # Convert Pydantic model to dict
            }
        )

    except HTTPException as http_exc:
        # Re-raise HTTPException to let FastAPI handle it
        raise http_exc
    except Exception as e:
        # Catch any other unexpected errors
        # Log the error in a real application: import logging; logging.exception("Deduplication error")
        return DeduplicationResponse(message=f"An unexpected error occurred: {str(e)}", error=str(e))


@app.get("/")
async def root():
    return {"message": "Simplified Duplicate Finder API is running. Use the /deduplicate/ endpoint to process files."}

# To run this app:
# 1. Save as app.py (or similar)
# 2. Install dependencies: pip install fastapi uvicorn pandas "python-multipart" "thefuzz[speedup]" openpyxl
#    (openpyxl for .xlsx, python-levenshtein is included in thefuzz[speedup] for better performance)
# 3. Run with uvicorn: uvicorn app:app --reload
