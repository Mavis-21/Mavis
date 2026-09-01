"""
src/train_benchmark.py
======================
Phase 1 Execution Script:
1. Loads cleaned CTG dataset (data/processed/fetal_health_clean.csv).
2. Performs Stratified 80/20 partitioning and 5-Fold Stratified Cross-Validation.
3. Trains and benchmarks Family A (Regularized Logistic Regression) vs Family B (Balanced Random Forest & Gradient Boosted Trees).
4. Evaluates strictly on Macro F1, Pathological Recall, and generates 3x3 Confusion Matrices.
5. Saves all figures to visualizations/ and models to models/.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    f1_score, precision_score, recall_score,
    confusion_matrix, classification_report
)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "fetal_health_clean.csv")
VIS_DIR = os.path.join(BASE_DIR, "visualizations")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(VIS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

CLASS_LABELS = ['Normal (1)', 'Suspect (2)', 'Pathological (3)']

def load_data():
    print("=" * 70)
    print(">>> [STEP 1/4] LOADING CLEANED CTG DATASET...")
    print("=" * 70)
    
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Cleaned dataset not found at {DATA_PATH}")
        
    df = pd.read_csv(DATA_PATH)
    print(f"[+] Loaded dataset successfully: {df.shape[0]} samples × {df.shape[1]} columns")
    
    # Identify target column
    target_col = 'fetal_health' if 'fetal_health' in df.columns else 'NSP'
    X = df.drop(columns=[target_col]).copy()
    y = df[target_col].astype(int).values
    
    print("\nTarget Class Distribution:")
    unique, counts = np.unique(y, return_counts=True)
    for u, c in zip(unique, counts):
        pct = (c / len(y)) * 100
        name = CLASS_LABELS[u-1] if u <= len(CLASS_LABELS) else f"Class {u}"
        print(f"  • {name}: {c} recordings ({pct:.1f}%)")
        
    return X, y, X.columns.tolist()

def perform_stratified_split(X, y, test_size=0.20, random_state=42):
    print("\n" + "=" * 70)
    print(">>> [STEP 2/4] EXECUTING STRATIFIED TRAIN/TEST SPLIT (80% / 20%)...")
    print("=" * 70)
    
    np.random.seed(random_state)
    train_idx, test_idx = [], []
    
    for cls in [1, 2, 3]:
        cls_indices = np.where(y == cls)[0]
        np.random.shuffle(cls_indices)
        n_test = int(np.round(len(cls_indices) * test_size))
        test_idx.extend(cls_indices[:n_test])
        train_idx.extend(cls_indices[n_test:])
        
    train_idx = np.array(train_idx)
    test_idx = np.array(test_idx)
    np.random.shuffle(train_idx)
    np.random.shuffle(test_idx)
    
    X_train, y_train = X.iloc[train_idx].copy(), y[train_idx]
    X_test, y_test = X.iloc[test_idx].copy(), y[test_idx]
    
    print(f"[+] Training Set: {len(X_train)} samples")
    print(f"[+] Testing Set:  {len(X_test)} samples (Isolated for final evaluation)")
    
    # Standardize for Linear Models (Zero data leakage: fitted strictly on train)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save scaler
    joblib.dump(scaler, os.path.join(MODELS_DIR, "standard_scaler.joblib"))
    
    return X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled, scaler

def train_and_cross_validate_models(X_train, y_train, X_train_scaled):
    print("\n" + "=" * 70)
    print(">>> [STEP 3/4] 5-FOLD STRATIFIED CROSS-VALIDATION & MODEL TRAINING...")
    print("=" * 70)
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    models = {}
    cv_results = {}
    
    # ── 1. Family A: Regularized Multinomial Logistic Regression ─────────
    print("\n[*] Training Family A: Regularized Multinomial Logistic Regression (L2, Balanced Weights)...")
    clf_lr = LogisticRegression(
        C=1.0,
        penalty='l2',
        class_weight='balanced',
        solver='lbfgs',
        max_iter=1000,
        random_state=42
    )
    
    # 5-fold CV on scaled data
    scores_lr = cross_validate(clf_lr, X_train_scaled, y_train, cv=cv, scoring='f1_macro', n_jobs=-1)
    clf_lr.fit(X_train_scaled, y_train)
    models['Family A: Logistic Regression'] = (clf_lr, 'scaled')
    cv_results['Family A: Logistic Regression'] = {
        'CV Macro F1 (Mean)': np.mean(scores_lr['test_score']),
        'CV Macro F1 (Std)': np.std(scores_lr['test_score'])
    }
    print(f"    -> 5-Fold CV Macro F1: {np.mean(scores_lr['test_score']):.4f} (±{np.std(scores_lr['test_score']):.4f})")
    joblib.dump(clf_lr, os.path.join(MODELS_DIR, "family_a_logistic_regression.joblib"))

    # ── 2. Family B (1): Balanced Random Forest Classifier ───────────────
    print("\n[*] Training Family B (1): Balanced Random Forest Classifier (200 Trees)...")
    clf_rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight='balanced_subsample',
        random_state=42,
        n_jobs=-1
    )
    scores_rf = cross_validate(clf_rf, X_train, y_train, cv=cv, scoring='f1_macro', n_jobs=-1)
    clf_rf.fit(X_train, y_train)
    models['Family B: Balanced Random Forest'] = (clf_rf, 'raw')
    cv_results['Family B: Balanced Random Forest'] = {
        'CV Macro F1 (Mean)': np.mean(scores_rf['test_score']),
        'CV Macro F1 (Std)': np.std(scores_rf['test_score'])
    }
    print(f"    -> 5-Fold CV Macro F1: {np.mean(scores_rf['test_score']):.4f} (±{np.std(scores_rf['test_score']):.4f})")
    joblib.dump(clf_rf, os.path.join(MODELS_DIR, "family_b_random_forest.joblib"))

    # ── 3. Family B (2): Gradient Boosted Decision Trees (HistGradientBoosting) ──
    print("\n[*] Training Family B (2): Gradient Boosted Decision Trees (HistGradientBoosting)...")
    
    # Calculate sample weights to balance classes, then heavily boost Class 3
    classes, counts = np.unique(y_train, return_counts=True)
    total_samples = len(y_train)
    balanced_weights = {cls: total_samples / (len(classes) * cnt) for cls, cnt in zip(classes, counts)}
    
    # Ultra-penalize false negatives for Class 3 (which gets encoded as 2 internally)
    # HistGradientBoostingClassifier expects encoded keys [0, 1, 2] instead of [1, 2, 3]
    custom_weights = {
        0: balanced_weights[1] * 0.7,
        1: balanced_weights[2] * 1.0,
        2: balanced_weights[3] * 4.0 
    }

    clf_gb = HistGradientBoostingClassifier(
        max_iter=200,
        max_depth=6,
        learning_rate=0.05,
        class_weight=custom_weights,
        random_state=42
    )
    scores_gb = cross_validate(clf_gb, X_train, y_train, cv=cv, scoring='f1_macro', n_jobs=-1)
    clf_gb.fit(X_train, y_train)
    models['Family B: Gradient Boosted Trees (High Recall)'] = (clf_gb, 'raw')
    cv_results['Family B: Gradient Boosted Trees (High Recall)'] = {
        'CV Macro F1 (Mean)': np.mean(scores_gb['test_score']),
        'CV Macro F1 (Std)': np.std(scores_gb['test_score'])
    }
    print(f"    -> 5-Fold CV Macro F1: {np.mean(scores_gb['test_score']):.4f} (±{np.std(scores_gb['test_score']):.4f})")
    joblib.dump(clf_gb, os.path.join(MODELS_DIR, "family_b_gradient_boosting.joblib"))

    return models, cv_results

def evaluate_and_generate_artifacts(models, cv_results, X_test, y_test, X_test_scaled, feature_names):
    print("\n" + "=" * 70)
    print(">>> [STEP 4/4] TEST SET EVALUATION, 3x3 CONFUSION MATRICES & BENCHMARK TABLE...")
    print("=" * 70)
    
    benchmark_data = []

    for name, (model, data_type) in models.items():
        if data_type == 'scaled':
            preds = model.predict(X_test_scaled)
        else:
            preds = model.predict(X_test)

        # Multi-class metrics
        macro_f1 = f1_score(y_test, preds, average='macro')
        weighted_f1 = f1_score(y_test, preds, average='weighted')
        class_recalls = recall_score(y_test, preds, average=None)
        class_f1s = f1_score(y_test, preds, average=None)
        
        cv_macro = cv_results.get(name, {}).get('CV Macro F1 (Mean)', 'N/A')
        cv_macro_str = f"{cv_macro:.4f}" if isinstance(cv_macro, float) else "N/A"
        
        row = {
            'Model Family': name,
            'CV Macro F1': cv_macro_str,
            'Test Macro F1': f"{macro_f1:.4f}",
            'Pathological Recall (Class 3)': f"{class_recalls[2]:.4f}",
            'Normal F1 (Class 1)': f"{class_f1s[0]:.4f}",
            'Suspect F1 (Class 2)': f"{class_f1s[1]:.4f}",
            'Pathological F1 (Class 3)': f"{class_f1s[2]:.4f}",
            'Test Weighted F1': f"{weighted_f1:.4f}"
        }
        benchmark_data.append(row)
        
        # ── Generate & Save 3x3 Normalized Confusion Matrix Heatmap ────────
        cm = confusion_matrix(y_test, preds, labels=[1, 2, 3])
        cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        
        plt.figure(figsize=(7.5, 6), dpi=300)
        ax = sns.heatmap(
            cm_norm,
            annot=True,
            fmt='.1%',
            cmap='Blues',
            xticklabels=CLASS_LABELS,
            yticklabels=CLASS_LABELS,
            cbar=True,
            linewidths=1.5,
            linecolor='#e2e8f0',
            annot_kws={'size': 13, 'weight': 'bold'}
        )
        
        # Add sample count sub-labels
        for i in range(3):
            for j in range(3):
                count = cm[i, j]
                ax.text(j + 0.5, i + 0.75, f"(n={count})", ha='center', va='center', color='#475569', fontsize=9.5)

        plt.title(f"3-Class Normalized Confusion Matrix\n{name}", fontsize=13, fontweight='bold', pad=14)
        plt.ylabel("True Clinical Label (Ground Truth)", fontsize=11, fontweight='600')
        plt.xlabel("Predicted Diagnostic Category", fontsize=11, fontweight='600')
        plt.tight_layout()
        
        cm_filename = f"confusion_matrix_{name.lower().replace(' ', '_').replace(':', '').replace('(', '').replace(')', '')}.png"
        cm_path = os.path.join(VIS_DIR, cm_filename)
        plt.savefig(cm_path)
        plt.close()
        print(f"[+] Saved Confusion Matrix: visualizations/{cm_filename}")

        # ── Feature Importance Plot ────────────────────────────────────────
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            indices = np.argsort(importances)[::-1][:12] # Top 12 features
            top_feats = [feature_names[i] for i in indices]
            top_scores = importances[indices]
            
            plt.figure(figsize=(9, 5), dpi=300)
            sns.barplot(x=top_scores, y=top_feats, palette="viridis")
            plt.title(f"Top Clinical Feature Importances\n{name}", fontsize=12, fontweight='bold')
            plt.xlabel("Gini Feature Importance Score", fontsize=10, fontweight='600')
            plt.ylabel("CTG Physiological Marker", fontsize=10, fontweight='600')
            plt.grid(axis='x', linestyle='--', alpha=0.5)
            plt.tight_layout()
            
            fi_filename = f"feat_imp_{name.lower().replace(' ', '_').replace(':', '').replace('(', '').replace(')', '')}.png"
            fi_path = os.path.join(VIS_DIR, fi_filename)
            plt.savefig(fi_path)
            plt.close()
            print(f"[+] Saved Feature Importance: visualizations/{fi_filename}")

    # Export benchmark table
    df_benchmark = pd.DataFrame(benchmark_data)
    csv_bench_path = os.path.join(VIS_DIR, "phase1_model_benchmark_results.csv")
    df_benchmark.to_csv(csv_bench_path, index=False)
    
    print("\n" + "=" * 70)
    print("           PHASE 1 MODEL BENCHMARK RESULTS (MACRO F1 OPTIMIZED)")
    print("=" * 70)
    print(df_benchmark.to_string(index=False))
    print("=" * 70)
    
    return df_benchmark

if __name__ == "__main__":
    X, y, feature_names = load_data()
    X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled, scaler = perform_stratified_split(X, y)
    models, cv_results = train_and_cross_validate_models(X_train, y_train, X_train_scaled)
    df_results = evaluate_and_generate_artifacts(models, cv_results, X_test, y_test, X_test_scaled, feature_names)
