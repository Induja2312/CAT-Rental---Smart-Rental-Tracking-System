import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Package } from 'lucide-react';
import api from '../../api/axios';
import TelemetryChart from '../../components/TelemetryChart';

export default function MyEquipmentTelemetry() {
  const navigate = useNavigate();
  const [rentals, setRentals]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null); // equipmentId string

  useEffect(() => {
    api.get('/api/rentals/mine')
      .then(({ data }) => {
        // Only show equipment that is currently ongoing or overdue (active rentals)
        const active = data.filter((r) => r.status === 'ongoing' || r.status === 'overdue');
        setRentals(active);
        if (active.length > 0) setSelected(active[0].equipmentId?.equipmentId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STATUS_BADGE = {
    ongoing: 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
    overdue: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]',
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] font-sans">
      {/* Yellow customer nav — matches CustomerDashboard */}
      <nav className="bg-[#FFC500] px-6 py-3 flex items-center justify-between border-b-4 border-black sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-black text-[#FFC500] font-black text-2xl px-3 py-1 rounded-sm tracking-tighter flex items-center gap-1 shadow-sm">
            <span>CAT</span>
            <span className="text-[10px] bg-[#FFC500] text-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-mono">Rentals</span>
          </div>
          <span className="font-bold text-black uppercase tracking-wider text-sm hidden md:inline-block border-l-2 border-black/20 pl-4">
            My Equipment — Live Telemetry
          </span>
        </div>
        <button
          onClick={() => navigate('/customer')}
          className="flex items-center gap-2 bg-black/10 hover:bg-black/20 text-black font-bold text-xs uppercase px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="bg-white p-8 rounded-md border border-zinc-200 text-center text-zinc-500 text-sm font-bold">
            Loading your equipment…
          </div>
        ) : rentals.length === 0 ? (
          <div className="bg-white p-12 rounded-md border border-zinc-200 text-center shadow-sm">
            <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-zinc-700">No active rentals</h3>
            <p className="text-xs text-zinc-500 mt-1">Telemetry is only available for equipment you currently have rented.</p>
          </div>
        ) : (
          <>
            {/* Equipment selector tabs */}
            <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-sm">
              <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">
                Select Equipment
              </p>
              <div className="flex flex-wrap gap-2">
                {rentals.map((r) => {
                  const eq = r.equipmentId;
                  if (!eq) return null;
                  const isActive = selected === eq.equipmentId;
                  return (
                    <button
                      key={r._id}
                      onClick={() => setSelected(eq.equipmentId)}
                      className={`flex items-center gap-2 px-4 min-h-[40px] rounded-md text-xs font-bold uppercase tracking-wide transition ${
                        isActive
                          ? 'bg-[#FFC500] text-black border-b-2 border-black/20 shadow-sm'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      {eq.equipmentId}
                      <span className="font-normal normal-case text-[10px] opacity-70">({eq.type})</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${STATUS_BADGE[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live telemetry — reuses the exact same component as manager's EquipmentDetail */}
            {selected && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest px-1">
                  Showing telemetry for: <span className="text-zinc-700">{selected}</span>
                </p>
                <TelemetryChart equipmentId={selected} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
