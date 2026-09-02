import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper for rendering sliders - Moved outside to prevent re-rendering bugs (fluctuating sliders)
const SliderInput = ({ label, value, setter, min, max, step }: any) => (
  <motion.div 
    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
    className="flex flex-col gap-2 p-1"
  >
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <span className="text-[11px] font-mono font-bold text-[#0055FF] bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50 shadow-sm">{value}</span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => setter(Number(e.target.value))}
      className="w-full accent-[#0055FF] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer hover:bg-gray-300 transition"
    />
  </motion.div>
);

export const FeatureInspectionModal: React.FC = () => {
  // Top 6 Features
  const [ASTV, setASTV] = useState(42);
  const [DP, setDP] = useState(0);
  const [Mean, setMean] = useState(134);
  const [ALTV, setALTV] = useState(0);
  const [MSTV, setMSTV] = useState(1.2);
  const [AC, setAC] = useState(0.002);
  
  // Advanced Features
  const [baseline, setBaseline] = useState(133);
  const [fetalMovement, setFetalMovement] = useState(0);
  const [uterineContractions, setUterineContractions] = useState(0.004);
  const [lightDecel, setLightDecel] = useState(0);
  const [severeDecel, setSevereDecel] = useState(0);
  const [MLTV, setMLTV] = useState(7.4);
  const [Width, setWidth] = useState(67);
  const [Min, setMin] = useState(93);
  const [Max, setMax] = useState(160);
  const [Nmax, setNmax] = useState(3);
  const [Nzeros, setNzeros] = useState(0);
  const [Mode, setMode] = useState(136);
  const [Median, setMedian] = useState(137);
  const [Variance, setVariance] = useState(10);
  const [Tendency, setTendency] = useState(0);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Result States
  const [diagnosis, setDiagnosis] = useState('Awaiting Data');
  const [reasoning, setReasoning] = useState('Provide input data to generate diagnostic reasoning based on physiological morphology.');
  const [action, setAction] = useState('--');
  const [probs, setProbs] = useState({ normal: 0, suspect: 0, pathological: 0 });
  const [classCode, setClassCode] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const randomizeData = () => {
    const rand = Math.random();
    if (rand < 0.5) { // Normal
      const lb = Math.floor(Math.random() * (150 - 120) + 120);
      setBaseline(lb);
      setASTV(Math.floor(Math.random() * (45 - 20) + 20));
      setDP(0);
      setMean(lb + Math.floor(Math.random() * 5));
      setALTV(0);
      setMSTV(Number((Math.random() * (2 - 1) + 1).toFixed(1)));
      setAC(Number((Math.random() * (0.01 - 0.002) + 0.002).toFixed(3)));
      setFetalMovement(Number((Math.random() * (0.05 - 0) + 0).toFixed(3)));
      setUterineContractions(Number((Math.random() * (0.006 - 0.002) + 0.002).toFixed(3)));
      setLightDecel(Number((Math.random() * (0.003 - 0) + 0).toFixed(3)));
      setSevereDecel(0);
      setMLTV(Number((Math.random() * (20 - 5) + 5).toFixed(1)));
      setWidth(Math.floor(Math.random() * (100 - 40) + 40));
      setMin(lb - Math.floor(Math.random() * 20));
      setMax(lb + Math.floor(Math.random() * 20));
      setNmax(Math.floor(Math.random() * (6 - 1) + 1));
      setNzeros(0);
      setMode(lb + Math.floor(Math.random() * 4 - 2));
      setMedian(lb + Math.floor(Math.random() * 4 - 2));
      setVariance(Math.floor(Math.random() * (30 - 10) + 10));
      setTendency(0);
    } else if (rand < 0.75) { // Suspect
      const lb = Math.floor(Math.random() * (165 - 150) + 150);
      setBaseline(lb);
      setASTV(Math.floor(Math.random() * (65 - 45) + 45));
      setDP(0);
      setMean(lb);
      setALTV(Math.floor(Math.random() * (45 - 20) + 20));
      setMSTV(Number((Math.random() * (0.8 - 0.3) + 0.3).toFixed(1)));
      setAC(0);
      setFetalMovement(0);
      setUterineContractions(Number((Math.random() * (0.008 - 0.004) + 0.004).toFixed(3)));
      setLightDecel(Number((Math.random() * (0.008 - 0.003) + 0.003).toFixed(3)));
      setSevereDecel(0);
      setMLTV(Number((Math.random() * (10 - 2) + 2).toFixed(1)));
      setWidth(Math.floor(Math.random() * (60 - 20) + 20));
      setMin(lb - Math.floor(Math.random() * 30));
      setMax(lb + Math.floor(Math.random() * 10));
      setNmax(Math.floor(Math.random() * (4 - 0) + 0));
      setNzeros(Math.floor(Math.random() * 2));
      setMode(lb - Math.floor(Math.random() * 10));
      setMedian(lb - Math.floor(Math.random() * 5));
      setVariance(Math.floor(Math.random() * (50 - 20) + 20));
      setTendency(-1);
    } else { // Pathological
      const lb = Math.floor(Math.random() * (110 - 80) + 80);
      setBaseline(lb);
      setASTV(Math.floor(Math.random() * (90 - 70) + 70));
      setDP(Number((Math.random() * (0.015 - 0.005) + 0.005).toFixed(3)));
      setMean(lb - 10);
      setALTV(Math.floor(Math.random() * (90 - 50) + 50));
      setMSTV(Number((Math.random() * (0.5 - 0) + 0).toFixed(1)));
      setAC(0);
      setFetalMovement(0);
      setUterineContractions(Number((Math.random() * (0.012 - 0.006) + 0.006).toFixed(3)));
      setLightDecel(0);
      setSevereDecel(Number((Math.random() * (0.01 - 0.003) + 0.003).toFixed(3)));
      setMLTV(Number((Math.random() * (5 - 0) + 0).toFixed(1)));
      setWidth(Math.floor(Math.random() * (150 - 80) + 80));
      setMin(lb - Math.floor(Math.random() * 60));
      setMax(lb + Math.floor(Math.random() * 5));
      setNmax(0);
      setNzeros(0);
      setMode(lb - Math.floor(Math.random() * 20));
      setMedian(lb - Math.floor(Math.random() * 15));
      setVariance(Math.floor(Math.random() * (100 - 50) + 50));
      setTendency(-1);
    }
  };

  const analyze = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const payload = {
      ASTV, DP, Mean, ALTV, MSTV, AC,
      baseline_value: baseline,
      fetal_movement: fetalMovement,
      uterine_contractions: uterineContractions,
      light_decelerations: lightDecel,
      severe_decelerations: severeDecel,
      MLTV, Width, Min, Max, Nmax, Nzeros, Mode, Median, Variance, Tendency
    };

    try {
      const res = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      
      setDiagnosis(data.diagnosis);
      setReasoning(data.clinical_reasoning);
      setAction(data.suggested_action);
      setProbs({
        normal: data.risk_probabilities?.Normal ?? 0,
        suspect: data.risk_probabilities?.Suspect ?? 0,
        pathological: data.risk_probabilities?.Pathological ?? 0
      });
      setClassCode(data.class_code);
    } catch (err: any) {
      console.error("AI Assessment error:", err);
      setErrorMessage(err.message || "Failed to connect to backend");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start pb-10">
      
      {/* Left Column */}
      <div className="flex-1 w-full flex flex-col gap-6">
        
        {/* Card 1: Inputs */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/20 p-6 sm:p-8"
        >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Physiological Parameters</h2>
          <span className="bg-[#0B0D13] text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest shadow-sm">Demo Mode</span>
        </div>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xl">
          Enter real-time CTG data below or randomize inputs. The AI will instantly analyze morphological patterns and output clinical risk probabilities based on the Hammacher Gradient Boosting model.
        </p>

        {/* Top 6 Features */}
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <SliderInput label="ASTV (%)" value={ASTV} setter={setASTV} min={10} max={90} step={1} />
          <SliderInput label="Prolonged Decel. (DP)" value={DP} setter={setDP} min={0} max={0.015} step={0.001} />
          <SliderInput label="Histogram Mean" value={Mean} setter={setMean} min={50} max={200} step={1} />
          <SliderInput label="ALTV (%)" value={ALTV} setter={setALTV} min={0} max={90} step={1} />
          <SliderInput label="MSTV" value={MSTV} setter={setMSTV} min={0} max={7.0} step={0.1} />
          <SliderInput label="Accelerations (AC)" value={AC} setter={setAC} min={0} max={0.02} step={0.001} />
        </motion.div>

        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full mt-8 py-3.5 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:border-[#2A55FF] hover:text-[#2A55FF] hover:bg-[#2A55FF]/5 transition-all cursor-pointer"
        >
          {advancedOpen ? '− Hide Advanced Metrics' : '+ Expand All 21 Metrics'}
        </motion.button>

        {/* Advanced Metrics */}
        <AnimatePresence>
          {advancedOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 p-6 bg-gray-50/80 rounded-xl border border-gray-200/60 shadow-inner">
                <SliderInput label="Baseline (LB)" value={baseline} setter={setBaseline} min={100} max={180} step={1} />
                <SliderInput label="Fetal Move (FM)" value={fetalMovement} setter={setFetalMovement} min={0} max={0.5} step={0.01} />
                <SliderInput label="Uterine Cont. (UC)" value={uterineContractions} setter={setUterineContractions} min={0} max={0.02} step={0.001} />
                <SliderInput label="Light Dec. (DL)" value={lightDecel} setter={setLightDecel} min={0} max={0.02} step={0.001} />
                <SliderInput label="Severe Dec. (DS)" value={severeDecel} setter={setSevereDecel} min={0} max={0.01} step={0.001} />
                <SliderInput label="MLTV" value={MLTV} setter={setMLTV} min={0} max={50} step={0.1} />
                <SliderInput label="Width" value={Width} setter={setWidth} min={0} max={200} step={1} />
                <SliderInput label="Min" value={Min} setter={setMin} min={50} max={200} step={1} />
                <SliderInput label="Max" value={Max} setter={setMax} min={50} max={250} step={1} />
                <SliderInput label="Peaks (Nmax)" value={Nmax} setter={setNmax} min={0} max={20} step={1} />
                <SliderInput label="Zeroes (Nzeros)" value={Nzeros} setter={setNzeros} min={0} max={10} step={1} />
                <SliderInput label="Mode" value={Mode} setter={setMode} min={50} max={200} step={1} />
                <SliderInput label="Median" value={Median} setter={setMedian} min={50} max={200} step={1} />
                <SliderInput label="Variance" value={Variance} setter={setVariance} min={0} max={200} step={1} />
                <SliderInput label="Tendency" value={Tendency} setter={setTendency} min={-1} max={1} step={1} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between shadow-sm">
            <span className="font-medium">⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold text-red-800 hover:text-red-950 text-lg leading-none">&times;</button>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-gray-100">
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={randomizeData}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gray-100/80 hover:bg-gray-200 border border-gray-200/60 text-gray-700 font-bold text-sm transition-all cursor-pointer shadow-sm"
          >
            ↻ Randomize Patient Data
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={analyze}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#2A55FF] to-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all cursor-pointer"
          >
            {isLoading ? 'Running Analysis...' : 'Run AI Assessment'}
          </motion.button>
        </div>
      </motion.div>

      {/* Card 2: Confusion Matrix (Moved to left column for layout balance) */}
      <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/20 p-6 sm:p-8"
        >
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-[13px] font-bold text-[#0B0D13] uppercase tracking-widest">Model Evaluation</h3>
              <p className="text-[11px] font-medium text-gray-500 mt-1 uppercase tracking-wider">Held-out Test Split Performance</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#2A55FF] tracking-tight">0.92</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Macro F1 Score</div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  <th colSpan={3} className="p-2 font-bold text-gray-600 uppercase tracking-widest border-b border-gray-200 text-[10px]">Predicted Class</th>
                </tr>
                <tr>
                  <th className="p-2 font-bold text-gray-600 uppercase tracking-widest border-r border-gray-200 text-[10px]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} rowSpan={4}>True Class</th>
                  <th className="p-2 font-bold text-gray-500 w-1/3">Normal</th>
                  <th className="p-2 font-bold text-gray-500 w-1/3">Suspect</th>
                  <th className="p-2 font-bold text-gray-500 w-1/3">Patho</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="p-2 font-bold text-gray-500 text-right pr-4">Normal</th>
                  <td className="p-3 bg-[#2A55FF] text-white font-bold border border-white text-sm shadow-inner rounded-tl-lg">1624</td>
                  <td className="p-3 bg-blue-100 text-blue-900 font-semibold border border-white">21</td>
                  <td className="p-3 bg-gray-50 text-gray-400 font-semibold border border-white rounded-tr-lg">4</td>
                </tr>
                <tr>
                  <th className="p-2 font-bold text-gray-500 text-right pr-4">Suspect</th>
                  <td className="p-3 bg-blue-100 text-blue-900 font-semibold border border-white">28</td>
                  <td className="p-3 bg-blue-500 text-white font-bold border border-white text-sm shadow-inner">245</td>
                  <td className="p-3 bg-blue-50 text-blue-800 font-semibold border border-white">14</td>
                </tr>
                <tr>
                  <th className="p-2 font-bold text-gray-500 text-right pr-4">Patho</th>
                  <td className="p-3 bg-gray-50 text-gray-400 font-semibold border border-white rounded-bl-lg">2</td>
                  <td className="p-3 bg-blue-100 text-blue-900 font-semibold border border-white">31</td>
                  <td className="p-3 bg-[#2A55FF] text-white font-bold border border-white text-sm shadow-inner rounded-br-lg">157</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Right Column: Results */}
      <div className="w-full xl:w-[500px] flex flex-col gap-6 sticky top-6">
        
        {/* Results Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/20 overflow-hidden"
        >
          {/* Dynamic Top Border */}
          <div className={`h-2 w-full transition-colors duration-500 ${
            classCode === 1 ? 'bg-[#34D399]' : classCode === 2 ? 'bg-[#F5A623]' : classCode === 3 ? 'bg-[#D9534F]' : 'bg-gray-200'
          }`}></div>

          <div className="p-8 border-b border-gray-100/60 text-center bg-gradient-to-b from-gray-50/50 to-white">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Model Prediction</div>
            <motion.div 
              key={diagnosis}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-4xl font-bold tracking-tight ${
                classCode === 1 ? 'text-[#34D399]' : classCode === 2 ? 'text-[#F5A623]' : classCode === 3 ? 'text-[#D9534F]' : 'text-gray-900'
              }`}
            >
              {diagnosis}
            </motion.div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="space-y-5 mb-8">
              {[
                { label: 'Normal (Class 1)', value: probs.normal, color: 'bg-[#34D399]' },
                { label: 'Suspect (Class 2)', value: probs.suspect, color: 'bg-[#F5A623]' },
                { label: 'Pathological (Class 3)', value: probs.pathological, color: 'bg-[#D9534F]' }
              ].map((p) => (
                <div key={p.label} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <span>{p.label}</span>
                    <span>{(p.value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${p.value * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${p.color}`}
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#2A55FF]/5 border border-[#2A55FF]/20 p-5 rounded-xl mb-4">
              <div className="text-[10px] font-bold text-[#2A55FF] uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2A55FF]"></span>
                Clinical Reasoning
              </div>
              <div className="text-sm text-gray-800 leading-relaxed font-medium">{reasoning}</div>
            </div>

            <div className="bg-[#151B21] border border-gray-800 p-5 rounded-xl mb-6 shadow-md">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D0D0D0]"></span>
                Suggested Action
              </div>
              <div className="text-sm font-bold text-[#D0D0D0] leading-snug">{action}</div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
};
