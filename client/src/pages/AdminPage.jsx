import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Plus,
  Lock,
  BarChart3,
  Layers,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  MapPin,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import toast from 'react-hot-toast';
import * as adminApi from '../api/admin.js';
import * as resourcesApi from '../api/resources.js';
import { StatusBadge, TypeBadge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { CardSkeleton } from '../components/common/Skeleton.jsx';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [loading, setLoading] = useState(true);

  // Approvals Queue state
  const [pendingBookings, setPendingBookings] = useState([]);
  const [selectedBookingForDecision, setSelectedBookingForDecision] = useState(null);
  const [decisionType, setDecisionType] = useState('approve'); // 'approve' | 'reject'
  const [decisionNote, setDecisionNote] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Resources state
  const [resources, setResources] = useState([]);
  const [editingResource, setEditingResource] = useState(null); // null = new, object = edit
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceFormData, setResourceFormData] = useState({
    name: '',
    type: 'study_room',
    description: '',
    location: '',
    capacity: 4,
    openTime: '08:00',
    closeTime: '22:00',
    slotMinutes: 30,
    maxDurationSlots: 4,
    requiresApproval: false,
    isActive: true,
  });

  // Blocked Window form state
  const [blockedData, setBlockedData] = useState({
    resourceId: '',
    startAt: '',
    endAt: '',
    reason: '',
  });
  const [submittingBlock, setSubmittingBlock] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);

  // Load data for active tab
  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAdminBookings({ status: 'pending' });
      setPendingBookings(data);
    } catch (e) {
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await resourcesApi.getResources({});
      setResources(data);
    } catch (e) {
      toast.error('Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAdminAnalytics();
      setAnalytics(data);
    } catch (e) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'approvals') loadApprovals();
    if (activeTab === 'resources') loadResources();
    if (activeTab === 'blocked') loadResources(); // needed for dropdown
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab]);

  // Handle Approve / Reject decision
  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingForDecision) return;

    if (decisionType === 'reject' && !decisionNote.trim()) {
      toast.error('Please enter a rejection reason note for the student');
      return;
    }

    setSubmittingDecision(true);
    try {
      if (decisionType === 'approve') {
        await adminApi.approveBooking(selectedBookingForDecision._id, decisionNote);
        toast.success('Booking approved! Student has been notified.');
      } else {
        await adminApi.rejectBooking(selectedBookingForDecision._id, decisionNote);
        toast.success('Booking rejected. Slot freed and waitlist evaluated.');
      }
      setSelectedBookingForDecision(null);
      loadApprovals();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Open Create/Edit Resource Modal
  const openResourceModal = (res = null) => {
    if (res) {
      setEditingResource(res);
      setResourceFormData({
        name: res.name,
        type: res.type,
        description: res.description,
        location: res.location,
        capacity: res.capacity,
        openTime: res.openTime,
        closeTime: res.closeTime,
        slotMinutes: res.slotMinutes,
        maxDurationSlots: res.maxDurationSlots,
        requiresApproval: res.requiresApproval,
        isActive: res.isActive,
      });
    } else {
      setEditingResource(null);
      setResourceFormData({
        name: '',
        type: 'study_room',
        description: '',
        location: '',
        capacity: 4,
        openTime: '08:00',
        closeTime: '22:00',
        slotMinutes: 30,
        maxDurationSlots: 4,
        requiresApproval: false,
        isActive: true,
      });
    }
    setIsResourceModalOpen(true);
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    try {
      if (editingResource) {
        await resourcesApi.updateResource(editingResource._id, resourceFormData);
        toast.success('Facility updated successfully');
      } else {
        await resourcesApi.createResource(resourceFormData);
        toast.success('Facility created successfully');
      }
      setIsResourceModalOpen(false);
      loadResources();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save facility');
    }
  };

  const handleDeactivateResource = async (resId) => {
    if (!window.confirm('Are you sure you want to deactivate this facility?')) return;
    try {
      await resourcesApi.deleteResource(resId);
      toast.success('Facility deactivated');
      loadResources();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to deactivate');
    }
  };

  // Handle Blocked Window creation
  const handleCreateBlockedWindow = async (e) => {
    e.preventDefault();
    if (!blockedData.resourceId || !blockedData.startAt || !blockedData.endAt || !blockedData.reason) {
      toast.error('All fields are required');
      return;
    }

    setSubmittingBlock(true);
    try {
      const result = await adminApi.createBlockedWindow({
        resourceId: blockedData.resourceId,
        startAt: new Date(blockedData.startAt).toISOString(),
        endAt: new Date(blockedData.endAt).toISOString(),
        reason: blockedData.reason,
      });

      toast.success(
        `Maintenance window created! ${result.cancelledBookingsCount} conflicting reservations were automatically cancelled.`
      );
      setBlockedData({ resourceId: '', startAt: '', endAt: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to block time window');
    } finally {
      setSubmittingBlock(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Faculty & Administrative Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            CampusSlot Administration
          </h1>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'approvals'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Approvals Queue</span>
          {pendingBookings.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold">
              {pendingBookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'resources'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Facility Manager</span>
        </button>

        <button
          onClick={() => setActiveTab('blocked')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'blocked'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Maintenance Windows</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'analytics'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Utilization & Analytics</span>
        </button>
      </div>

      {/* Tab 1: Approvals Queue */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Pending Faculty Approvals ({pendingBookings.length})
            </h2>
            <button
              onClick={loadApprovals}
              className="text-xs text-brand-600 hover:text-brand-700 font-bold"
            >
              Refresh Queue
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : pendingBookings.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up!"
              message="There are no pending booking requests awaiting faculty review right now."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingBookings.map((b) => (
                <div
                  key={b._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{b.resource?.name}</h3>
                        <p className="text-xs text-slate-500">{b.resource?.location}</p>
                      </div>
                      <StatusBadge status="pending" />
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Student:</span>
                        <strong className="text-slate-800">{b.user?.name} ({b.user?.department})</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Slot:</span>
                        <strong className="text-slate-800">{b.date} • {b.startTime} - {b.endTime}</strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase font-bold text-slate-400 block mb-0.5">
                        Stated Objective / Purpose
                      </span>
                      <p className="text-xs text-slate-700 italic bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                        "{b.purpose}"
                      </p>
                    </div>

                    {b.expiresAt && (
                      <p className="text-[11px] text-amber-700 font-medium">
                        Auto-expires: {new Date(b.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedBookingForDecision(b);
                        setDecisionType('reject');
                        setDecisionNote('');
                      }}
                      className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBookingForDecision(b);
                        setDecisionType('approve');
                        setDecisionNote('');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Facility Manager */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Campus Facilities & Equipment ({resources.length})
            </h2>
            <button
              onClick={() => openResourceModal(null)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Facility Name</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Capacity</th>
                    <th className="py-3.5 px-4">Hours</th>
                    <th className="py-3.5 px-4">Slot Rules</th>
                    <th className="py-3.5 px-4">Approval</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {r.name}
                        {!r.isActive && (
                          <span className="ml-2 text-[10px] text-rose-500 font-normal">
                            (Inactive)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4"><TypeBadge type={r.type} /></td>
                      <td className="py-3 px-4 text-slate-500">{r.location}</td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{r.capacity}</td>
                      <td className="py-3 px-4 text-slate-600">{r.openTime} - {r.closeTime}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {r.slotMinutes}m slots (max {r.maxDurationSlots})
                      </td>
                      <td className="py-3 px-4">
                        {r.requiresApproval ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Instant
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openResourceModal(r)}
                          className="font-bold text-brand-600 hover:text-brand-800"
                        >
                          Edit
                        </button>
                        {r.isActive && (
                          <button
                            onClick={() => handleDeactivateResource(r._id)}
                            className="font-bold text-rose-600 hover:text-rose-800"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Maintenance Blocked Windows */}
      {activeTab === 'blocked' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <span>Create Facility Maintenance Block</span>
            </h2>
            <p className="text-xs text-slate-500">
              Lockout a facility for repairs, exams, or maintenance. Conflicting bookings will be automatically cancelled.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Collision Rule:</strong> Submitting this block will automatically cancel any student reservations falling within this range and notify them of the reason.
            </p>
          </div>

          <form onSubmit={handleCreateBlockedWindow} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Target Facility</label>
              <select
                required
                value={blockedData.resourceId}
                onChange={(e) => setBlockedData({ ...blockedData, resourceId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select a facility...</option>
                {resources.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Start Time (UTC Date & Time)</label>
                <input
                  type="datetime-local"
                  required
                  value={blockedData.startAt}
                  onChange={(e) => setBlockedData({ ...blockedData, startAt: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">End Time (UTC Date & Time)</label>
                <input
                  type="datetime-local"
                  required
                  value={blockedData.endAt}
                  onChange={(e) => setBlockedData({ ...blockedData, endAt: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Reason for Lockout</label>
              <textarea
                required
                rows={3}
                value={blockedData.reason}
                onChange={(e) => setBlockedData({ ...blockedData, reason: e.target.value })}
                placeholder="e.g. Scheduled electrical safety audit & anti-skid court refinishing..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingBlock}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-xs flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{submittingBlock ? 'Applying Block...' : 'Enforce Maintenance Block'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Analytics with Recharts */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</span>
              <p className="text-2xl font-extrabold text-slate-900">{analytics.summary.totalBookings}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Facilities</span>
              <p className="text-2xl font-extrabold text-brand-600">{analytics.summary.totalResources}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Students</span>
              <p className="text-2xl font-extrabold text-indigo-600">{analytics.summary.totalStudents}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
              <p className="text-2xl font-extrabold text-amber-600">{analytics.summary.pendingApprovals}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No-Show Rate</span>
              <p className="text-2xl font-extrabold text-purple-700">{analytics.summary.noShowRate}%</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Utilization per resource */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Resource Utilization Rate (%)</h3>
                <p className="text-xs text-slate-400">Booked hours relative to operational capacity</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.utilizationPerResource} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Utilization']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="utilizationRate" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Bookings by Hour */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Peak Demand by Time of Day</h3>
                <p className="text-xs text-slate-400">Distribution of slot start times (08:00 - 22:00)</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.bookingsByHour} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [val, 'Bookings']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#06b6d4' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Weekday distribution & Top Resources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 3: Bookings by Weekday */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Weekly Booking Traffic</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.bookingsByWeekday} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [val, 'Bookings']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Resources List */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Top 5 Most Reserved Facilities</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {analytics.topResources.map((item, idx) => (
                  <div key={item.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <strong className="text-slate-800 block">{item.name}</strong>
                        <span className="text-[10px] text-slate-400 capitalize">{item.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="text-brand-600 text-sm">{item.totalBookings}</strong>
                      <span className="text-[10px] text-slate-400 block">bookings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal (Approve / Reject) */}
      {selectedBookingForDecision && (
        <Modal
          isOpen={Boolean(selectedBookingForDecision)}
          onClose={() => setSelectedBookingForDecision(null)}
          title={decisionType === 'approve' ? 'Approve Booking Request' : 'Reject Booking Request'}
        >
          <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
            <p className="text-slate-600">
              {decisionType === 'approve'
                ? `Confirm approval for ${selectedBookingForDecision.user?.name}'s booking on ${selectedBookingForDecision.date} (${selectedBookingForDecision.startTime} - ${selectedBookingForDecision.endTime})?`
                : `Are you sure you want to reject ${selectedBookingForDecision.user?.name}'s booking? This slot will immediately be made available for waitlisted students.`}
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {decisionType === 'approve' ? 'Administrative Note (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                rows={3}
                required={decisionType === 'reject'}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={decisionType === 'approve' ? 'e.g. Approved. Please pick up key from lab technician...' : 'e.g. Lab undergoing maintenance during this window...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForDecision(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingDecision}
                className={`px-4 py-2 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 ${
                  decisionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                }`}
              >
                {submittingDecision
                  ? 'Processing...'
                  : decisionType === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create / Edit Resource Modal */}
      {isResourceModalOpen && (
        <Modal
          isOpen={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          title={editingResource ? 'Edit Facility' : 'Add New Campus Facility'}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveResource} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={resourceFormData.name}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, name: e.target.value })}
                  placeholder="e.g. AI Vision Lab"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={resourceFormData.type}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="study_room">Study Room</option>
                  <option value="lab">Lab & Workshop</option>
                  <option value="court">Sports Court</option>
                  <option value="equipment">Equipment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                required
                value={resourceFormData.location}
                onChange={(e) => setResourceFormData({ ...resourceFormData, location: e.target.value })}
                placeholder="e.g. Block B, Room 204"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                required
                value={resourceFormData.description}
                onChange={(e) => setResourceFormData({ ...resourceFormData, description: e.target.value })}
                placeholder="Equipment, rules, capabilities..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={resourceFormData.capacity}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Open Time</label>
                <input
                  type="time"
                  required
                  value={resourceFormData.openTime}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, openTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Close Time</label>
                <input
                  type="time"
                  required
                  value={resourceFormData.closeTime}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, closeTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Slot Interval</label>
                <select
                  value={resourceFormData.slotMinutes}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, slotMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Duration Slots</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  required
                  value={resourceFormData.maxDurationSlots}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, maxDurationSlots: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={resourceFormData.requiresApproval}
                onChange={(e) => setResourceFormData({ ...resourceFormData, requiresApproval: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <label htmlFor="requiresApproval" className="font-semibold text-slate-700">
                Requires Faculty Approval before confirmation
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsResourceModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-md shadow-brand-500/20"
              >
                {editingResource ? 'Update Facility' : 'Create Facility'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
