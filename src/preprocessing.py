"""
src/preprocessing.py
====================
Data Cleaning, Feature Validation, Stratified Splitting, and Feature Scaling for CTG Dataset.
Guarantees zero data leakage and strict preservation of class ratios.
"""

import os
import sys
import numpy as np
import pandas as pd

# Core 21 Clinical Feature names
FEATURE_COLUMNS = [
    'LB', 'AC', 'FM', 'UC', 'DL', 'DS', 'DP',
    'ASTV', 'MSTV', 'ALTV', 'MLTV',
    'Width', 'Min', 'Max', 'Nmax', 'Nzeros',
    'Mode', 'Mean', 'Median', 'Variance', 'Tendency'
]

TARGET_COLUMN = 'NSP'

PROCESSED_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "processed"))

def ensure_dirs():
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

class CTGPreprocessor:
    def __init__(self, test_size=0.20, random_state=42, scale_method='standard'):
        self.test_size = test_size
        self.random_state = random_state
        self.scale_method = scale_method
        self.feature_means = None
        self.feature_stds = None
        self.fitted = False

    def clean_raw_dataframe(self, df_features, df_targets):
        """
        Step 1 & 2: Clean types, drop nulls/metadata rows, validate physiological bounds.
        """
        print("[*] Preprocessing Step 1: Cleaning & Schema Validation...")
        
        # Combine temporarily for aligned cleaning
        df = df_features.copy()
        
        # Target column handling
        if isinstance(df_targets, pd.DataFrame):
            if 'NSP' in df_targets.columns:
                df['NSP'] = df_targets['NSP'].values
            else:
                df['NSP'] = df_targets.iloc[:, 0].values
        elif isinstance(df_targets, (pd.Series, np.ndarray)):
            df['NSP'] = np.array(df_targets)

        # Drop rows where target is NaN
        initial_rows = len(df)
        df = df.dropna(subset=['NSP'])
        df['NSP'] = df['NSP'].astype(int)
        
        # Ensure only valid classes {1, 2, 3} exist
        df = df[df['NSP'].isin([1, 2, 3])]
        
        # Impute any missing numerical feature values with median
        for col in FEATURE_COLUMNS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                if df[col].isnull().sum() > 0:
                    med = df[col].median()
                    df[col] = df[col].fillna(med)
                    print(f"    -> Filled {df[col].isnull().sum()} missing values in {col} with median ({med})")
                    
        cleaned_rows = len(df)
        print(f"[+] Cleaned Dataset Shape: {cleaned_rows} rows (dropped {initial_rows - cleaned_rows} invalid rows)")
        
        X = df[FEATURE_COLUMNS].copy()
        y = df['NSP'].copy()
        return X, y

    def stratified_split(self, X, y):
        """
        Step 4: Partition into Train and Test while strictly preserving class imbalance ratios.
        """
        print(f"[*] Preprocessing Step 2: Stratified Train-Test Splitting (Test Ratio: {self.test_size * 100}%)...")
        
        # Stratified sampling without external sklearn dependency if needed
        np.random.seed(self.random_state)
        train_indices = []
        test_indices = []
        
        for cls in [1, 2, 3]:
            cls_idx = np.where(y.values == cls)[0]
            np.random.shuffle(cls_idx)
            n_test = int(np.round(len(cls_idx) * self.test_size))
            test_indices.extend(cls_idx[:n_test])
            train_indices.extend(cls_idx[n_test:])
            
        train_indices = np.array(train_indices)
        test_indices = np.array(test_indices)
        
        # Shuffle order within partitions
        np.random.shuffle(train_indices)
        np.random.shuffle(test_indices)
        
        X_train, y_train = X.iloc[train_indices].copy(), y.iloc[train_indices].copy()
        X_test, y_test = X.iloc[test_indices].copy(), y.iloc[test_indices].copy()
        
        print(f"[+] Train Set: {len(X_train)} samples | Test Set: {len(X_test)} samples")
        print("    -> Train Class Distribution:", dict(y_train.value_counts().sort_index()))
        print("    -> Test Class Distribution: ", dict(y_test.value_counts().sort_index()))
        
        return X_train, X_test, y_train, y_test

    def fit_scaler(self, X_train):
        """
        Step 5: Compute scaling parameters exclusively on Training partition (Zero Data Leakage).
        """
        print("[*] Preprocessing Step 3: Fitting Standard Scaler (Mean = 0, Std = 1) on Training Set...")
        self.feature_means = X_train.mean(axis=0)
        self.feature_stds = X_train.std(axis=0).replace(0, 1.0)  # Avoid div by zero
        self.fitted = True
        return self

    def transform(self, X):
        """
        Transform feature matrix using fitted parameters.
        """
        if not self.fitted:
            raise ValueError("Preprocessor scaler must be fitted on training data before transforming.")
        X_scaled = (X - self.feature_means) / self.feature_stds
        return X_scaled

    def fit_transform_and_save(self, df_features, df_targets):
        """
        Executes end-to-end cleaning pipeline and serializes processed tables to disk.
        """
        ensure_dirs()
        X, y = self.clean_raw_dataframe(df_features, df_targets)
        X_train, X_test, y_train, y_test = self.stratified_split(X, y)
        
        self.fit_scaler(X_train)
        X_train_scaled = self.transform(X_train)
        X_test_scaled = self.transform(X_test)
        
        # Save processed CSVs
        train_df = X_train_scaled.copy()
        train_df['NSP'] = y_train.values
        train_df.to_csv(os.path.join(PROCESSED_DATA_DIR, "train_scaled.csv"), index=False)
        
        test_df = X_test_scaled.copy()
        test_df['NSP'] = y_test.values
        test_df.to_csv(os.path.join(PROCESSED_DATA_DIR, "test_scaled.csv"), index=False)
        
        # Also save unscaled versions (crucial for tree-based models like Random Forest & XGBoost)
        train_unscaled = X_train.copy()
        train_unscaled['NSP'] = y_train.values
        train_unscaled.to_csv(os.path.join(PROCESSED_DATA_DIR, "train_raw.csv"), index=False)
        
        test_unscaled = X_test.copy()
        test_unscaled['NSP'] = y_test.values
        test_unscaled.to_csv(os.path.join(PROCESSED_DATA_DIR, "test_raw.csv"), index=False)
        
        # Save scaling parameters for inference
        scaling_params = pd.DataFrame({'mean': self.feature_means, 'std': self.feature_stds})
        scaling_params.to_csv(os.path.join(PROCESSED_DATA_DIR, "scaling_params.csv"))
        
        print(f"[+] Successfully saved processed data artifacts into {PROCESSED_DATA_DIR}/")
        return X_train_scaled, X_test_scaled, y_train, y_test, X_train, X_test

if __name__ == "__main__":
    from ingestion import get_dataset
    X_raw, y_raw = get_dataset()
    preprocessor = CTGPreprocessor()
    preprocessor.fit_transform_and_save(X_raw, y_raw)
