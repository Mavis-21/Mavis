"""
src/evaluation.py
=================
Multi-Class Metrics Evaluation, Confusion Matrix Generation, and SHAP Explainability.
Strictly benchmarks Family A vs Family B on Macro F1 and Clinical Pathological Recall.
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    f1_score, precision_score, recall_score,
    confusion_matrix, classification_report, roc_auc_score
)

VIS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "visualizations"))

CLASS_LABELS = ['Normal (1)', 'Suspect (2)', 'Pathological (3)']
FEATURE_NAMES = [
    'LB', 'AC', 'FM', 'UC', 'DL', 'DS', 'DP',
    'ASTV', 'MSTV', 'ALTV', 'MLTV',
    'Width', 'Min', 'Max', 'Nmax', 'Nzeros',
    'Mode', 'Mean', 'Median', 'Variance', 'Tendency'
]

def ensure_dirs():
    os.makedirs(VIS_DIR, exist_ok=True)

class ModelEvaluator:
    def __init__(self):
        ensure_dirs()
        self.results_summary = []

    def evaluate_predictions(self, y_true, y_pred, y_prob=None, model_name="Model"):
        """
        Calculates all clinical and multi-class metrics with emphasis on Macro F1.
        """
        macro_f1 = f1_score(y_true, y_pred, average='macro')
        weighted_f1 = f1_score(y_true, y_pred, average='weighted')
        
        # Per-class metrics
        class_recalls = recall_score(y_true, y_pred, average=None)
        class_precisions = precision_score(y_true, y_pred, average=None)
        class_f1s = f1_score(y_true, y_pred, average=None)
        
        pathological_recall = class_recalls[2] if len(class_recalls) > 2 else 0.0
        
        metrics = {
            'Model Name': model_name,
            'Macro F1': round(macro_f1, 4),
            'Weighted F1': round(weighted_f1, 4),
            'Pathological Recall (Class 3)': round(pathological_recall, 4),
            'Normal F1 (Class 1)': round(class_f1s[0], 4),
            'Suspect F1 (Class 2)': round(class_f1s[1], 4),
            'Pathological F1 (Class 3)': round(class_f1s[2], 4),
        }
        
        self.results_summary.append(metrics)
        return metrics

    def plot_confusion_matrix(self, y_true, y_pred, model_name="Model", filename=None):
        """
        Generates and saves a high-resolution, normalized 3x3 confusion matrix.
        """
        cm = confusion_matrix(y_true, y_pred, labels=[1, 2, 3])
        cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        
        plt.figure(figsize=(8, 6), dpi=300)
        sns.heatmap(
            cm_norm,
            annot=True,
            fmt='.2%',
            cmap='Blues',
            xticklabels=CLASS_LABELS,
            yticklabels=CLASS_LABELS,
            cbar=True,
            linewidths=1,
            linecolor='white'
        )
        
        # Overlay raw count annotations
        for i in range(3):
            for j in range(3):
                count = cm[i, j]
                plt.text(j + 0.5, i + 0.7, f"(n={count})", ha='center', va='center', color='gray', fontsize=9)
                
        plt.title(f"3-Class Normalized Confusion Matrix\n{model_name}", fontsize=14, fontweight='bold', pad=15)
        plt.ylabel("True Clinical Label", fontsize=12, fontweight='600')
        plt.xlabel("Predicted Diagnostic Label", fontsize=12, fontweight='600')
        plt.tight_layout()
        
        if filename is None:
            filename = f"confusion_matrix_{model_name.lower().replace(' ', '_')}.png"
        out_path = os.path.join(VIS_DIR, filename)
        plt.savefig(out_path)
        plt.close()
        print(f"[+] Saved Confusion Matrix plot: {out_path}")
        return out_path

    def plot_feature_importance(self, model, feature_names=FEATURE_NAMES, model_name="Model", filename=None):
        """
        Generates and saves feature importance bar chart for tree-based or linear models.
        """
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            metric_title = "Gini Feature Importance"
        elif hasattr(model, 'coef_'):
            # For multi-class logistic regression, take mean absolute coefficient across classes
            importances = np.mean(np.abs(model.coef_), axis=0)
            metric_title = "Mean Absolute Coefficient Magnitude"
        else:
            print(f"[!] Model {model_name} does not expose feature importances.")
            return None

        indices = np.argsort(importances)[::-1]
        sorted_features = [feature_names[i] for i in indices]
        sorted_scores = importances[indices]

        plt.figure(figsize=(10, 6), dpi=300)
        palette = sns.color_palette("viridis", len(sorted_features))
        sns.barplot(x=sorted_scores, y=sorted_features, palette=palette)
        plt.title(f"Clinical Feature Importances\n{model_name} ({metric_title})", fontsize=13, fontweight='bold', pad=12)
        plt.xlabel(metric_title, fontsize=11, fontweight='600')
        plt.ylabel("CTG Physiological Marker", fontsize=11, fontweight='600')
        plt.grid(axis='x', linestyle='--', alpha=0.5)
        plt.tight_layout()
        
        if filename is None:
            filename = f"feature_importance_{model_name.lower().replace(' ', '_')}.png"
        out_path = os.path.join(VIS_DIR, filename)
        plt.savefig(out_path)
        plt.close()
        print(f"[+] Saved Feature Importance plot: {out_path}")
        return out_path

    def generate_benchmark_table(self):
        """
        Exports comparison table as DataFrame and Markdown.
        """
        df_bench = pd.DataFrame(self.results_summary)
        csv_path = os.path.join(VIS_DIR, "model_benchmark_results.csv")
        df_bench.to_csv(csv_path, index=False)
        print("\n=== MODEL COMPARISON BENCHMARK (MACRO F1 OPTIMIZED) ===")
        print(df_bench.to_markdown(index=False) if hasattr(df_bench, 'to_markdown') else df_bench)
        return df_bench
