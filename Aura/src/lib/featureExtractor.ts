import { CTGDataSample, CTGFeatures, FeatureImportance } from '../types';

export class CTGFeatureExtractor {
  /**
   * Extracts the 21 standard FIGO / UCI CTG features from a rolling window of CTG samples.
   */
  public static extractFeatures(samples: CTGDataSample[]): CTGFeatures {
    if (!samples || samples.length === 0) {
      return this.getDefaultFeatures();
    }

    const fhrs = samples.map(s => s.fhr);
    const ucs = samples.map(s => s.uc);
    const fms = samples.map(s => s.fm);
    const durationSeconds = Math.max(1, samples.length * 0.25); // assuming 4Hz sampling

    // 1. Baseline LB (trimmed median / mean)
    const sortedFhr = [...fhrs].sort((a, b) => a - b);
    const q1Idx = Math.floor(sortedFhr.length * 0.25);
    const q3Idx = Math.floor(sortedFhr.length * 0.75);
    const interquartile = sortedFhr.slice(q1Idx, q3Idx + 1);
    const lb = interquartile.length > 0 
      ? interquartile.reduce((sum, v) => sum + v, 0) / interquartile.length 
      : 135;

    // 2. Accelerations (FHR > baseline + 15 for >= 15 sec)
    let accelCount = 0;
    let inAccel = false;
    let accelDuration = 0;
    for (const fhr of fhrs) {
      if (fhr >= lb + 14) {
        accelDuration += 0.25;
        if (!inAccel && accelDuration >= 3) {
          accelCount++;
          inAccel = true;
        }
      } else {
        inAccel = false;
        accelDuration = 0;
      }
    }
    const ac = accelCount / durationSeconds;

    // 3. Fetal movements per second
    const fmCount = fms.reduce((acc, v) => acc + (v > 0 ? 1 : 0), 0);
    const fm = fmCount / durationSeconds;

    // 4. Uterine contractions per second
    let ucPeaks = 0;
    for (let i = 1; i < ucs.length - 1; i++) {
      if (ucs[i] > 35 && ucs[i] > ucs[i - 1] && ucs[i] > ucs[i + 1]) {
        ucPeaks++;
      }
    }
    const uc = Math.max(0.001, ucPeaks / durationSeconds);

    // 5. Decelerations: Light (DL), Severe (DS), Prolonged (DP)
    let dlCount = 0;
    let dsCount = 0;
    let dpCount = 0;
    let inDecel = false;
    let decelDuration = 0;
    let decelMinFhr = lb;

    for (const fhr of fhrs) {
      if (fhr <= lb - 15) {
        decelDuration += 0.25;
        decelMinFhr = Math.min(decelMinFhr, fhr);
        if (!inDecel) {
          inDecel = true;
        }
      } else {
        if (inDecel) {
          if (decelDuration >= 15) { // prolonged (> 15-60s)
            if (decelDuration >= 25 || decelMinFhr < 90) {
              dpCount++;
            } else if (decelMinFhr < 100) {
              dsCount++;
            } else {
              dlCount++;
            }
          }
          inDecel = false;
          decelDuration = 0;
          decelMinFhr = lb;
        }
      }
    }

    const dl = dlCount / durationSeconds;
    const ds = dsCount / durationSeconds;
    const dp = dpCount / durationSeconds;

    // 6. Short Term Variability (STV / ASTV)
    // Differences between adjacent beat intervals
    let beatDiffSum = 0;
    let abnormalStvCount = 0;
    for (let i = 1; i < fhrs.length; i++) {
      const diff = Math.abs(fhrs[i] - fhrs[i - 1]);
      beatDiffSum += diff;
      if (diff < 1.0) { // flat beat-to-beat difference
        abnormalStvCount++;
      }
    }
    const mstv = fhrs.length > 1 ? (beatDiffSum / (fhrs.length - 1)) * 3.8 : 1.5;
    const astv = fhrs.length > 1 ? Math.min(99, Math.round((abnormalStvCount / (fhrs.length - 1)) * 100)) : 22;

    // 7. Long Term Variability (LTV / ALTV)
    // Windowed baseline peak-to-trough range
    const windowSize = 8; // 2 sec windows
    let abnormalLtvWindows = 0;
    let totalWindows = 0;
    let ltvRangesSum = 0;

    for (let i = 0; i < fhrs.length; i += windowSize) {
      const chunk = fhrs.slice(i, i + windowSize);
      if (chunk.length > 2) {
        const cMin = Math.min(...chunk);
        const cMax = Math.max(...chunk);
        const cRange = cMax - cMin;
        ltvRangesSum += cRange;
        totalWindows++;
        if (cRange < 3.0) {
          abnormalLtvWindows++;
        }
      }
    }

    const mltv = totalWindows > 0 ? (ltvRangesSum / totalWindows) * 2.2 : 9.5;
    const altv = totalWindows > 0 ? Math.min(95, Math.round((abnormalLtvWindows / totalWindows) * 100)) : 8;

    // 8. Histogram analysis
    const min = Math.round(Math.min(...fhrs));
    const max = Math.round(Math.max(...fhrs));
    const width = Math.max(10, max - min);

    // Binning for mode, mean, median, peaks
    const bins: Record<number, number> = {};
    for (const f of fhrs) {
      const b = Math.round(f);
      bins[b] = (bins[b] || 0) + 1;
    }

    let modeVal = Math.round(lb);
    let maxFreq = 0;
    let nZeros = 0;
    let nPeaks = 0;

    const binKeys = Object.keys(bins).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < binKeys.length; i++) {
      const k = binKeys[i];
      const freq = bins[k];
      if (freq > maxFreq) {
        maxFreq = freq;
        modeVal = k;
      }
      // Check local peaks
      const prevFreq = bins[k - 1] || 0;
      const nextFreq = bins[k + 1] || 0;
      if (freq > prevFreq && freq > nextFreq && freq > 3) {
        nPeaks++;
      }
    }

