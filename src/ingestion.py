"""
src/ingestion.py
================
Module for ingesting the UCI Cardiotocography Dataset (ID: 193).
Supports:
  1. Event-specified ucimlrepo (fetch_ucirepo(id=193))
  2. Local data/raw/CTG.xls / data/raw/cardiotocography.zip
  3. Kagglehub (propanon/uci-cardiotocography)
"""

import os
import sys
import shutil
import pandas as pd

RAW_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))
PROCESSED_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "processed"))

# The 21 Core Clinical Features
FEATURE_COLUMNS = [
    'LB', 'AC', 'FM', 'UC', 'DL', 'DS', 'DP',
    'ASTV', 'MSTV', 'ALTV', 'MLTV',
    'Width', 'Min', 'Max', 'Nmax', 'Nzeros',
    'Mode', 'Mean', 'Median', 'Variance', 'Tendency'
]

# Primary 3-Class Target Column
TARGET_COLUMN = 'NSP'  # 1: Normal, 2: Suspect, 3: Pathological

def ensure_dirs():
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

def fetch_via_ucimlrepo():
    """
    Fetches the dataset directly using the official `ucimlrepo` library (Dataset ID: 193).
    """
    try:
        from ucimlrepo import fetch_ucirepo
        print("[*] Fetching CTG dataset (ID=193) via `ucimlrepo`...")
        cardiotocography = fetch_ucirepo(id=193)
        
        X = cardiotocography.data.features
        y = cardiotocography.data.targets
        metadata = cardiotocography.metadata
        variables = cardiotocography.variables
        
        print("[+] Successfully fetched from ucimlrepo!")
        print(f"    Features shape: {X.shape}")
        print(f"    Targets shape:  {y.shape}")
        return X, y, metadata, variables
    except ImportError:
        print("[!] `ucimlrepo` package not installed in active environment. Falling back to local data files.")
        return None, None, None, None
    except Exception as e:
        print(f"[!] Error fetching via ucimlrepo: {e}. Falling back to local files.")
        return None, None, None, None

def load_from_local_raw():
    """
    Fallback loader that reads from data/raw/CTG.xls or local CSV.
    """
    ensure_dirs()
    xls_path = os.path.join(RAW_DATA_DIR, "CTG.xls")
    
    if not os.path.exists(xls_path):
        raise FileNotFoundError(f"Local file not found at {xls_path}")

    print(f"[*] Loading raw CTG file from: {xls_path}")
    df_raw = pd.read_excel(xls_path, sheet_name='Raw Data')
    
    # Clean out empty rows or trailing metadata
    df_clean = df_raw.dropna(subset=['NSP'])
    
    X = df_clean[FEATURE_COLUMNS].copy()
    y = df_clean[[TARGET_COLUMN]].copy()
    
    print(f"[+] Successfully loaded from local CTG.xls. Records: {len(X)}")
    return X, y

def get_dataset(prefer_ucimlrepo=True):
    """
    Unified entry point to get features (X) and target (y).
    Returns (X, y, metadata_dict).
    """
    ensure_dirs()
    X, y, metadata, variables = None, None, None, None
    
    if prefer_ucimlrepo:
        X, y, metadata, variables = fetch_via_ucimlrepo()
        
    if X is None or y is None:
        X, y = load_from_local_raw()
        
    # Ensure target NSP is clean integer
    if 'NSP' in y.columns:
        y['NSP'] = y['NSP'].astype(int)
        
    return X, y

if __name__ == "__main__":
    X, y = get_dataset()
    print("\n=== DATASET SUMMARY ===")
    print(f"Features: {X.shape[1]} clinical metrics across {X.shape[0]} samples")
    print(f"Target Distribution (NSP):\n{y['NSP'].value_counts().sort_index()}")
