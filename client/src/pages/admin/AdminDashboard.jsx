import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import CreateManagerForm from './CreateManagerForm';
import ManagerList from './ManagerList';

export default function AdminDashboard() {
  const { auth, logout } = useAuth();
  const [overview, setOverview] = useState({ totalEquipment: 0, activeManagers: 0, openAlerts: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchOverview();
  }, [refreshKey]);

  const fetchOverview = async () => {
    try {
      const { data } = await api.get('/api/admin/overview');
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch admin overview metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-inner">
              CAT
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-amber-400">Super Admin Dashboard</h1>
              <p className="text-xs text-slate-400">CAT Rental — Smart Rental Tracking System</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="block text-sm font-semibold text-slate-200">{auth?.name || 'Super Admin'}</span>
              <span className="block text-[11px] text-amber-400/90 font-mono uppercase tracking-wider">
                Role: {auth?.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Cards Section */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">System Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Total Equipment */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Equipment</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {loading ? '...' : overview.totalEquipment}
                </p>
                <p className="text-xs text-gray-400 mt-1">Tracked system machinery</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xl">
                🚜
              </div>
            </div>

            {/* Active Managers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Managers</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {loading ? '...' : overview.activeManagers}
                </p>
                <p className="text-xs text-gray-400 mt-1">Assigned site overseers</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xl">
                👤
              </div>
            </div>

            {/* Open Alerts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Open Alerts</p>
                <p className="text-3xl font-extrabold text-red-600 mt-1">
                  {loading ? '...' : overview.openAlerts}
                </p>
                <p className="text-xs text-gray-400 mt-1">Unresolved system anomalies</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xl">
                ⚠️
              </div>
            </div>
          </div>
        </section>

        {/* Manager Management Section */}
        <section className="space-y-8">
          <CreateManagerForm onManagerCreated={triggerRefresh} />
          <ManagerList refreshKey={refreshKey} onManagerUpdated={triggerRefresh} />
        </section>
      </main>
    </div>
  );
}
