import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  MessageSquare, 
  Smartphone, 
  Volume2, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Radio, 
  Play, 
  Square,
  AlertTriangle,
  Zap,
  PhoneForwarded,
  UserCheck
} from 'lucide-react';
import { TwilioDispatchRecord } from '../types';
import { notificationService } from '../lib/notifications';
import { dutyRosterService } from '../lib/dutyRoster';

export const TwilioSimulationDrawer: React.FC = () => {
  const [dispatches, setDispatches] = useState<TwilioDispatchRecord[]>(notificationService.getTwilioDispatches());
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [targetPhone, setTargetPhone] = useState(dutyRosterService.getOnDutyTeam().primary.phone);

  useEffect(() => {
    const unsub = notificationService.subscribe(() => {
      setDispatches(notificationService.getTwilioDispatches());
    });
    return unsub;
  }, []);

  const handlePlayVoice = (record: TwilioDispatchRecord) => {
    if (record.audioTranscript) {
      setIsPlayingAudio(record.id);
      notificationService.speakVoiceAlert(record.audioTranscript);
      setTimeout(() => setIsPlayingAudio(null), 8000);
    }
  };

  const handleSendCustomSMS = () => {
    if (!customMsg.trim()) return;
    const { primary } = dutyRosterService.getOnDutyTeam();
    const newRecord: TwilioDispatchRecord = {
      id: `manual-tw-${Date.now()}`,
      alertId: 'manual',
      patientName: 'Simulated Broadcast',
      bedNumber: '03',
      severity: 'pathological',
      type: 'SMS',
      toNumber: targetPhone,
      recipientName: primary.name,
      recipientRole: primary.role,
      content: customMsg,
      timestamp: Date.now(),
      status: 'delivered',
      simulated: true
    };
    notificationService.getTwilioDispatches().unshift(newRecord);
    setDispatches([...notificationService.getTwilioDispatches()]);
    setCustomMsg('');
  };

  return (
    <div id="twilio-hub-container" className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B0B14] tracking-tight uppercase">
              Twilio SMS & Automated Voice <span className="font-serif-accent text-[#0055FF] italic font-normal text-2xl sm:text-3xl capitalize">Dispatch Terminal</span>
            </h1>
            <span className="bg-red-50 text-[#F04438] border border-red-200 text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-pulse"></span>
              Live On-Call Pipeline
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-3xl leading-relaxed">
            Simulates automated cellular emergency dispatching. In a live hospital deployment, this routes through Twilio Programmable SMS and Twilio Voice APIs to the active on-duty obstetrician resolved from the duty roster.
          </p>
        </div>

        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-700">
          <div>TWILIO REST PROXY: <span className="text-[#34D399] font-bold">ONLINE (SIMULATED)</span></div>
          <div className="text-[10px] text-gray-400">VOICE SYNTH: Web Speech API TTS</div>
        </div>
      </div>

      {/* Main Grid: Phone Simulator & Dispatch Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Simulated Smartphone Screen (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-xs bg-[#0A0A0F] p-4 rounded-[32px] border-4 border-[#272738] shadow-2xl space-y-3">
            
            {/* Phone Notch & Status */}
            <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-gray-400 font-mono">
              <span>9:41</span>
              <div className="w-16 h-3.5 bg-[#1A1A24] rounded-full"></div>
              <span className="text-[#34D399] text-[10px]">5G • 100%</span>
            </div>

            {/* Simulated Phone Header */}
            <div className="bg-[#12121A] rounded-xl p-3 text-center border border-[#272738]">
              <div className="w-9 h-9 rounded-lg bg-[#0055FF] text-white font-bold text-xs flex items-center justify-center mx-auto mb-1 shadow-md shadow-[#0055FF40]">
                L&D
              </div>
              <div className="font-bold text-xs text-white uppercase tracking-wider">AuraCTG Alert Dispatch</div>
              <div className="text-[10px] text-gray-400 font-mono">{dutyRosterService.getOnDutyTeam().primary.phone}</div>
            </div>

            {/* Message Feed inside Phone */}
            <div className="bg-[#12121A]/80 rounded-xl p-3 h-80 overflow-y-auto space-y-2.5 text-xs font-mono dark-scrollbar border border-[#272738]">
              {dispatches.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
                  <Smartphone className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-[11px]">No active dispatch messages yet. Trigger a Pathological CTG or send a manual test ping.</p>
                </div>
              ) : (
                dispatches.map(rec => (
                  <div 
                    key={rec.id}
                    className={`p-2.5 rounded-lg border ${
                      rec.severity === 'pathological' 
                        ? 'bg-red-950/40 border-red-800/80 text-red-200' 
                        : 'bg-white/5 border-white/10 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1">
                      <span className="font-bold uppercase tracking-wider text-[#0055FF]">
                        {rec.type === 'SMS' ? '💬 SMS DISPATCH' : '📞 VOICE CALL'}
                      </span>
                      <span>{new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <p className="text-[11px] leading-relaxed">
                      {rec.content}
                    </p>

                    {rec.type === 'VOICE' && rec.audioTranscript && (
                      <button
                        onClick={() => handlePlayVoice(rec)}
                        className="mt-2 w-full py-1.5 px-2 rounded bg-[#0055FF] hover:bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition shadow-md shadow-[#0055FF30]"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{isPlayingAudio === rec.id ? 'Speaking...' : 'Play Voice Call Audio'}</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Test Dispatch inside Phone */}
            <div className="pt-1">
              <div className="flex items-center gap-1.5 bg-[#12121A] border border-[#272738] rounded-lg p-1.5">
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Type simulated SMS text..."
                  className="bg-transparent text-[11px] text-white placeholder-gray-500 focus:outline-none w-full px-2 font-mono"
                />
                <button
                  onClick={handleSendCustomSMS}
                  className="p-1.5 rounded-md bg-[#0055FF] hover:bg-blue-600 text-white cursor-pointer transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right: Dispatch Audit Trail Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between space-y-4">
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#0055FF] animate-pulse" />
                <h2 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">
                  Outbound Twilio Dispatch Audit Log
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {dispatches.length} Logs Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5">Time</th>
                    <th className="px-3 py-2.5">Channel</th>
                    <th className="px-3 py-2.5">Recipient (On-Duty)</th>
                    <th className="px-3 py-2.5">Bed / Patient</th>
                    <th className="px-3 py-2.5">Delivery Status</th>
                    <th className="px-3 py-2.5 text-right">Voice Audio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-mono text-[11px]">
                  {dispatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-sans">
                        No automated alerts sent yet. When a patient enters Pathological state, Twilio triggers immediately.
                      </td>
                    </tr>
                  ) : (
                    dispatches.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/80">
                        <td className="px-3 py-3 text-gray-400">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-3 py-3 font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                            item.type === 'SMS' ? 'bg-blue-50 text-[#0055FF] border border-blue-200' : 'bg-purple-50 text-[#A78BFA] border border-purple-200'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-sans">
                          <div className="font-bold text-gray-900">{item.recipientName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{item.toNumber}</div>
                        </td>
                        <td className="px-3 py-3 font-sans">
                          <span className="font-bold text-gray-800">Bed {item.bedNumber}</span>
                          <div className="text-[10px] text-gray-400">{item.patientName}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 text-[#34D399] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" />
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {item.type === 'VOICE' ? (
                            <button
                              onClick={() => handlePlayVoice(item)}
                              className="p-1.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0055FF] border border-blue-200 transition cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                              title="Listen to automated voice synthesized phone call"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Listen</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Twilio Architecture Notes */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-600 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#0055FF] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900">Hospital Escalation Policy: </span>
              If the primary attending does not acknowledge a Pathological alert within 45 seconds, the decision engine automatically re-routes the next voice call to the backup registrar, followed by the floor charge nurse.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
