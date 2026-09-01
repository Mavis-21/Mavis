import React from 'react';
import { AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div id="disclaimer-banner" className="w-full bg-amber-50/80 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-900 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2 max-w-5xl">
        <ShieldAlert className="w-4 h-4 text-[#F5A623] shrink-0" />
        <span className="font-bold text-amber-950 uppercase tracking-wide text-[11px]">HACKATHON DECISION-SUPPORT PROTOTYPE:</span>
        <span className="text-amber-900/90 text-xs">
          Experimental clinical decision-support demonstration extending the gradient boosting model (<code className="bg-amber-100/90 px-1 py-0.5 rounded text-[10px] font-mono font-bold text-amber-950">family_b_gradient_boosting.joblib</code>). All telemetry and escalation channels simulated.
        </span>
      </div>
      <div className="hidden md:flex items-center gap-2 font-mono text-[10px] text-amber-900 font-bold bg-amber-100/70 px-2.5 py-1 rounded border border-amber-200 uppercase tracking-wider">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span>
        MODEL RUNTIME: GRADIENT_BOOST_V1.4
      </div>
    </div>
  );
};

