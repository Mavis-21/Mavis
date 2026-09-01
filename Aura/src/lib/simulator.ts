import { CTGDataSample, TrajectoryType } from '../types';

export interface PatientSimulationState {
  patientId: string;
  trajectory: TrajectoryType;
  baseHeartRate: number;
  currentHeartRate: number;
  targetHeartRate: number;
  variabilityMagnitude: number; // in bpm
  shortTermVariability: number;
  contractionPhase: number;     // 0 to 2*PI periodic
  contractionPeriod: number;    // seconds per cycle
  contractionIntensity: number; // peak mmHg
  contractionBasalTone: number; // resting tone mmHg
  activeDeceleration: number;   // current bpm drop
  activeAcceleration: number;   // current bpm rise
  decelerationType: 'none' | 'early' | 'late' | 'variable' | 'prolonged';
  timeSeconds: number;
  sampleBuffer: CTGDataSample[];
  customIntervention?: 'oxygen' | 'reposition' | 'tocolysis' | 'none';
}

export class CTGSimulator {
  private states: Map<string, PatientSimulationState> = new Map();
  private sampleRateHz: number = 4; // 4 samples per second

  constructor() {
    this.initDefaultPatients();
  }

  public initDefaultPatients() {
    // Bed 1: Normal / Stable
    this.createOrResetPatient('bed-1', 'normal', 138);

    // Bed 2: Drifting toward Suspect
    this.createOrResetPatient('bed-2', 'suspect', 156);

    // Bed 3: Acute Pathological
    this.createOrResetPatient('bed-3', 'pathological', 92);

    // Bed 4: Normal Term Observation
    this.createOrResetPatient('bed-4', 'normal', 142);

    // Bed 5: Mild Suspect / Tachycardia
    this.createOrResetPatient('bed-5', 'suspect', 162);

    // Bed 6: High-Risk Pathological Bradycardia
    this.createOrResetPatient('bed-6', 'pathological', 85);
  }

  public createOrResetPatient(patientId: string, trajectory: TrajectoryType, baseBpm?: number): PatientSimulationState {
    let baseline = baseBpm ?? 135;
    let varMag = 12;
    let stv = 0.2;
    let period = 180; // 3 mins per contraction
    let intensity = 45;
    let basal = 10;

    if (trajectory === 'normal') {
      baseline = baseBpm ?? 136;
      varMag = 14;
      stv = 0.18;
      period = 200;
      intensity = 48;
      basal = 8;
    } else if (trajectory === 'suspect') {
      baseline = baseBpm ?? 158;
      varMag = 5.5;
      stv = 0.55;
      period = 160;
      intensity = 65;
      basal = 14;
    } else if (trajectory === 'pathological') {
      baseline = baseBpm ?? 88;
      varMag = 1.8;
      stv = 0.82;
      period = 110; // frequent / tachysystole
      intensity = 85;
      basal = 24;
    }

    const state: PatientSimulationState = {
      patientId,
      trajectory,
      baseHeartRate: baseline,
      currentHeartRate: baseline,
      targetHeartRate: baseline,
      variabilityMagnitude: varMag,
      shortTermVariability: stv,
      contractionPhase: Math.random() * Math.PI * 2,
      contractionPeriod: period,
      contractionIntensity: intensity,
      contractionBasalTone: basal,
      activeDeceleration: 0,
      activeAcceleration: 0,
      decelerationType: trajectory === 'pathological' ? 'late' : trajectory === 'suspect' ? 'variable' : 'none',
      timeSeconds: 0,
      sampleBuffer: [],
      customIntervention: 'none'
    };

    // Pre-populate 30 seconds of buffer
    const initialSamplesCount = 30 * this.sampleRateHz;
    for (let i = 0; i < initialSamplesCount; i++) {
      const sample = this.stepPatient(state, 1 / this.sampleRateHz, false);
      state.sampleBuffer.push(sample);
    }

    this.states.set(patientId, state);
    return state;
  }

  public setPatientTrajectory(patientId: string, trajectory: TrajectoryType) {
    const existing = this.states.get(patientId);
    if (!existing) {
      this.createOrResetPatient(patientId, trajectory);
      return;
    }
    existing.trajectory = trajectory;
    if (trajectory === 'normal') {
      existing.targetHeartRate = 138;
      existing.variabilityMagnitude = 14;
      existing.shortTermVariability = 0.18;
      existing.decelerationType = 'none';
      existing.contractionPeriod = 200;
      existing.contractionIntensity = 45;
      existing.contractionBasalTone = 8;
    } else if (trajectory === 'suspect') {
      existing.targetHeartRate = 158;
      existing.variabilityMagnitude = 5;
      existing.shortTermVariability = 0.58;
      existing.decelerationType = 'variable';
      existing.contractionPeriod = 150;
      existing.contractionIntensity = 65;
      existing.contractionBasalTone = 15;
    } else if (trajectory === 'pathological') {
      existing.targetHeartRate = 84;
      existing.variabilityMagnitude = 1.6;
      existing.shortTermVariability = 0.85;
      existing.decelerationType = 'late';
      existing.contractionPeriod = 110;
      existing.contractionIntensity = 85;
      existing.contractionBasalTone = 26;
    }
  }

