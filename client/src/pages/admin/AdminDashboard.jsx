import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import EquipmentList from './EquipmentList';
import CreateEquipmentForm from './CreateEquipmentForm';
import SiteList from './SiteList';
import FullMapView from './FullMapView';
import {
  LogOut, Cpu, Users, MapPin, Package,
  TrendingUp, AlertTriangle, CheckCircle2, Settings, Map,
} from 'lucide-react';

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className={`bg-white border border-zinc-200 rounded-md p-4 shadow-sm flex items-center justify-between border-l-4 ${color}`}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        <h4 className="text-3xl font-black font-mono text-zinc-900">{value}</h4>
        {sub && <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">{sub}</p>}
      </div>
      <div className={`p-3 rounded-md border ${color.replace('border-l-', 'border-').replace('[', '[').replace('border-l-4 ', '')}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

const NAV = [
  { key: 'overview',  label: 'Overview',  icon: TrendingUp, path: '/admin' },
  { key: 'equipment', label: 'Equipment', icon: Cpu,        path: '/admin/equipment' },
  { key: 'users',     label: 'Users',     icon: Users,      path: '/admin/users' },
  { key: 'sites',     label: 'Sites',     icon: MapPin,     path: '/admin/sites' },
  { key: 'map',       label: 'Fleet Map', icon: Map,        path: '/admin/map' },
];

function Overview({ stats }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Equipment"  value={stats.total}      sub="Across all sites"       color="border-l-[#FFC500]"  icon={Cpu} />
        <StatCard label="Active"           value={stats.active}     sub="Currently operating"    color="border-l-[#12B76A]"  icon={CheckCircle2} />
        <StatCard label="Idle / Overdue"   value={stats.idle + stats.overdue} sub="Needs attention" color="border-l-[#F79009]" icon={AlertTriangle} />
        <StatCard label="Unassigned"       value={stats.unassigned} sub="No site allocated"      color="border-l-zinc-400"   icon={Package} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/admin/equipment')}
            className="flex items-center gap-3 p-4 bg-zinc-50 hover:bg-[#FFC500]/10 border border-zinc-200 hover:border-[#FFC500] rounded-md transition group"
          >
            <div className="p-2 bg-[#FFC500] text-black rounded-md"><Cpu className="w-5 h-5" /></div>
            <div className="text-left">
              <p className="text-xs font-black text-zinc-900 uppercase">Manage Equipment</p>
              <p className="text-[10px] text-zinc-500 font-mono">View, add, edit, delete fleet assets</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/equipment/new')}
            className="flex items-center gap-3 p-4 bg-zinc-50 hover:bg-[#12B76A]/10 border border-zinc-200 hover:border-[#12B76A] rounded-md transition"
          >
            <div className="p-2 bg-[#12B76A] text-white rounded-md"><Package className="w-5 h-5" /></div>
            <div className="text-left">
              <p className="text-xs font-black text-zinc-900 uppercase">Add New Equipment</p>
              <p className="text-[10px] text-zinc-500 font-mono">Register a new fleet asset</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/sites')}
            className="flex items-center gap-3 p-4 bg-zinc-50 hover:bg-blue-50 border border-zinc-200 hover:border-blue-400 rounded-md transition"
          >
            <div className="p-2 bg-blue-600 text-white rounded-md"><MapPin className="w-5 h-5" /></div>
            <div className="text-left">
              <p className="text-xs font-black text-zinc-900 uppercase">View Sites</p>
              <p className="text-[10px] text-zinc-500 font-mono">All construction site locations</p>
            </div>
          </button>
        </div>
      </div>

      {/* Status Breakdown Table */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-3">
          Fleet Status Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-zinc-800">
            <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Count</th>
                <th className="py-3 px-4 text-left">% of Fleet</th>
                <th className="py-3 px-4 text-left">Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {[
                { label: 'Active',     count: stats.active,     color: '#12B76A', bg: 'bg-[#12B76A]' },
                { label: 'Idle',       count: stats.idle,       color: '#F79009', bg: 'bg-[#F79009]' },
                { label: 'Overdue',    count: stats.overdue,    color: '#D92D20', bg: 'bg-[#D92D20]' },
                { label: 'Unassigned', count: stats.unassigned, color: '#71717A', bg: 'bg-zinc-400' },
              ].map((row) => (
                <tr key={row.label} className="hover:bg-zinc-50">
                  <td className="py-3 px-4 font-bold uppercase text-zinc-900">{row.label}</td>
                  <td className="py-3 px-4 font-black text-zinc-900">{row.count}</td>
                  <td className="py-3 px-4 text-zinc-600">
                    {stats.total > 0 ? Math.round((row.count / stats.total) * 100) : 0}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-32 bg-zinc-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${row.bg}`}
                        style={{ width: stats.total > 0 ? `${(row.count / stats.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/managers').then((r) => setUsers(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
      <div className="border-b border-zinc-200 pb-3">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Managers</h3>
        <p className="text-xs text-zinc-500 font-medium">All users with manager role</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-zinc-800">
          <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
            <tr>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 font-mono">
            {loading ? (
              <tr><td colSpan={3} className="py-8 text-center text-zinc-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-zinc-500">No managers found.</td></tr>
            ) : users.map((u) => (
              <tr key={u._id} className="hover:bg-zinc-50">
                <td className="py-3 px-4 font-bold text-zinc-900">{u.name}</td>
                <td className="py-3 px-4 text-zinc-600">{u.email}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">
                    manager
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SitesPanel() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/sites').then((r) => setSites(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
      <div className="border-b border-zinc-200 pb-3">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Construction Sites</h3>
        <p className="text-xs text-zinc-500 font-medium">All registered site locations</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-zinc-800">
          <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
            <tr>
              <th className="py-3 px-4 text-left">Site Name</th>
              <th className="py-3 px-4 text-left">Latitude</th>
              <th className="py-3 px-4 text-left">Longitude</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 font-mono">
            {loading ? (
              <tr><td colSpan={3} className="py-8 text-center text-zinc-500">Loading...</td></tr>
            ) : sites.map((s) => (
              <tr key={s._id} className="hover:bg-zinc-50">
                <td className="py-3 px-4 font-bold text-zinc-900 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#FFC500]" />{s.name}
                </td>
                <td className="py-3 px-4 text-zinc-600">{s.location?.lat?.toFixed(4)}</td>
                <td className="py-3 px-4 text-zinc-600">{s.location?.lng?.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({ total: 0, active: 0, idle: 0, overdue: 0, unassigned: 0 });

  useEffect(() => {
    api.get('/api/admin/equipment').then((r) => {
      const eq = r.data;
      setStats({
        total:      eq.length,
        active:     eq.filter((e) => e.status === 'active').length,
        idle:       eq.filter((e) => e.status === 'idle').length,
        overdue:    eq.filter((e) => e.status === 'overdue').length,
        unassigned: eq.filter((e) => e.status === 'unassigned').length,
      });
    }).catch(() => {});
  }, [location.pathname]);

  const activeNav = NAV.find((n) =>
    n.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(n.path)
  )?.key || 'overview';

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col font-sans">
      {/* Same dark header style as ManagerDashboard */}
      <header className="bg-[#1E1E1E] text-white border-b-2 border-black sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFC500] text-black font-black text-2xl px-3 py-1 rounded-sm tracking-tighter shadow-sm flex items-center gap-1.5 border-b-2 border-black/20">
              <span>CAT</span>
              <span className="text-xs bg-black text-[#FFC500] px-1.5 py-0.5 font-mono uppercase font-bold tracking-widest">
                ADMIN
              </span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-white text-base tracking-tight uppercase">
                Super Admin Control Panel
              </h1>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                Equipment Registry • User Management • Site Configuration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manager')}
              className="bg-zinc-800 hover:bg-[#FFC500] hover:text-black text-[#FFC500] font-extrabold text-xs uppercase px-3.5 py-2 min-h-[44px] rounded transition shadow border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
              title="Switch to Fleet Manager GIS Dashboard"
            >
              <span>🚜 FLEET MANAGER MAP</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await api.get('/api/rentals/export-pdf', { responseType: 'blob' });
                  const blob = new Blob([res.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `CAT-Admin-Fleet-Report-${Date.now()}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch {
                  alert('Failed to generate PDF report.');
                }
              }}
              className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase px-3.5 py-2 min-h-[44px] rounded transition shadow border-b-2 border-black/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>📄 EXPORT PDF</span>
            </button>
            <div className="hidden lg:flex items-center gap-2 bg-[#121212] border border-zinc-700 px-3 py-1.5 rounded text-xs min-h-[44px]">
              <Settings className="w-4 h-4 text-[#FFC500]" />
              <div>
                <span className="font-bold text-white uppercase block leading-none">{auth?.name}</span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Role: Admin</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-zinc-800 hover:bg-[#D92D20] text-zinc-300 hover:text-white px-3 py-2 min-h-[44px] rounded border border-zinc-700 transition flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl w-full mx-auto flex flex-1 gap-0">
        {/* Sidebar Nav — clearly different from manager's tab bar */}
        <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 min-h-full p-4 space-y-1 hidden md:block">
          <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest px-3 pb-2">
            Admin Modules
          </p>
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-bold uppercase tracking-wide transition cursor-pointer ${
                  isActive
                    ? 'bg-[#FFC500] text-black border-b-2 border-black/20 shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}

          <div className="pt-4 border-t border-zinc-200 mt-4">
            <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest px-3 pb-2">
              Fleet Stats
            </p>
            <div className="space-y-2 px-1">
              {[
                { label: 'Total',      val: stats.total,      color: 'text-zinc-900' },
                { label: 'Active',     val: stats.active,     color: 'text-[#12B76A]' },
                { label: 'Idle',       val: stats.idle,       color: 'text-[#F79009]' },
                { label: 'Overdue',    val: stats.overdue,    color: 'text-[#D92D20]' },
                { label: 'Unassigned', val: stats.unassigned, color: 'text-zinc-500' },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center px-2 py-1 bg-zinc-50 rounded text-[10px] font-mono">
                  <span className="text-zinc-500 uppercase font-bold">{s.label}</span>
                  <span className={`font-black text-sm ${s.color}`}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden w-full bg-white border-b border-zinc-200 flex overflow-x-auto px-2 py-2 gap-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 min-h-[40px] rounded-md text-xs font-bold uppercase whitespace-nowrap transition ${
                  isActive ? 'bg-[#FFC500] text-black' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{item.label}
              </button>
            );
          })}
        </div>

        {/* Main content area */}
        <main className="flex-1 p-6 space-y-6 min-w-0">
          <Routes>
            <Route index element={<Overview stats={stats} />} />
            <Route path="equipment" element={<EquipmentList />} />
            <Route path="equipment/new" element={<CreateEquipmentForm />} />
            <Route path="equipment/:id/edit" element={<CreateEquipmentForm />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="sites" element={<SiteList />} />
            <Route path="map" element={<FullMapView />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      <footer className="bg-white border-t border-zinc-200 py-4 text-center text-xs font-mono text-zinc-500 uppercase tracking-widest">
        CAT RENTALS — SUPER ADMIN CONTROL PANEL
      </footer>
    </div>
  );
}
