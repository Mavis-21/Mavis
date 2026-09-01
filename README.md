# HC-01: Fetal Distress Detection from CTG Signals
**Hackathon Solution Architecture & Modeling Strategy**

---

## 1. Executive Summary & Problem Formulation
Cardiotocography (CTG) is a continuous electronic monitoring tool that records fetal heart rate (FHR) and uterine contractions (UC) during pregnancy and labor. Early detection of fetal hypoxia and acidosis is vital for preventing intrapartum complications and fetal demise.

Our task is to build a robust, clinically interpretable machine learning pipeline that classifies fetal state into **3 distinct diagnostic categories**:
1. **Normal (Class 1)**: Reassuring baseline, variability, and accelerations with absence of pathological decelerations.
2. **Suspect (Class 2)**: Non-reassuring features requiring vigilance and potential secondary testing.
3. **Pathological (Class 3)**: High likelihood of fetal compromise demanding immediate clinical intervention.

---

## 2. Strict Evaluation Criteria & Clinical Metrics Strategy

### Why Raw Accuracy is Banned
The dataset exhibits severe class imbalance (Normal cases drastically outnumber Suspect and Pathological cases). A naive majority-class classifier could achieve ~80% accuracy while failing to catch life-threatening **Pathological** cases (false negatives in Class 3).

### Evaluation Metrics
- **Primary Optimization Metric**: **Macro-Averaged F1 Score ($\text{Macro } F_1$)**
  $$\text{Macro } F_1 = \frac{1}{3} \sum_{c \in \{1, 2, 3\}} F_{1, c}$$
  Ensures equal weighting across Normal, Suspect, and Pathological classes regardless of prevalence.
- **Clinical Safety Metric**: **Pathological Class Recall (Sensitivity)** to minimize missed distress cases.
- **Diagnostic Granularity**: **$3 \times 3$ Confusion Matrix** with normalized true positive rates across all classes.
- **Multi-class Area Under ROC Curve (Macro OvR ROC-AUC)** for threshold-independent discrimination analysis.

---

## 3. Model Architecture Strategy (2 Distinct Families)

To satisfy rubric requirements and benchmark linear versus non-linear representations, we evaluate two fundamentally different model families:

### Family A: Linear / Regularized Parametric Models
- **Multinomial Logistic Regression with ElasticNet / L2 Regularization & Class Weight Balancing**
- *Purpose*: Provides a calibrated linear baseline, high inference speed, and direct coefficients for odds ratios.

### Family B: Non-Linear Gradient-Boosted Tree Ensembles
- **XGBoost / LightGBM / Balanced Random Forest**
- *Purpose*: Captures complex non-linear feature interactions, non-monotonic physiological thresholds (e.g., severe decelerations vs. variability loss), and handles correlated morphometric features.

---

## 4. Clinical Interpretability & Explainability
Interpretability is mandatory for clinical AI adoption:
- **Global Feature Importance**: Quantifying the most influential CTG morphological markers (e.g., `ASTV`, `ALTV`, `MSTV`, `Mean`, `Mode`, `Variance`, `Accelerations`, `Prolongued Decelerations`).
- **SHAP (SHapley Additive exPlanations)**: Multi-class summary plots and decision plots showing how specific signal fluctuations push predictions from Normal $\rightarrow$ Suspect $\rightarrow$ Pathological.
- **Permutation Importance**: Validating that model reliance aligns with established obstetric cardiotocogram interpretation guidelines (FIGO / ACOG).

---

## 5. Repository Structure

```
.
├── README.md               # Hackathon strategy and architecture doc
├── requirements.txt        # Python dependency manifest
├── data/                   # Raw and preprocessed CTG datasets
├── src/                    # Modularized ML logic
│   ├── ingestion.py        # Kagglehub ingestion & validation
│   ├── preprocessing.py    # Cleaning, scaling & train-test split
│   ├── models.py           # Model definitions & training routines
│   └── evaluation.py       # Metrics, confusion matrix, SHAP explainability
├── notebooks/              # Exploratory and benchmark notebooks
├── models/                 # Serialized model artifacts
└── visualizations/         # Confusion matrices, ROC curves, SHAP summary plots
```

---

## 5. Verified Benchmark Results (5-Fold CV & Isolated Test Set)

| Model Family | Algorithm | 5-Fold CV Macro F1 | Test Macro F1 | Pathological Recall (Class 3) | Test Weighted F1 | Primary Clinical Strength |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Family A** | **Multinomial Logistic Regression (L2 Balanced)** | **0.7776** (±0.035) | **0.7932** | **94.29%** | **0.8883** | High inference speed, calibrated linear odds ratios |
| **Family B (1)** | **Balanced Random Forest (200 Trees)** | **0.8884** (±0.016) | **0.9169** | **94.29%** | **0.9509** | Robust against noise, stable ensemble bagging |
| **Family B (2)** | **Gradient Boosted Decision Trees** | **0.9070** (±0.003) | **0.9414** | **94.29%** | **0.9692** | **Top Performer**: Captures non-linear physiological splits |

---

## 6. Target Milestones & Verified Deliverables
- [x] **Milestone 1**: Project initialization, directory structure, requirements manifest, and rubric-aligned strategy.
- [x] **Milestone 2**: Ingest dataset (`data/raw/CTG.xls` & `ucimlrepo(id=193)`), validate target distribution (1: Normal, 2: Suspect, 3: Pathological) and create physiological feature dictionary ([EXPLAINABILITY.md](file:///Users/mavis/Desktop/Mavis/EXPLAINABILITY.md)).
- [x] **Milestone 3**: Clean, engineer, scale, and partition data with zero-leakage stratified splitting ([src/preprocessing.py](file:///Users/mavis/Desktop/Mavis/src/preprocessing.py)).
- [x] **Milestone 4**: Train Family A (Regularized Logistic Regression) & Family B (Balanced Random Forest & Gradient Boosted Trees) with 5-Fold Stratified Cross-Validation ([src/train_benchmark.py](file:///Users/mavis/Desktop/Mavis/src/train_benchmark.py)).
- [x] **Milestone 5**: Multi-Class Macro F1 Evaluation, $3 \times 3$ Normalized Confusion Matrices, TreeSHAP Explainability, and Obstetric Guideline Alignment ([src/explainability.py](file:///Users/mavis/Desktop/Mavis/src/explainability.py) & [CLINICAL_GUIDELINE_ALIGNMENT.md](file:///Users/mavis/Desktop/Mavis/CLINICAL_GUIDELINE_ALIGNMENT.md)).
- [ ] **Milestone 6**: Interactive Bedside Clinician Dashboard & Real-Time Triage Interface ([proto-01.html](file:///Users/mavis/Desktop/Mavis/proto-01.html)).

