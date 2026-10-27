import React, { useEffect, useState } from 'react';
import { Activity, Shield, KeyRound } from 'lucide-react';
import { api } from '../../api/client.js';

export function Footer() {
  const [health, setHealth] = useState({ status: 'checking', message: 'Checking...' });

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.get('/health');
        if (res.data.status === 'ok') {
          setHealth({ status: 'healthy', message: 'API Online (200 OK)' });
        } else {
          setHealth({ status: 'degraded', message: 'Degraded Service' });
        }
      } catch (e) {
        setHealth({ status: 'offline', message: 'API Offline' });
      }
    }
    checkHealth();
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Branding & Course context */}
        <div className="flex items-center space-x-3">
          <span className="font-bold text-slate-700">CampusSlot</span>
          <span>•</span>
          <span>College End-Term Project (MERN)</span>
          <span>•</span>
          <span>Timezone: Asia/Kolkata</span>
        </div>

        {/* Right: Health status indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                health.status === 'healthy'
                  ? 'bg-emerald-500 animate-pulse'
                  : health.status === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-medium text-[11px] text-slate-600">
              {health.message}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-1 text-slate-400">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Admin & Student Demo accounts pre-seeded</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