  public injectEvent(patientId: string, eventType: 'cord-compression' | 'hyperstimulation' | 'recovery' | 'prolonged-decel') {
    const state = this.states.get(patientId);
    if (!state) return;

    if (eventType === 'cord-compression') {
      state.decelerationType = 'variable';
      state.activeDeceleration = 45;
    } else if (eventType === 'hyperstimulation') {
      state.contractionPeriod = 80;
      state.contractionIntensity = 92;
      state.contractionBasalTone = 28;
    } else if (eventType === 'prolonged-decel') {
      state.decelerationType = 'prolonged';
      state.activeDeceleration = 55;
      state.targetHeartRate = 78;
    } else if (eventType === 'recovery') {
      this.setPatientTrajectory(patientId, 'normal');
      state.customIntervention = 'oxygen';
      state.activeDeceleration = 0;
    }
  }

  public getPatientState(patientId: string): PatientSimulationState | undefined {
    return this.states.get(patientId);
  }

  public getAllPatients(): PatientSimulationState[] {
    return Array.from(this.states.values());
  }

  public generateNextSample(patientId: string, dtSeconds: number = 0.25): CTGDataSample {
    let state = this.states.get(patientId);
    if (!state) {
      state = this.createOrResetPatient(patientId, 'normal');
    }
    const sample = this.stepPatient(state, dtSeconds, true);
    state.sampleBuffer.push(sample);
    if (state.sampleBuffer.length > 1200) { // keep max 5-10 min buffer
      state.sampleBuffer.shift();
    }
    return sample;
  }

  private stepPatient(state: PatientSimulationState, dt: number, live: boolean): CTGDataSample {
    state.timeSeconds += dt;
    const t = state.timeSeconds;

    // Smooth baseline convergence
    const baselineLerp = 0.03;
    state.currentHeartRate += (state.targetHeartRate - state.currentHeartRate) * baselineLerp;

    // 1. Uterine Contraction (UC) synthesis
    // Non-linear Gaussian/bell-curve shaped contraction pulse
    const cyclePos = (t % state.contractionPeriod) / state.contractionPeriod;
    let ucWave = 0;
    const contractionActiveWindow = 0.35; // contraction lasts 35% of cycle (~60-70 seconds)

    if (cyclePos < contractionActiveWindow) {
      // Bell curve pulse
      const center = contractionActiveWindow / 2;
      const sigma = contractionActiveWindow / 4.5;
      const normDist = (cyclePos - center) / sigma;
      ucWave = Math.exp(-0.5 * normDist * normDist);
    }

    const currentUc = Math.max(0, Math.min(100,
      state.contractionBasalTone + 
      ucWave * (state.contractionIntensity - state.contractionBasalTone) +
      (Math.sin(t * 0.8) * 1.5) // slight maternal respiratory noise
    ));

    // 2. Fetal Movements (FM) simulation
    let fmPulse = 0;
    if (state.trajectory === 'normal' && Math.random() < 0.04) {
      fmPulse = 1;
      // Trigger acceleration on movement
      if (Math.random() < 0.6) {
        state.activeAcceleration = 18 + Math.random() * 8;
      }
    }

    // Decay active acceleration
    state.activeAcceleration *= 0.96;
    if (state.activeAcceleration < 0.5) state.activeAcceleration = 0;

    // 3. Decelerations response linked to Contraction
    if (state.decelerationType === 'late') {
      // Late deceleration lags behind contraction peak
      const lagCyclePos = ((t - 25) % state.contractionPeriod) / state.contractionPeriod;
      if (lagCyclePos >= 0 && lagCyclePos < 0.35) {
        const center = 0.35 / 2;
        const normDist = (lagCyclePos - center) / (0.35 / 4);
        const decelDepth = state.trajectory === 'pathological' ? 38 : 22;
        state.activeDeceleration = Math.exp(-0.5 * normDist * normDist) * decelDepth;
      } else {
        state.activeDeceleration *= 0.95;
      }
    } else if (state.decelerationType === 'variable') {
      // Variable deceleration: sharp drop with rapid return
      if (cyclePos > 0.08 && cyclePos < 0.22) {
        state.activeDeceleration = 30 + Math.sin(t * 2) * 8;
      } else {
        state.activeDeceleration *= 0.92;
      }
    } else if (state.decelerationType === 'early') {
      // Early deceleration matches contraction wave symmetrically
      state.activeDeceleration = ucWave * 20;
    } else if (state.decelerationType === 'prolonged') {
      state.activeDeceleration = Math.max(state.activeDeceleration * 0.995, 28);
    } else {
      state.activeDeceleration *= 0.94;
    }

    // 4. Physiological beat-to-beat variability (Autonomic nervous system simulation)
    // Multiscale noise (Short Term + Long Term Variability)
    const stvNoise = (Math.random() - 0.5) * 2 * (state.variabilityMagnitude * 0.7);
    const ltvOscillation = Math.sin(t * 0.25) * (state.variabilityMagnitude * 0.5) +
                           Math.cos(t * 0.08) * (state.variabilityMagnitude * 0.3);

    // Compute composite FHR
    let fhr = state.currentHeartRate 
            + stvNoise 
            + ltvOscillation 
            + state.activeAcceleration 
            - state.activeDeceleration;

    // Constrain physiological range
    fhr = Math.max(60, Math.min(220, fhr));

    // Signal quality simulation (artifacts/dropouts ~1-2% in real ultrasound probe)
    let quality = 98 - Math.random() * 4;
    if (state.trajectory === 'pathological' && Math.random() < 0.03) {
      quality = 82; // difficult acoustic capture during acute stress
    }

    return {
      timestamp: Date.now(),
      fhr: Math.round(fhr * 10) / 10,
      uc: Math.round(currentUc * 10) / 10,
      fm: fmPulse,
      quality: Math.round(quality)
    };
  }
}

export const globalSimulator = new CTGSimulator();
