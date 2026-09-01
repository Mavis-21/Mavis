import React from 'react';
import { Layers, Activity, Users, BarChart3, Activity as ActivityIcon } from 'lucide-react';

interface SidebarProps {
  activeTab: 'ward' | 'live-monitor' | 'roster' | 'features';
  setActiveTab: (tab: 'ward' | 'live-monitor' | 'roster' | 'features') => void;
  selectedBedNumber: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, selectedBedNumber }) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full sticky top-0">
      
      {/* Brand area inside sidebar */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0055FF] flex items-center justify-center text-white shadow-md shadow-[#0055FF30]">
            <ActivityIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight uppercase text-[#0B0B14]">Aura<span className="font-serif-accent font-normal italic text-[#0055FF] capitalize text-xl">CTG</span></div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <button
          onClick={() => setActiveTab('ward')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition cursor-pointer ${
            activeTab === 'ward'
              ? 'bg-[#0055FF] text-white shadow-md shadow-[#0055FF30]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ward Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('live-monitor')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition cursor-pointer ${
            activeTab === 'live-monitor'
              ? 'bg-[#0A0A0F] text-[#34D399] border border-[#1A1A24] shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
          <span>Live Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-[#0055FF] text-white shadow-md shadow-[#0055FF30]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Duty Roster & Escalation</span>
        </button>
      </nav>

      {/* Put Demo mode at the bottom */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => setActiveTab('features')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition cursor-pointer ${
            activeTab === 'features'
              ? 'bg-[#0055FF] text-white shadow-md shadow-[#0055FF30]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Demo Mode</span>
        </button>
      </div>

    </aside>
  );
};
