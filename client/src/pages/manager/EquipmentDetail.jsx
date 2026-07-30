import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, ArrowLeft, Zap, Clock, Fuel } from 'lucide-react';
import api from '../../api/axios';
import socket, { TELEMETRY_UPDATE } from '../../sockets/socket';

const MAX_POINTS = 50;
const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

export default function EquipmentDetail() {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [points, setPoints] = useState([]);
  const tickRef = useRef(0);

  // Load equipment info
  useEffect(() => {
    api.get('/api/admin/equipment').then((r) => {
      const eq = r.data.find((e) => e.equipmentId === equipmentId);
      setEquipment(eq || null);
    }).catch(() => {});
  }, [equipmentId]);

  // Seed with last 50 telemetry records
  useEffect(() => {
    api.get(`/api/telemetry/${equipmentId}?limit=50`).then((r) => {
      const seeded = [...r.data].reverse().map((rec, i) => ({
        t:                i,
        engineHoursToday: round2(rec.engineHoursToday ?? 0),
        idleHoursToday:   round2(rec.idleHoursToday   ?? 0),
        fuelLevel:        round2(rec.fuelLevel         ?? 0),
      }));
      setPoints(seeded);
      tickRef.current = seeded.length;
    }).catch(() => {});
  }, [equipmentId]);

  // Live socket updates — filter by this equipmentId only
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
        }];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    };
    socket.on(TELEMETRY_UPDATE, handler);
    return () => socket.off(TELEMETRY_UPDATE, handler);
  }, [equipmentId]);

  const latest = points[points.length - 1];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm">
        <div className="flex items-center gap-3 border-b border-zinc-200 pb-4 mb-4">
          <button onClick={() => navigate('/manager')} className="p-2 rounded hover:bg-zinc-100 text-zinc-600 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-3 bg-[#FFC500] text-black rounded-md shadow-sm">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
              {equipmentId} — Live Telemetry
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              {equipment ? `${equipment.type} · ${equipment.class || 'N/A'} · Max ${equipment.maxWorkHoursPerDay ?? '—'} hrs/day · Rest ${equipment.restTimeHours ?? '—'} hrs` : 'Loading…'}
            </p>
          </div>
        </div>

        {/* Metric cards — same style as UtilizationCharts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 border-l-[#FFC500]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Engine Hours Today</p>
              <h4 className="text-3xl font-black font-mono text-zinc-900">{latest?.engineHoursToday ?? '—'}</h4>
            </div>
            <div className="p-3 bg-[#FFC500]/20 border border-[#FFC500] rounded-md"><Zap className="w-6 h-6" /></div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 border-l-[#F79009]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Idle Hours Today</p>
              <h4 className="text-3xl font-black font-mono text-[#F79009]">{latest?.idleHoursToday ?? '—'}</h4>
            </div>
            <div className="p-3 bg-[#F79009]/10 border border-[#F79009]/30 rounded-md text-[#F79009]"><Clock className="w-6 h-6" /></div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 border-l-[#12B76A]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Fuel Level</p>
              <h4 className="text-3xl font-black font-mono text-[#12B76A]">{latest?.fuelLevel ?? '—'}%</h4>
            </div>
            <div className="p-3 bg-[#12B76A]/10 border border-[#12B76A]/30 rounded-md text-[#12B76A]"><Fuel className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      {/* Live Line Chart */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
              Real-Time Telemetry Stream
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 px-3 py-1 rounded border border-zinc-200 uppercase">
            Last {MAX_POINTS} Points
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="t" stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }} label={{ value: 'TICKS', position: 'insideBottom', fill: '#52525b', fontSize: 9 }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d4d4d8', borderRadius: '4px', fontFamily: 'monospace' }} />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }} />
              <Line type="monotone" dataKey="engineHoursToday" name="Engine Hrs" stroke="#FFC500" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="idleHoursToday"   name="Idle Hrs"   stroke="#F79009" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="fuelLevel"        name="Fuel %"     stroke="#12B76A" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
