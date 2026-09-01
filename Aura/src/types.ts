export type ClassificationClass = 1 | 2 | 3; // 1 = Normal, 2 = Suspect, 3 = Pathological

export type TrajectoryType = 'normal' | 'suspect' | 'pathological' | 'custom';

export interface CTGDataSample {
  timestamp: number;
  fhr: number; // Fetal Heart Rate in bpm (100 - 200)
  uc: number;  // Uterine Contraction in mmHg / relative units (0 - 100)
  fm: number;  // Fetal Movement pulses
  quality: number; // 0 - 100% signal quality
}

export interface CTGFeatures {
  LB: number;      // FHR baseline (beats per minute)
  AC: number;      // Accelerations per second
  FM: number;      // Fetal movements per second
  UC: number;      // Uterine contractions per second
  DL: number;      // Light decelerations per second
  DS: number;      // Severe decelerations per second
  DP: number;      // Prolonged decelerations per second
  ASTV: number;    // % of time with abnormal short term variability
  MSTV: number;    // Mean value of short term variability (ms)
  ALTV: number;    // % of time with abnormal long term variability
  MLTV: number;    // Mean value of long term variability (ms)
  Width: number;   // Width of FHR histogram
  Min: number;     // Minimum of FHR histogram
  Max: number;     // Maximum of FHR histogram
  Nmax: number;    // Number of histogram peaks
  Nzeros: number;  // Number of histogram zeros
  Mode: number;    // Histogram mode
  Mean: number;    // Histogram mean
  Median: number;  // Histogram median
  Variance: number;// Histogram variance
  Tendency: number;// Histogram tendency (-1: left, 0: symmetric, 1: right)
}

export interface FeatureImportance {
  feature: keyof CTGFeatures;
  name: string;
  value: number;
  unit: string;
  weight: number; // relative contribution (-1 to 1)
  normalRange: string;
  status: 'normal' | 'borderline' | 'abnormal';
  clinicalMeaning: string;
}

export interface ModelPrediction {
  predictedClass: ClassificationClass;
  className: 'Normal' | 'Suspect' | 'Pathological';
  probabilities: {
    normal: number;
    suspect: number;
    pathological: number;
  };
  confidence: number;
  morphologyDescription: string;
  riskFactors: FeatureImportance[];
  timestamp: number;
}

export interface Patient {
  id: string;
  bedNumber: string;
  name: string;
  age: number;
  gestationalAge: string; // e.g. "39w 2d"
  parity: string;         // e.g. "G2P1"
  admissionTime: string;
  status: 'active' | 'discharged' | 'intervening';
  trajectory: TrajectoryType;
  cervicalDilation: string;
  membraneStatus: 'Intact' | 'Ruptured' | 'Artificial Rupture';
  highRiskFlags: string[];
  currentFhr: number;
  currentUc: number;
  latestPrediction: ModelPrediction;
  history: {
    timestamp: number;
    fhr: number;
    uc: number;
    classification: ClassificationClass;
  }[];
}

export interface DutyDoctor {
  id: string;
  name: string;
  title: string;
  role: 'Attending OB/GYN' | 'Obstetric Registrar' | 'Charge Midwife' | 'NICU Fellow';
  phone: string;
  ward: string;
  shiftStart: string; // "07:00"
  shiftEnd: string;   // "19:00"
  isCurrentDuty: boolean;
  priorityOrder: number; // 1 = Primary, 2 = Backup, 3 = Tertiary Escalation
  status: 'Available' | 'In OR' | 'At Bedside' | 'On Break';
  avatarColor: string;
}

export interface EscalationLogEntry {
  level: 1 | 2 | 3;
  levelName: string;
  timestamp: number;
  targetDoctorName: string;
  targetDoctorRole: string;
  phoneNumber: string;
  channel: 'push' | 'sms' | 'voice';
  status: 'sent' | 'delivered' | 'calling' | 'unacknowledged' | 'acknowledged';
  responseNote?: string;
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  patientName: string;
  bedNumber: string;
  severity: 'suspect' | 'pathological';
  title: string;
  message: string;
  morphology: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  clinicalAction?: string;
  escalationLevel: 1 | 2 | 3;
  escalationTimer: number; // countdown in seconds
  escalationLogs: EscalationLogEntry[];
}

export interface TwilioDispatchRecord {
  id: string;
  alertId: string;
  patientName: string;
  bedNumber: string;
  severity: 'suspect' | 'pathological';
  type: 'SMS' | 'VOICE';
  toNumber: string;
  recipientName: string;
  recipientRole: string;
  content: string;
  timestamp: number;
  status: 'queued' | 'sending' | 'delivered' | 'answered' | 'completed';
  simulated: boolean;
  audioTranscript?: string;
}
