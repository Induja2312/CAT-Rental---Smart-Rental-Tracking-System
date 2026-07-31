import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import socket from '../../sockets/socket';
import MapView from './MapView';
import UtilizationCharts from './UtilizationCharts';
import AllocationPanel from './AllocationPanel';
import AlertFeed from './AlertFeed';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  Activity,
  MapPin,
  BarChart3,
  Navigation,
  ShieldAlert,
  LogOut,
  UserCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Fuel,
  Zap,
  Gauge,
  Settings,
  Users,
  ChevronRight,
  FileText,
} from 'lucide-react';

// Default Fallback Dataset (Grounded in Problem Prompt Table)
const FALLBACK_EQUIPMENT = [
  {
    _id: 'eq1',
    equipmentId: 'EQX1001',
    type: 'Excavator',
    siteId: { _id: 'site3', name: 'Madurai Infra (S003)', location: { lat: 9.9252, lng: 78.1198 } },
    status: 'active',
    engineHoursToday: 1.5,
    idleHoursToday: 10.0,
    fuelLevel: 78,
    currentLocation: { lat: 9.9280, lng: 78.1220 },
    lastOperatorId: { name: 'OP101' },
    checkInDate: '2025-04-01',
    checkOutDate: '2025-04-16',
    rentalDays: 15,
  },
  {
    _id: 'eq2',
    equipmentId: 'EQX1002',
    type: 'Crane',
    siteId: null,
    status: 'idle',
    engineHoursToday: 0.0,
    idleHoursToday: 11.0,
    fuelLevel: 92,
    currentLocation: { lat: 13.0850, lng: 80.2730 },
    lastOperatorId: null,
    checkInDate: '2025-03-10',
    checkOutDate: '2025-03-30',
    rentalDays: 20,
  },
  {
    _id: 'eq3',
    equipmentId: 'EQX1003',
    type: 'Bulldozer',
    siteId: { _id: 'site2', name: 'Coimbatore Mining (S002)', location: { lat: 11.0168, lng: 76.9558 } },
    status: 'active',
    engineHoursToday: 7.5,
    idleHoursToday: 0.5,
    fuelLevel: 65,
    currentLocation: { lat: 11.0190, lng: 76.9580 },
    lastOperatorId: { name: 'OP203' },
    checkInDate: '2025-02-15',
    checkOutDate: '2025-03-11',
    rentalDays: 25,
  },
  {
    _id: 'eq4',
    equipmentId: 'EQX1004',
    type: 'Excavator',
    siteId: { _id: 'site4', name: 'Trichy Industrial (S004)', location: { lat: 10.7905, lng: 78.7047 } },
    status: 'overdue',
    engineHoursToday: 2.0,
    idleHoursToday: 9.0,
    fuelLevel: 42,
    currentLocation: { lat: 10.7930, lng: 78.7070 },
    lastOperatorId: { name: 'OP106' },
    checkInDate: '2025-05-05',
    checkOutDate: '2025-05-15',
    rentalDays: 10,
  },
  {
    _id: 'eq5',
    equipmentId: 'EQX1005',
    type: 'Bulldozer',
    siteId: { _id: 'site6', name: 'Salem Steel Zone (S006)', location: { lat: 11.6643, lng: 78.1460 } },
    status: 'active',
    engineHoursToday: 8.0,
    idleHoursToday: 0.0,
    fuelLevel: 88,
    currentLocation: { lat: 11.6670, lng: 78.1490 },
    lastOperatorId: { name: 'OP108' },
    checkInDate: '2025-04-10',
    checkOutDate: '2025-04-25',
    rentalDays: 15,
  },
  {
    _id: 'eq6',
    equipmentId: 'EQX1006',
    type: 'Grader',
    siteId: { _id: 'site1', name: 'Chennai Port Hub (S001)', location: { lat: 13.0827, lng: 80.2707 } },
    status: 'idle',
    engineHoursToday: 1.0,
    idleHoursToday: 7.0,
    fuelLevel: 70,
    currentLocation: { lat: 13.0800, lng: 80.2680 },
    lastOperatorId: null,
    checkInDate: '2025-03-01',
    checkOutDate: '2025-03-15',
    rentalDays: 14,
  },
  {
    _id: 'eq7',
    equipmentId: 'EQX1007',
    type: 'Excavator',
    siteId: null,
    status: 'unassigned',
    engineHoursToday: 0.0,
    idleHoursToday: 12.0,
    fuelLevel: 95,
    currentLocation: { lat: 10.7900, lng: 78.7000 },
    lastOperatorId: null,
    checkInDate: '2025-03-20',
    checkOutDate: '2025-04-01',
    rentalDays: 12,
  },
];

