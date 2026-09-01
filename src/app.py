import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_PATH = os.path.join(BASE_DIR, "models", "family_b_gradient_boosting.joblib")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

model = joblib.load(MODEL_PATH)

app = FastAPI(title="Fetal Health Triage API v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # Top 6 
    ASTV: float = 42.0
    DP: float = 0.0
    Mean: float = 134.0
    MSTV: float = 1.2
    ALTV: float = 0.0
    AC: float = 0.002
    
    # Advanced 15
    baseline_value: float = 133.0
    fetal_movement: float = 0.0
    uterine_contractions: float = 0.004
    light_decelerations: float = 0.0
    severe_decelerations: float = 0.0
    MLTV: float = 7.4
    Width: float = 67.0
    Min: float = 93.0
    Max: float = 160.0
    Nmax: float = 3.0
    Nzeros: float = 0.0
    Mode: float = 136.0
    Median: float = 137.0
    Variance: float = 10.0
    Tendency: float = 0.0

def generate_clinical_reasoning(pred_class, metrics: PatientMetrics):
    reasoning = []
    
    if metrics.ASTV > 60:
        reasoning.append(f"Elevated Abnormal Short Term Variability ({metrics.ASTV}%) indicates potential loss of autonomic reactivity.")
    if metrics.DP > 0:
        reasoning.append(f"Presence of Prolongued Decelerations ({metrics.DP}/sec) is a strong indicator of prolonged fetal hypoxia.")
    if metrics.ALTV > 20:
        reasoning.append(f"High Abnormal Long Term Variability ({metrics.ALTV}%) suggests persistent flat baseline rhythm.")
    if metrics.AC == 0:
        reasoning.append(f"Absence of Accelerations points to reduced fetal reactivity.")
        
    if pred_class == 1:
        if not reasoning:
            return ["All vital CTG morphological patterns are within reassuring baselines.", "Variability and heart rate are nominal."]
        else:
            devs = ", ".join([r.split()[1] for r in reasoning[:2]])
            return [f"Despite some minor deviations ({devs}), the overall combination of features strongly predicts a normal physiological state."]
    elif pred_class == 2:
        base = ["Non-reassuring CTG pattern detected."]
        if reasoning:
            base.extend(reasoning)
        else:
            base.append("Slight deviations in overall variability metrics pushed the model into suspect classification.")
        return base
    else:
        base = ["Critical Pathological indicators present."]
        if reasoning:
            base.extend(reasoning)
        else:
            base.append("The specific combination of variability, decelerations, and baseline features aligns with severe distress patterns.")
        return base

def generate_suggested_action(pred_class):
    if pred_class == 1:
        return "Routine intrapartum monitoring. No immediate intervention required."
    elif pred_class == 2:
        return "Requires closer observation. Consider scalp stimulation or re-evaluating in 30 minutes."
    else:
        return "IMMEDIATE CLINICAL ESCALATION. Prepare for possible intervention (e.g., emergent C-section or assisted delivery) pending physician review."

@app.post("/predict")
def predict_triage(metrics: PatientMetrics):
    input_data = {
        'baseline value': metrics.baseline_value,
        'accelerations': metrics.AC,
        'fetal_movement': metrics.fetal_movement,
        'uterine_contractions': metrics.uterine_contractions,
        'light_decelerations': metrics.light_decelerations,
        'severe_decelerations': metrics.severe_decelerations,
        'prolongued_decelerations': metrics.DP,
        'abnormal_short_term_variability': metrics.ASTV,
        'mean_value_of_short_term_variability': metrics.MSTV,
        'percentage_of_time_with_abnormal_long_term_variability': metrics.ALTV,
        'mean_value_of_long_term_variability': metrics.MLTV,
        'histogram_width': metrics.Width,
        'histogram_min': metrics.Min,
        'histogram_max': metrics.Max,
        'histogram_number_of_peaks': metrics.Nmax,
        'histogram_number_of_zeroes': metrics.Nzeros,
        'histogram_mode': metrics.Mode,
        'histogram_mean': metrics.Mean,
        'histogram_median': metrics.Median,
        'histogram_variance': metrics.Variance,
        'histogram_tendency': metrics.Tendency
    }

    df_input = pd.DataFrame([input_data])[FEATURE_COLUMNS]

    probabilities = model.predict_proba(df_input)[0]
    prediction = model.predict(df_input)[0]

    class_labels = {1: 'Normal', 2: 'Suspect', 3: 'Pathological'}
    pred_class = int(prediction)
    pred_label = class_labels.get(pred_class, "Unknown")
    
    reasoning = generate_clinical_reasoning(pred_class, metrics)
    action = generate_suggested_action(pred_class)
        
    return {
        "status": "success",
        "diagnosis": pred_label,
        "class_code": pred_class,
        "clinical_reasoning": reasoning,
        "suggested_action": action,
        "risk_probabilities": {
            "Normal": float(probabilities[0]),
            "Suspect": float(probabilities[1]),
            "Pathological": float(probabilities[2])
        }
    }
