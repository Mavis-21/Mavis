import React from 'react';
import { Layers, Activity, Users, BarChart3, Activity as ActivityIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: 'ward' | 'live-monitor' | 'roster' | 'features';
  setActiveTab: (tab: 'ward' | 'live-monitor' | 'roster' | 'features') => void;
  selectedBedNumber: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, selectedBedNumber }) => {
  const tabs = [
    { id: 'ward', icon: Layers, label: 'Ward Overview' },
    { id: 'live-monitor', icon: Activity, label: 'Live Telemetry' },
    { id: 'roster', icon: Users, label: 'Duty Roster & Escalation' }
  ] as const;

  return (
    <aside className="w-72 bg-[#F9FAFB]/80 backdrop-blur-xl border-r border-gray-200/60 flex flex-col h-screen sticky top-0 transition-all duration-500 ease-in-out z-10">
      
      {/* Brand area */}
      <div className="h-24 flex items-center px-8 border-b border-gray-200/50 mb-6">
        <motion.div 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 shrink-0 drop-shadow-md">
            <rect x="25" y="20" width="16" height="80" fill="url(#blueGrad)" rx="2" />
            <rect x="79" y="20" width="16" height="80" fill="url(#blueGrad)" rx="2" />
            <path d="M 5 60 Q 30 30 60 60 T 115 60" stroke="#2A55FF" strokeWidth="8" strokeLinecap="round" />
            <path d="M 5 60 Q 30 90 60 60 T 115 60" stroke="#80D0FF" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2A55FF" />
                <stop offset="1" stopColor="#80D0FF" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex flex-col">
            <div className="text-[9px] font-bold tracking-widest text-gray-500 leading-none">THE</div>
            <div className="font-bold text-[17px] tracking-tight text-gray-900 leading-none mt-0.5">HAMMACHER</div>
            <div className="font-semibold text-[11px] tracking-widest text-blue-600 leading-none mt-1">SYSTEM</div>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 px-5 space-y-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[15px] font-medium tracking-wide transition-all duration-300 cursor-pointer overflow-hidden ${
                isActive
                  ? 'text-blue-700'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/40'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white shadow-sm border border-gray-200/60 rounded-2xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3 w-full">
                <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* Demo mode at bottom */}
      <div className="p-5 border-t border-gray-200/50">
        <motion.button
          onClick={() => setActiveTab('features')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[15px] font-medium tracking-wide transition-all duration-300 cursor-pointer ${
            activeTab === 'features'
              ? 'bg-white text-blue-700 shadow-sm border border-gray-200/60'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/40'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'features' ? 'text-blue-600' : 'text-gray-400'}`} />
          <span>Demo Mode</span>
        </motion.button>
      </div>

    </aside>
  );
};
