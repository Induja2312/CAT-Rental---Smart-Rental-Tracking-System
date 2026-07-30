import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Activity, PieChart as PieIcon, Clock } from 'lucide-react';

const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

export default function UtilizationCharts({ equipments = [] }) {
  const utilizationData = equipments.map((eq) => {
    const rawEngine = eq.engineHoursToday ?? (eq.status === 'active' ? 7.5 : 1.5);
    const rawIdle = eq.idleHoursToday ?? (eq.status === 'active' ? 1.0 : 8.0);
    const engineHours = round2(rawEngine);
    const idleHours = round2(rawIdle);
    const total = engineHours + idleHours;
    const ratio = total > 0 ? Math.round((engineHours / total) * 100) : 0;

    return {
      name: eq.equipmentId || 'EQX',
      type: eq.type,
      'Work Hours (Engine)': engineHours,
      'Idle Hours': idleHours,
      'Optimal Efficiency Target': 7.5, // Standard benchmark line
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

  return (
    <div className="space-y-6">
      {/* Main Real-Time Line Graph: Work vs Idle vs Optimal Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                  Equipment Telematics — Work vs Idle vs Target Efficiency
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Real-time contrast line chart showing actual work hours against idle hours and standard target benchmark
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded border border-zinc-200 shrink-0">
              TARGET: 7.5 HRS WORK / DAY
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={utilizationData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 11, fontFamily: 'monospace' }} label={{ value: 'HOURS / DAY', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} />
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
                <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }} />
                <Line
                  type="monotone"
                  dataKey="Work Hours (Engine)"
                  stroke="#FFC500"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="Idle Hours"
                  stroke="#F79009"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Optimal Efficiency Target"
                  stroke="#12B76A"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Alert Status Breakdown */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
                <PieIcon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                Fleet Status Distribution
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
