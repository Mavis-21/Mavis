import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WardOverview } from './components/WardOverview';
import { LiveMonitorPanel } from './components/LiveMonitorPanel';
import { DutyRosterView } from './components/DutyRosterView';
import { FeatureInspectionModal } from './components/FeatureInspectionModal';
import { ClinicalAlertModal } from './components/ClinicalAlertModal';
import { INITIAL_PATIENTS } from './data/mockPatients';
import { Patient, TrajectoryType, ClinicalAlert } from './types';
import { globalSimulator } from './lib/simulator';
import { CTGFeatureExtractor } from './lib/featureExtractor';
import { CTGInferenceEngine } from './lib/inference';
import { notificationService } from './lib/notifications';
import { audioTelemetry } from './lib/audioTelemetry';
import { AnimatePresence, motion } from 'framer-motion';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('bed-3'); // default to Bed 3 (Pathological demo)
  const [activeTab, setActiveTab] = useState<'ward' | 'live-monitor' | 'roster' | 'features'>('ward');
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [alertCounts, setAlertCounts] = useState({ suspect: 0, pathological: 0 });

  const prevClassesRef = useRef<Record<string, number>>({});

  // Subscribe to notification updates
  useEffect(() => {
    const unsub = notificationService.subscribe(() => {
      setAlerts(notificationService.getAlerts());
      setAlertCounts(notificationService.getActiveAlertCount());
    });
    return unsub;
  }, []);

  // Main 0.5Hz Simulation & Real-Time Inference Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setPatients(prevPatients => {
        return prevPatients.map(patient => {
          // 1. Generate next physiological sample from CTG simulator
          const sample = globalSimulator.generateNextSample(patient.id, 2.0);
          
          // 2. Extract 21 CTG features from rolling buffer
          const simState = globalSimulator.getPatientState(patient.id);
          const buffer = simState ? simState.sampleBuffer : [sample];
          const features = CTGFeatureExtractor.extractFeatures(buffer);

          // 3. Run Real-Time Gradient Boosting Inference asynchronously
          CTGInferenceEngine.predict(features).then(prediction => {
            // 4. Alert Decision Engine Check
            const prevClass = prevClassesRef.current[patient.id] || 1;
            const currentClass = prediction.predictedClass;

            // If escalated to suspect or pathological, trigger decision alert
            if (currentClass !== prevClass) {
              prevClassesRef.current[patient.id] = currentClass;
              if (currentClass === 3) {
                // Instantly trigger Twilio tier-2 dispatch without actionable modal
                notificationService.triggerDirectDoctorDispatch(patient);
              } else if (currentClass === 2) {
                notificationService.triggerAlert(
                  { ...patient, latestPrediction: prediction, currentFhr: sample.fhr, currentUc: sample.uc },
                  'suspect'
                );
              }
            }
            
            // Update the specific patient's prediction asynchronously
            setPatients(current => 
              current.map(p => 
                p.id === patient.id ? { ...p, latestPrediction: prediction } : p
              )
            );
          });

          return {
            ...patient,
            currentFhr: sample.fhr,
            currentUc: sample.uc,
            history: [
              ...patient.history.slice(-40),
              {
                timestamp: sample.timestamp,
                fhr: sample.fhr,
                uc: sample.uc,
                classification: patient.latestPrediction?.predictedClass || 1
              }
            ]
          };
        });
      });
    }, 2000); // 0.5Hz realistic sampling update

    return () => clearInterval(interval);
  }, []);

  const handleSelectBed = (bedId: string) => {
    setSelectedPatientId(bedId);
    setActiveTab('live-monitor');
  };

  const handleUpdateTrajectory = (patientId: string, trajectory: TrajectoryType) => {
    globalSimulator.setPatientTrajectory(patientId, trajectory);
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, trajectory } : p));
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  return (
    <div id="app-root-container" className="min-h-screen bg-[#FAFAFA] flex selection:bg-blue-600 selection:text-white">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedBedNumber={selectedPatient.bedNumber} 
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Application Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab as any}
          selectedBedNumber={selectedPatient.bedNumber}
          onOpenAlertModal={() => setIsAlertModalOpen(true)}
          unacknowledgedAlertsCount={alertCounts}
        />

        {/* Main Body Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'ward' && (
              <motion.div
                key="ward"
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <WardOverview
                  patients={patients}
                  onSelectBed={handleSelectBed}
                  onUpdateTrajectory={handleUpdateTrajectory}
                  onOpenAlertModalForPatient={(p) => {
                    setSelectedPatientId(p.id);
                    setIsAlertModalOpen(true);
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'live-monitor' && (
              <motion.div
                key="live-monitor"
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <LiveMonitorPanel
                  patient={selectedPatient}
                  allPatients={patients}
                  onSelectPatient={setSelectedPatientId}
                  onBackToWard={() => setActiveTab('ward')}
                  onUpdateTrajectory={handleUpdateTrajectory}
                  onOpenExplainability={() => setActiveTab('features')}
                  onOpenAlertModal={() => setIsAlertModalOpen(true)}
                />
              </motion.div>
            )}

            {activeTab === 'roster' && (
              <motion.div
                key="roster"
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <DutyRosterView
                  onTestDispatch={(doc) => {
                    setActiveTab('twilio');
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'features' && (
              <motion.div
                key="features"
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <FeatureInspectionModal
                  patient={selectedPatient}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-gray-800 uppercase tracking-wide text-[11px]">AuraCTG Telemetry Prototype</span> • FIGO Guidelines • Gradient Boosting Inference (<code className="font-mono text-[10px] text-[#0055FF] font-bold">family_b_gradient_boosting.joblib</code>)
          </div>
          <div className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
            4Hz Synthesized Telemetry • SHAP Analysis • Automated Cellular Dispatch
          </div>
        </div>
      </footer>

      {/* 5. Clinical Alert Modal */}
      {isAlertModalOpen && (
        <ClinicalAlertModal
          alerts={alerts.filter(a => !a.acknowledged)}
          onClose={() => setIsAlertModalOpen(false)}
        />
      )}

      </div>
    </div>
  );
}
