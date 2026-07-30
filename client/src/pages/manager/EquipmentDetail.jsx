import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, ArrowLeft, Zap, Clock, Fuel, Thermometer, UserCheck } from 'lucide-react';
import api from '../../api/axios';
import socket, { TELEMETRY_UPDATE } from '../../sockets/socket';

const MAX_POINTS = 50;
const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function EquipmentDetail() {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState(null);
  const [points, setPoints]       = useState([]);
  const [sessions, setSessions]   = useState([]);
  const tickRef = useRef(0);

  // ── Load equipment info from manager-scoped endpoint ──────────────────────
  useEffect(() => {
    api.get('/api/manager/equipment')
      .then((r) => setEquipment(r.data.find((e) => e.equipmentId === equipmentId) || null))
      .catch(() => {});
  }, [equipmentId]);

  // ── Seed chart with last 50 telemetry records ─────────────────────────────
  useEffect(() => {
    api.get(`/api/telemetry/${equipmentId}?limit=50`).then((r) => {
      const seeded = [...r.data].reverse().map((rec, i) => ({
        t:                i,
        engineHoursToday: round2(rec.engineHoursToday ?? 0),
        idleHoursToday:   round2(rec.idleHoursToday   ?? 0),
        fuelLevel:        round2(rec.fuelLevel         ?? 0),
        engineTemperature: round2(rec.engineTemperature ?? null),
      }));
      setPoints(seeded);
      tickRef.current = seeded.length;
    }).catch(() => {});
  }, [equipmentId]);

  // ── Load operator session history ─────────────────────────────────────────
  useEffect(() => {
    api.get(`/api/manager/sessions/${equipmentId}`)
      .then((r) => setSessions(r.data))
      .catch(() => {});
  }, [equipmentId]);

  // ── Live socket — append new point, no map re-init ────────────────────────
  useEffect(() => {
    const handler = (data) => {
      if (data.equipmentId !== equipmentId) return;
      tickRef.current += 1;
      setPoints((prev) => {
        const next = [...prev, {
          t:                tickRef.current,
          engineHoursToday: round2(data.engineHoursToday ?? 0),
          idleHoursToday:   round2(data.idleHoursToday   ?? 0),
          fuelLevel:        round2(data.fuelLevel         ?? 0),
          engineTemperature: round2(data.engineTemperature ?? null),
        }];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    };
    socket.on(TELEMETRY_UPDATE, handler);
    return () => socket.off(TELEMETRY_UPDATE, handler);
  }, [equipmentId]);

  const latest = points[points.length - 1];

  // ── Status badge tokens — same as EquipmentList / UtilizationCharts ───────
  const STATUS_BADGE = {
    active:     'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
    idle:       'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
    overdue:    'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]',
    unassigned: 'bg-zinc-100 text-zinc-600 border border-zinc-300',
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] font-sans">
      {/* Sticky sub-header — same dark style as ManagerDashboard */}
      <header className="bg-[#1E1E1E] text-white border-b-2 border-black sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[56px] flex items-center gap-3 py-2">
          <button
            onClick={() => navigate('/manager')}
            className="p-2 rounded hover:bg-zinc-700 text-zinc-300 transition"
          >
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

        {/* ── Metric cards (4) — same border-l-4 style as existing cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Engine Hours Today', value: latest?.engineHoursToday ?? '—',       unit: ' hrs', color: 'border-l-[#FFC500]', textColor: 'text-zinc-900',   icon: Zap,         iconBg: 'bg-[#FFC500]/20 border-[#FFC500]' },
            { label: 'Idle Hours Today',   value: latest?.idleHoursToday   ?? '—',       unit: ' hrs', color: 'border-l-[#F79009]', textColor: 'text-[#F79009]',  icon: Clock,       iconBg: 'bg-[#F79009]/10 border-[#F79009]/30 text-[#F79009]' },
            { label: 'Fuel Level',         value: latest?.fuelLevel         ?? '—',       unit: '%',    color: 'border-l-[#12B76A]', textColor: 'text-[#12B76A]',  icon: Fuel,        iconBg: 'bg-[#12B76A]/10 border-[#12B76A]/30 text-[#12B76A]' },
            { label: 'Engine Temperature', value: latest?.engineTemperature ?? '—',       unit: ' °C',  color: 'border-l-zinc-400',  textColor: 'text-zinc-700',   icon: Thermometer, iconBg: 'bg-zinc-100 border-zinc-300 text-zinc-600' },
          ].map(({ label, value, unit, color, textColor, icon: Icon, iconBg }) => (
            <div key={label} className={`bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 ${color}`}>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
                <h4 className={`text-3xl font-black font-mono ${textColor}`}>
                  {value}{value !== '—' ? unit : ''}
                </h4>
              </div>
              <div className={`p-3 rounded-md border ${iconBg}`}><Icon className="w-6 h-6" /></div>
            </div>
          ))}
        </div>

        {/* ── Live 4-series chart — same styling as UtilizationCharts ── */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                  Real-Time Telemetry Stream
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Engine hours, idle hours, fuel level, engine temperature — live updating
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 px-3 py-1 rounded border border-zinc-200 uppercase">
              Last {MAX_POINTS} Points
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="t"
                  stroke="#52525b"
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                  label={{ value: 'TICKS', position: 'insideBottom', fill: '#52525b', fontSize: 9 }}
                />
                {/* Left axis: hours (0–24) */}
                <YAxis
                  yAxisId="hrs"
                  stroke="#52525b"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  label={{ value: 'HRS / %', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 9 }}
                />
                {/* Right axis: temperature (°C) */}
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  stroke="#71717a"
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                  label={{ value: '°C', angle: 90, position: 'insideRight', fill: '#71717a', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d4d4d8', borderRadius: '4px', fontFamily: 'monospace', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }} />
                <Line yAxisId="hrs"  type="monotone" dataKey="engineHoursToday"  name="Engine Hrs"  stroke="#FFC500" strokeWidth={2} dot={false} isAnimationActive={false} />
                {/* Idle hours — same amber as UtilizationCharts "Idle Hours" series */}
                <Line yAxisId="hrs"  type="monotone" dataKey="idleHoursToday"    name="Idle Hrs"    stroke="#F79009" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="hrs"  type="monotone" dataKey="fuelLevel"          name="Fuel %"      stroke="#12B76A" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="temp" type="monotone" dataKey="engineTemperature"  name="Temp °C"     stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Operator session history table ── */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-200 pb-3">
            <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
              <UserCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                Operator Session History
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Clock-in / clock-out log for this equipment — idle usage hours shown per session
              </p>
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
                  {/* Idle hours column — same label/format as UtilizationCharts "Idle Hours" */}
                  <th className="py-3 px-4">Idle Hrs Used</th>
                  <th className="py-3 px-4">Engine Hrs Used</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-mono">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans text-xs">
                      No operator sessions recorded for this equipment.
                    </td>
                  </tr>
                ) : sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-zinc-50 transition">
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {s.operator?.name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{fmtDate(s.clockInTime)}</td>
                    <td className="py-3 px-4">{fmt(s.clockInTime)}</td>
                    <td className="py-3 px-4 text-zinc-500">{fmt(s.clockOutTime)}</td>
                    <td className="py-3 px-4 font-bold">{s.durationHrs} hrs</td>
                    {/* Idle hours — amber, same colour as UtilizationCharts idle series */}
                    <td className="py-3 px-4 font-bold text-[#F79009]">{s.idleUsedHrs} hrs</td>
                    <td className="py-3 px-4 font-bold text-[#12B76A]">{s.engineDeltaHrs} hrs</td>
                    <td className="py-3 px-4">
                      {s.status === 'active' ? (
                        <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded text-[10px] font-bold uppercase animate-pulse">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 border border-zinc-300 rounded text-[10px] font-bold uppercase">
                          Done
                        </span>
                      )}
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
