import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, UserCheck } from 'lucide-react';
import api from '../../api/axios';
import TelemetryChart from '../../components/TelemetryChart';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const STATUS_BADGE = {
  active:     'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
  idle:       'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
  overdue:    'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]',
  unassigned: 'bg-zinc-100 text-zinc-600 border border-zinc-300',
};

export default function EquipmentDetail() {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [sessions, setSessions]   = useState([]);

  useEffect(() => {
    api.get('/api/manager/equipment')
      .then((r) => setEquipment(r.data.find((e) => e.equipmentId === equipmentId) || null))
      .catch(() => {});
    api.get(`/api/manager/sessions/${equipmentId}`)
      .then((r) => setSessions(r.data))
      .catch(() => {});
  }, [equipmentId]);

  return (
    <div className="min-h-screen bg-[#F4F4F5] font-sans">
      <header className="bg-[#1E1E1E] text-white border-b-2 border-black sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[56px] flex items-center gap-3 py-2">
          <button onClick={() => navigate('/manager')} className="p-2 rounded hover:bg-zinc-700 text-zinc-300 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-2 bg-[#FFC500] text-black rounded-md">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm uppercase tracking-tight">
              {equipmentId} — Live Telemetry & Session History
            </h1>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              {equipment
                ? `${equipment.type} · ${equipment.class || 'N/A'} · Max ${equipment.maxWorkHoursPerDay ?? '—'} hrs/day · Rest ${equipment.restTimeHours ?? '—'} hrs`
                : 'Loading…'}
            </p>
          </div>
          {equipment && (
            <span className={`ml-auto px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[equipment.status] || STATUS_BADGE.unassigned}`}>
              {equipment.status}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Reused chart component — same logic, no duplication */}
        <TelemetryChart equipmentId={equipmentId} />

        {/* Operator session history */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-200 pb-3">
            <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
              <UserCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Operator Session History</h3>
              <p className="text-xs text-zinc-500 font-medium">Clock-in / clock-out log — idle usage hours per session</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800">
              <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Clock In</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Idle Hrs Used</th>
                  <th className="py-3 px-4">Engine Hrs Used</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-mono">
                {sessions.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-zinc-500 font-sans text-xs">No operator sessions recorded.</td></tr>
                ) : sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-zinc-50 transition">
                    <td className="py-3 px-4 font-bold text-zinc-900">{s.operator?.name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-zinc-600">{fmtDate(s.clockInTime)}</td>
                    <td className="py-3 px-4">{fmt(s.clockInTime)}</td>
                    <td className="py-3 px-4 text-zinc-500">{fmt(s.clockOutTime)}</td>
                    <td className="py-3 px-4 font-bold">{s.durationHrs} hrs</td>
                    <td className="py-3 px-4 font-bold text-[#F79009]">{s.idleUsedHrs} hrs</td>
                    <td className="py-3 px-4 font-bold text-[#12B76A]">{s.engineDeltaHrs} hrs</td>
                    <td className="py-3 px-4">
                      {s.status === 'active'
                        ? <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded text-[10px] font-bold uppercase animate-pulse">Active</span>
                        : <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 border border-zinc-300 rounded text-[10px] font-bold uppercase">Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