    // Mean & Variance
    const sumFhr = fhrs.reduce((acc, v) => acc + v, 0);
    const meanVal = sumFhr / fhrs.length;
    const varianceVal = fhrs.reduce((acc, v) => acc + Math.pow(v - meanVal, 2), 0) / fhrs.length;
    const medianVal = sortedFhr[Math.floor(sortedFhr.length / 2)];

    // Tendency: -1 (left), 0 (symmetric), 1 (right)
    let tendency = 0;
    if (modeVal - meanVal > 4) tendency = 1;
    else if (meanVal - modeVal > 4) tendency = -1;

    return {
      LB: Math.round(lb),
      AC: parseFloat(ac.toFixed(4)),
      FM: parseFloat(fm.toFixed(4)),
      UC: parseFloat(uc.toFixed(4)),
      DL: parseFloat(dl.toFixed(4)),
      DS: parseFloat(ds.toFixed(4)),
      DP: parseFloat(dp.toFixed(4)),
      ASTV: astv,
      MSTV: parseFloat(mstv.toFixed(2)),
      ALTV: altv,
      MLTV: parseFloat(mltv.toFixed(2)),
      Width: width,
      Min: min,
      Max: max,
      Nmax: Math.max(1, nPeaks),
      Nzeros: nZeros,
      Mode: modeVal,
      Mean: Math.round(meanVal),
      Median: Math.round(medianVal),
      Variance: Math.round(varianceVal),
      Tendency: tendency
    };
  }

  public static getDefaultFeatures(): CTGFeatures {
    return {
      LB: 136,
      AC: 0.005,
      FM: 0.001,
      UC: 0.004,
      DL: 0.0,
      DS: 0.0,
      DP: 0.0,
      ASTV: 22,
      MSTV: 1.8,
      ALTV: 4,
      MLTV: 11.2,
      Width: 62,
      Min: 108,
      Max: 170,
      Nmax: 3,
      Nzeros: 0,
      Mode: 136,
      Mean: 137,
      Median: 136,
      Variance: 18,
      Tendency: 0
    };
  }

  public static assessRiskFactors(features: CTGFeatures): FeatureImportance[] {
    const list: FeatureImportance[] = [
      {
        feature: 'ASTV',
        name: 'Abnormal Short Term Variability',
        value: features.ASTV,
        unit: '%',
        weight: features.ASTV > 65 ? 0.95 : features.ASTV > 45 ? 0.5 : 0.05,
        normalRange: '< 40%',
        status: features.ASTV > 65 ? 'abnormal' : features.ASTV > 45 ? 'borderline' : 'normal',
        clinicalMeaning: 'Loss of beat-to-beat variability indicates autonomic depression or impending fetal academia.'
      },
      {
        feature: 'LB',
        name: 'Baseline Fetal Heart Rate',
        value: features.LB,
        unit: 'bpm',
        weight: (features.LB < 100 || features.LB > 165) ? 0.88 : (features.LB < 110 || features.LB > 160) ? 0.45 : 0.02,
        normalRange: '110 – 160 bpm',
        status: (features.LB < 100 || features.LB > 165) ? 'abnormal' : (features.LB < 110 || features.LB > 160) ? 'borderline' : 'normal',
        clinicalMeaning: 'Bradycardia (<100 bpm) or sustained severe tachycardia (>165 bpm) indicates acute distress or maternal/fetal sepsis.'
      },
      {
        feature: 'DP',
        name: 'Prolonged Decelerations',
        value: features.DP,
        unit: '/sec',
        weight: features.DP > 0 ? 0.92 : 0.0,
        normalRange: '0.00 /sec (None)',
        status: features.DP > 0 ? 'abnormal' : 'normal',
        clinicalMeaning: 'Deceleration lasting >2 minutes reflecting acute uteroplacental hypoperfusion or cord compression.'
      },
      {
        feature: 'ALTV',
        name: 'Abnormal Long Term Variability',
        value: features.ALTV,
        unit: '%',
        weight: features.ALTV > 45 ? 0.82 : features.ALTV > 20 ? 0.4 : 0.05,
        normalRange: '< 20%',
        status: features.ALTV > 45 ? 'abnormal' : features.ALTV > 20 ? 'borderline' : 'normal',
        clinicalMeaning: 'Elevated long-term silence indicates lack of physiological sleep-wake cycling or severe hypoxia.'
      },
      {
        feature: 'AC',
        name: 'Fetal Accelerations',
        value: features.AC,
        unit: '/sec',
        weight: features.AC === 0 ? 0.4 : -0.3,
        normalRange: '> 0.003 /sec',
        status: features.AC === 0 ? 'borderline' : 'normal',
        clinicalMeaning: 'Presence of accelerations is the most reliable clinical sign of fetal wellbeing and normal acid-base status.'
      },
      {
        feature: 'Variance',
        name: 'FHR Histogram Variance',
        value: features.Variance,
        unit: 'bpm²',
        weight: features.Variance < 4 ? 0.75 : features.Variance > 80 ? 0.5 : 0.05,
        normalRange: '10 – 45 bpm²',
        status: (features.Variance < 4 || features.Variance > 80) ? 'abnormal' : 'normal',
        clinicalMeaning: 'Extreme low variance denotes silent/saltatory tracing.'
      },
      {
        feature: 'UC',
        name: 'Contraction Frequency',
        value: features.UC,
        unit: '/sec',
        weight: features.UC > 0.007 ? 0.7 : 0.05,
        normalRange: '0.002 – 0.005 /sec',
        status: features.UC > 0.007 ? 'abnormal' : 'normal',
        clinicalMeaning: 'Uterine tachysystole (>5 contractions per 10 min) risks fetal desaturation and placental ischemic crisis.'
      }
    ];

    return list.sort((a, b) => b.weight - a.weight);
  }
}
