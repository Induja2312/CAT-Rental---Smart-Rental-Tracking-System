import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Activity, Clock, Zap } from 'lucide-react';

export default function UtilizationCharts({ equipments = [] }) {
  const utilizationData = equipments.map((eq) => {
    const engineHours = eq.engineHoursToday ?? (eq.status === 'active' ? 7.5 : 1.5);
    const idleHours = eq.idleHoursToday ?? (eq.status === 'active' ? 1.0 : 8.0);
    const total = engineHours + idleHours;
    const ratio = total > 0 ? Math.round((engineHours / total) * 100) : 0;

    return {
      name: eq.equipmentId || 'EQX',
      type: eq.type,
      'Engine Hours': engineHours,
      'Idle Hours': idleHours,
      utilizationRatio: ratio,
    };
  });

  const statusCounts = { active: 0, idle: 0, overdue: 0, unassigned: 0 };
  equipments.forEach((eq) => {
    const s = eq.status || 'unassigned';
    if (statusCounts[s] !== undefined) statusCounts[s]++;
    else statusCounts.unassigned++;
  });

  const pieData = [
    { name: 'ACTIVE', value: statusCounts.active, color: '#12B76A' },
    { name: 'IDLE', value: statusCounts.idle, color: '#F79009' },
    { name: 'OVERDUE', value: statusCounts.overdue, color: '#D92D20' },
    { name: 'UNASSIGNED', value: statusCounts.unassigned, color: '#71717A' },
  ].filter((item) => item.value > 0);

  const rentalDaysData = equipments.map((eq, idx) => {
    const daysArr = [15, 20, 25, 10, 30, 18, 12];
    return {
      name: eq.equipmentId,
      type: eq.type,
      'Days Remaining': daysArr[idx % daysArr.length],
    };
  });

  const totalEngineHours = utilizationData.reduce((acc, curr) => acc + curr['Engine Hours'], 0);
  const totalIdleHours = utilizationData.reduce((acc, curr) => acc + curr['Idle Hours'], 0);
  const avgUtilization =
    utilizationData.length > 0
      ? Math.round(
          utilizationData.reduce((acc, curr) => acc + curr.utilizationRatio, 0) /
            utilizationData.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Metric Telematics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 border-l-[#FFC500]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Total Engine Runtime
            </p>
            <h4 className="text-3xl font-black font-mono text-zinc-900 tracking-tight">
              {totalEngineHours} <span className="text-sm font-sans font-bold text-zinc-500">HRS/DAY</span>
            </h4>
            <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase font-semibold">
              Across Tracked Fleet
            </p>
          </div>
          <div className="p-3 bg-[#FFC500]/20 border border-[#FFC500] rounded-md text-black">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 border-l-[#F79009]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Total Idle Hours
            </p>
            <h4 className="text-3xl font-black font-mono text-[#F79009] tracking-tight">
              {totalIdleHours} <span className="text-sm font-sans font-bold text-zinc-500">HRS/DAY</span>
            </h4>
            <p className="text-[10px] font-mono text-[#F79009] mt-1 uppercase font-bold">
              Potential Reallocation Target
            </p>
          </div>
          <div className="p-3 bg-[#F79009]/10 border border-[#F79009]/30 rounded-md text-[#F79009]">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-zinc-200 rounded-md p-4 flex items-center justify-between shadow-sm border-l-4 border-l-[#12B76A]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Avg Utilization Benchmark
            </p>
            <h4 className="text-3xl font-black font-mono text-[#12B76A] tracking-tight">
              {avgUtilization}%
            </h4>
            <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase font-semibold">
              Target Standard: &gt; 65%
            </p>
          </div>
          <div className="p-3 bg-[#12B76A]/10 border border-[#12B76A]/30 rounded-md text-[#12B76A]">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Enterprise Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stacked Runtime vs Idle Chart */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
                <BarChart3 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                Daily Telematics Runtime vs Idle Hours
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 px-3 py-1 rounded border border-zinc-200">
              STACKED TELEMETRY
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace' }} label={{ value: 'HOURS', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#d4d4d8',
                    borderRadius: '4px',
                    color: '#18181b',
                    fontFamily: 'monospace',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }} />
                <Bar dataKey="Engine Hours" stackId="a" fill="#FFC500" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Idle Hours" stackId="a" fill="#F79009" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Alert Status Pie Chart */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
                <PieIcon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                Fleet Status Breakdown
              </h3>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#d4d4d8',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Contract Days Remaining Chart */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#FFC500]" />
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
              Active Rental Contract Expiry Timeline
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-500 uppercase">
            DAYS REMAINING
          </span>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rentalDaysData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="name" stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#d4d4d8',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              />
              <Bar dataKey="Days Remaining" fill="#12B76A" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
