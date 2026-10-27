import React from 'react';
import { Loader2, Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function ColdStartBanner() {
  const { isColdStarting } = useAuth();

  if (!isColdStarting) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 shadow-md flex items-center justify-center space-x-2.5 text-sm font-medium sticky top-0 z-50 animate-pulse">
      <Server className="w-4 h-4" />
      <span>Waking up server... (Spinning up instance on free hosting tier. Please allow a few seconds)</span>
      <Loader2 className="w-4 h-4 animate-spin ml-1" />
    </div>
  );
}
