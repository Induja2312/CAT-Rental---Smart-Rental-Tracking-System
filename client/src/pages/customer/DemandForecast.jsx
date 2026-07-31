import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ArrowLeft, Package } from 'lucide-react';
import api from '../../api/axios';

const TREND_STYLE = {
  rising:  { bg: 'bg-[#ECFDF5] border-[#A7F3D0]', text: 'text-[#047857]', icon: TrendingUp,   label: 'RISING' },
  falling: { bg: 'bg-[#FEF2F2] border-[#FCA5A5]', text: 'text-[#B91C1C]', icon: TrendingDown, label: 'FALLING' },
  stable:  { bg: 'bg-zinc-50 border-zinc-200',     text: 'text-zinc-700',  icon: Minus,        label: 'STABLE' },
};

export default function DemandForecast() {
  const navigate = useNavigate();
  const [forecasts, setForecasts]     = useState([]);
  const [relevantIds, setRelevantIds] = useState(new Set());
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    // Fetch rentals first to know which site IDs are relevant to this customer
    Promise.all([
      api.get('/api/rentals/mine'),
      api.get('/api/telemetry/forecast'),
    ]).then(([rentalsRes, forecastRes]) => {
      // Collect site IDs from the customer's rentals (current + past)
      const siteIds = new Set(
        rentalsRes.data
          .map((r) => r.equipmentId?.siteId?._id || r.equipmentId?.siteId)
          .filter(Boolean)
          .map(String)
      );
      setRelevantIds(siteIds);
      setForecasts(forecastRes.data.forecasts || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Filter forecasts to sites the customer has rented from; if none match, show all
  const visible = relevantIds.size > 0
    ? forecasts.filter((f) => relevantIds.has(String(f.siteId)))
    : forecasts;

  return (
    <div className="min-h-screen bg-[#F4F4F5] font-sans">
      <nav className="bg-[#FFC500] px-6 py-3 flex items-center justify-between border-b-4 border-black sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-black text-[#FFC500] font-black text-2xl px-3 py-1 rounded-sm tracking-tighter flex items-center gap-1 shadow-sm">
            <span>CAT</span>
            <span className="text-[10px] bg-[#FFC500] text-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-mono">Rentals</span>
          </div>
          <span className="font-bold text-black uppercase tracking-wider text-sm hidden md:inline-block border-l-2 border-black/20 pl-4">
            Site Demand Forecast
          </span>
        </div>
        <button
          onClick={() => navigate('/customer')}
          className="flex items-center gap-2 bg-black/10 hover:bg-black/20 text-black font-bold text-xs uppercase px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </nav>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-zinc-200 pb-4 mb-4">
            <div className="p-2 bg-black text-[#FFC500] rounded-md shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Equipment Demand Forecast</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Predictive Telematics Demand Forecast for Rented Construction Sites
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-zinc-500 font-mono py-4">Loading forecast…</p>
          ) : visible.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-600">No forecast data available</p>
              <p className="text-xs text-zinc-400 mt-1">Forecast data will appear once telemetry has been collected for your sites.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((f) => {
                const style = TREND_STYLE[f.trend] || TREND_STYLE.stable;
                const Icon = style.icon;
                return (
                  <div key={f.siteId} className={`p-4 rounded-md border ${style.bg} flex items-start gap-4`}>
                    <div className={`p-2 rounded-md bg-white border ${style.bg.split(' ')[1]} shrink-0`}>
                      <Icon className={`w-5 h-5 ${style.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-black uppercase tracking-wider ${style.text}`}>
                          {f.siteName}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {f.changePct > 0 ? '+' : ''}{f.changePct}%
                        </span>
                      </div>
                      <p className={`text-xs font-medium mt-1 ${style.text}`}>{f.recommendation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
