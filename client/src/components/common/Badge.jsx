import React from 'react';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/20',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
  no_show: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20',
  waiting: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20',
  promoted: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
  expired: 'bg-slate-100 text-slate-500 border-slate-200 ring-slate-500/20',
};

const typeLabels = {
  study_room: 'Study Room',
  lab: 'Lab & Workshop',
  court: 'Sports Court',
  equipment: 'Equipment',
};

const typeStyles = {
  study_room: 'bg-sky-50 text-sky-700 border-sky-200',
  lab: 'bg-violet-50 text-violet-700 border-violet-200',
  court: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  equipment: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function StatusBadge({ status, className = '' }) {
  const normalized = status?.toLowerCase() || 'pending';
  const style = statusStyles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = normalized.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {label}
    </span>
  );
}

export function TypeBadge({ type, className = '' }) {
  const style = typeStyles[type] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = typeLabels[type] || type;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style} ${className}`}
    >
      {label}
    </span>
  );
}
