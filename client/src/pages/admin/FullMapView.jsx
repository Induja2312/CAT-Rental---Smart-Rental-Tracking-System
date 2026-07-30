import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import api from '../../api/axios';
import socket, { TELEMETRY_UPDATE, EQUIPMENT_STATUS } from '../../sockets/socket';
import { X, Zap, Clock, Fuel, Thermometer, MapPin } from 'lucide-react';

// ── icon helpers (same logic as manager's MapView) ──────────────────────────
const STATUS_COLOR = { active: '#12B76A', idle: '#F79009', overdue: '#D92D20', unassigned: '#71717A' };

function makeEquipmentIcon(equipmentId, status, isSelected = false) {
  const color = STATUS_COLOR[status] || STATUS_COLOR.unassigned;
  const bg    = isSelected ? '#000000' : '#18181b';
  const border = isSelected ? '2px solid #FFC500' : '1px solid #27272a';
  const html = `
    <div style="display:inline-flex;align-items:center;gap:4px;background:${bg};color:#fff;
      padding:2px 6px;border-radius:12px;border:${border};font-family:monospace;
      font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);
      transform:${isSelected ? 'scale(1.15)' : 'scale(1)'};transition:all .15s ease;">
      <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;box-shadow:0 0 4px ${color};"></span>
      <span>${equipmentId}</span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [80, 22], iconAnchor: [40, 11], popupAnchor: [0, -12] });
}

function makeSiteIcon(name) {
  const short = name.replace(/\(S\d+\)/gi, '').trim();
  const html = `
    <div style="display:inline-flex;align-items:center;gap:3px;background:rgba(255,197,0,.95);
      color:#000;padding:2px 6px;border-radius:4px;font-weight:800;font-size:9px;
      font-family:monospace;box-shadow:0 2px 5px rgba(0,0,0,.2);border:1px solid #000;white-space:nowrap;">
      📍 ${short}
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [80, 20], iconAnchor: [40, 10] });
}

// ── status badge (same tokens as EquipmentList) ──────────────────────────────
const STATUS_BADGE = {
  active:     'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
  idle:       'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
  overdue:    'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]',
  unassigned: 'bg-zinc-100 text-zinc-600 border border-zinc-300',
};

