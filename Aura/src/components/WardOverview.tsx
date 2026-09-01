import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Activity, 
  Clock, 
  ArrowUpRight, 
  Heart, 
  Waves, 
  Flame, 
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Patient, TrajectoryType } from '../types';

interface WardOverviewProps {
  patients: Patient[];
  onSelectBed: (bedId: string) => void;
  onUpdateTrajectory: (patientId: string, trajectory: TrajectoryType) => void;
  onOpenAlertModalForPatient: (patient: Patient) => void;
}

export const WardOverview: React.FC<WardOverviewProps> = ({
  patients,
  onSelectBed,
  onUpdateTrajectory,
  onOpenAlertModalForPatient
}) => {
  const [filter, setFilter] = useState<'all' | 'normal' | 'suspect' | 'pathological'>('all');

  const filteredPatients = patients.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'normal') return p.latestPrediction.predictedClass === 1;
    if (filter === 'suspect') return p.latestPrediction.predictedClass === 2;
    if (filter === 'pathological') return p.latestPrediction.predictedClass === 3;
    return true;
  });

  const countNormal = patients.filter(p => p.latestPrediction.predictedClass === 1).length;
  const countSuspect = patients.filter(p => p.latestPrediction.predictedClass === 2).length;
  const countPathological = patients.filter(p => p.latestPrediction.predictedClass === 3).length;

  return (
    <div id="ward-overview-container" className="space-y-6">
      
      {/* Top Ward Header / Stats Banner */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B0B14] tracking-tight uppercase">
              Labor & Delivery <span className="font-serif-accent text-[#0055FF] italic font-normal text-2xl sm:text-3xl capitalize">Central Ward</span>
            </h1>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
              Live Telemetry 4Hz
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
            Multi-bed cardiotocography monitoring with gradient boosting risk stratification (Family B) and automatic clinical escalation routing.
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-lg border border-gray-200 self-start md:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              filter === 'all' ? 'bg-white text-[#0B0B14] shadow-xs border border-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Beds ({patients.length})
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'normal' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold' : 'text-emerald-700 hover:bg-emerald-50/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]"></span>
            <span>Normal ({countNormal})</span>
          </button>
          <button
            onClick={() => setFilter('suspect')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'suspect' ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold' : 'text-amber-700 hover:bg-amber-50/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]"></span>
            <span>Suspect ({countSuspect})</span>
          </button>
          <button
            onClick={() => setFilter('pathological')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'pathological' ? 'bg-red-50 text-red-900 border border-red-200 font-bold' : 'text-red-700 hover:bg-red-50/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-pulse"></span>
            <span>Pathological ({countPathological})</span>
          </button>
        </div>
      </div>

      {/* Beds Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {filteredPatients.map((patient, index) => {
          const pred = patient.latestPrediction;
          const isNormal = pred.predictedClass === 1;
          const isSuspect = pred.predictedClass === 2;
          const isPathological = pred.predictedClass === 3;

          const badgeStyle = isNormal 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : isSuspect
            ? 'bg-amber-50 text-amber-900 border-amber-200'
            : 'bg-red-50 text-red-900 border-red-200';

          const cardBorder = isPathological 
            ? 'border-red-300 ring-2 ring-red-500/20'
            : isSuspect
            ? 'border-amber-200'
            : 'border-gray-100';

          return (
            <motion.div
              key={patient.id}
              id={`bed-card-${patient.id}`}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
              }}
              className={`bg-white rounded-2xl p-5 border ${cardBorder} shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between`}
            >
              <div>
                
                {/* Card Top: Bed Number, Patient Info, Status Badge */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#0B0B14] text-white font-mono font-bold flex items-center justify-center text-xs shadow-xs">
                      {patient.bedNumber}
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-[#0B0B14] leading-tight">
                        {patient.name}
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span className="font-medium text-gray-600">{patient.gestationalAge}</span>
                        <span>•</span>
                        <span>{patient.parity}</span>
                        <span>•</span>
                        <span>{patient.cervicalDilation.split('/')[0]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Classification Badge */}
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 shrink-0 ${badgeStyle}`}>
                    {isNormal && <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>}
                    {isSuspect && <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] shadow-[0_0_8px_#F5A623]"></span>}
                    {isPathological && <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] shadow-[0_0_8px_#F04438] animate-pulse"></span>}
                    <span>{pred.className}</span>
                  </div>
                </div>

                {/* Live Readouts Row */}
                <div className="grid grid-cols-3 gap-2 my-3 text-center">
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                    <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3 text-red-500" />
                      <span>FHR</span>
                    </div>
                    <div className={`font-mono text-lg font-bold tracking-tight mt-0.5 ${
                      isNormal ? 'text-emerald-600' : isSuspect ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {patient.currentFhr} <span className="text-[10px] font-normal text-gray-400">bpm</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                    <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-center gap-1">
                      <Waves className="w-3 h-3 text-purple-500" />
                      <span>TOCO</span>
                    </div>
                    <div className="font-mono text-lg font-bold text-purple-700 tracking-tight mt-0.5">
                      {patient.currentUc} <span className="text-[10px] font-normal text-gray-400">mmHg</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                    <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                      CONFIDENCE
                    </div>
                    <div className="font-mono text-lg font-bold text-[#0B0B14] tracking-tight mt-0.5">
                      {Math.round(pred.confidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* Morphology Summary */}
                <div className="bg-gray-50/90 border border-gray-100 rounded-lg p-2.5 text-xs text-gray-600 mb-3">
                  <span className="font-bold text-[#0B0B14]">FIGO: </span>
                  {pred.morphologyDescription}
                </div>

                {/* High Risk Flags */}
                <div className="flex flex-wrap gap-1 mb-3.5">
                  {patient.highRiskFlags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded border border-gray-200"
                    >
                      {flag}
                    </span>
                  ))}
                </div>

              </div>

              {/* Card Footer: Simulation Switcher & Open Hero Monitor Button */}
              <div className="pt-3 border-t border-gray-100 space-y-2.5">
                
                {/* Trajectory Simulation Switcher */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-gray-400" />
                    Simulate:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateTrajectory(patient.id, 'normal')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                        patient.trajectory === 'normal'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Set trajectory to Normal"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => onUpdateTrajectory(patient.id, 'suspect')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                        patient.trajectory === 'suspect'
                          ? 'bg-[#F5A623] text-gray-950 shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Set trajectory to Suspect drift"
                    >
                      Suspect
                    </button>
                    <button
                      onClick={() => onUpdateTrajectory(patient.id, 'pathological')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                        patient.trajectory === 'pathological'
                          ? 'bg-[#F04438] text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Set trajectory to Pathological event"
                    >
                      Pathological
                    </button>
                  </div>
                </div>

                {/* Hero Button: Open Dark Waveform Monitor */}
                <button
                  id={`open-monitor-btn-${patient.id}`}
                  onClick={() => onSelectBed(patient.id)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#0055FF] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#0055FF30]"
                >
                  <Activity className="w-4 h-4" />
                  <span>Open Live Telemetry Monitor</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>

              </div>
            </motion.div>
          );
        })}
      </motion.div>

    </div>
  );
};
