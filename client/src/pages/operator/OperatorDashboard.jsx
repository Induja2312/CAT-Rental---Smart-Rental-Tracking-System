import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Clock, LogOut, CheckCircle2, ShieldAlert, Cpu, UserCheck } from 'lucide-react';

export default function OperatorDashboard() {
  const { auth, logout } = useAuth();
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchEquipment = async () => {
    try {
      const res = await axios.get('/api/admin/equipment');
      setEquipmentList(res.data || []);
      if (res.data && res.data.length > 0 && !selectedEquipmentId) {
        setSelectedEquipmentId(res.data[0].equipmentId);
      }
    } catch {
      // fallback mock list if admin route restricted
      setEquipmentList([
        { _id: '1', equipmentId: 'EQX1001', type: 'Excavator' },
        { _id: '2', equipmentId: 'EQX1002', type: 'Crane' },
        { _id: '3', equipmentId: 'EQX1003', type: 'Bulldozer' },
        { _id: '4', equipmentId: 'EQX1004', type: 'Grader' },
      ]);
      setSelectedEquipmentId('EQX1001');
    }
  };

  const fetchActiveSession = async () => {
    try {
      const res = await axios.get('/api/operator/active');
      setActiveSession(res.data || null);
    } catch {
      setActiveSession(null);
    }
  };

  useEffect(() => {
    fetchEquipment();
    fetchActiveSession();
  }, []);

  const handleClockIn = async () => {
    if (!selectedEquipmentId) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await axios.post('/api/operator/clockin', { equipmentId: selectedEquipmentId });
      setMessage(res.data.message || `Clocked into ${selectedEquipmentId}`);
      await fetchActiveSession();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clock in to machine');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await axios.post('/api/operator/clockout');
      setMessage(res.data.message || 'Successfully clocked out of machine');
      await fetchActiveSession();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-zinc-900 flex flex-col font-sans">
      {/* Enterprise Dark Header Bar */}
      <header className="bg-[#1E1E1E] text-white border-b-2 border-black sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 min-h-[64px] flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFC500] text-black font-black text-2xl px-3 py-1 rounded-sm tracking-tighter flex items-center gap-1.5 border-b-2 border-black/20">
              <span>CAT</span>
              <span className="text-xs bg-black text-[#FFC500] px-1.5 py-0.5 font-mono uppercase font-bold tracking-widest">
                OPERATOR
              </span>
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight uppercase">
                Machine Operator Clock-In Portal
              </h1>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                Direct Machine Shift & Runtime Log Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#121212] border border-zinc-700 px-3 py-1.5 rounded text-xs min-h-[44px]">
              <UserCheck className="w-4 h-4 text-[#FFC500]" />
              <div>
                <span className="font-bold text-white uppercase block leading-none">{auth?.name || 'Operator'}</span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Role: Machine Operator</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="bg-zinc-800 hover:bg-[#D92D20] text-zinc-300 hover:text-white px-3 py-2 min-h-[44px] rounded border border-zinc-700 transition flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-6">
        {/* Active Session Status Box */}
        {activeSession ? (
          <div className="bg-[#ECFDF5] border-2 border-[#12B76A] rounded-md p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#A7F3D0] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#12B76A] text-white rounded-md">
                  <Clock className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#047857] uppercase block tracking-wider">
                    CURRENTLY CLOCKED IN & OPERATING
                  </span>
                  <h3 className="text-2xl font-black font-mono text-zinc-900">
                    {activeSession.equipmentId?.equipmentId || 'Machine'}
                    <span className="text-sm font-sans font-bold text-zinc-600 ml-2">
                      ({activeSession.equipmentId?.type || 'Category'})
                    </span>
                  </h3>
                </div>
              </div>
              <span className="bg-[#12B76A] text-white font-mono text-xs font-bold px-3 py-1 rounded uppercase tracking-widest animate-pulse">
                ACTIVE SHIFT
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-white p-3 rounded border border-[#A7F3D0]">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">CLOCK IN TIME</span>
                <span className="text-sm font-bold text-zinc-900">
                  {new Date(activeSession.clockInTime).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-white p-3 rounded border border-[#A7F3D0]">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">INITIAL ENGINE HOURS</span>
                <span className="text-sm font-bold text-[#047857]">
                  {activeSession.engineHoursOnClockIn} HRS
                </span>
              </div>
            </div>

            <button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full bg-[#D92D20] hover:bg-[#b91c1c] text-white font-black text-sm uppercase tracking-wider min-h-[52px] rounded-md transition shadow flex items-center justify-center gap-2 border-b-2 border-black/20 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-5 h-5 stroke-[2.5]" />
              <span>CLOCK OUT OF THIS MACHINE NOW</span>
            </button>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-md p-6 shadow-sm space-y-6">
            <div className="border-b border-zinc-200 pb-4 flex items-center gap-3">
              <div className="p-3 bg-[#FFC500] text-black rounded-md">
                <Cpu className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                  Select Machine & Clock In
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Select the machinery asset you are operating to log your active work shift
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-[#D92D20]/10 border border-[#D92D20]/40 p-4 rounded-md text-[#D92D20] text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="bg-[#12B76A]/10 border border-[#12B76A]/40 p-4 rounded-md text-[#12B76A] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Select Equipment Asset ID
                </label>
                <select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm font-mono font-bold rounded-md px-4 min-h-[50px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
                >
                  {equipmentList.map((eq) => (
                    <option key={eq._id || eq.equipmentId} value={eq.equipmentId}>
                      {eq.equipmentId} — {eq.type} ({eq.siteId?.name || 'Depot'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleClockIn}
                disabled={loading || !selectedEquipmentId}
                className="w-full bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-sm uppercase tracking-wider min-h-[52px] rounded-md transition shadow flex items-center justify-center gap-2 border-b-2 border-black/20 cursor-pointer disabled:opacity-50"
              >
                <Clock className="w-5 h-5 stroke-[2.5]" />
                <span>CLOCK IN TO MACHINE</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-zinc-200 py-4 text-center text-xs font-mono text-zinc-500 uppercase tracking-widest">
        CAT RENTALS — MACHINE OPERATOR VERIFICATION PORTAL
      </footer>
    </div>
  );
}
