import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  BookmarkPlus,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as resourcesApi from '../api/resources.js';
import * as bookingsApi from '../api/bookings.js';
import * as waitlistApi from '../api/waitlist.js';
import { TypeBadge } from '../components/common/Badge.jsx';
import { SlotGrid } from '../components/slots/SlotGrid.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { CardSkeleton } from '../components/common/Skeleton.jsx';

function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString(0));
  const [slots, setSlots] = useState([]);
  const [loadingResource, setLoadingResource] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState('');

  // Selected contiguous slot indices
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Waitlist Modal state
  const [waitlistTargetSlot, setWaitlistTargetSlot] = useState(null);
  const [submittingWaitlist, setSubmittingWaitlist] = useState(false);

  // Load resource details
  useEffect(() => {
    async function loadResource() {
      try {
        const data = await resourcesApi.getResourceById(id);
        setResource(data);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load facility');
      } finally {
        setLoadingResource(false);
      }
    }
    loadResource();
  }, [id]);

  // Load availability whenever date changes
  useEffect(() => {
    async function loadAvailability() {
      if (!id || !selectedDate) return;
      setLoadingSlots(true);
      setSelectedIndices([]); // reset selection on date change
      try {
        const data = await resourcesApi.getResourceAvailability(id, selectedDate);
        setSlots(data.slots || []);
      } catch (err) {
        toast.error('Could not refresh availability slots');
      } finally {
        setLoadingSlots(false);
      }
    }
    loadAvailability();
  }, [id, selectedDate]);

  // Handle contiguous slot selection
  const handleSelectSlot = (index) => {
    if (!selectedIndices.length) {
      // First slot selected
      setSelectedIndices([index]);
      return;
    }

    const minIdx = Math.min(...selectedIndices);
    const maxIdx = Math.max(...selectedIndices);

    // If clicking an already selected endpoint, shrink or toggle
    if (selectedIndices.includes(index)) {
      if (selectedIndices.length === 1) {
        setSelectedIndices([]);
      } else {
        // Keep from min to index or reset
        setSelectedIndices([index]);
      }
      return;
    }

    // Check if contiguous to current range
    if (index === maxIdx + 1) {
      // Check max duration
      const newCount = selectedIndices.length + 1;
      if (newCount > (resource?.maxDurationSlots || 4)) {
        toast.error(`Maximum booking length is ${resource.maxDurationSlots} slots (${resource.maxDurationSlots * resource.slotMinutes} mins)`);
        return;
      }
      setSelectedIndices([...selectedIndices, index].sort((a, b) => a - b));
    } else if (index === minIdx - 1) {
      const newCount = selectedIndices.length + 1;
      if (newCount > (resource?.maxDurationSlots || 4)) {
        toast.error(`Maximum booking length is ${resource.maxDurationSlots} slots`);
        return;
      }
      setSelectedIndices([index, ...selectedIndices].sort((a, b) => a - b));
    } else {
      // Non-contiguous click: reset selection to this new slot
      setSelectedIndices([index]);
    }
  };

  // Determine selected start & end times
  const selectedStartTime = selectedIndices.length > 0 ? slots[selectedIndices[0]]?.startTime : null;
  const selectedEndTime = selectedIndices.length > 0 ? slots[selectedIndices[selectedIndices.length - 1]]?.endTime : null;
  const selectedDurationMin = selectedIndices.length * (resource?.slotMinutes || 30);

  // Submit Booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStartTime || !selectedEndTime) {
      toast.error('Please select at least one available time slot');
      return;
    }
    if (!purpose.trim() || purpose.trim().length < 3) {
      toast.error('Please provide a purpose of at least 3 characters');
      return;
    }

    setSubmittingBooking(true);
    try {
      const booking = await bookingsApi.createBooking({
        resourceId: id,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        purpose: purpose.trim(),
      });

      if (booking.status === 'pending') {
        toast.success('Booking request submitted! Awaiting faculty review.', { duration: 5000 });
      } else {
        toast.success('Slot confirmed! Your booking is locked.', { duration: 4000 });
      }

      navigate('/my-bookings');
    } catch (err) {
      const errorData = err.response?.data?.error;
      const msg = errorData?.message || 'Failed to complete booking';
      toast.error(msg);
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Submit Waitlist Request
  const handleWaitlistSubmit = async () => {
    if (!waitlistTargetSlot) return;

    setSubmittingWaitlist(true);
    try {
      await waitlistApi.joinWaitlist({
        resourceId: id,
        date: selectedDate,
        startTime: waitlistTargetSlot.startTime,
        endTime: waitlistTargetSlot.endTime,
      });

      toast.success('Successfully added to waitlist! We will notify you if promoted.');
      setWaitlistTargetSlot(null);
      navigate('/my-bookings?tab=waitlist');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to join waitlist');
    } finally {
      setSubmittingWaitlist(false);
    }
  };

  if (loadingResource) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <CardSkeleton />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <ErrorState message={error || 'Facility not found'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // Quick 7-day selector pills
  const dayPills = Array.from({ length: 7 }).map((_, idx) => {
    const dateStr = getLocalDateString(idx);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dateStr, dayName, formatted };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/resources')}
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Facilities</span>
      </button>

      {/* Facility Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TypeBadge type={resource.type} />
              {resource.requiresApproval ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Faculty Approval Required</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Instant Reservation</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {resource.name}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{resource.location}</span>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 text-xs text-slate-600 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Max Capacity: <strong className="text-slate-800">{resource.capacity}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Open: <strong className="text-slate-800">{resource.openTime} - {resource.closeTime}</strong></span>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pt-2 border-t border-slate-100">
          {resource.description}
        </p>
      </div>

      {/* Date Navigation & Slot Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Slot Grid (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5 text-brand-600" />
                  <span>Select Date & Reservation Time</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click available slots to reserve, or click booked slots to join the FIFO waitlist
                </p>
              </div>

              {/* Date Input for up to 14 days ahead */}
              <input
                type="date"
                min={getLocalDateString(0)}
                max={getLocalDateString(14)}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Quick Day Selector Strip */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {dayPills.map((p) => {
                const isSelected = selectedDate === p.dateStr;
                return (
                  <button
                    key={p.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(p.dateStr)}
                    className={`py-2 px-1 text-center rounded-xl border transition ${
                      isSelected
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold opacity-75">{p.dayName}</div>
                    <div className="text-xs font-extrabold">{p.formatted}</div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Slot Grid */}
            {loadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading live availability...</span>
              </div>
            ) : (
              <SlotGrid
                slots={slots}
                slotMinutes={resource.slotMinutes}
                maxDurationSlots={resource.maxDurationSlots}
                selectedSlotIndices={selectedIndices}
                onSelectSlot={handleSelectSlot}
                onJoinWaitlist={(slot) => setWaitlistTargetSlot(slot)}
              />
            )}
          </div>
        </div>

        {/* Right: Booking Summary & Purpose Form (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5 sticky top-24">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Reservation Summary</span>
              {selectedIndices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIndices([])}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Clear
                </button>
              )}
            </h3>

            {selectedIndices.length > 0 ? (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="bg-brand-50/70 border border-brand-100 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Date:</span>
                    <strong className="text-slate-800">{selectedDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Selected Time:</span>
                    <strong className="text-brand-700">
                      {selectedStartTime} - {selectedEndTime}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Total Duration:</span>
                    <strong className="text-slate-800">
                      {selectedDurationMin} mins ({selectedIndices.length} slot{selectedIndices.length > 1 ? 's' : ''})
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Booking Purpose / Activity
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. End-term robotics code test and camera tracking rehearsal..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Clearly state the academic or club objective.
                  </span>
                </div>

                {resource.requiresApproval && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Faculty approval required. Your request will expire automatically if not approved within 24 hours.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md shadow-brand-500/25 transition disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {submittingBooking
                      ? 'Confirming Slot...'
                      : resource.requiresApproval
                      ? 'Submit for Approval'
                      : 'Confirm Reservation'}
                  </span>
                </button>
              </form>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <p>Click one or more available green slots on the grid to begin reserving.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Waitlist Modal */}
      {waitlistTargetSlot && (
        <Modal
          isOpen={Boolean(waitlistTargetSlot)}
          onClose={() => setWaitlistTargetSlot(null)}
          title="Join Resource Waitlist"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              The time slot <strong>{waitlistTargetSlot.startTime} - {waitlistTargetSlot.endTime}</strong> on <strong>{selectedDate}</strong> is currently reserved by another student.
            </p>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-1.5 text-indigo-950">
              <div className="flex items-center space-x-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Fair FIFO Waitlist Automation</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                If the current reservation is cancelled, rejected, or expires, CampusSlot will automatically promote the oldest eligible student in the queue and notify you immediately.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setWaitlistTargetSlot(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingWaitlist}
                onClick={handleWaitlistSubmit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center space-x-1.5"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>{submittingWaitlist ? 'Adding...' : 'Join Waitlist Queue'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
