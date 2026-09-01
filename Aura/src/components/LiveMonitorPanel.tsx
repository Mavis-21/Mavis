import React, { useRef, useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Activity, 
  Heart, 
  Waves, 
  Radio, 
  Sparkles, 
  Flame, 
  RotateCcw, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sliders, 
  AlertCircle,
  HelpCircle,
  FileText,
  User,
  Clock,
  ArrowLeft,
  ChevronDown,
  Info,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import { CTGDataSample, Patient, TrajectoryType } from '../types';
import { globalSimulator } from '../lib/simulator';
import { audioTelemetry } from '../lib/audioTelemetry';
import { notificationService } from '../lib/notifications';

interface LiveMonitorPanelProps {
  patient: Patient;
  allPatients: Patient[];
  onSelectPatient: (id: string) => void;
  onBackToWard: () => void;
  onUpdateTrajectory: (patientId: string, trajectory: TrajectoryType) => void;
  onOpenExplainability: () => void;
  onOpenAlertModal: () => void;
}

export const LiveMonitorPanel: React.FC<LiveMonitorPanelProps> = ({
  patient,
  allPatients,
  onSelectPatient,
  onBackToWard,
  onUpdateTrajectory,
  onOpenExplainability,
  onOpenAlertModal
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [activeIntervention, setActiveIntervention] = useState<string | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [notesLogged, setNotesLogged] = useState(false);

  // Sync audio telemetry BPM to current patient
  useEffect(() => {
    audioTelemetry.updateBpm(patient.currentFhr);
  }, [patient.currentFhr]);

  // Real-time Canvas Rendering Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI crispness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      const width = rect.width;
      const height = rect.height;

      // 1. Clear background (#0A0A0F)
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, width, height);

      // 2. Oscilloscope Grid Drawing
      // Split into top FHR section (65% height) and bottom UC section (35% height)
      const fhrHeight = height * 0.64;
      const dividerY = fhrHeight;
      const ucHeight = height - dividerY;

      // Grid line styles
      ctx.lineWidth = 1;
      
      // Horizontal FHR calibration grid lines (60, 80, 100, 120, 140, 160, 180, 200 bpm)
      const fhrMin = 50;
      const fhrMax = 210;
      const fhrRange = fhrMax - fhrMin;

      const fhrTicks = [60, 80, 100, 120, 140, 160, 180, 200];
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';

      fhrTicks.forEach(tick => {
        const y = fhrHeight - ((tick - fhrMin) / fhrRange) * fhrHeight;
        
        // Highlight normal zone (110 - 160 bpm)
        if (tick === 120 || tick === 160) {
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        }

        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Label
        ctx.fillStyle = tick >= 110 && tick <= 160 ? 'rgba(52, 211, 153, 0.6)' : 'rgba(255, 255, 255, 0.35)';
        ctx.fillText(`${tick}`, 8, y);
      });

      // Shaded standard normal zone band (110 to 160 bpm)
      const y160 = fhrHeight - ((160 - fhrMin) / fhrRange) * fhrHeight;
      const y110 = fhrHeight - ((110 - fhrMin) / fhrRange) * fhrHeight;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.03)';
      ctx.fillRect(40, y160, width - 40, y110 - y160);

      // Section divider line
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, dividerY);
      ctx.lineTo(width, dividerY);
      ctx.stroke();

      // UC Ticks (0, 25, 50, 75, 100 mmHg)
      const ucTicks = [0, 25, 50, 75, 100];
      ucTicks.forEach(tick => {
        const y = height - (tick / 100) * (ucHeight - 20) - 10;
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.08)';
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.fillText(`${tick}`, 10, y);
      });

      // Vertical time lines (every 50px representing paper speed ~1 cm/min)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 40; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Labels on Y-axis
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('FHR (BPM)', 46, 14);
      ctx.fillStyle = 'rgba(167, 139, 250, 0.8)';
      ctx.fillText('TOCO / UC (mmHg)', 46, dividerY + 16);
      ctx.restore();

      // 3. Draw Waveforms
      const simState = globalSimulator.getPatientState(patient.id);
      const samples: CTGDataSample[] = simState ? simState.sampleBuffer : [];

      if (samples.length > 1) {
        const plotAreaWidth = width - 45;
        const startX = 45;
        const totalSamples = samples.length;
        const stepX = plotAreaWidth / Math.max(1, totalSamples - 1);

        // Determine FHR Color based on current predicted classification
        const predClass = patient.latestPrediction.predictedClass;
        let fhrColor = '#34D399'; // Mint green (Normal)
        let fhrGlow = 'rgba(52, 211, 153, 0.35)';

        if (predClass === 2) {
          fhrColor = '#F5A623'; // Amber (Suspect)
          fhrGlow = 'rgba(245, 166, 35, 0.4)';
        } else if (predClass === 3) {
          fhrColor = '#F04438'; // Red (Pathological)
          fhrGlow = 'rgba(240, 68, 56, 0.5)';
        }

        // Draw FHR Trace (with glow)
        ctx.save();
        ctx.shadowColor = fhrGlow;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = fhrColor;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        samples.forEach((sample, i) => {
          const x = startX + i * stepX;
          const clampedFhr = Math.max(fhrMin, Math.min(fhrMax, sample.fhr));
          const y = fhrHeight - ((clampedFhr - fhrMin) / fhrRange) * fhrHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();

        // Draw Lead-edge pulsing cursor for FHR
        const lastIdx = samples.length - 1;
        const lastX = startX + lastIdx * stepX;
        const lastFhrClamped = Math.max(fhrMin, Math.min(fhrMax, samples[lastIdx].fhr));
        const lastY = fhrHeight - ((lastFhrClamped - fhrMin) / fhrRange) * fhrHeight;

        ctx.fillStyle = fhrColor;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pulse ring
        ctx.strokeStyle = fhrColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 7 + Math.sin(Date.now() * 0.008) * 3, 0, Math.PI * 2);
        ctx.stroke();

        // Draw UC Trace (fixed violet #A78BFA)
        ctx.save();
        ctx.shadowColor = 'rgba(167, 139, 250, 0.4)';
        ctx.shadowBlur = 5;
        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth = 2.0;
        ctx.beginPath();

        samples.forEach((sample, i) => {
          const x = startX + i * stepX;
          const clampedUc = Math.max(0, Math.min(100, sample.uc));
          const y = height - (clampedUc / 100) * (ucHeight - 20) - 10;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();

        // Fill subtle gradient under UC wave
        ctx.save();
        ctx.fillStyle = 'rgba(167, 139, 250, 0.08)';
        ctx.beginPath();
        samples.forEach((sample, i) => {
          const x = startX + i * stepX;
          const clampedUc = Math.max(0, Math.min(100, sample.uc));
          const y = height - (clampedUc / 100) * (ucHeight - 20) - 10;
          if (i === 0) ctx.moveTo(x, height - 10);
          ctx.lineTo(x, y);
        });
        ctx.lineTo(lastX, height - 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [patient, isPaused]);

  const handleInject = (eventType: 'cord-compression' | 'hyperstimulation' | 'recovery' | 'prolonged-decel') => {
    setActiveIntervention(eventType);
    globalSimulator.injectEvent(patient.id, eventType);
    if (eventType === 'recovery') {
      onUpdateTrajectory(patient.id, 'normal');
    } else if (eventType === 'cord-compression' || eventType === 'prolonged-decel') {
      onUpdateTrajectory(patient.id, 'pathological');
    }
  };

  const handleSaveNotes = () => {
    if (!clinicalNotes.trim()) return;
    setNotesLogged(true);
    setTimeout(() => setNotesLogged(false), 3000);
  };

  const pred = patient.latestPrediction;
  const isNormal = pred.predictedClass === 1;
  const isSuspect = pred.predictedClass === 2;
  const isPathological = pred.predictedClass === 3;

  return (
    <div id="live-waveform-monitor-panel" className="bg-[#0A0A0F] text-slate-200 rounded-xl p-4 sm:p-6 border border-[#1A1A24] shadow-2xl space-y-5 font-mono-monitor geometric-dot-grid relative">
      
      {/* Top Bar: Bed Navigator & Hero Classification Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1A1A24]">
        
        {/* Left: Bed Selector Dropdown & Patient Metadata */}
        <div className="flex items-center gap-3">
          <button
            id="monitor-back-btn"
            onClick={onBackToWard}
            className="p-2 rounded-lg bg-[#12121A] hover:bg-[#1C1C28] border border-[#272738] text-slate-300 transition cursor-pointer"
            title="Back to Central Ward Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <select
              id="bed-selector-dropdown"
              value={patient.id}
              onChange={(e) => onSelectPatient(e.target.value)}
              className="bg-[#12121A] text-white font-mono font-bold text-sm sm:text-base border border-[#272738] rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0055FF] cursor-pointer"
            >
              {allPatients.map(p => (
                <option key={p.id} value={p.id}>
                  BED {p.bedNumber} : {p.name} ({p.gestationalAge})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>


        </div>

        {/* Center: Classification Badges as required by Design System */}
        <div className="flex items-center gap-2 bg-[#06060A] p-1.5 rounded-lg border border-[#1A1A24]">
          
          {/* Normal Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
            isNormal 
              ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/40 shadow-[0_0_12px_rgba(52,211,153,0.25)]' 
              : 'text-slate-600 opacity-40'
          }`}>
            <span className={`w-2 h-2 rounded-full bg-[#34D399] ${isNormal ? 'shadow-[0_0_8px_#34D399]' : ''}`}></span>
            <span>NORMAL</span>
          </div>

          {/* Suspect Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
            isSuspect 
              ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/40 shadow-[0_0_12px_rgba(245,166,35,0.25)]' 
              : 'text-slate-600 opacity-40'
          }`}>
            <span className={`w-2 h-2 rounded-full bg-[#F5A623] ${isSuspect ? 'shadow-[0_0_8px_#F5A623]' : ''}`}></span>
            <span>SUSPECT</span>
          </div>

          {/* Pathological Badge */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
              isPathological 
                ? 'bg-[#F04438]/20 text-[#F04438] border border-[#F04438]/50 shadow-[0_0_15px_rgba(240,68,56,0.35)] animate-pulse' 
                : 'text-slate-600 opacity-40'
            }`}>
              <span className={`w-2 h-2 rounded-full bg-[#F04438] ${isPathological ? 'shadow-[0_0_8px_#F04438]' : ''}`}></span>
              <span>PATHOLOGICAL</span>
            </div>
            
            {isPathological && (
              <span className="text-xs text-[#F04438] font-bold animate-pulse flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Doctor has been notified
              </span>
            )}
          </div>

        </div>

        {/* Right Action: Explainability & Alert Modal Button */}
        <div className="flex items-center gap-2">


          {isPathological && (
            <button
              onClick={onOpenAlertModal}
              className="flex items-center gap-1.5 bg-[#F04438] hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer animate-alert-glow"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Acknowledge Escalation</span>
            </button>
          )}
        </div>

      </div>

      {/* Hero Live Readout Box */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#06060A]/90 p-4 rounded-xl border border-[#1A1A24]">
        
        {/* BPM Box */}
        <div className="flex items-center gap-3 bg-[#0A0A0F] p-3 rounded-lg border border-[#1A1A24]">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${
            isNormal ? 'bg-[#34D399]/15 text-[#34D399]' : isSuspect ? 'bg-[#F5A623]/15 text-[#F5A623]' : 'bg-[#F04438]/20 text-[#F04438]'
          }`}>
            <Heart className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
              CURRENT FHR
            </div>
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              isNormal ? 'text-[#34D399]' : isSuspect ? 'text-[#F5A623]' : 'text-[#F04438]'
            }`}>
              {patient.currentFhr} <span className="text-xs text-slate-400 font-normal">BPM</span>
            </div>
          </div>
        </div>

        {/* ASTV % Box */}
        <div className="flex items-center gap-3 bg-[#0A0A0F] p-3 rounded-lg border border-[#1A1A24]">
          <div className="w-11 h-11 rounded-lg bg-blue-950/50 text-[#0055FF] flex items-center justify-center border border-blue-900/50">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
              ASTV VARIABILITY
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {pred.riskFactors.find(r => r.feature === 'ASTV')?.value ?? 22} <span className="text-xs text-slate-400 font-normal">%</span>
            </div>
          </div>
        </div>

        {/* Morphology Diagnosis (Spans 2 columns on desktop) */}
        <div className="md:col-span-2 bg-[#0A0A0F] p-3 rounded-lg border border-[#1A1A24] flex flex-col justify-center">
          <div className="text-[9px] uppercase tracking-widest text-[#0055FF] font-bold mb-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>FIGO MORPHOLOGY INTERPRETATION</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-mono">
            {pred.morphologyDescription}
          </p>
        </div>

      </div>

      {/* Real-Time Canvas Stage */}
      <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-[#1A1A24] bg-[#0A0A0F]">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Calibration Watermark */}
        <div className="absolute right-3 bottom-3 text-[10px] text-slate-600 font-mono pointer-events-none flex items-center gap-2">
          <span>PAPER: 1cm/min</span>
          <span>•</span>
          <span>ULTRASOUND 1.1MHz</span>
          <span>•</span>
          <span>DSP FILTER: 0.8-3.0Hz</span>
        </div>
      </div>



    </div>
  );
};
