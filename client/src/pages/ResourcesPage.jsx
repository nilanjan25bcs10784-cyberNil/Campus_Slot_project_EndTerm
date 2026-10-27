import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  Filter,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import * as resourcesApi from '../api/resources.js';
import { TypeBadge } from '../components/common/Badge.jsx';
import { GridSkeleton } from '../components/common/Skeleton.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';

export function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const resourceTypes = [
    { id: '', label: 'All Resources' },
    { id: 'study_room', label: 'Study Rooms' },
    { id: 'lab', label: 'Labs & Workshops' },
    { id: 'court', label: 'Sports Courts' },
    { id: 'equipment', label: 'Equipment' },
  ];

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm) params.q = searchTerm;
      if (selectedType) params.type = selectedType;
      if (minCapacity) params.minCapacity = minCapacity;
      if (filterDate && filterStartTime && filterEndTime) {
        params.date = filterDate;
        params.startTime = filterStartTime;
        params.endTime = filterEndTime;
      }

      const data = await resourcesApi.getResources(params);
      setResources(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedType, minCapacity, filterDate, filterStartTime, filterEndTime]);

  // Handle search with enter or button
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResources();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setMinCapacity('');
    setFilterDate('');
    setFilterStartTime('');
    setFilterEndTime('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Facilities & Resources
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and reserve study spaces, robotics benches, sports facilities, and specialized lab equipment
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {resourceTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                selectedType === t.id
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Input & Expand Filter Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by facility name, lab description, or location..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition"
            >
              Search
            </button>
          </form>

          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition ${
              isFilterExpanded || filterDate || minCapacity
                ? 'bg-brand-50 border-brand-200 text-brand-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Time & Capacity Filters</span>
          </button>
        </div>

        {/* Expandable Availability & Capacity Query Filters */}
        {isFilterExpanded && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Minimum Capacity</label>
              <input
                type="number"
                min="1"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                placeholder="e.g. 4 people"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Specific Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">From Time</label>
              <input
                type="time"
                value={filterStartTime}
                onChange={(e) => setFilterStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">To Time</label>
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={filterEndTime}
                  onChange={(e) => setFilterEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {(minCapacity || filterDate || filterStartTime || filterEndTime) && (
                  <button
                    onClick={clearFilters}
                    className="px-2.5 py-2 text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 rounded-lg transition"
                    title="Clear filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <GridSkeleton count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchResources} />
      ) : resources.length === 0 ? (
        <EmptyState
          title="No resources match your filters"
          message="Try broadening your search keywords or resetting specific time window filters."
          action={
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs"
            >
              Reset All Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div
              key={res._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <TypeBadge type={res.type} />
                  {res.requiresApproval ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Approval Req.
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Instant Booking
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition">
                    {res.name}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{res.location}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {res.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Capacity: <strong className="text-slate-700">{res.capacity}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Slots: <strong className="text-slate-700">{res.slotMinutes}m</strong></span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {res.openTime} - {res.closeTime}
                </span>
                <Link
                  to={`/resources/${res._id}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-600 hover:text-brand-700"
                >
                  <span>Select Slot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
