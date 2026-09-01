import React from 'react';
import { 
  Cpu, 
  Layers, 
  ShieldAlert, 
  Radio, 
  GitBranch, 
  Database, 
  Activity, 
  MessageSquare,
  CheckCircle2,
  Code
} from 'lucide-react';

export const ArchitectureInfoModal: React.FC = () => {
  return (
    <div id="architecture-container" className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B0B14] tracking-tight uppercase">
              AuraCTG System Architecture & <span className="font-serif-accent text-[#0055FF] italic font-normal text-2xl sm:text-3xl capitalize">Model Specs</span>
            </h1>
            <span className="bg-blue-50 text-[#0055FF] border border-blue-200/80 text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Full-Stack Pipeline
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-3xl leading-relaxed">
            Overview of the 7 decoupled architectural micro-services powering real-time CTG telemetry, 21-feature extraction, gradient boosting inference, and dynamic on-duty routing.
          </p>
        </div>

        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs font-mono">
          MODEL: <code className="font-bold text-[#0055FF]">family_b_gradient_boosting.joblib</code>
        </div>
      </div>

      {/* 7 Core Pipeline Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Module 1 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0055FF] flex items-center justify-center font-bold font-mono text-sm border border-blue-100">
            01
          </div>
          <h3 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">CTG Signal Simulator</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            High-fidelity physiological synthesizer generating 4Hz FHR baseline fluctuations, autonomic beat-to-beat variability (STV/LTV), and non-linear uterine contraction bell curves across 3 dynamic patient trajectories.
          </p>
          <div className="text-[10px] font-mono text-[#0055FF] bg-blue-50/60 border border-blue-100 p-2 rounded-md">
            <code>src/lib/simulator.ts</code>
          </div>
        </div>

        {/* Module 2 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#A78BFA] flex items-center justify-center font-bold font-mono text-sm border border-purple-100">
            02
          </div>
          <h3 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">21-Feature Extraction</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Sliding rolling window extracting the 21 FIGO standard CTG metrics including baseline (LB), ASTV, ALTV, prolonged decelerations (DP), light decelerations (DL), and histogram variance.
          </p>
          <div className="text-[10px] font-mono text-purple-700 bg-purple-50/60 border border-purple-100 p-2 rounded-md">
            <code>src/lib/featureExtractor.ts</code>
          </div>
        </div>

        {/* Module 3 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#34D399] flex items-center justify-center font-bold font-mono text-sm border border-emerald-100">
            03
          </div>
          <h3 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">Gradient Boosting Inference</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Direct reproduction of <code>family_b_gradient_boosting.joblib</code> evaluating decision tree ensemble boundaries and outputting calibrated softmax probability vectors across Normal, Suspect, and Pathological classes.
          </p>
          <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50/60 border border-emerald-100 p-2 rounded-md">
            <code>src/lib/inference.ts</code>
          </div>
        </div>

        {/* Module 4 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-[#F5A623] flex items-center justify-center font-bold font-mono text-sm border border-amber-100">
            04
          </div>
          <h3 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">Alert Decision Engine</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            State-machine managing tiered escalation (Tier 1: Push, Tier 2: SMS+Voice, Tier 3: Backup auto-escalation on 45s timeout) with mandatory clinician acknowledgment logging.
          </p>
          <div className="text-[10px] font-mono text-amber-700 bg-amber-50/60 border border-amber-100 p-2 rounded-md">
            <code>src/lib/notifications.ts</code>
          </div>
        </div>

        {/* Module 5 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0055FF] flex items-center justify-center font-bold font-mono text-sm border border-blue-100">
            05
          </div>
          <h3 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">Duty Roster & On-Call Routing</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Dynamic shift resolver mapping ward + current timestamp to active primary attending, backup registrar, and charge nurse contacts with fallback escalation chaining.
          </p>
          <div className="text-[10px] font-mono text-[#0055FF] bg-blue-50/60 border border-blue-100 p-2 rounded-md">
            <code>src/lib/dutyRoster.ts</code>
          </div>
        </div>

        {/* Module 6 & 7 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-[#F04438] flex items-center justify-center font-bold font-mono text-sm border border-red-100">
            06/07
          </div>
          <h3 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">Live Dark Oscilloscope & Twilio</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Dedicated dark `#0A0A0F` canvas monitor with monospace typography, mint/amber/red color shifts, and full Twilio SMS/Voice dispatch terminal with simulated voice playback.
          </p>
          <div className="text-[10px] font-mono text-[#F04438] bg-red-50/60 border border-red-100 p-2 rounded-md">
            <code>src/components/LiveMonitorPanel.tsx</code>
          </div>
        </div>

      </div>

      {/* Medical Disclaimer Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 text-amber-900 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-[#F5A623] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-amber-950 text-sm uppercase tracking-wide">Regulatory Notice: Experimental Clinical Decision-Support Prototype</h4>
          <p className="leading-relaxed text-amber-800/90">
            This prototype is designed exclusively for hackathon evaluation and demonstration of machine learning feature pipelines and automated hospital escalation routing. It does not constitute medical advice or a certified medical device under FDA or CE Mark regulations.
          </p>
        </div>
      </div>

    </div>
  );
};
