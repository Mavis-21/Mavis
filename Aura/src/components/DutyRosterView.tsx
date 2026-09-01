import React, { useState } from 'react';
import { AlertCircle, Radio, Send, Users, Clock, Phone, ShieldCheck, ArrowRight, Plus, Edit2, Check, Building2, UserCheck, Layers } from 'lucide-react';
import { DutyDoctor } from '../types';
import { dutyRosterService } from '../lib/dutyRoster';
import { notificationService } from '../lib/notifications';

interface DutyRosterViewProps {
  onTestDispatch?: (doc: DutyDoctor) => void;
}

export const DutyRosterView: React.FC<DutyRosterViewProps> = ({ onTestDispatch }) => {
  const [roster, setRoster] = useState<DutyDoctor[]>(dutyRosterService.getRoster());
  const [simulatedTime, setSimulatedTime] = useState<string>('11:45');
  const [selectedWard, setSelectedWard] = useState<string>('Labor & Delivery - Unit 4');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [testSentDocId, setTestSentDocId] = useState<string | null>(null);

  // Compute on duty team based on selected simulated time
  const onDutyInfo = dutyRosterService.getOnDutyTeam(selectedWard, simulatedTime);

  const handleTimePreset = (timeStr: string) => {
    setSimulatedTime(timeStr);
    dutyRosterService.setSimulatedTime(timeStr);
  };

  const handlePhoneEdit = (id: string, newPhone: string) => {
    const updated = roster.map(d => d.id === id ? { ...d, phone: newPhone } : d);
    setRoster(updated);
    const target = updated.find(d => d.id === id);
    if (target) dutyRosterService.updateDoctor(target);
  };

  const handleSendTestAlert = (doc: DutyDoctor) => {
    setTestSentDocId(doc.id);
    if (onTestDispatch) {
      onTestDispatch(doc);
    }
    notificationService.triggerPagerDutyAlert(`Test Ping for ${doc.name}`, `This is a test dispatch from AuraCTG for ${doc.name}.`);
    setTimeout(() => setTestSentDocId(null), 3000);
  };

  return (
    <div id="duty-roster-container" className="space-y-6">
      
      {/* Top Banner / On-Duty Routing Summary */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B0B14] tracking-tight uppercase">
              Hospital Duty Roster & <span className="font-serif-accent text-[#0055FF] italic font-normal text-2xl sm:text-3xl capitalize">On-Call Routing</span>
            </h1>
            <span className="bg-blue-50 text-[#0055FF] border border-blue-200/80 text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Live Dispatch Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-3xl leading-relaxed">
            Real-time shift matching ensures CTG escalation alerts route directly to the active on-duty physician, auto-escalating down the fallback chain if unacknowledged.
          </p>
        </div>

        {/* Shift Clock Simulator Switcher */}
        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center gap-2 self-start lg:self-auto">
          <Clock className="w-4 h-4 text-gray-400 ml-1" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider text-[10px]">Simulate Shift:</span>
          
          <button
            onClick={() => handleTimePreset('11:45')}
            className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              simulatedTime === '11:45' ? 'bg-[#0055FF] text-white shadow-md shadow-[#0055FF30]' : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Day (11:45 AM)
          </button>
          
          <button
            onClick={() => handleTimePreset('22:30')}
            className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              simulatedTime === '22:30' ? 'bg-[#0055FF] text-white shadow-md shadow-[#0055FF30]' : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Night (10:30 PM)
          </button>
        </div>
      </div>

      {/* Fallback Escalation Chain Hierarchy Card */}
      <div className="bg-[#0A0A0F] text-white rounded-xl p-5 sm:p-6 border border-[#1A1A24] shadow-xl geometric-dot-grid">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#0055FF] animate-pulse" />
            <h2 className="text-base font-bold tracking-tight uppercase">
              Active Escalation Routing: <span className="font-serif-accent text-[#0055FF] capitalize font-normal italic">{onDutyInfo.currentShift}</span>
            </h2>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded">
            WARD: {selectedWard}
          </span>
        </div>

        {/* 3-Tier Escalation Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          
          {/* Tier 1: Primary */}
          <div className="bg-[#12121A] rounded-lg p-4 border border-[#272738] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">
                  Tier 1 & 2: Primary On-Call
                </span>
                <span className="text-xs font-mono text-[#34D399] font-bold">Priority 1</span>
              </div>
              <h3 className="font-bold text-base text-white">{onDutyInfo.primary.name}</h3>
              <p className="text-xs text-gray-400">{onDutyInfo.primary.title}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-blue-200">
              <span>{onDutyInfo.primary.phone}</span>
              <span className="text-[#34D399] text-[9px] uppercase font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                Direct SMS + Voice
              </span>
            </div>
          </div>

          {/* Tier 2: Backup Registrar */}
          <div className="bg-[#12121A] rounded-lg p-4 border border-[#272738] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                  Tier 3 Fallback (+45s)
                </span>
                <span className="text-xs font-mono text-[#F5A623] font-bold">Priority 2</span>
              </div>
              <h3 className="font-bold text-base text-white">{onDutyInfo.backup.name}</h3>
              <p className="text-xs text-gray-400">{onDutyInfo.backup.title}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-amber-200">
              <span>{onDutyInfo.backup.phone}</span>
              <span className="text-[#F5A623] text-[9px] uppercase font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">
                Auto-Escalation
              </span>
            </div>
          </div>

          {/* Tier 3: Charge Midwife Lead */}
          <div className="bg-[#12121A] rounded-lg p-4 border border-[#272738] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                  Floor Lead / Resuscitation
                </span>
                <span className="text-xs font-mono text-purple-400 font-bold">Priority 3</span>
              </div>
              <h3 className="font-bold text-base text-white">{onDutyInfo.tertiary.name}</h3>
              <p className="text-xs text-gray-400">{onDutyInfo.tertiary.title}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-purple-200">
              <span>{onDutyInfo.tertiary.phone}</span>
              <span className="text-purple-300 text-[9px] uppercase font-bold bg-purple-500/20 px-1.5 py-0.5 rounded">
                Rapid Response
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0055FF]" />
            <h3 className="font-bold text-sm text-[#0B0B14] uppercase tracking-wide">
              Obstetric On-Call Roster Database
            </h3>
          </div>
          <span className="text-xs text-gray-400">
            {roster.length} Medical Personnel Configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Clinician Name & Title</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Ward Assignment</th>
                <th className="px-4 py-3">Shift Hours</th>
                <th className="px-4 py-3">Phone (Twilio Target)</th>
                <th className="px-4 py-3">Current Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {roster.map(doc => {
                const isPrimaryNow = doc.id === onDutyInfo.primary.id;
                const isBackupNow = doc.id === onDutyInfo.backup.id;
                const isTertiaryNow = doc.id === onDutyInfo.tertiary.id;

                return (
                  <tr 
                    key={doc.id}
                    className={`hover:bg-slate-50/70 transition ${
                      isPrimaryNow ? 'bg-blue-50/40 font-medium' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${doc.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                          {doc.name.split(' ')[1]?.[0] || 'D'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{doc.name}</span>
                            {isPrimaryNow && (
                              <span className="bg-[#0055FF] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                                Active Primary
                              </span>
                            )}
                            {isBackupNow && (
                              <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                                Backup
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px]">{doc.title}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      {doc.role}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {doc.ward}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-800">
                      {doc.shiftStart} – {doc.shiftEnd}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-900">
                      {editingDocId === doc.id ? (
                        <input
                          type="text"
                          defaultValue={doc.phone}
                          onBlur={(e) => {
                            handlePhoneEdit(doc.id, e.target.value);
                            setEditingDocId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handlePhoneEdit(doc.id, (e.target as HTMLInputElement).value);
                              setEditingDocId(null);
                            }
                          }}
                          autoFocus
                          className="bg-white border border-blue-500 px-2 py-0.5 rounded text-xs font-mono w-36 focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setEditingDocId(doc.id)}>
                          <span>{doc.phone}</span>
                          <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        doc.status === 'Available'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : doc.status === 'At Bedside'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          doc.status === 'Available' ? 'bg-emerald-500' : doc.status === 'At Bedside' ? 'bg-blue-500' : 'bg-slate-400'
                        }`}></span>
                        {doc.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleSendTestAlert(doc)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0055FF] border border-slate-200 text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                        title="Send simulated test ping to this clinician"
                      >
                        {testSentDocId === doc.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Dispatched</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Test Ping</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
