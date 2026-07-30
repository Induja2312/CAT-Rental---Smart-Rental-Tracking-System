import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import socket, { ALERT_NEW } from '../../sockets/socket';
import { ShieldAlert, CheckCircle2, AlertTriangle, Clock, Check } from 'lucide-react';

export default function AlertFeed({ sites = [] }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/alerts');
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Fetch alerts error:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    const handleNewAlert = (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    };

    socket.on(ALERT_NEW, handleNewAlert);
    return () => {
      socket.off(ALERT_NEW, handleNewAlert);
    };
  }, []);

  const handleResolveAlert = async (alertId) => {
    try {
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, resolved: true } : a))
      );

      await axios.put(`/api/alerts/${alertId}/resolve`);
    } catch (err) {
      console.error('Resolve alert error:', err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!showResolved && a.resolved) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#D92D20]/10 border border-[#D92D20]/30 rounded-md text-[#D92D20]">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
              Real-Time Telematics Alert Stream
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Automated stream for overdue rentals, overuse & machine fault anomalies
            </p>
          </div>
        </div>

        {/* Filter Controls (Glove-Touch 48px Target) */}
        <div className="flex items-center gap-3">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-white border border-zinc-300 text-zinc-900 text-xs font-mono font-bold rounded-md px-4 min-h-[48px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer uppercase"
          >
            <option value="all">ALL SEVERITY LEVELS</option>
            <option value="high">HIGH SEVERITY ONLY</option>
            <option value="medium">MEDIUM SEVERITY</option>
            <option value="low">LOW SEVERITY</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-700 cursor-pointer bg-zinc-50 px-4 min-h-[48px] rounded-md border border-zinc-200 uppercase">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="accent-[#FFC500] w-4 h-4 rounded"
            />
            Show Resolved
          </label>
        </div>
      </div>

      {/* Alert Feed List Container */}
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 font-mono text-xs uppercase">
            Loading real-time telematics stream...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 rounded-md border border-zinc-200 text-zinc-600 text-xs space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#12B76A] mx-auto stroke-[2.5]" />
            <p className="font-bold text-zinc-900 uppercase text-sm">All Operational — Zero Active Faults!</p>
            <p className="text-[11px] font-mono text-zinc-500 uppercase">
              All machinery telematics operating within Cat standard parameters.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const eqId = alert.equipmentId?.equipmentId || alert.equipmentId || 'EQ';
            const eqType = alert.equipmentId?.type || 'Machine';
            const siteName = alert.equipmentId?.siteId?.name || 'Unassigned Depot';

            return (
              <div
                key={alert._id || Math.random()}
                className={`p-4 rounded-md border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  alert.resolved
                    ? 'bg-zinc-50 border-zinc-200 opacity-60'
                    : alert.severity === 'high'
                    ? 'bg-[#FEF2F2] border-[#FCA5A5] border-l-4 border-l-[#D92D20]'
                    : alert.severity === 'medium'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] border-l-4 border-l-[#F79009]'
                    : 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-md shrink-0 ${
                      alert.severity === 'high'
                        ? 'bg-[#D92D20] text-white'
                        : alert.severity === 'medium'
                        ? 'bg-[#F79009] text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black font-mono text-zinc-900 text-base">
                        {eqId} <span className="font-sans text-xs font-semibold text-zinc-600">({eqType})</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded ${
                          alert.severity === 'high'
                            ? 'bg-[#D92D20] text-white'
                            : alert.severity === 'medium'
                            ? 'bg-[#F79009] text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {alert.severity} FAULT
                      </span>
                      <span className="text-[10px] font-mono bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded">
                        TYPE: {alert.type?.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        📍 {siteName.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-800 font-medium">{alert.message}</p>
                    <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {new Date(alert.createdAt || Date.now()).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await axios.post(`/api/alerts/${alert._id}/notify-customer`);
                        alert(res.data?.message || 'SMTP Alert email dispatched to customer!');
                      } catch (err) {
                        alert(err.response?.data?.message || 'Failed to dispatch SMTP email notification.');
                      }
                    }}
                    className="bg-[#18181b] hover:bg-black text-[#FFC500] font-bold text-xs uppercase tracking-wider px-4 min-h-[48px] rounded transition shadow-sm border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                    title="Send SMTP email notification to customer"
                  >
                    <span>📧 SMTP NOTIFY</span>
                  </button>

                  {alert.resolved ? (
                    <span className="text-xs font-mono font-bold text-[#12B76A] bg-[#ECFDF5] px-4 min-h-[44px] rounded border border-[#A7F3D0] flex items-center gap-1.5 uppercase">
                      <Check className="w-4 h-4 stroke-[3]" /> RESOLVED
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveAlert(alert._id)}
                      className="bg-[#12B76A] hover:bg-[#0f9f5c] text-white font-extrabold text-xs uppercase tracking-wider px-5 min-h-[48px] rounded transition shadow-sm border-b-2 border-black/10 flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> RESOLVE FAULT
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
