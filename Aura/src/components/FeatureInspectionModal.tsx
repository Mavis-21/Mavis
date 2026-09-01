import React, { useState } from 'react';

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

  const randomizeData = () => {
    const rand = Math.random();
    if (rand < 0.5) { // Normal
      setASTV(Math.floor(Math.random() * (50 - 20) + 20));
      setDP(0);
      setMean(Math.floor(Math.random() * (150 - 120) + 120));
      setALTV(0);
      setMSTV(Number((Math.random() * (2 - 1) + 1).toFixed(1)));
      setAC(Number((Math.random() * (0.01 - 0.002) + 0.002).toFixed(3)));
    } else if (rand < 0.75) { // Suspect
      setASTV(Math.floor(Math.random() * (80 - 60) + 60));
      setDP(0);
      setMean(Math.floor(Math.random() * (160 - 130) + 130));
      setALTV(Math.floor(Math.random() * (50 - 20) + 20));
      setMSTV(Number((Math.random() * (0.8 - 0.2) + 0.2).toFixed(1)));
      setAC(0);
    } else { // Pathological
      setASTV(Math.floor(Math.random() * (90 - 70) + 70));
      setDP(Number((Math.random() * (0.015 - 0.005) + 0.005).toFixed(3)));
      setMean(Math.floor(Math.random() * (110 - 70) + 70));
      setALTV(Math.floor(Math.random() * (90 - 50) + 50));
      setMSTV(Number((Math.random() * (0.5 - 0) + 0).toFixed(1)));
      setAC(0);
    }
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Helper for rendering sliders
  const SliderInput = ({ label, value, setter, min, max, step }: any) => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-gray-800">{label}</span>
        <span className="text-[11px] font-mono font-bold text-[#0055FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => setter(Number(e.target.value))}
        className="w-full accent-[#0055FF] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      
      {/* Left Panel: Inputs */}
      <div className="flex-1 w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Physiological Parameters</h2>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          Enter real-time CTG data below. The AI will instantly analyze morphological patterns and output clinical risk probabilities.
        </p>

        {/* Top 6 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <SliderInput label="ASTV (%)" value={ASTV} setter={setASTV} min={10} max={90} step={1} />
          <SliderInput label="Prolongued Decel. (DP)" value={DP} setter={setDP} min={0} max={0.015} step={0.001} />
          <SliderInput label="Histogram Mean" value={Mean} setter={setMean} min={50} max={200} step={1} />
          <SliderInput label="ALTV (%)" value={ALTV} setter={setALTV} min={0} max={90} step={1} />
          <SliderInput label="MSTV" value={MSTV} setter={setMSTV} min={0} max={7.0} step={0.1} />
          <SliderInput label="Accelerations (AC)" value={AC} setter={setAC} min={0} max={0.02} step={0.001} />
        </div>

        <button 
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full mt-8 py-3 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:border-[#0055FF] hover:text-[#0055FF] hover:bg-blue-50/50 transition cursor-pointer"
        >
          {advancedOpen ? '- Hide Advanced Metrics' : '+ Expand All 21 Metrics'}
        </button>

        {/* Advanced Metrics */}
        {advancedOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <SliderInput label="Baseline (LB)" value={baseline} setter={setBaseline} min={100} max={180} step={1} />
            <SliderInput label="Fetal Move (FM)" value={fetalMovement} setter={setFetalMovement} min={0} max={0.5} step={0.01} />
            <SliderInput label="Uterine Cont. (UC)" value={uterineContractions} setter={setUterineContractions} min={0} max={0.02} step={0.001} />
            <SliderInput label="Light Dec. (DL)" value={lightDecel} setter={setLightDecel} min={0} max={0.02} step={0.001} />
            <SliderInput label="Severe Dec. (DS)" value={severeDecel} setter={setSevereDecel} min={0} max={0.01} step={0.001} />
            <SliderInput label="MLTV" value={MLTV} setter={setMLTV} min={0} max={50} step={0.1} />
            <SliderInput label="Width" value={Width} setter={setWidth} min={0} max={200} step={1} />
            <SliderInput label="Min" value={Min} setter={setMin} min={50} max={200} step={1} />
            <SliderInput label="Max" value={Max} setter={setMax} min={50} max={250} step={1} />
            <SliderInput label="Peaks" value={Nmax} setter={setNmax} min={0} max={20} step={1} />
            <SliderInput label="Zeroes" value={Nzeros} setter={setNzeros} min={0} max={10} step={1} />
            <SliderInput label="Mode" value={Mode} setter={setMode} min={50} max={200} step={1} />
            <SliderInput label="Median" value={Median} setter={setMedian} min={50} max={200} step={1} />
            <SliderInput label="Variance" value={Variance} setter={setVariance} min={0} max={200} step={1} />
            <SliderInput label="Tendency" value={Tendency} setter={setTendency} min={-1} max={1} step={1} />
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold text-red-800 hover:text-red-950 text-sm">&times;</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-100">
          <button 
            onClick={randomizeData}
            className="flex-1 py-3 px-6 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-100 transition cursor-pointer"
          >
            ↻ Randomize Patient Data
          </button>
          <button 
            onClick={analyze}
            className="flex-1 py-3 px-6 rounded-xl bg-[#0055FF] text-white font-bold text-sm shadow-md shadow-[#0055FF30] hover:bg-blue-700 transition cursor-pointer"
          >
            {isLoading ? 'Running Analysis...' : 'Run AI Assessment'}
          </button>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="w-full xl:w-[480px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
        
        {/* Dynamic Top Border */}
        <div className={`h-1.5 w-full ${
          classCode === 1 ? 'bg-[#34D399]' : classCode === 2 ? 'bg-[#F5A623]' : classCode === 3 ? 'bg-[#F04438]' : 'bg-gray-200'
        }`}></div>

        <div className="p-8 border-b border-gray-100 text-center">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Model Prediction</div>
          <div className={`text-4xl font-bold tracking-tight ${
            classCode === 1 ? 'text-[#34D399]' : classCode === 2 ? 'text-[#F5A623]' : classCode === 3 ? 'text-[#F04438]' : 'text-gray-900'
          }`}>
            {diagnosis}
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4 mb-8">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>Normal (Class 1)</span>
                <span>{(probs.normal * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#34D399] transition-all duration-1000" style={{ width: `${probs.normal * 100}%` }}></div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>Suspect (Class 2)</span>
                <span>{(probs.suspect * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F5A623] transition-all duration-1000" style={{ width: `${probs.suspect * 100}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>Pathological (Class 3)</span>
                <span>{(probs.pathological * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F04438] transition-all duration-1000" style={{ width: `${probs.pathological * 100}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-4">
            <div className="text-[10px] font-bold text-[#0055FF] uppercase tracking-wider mb-2">Clinical Reasoning</div>
            <div className="text-sm text-gray-700 leading-relaxed">{reasoning}</div>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl mb-6">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Suggested Action</div>
            <div className="text-sm font-bold text-gray-900">{action}</div>
          </div>

          <div className="text-[10px] text-gray-400 text-center px-4 leading-relaxed">
            ⚠️ <b>Computer Generated Triage</b><br/>
            This decision support tool utilizes AI to analyze CTG patterns. It does not replace professional medical judgment.
          </div>
        </div>

      </div>

    </div>
  );
};
