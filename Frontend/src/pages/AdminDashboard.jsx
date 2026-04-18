import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, AlertTriangle, Users, Shield, TrendingUp,
  CheckCircle, XCircle, Clock, MapPin, RefreshCw, Filter,
  ChevronLeft, ChevronRight, BarChart3, Activity, ShieldAlert,
  Eye, UserCheck, UserX
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  Area, AreaChart
} from 'recharts';

const PIE_COLORS = ['#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#6366f1'];

const CATEGORY_LABELS = {
  harassment: 'Harassment',
  stalking: 'Stalking',
  assault: 'Assault',
  theft: 'Theft',
  eve_teasing: 'Eve Teasing',
  unsafe_area: 'Unsafe Area',
  other: 'Other',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [incidentFilter, setIncidentFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      toast.error('Failed to load dashboard stats');
    }
  }, []);

  const fetchIncidents = useCallback(async (page = 1) => {
    try {
      const res = await adminAPI.getIncidents({ page, limit: 15, status: incidentFilter || undefined });
      setIncidents(res.data.data.incidents);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  }, [incidentFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers({ limit: 50 });
      setUsers(res.data.data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchIncidents(), fetchUsers()]);
      setLoading(false);
    };
    load();
  }, [fetchStats, fetchIncidents, fetchUsers]);

  useEffect(() => {
    fetchIncidents(1);
  }, [incidentFilter, fetchIncidents]);

  const handleModerate = async (id, status) => {
    try {
      await adminAPI.moderateIncident(id, { status });
      toast.success(`Incident ${status}`);
      fetchIncidents(pagination.page);
      fetchStats();
    } catch (err) {
      toast.error('Moderation failed');
    }
  };

  const handleToggleUser = async (id) => {
    try {
      await adminAPI.toggleUser(id);
      toast.success('User status updated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const handleRecalculate = async () => {
    setRefreshing(true);
    try {
      await adminAPI.recalculateScores();
      toast.success('Safety scores recalculated');
      fetchStats();
    } catch (err) {
      toast.error('Recalculation failed');
    } finally {
      setRefreshing(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'users', label: 'Users', icon: Users },
  ];

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen pt-16">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-white flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary-400" />
              Admin Dashboard
            </h1>
            <p className="text-dark-400 mt-1">Manage incidents, users, and safety intelligence</p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Recalculate Scores
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-dark-800/60 rounded-xl p-1 border border-dark-700/50 mb-8 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Incidents', value: stats.overview.totalIncidents, icon: AlertTriangle, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5' },
                { label: 'Pending Review', value: stats.overview.pendingIncidents, icon: Clock, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-600/5' },
                { label: 'Total Users', value: stats.overview.totalUsers, icon: Users, color: 'text-primary-400', bg: 'from-primary-500/10 to-primary-600/5' },
                { label: 'High Risk Areas', value: stats.overview.highRiskAreas, icon: ShieldAlert, color: 'text-red-400', bg: 'from-red-500/10 to-red-600/5' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="stat-card">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <p className="text-dark-400 text-sm mb-1">{label}</p>
                  <p className="text-3xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Trend */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-400" />
                  Incident Trend (30 Days)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={stats.dailyTrend || []}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => v?.slice(5) || ''} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                      labelFormatter={(v) => `Date: ${v}`}
                    />
                    <Area type="monotone" dataKey="count" stroke="#a855f7" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent-400" />
                  Incidents by Category
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={(stats.categoryStats || []).map((c) => ({ name: CATEGORY_LABELS[c._id] || c._id, value: c.count }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(stats.categoryStats || []).map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {(stats.categoryStats || []).map((c, i) => (
                    <div key={c._id} className="flex items-center gap-1.5 text-xs text-dark-300">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {CATEGORY_LABELS[c._id] || c._id}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-dark-400" />
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setIncidentFilter(f === 'all' ? '' : f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    (incidentFilter || 'all') === (f === 'all' ? '' : f)
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-800/60 text-dark-400 hover:text-dark-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Area</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Severity</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => (
                    <tr key={inc._id} className="table-row">
                      <td className="px-4 py-3 text-sm text-dark-300 whitespace-nowrap">
                        {new Date(inc.incidentDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-200 font-medium">
                        {inc.areaName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-dark-700/60 text-dark-200 border border-dark-600/50">
                          {CATEGORY_LABELS[inc.category] || inc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          inc.severity === 'high' ? 'badge-danger' :
                          inc.severity === 'medium' ? 'badge-moderate' : 'badge-safe'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          inc.status === 'approved' ? 'badge-safe' :
                          inc.status === 'rejected' ? 'badge-danger' : 'badge-pending'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-400 max-w-xs truncate">
                        {inc.description}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inc.status === 'pending' && (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleModerate(inc._id, 'approved')}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleModerate(inc._id, 'rejected')}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {incidents.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-dark-400">
                        No incidents found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-dark-400">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchIncidents(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="btn-secondary !py-2 !px-3 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fetchIncidents(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="btn-secondary !py-2 !px-3 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && stats && (
          <div className="space-y-6 animate-fade-in">
            {/* Area-wise Incidents */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-400" />
                Top Areas by Incidents
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={(stats.areaStats || []).map((a) => ({ name: a._id || 'Unknown', count: a.count }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                  <Bar dataKey="count" fill="#a855f7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="stat-card text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.overview.approvedIncidents}</p>
                <p className="text-sm text-dark-400">Approved</p>
              </div>
              <div className="stat-card text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.overview.rejectedIncidents}</p>
                <p className="text-sm text-dark-400">Rejected</p>
              </div>
              <div className="stat-card text-center">
                <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.overview.recentIncidents}</p>
                <p className="text-sm text-dark-400">This Week</p>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="animate-fade-in">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Joined</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="table-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-dark-200">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${u.role === 'admin' ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-dark-700/60 text-dark-300 border border-dark-600/50'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${u.isActive ? 'badge-safe' : 'badge-danger'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleUser(u._id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            u.isActive
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
