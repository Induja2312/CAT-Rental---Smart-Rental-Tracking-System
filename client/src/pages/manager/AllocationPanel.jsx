import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import {
  Navigation,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  Calculator,
  Award,
  MapPin,
  TrendingUp,
} from 'lucide-react';

export default function AllocationPanel({
  sites = [],
  equipments = [],
  managerId = '',
  onSelectDijkstraPath = null,
  onTransferCompleted = null,
}) {
  const [targetSiteId, setTargetSiteId] = useState('');
  const [equipmentType, setEquipmentType] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [targetSiteObj, setTargetSiteObj] = useState(null);
  const [selectedRec, setSelectedRec] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferringId, setTransferringId] = useState(null);
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    axios.get('/api/telemetry/forecast').then((r) => setForecast(r.data.forecasts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (sites.length > 0) {
      if (!targetSiteId || !sites.some((s) => s._id === targetSiteId)) {
        setTargetSiteId(sites[0]._id);
      }
    }
  }, [sites, targetSiteId]);

  const fetchRankings = async () => {
    if (!targetSiteId) return;
    setLoading(true);
    setError('');
    setTransferSuccess('');

    try {
      const res = await axios.get('/api/allocation/rank', {
        params: { siteId: targetSiteId, type: equipmentType, managerId },
      });
      setRecommendations(res.data.recommendations || []);
      setTargetSiteObj(res.data.targetSite || null);
      if (res.data.recommendations && res.data.recommendations.length > 0) {
        const topRec = res.data.recommendations[0];
        setSelectedRec(topRec);
        if (onSelectDijkstraPath) {
          onSelectDijkstraPath(topRec.dijkstraPath);
        }
      }
    } catch (err) {
      console.error('Allocation rank fetch error:', err);
      setError(err.response?.data?.message || 'Failed to compute allocation recommendation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [targetSiteId, equipmentType, managerId]);

  const handleSelectRecommendation = (rec) => {
    setSelectedRec(rec);
    if (onSelectDijkstraPath && rec.dijkstraPath) {
      onSelectDijkstraPath(rec.dijkstraPath);
    }
  };

  const handleExecuteTransfer = async (rec) => {
    if (!rec) return;
    setTransferringId(rec.equipment._id);
    setError('');
    setTransferSuccess('');

    try {
      const res = await axios.post('/api/allocation/transfer', {
        equipmentId: rec.equipment._id,
        targetSiteId: targetSiteId,
      });

      setTransferSuccess(res.data.message || 'Equipment successfully transferred!');
      if (onTransferCompleted) {
        onTransferCompleted();
      }
      setTimeout(() => {
        fetchRankings();
      }, 1000);
    } catch (err) {
      console.error('Transfer execution error:', err);
      setError(err.response?.data?.message || 'Failed to dispatch equipment transfer');
    } finally {
      setTransferringId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Demand Forecast Panel */}
      {forecast.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3 border-b border-zinc-200 pb-3">
            <div className="p-2 bg-[#FFC500] text-black rounded-md shadow-sm">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Site Demand Forecast</h4>
              <p className="text-xs text-zinc-500 font-medium">Predictive Telematics Demand & Fleet Allocation Forecast</p>
            </div>
          </div>
          {forecast.map((f) => (
            <div key={f.siteId} className={`p-3 rounded-md border text-xs font-mono ${
              f.trend === 'rising'  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]' :
              f.trend === 'falling' ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#B91C1C]' :
                                      'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}>
              <span className="font-black">{f.siteName}</span>
              {' — '}{f.recommendation}
              <span className="ml-2 text-[10px] opacity-70">({f.changePct > 0 ? '+' : ''}{f.changePct}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* Scoring Formula & Control Bar Container */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FFC500] text-black rounded-md shadow-sm">
              <Calculator className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                Optimal Real-Time Route Finder & Estimator
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Recommends optimal candidate machine for site transfer using field graph routing
              </p>
            </div>
          </div>
        </div>

        {/* Form Inputs (Strict 48px Touch Targets) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Target Construction Site
            </label>
            <select
              value={targetSiteId}
              onChange={(e) => setTargetSiteId(e.target.value)}
              className="w-full bg-white border border-zinc-300 text-zinc-900 text-xs font-mono font-bold rounded-md px-4 min-h-[48px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
            >
              {sites.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name.toUpperCase()} ({s.location?.lat?.toFixed(2)}, {s.location?.lng?.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Required Machinery Category
            </label>
            <select
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
              className="w-full bg-white border border-zinc-300 text-zinc-900 text-xs font-mono font-bold rounded-md px-4 min-h-[48px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
            >
              <option value="All">ALL MACHINERY TYPES</option>
              <option value="Excavator">EXCAVATOR</option>
              <option value="Crane">CRANE</option>
              <option value="Bulldozer">BULLDOZER</option>
              <option value="Grader">GRADER</option>
              <option value="Loader">LOADER</option>
              <option value="Compactor">COMPACTOR</option>
              <option value="Dump Truck">DUMP TRUCK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-[#D92D20]/10 border border-[#D92D20]/40 p-4 rounded-md text-[#D92D20] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {transferSuccess && (
        <div className="bg-[#12B76A]/10 border border-[#12B76A]/40 p-4 rounded-md text-[#12B76A] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{transferSuccess}</span>
        </div>
      )}

      {/* Top Candidate Highlight Card */}
      {selectedRec && (
        <div className="bg-white border-2 border-[#FFC500] rounded-md p-5 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#FFC500] text-black font-black text-[10px] uppercase font-mono px-3 py-1 border-b border-l border-black/10">
            TOP OPTIMAL MATCH
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#FFC500] text-black rounded-md shadow-sm">
                <Award className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xl font-black font-mono text-zinc-900 tracking-tight">
                  {selectedRec.equipment?.equipmentId} <span className="text-sm font-sans font-bold text-zinc-500">({selectedRec.equipment?.type})</span>
                </h4>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  SOURCE:{' '}
                  <span className="font-bold text-zinc-900">
                    {selectedRec.sourceSite?.name || 'UNASSIGNED DEPOT'}
                  </span>{' '}
                  ➔ TARGET:{' '}
                  <span className="font-bold text-zinc-900">
                    {selectedRec.targetSite?.name}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">

              <button
                onClick={() => handleExecuteTransfer(selectedRec)}
                disabled={transferringId === selectedRec.equipment?._id}
                className="bg-[#12B76A] hover:bg-[#0f9f5c] text-white font-extrabold text-xs uppercase tracking-wider px-6 min-h-[48px] rounded-md transition shadow flex items-center gap-2 border-b-2 border-black/20 cursor-pointer disabled:opacity-50"
              >
                <Truck className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {transferringId === selectedRec.equipment?._id
                    ? 'DISPATCHING...'
                    : 'DISPATCH TRANSFER NOW'}
                </span>
              </button>
            </div>
          </div>


          {/* Key Metrics Tabular Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 font-mono">
            <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold">SHORTEST DISTANCE</span>
              <span className="text-base font-black text-zinc-900">
                {selectedRec.distanceKm} KM
              </span>
            </div>
            <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold">EST. HAUL DURATION</span>
              <span className="text-base font-black text-blue-600">
                {selectedRec.estimatedDurationHours} HRS
              </span>
            </div>
            <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold">CURRENT UTILIZATION</span>
              <span className="text-base font-black text-[#F79009]">
                {Math.round(selectedRec.currentUtilization * 100)}%
              </span>
            </div>
            <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold">LOGISTICS EXPENSE</span>
              <span className="text-base font-black text-[#12B76A]">
                ${selectedRec.estimatedCostUsd}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ranked Candidate Candidates List Table */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-3">
          Equipment Candidates Ranked by Telematics Weighting Formula
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-800">
            <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">RANK</th>
                <th className="py-3 px-4">ASSET ID</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4">STATIONED SITE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">DISTANCE</th>
                <th className="py-3 px-4">EST. TRANSFER TIME</th>

                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {recommendations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-zinc-500 font-sans text-xs">
                    {loading ? 'Computing optimal graph paths...' : 'No equipment candidates found.'}
                  </td>
                </tr>
              ) : (
                recommendations.map((rec, idx) => (
                  <tr
                    key={rec.equipment?._id || idx}
                    onClick={() => handleSelectRecommendation(rec)}
                    className={`cursor-pointer transition hover:bg-zinc-50 ${
                      selectedRec?.equipment?._id === rec.equipment?._id
                        ? 'bg-[#FFC500]/10 border-l-4 border-[#FFC500]'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-black text-amber-600">#{idx + 1}</td>
                    <td className="py-3.5 px-4 font-black text-zinc-900">{rec.equipment?.equipmentId}</td>
                    <td className="py-3.5 px-4 font-sans font-semibold">{rec.equipment?.type}</td>
                    <td className="py-3.5 px-4 font-sans">{rec.sourceSite?.name || 'UNASSIGNED'}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rec.equipment?.status === 'active'
                            ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                            : rec.equipment?.status === 'idle'
                            ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                            : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]'
                        }`}
                      >
                        {rec.equipment?.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold">{rec.distanceKm} KM</td>
                    <td className="py-3.5 px-4 font-bold text-blue-600">{rec.estimatedDurationHours} HRS</td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteTransfer(rec);
                        }}
                        disabled={transferringId === rec.equipment?._id}
                        className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold px-4 py-2 min-h-[36px] rounded text-xs uppercase tracking-wider transition cursor-pointer border-b border-black/10"
                      >
                        TRANSFER
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
