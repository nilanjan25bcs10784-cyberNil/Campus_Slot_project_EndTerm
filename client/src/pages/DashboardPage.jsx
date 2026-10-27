import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Layers,
  BookmarkCheck,
  Bell,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  MapPin,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import * as bookingsApi from '../api/bookings.js';
import * as waitlistApi from '../api/waitlist.js';
import { StatusBadge } from '../components/common/Badge.jsx';
import { CardSkeleton } from '../components/common/Skeleton.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { notifications, unreadCount } = useNotifications();

  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [userBookings, userWaitlist] = await Promise.all([
          bookingsApi.getMyBookings(),
          waitlistApi.getMyWaitlist(),
        ]);
        setBookings(userBookings);
        setWaitlist(userWaitlist);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Filter active future bookings
  const now = new Date();
  const activeBookings = bookings.filter(
    (b) => ['pending', 'approved'].includes(b.status) && new Date(b.endAt) > now
  );

  const nextBooking = activeBookings.length > 0
    ? [...activeBookings].sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0]
    : null;

  // Check-in window calculation for next booking (-10m to +15m)
  const isCheckInAvailable = (b) => {
    if (!b || b.status !== 'approved' || b.checkedInAt) return false;
    const startMs = new Date(b.startAt).getTime();
    const nowMs = Date.now();
    return nowMs >= startMs - 10 * 60 * 1000 && nowMs <= startMs + 15 * 60 * 1000;
  };

  const handleQuickCheckIn = async (bookingId) => {
    try {
      await bookingsApi.checkInBooking(bookingId);
      toast.success('Successfully checked in! Enjoy your reservation.');
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, checkedInAt: new Date() } : b))
      );
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Check-in failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-brand-500/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>CampusSlot Smart Allocation Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-brand-100 text-sm max-w-xl">
            {user?.department} • Reserve facilities with automated collision prevention and fair waitlists.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/resources"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white text-brand-700 font-bold rounded-xl shadow-md hover:bg-brand-50 transition text-sm"
          >
            <Layers className="w-4 h-4" />
            <span>Book a Slot</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 backdrop-blur-md transition text-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Portal</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Reservations</span>
            <BookmarkCheck className="w-4 h-4 text-brand-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{activeBookings.length}</span>
            <span className="text-xs text-slate-400">/ 3 cap max</span>
          </div>
          <p className="text-xs text-slate-500">
            {3 - activeBookings.length} slots remaining in your active allowance
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Waitlists</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {waitlist.filter((w) => w.status === 'waiting').length}
            </span>
          </div>
          <p className="text-xs text-slate-500">Auto-promoted on cancellations via FIFO queue</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Unread Alerts</span>
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{unreadCount}</span>
          </div>
          <p className="text-xs text-slate-500">Booking approvals & waitlist promotions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Attendance Status</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-emerald-600">Good Standing</span>
          </div>
          <p className="text-xs text-slate-500">Check in within 15 min of slot start to avoid strikes</p>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Scheduled Reservation (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Next Reservation</h2>
            <Link to="/my-bookings" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1">
              <span>View all bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <CardSkeleton />
          ) : nextBooking ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{nextBooking.resource?.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{nextBooking.resource?.location}</span>
                  </div>
                </div>
                <StatusBadge status={nextBooking.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Date</span>
                  <p className="font-bold text-slate-800">{nextBooking.date}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Time Window</span>
                  <p className="font-bold text-slate-800">
                    {nextBooking.startTime} - {nextBooking.endTime}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Check-In Status</span>
                  <p className="font-bold text-slate-800">
                    {nextBooking.checkedInAt ? (
                      <span className="text-emerald-600">Checked In ✓</span>
                    ) : (
                      <span className="text-slate-500">Pending arrival</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">Purpose</span>
                <p className="text-xs text-slate-700 italic mt-0.5">"{nextBooking.purpose}"</p>
              </div>

              {/* Check-In Action Callout */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {isCheckInAvailable(nextBooking) ? (
                  <button
                    onClick={() => handleQuickCheckIn(nextBooking._id)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Check In Now (Window Open)</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Check-in opens 10m before start time ({nextBooking.startTime})
                    </span>
                  </div>
                )}

                <Link
                  to="/my-bookings"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 text-center"
                >
                  Manage or Cancel
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming bookings"
              message="You have no reservations scheduled for the next 7 days. Find and reserve a facility now!"
              action={
                <Link
                  to="/resources"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm text-xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Browse Campus Facilities</span>
                </Link>
              }
            />
          )}
        </div>

        {/* Notifications & Activity feed (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Updates</h2>
            <span className="text-xs text-slate-400">Live 30s Polling</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No new activity recorded
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n._id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 capitalize">
                        {n.type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Rules reminder box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Campus Booking Rules</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
              <li>Book up to 14 days in advance.</li>
              <li>Maximum 3 active bookings per student.</li>
              <li>Check in within -10m to +15m of start time.</li>
              <li>3 no-shows within 30 days yields a 7-day restriction.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
