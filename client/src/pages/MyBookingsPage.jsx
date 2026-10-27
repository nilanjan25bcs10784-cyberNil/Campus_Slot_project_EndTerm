import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookmarkCheck,
  RotateCcw,
  Layers,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as bookingsApi from '../api/bookings.js';
import * as waitlistApi from '../api/waitlist.js';
import { StatusBadge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { CardSkeleton } from '../components/common/Skeleton.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';

export function MyBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'upcoming';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel Booking modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [userBookings, userWaitlist] = await Promise.all([
        bookingsApi.getMyBookings(),
        waitlistApi.getMyWaitlist(),
      ]);
      setBookings(userBookings);
      setWaitlist(userWaitlist);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'upcoming' ? {} : { tab });
  };

  // Check-in action
  const handleCheckIn = async (bookingId) => {
    try {
      await bookingsApi.checkInBooking(bookingId);
      toast.success('Attendance recorded! You are checked in.');
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, checkedInAt: new Date() } : b))
      );
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Check-in failed');
    }
  };

  // Open Cancel Modal
  const openCancelModal = (b) => {
    setCancellingBooking(b);
    setCancelReason('');
  };

  // Confirm Booking Cancellation
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setSubmittingCancel(true);
    try {
      await bookingsApi.cancelBooking(cancellingBooking._id, cancelReason);
      toast.success('Reservation cancelled. Slot has been freed for waitlisted students.');
      setCancellingBooking(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Cancellation failed');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Cancel Waitlist Entry
  const handleCancelWaitlist = async (entryId) => {
    if (!window.confirm('Are you sure you want to leave the waitlist queue for this slot?')) return;
    try {
      await waitlistApi.cancelWaitlist(entryId);
      toast.success('Removed from waitlist');
      setWaitlist((prev) =>
        prev.map((w) => (w._id === entryId ? { ...w, status: 'cancelled' } : w))
      );
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel waitlist');
    }
  };

  // Booking filtering
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => ['pending', 'approved'].includes(b.status) && new Date(b.endAt) > now
  );

  const pastBookings = bookings.filter(
    (b) => !['pending', 'approved'].includes(b.status) || new Date(b.endAt) <= now
  );

  const isCheckInOpen = (b) => {
    if (b.status !== 'approved' || b.checkedInAt) return false;
    const startMs = new Date(b.startAt).getTime();
    const nowMs = Date.now();
    return nowMs >= startMs - 10 * 60 * 1000 && nowMs <= startMs + 15 * 60 * 1000;
  };

  const isCheckInTooEarly = (b) => {
    if (b.status !== 'approved' || b.checkedInAt) return false;
    const startMs = new Date(b.startAt).getTime();
    const nowMs = Date.now();
    return nowMs < startMs - 10 * 60 * 1000;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Bookings & Waitlist
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review upcoming facility reservations, record check-ins, or manage automated queue spots
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => handleTabChange('upcoming')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'upcoming'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Upcoming Reservations</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700">
            {upcomingBookings.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('past')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'past'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Past / History</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
            {pastBookings.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('waitlist')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'waitlist'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Waitlist Queue</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">
            {waitlist.length}
          </span>
        </button>
      </div>

      {/* Content based on Active Tab */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : activeTab === 'upcoming' ? (
        upcomingBookings.length === 0 ? (
          <EmptyState
            title="No upcoming reservations"
            message="You don't have any pending or approved bookings scheduled."
            action={
              <Link
                to="/resources"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Browse Campus Facilities</span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcomingBookings.map((b) => (
              <div
                key={b._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{b.resource?.name}</h3>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.resource?.location}</span>
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase">Date</span>
                      <strong className="text-slate-800 font-bold">{b.date}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase">Time Slot</span>
                      <strong className="text-slate-800 font-bold">
                        {b.startTime} - {b.endTime}
                      </strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic">
                    "{b.purpose}"
                  </p>

                  {b.checkedInAt && (
                    <div className="flex items-center space-x-1 text-xs text-emerald-700 font-semibold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Checked in at {new Date(b.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}

                  {b.decisionNote && (
                    <div className="text-[11px] bg-slate-100 p-2 rounded-lg text-slate-600">
                      <strong>Admin Note:</strong> {b.decisionNote}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  {isCheckInOpen(b) ? (
                    <button
                      onClick={() => handleCheckIn(b._id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Check In Now</span>
                    </button>
                  ) : isCheckInTooEarly(b) ? (
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Check-in opens at -10m</span>
                    </span>
                  ) : (
                    <span />
                  )}

                  <button
                    onClick={() => openCancelModal(b)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition"
                  >
                    Cancel Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'past' ? (
        pastBookings.length === 0 ? (
          <EmptyState
            title="No past bookings"
            message="Your completed, cancelled, and past reservations will appear here."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Facility</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Purpose</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {b.resource?.name || 'Resource'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {b.date} • {b.startTime} - {b.endTime}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {b.purpose}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={b.status} />
                        {b.lateCancellation && (
                          <span className="block text-[10px] text-rose-600 mt-0.5">
                            Late Cancellation (&lt;60m)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {b.checkedInAt ? (
                          <span className="text-emerald-600 font-semibold">Checked In ✓</span>
                        ) : b.status === 'no_show' ? (
                          <span className="text-purple-700 font-semibold">No-Show Strike</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Waitlist Tab */
        waitlist.length === 0 ? (
          <EmptyState
            title="No waitlist entries"
            message="When you request to join the queue for a booked slot, it will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {waitlist.map((w) => (
              <div
                key={w._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{w.resource?.name}</h3>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{w.resource?.location}</span>
                      </div>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase">Requested Date</span>
                      <strong className="text-indigo-950 font-bold">{w.date}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase">Time Slot</span>
                      <strong className="text-indigo-950 font-bold">
                        {w.startTime} - {w.endTime}
                      </strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Queued on {new Date(w.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                  </p>
                </div>

                {w.status === 'waiting' && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => handleCancelWaitlist(w._id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition"
                    >
                      Leave Waitlist
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Cancellation Modal with Late Cancellation Warning */}
      {cancellingBooking && (
        <Modal
          isOpen={Boolean(cancellingBooking)}
          onClose={() => setCancellingBooking(null)}
          title="Cancel Facility Reservation"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-700">
              Are you sure you want to cancel your reservation for <strong>{cancellingBooking.resource?.name}</strong> on <strong>{cancellingBooking.date}</strong> ({cancellingBooking.startTime} - {cancellingBooking.endTime})?
            </p>

            {/* Check if < 60 min before start */}
            {new Date(cancellingBooking.startAt).getTime() - Date.now() < 60 * 60 * 1000 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-2 text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Late Cancellation Warning:</strong> Your booking starts in less than 60 minutes. Cancelling now will record a Late Cancellation flag on your record.
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule clash with lecture..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={submittingCancel}
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
