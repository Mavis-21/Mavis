import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_PATH = os.path.join(BASE_DIR, "models", "family_b_gradient_boosting.joblib")

# Ensure model exists
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Please run train_benchmark.py first.")

model = joblib.load(MODEL_PATH)

app = FastAPI(title="Fetal Health Triage API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 21 Core Clinical Features in exactly the order expected by the model
FEATURE_COLUMNS = [
    'baseline value', 'accelerations', 'fetal_movement', 'uterine_contractions',
    'light_decelerations', 'severe_decelerations', 'prolongued_decelerations',
    'abnormal_short_term_variability', 'mean_value_of_short_term_variability',
    'percentage_of_time_with_abnormal_long_term_variability', 'mean_value_of_long_term_variability',
    'histogram_width', 'histogram_min', 'histogram_max', 'histogram_number_of_peaks',
    'histogram_number_of_zeroes', 'histogram_mode', 'histogram_mean', 'histogram_median',
    'histogram_variance', 'histogram_tendency'
]

# Clinical Baselines (Medians from Normal class in dataset)
BASELINE_VALUES = {
    'baseline value': 133.0, 'accelerations': 0.002, 'fetal_movement': 0.0,
    'uterine_contractions': 0.004, 'light_decelerations': 0.0, 'severe_decelerations': 0.0,
    'prolongued_decelerations': 0.0, 'abnormal_short_term_variability': 42.0,
    'mean_value_of_short_term_variability': 1.2, 'percentage_of_time_with_abnormal_long_term_variability': 0.0,
    'mean_value_of_long_term_variability': 7.4, 'histogram_width': 67.0, 'histogram_min': 93.0,
    'histogram_max': 160.0, 'histogram_number_of_peaks': 3.0, 'histogram_number_of_zeroes': 0.0,
    'histogram_mode': 136.0, 'histogram_mean': 134.0, 'histogram_median': 137.0,
    'histogram_variance': 10.0, 'histogram_tendency': 0.0
}

class PatientMetrics(BaseModel):
    # Top clinical drivers for triage interface
    ASTV: float = 42.0  
    DP: float = 0.0     
    Mean: float = 134.0 
    MSTV: float = 1.2   
    ALTV: float = 0.0   
    AC: float = 0.002   

@app.post("/predict")
def predict_triage(metrics: PatientMetrics):
    # Combine user inputs with clinical baselines
    input_data = BASELINE_VALUES.copy()
    input_data['abnormal_short_term_variability'] = metrics.ASTV
    input_data['prolongued_decelerations'] = metrics.DP
    input_data['histogram_mean'] = metrics.Mean
    input_data['mean_value_of_short_term_variability'] = metrics.MSTV
    input_data['percentage_of_time_with_abnormal_long_term_variability'] = metrics.ALTV
    input_data['accelerations'] = metrics.AC

    # Convert to dataframe matching training column order
    df_input = pd.DataFrame([input_data])[FEATURE_COLUMNS]

    # Predict
    probabilities = model.predict_proba(df_input)[0]
    prediction = model.predict(df_input)[0]

    class_labels = {1: 'Normal', 2: 'Suspect', 3: 'Pathological'}
    
    pred_class = int(prediction)
    pred_label = class_labels.get(pred_class, "Unknown")
        
    return {
        "status": "success",
        "diagnosis": pred_label,
        "class_code": pred_class,
        "risk_probabilities": {
            "Normal": float(probabilities[0]),
            "Suspect": float(probabilities[1]),
            "Pathological": float(probabilities[2])
        }
    }
