import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  X, 
  Clock, 
  CheckCircle2, 
  FileText, 
  PhoneCall, 
  Activity, 
  UserCheck,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { ClinicalAlert, Patient } from '../types';
import { notificationService } from '../lib/notifications';
import { dutyRosterService } from '../lib/dutyRoster';

interface ClinicalAlertModalProps {
  alerts: ClinicalAlert[];
  onClose: () => void;
}

export const ClinicalAlertModal: React.FC<ClinicalAlertModalProps> = ({
  alerts,
  onClose
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || '');
  const [clinicalAction, setClinicalAction] = useState<string>('Left lateral tilt, O2 administered, attending evaluated');
  const [selectedClinician, setSelectedClinician] = useState<string>(dutyRosterService.getOnDutyTeam().primary.name);
  const [quickInterventions, setQuickInterventions] = useState<string[]>([
    'Left Lateral Maternal Tilt',
    'Discontinued Oxytocin Infusion'
  ]);

  const activeAlert = alerts.find(a => a.id === selectedAlertId) || alerts[0];

  const toggleIntervention = (item: string) => {
    if (quickInterventions.includes(item)) {
      setQuickInterventions(quickInterventions.filter(i => i !== item));
    } else {
      setQuickInterventions([...quickInterventions, item]);
    }
  };

  const handleAcknowledge = () => {
    if (!activeAlert) return;
    const finalNote = `${quickInterventions.join(', ')}. Details: ${clinicalAction}`;
    notificationService.acknowledgeAlert(activeAlert.id, selectedClinician, finalNote);
    onClose();
  };

  if (!activeAlert) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center space-y-4 border border-slate-200 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">All Clinical Alerts Acknowledged</h3>
          <p className="text-xs text-slate-500">There are no pending unacknowledged alerts in the labor ward queue.</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#0055FF] text-white font-semibold text-xs hover:bg-blue-600 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isPathological = activeAlert.severity === 'pathological';

  return (
    <div id="clinical-alert-modal" className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className={`p-5 text-white flex items-center justify-between ${
          isPathological ? 'bg-[#F04438]' : 'bg-[#F5A623]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              {isPathological ? <Zap className="w-6 h-6 animate-pulse" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-white/90">
                {isPathological ? 'Tier 2/3 Emergency Escalation' : 'Tier 1 In-App Notification'}
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {activeAlert.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Patient Card & Diagnosis */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0B0B14] text-sm uppercase tracking-wide">
                Patient: {activeAlert.patientName} (Bed {activeAlert.bedNumber})
              </span>
              <span className="font-mono text-gray-400">
                Triggered: {new Date(activeAlert.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs font-mono text-gray-800">
              <span className="font-bold text-[#F04438] font-sans uppercase text-[11px]">CTG Pattern: </span>
              {activeAlert.morphology}
            </div>

            {isPathological && (
              <div className="flex items-center justify-between text-xs bg-red-50 p-2.5 rounded-lg border border-red-200 text-red-900">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Clock className="w-4 h-4 text-[#F04438] animate-spin" />
                  Auto-Escalation to Backup Registrar in:
                </span>
                <span className="font-mono font-bold text-base text-[#F04438]">
                  00:{activeAlert.escalationTimer < 10 ? `0${activeAlert.escalationTimer}` : activeAlert.escalationTimer}s
                </span>
              </div>
            )}
          </div>

          {/* Quick Interventions Checklist */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Immediate Clinical Interventions Performed:
            </label>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                'Left Lateral Maternal Tilt',
                'Discontinued Oxytocin Infusion',
                'IV Hartmanns Fluid Bolus 500ml',
                'Maternal O2 (10L Non-Rebreather)',
                'Fetal Scalp Electrode Applied',
                'Attending OB at Bedside'
              ].map((item, idx) => {
                const isSelected = quickInterventions.includes(item);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleIntervention(item)}
                    className={`p-2.5 rounded-lg border text-left font-medium transition cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-300 text-[#0055FF] font-semibold shadow-xs' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0055FF] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clinician Signature & Free Text */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Acknowledging Clinician / Signature:
              </label>
              <select
                value={selectedClinician}
                onChange={(e) => setSelectedClinician(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0055FF]"
              >
                {dutyRosterService.getRoster().map(doc => (
                  <option key={doc.id} value={doc.name}>
                    {doc.name} ({doc.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Clinical Response & Next Plan Notes:
              </label>
              <textarea
                value={clinicalAction}
                onChange={(e) => setClinicalAction(e.target.value)}
                rows={2}
                placeholder="Enter clinical assessment, fetal scalp pH result, or decision for emergency delivery..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0055FF] font-sans"
              ></textarea>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition cursor-pointer"
          >
            Review Waveforms First
          </button>

          <button
            type="button"
            onClick={handleAcknowledge}
            className="px-6 py-2.5 rounded-lg bg-[#0055FF] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md shadow-[#0055FF30]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sign & Acknowledge Alert</span>
          </button>
        </div>

      </div>
    </div>
  );
};
