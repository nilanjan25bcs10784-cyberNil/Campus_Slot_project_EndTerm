import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  message = 'There is nothing to display here yet.',
  action = null,
}) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center flex flex-col items-center justify-center my-6">
      <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