export default function FullMapView() {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markerRefs      = useRef({});   // keyed by equipmentId
  const siteMarkersRef  = useRef([]);

  const [equipment, setEquipment] = useState([]);
  const [sites, setSites]         = useState([]);
  const [selected, setSelected]   = useState(null);   // equipment object for side panel
  const [liveData, setLiveData]   = useState({});      // equipmentId → latest telemetry

  // ── 1. Fetch equipment + sites once ─────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/api/admin/equipment'),
      api.get('/api/admin/sites'),
    ]).then(([eqRes, siteRes]) => {
      setEquipment(eqRes.data);
      setSites(siteRes.data);
    }).catch(() => {});
  }, []);

  // ── 2. Init Leaflet map ONCE ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [10.7905, 78.7047], zoom: 7 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // ── 3. Render site circles + markers whenever sites change ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sites.length === 0) return;
    siteMarkersRef.current.forEach((l) => map.removeLayer(l));
    siteMarkersRef.current = [];
    sites.forEach((s) => {
      if (!s.location?.lat) return;
      const circle = L.circle([s.location.lat, s.location.lng], {
        radius: 15000, color: '#FFC500', weight: 2,
        fillColor: '#FFC500', fillOpacity: 0.07, dashArray: '6 6',
      }).addTo(map);
      const marker = L.marker([s.location.lat, s.location.lng], { icon: makeSiteIcon(s.name) }).addTo(map);
      siteMarkersRef.current.push(circle, marker);
    });
  }, [sites]);

  // ── 4. Add/update equipment markers whenever equipment list changes ───────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || equipment.length === 0) return;

    equipment.forEach((eq) => {
      const lat = eq.currentLocation?.lat;
      const lng = eq.currentLocation?.lng;
      if (!lat || !lng) return;

      if (markerRefs.current[eq.equipmentId]) {
        // update existing marker position + icon
        markerRefs.current[eq.equipmentId].setLatLng([lat, lng]);
        markerRefs.current[eq.equipmentId].setIcon(makeEquipmentIcon(eq.equipmentId, eq.status));
      } else {
        // create new marker
        const marker = L.marker([lat, lng], { icon: makeEquipmentIcon(eq.equipmentId, eq.status) }).addTo(map);
        marker.on('click', () => setSelected(eq));
        markerRefs.current[eq.equipmentId] = marker;
      }
    });
  }, [equipment]);

  // ── 5. Socket: update marker position + liveData WITHOUT re-init ─────────
  useEffect(() => {
    const onTelemetry = (data) => {
      setLiveData((prev) => ({ ...prev, [data.equipmentId]: data }));
      const marker = markerRefs.current[data.equipmentId];
      if (marker && data.location?.lat) {
        marker.setLatLng([data.location.lat, data.location.lng]);
      }
    };
    const onStatus = (data) => {
      setEquipment((prev) =>
        prev.map((eq) => eq.equipmentId === data.equipmentId ? { ...eq, status: data.status } : eq)
      );
      const marker = markerRefs.current[data.equipmentId];
      if (marker) {
        marker.setIcon(makeEquipmentIcon(data.equipmentId, data.status,
          selected?.equipmentId === data.equipmentId));
      }
    };
    socket.on(TELEMETRY_UPDATE, onTelemetry);
    socket.on(EQUIPMENT_STATUS, onStatus);
    return () => { socket.off(TELEMETRY_UPDATE, onTelemetry); socket.off(EQUIPMENT_STATUS, onStatus); };
  }, [selected]);

  // ── 6. Highlight selected marker ─────────────────────────────────────────
  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([id, marker]) => {
      const eq = equipment.find((e) => e.equipmentId === id);
      if (!eq) return;
      marker.setIcon(makeEquipmentIcon(id, eq.status, selected?.equipmentId === id));
    });
  }, [selected, equipment]);

  // merge live telemetry into selected for side panel display
  const live = selected ? { ...selected, ...(liveData[selected.equipmentId] || {}) } : null;

  return (
    <div className="bg-white border border-zinc-200 rounded-md shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FFC500] text-black rounded-md">
            <MapPin className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Full Fleet Map</h3>
            <p className="text-xs text-zinc-500 font-medium">All equipment across all sites — click a marker for live telemetry</p>
          </div>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono font-bold">
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1.5" style={{ color: c }}>
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />
              {s.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Map + side panel */}
      <div className="flex h-[580px]">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" style={{ cursor: 'crosshair' }} />
        </div>

        {/* Side panel — shown when a marker is clicked */}
        {live && (
          <div className="w-72 shrink-0 border-l border-zinc-200 bg-white overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <div>
                <p className="text-xs font-black font-mono text-zinc-900">{live.equipmentId}</p>
                <p className="text-[10px] text-zinc-500 font-medium">{live.type}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_BADGE[live.status] || STATUS_BADGE.unassigned}`}>
                  {live.status}
                </span>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-zinc-200 text-zinc-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1">
              <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Live Telemetry</p>

              {/* Metric tiles — same layout/labels as UtilizationCharts */}
              {[
                { icon: Zap,         label: 'Engine Hours Today', value: `${live.engineHoursToday ?? live.location?.engineHoursToday ?? '—'} hrs`, color: 'text-[#FFC500]', border: 'border-l-[#FFC500]' },
                { icon: Clock,       label: 'Idle Hours Today',   value: `${live.idleHoursToday   ?? '—'} hrs`, color: 'text-[#F79009]', border: 'border-l-[#F79009]' },
                { icon: Fuel,        label: 'Fuel Level',         value: `${live.fuelLevel         ?? '—'}%`,   color: 'text-[#12B76A]', border: 'border-l-[#12B76A]' },
                { icon: Thermometer, label: 'Engine Temperature', value: live.engineTemperature != null ? `${live.engineTemperature} °C` : '—', color: 'text-zinc-700', border: 'border-l-zinc-400' },
              ].map(({ icon: Icon, label, value, color, border }) => (
                <div key={label} className={`bg-white border border-zinc-200 rounded-md p-3 flex items-center justify-between shadow-sm border-l-4 ${border}`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
                    <p className={`text-lg font-black font-mono ${color}`}>{value}</p>
                  </div>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              ))}

              {/* Site + coords */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-md p-3 space-y-1 text-xs font-mono">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Location</p>
                <p className="font-bold text-zinc-900">{live.siteId?.name || 'Unassigned'}</p>
                <p className="text-zinc-500">
                  {live.currentLocation?.lat?.toFixed(5)}, {live.currentLocation?.lng?.toFixed(5)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
