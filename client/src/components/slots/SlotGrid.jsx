import React from 'react';
import { Clock, CheckCircle2, User, Lock, AlertCircle, BookmarkPlus } from 'lucide-react';

export function SlotGrid({
  slots = [],
  slotMinutes = 30,
  maxDurationSlots = 4,
  selectedSlotIndices = [],
  onSelectSlot,
  onJoinWaitlist,
}) {
  if (!slots.length) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
        No slots available for the selected date.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-white border-2 border-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-brand-600 text-white flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
          </span>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-brand-100 border border-brand-300" />
          <span>Your Booking</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300" />
          <span>Booked (Waitlist available)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300" />
          <span>Blocked (Maintenance)</span>
        </div>
      </div>

      {/* Grid of Slots */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {slots.map((slot, index) => {
          const isSelected = selectedSlotIndices.includes(index);
          const isFree = slot.state === 'free';
          const isBooked = slot.state === 'booked';
          const isMine = slot.state === 'mine';
          const isBlocked = slot.state === 'blocked';

          let cardStyle = 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-sm text-slate-800 cursor-pointer';

          if (isSelected) {
            cardStyle = 'bg-brand-600 border-brand-600 text-white shadow-md cursor-pointer ring-2 ring-brand-400/40';
          } else if (isMine) {
            cardStyle = 'bg-indigo-50 border-indigo-300 text-indigo-900 cursor-default';
          } else if (isBooked) {
            cardStyle = 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/70 cursor-pointer';
          } else if (isBlocked) {
            cardStyle = 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60';
          }

          const handleClick = () => {
            if (isFree) {
              onSelectSlot(index);
            } else if (isBooked && onJoinWaitlist) {
              onJoinWaitlist(slot);
            }
          };

          return (
            <button
              key={`${slot.startTime}-${slot.endTime}`}
              type="button"
              disabled={isBlocked || isMine}
              onClick={handleClick}
              className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${cardStyle}`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold tracking-tight">
                  {slot.startTime}
                </span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                {isMine && <User className="w-3.5 h-3.5 text-brand-600" />}
                {isBlocked && <Lock className="w-3 h-3 text-slate-400" />}
                {isBooked && !isSelected && (
                  <BookmarkPlus className="w-3.5 h-3.5 text-rose-500" title="Click to waitlist" />
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium opacity-90">
                <span>to {slot.endTime}</span>
                <span className="capitalize text-[10px] opacity-75">
                  {isMine ? 'Mine' : isBooked ? 'Waitlist' : isBlocked ? 'Blocked' : 'Available'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
