import { ClassificationClass, CTGFeatures, ModelPrediction } from '../types';
import { CTGFeatureExtractor } from './featureExtractor';

export class CTGInferenceEngine {
  /**
   * Evaluates the Gradient Boosting model on the 21 CTG feature vector.
   * Reproduces the behavior of models/family_b_gradient_boosting.joblib trained on the FIGO/UCI CTG benchmark.
   */
  public static async predict(features: CTGFeatures): Promise<ModelPrediction> {
    try {
      // Map CTGFeatures to FastAPI PatientMetrics expected format
      const payload = {
        ASTV: features.ASTV,
        DP: features.DP,
        Mean: features.Mean,
        MSTV: features.MSTV,
        ALTV: features.ALTV,
        AC: features.AC,
        baseline_value: features.LB,
        fetal_movement: features.FM,
        uterine_contractions: features.UC,
        light_decelerations: features.DL,
        severe_decelerations: features.DS,
        MLTV: features.MLTV,
        Width: features.Width,
        Min: features.Min,
        Max: features.Max,
        Nmax: features.Nmax,
        Nzeros: features.Nzeros,
        Mode: features.Mode,
        Median: features.Median,
        Variance: features.Variance,
        Tendency: features.Tendency
      };

      const res = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const data = await res.json();
      
      const riskFactors = CTGFeatureExtractor.assessRiskFactors(features);
      
      const pNormal = data.risk_probabilities?.Normal || 0;
      const pSuspect = data.risk_probabilities?.Suspect || 0;
      const pPathological = data.risk_probabilities?.Pathological || 0;

      const confidence = Math.max(pNormal, pSuspect, pPathological);

      return {
        predictedClass: data.class_code as ClassificationClass,
        className: data.diagnosis as 'Normal' | 'Suspect' | 'Pathological',
        probabilities: {
          normal: Math.round(pNormal * 1000) / 1000,
          suspect: Math.round(pSuspect * 1000) / 1000,
          pathological: Math.round(pPathological * 1000) / 1000,
        },
        confidence: Math.round(confidence * 100) / 100,
        morphologyDescription: data.clinical_reasoning || this.generateMorphologyText(features, data.class_code),
        riskFactors,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to fetch from Python ML backend. Falling back to simple heuristic.', error);
      return this.fallbackPredict(features);
    }
  }
  /**
   * Synchronous prediction for initial state (uses local heuristic, not the Python backend).
   * Used ONLY at module load time to seed initial patient data before the backend is connected.
   */
  public static predictSync(features: CTGFeatures): ModelPrediction {
    return this.fallbackPredict(features);
  }

  private static fallbackPredict(features: CTGFeatures): ModelPrediction {
    // Basic fallback logic in case the Python backend is down
    let scoreNormal = 2.0;
    let scoreSuspect = -0.5;
    let scorePathological = -1.5;

    if (features.ASTV > 72 || features.LB < 98 || features.DP > 0) {
      scorePathological += 4.0; scoreNormal -= 3.0;
    } else if (features.ASTV > 52 || features.LB < 110 || features.LB > 165 || features.ALTV > 22) {
      scoreSuspect += 3.0; scoreNormal -= 1.0;
    } else {
      scoreNormal += 2.0;
    }

    const expN = Math.exp(scoreNormal);
    const expS = Math.exp(scoreSuspect);
    const expP = Math.exp(scorePathological);
    const sumExp = expN + expS + expP;

    const pN = expN / sumExp;
    const pS = expS / sumExp;
    const pP = expP / sumExp;

    let predictedClass: ClassificationClass = 1;
    let className: 'Normal' | 'Suspect' | 'Pathological' = 'Normal';
    
    if (pP >= 0.45 || (pP > pS && pP > pN)) { predictedClass = 3; className = 'Pathological'; }
    else if (pS >= 0.45 || pS > pN) { predictedClass = 2; className = 'Suspect'; }

    return {
      predictedClass,
      className,
      probabilities: { normal: pN, suspect: pS, pathological: pP },
      confidence: Math.max(pN, pS, pP),
      morphologyDescription: this.generateMorphologyText(features, predictedClass) + ' (Fallback)',
      riskFactors: CTGFeatureExtractor.assessRiskFactors(features),
      timestamp: Date.now()
    };
  }

  private static generateMorphologyText(f: CTGFeatures, cls: ClassificationClass): string {
    if (cls === 3) {
      if (f.LB < 100) return `Severe sustained bradycardia (${f.LB} bpm) with flat baseline variability (ASTV ${f.ASTV}%) and recurrent late decelerations.`;
      if (f.DP > 0) return `Prolonged deceleration complex with profound loss of variability (ASTV ${f.ASTV}%) and high fetal academia risk.`;
      if (f.ASTV > 70) return `Silent pattern (minimal variability <2 bpm, ASTV ${f.ASTV}%) with uterine hyperstimulation.`;
      return `Pathological tracing: marked loss of variability (ASTV ${f.ASTV}%) with severe late deceleration dynamics.`;
    }

    if (cls === 2) {
      if (f.LB > 155) return `Mild fetal tachycardia (${f.LB} bpm) with reduced variability (ASTV ${f.ASTV}%) and absent accelerations.`;
      if (f.ASTV > 45) return `Suboptimal variability (ASTV ${f.ASTV}%) with intermittent variable decelerations post-contraction.`;
      return `Suspect pattern: borderline baseline stability with early decelerations and diminished acceleration frequency.`;
    }

    if (f.AC > 0) return `Reassuring baseline (${f.LB} bpm) with active physiological accelerations and healthy variability (ASTV ${f.ASTV}%).`;
    return `Stable normocardia (${f.LB} bpm) with regular uterine contractions and no pathological decelerations.`;
  }
}
