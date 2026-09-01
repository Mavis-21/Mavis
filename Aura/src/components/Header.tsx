import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Volume2, 
  VolumeX, 
  Bell, 
  PhoneCall, 
  Layers, 
  Users, 
  Cpu, 
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Radio,
  Clock
} from 'lucide-react';
import { audioTelemetry } from '../lib/audioTelemetry';
import { notificationService } from '../lib/notifications';
import { dutyRosterService } from '../lib/dutyRoster';

interface HeaderProps {
  activeTab: 'ward' | 'live-monitor' | 'roster' | 'features' | 'twilio' | 'architecture';
  setActiveTab: (tab: 'ward' | 'live-monitor' | 'roster' | 'features' | 'twilio' | 'architecture') => void;
  selectedBedNumber: string;
  onOpenAlertModal: () => void;
  unacknowledgedAlertsCount: { suspect: number; pathological: number };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedBedNumber,
  onOpenAlertModal,
  unacknowledgedAlertsCount
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [volume, setVolume] = useState(40);
  const [currentTime, setCurrentTime] = useState('11:45:00 AM');
  const [onDutyDoc, setOnDutyDoc] = useState(dutyRosterService.getOnDutyTeam().primary);
  const [hasPushPermission, setHasPushPermission] = useState(false);

  useEffect(() => {
    // Clock ticker
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPushPermission(Notification.permission === 'granted');
    }

    return () => clearInterval(timer);
  }, []);

  const toggleAudio = () => {
    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    audioTelemetry.setMuted(nextState);
    if (!nextState) {
      audioTelemetry.playSingleAlertTone();
    }
  };

  const handleRequestPush = async () => {
    const perm = await notificationService.requestBrowserNotificationPermission();
    setHasPushPermission(perm === 'granted');
  };

  const totalUnack = unacknowledgedAlertsCount.pathological + unacknowledgedAlertsCount.suspect;

  return (
    <header id="main-app-header" className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 shrink-0 drop-shadow-sm">
              <rect x="25" y="20" width="16" height="80" fill="url(#blueGradHeader)" rx="2" />
              <rect x="79" y="20" width="16" height="80" fill="url(#blueGradHeader)" rx="2" />
              <path d="M 5 60 Q 30 30 60 60 T 115 60" stroke="#2A55FF" strokeWidth="8" strokeLinecap="round" />
              <path d="M 5 60 Q 30 90 60 60 T 115 60" stroke="#80D0FF" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
              <defs>
                <linearGradient id="blueGradHeader" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2A55FF" />
                  <stop offset="1" stopColor="#80D0FF" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px] tracking-tight text-[#0B0B14] leading-none mt-0.5">HAMMACHER</span>
                <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase hidden sm:inline">|</span>
                <span className="bg-blue-50 text-[#0055FF] border border-blue-200/80 text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">
                  Ward <span className="font-serif-accent italic capitalize font-normal">Alpha</span>
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase hidden sm:block">
                Central Monitoring Station • ML Model: Family_B_GBM
              </p>
            </div>
          </div>

          {/* Center / Right Control Hub */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live Hospital Time & Shift */}
            <div className="hidden lg:flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-mono font-medium text-[#0B0B14]">{currentTime}</span>
              <span className="w-1 h-3 bg-gray-300 rounded"></span>
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Day Shift</span>
            </div>

            {/* On Duty Doctor Pill */}
            <button
              id="header-on-duty-badge"
              onClick={() => setActiveTab('roster')}
              className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer text-left"
              title="Click to view duty roster & escalation chain"
            >
              <div className="w-7 h-7 rounded-full bg-[#0055FF] text-white flex items-center justify-center font-bold text-[10px]">
                {onDutyDoc.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('') || 'MD'}
              </div>
              <div className="hidden md:block">
                <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest leading-none">
                  On Duty
                </div>
                <div className="font-bold text-[#0B0B14] leading-tight text-xs mt-0.5">
                  {onDutyDoc.name}
                </div>
              </div>
            </button>



            {/* Active Alert Center Button */}
            <button
              id="header-alert-center-btn"
              onClick={onOpenAlertModal}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer relative ${
                unacknowledgedAlertsCount.pathological > 0
                  ? 'bg-[#F04438] text-white shadow-lg shadow-[#F0443830] animate-alert-glow'
                  : unacknowledgedAlertsCount.suspect > 0
                  ? 'bg-[#F5A623] text-white shadow-xs'
                  : 'bg-[#0055FF] hover:bg-blue-700 text-white shadow-md shadow-[#0055FF30]'
              }`}
            >
              {unacknowledgedAlertsCount.pathological > 0 ? (
                <Zap className="w-3.5 h-3.5" />
              ) : unacknowledgedAlertsCount.suspect > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></div>
              )}
              <span>
                {totalUnack > 0 ? `${totalUnack} Actionable Alert${totalUnack > 1 ? 's' : ''}` : 'Acknowledge Alerts'}
              </span>
              {totalUnack > 0 && (
                <span className="w-2 h-2 rounded-full bg-white animate-ping absolute -top-1 -right-1"></span>
              )}
            </button>

          </div>
        </div>



      </div>
    </header>
  );
};