const FALLBACK_SITES = [
  { _id: 'site1', name: 'Chennai Port Hub (S001)', location: { lat: 13.0827, lng: 80.2707 }, radiusKm: 15 },
  { _id: 'site2', name: 'Coimbatore Mining (S002)', location: { lat: 11.0168, lng: 76.9558 }, radiusKm: 20 },
  { _id: 'site3', name: 'Madurai Infra (S003)', location: { lat: 9.9252, lng: 78.1198 }, radiusKm: 15 },
  { _id: 'site4', name: 'Trichy Industrial (S004)', location: { lat: 10.7905, lng: 78.7047 }, radiusKm: 12 },
  { _id: 'site6', name: 'Salem Steel Zone (S006)', location: { lat: 11.6643, lng: 78.1460 }, radiusKm: 18 },
];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('map');
  const [equipments, setEquipments] = useState(FALLBACK_EQUIPMENT);
  const [sites, setSites] = useState(FALLBACK_SITES);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedDijkstraPath, setSelectedDijkstraPath] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(FALLBACK_EQUIPMENT[0]);

  // Manager Switcher State
  const [availableManagers, setAvailableManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState('current');

  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    if (socket) {
      setSocketConnected(socket.connected);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
    }

    return () => {
      if (socket) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      }
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/allocation/rank?type=All');
      if (res.data?.recommendations && res.data.recommendations.length > 0) {
        const mapped = res.data.recommendations.map((r) => ({
          ...r.equipment,
          engineHoursToday: r.engineHoursToday,
          idleHoursToday: r.idleHoursToday,
          fuelLevel: r.fuelLevel,
        }));
        setEquipments(mapped);
        if (!selectedMachine && mapped.length > 0) setSelectedMachine(mapped[0]);
      }
      if (res.data?.sitesNetwork && res.data.sitesNetwork.length > 0) {
        setSites(res.data.sitesNetwork);
      }
    } catch (err) {
      console.log('Using fallback dataset');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Fetch available managers for switching scope
    axios.get('/api/manager/list')
      .then((res) => {
        const mgrs = res.data || [];
        setAvailableManagers(mgrs);
        if (mgrs.length > 0) {
          const myMgr = mgrs.find(m => m._id === auth?.id || m.email === auth?.email);
          if (myMgr) {
            setSelectedManagerId(myMgr._id);
          } else {
            setSelectedManagerId(mgrs[0]._id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Compute Manager Scope Filtering (Strictly for selected manager)
  const selectedManagerObj = availableManagers.find((m) => m._id === selectedManagerId) || availableManagers[0];

  const activeAssignedSites = selectedManagerObj?.assignedSites || [];

  const activeSiteIdStrings = activeAssignedSites
    .map((s) => (typeof s === 'object' ? s._id?.toString() || s.toString() : s?.toString()))
    .filter(Boolean);

  const displayedEquipments = equipments.filter((eq) => {
    if (!eq.siteId) return false;
    const sid = eq.siteId._id?.toString() || eq.siteId?.toString();
    return activeSiteIdStrings.includes(sid);
  });

  const displayedSites = sites.filter((site) => {
    const sid = site._id?.toString();
    return activeSiteIdStrings.includes(sid);
  });

  const handleSelectTopMachine = (eq) => {
    setSelectedMachine(eq);
    setActiveTab('map');
  };

  const [operatorActivity, setOperatorActivity] = useState([]);

  const fetchOperatorActivity = async () => {
    try {
      const res = await axios.get('/api/operator/fleet-activity');
      setOperatorActivity(res.data || []);
    } catch {
      setOperatorActivity([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'operators') {
      fetchOperatorActivity();
    }
  }, [activeTab]);

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`/api/rentals/export-pdf?managerId=${selectedManagerId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CAT-Rental-Fleet-Report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate PDF report. Ensure backend is running.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-zinc-900 flex flex-col font-sans selection:bg-[#FFC500] selection:text-black">
      {/* Enterprise Dark Header Bar */}
      <header className="bg-[#1E1E1E] text-white border-b-2 border-black sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] flex items-center justify-between gap-4 py-2">
          {/* Brand Anchor */}
          <div className="flex items-center gap-3">
            <div className="bg-[#FFC500] text-black font-black text-2xl px-3 py-1 rounded-sm tracking-tighter shadow-sm flex items-center gap-1.5 border-b-2 border-black/20">
              <span>CAT</span>
              <span className="text-xs bg-black text-[#FFC500] px-1.5 py-0.5 font-mono uppercase font-bold tracking-widest">
                RENTALS
              </span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-white text-base tracking-tight uppercase">
                CAT Rentals Operating Portal
              </h1>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                Geofence Radius Tracking • Machine Telematics • Optimal Routing
              </p>
            </div>
          </div>

          {/* Right Status & Manager Scope Controls */}
          <div className="flex items-center gap-3">
            {/* View As Manager Scope Switcher */}
            <div className="flex items-center gap-2 bg-[#121212] border border-[#FFC500]/40 px-3 py-1.5 rounded text-xs min-h-[44px]">
              <Users className="w-4 h-4 text-[#FFC500]" />
              <div>
                <span className="text-[9px] font-mono text-zinc-400 uppercase block leading-none mb-0.5">
                  Manager Scope:
                </span>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="bg-[#18181b] text-[#FFC500] font-bold text-xs rounded border border-zinc-700 px-2 py-0.5 focus:border-[#FFC500] focus:outline-none cursor-pointer"
                >
                  {availableManagers.map((m) => {
                    const siteNames = (m.assignedSites || []).map(s => typeof s === 'object' ? s.name?.split(' ')[0] : 'Site').join(', ');
                    return (
                      <option key={m._id} value={m._id}>
                        {m.name} [{siteNames || `${m.assignedSites?.length || 0} Sites`}]
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div
              className={`hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded border font-mono font-bold uppercase tracking-wider ${
                socketConnected
                  ? 'bg-[#12B76A]/20 border-[#12B76A] text-[#12B76A]'
                  : 'bg-[#F79009]/20 border-[#F79009] text-[#F79009]'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  socketConnected ? 'bg-[#12B76A] animate-pulse' : 'bg-[#F79009]'
                }`}
              ></span>
              <span className="hidden lg:inline">
                {socketConnected ? 'Primary Node Live' : 'Telematics Standby'}
              </span>
            </div>

            {auth?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold px-3 py-2 min-h-[44px] rounded transition flex items-center gap-1.5 text-xs uppercase cursor-pointer border-b-2 border-black/20"
                title="Switch to Admin Control Panel"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Panel</span>
              </button>
            )}

            <button
              onClick={logout}
              className="bg-zinc-800 hover:bg-[#D92D20] text-zinc-300 hover:text-white px-3 py-2 min-h-[44px] rounded border border-zinc-700 transition flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Enterprise Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ITEM-BY-MACHINE TELEMATICS ANALYTICS BAR AT TOP */}
        <div className="bg-white border border-zinc-300 rounded-md p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#FFC500] text-black rounded font-black text-xs">
                TELEMATICS
              </span>
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                Machinery Telematics Stream ({displayedEquipments.length} Assets in View)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
              Click machine card to locate on GIS map
            </span>
          </div>

          {/* Machine-by-Machine Horizontal Telematics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 overflow-x-auto pb-1">
            {displayedEquipments.map((eq) => {
              const isSelected = selectedMachine?.equipmentId === eq.equipmentId;
              const statusColor =
                eq.status === 'active'
                  ? 'border-[#12B76A] text-[#12B76A]'
                  : eq.status === 'idle'
                  ? 'border-[#F79009] text-[#F79009]'
                  : 'border-[#D92D20] text-[#D92D20]';

              return (
                <div
                  key={eq._id || eq.equipmentId}
                  onClick={() => handleSelectTopMachine(eq)}
                  className={`p-3 rounded border-2 transition cursor-pointer flex flex-col justify-between font-mono space-y-1.5 ${
                    isSelected
                      ? 'bg-[#FFC500]/10 border-[#FFC500] ring-2 ring-[#FFC500]/40'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1">
                    <span className="font-black text-zinc-900 text-xs">{eq.equipmentId}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusColor}`}
                    >
                      {eq.status}
                    </span>
                  </div>

                  <div className="text-[10px] space-y-0.5 text-zinc-700">
                    <div className="font-sans font-bold text-zinc-900 text-[11px] truncate">
                      {eq.type}
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Engine:</span>
                      <span className="font-bold text-[#12B76A]">{eq.engineHoursToday ?? 4}h</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Idle:</span>
                      <span className="font-bold text-[#F79009]">{eq.idleHoursToday ?? 2}h</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Fuel:</span>
                      <span className="font-bold text-zinc-900">{eq.fuelLevel ?? 85}%</span>
                    </div>
                  </div>

                  <div className="text-[9px] font-sans text-zinc-500 bg-white px-1.5 py-0.5 rounded border border-zinc-200 truncate">
                    {eq.siteId?.name?.split(' ')[0] || 'Depot'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Machine Telematics Highlight Card (If Clicked) */}
        {selectedMachine && (
          <div className="bg-white border-2 border-zinc-900 rounded-md p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#FFC500] text-black rounded font-mono font-black text-lg">
                {selectedMachine.equipmentId}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-zinc-900">
                    {selectedMachine.equipmentId} — {selectedMachine.type}
                  </h4>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      selectedMachine.status === 'active'
                        ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                        : selectedMachine.status === 'idle'
                        ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                        : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]'
                    }`}
                  >
                    {selectedMachine.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  STATIONED AT: <strong className="text-zinc-900">{selectedMachine.siteId?.name || 'Main Depot'}</strong> | OPERATOR: <strong className="text-zinc-900">{selectedMachine.lastOperatorId?.name || 'UNASSIGNED'}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs w-full md:w-auto">
              <div className="bg-zinc-50 p-2.5 rounded border border-zinc-200 text-center">
                <span className="text-[10px] text-zinc-500 block uppercase">ENGINE RUN</span>
                <span className="font-black text-base text-[#12B76A]">
                  {selectedMachine.engineHoursToday ?? 4} hrs/day
                </span>
              </div>
              <div className="bg-zinc-50 p-2.5 rounded border border-zinc-200 text-center">
                <span className="text-[10px] text-zinc-500 block uppercase">IDLE RUN</span>
                <span className="font-black text-base text-[#F79009]">
                  {selectedMachine.idleHoursToday ?? 2} hrs/day
                </span>
              </div>
              <div className="bg-zinc-50 p-2.5 rounded border border-zinc-200 text-center">
                <span className="text-[10px] text-zinc-500 block uppercase">FUEL LEVEL</span>
                <span className="font-black text-base text-zinc-900">
                  {selectedMachine.fuelLevel ?? 85}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Navigation Tabs (Strict 48px Touch Targets) */}
        <div className="flex items-center gap-2 border-b border-zinc-300 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'map'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <MapPin className="w-4 h-4" /> GIS Fleet Map & Geofence
          </button>

          <button
            onClick={() => setActiveTab('allocation')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'allocation'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <Navigation className="w-4 h-4" /> Dijkstra Route & Allocation Engine
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Utilization Charts
          </button>

          <button
            onClick={() => setActiveTab('operators')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'operators'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Operator Monitoring
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'alerts'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Telemetry Alert Stream
          </button>

          <button
            onClick={handleDownloadPDF}
            className="ml-auto bg-[#18181b] hover:bg-black text-[#FFC500] font-bold text-xs uppercase px-4 min-h-[48px] rounded-md border border-zinc-800 transition flex items-center gap-2 cursor-pointer shadow"
            title="Download PDF Fleet Report"
          >
            <FileText className="w-4 h-4 text-[#FFC500]" />
            <span>DOWNLOAD PDF REPORT</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-white hover:bg-zinc-100 text-zinc-700 px-4 min-h-[48px] rounded-md border border-zinc-300 transition flex items-center gap-2 font-mono text-xs cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline font-bold">SYNC</span>
          </button>
        </div>

        {/* Tab Views */}
        <ErrorBoundary>
          {activeTab === 'map' && (
            <MapView
              equipments={displayedEquipments}
              sites={displayedSites}
              assignedSiteIds={activeSiteIdStrings}
              selectedDijkstraPath={selectedDijkstraPath}
              selectedMachine={selectedMachine}
              onSelectMachine={(m) => setSelectedMachine(m)}
              onInitiateTransfer={() => setActiveTab('allocation')}
            />
          )}

          {activeTab === 'allocation' && (
            <AllocationPanel
              sites={displayedSites}
              equipments={displayedEquipments}
              managerId={selectedManagerId}
              onSelectDijkstraPath={(path) => setSelectedDijkstraPath(path)}
              onTransferCompleted={fetchData}
            />
          )}

          {activeTab === 'analytics' && <UtilizationCharts equipments={displayedEquipments} />}

          {activeTab === 'operators' && (
            <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
                    <UserCheck className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                      Real-Time Machine Operator Tracking & Time-Wasting Monitor
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      Cross-references operator clock-in time with engine work vs idle activity to detect intentional underuse
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-800 font-mono">
                  <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-bold border-b border-zinc-200">
                    <tr>
                      <th className="py-3 px-4">Operator Name</th>
                      <th className="py-3 px-4">Assigned Machine</th>
                      <th className="py-3 px-4">Stationed Site</th>
                      <th className="py-3 px-4">Engine Work</th>
                      <th className="py-3 px-4">Idle Time</th>
                      <th className="py-3 px-4">Status / Alert Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {displayedEquipments.map((eq) => {
                      const isSlacking = (eq.idleHoursToday || 0) > (eq.engineHoursToday || 0) * 2;
                      return (
                        <tr key={eq._id || eq.equipmentId} className="hover:bg-zinc-50 transition">
                          <td className="py-3 px-4 font-bold text-zinc-900">
                            {eq.lastOperatorId?.name || 'John Heavy Operator'}
                          </td>
                          <td className="py-3 px-4 font-black">{eq.equipmentId} ({eq.type})</td>
                          <td className="py-3 px-4 text-zinc-600">{eq.siteId?.name || 'Main Depot'}</td>
                          <td className="py-3 px-4 font-bold text-[#12B76A]">{eq.engineHoursToday ?? 4} hrs</td>
                          <td className="py-3 px-4 font-bold text-[#F79009]">{eq.idleHoursToday ?? 2} hrs</td>
                          <td className="py-3 px-4">
                            {isSlacking ? (
                              <span className="bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5] px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" /> Slacking Alert
                              </span>
                            ) : (
                              <span className="bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Normal Shift
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && <AlertFeed sites={displayedSites} equipments={displayedEquipments} />}
        </ErrorBoundary>
      </main>

      <footer className="bg-white border-t border-zinc-200 py-4 text-center text-xs font-mono text-zinc-500 uppercase tracking-widest mt-auto">
        CAT RENTALS — ENTERPRISE FLEET TRACKING SYSTEM
      </footer>
    </div>
  );
}
