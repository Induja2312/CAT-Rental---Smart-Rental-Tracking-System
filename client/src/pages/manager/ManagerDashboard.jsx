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
    lastOperatorId: { name: 'OP301' },
    checkInDate: '2025-01-01',
    checkOutDate: '2025-01-31',
    rentalDays: 30,
  },
  {
    _id: 'eq6',
    equipmentId: 'EQX1006',
    type: 'Grader',
    siteId: { _id: 'site1', name: 'Chennai Port Hub (S001)', location: { lat: 13.0827, lng: 80.2707 } },
    status: 'idle',
    engineHoursToday: 3.0,
    idleHoursToday: 6.0,
    fuelLevel: 80,
    currentLocation: { lat: 13.0800, lng: 80.2680 },
    lastOperatorId: { name: 'OP114' },
    checkInDate: '2025-04-05',
    checkOutDate: '2025-04-23',
    rentalDays: 18,
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
  }, []);

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
      const response = await axios.get('/api/rentals/export-pdf', { responseType: 'blob' });
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

          {/* Right Status Controls */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border font-mono font-bold uppercase tracking-wider ${
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
              <span className="hidden md:inline">
                {socketConnected ? 'Primary Node Live' : 'Telematics Standby'}
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2 bg-[#121212] border border-zinc-700 px-3 py-1.5 rounded text-xs min-h-[44px]">
              <UserCheck className="w-4 h-4 text-[#FFC500]" />
              <div>
                <span className="font-bold text-white uppercase block leading-none">
                  {auth?.name || 'Operations Lead'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">
                  Role: {auth?.role || 'manager'}
                </span>
              </div>
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
                Individual Machinery Live Telematics & Telemetry Bar
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
              Click machine card to view on GIS map
            </span>
          </div>

          {/* Machine-by-Machine Horizontal Telematics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 overflow-x-auto pb-1">
            {equipments.map((eq) => {
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
                    📍 {eq.siteId?.name?.split(' ')[0] || 'Depot'}
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
            <Navigation className="w-4 h-4" /> GIS Map & Geofence Radius
          </button>

          <button
            onClick={() => setActiveTab('allocation')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'allocation'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <Activity className="w-4 h-4" /> Optimal Real-Time Route Finder
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Runtime Analytics
          </button>

          <button
            onClick={() => setActiveTab('operators')}
            className={`flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider px-5 min-h-[48px] rounded-md transition cursor-pointer ${
              activeTab === 'operators'
                ? 'bg-[#FFC500] text-black shadow-sm border-b-2 border-black/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-300'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Operator Monitoring & Underuse
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
            <span>📄 DOWNLOAD PDF REPORT</span>
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
              equipments={equipments}
              sites={sites}
              selectedDijkstraPath={selectedDijkstraPath}
              selectedMachine={selectedMachine}
              onSelectMachine={(m) => setSelectedMachine(m)}
              onInitiateTransfer={() => setActiveTab('allocation')}
            />
          )}

          {activeTab === 'allocation' && (
            <AllocationPanel
              sites={sites}
              onSelectDijkstraPath={(path) => setSelectedDijkstraPath(path)}
              onTransferCompleted={fetchData}
            />
          )}

          {activeTab === 'analytics' && <UtilizationCharts equipments={equipments} />}

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
                <button
                  onClick={fetchOperatorActivity}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-mono font-bold px-3 py-1.5 rounded border border-zinc-300"
                >
                  REFRESH OPERATORS
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-800">
                  <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
                    <tr>
                      <th className="py-3 px-4">OPERATOR NAME</th>
                      <th className="py-3 px-4">CLOCKED MACHINE</th>
                      <th className="py-3 px-4">STATIONED SITE</th>
                      <th className="py-3 px-4">CLOCK-IN DURATION</th>
                      <th className="py-3 px-4">ENGINE RUN</th>
                      <th className="py-3 px-4">IDLE HOURS</th>
                      <th className="py-3 px-4">EFFICIENCY INDEX</th>
                      <th className="py-3 px-4 text-right">TIME-WASTING RISK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono">
                    {operatorActivity.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans text-xs">
                          No active operator clock-ins detected across fleet.
                        </td>
                      </tr>
                    ) : (
                      operatorActivity.map((op, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-3.5 px-4 font-bold text-zinc-900">{op.operator?.name || 'Operator'}</td>
                          <td className="py-3.5 px-4 font-black text-amber-600">{op.equipment?.equipmentId} ({op.equipment?.type})</td>
                          <td className="py-3.5 px-4 font-sans">{op.equipment?.site}</td>
                          <td className="py-3.5 px-4">{op.clockedHours} HRS</td>
                          <td className="py-3.5 px-4 text-[#12B76A] font-bold">{op.engineHoursToday} HRS</td>
                          <td className="py-3.5 px-4 text-[#F79009] font-bold">{op.idleHoursToday} HRS</td>
                          <td className="py-3.5 px-4 font-black">{op.efficiencyPct}%</td>
                          <td className="py-3.5 px-4 text-right">
                            {op.isTimeWasting ? (
                              <span className="bg-[#FEF2F2] text-[#D92D20] border border-[#FCA5A5] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                ⚠️ HIGH IDLE / TIME-WASTING
                              </span>
                            ) : (
                              <span className="bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                                ✅ NORMAL OPERATING
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && <AlertFeed sites={sites} />}
        </ErrorBoundary>
      </main>

      {/* Enterprise Footer */}
      <footer className="bg-white border-t border-zinc-200 py-4 text-center text-xs font-mono text-zinc-500 uppercase tracking-widest">
        CAT RENTALS ENTERPRISE TELEMATICS • GLOBAL REGION • OPTIMAL ROUTE ESTIMATOR
      </footer>
    </div>
  );
}
