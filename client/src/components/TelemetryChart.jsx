import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, Zap, Clock, Fuel, Thermometer } from 'lucide-react';
import api from '../api/axios';
import socket, { TELEMETRY_UPDATE } from '../sockets/socket';

const MAX_POINTS = 50;
const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

// Metric card — same border-l-4 style used across admin/manager stat cards
function MetricCard({ label, value, unit, colorClass, textColor, icon: Icon, iconBg }) {
  return (
    <div className={`bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 ${colorClass}`}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        <h4 className={`text-3xl font-black font-mono ${textColor}`}>
          {value}{value !== '—' ? unit : ''}
        </h4>
      </div>
      <div className={`p-3 rounded-md border ${iconBg}`}><Icon className="w-6 h-6" /></div>
    </div>
  );
}

/**
 * TelemetryChart — reusable live telemetry display for a single equipmentId.
 * Used by both EquipmentDetail (manager) and MyEquipmentTelemetry (customer).
 *
 * Props:
 *   equipmentId  {string}  — e.g. "EQX1001"
 *   compact      {boolean} — if true, hides the section header (for embedding)
 */
export default function TelemetryChart({ equipmentId, compact = false }) {
  const [points, setPoints] = useState([]);
  const tickRef = useRef(0);

  // Seed from historical telemetry
  useEffect(() => {
    if (!equipmentId) return;
    api.get(`/api/telemetry/${equipmentId}?limit=50`).then((r) => {
      const seeded = [...r.data].reverse().map((rec, i) => ({
        t:                 i,
        engineHoursToday:  round2(rec.engineHoursToday  ?? 0),
        idleHoursToday:    round2(rec.idleHoursToday    ?? 0),
        fuelLevel:         round2(rec.fuelLevel          ?? 0),
        engineTemperature: round2(rec.engineTemperature ?? null),
      }));
      setPoints(seeded);
      tickRef.current = seeded.length;
    }).catch(() => {});
  }, [equipmentId]);

  // Live socket updates — filtered to this equipmentId only
  useEffect(() => {
    if (!equipmentId) return;
    const handler = (data) => {
      if (data.equipmentId !== equipmentId) return;
      tickRef.current += 1;
      setPoints((prev) => {
        const next = [...prev, {
          t:                 tickRef.current,
          engineHoursToday:  round2(data.engineHoursToday  ?? 0),
          idleHoursToday:    round2(data.idleHoursToday    ?? 0),
          fuelLevel:         round2(data.fuelLevel          ?? 0),
          engineTemperature: round2(data.engineTemperature ?? null),
        }];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    };
    socket.on(TELEMETRY_UPDATE, handler);
    return () => socket.off(TELEMETRY_UPDATE, handler);
  }, [equipmentId]);

  const latest = points[points.length - 1];

  const metrics = [
    { label: 'Engine Hours Today', value: latest?.engineHoursToday  ?? '—', unit: ' hrs', colorClass: 'border-l-[#FFC500]', textColor: 'text-zinc-900',  icon: Zap,         iconBg: 'bg-[#FFC500]/20 border-[#FFC500]' },
    { label: 'Idle Hours Today',   value: latest?.idleHoursToday    ?? '—', unit: ' hrs', colorClass: 'border-l-[#F79009]', textColor: 'text-[#F79009]', icon: Clock,       iconBg: 'bg-[#F79009]/10 border-[#F79009]/30 text-[#F79009]' },
    { label: 'Fuel Level',         value: latest?.fuelLevel          ?? '—', unit: '%',    colorClass: 'border-l-[#12B76A]', textColor: 'text-[#12B76A]', icon: Fuel,        iconBg: 'bg-[#12B76A]/10 border-[#12B76A]/30 text-[#12B76A]' },
    { label: 'Engine Temperature', value: latest?.engineTemperature  ?? '—', unit: ' °C',  colorClass: 'border-l-zinc-400',  textColor: 'text-zinc-700',  icon: Thermometer, iconBg: 'bg-zinc-100 border-zinc-300 text-zinc-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Chart card */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        {!compact && (
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
        )}

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="t" stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'TICKS', position: 'insideBottom', fill: '#52525b', fontSize: 9 }} />
              <YAxis yAxisId="hrs" stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace' }}
                label={{ value: 'HRS / %', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 9 }} />
              <YAxis yAxisId="temp" orientation="right" stroke="#71717a" tick={{ fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: '°C', angle: 90, position: 'insideRight', fill: '#71717a', fontSize: 9 }} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d4d4d8', borderRadius: '4px', fontFamily: 'monospace', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }} />
              <Line yAxisId="hrs"  type="monotone" dataKey="engineHoursToday"  name="Engine Hrs" stroke="#FFC500" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="hrs"  type="monotone" dataKey="idleHoursToday"    name="Idle Hrs"   stroke="#F79009" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="hrs"  type="monotone" dataKey="fuelLevel"          name="Fuel %"     stroke="#12B76A" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="temp" type="monotone" dataKey="engineTemperature"  name="Temp °C"    stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
