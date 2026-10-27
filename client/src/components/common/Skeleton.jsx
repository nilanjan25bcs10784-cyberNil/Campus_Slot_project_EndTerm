import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm animate-pulse space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-5 bg-slate-200 rounded w-1/3" />
        <div className="h-5 bg-slate-200 rounded w-20" />
      </div>
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-200 rounded w-1/2" />
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="h-8 bg-slate-200 rounded w-20" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <CardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="py-4 px-4 border-b border-slate-100">
          <div className="h-4 bg-slate-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}
