"""
src/models.py
=============
Model Definitions and Training Pipelines for HC-01: Fetal Distress Detection.
Compares TWO fundamentally distinct model families with class-imbalance weighting:
  - Family A: Multinomial Regularized Logistic Regression (Linear baseline)
  - Family B: XGBoost & Balanced Random Forest (Non-linear Gradient Boosted Ensembles)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, classification_report

try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))

def ensure_dirs():
    os.makedirs(MODELS_DIR, exist_ok=True)

class ModelTrainer:
    def __init__(self, random_state=42):
        self.random_state = random_state
        self.models = {}
        ensure_dirs()

    # ── FAMILY A: REGULARIZED LINEAR / MULTINOMIAL LOGISTIC REGRESSION ─
    def train_family_a_logistic_regression(self, X_train_scaled, y_train, C=1.0, penalty='l2'):
        """
        Trains a regularized multinomial logistic regression model with balanced class weights.
        """
        print("\n[*] Training Family A: Multinomial Regularized Logistic Regression...")
        clf = LogisticRegression(
            C=C,
            penalty=penalty,
            multi_class='multinomial',
            class_weight='balanced',  # Automatically offsets 77.8% vs 8.3% imbalance
            solver='lbfgs' if penalty == 'l2' else 'saga',
            max_iter=1000,
            random_state=self.random_state
        )
        clf.fit(X_train_scaled, y_train)
        self.models['Family_A_LogisticRegression'] = clf
        
        # Save artifact
        joblib.dump(clf, os.path.join(MODELS_DIR, "family_a_logistic_regression.joblib"))
        print("[+] Family A Model trained and serialized to models/family_a_logistic_regression.joblib")
        return clf

    # ── FAMILY B: NON-LINEAR GRADIENT BOOSTED TREES & ENSEMBLES ────────
    def train_family_b_random_forest(self, X_train, y_train, n_estimators=200, max_depth=10):
        """
        Trains a Balanced Random Forest Classifier with ensemble bagging and class weighting.
        """
        print("\n[*] Training Family B (1): Balanced Random Forest Classifier...")
        rf = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            class_weight='balanced_subsample',
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=self.random_state,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)
        self.models['Family_B_RandomForest'] = rf
        
        # Save artifact
        joblib.dump(rf, os.path.join(MODELS_DIR, "family_b_random_forest.joblib"))
        print("[+] Family B (RF) Model trained and serialized to models/family_b_random_forest.joblib")
        return rf

    def train_family_b_xgboost(self, X_train, y_train, n_estimators=200, max_depth=5, learning_rate=0.05):
        """
        Trains an XGBoost Multi-Class Classifier with sample weighting.
        """
        if not XGB_AVAILABLE:
            print("[!] XGBoost not available in environment. Using Balanced Random Forest as primary Family B.")
            return self.train_family_b_random_forest(X_train, y_train)
            
        print("\n[*] Training Family B (2): XGBoost Multi-Class Gradient Booster...")
        
        # XGBoost expects 0-indexed classes [0, 1, 2] instead of [1, 2, 3]
        y_train_xgb = y_train - 1
        
        # Compute class weights manually for sample weighting
        classes, counts = np.unique(y_train_xgb, return_counts=True)
        total_samples = len(y_train_xgb)
        class_weights = {cls: total_samples / (len(classes) * cnt) for cls, cnt in zip(classes, counts)}
        sample_weights = np.array([class_weights[y] for y in y_train_xgb])
        
        xgb = XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            subsample=0.85,
            colsample_bytree=0.85,
            objective='multi:softprob',
            num_class=3,
            eval_metric='mlogloss',
            random_state=self.random_state,
            n_jobs=-1
        )
        xgb.fit(X_train, y_train_xgb, sample_weight=sample_weights)
        self.models['Family_B_XGBoost'] = xgb
        
        # Save artifact
        joblib.dump(xgb, os.path.join(MODELS_DIR, "family_b_xgboost.joblib"))
        print("[+] Family B (XGBoost) Model trained and serialized to models/family_b_xgboost.joblib")
        return xgb

    def train_all(self, X_train_scaled, X_train_raw, y_train):
        """
        Trains all models across Family A and Family B in sequence.
        """
        print("=== COMMENCING MODEL BENCHMARK TRAINING ===")
        m_a = self.train_family_a_logistic_regression(X_train_scaled, y_train)
        m_b1 = self.train_family_b_random_forest(X_train_raw, y_train)
        m_b2 = self.train_family_b_xgboost(X_train_raw, y_train)
        return {
            'LogisticRegression': m_a,
            'RandomForest': m_b1,
            'XGBoost': m_b2
        }
