import os
import joblib
import numpy as np
import pandas as pd
import asyncio
import json
import random
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
    ASTV: float = 42.0
    DP: float = 0.0
    Mean: float = 134.0
    MSTV: float = 1.2
    ALTV: float = 0.0
    AC: float = 0.002
    
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

def generate_clinical_reasoning(pred_class, astv, dp, altv, ac):
    reasoning = []
    if astv > 60: reasoning.append(f"Elevated ASTV ({astv:.1f}%).")
    if dp > 0: reasoning.append(f"Prolongued Decel ({dp:.3f}/sec).")
    if altv > 20: reasoning.append(f"High ALTV ({altv:.1f}%).")
    if ac == 0: reasoning.append(f"Absence of Accelerations.")
        
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
    if pred_class == 1: return "Routine monitoring."
    elif pred_class == 2: return "Re-evaluate in 30 mins."
    else: return "IMMEDIATE ESCALATION (C-Section)."

@app.post("/predict")
def predict_triage(metrics: PatientMetrics):
    input_data = BASELINE_VALUES.copy()
    input_data.update({
        'baseline value': metrics.baseline_value, 'accelerations': metrics.AC,
        'fetal_movement': metrics.fetal_movement, 'uterine_contractions': metrics.uterine_contractions,
        'light_decelerations': metrics.light_decelerations, 'severe_decelerations': metrics.severe_decelerations,
        'prolongued_decelerations': metrics.DP, 'abnormal_short_term_variability': metrics.ASTV,
        'mean_value_of_short_term_variability': metrics.MSTV, 'percentage_of_time_with_abnormal_long_term_variability': metrics.ALTV,
        'mean_value_of_long_term_variability': metrics.MLTV, 'histogram_width': metrics.Width,
        'histogram_min': metrics.Min, 'histogram_max': metrics.Max, 'histogram_number_of_peaks': metrics.Nmax,
        'histogram_number_of_zeroes': metrics.Nzeros, 'histogram_mode': metrics.Mode,
        'histogram_mean': metrics.Mean, 'histogram_median': metrics.Median,
        'histogram_variance': metrics.Variance, 'histogram_tendency': metrics.Tendency
    })

    df_input = pd.DataFrame([input_data])[FEATURE_COLUMNS]
    probabilities = model.predict_proba(df_input)[0]
    prediction = model.predict(df_input)[0]

    class_labels = {1: 'Normal', 2: 'Suspect', 3: 'Pathological'}
    pred_class = int(prediction)
    
    return {
        "status": "success",
        "diagnosis": class_labels.get(pred_class, "Unknown"),
        "class_code": pred_class,
        "clinical_reasoning": generate_clinical_reasoning(pred_class, metrics.ASTV, metrics.DP, metrics.ALTV, metrics.AC),
        "suggested_action": generate_suggested_action(pred_class),
        "risk_probabilities": {"Normal": float(probabilities[0]), "Suspect": float(probabilities[1]), "Pathological": float(probabilities[2])}
    }


# ==========================================
# WEBSOCKET REAL-TIME CTG SIMULATOR
# ==========================================

active_connections = set()

# Roster
ROSTER = {
    'ward_1': {'name': 'Dr. Mavis', 'phone': '+15550001111', 'shift': '08:00-20:00'}
}
alert_state = {}

class PatientSim:
    def __init__(self, bed_id, state="stable"):
        self.bed_id = bed_id
        self.state = state
        self.tick = 0
        
        self.astv = 40.0
        self.dp = 0.0
        self.altv = 0.0
        self.ac = 0.005
        
    def advance(self):
        self.tick += 1
        
        # Base oscillations for visuals
        fhr = 135 + np.sin(self.tick / 5.0) * 5 + random.uniform(-2, 2)
        uc = max(0, np.sin(self.tick / 20.0) * 100) if self.tick % 100 < 20 else 0
        
        # Drift states
        if self.state == "stable":
            self.astv = 40.0 + random.uniform(-2, 2)
        elif self.state == "drifting":
            if self.astv < 70: self.astv += 0.1
            if self.ac > 0: self.ac -= 0.0001
            fhr -= 0.05 # slow drop
        elif self.state == "acute":
            if self.astv < 85: self.astv += 0.5
            if self.dp < 0.015: self.dp += 0.0005
            if self.altv < 60: self.altv += 0.2
            fhr -= 0.2 # fast drop
            
        return {
            'fhr_raw': round(fhr, 1),
            'uc_raw': round(uc, 1)
        }

async def ctg_simulator_loop():
    patients = [
        PatientSim('bed_1', 'stable'),
        PatientSim('bed_2', 'drifting'),
        PatientSim('bed_3', 'acute')
    ]
    
    while True:
        if active_connections:
            for p in patients:
                sim_data = p.advance()
                
                # Predict
                input_data = BASELINE_VALUES.copy()
                input_data['abnormal_short_term_variability'] = p.astv
                input_data['prolongued_decelerations'] = p.dp
                input_data['percentage_of_time_with_abnormal_long_term_variability'] = p.altv
                input_data['accelerations'] = p.ac
                
                df_input = pd.DataFrame([input_data])[FEATURE_COLUMNS]
                pred_class = int(model.predict(df_input)[0])
                
                reasoning = generate_clinical_reasoning(pred_class, p.astv, p.dp, p.altv, p.ac)
                
                # Mock Alert Escalation
                if pred_class == 3 and alert_state.get(p.bed_id) != "alerted":
                    doc = ROSTER['ward_1']
                    print(f"\n[ALERT SYSTEM] PATHOLOGICAL EVENT ON {p.bed_id}!")
                    print(f"[TWILIO API] Sending SMS to {doc['name']} ({doc['phone']})...")
                    print(f"[TWILIO API] Initiating Voice Call to {doc['phone']}...")
                    alert_state[p.bed_id] = "alerted"

                payload = {
                    "bed_id": p.bed_id,
                    "fhr_raw": sim_data['fhr_raw'],
                    "uc_raw": sim_data['uc_raw'],
                    "astv": round(p.astv, 1),
                    "class_code": pred_class,
                    "reasoning": reasoning
                }
                
                for ws in active_connections:
                    try:
                        await ws.send_text(json.dumps(payload))
                    except:
                        pass
                        
        await asyncio.sleep(0.1) # 10Hz stream

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(ctg_simulator_loop())

@app.websocket("/ws/monitor")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
