"""
run_pipeline.py
===============
Master End-to-End Execution Script for HC-01: Fetal Distress Detection Hackathon.
Executes the full pipeline:
  1. Ingestion (ucimlrepo / local raw CTG)
  2. Cleaning & Stratified Zero-Leakage Preprocessing
  3. Model Training (Family A: Regularized Logistic Regression vs Family B: Balanced Random Forest & XGBoost)
  4. Multi-Class Evaluation (Macro F1, 3x3 Confusion Matrix, Feature Importance / Explainability)
"""

import os
import sys
import numpy as np
import pandas as pd

# Add src to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

from ingestion import get_dataset
from preprocessing import CTGPreprocessor
from models import ModelTrainer
from evaluation import ModelEvaluator

def main():
    print("=" * 70)
    print("   HC-01: FETAL DISTRESS DETECTION FROM CTG SIGNALS PIPELINE")
    print("   Target: Normal (1) | Suspect (2) | Pathological (3)")
    print("   Primary Metric: Macro F1 Score (Raw Accuracy Banned)")
    print("=" * 70)

    # ── STEP 1: INGESTION ─────────────────────────────────────────────
    print("\n>>> [STEP 1/4] INGESTING DATASET...")
    X_raw, y_raw = get_dataset()
    print(f"[✓] Ingested {len(X_raw)} recordings across {X_raw.shape[1]} physiological features.")

    # ── STEP 2: PREPROCESSING & STRATIFIED SPLIT ───────────────────────
    print("\n>>> [STEP 2/4] CLEANING, STRATIFIED SPLITTING & SCALING...")
    preprocessor = CTGPreprocessor(test_size=0.20, random_state=42)
    X_train_scaled, X_test_scaled, y_train, y_test, X_train_raw, X_test_raw = preprocessor.fit_transform_and_save(X_raw, y_raw)
    print(f"[✓] Partitioned data: Train={len(X_train_scaled)}, Test={len(X_test_scaled)}")

    # ── STEP 3: MODEL TRAINING (TWO DISTINCT FAMILIES) ─────────────────
    print("\n>>> [STEP 3/4] TRAINING MODEL FAMILIES (A: LOGISTIC REGRESSION vs B: RANDOM FOREST / XGBOOST)...")
    trainer = ModelTrainer(random_state=42)
    
    # Family A: Regularized Logistic Regression (requires scaled features)
    model_lr = trainer.train_family_a_logistic_regression(X_train_scaled, y_train)
    
    # Family B: Balanced Random Forest & XGBoost (unscaled tree-native features)
    model_rf = trainer.train_family_b_random_forest(X_train_raw, y_train)
    model_xgb = trainer.train_family_b_xgboost(X_train_raw, y_train)

    # ── STEP 4: EVALUATION & EXPLAINABILITY ───────────────────────────
    print("\n>>> [STEP 4/4] EVALUATING ON TEST SET & GENERATING ARTIFACTS...")
    evaluator = ModelEvaluator()

    # 1. Evaluate Family A (Logistic Regression)
    preds_lr = model_lr.predict(X_test_scaled)
    evaluator.evaluate_predictions(y_test, preds_lr, model_name="Family A: Logistic Regression")
    evaluator.plot_confusion_matrix(y_test, preds_lr, model_name="Family A - Logistic Regression")
    evaluator.plot_feature_importance(model_lr, model_name="Family A - Logistic Regression")

    # 2. Evaluate Family B (Random Forest)
    preds_rf = model_rf.predict(X_test_raw)
    evaluator.evaluate_predictions(y_test, preds_rf, model_name="Family B: Balanced Random Forest")
    evaluator.plot_confusion_matrix(y_test, preds_rf, model_name="Family B - Balanced Random Forest")
    evaluator.plot_feature_importance(model_rf, model_name="Family B - Balanced Random Forest")

    # 3. Evaluate Family B (XGBoost if available)
    if 'Family_B_XGBoost' in trainer.models:
        preds_xgb = model_xgb.predict(X_test_raw) + 1  # Re-offset from 0-indexed to 1,2,3
        evaluator.evaluate_predictions(y_test, preds_xgb, model_name="Family B: XGBoost Classifier")
        evaluator.plot_confusion_matrix(y_test, preds_xgb, model_name="Family B - XGBoost Classifier")
        evaluator.plot_feature_importance(model_xgb, model_name="Family B - XGBoost Classifier")

    # Benchmark summary table
    df_benchmark = evaluator.generate_benchmark_table()

    print("\n" + "=" * 70)
    print("   PIPELINE EXECUTION COMPLETE! ALL ARTIFACTS READY FOR REVIEW.")
    print("   Visualizations saved in: visualizations/")
    print("   Saved Models in:        models/")
    print("=" * 70)

if __name__ == "__main__":
    main()
