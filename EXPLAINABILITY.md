# HC-01: Fetal Distress Detection & Clinical Explainability Reference
**UCI Cardiotocography (CTG) Dataset Architecture & Physiological Feature Dictionary**

---

## 1. Dataset Verification & Identity

| Property | Value / Verification |
| :--- | :--- |
| **Dataset Name** | UCI Cardiotocography Dataset (Nathan Cohen / Ayres-de-Campos et al., 2000) |
| **Event API / Ingestion** | **`ucimlrepo.fetch_ucirepo(id=193)`** |
| **Local Staged Copy** | `data/raw/CTG.xls` (and mirrored CSV formats) |
| **Total Patient Records** | **2,126 fetal cardiotocograms** |
| **Total Features (`X`)** | **21 clinical & morphological features** |
| **Target Variables (`y`)** | **`NSP`** (Primary 3-class target: 1=Normal, 2=Suspect, 3=Pathological)<br>**`CLASS`** (Secondary 10-class morphological pattern) |
| **Primary Domain** | Obstetric Fetal Heart Rate (FHR) & Tocography (Uterine Contractions) |

---

### Ingestion Code snippet:
```python
from ucimlrepo import fetch_ucirepo 
  
# Fetch dataset via official repository ID
cardiotocography = fetch_ucirepo(id=193) 
  
# Clinical features & diagnostic target
X = cardiotocography.data.features   # Shape: (2126, 21)
y = cardiotocography.data.targets    # Columns: ['NSP', 'CLASS']
```

---

## 2. Target Variable Distribution & Clinical Imbalance

The 3-class distribution reflects real-world clinical triage, where severe hypoxia cases are minority events:

```
┌─────────────────────────┬──────────────┬──────────────┬────────────────────────────────────────────────────────┐
│ Class Label & Code      │ Sample Count │ Percentage   │ Clinical Definition & Medical Implication             │
├─────────────────────────┼──────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ 1: Normal               │ ~1,655       │ 77.8%        │ Baseline reassuring; healthy oxygenation & autonomic   │
│                         │              │              │ regulation. Routine intrapartum monitoring.            │
├─────────────────────────┼──────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ 2: Suspect              │ ~295         │ 13.9%        │ Non-reassuring; reduced variability or minor           │
│                         │              │              │ decelerations. Requires closer observation & re-test.  │
├─────────────────────────┼──────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ 3: Pathological         │ ~176         │ 8.3%         │ Severe fetal distress, acidosis, or hypoxia risk.      │
│                         │              │              │ Demands urgent clinical escalation / intervention.     │
└─────────────────────────┴──────────────┴──────────────┴────────────────────────────────────────────────────────┘
```

> **CRITICAL CLINICAL TAKEAWAY**: A naive majority-class model that always guesses "Normal" would achieve **77.8% accuracy** while missing **100% of Pathological cases** (fatal clinical failure). This is why **Macro F1 Score** is our primary evaluation metric.

---

## 3. Comprehensive Clinical Feature Dictionary

The 21 features extracted from the CTG examination are categorized into 4 physiological domains:

### A. Fetal Heart Rate (FHR) Baseline & Fetal Activity
1. **`LB` / `baseline value` (bpm)**: Baseline Fetal Heart Rate in beats per minute. Normal physiological range is typically 110–160 bpm. Bradycardia (<110) or Tachycardia (>160) are non-reassuring.
2. **`AC` (Accelerations / sec)**: Number of transient FHR increases ($\ge 15$ bpm for $\ge 15$ sec). A reactive, healthy fetus shows frequent accelerations. Absence of accelerations indicates reduced fetal reactivity.
3. **`FM` (Fetal Movements / sec)**: Number of active fetal movements detected per second.
4. **`UC` (Uterine Contractions / sec)**: Frequency of maternal uterine contractions per second. Essential for assessing contraction stress on fetal oxygen delivery.

### B. Decelerations (Fetal Hypoxia & Cord Compression Indicators)
5. **`DL` (Light Decelerations / sec)**: Transient, mild decreases in FHR. Often benign head compression during contractions.
6. **`DS` (Severe Decelerations / sec)**: Sudden, steep drops in FHR ($\ge 60$ bpm drop or baseline <60 bpm for >60s). **Strong indicator of acute cord compression and imminent hypoxia.**
7. **`DP` (Prolonged Decelerations / sec)**: Decelerations lasting $>2$ minutes. **Major pathological indicator of prolonged fetal hypoxia and acidosis.**

### C. FHR Variability (Autonomic Nervous System Health)
Variability reflects the interplay between fetal sympathetic and parasympathetic nervous systems:
8. **`ASTV` (% of time with abnormal short-term variability)**: High percentage ($>60\%$) strongly correlates with fetal compromise.
9. **`MSTV` (Mean value of short-term variability)**: Beat-to-beat variability magnitude. Depressed MSTV indicates loss of autonomic modulation.
10. **`ALTV` (% of time with abnormal long-term variability)**: High values indicates persistent flat variability across prolonged recording windows.
11. **`MLTV` (Mean value of long-term variability)**: Cyclic rhythmicity over 1–2 minute windows.

### D. FHR Signal Histogram & Distribution Statistics
Derived from the 0–250 bpm frequency histogram of the entire recording:
12. **`Width`**: Width of the FHR histogram ($\text{Max} - \text{Min}$).
13. **`Min`**: Minimum recorded FHR in bpm.
14. **`Max`**: Maximum recorded FHR in bpm.
15. **`Nmax`**: Number of peaks in the histogram (multi-modality indicator).
16. **`Nzeros`**: Number of zero values in histogram (signal quality / dropout indicator).
17. **`Mode`**: Most frequently occurring FHR.
18. **`Mean`**: Mean FHR across the recording.
19. **`Median`**: Median FHR across the recording.
20. **`Variance`**: Statistical dispersion / spread of FHR.
21. **`Tendency`**: Histogram asymmetry: `-1` (left-skewed / negative skew), `0` (symmetric), `+1` (right-skewed / positive skew).

---

## 4. Preprocessing & Data Cleaning Strategy (Milestone 3 Preview)

Before training models on this dataset, we follow strict clinical data preparation rules:

1. **Header & Metadata Stripping**: The original UCI `.xls` contains summary metadata rows at the top and bottom which must be cleanly separated from the 2,126 recording rows.
2. **Missing Value & Infinite Check**: Verification that all 2,126 recordings have complete physiological metrics.
3. **Class Consistency**: Target variable strictly formatted as integer classes $\{1, 2, 3\}$.
4. **Stratified Train/Test Split (80/20)**: Preserves the exact 77.8% / 13.9% / 8.3% class proportions in both training and test sets so evaluation on minority Class 3 is rigorous.
5. **Feature Scaling**: Robust or Standard scaling applied to prevent high-magnitude features (`Width`, `Mode`, `Variance`) from dominating linear model coefficients.
6. **No Data Leakage**: Scaler parameters ($\mu, \sigma$) computed strictly on the training partition and transformed on test.

---

## 5. Explainability Framework (Milestone 5 Architecture)

Our explainability module (`src/evaluation.py`) will provide:
- **Global SHAP Summary Plots**: Highlighting which features drive predictions across all 3 classes.
- **Pathological Risk Drivers**: Specifically isolating which features push predictions from `Normal (1)` $\rightarrow$ `Pathological (3)` (e.g., high `ASTV`, elevated `DP`, low `MSTV`).
- **Individual Case Waterfall / Decision Plots**: Showing step-by-step feature contributions for a specific patient.
