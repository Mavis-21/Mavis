import { ClinicalAlert, EscalationLogEntry, Patient, TwilioDispatchRecord } from '../types';
import { dutyRosterService } from './dutyRoster';
import { audioTelemetry } from './audioTelemetry';

export class NotificationDeliveryService {
  private alerts: ClinicalAlert[] = [];
  private twilioDispatches: TwilioDispatchRecord[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.startEscalationTicker();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getAlerts(): ClinicalAlert[] {
    return [...this.alerts];
  }

  public getTwilioDispatches(): TwilioDispatchRecord[] {
    return [...this.twilioDispatches];
  }

  public getActiveAlertCount(): { suspect: number; pathological: number } {
    const unack = this.alerts.filter(a => !a.acknowledged);
    return {
      suspect: unack.filter(a => a.severity === 'suspect').length,
      pathological: unack.filter(a => a.severity === 'pathological').length,
    };
  }

  public async triggerPagerDutyAlert(title: string, message: string) {
    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          routing_key: '791954f6494f4e06c0190465fe1c31b3',
          event_action: 'trigger',
          payload: {
            summary: title,
            severity: 'critical',
            source: 'AuraCTG System',
            custom_details: {
              message
            }
          }
        })
      });
    } catch (e) {
      console.error('PagerDuty dispatch failed', e);
    }
  }

  /**
   * Triggers an immediate automated dispatch for Pathological cases without prompting for actionable inspection.
   */
  public triggerDirectDoctorDispatch(patient: Patient) {
    const existing = this.alerts.find(a => a.patientId === patient.id && a.severity === 'pathological');
    if (existing) return; // Already dispatched

    const alertId = `direct-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newAlert: ClinicalAlert = {
      id: alertId,
      patientId: patient.id,
      patientName: patient.name,
      bedNumber: patient.bedNumber,
      severity: 'pathological',
      title: `EMERGENCY: Pathological CTG on Bed ${patient.bedNumber}`,
      message: `Pathological FHR pattern detected for ${patient.name}. Automated on-call escalation engaged.`,
      morphology: patient.latestPrediction?.morphologyDescription || '',
      timestamp: Date.now(),
      acknowledged: true, // Marks as true so it skips the Actionable Alerts queue
      acknowledgedBy: 'System (Auto-Dispatched)',
      acknowledgedAt: Date.now(),
      escalationLevel: 2,
      escalationTimer: 0,
      escalationLogs: []
    };

    audioTelemetry.setAlarm('pathological');
    this.dispatchEscalation(newAlert, 2); // Dispatch Twilio Tier 2

    this.alerts.unshift(newAlert);
    this.notify();
  }

  /**
   * Triggers or updates a clinical alert for a patient.
   */
  public triggerAlert(patient: Patient, severity: 'suspect' | 'pathological'): ClinicalAlert {
    const existing = this.alerts.find(a => a.patientId === patient.id && !a.acknowledged);
    
    // If already active with same or higher severity, do not duplicate
    if (existing) {
      if (existing.severity === 'suspect' && severity === 'pathological') {
        // Escalate existing alert
        existing.severity = 'pathological';
        existing.title = `CRITICAL: Pathological CTG on Bed ${patient.bedNumber}`;
        existing.message = `Profound FHR abnormality detected for ${patient.name} (${patient.gestationalAge}). Immediate bedside evaluation required.`;
        existing.morphology = patient.latestPrediction.morphologyDescription;
        this.dispatchEscalation(existing, 2);
        this.notify();
      }
      return existing;
    }

    const { primary } = dutyRosterService.getOnDutyTeam();
    const alertId = `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newAlert: ClinicalAlert = {
      id: alertId,
      patientId: patient.id,
      patientName: patient.name,
      bedNumber: patient.bedNumber,
      severity,
      title: severity === 'pathological' 
        ? `EMERGENCY: Pathological CTG on Bed ${patient.bedNumber}` 
        : `ATTENTION: Suspect Tracing on Bed ${patient.bedNumber}`,
      message: severity === 'pathological'
        ? `Pathological deceleration & loss of variability detected for ${patient.name}. Automated on-call escalation engaged.`
        : `Suspect FHR pattern detected for ${patient.name}. Review trending baseline and contraction timing.`,
      morphology: patient.latestPrediction.morphologyDescription,
      timestamp: Date.now(),
      acknowledged: false,
      escalationLevel: severity === 'pathological' ? 2 : 1,
      escalationTimer: severity === 'pathological' ? 45 : 120, // countdown seconds
      escalationLogs: []
    };

    // Initial dispatch
    if (severity === 'pathological') {
      audioTelemetry.setAlarm('pathological');
      this.dispatchEscalation(newAlert, 2); // Push + SMS + Voice
    } else {
      audioTelemetry.setAlarm('suspect');
      this.dispatchEscalation(newAlert, 1); // In-App Push
    }

    this.alerts.unshift(newAlert);
    this.notify();
    return newAlert;
  }

  private dispatchEscalation(alert: ClinicalAlert, level: 1 | 2 | 3) {
    const { primary, backup, tertiary } = dutyRosterService.getOnDutyTeam();
    const targetDoc = level === 1 ? primary : level === 2 ? primary : level === 3 ? backup : tertiary;

    const logEntry: EscalationLogEntry = {
      level,
      levelName: level === 1 ? 'Tier 1: On-Duty In-App Push' : level === 2 ? 'Tier 2: Direct SMS & Automated Voice Call' : 'Tier 3: Backup Registrar & Charge Nurse Escalation',
      timestamp: Date.now(),
      targetDoctorName: targetDoc.name,
      targetDoctorRole: targetDoc.role,
      phoneNumber: targetDoc.phone,
      channel: level === 1 ? 'push' : level === 2 ? 'voice' : 'voice',
      status: 'sent'
    };

    alert.escalationLevel = level;
    alert.escalationLogs.push(logEntry);

    // 1. Web Push Notification
    this.sendBrowserPush(alert.title, alert.message);

    // 2. Dispatches for Tier 2 or 3
    if (level >= 2) {
      // Send SMS
      const smsDispatch: TwilioDispatchRecord = {
        id: `tw-sms-${Date.now()}-${Math.floor(Math.random()*100)}`,
        alertId: alert.id,
        patientName: alert.patientName,
        bedNumber: alert.bedNumber,
        severity: alert.severity,
        type: 'SMS',
        toNumber: targetDoc.phone,
        recipientName: targetDoc.name,
        recipientRole: targetDoc.role,
        content: `[AuraCTG CRITICAL ALERT] Bed ${alert.bedNumber} (${alert.patientName}): Pathological FHR trace. ${alert.morphology}. Escalation Tier ${level}. Ack in dashboard immediately.`,
        timestamp: Date.now(),
        status: 'delivered',
        simulated: true,
      };
      this.twilioDispatches.unshift(smsDispatch);

      // Send real Twilio SMS via Backend
      fetch('/api/notify/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toNumber: targetDoc.phone,
          patientName: alert.patientName,
          bedNumber: alert.bedNumber,
          severity: alert.severity,
          morphology: alert.morphology
        })
      }).catch(err => console.error('Twilio SMS notification failed:', err));

      // Trigger Automated Voice Call Simulation (via real backend endpoint)
      const voiceText = `Emergency Alert from Labor and Delivery Unit 4. Bed ${alert.bedNumber}, patient ${alert.patientName}. Pathological CTG pattern detected. Scalp assessment and immediate bedside intervention required. Escalation tier ${level}.`;
      const voiceDispatch: TwilioDispatchRecord = {
        id: `tw-voice-${Date.now()}-${Math.floor(Math.random()*100)}`,
        alertId: alert.id,
        patientName: alert.patientName,
        bedNumber: alert.bedNumber,
        severity: alert.severity,
        type: 'VOICE',
        toNumber: targetDoc.phone,
        recipientName: targetDoc.name,
        recipientRole: targetDoc.role,
        content: `Outgoing automated voice dispatch to ${targetDoc.phone}`,
        timestamp: Date.now(),
        status: 'completed',
        simulated: true,
        audioTranscript: voiceText
      };
      this.twilioDispatches.unshift(voiceDispatch);

      // Send real Twilio Voice via Backend
      fetch('/api/notify/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toNumber: targetDoc.phone,
          patientName: alert.patientName,
          bedNumber: alert.bedNumber,
          message: voiceText
        })
      }).catch(err => console.error('Twilio Voice notification failed:', err));
    }
  }

  public speakVoiceAlert(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  private sendBrowserPush(title: string, body: string) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icon.png',
            tag: 'aura-ctg-alert'
          });
        } catch (e) {}
      }
    }
  }

  public requestBrowserNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.requestPermission();
    }
    return Promise.resolve('denied');
  }

  public acknowledgeAlert(alertId: string, doctorName: string, actionNote: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    alert.acknowledged = true;
    alert.acknowledgedBy = doctorName;
    alert.acknowledgedAt = Date.now();
    alert.clinicalAction = actionNote;

    this.triggerPagerDutyAlert(`Alert Approved by ${doctorName}`, `Action: ${actionNote}`);

    // Silence alarm if no more unacknowledged pathological alerts
    const remainingPath = this.alerts.some(a => !a.acknowledged && a.severity === 'pathological');
    const remainingSuspect = this.alerts.some(a => !a.acknowledged && a.severity === 'suspect');

    if (!remainingPath && !remainingSuspect) {
      audioTelemetry.setAlarm('none');
    } else if (!remainingPath && remainingSuspect) {
      audioTelemetry.setAlarm('suspect');
    }

    this.notify();
  }

  public clearAllAlerts() {
    this.alerts = [];
    audioTelemetry.setAlarm('none');
    this.notify();
  }

  private startEscalationTicker() {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      let changed = false;
      const now = Date.now();

      for (const alert of this.alerts) {
        if (!alert.acknowledged && alert.severity === 'pathological') {
          if (alert.escalationTimer > 0) {
            alert.escalationTimer -= 1;
            changed = true;
          } else {
            // Timer expired, escalate to next tier if not at max
            if (alert.escalationLevel === 2) {
              alert.escalationLevel = 3;
              alert.escalationTimer = 45; // 45s for tertiary
              this.dispatchEscalation(alert, 3);
              changed = true;
            }
          }
        }
      }

      if (changed) {
        this.notify();
      }
    }, 1000);
  }
}

export const notificationService = new NotificationDeliveryService();
