import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import socket, { TELEMETRY_UPDATE, EQUIPMENT_STATUS } from '../../sockets/socket';
import { Navigation } from 'lucide-react';

// ── icon helpers ─────────────────────────────────────────────────────────────
const getMachineTypeLabel = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('excavator')) return { label: 'EXCAVATOR', icon: '🚜' };
  if (t.includes('crane'))     return { label: 'CRANE',     icon: '🏗️' };
  if (t.includes('bulldozer')) return { label: 'BULLDOZER', icon: '🚜' };
  if (t.includes('grader'))    return { label: 'GRADER',    icon: '🚜' };
  if (t.includes('loader'))    return { label: 'LOADER',    icon: '🚜' };
  if (t.includes('truck'))     return { label: 'DUMP TRUCK',icon: '🚚' };
  return { label: 'EQUIPMENT', icon: '⚙️' };
};

const STATUS_COLOR = { active: '#12B76A', idle: '#F79009', overdue: '#D92D20', unassigned: '#71717A' };

const createEquipmentIcon = (equipmentId, type, status, isSelected = false) => {
  const statusColor = STATUS_COLOR[status] || STATUS_COLOR.unassigned;
  const { icon } = getMachineTypeLabel(type);
  const html = `
    <div style="display:inline-flex;align-items:center;gap:4px;
      background:${isSelected ? '#000' : '#18181b'};color:#fff;padding:2px 6px;
      border-radius:12px;border:${isSelected ? '2px solid #FFC500' : '1px solid #27272a'};
      font-family:monospace;font-size:10px;font-weight:700;white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer;
      transform:${isSelected ? 'scale(1.15)' : 'scale(1)'};transition:all .15s ease;">
      <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};
        display:inline-block;box-shadow:0 0 4px ${statusColor};"></span>
      <span>${icon} ${equipmentId}</span>
    </div>`;
  return L.divIcon({ html, className: 'compact-cat-equipment-marker', iconSize: [60, 22], iconAnchor: [30, 11], popupAnchor: [0, -12] });
};

const createSiteIcon = (siteName) => {
  const shortName = siteName.replace(/Site|\(S\d+\)/gi, '').trim();
  const html = `
    <div style="display:inline-flex;align-items:center;gap:3px;
      background:rgba(255,197,0,.95);color:#000;padding:2px 6px;border-radius:4px;
      font-weight:800;font-size:9px;font-family:monospace;
      box-shadow:0 2px 5px rgba(0,0,0,.2);border:1px solid #000;white-space:nowrap;cursor:pointer;">
      📍 ${shortName}
    </div>`;
  return L.divIcon({ html, className: 'compact-cat-site-marker', iconSize: [70, 20], iconAnchor: [35, 10] });
};

// ── tooltip HTML ─────────────────────────────────────────────────────────────
const makeTooltip = (eq) => {
  const { label, icon } = getMachineTypeLabel(eq.type);
  const statusBadge = eq.status === 'active'
    ? 'background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;'
    : eq.status === 'idle'
    ? 'background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;'
    : 'background:#FEF2F2;color:#B91C1C;border:1px solid #FCA5A5;';
  return `
    <div style="color:#18181b;font-family:Inter,sans-serif;min-width:220px;padding:4px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e4e4e7;padding-bottom:6px;margin-bottom:8px;">
        <span style="font-size:15px;">${icon} <strong style="font-family:monospace;font-weight:900;">${eq.equipmentId}</strong></span>
        <span style="font-size:10px;font-family:monospace;text-transform:uppercase;font-weight:800;padding:2px 8px;border-radius:4px;${statusBadge}">${eq.status}</span>
      </div>
      <div style="font-size:12px;line-height:1.6;color:#27272a;">
        <div><strong>Category:</strong> ${label}</div>
        <div><strong>Site:</strong> ${eq.siteId?.name || 'Main Depot'}</div>
        <div><strong>Operator:</strong> <span style="font-family:monospace;font-weight:800;">${eq.lastOperatorId?.name || 'UNASSIGNED'}</span></div>
        <div><strong>Engine:</strong> <span style="font-family:monospace;font-weight:800;color:#047857;">${eq.engineHoursToday ?? 4} hrs/day</span></div>
        <div><strong>Idle:</strong> <span style="font-family:monospace;font-weight:800;color:#B45309;">${eq.idleHoursToday ?? 2} hrs/day</span></div>
        <div><strong>Fuel:</strong> <span style="font-family:monospace;font-weight:800;">${eq.fuelLevel ?? 85}%</span></div>
      </div>
    </div>`;
};

export default function MapView({
  equipments = [],
  sites = [],
  assignedSiteIds = [],
  selectedDijkstraPath = null,
  selectedMachine = null,
  onSelectMachine = null,
}) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const eqMarkersRef    = useRef({});   // keyed by equipmentId — STABLE across renders
  const siteLayersRef   = useRef([]);
  const polylineRef     = useRef(null);

  const [filterSite, setFilterSite] = useState('all');

  // ── 1. Init map ONCE ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [10.7905, 78.7047], zoom: 7 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
    }).addTo(map);
    map.on('dragstart', () => { if (mapContainerRef.current) mapContainerRef.current.style.cursor = 'move'; });
    map.on('dragend',   () => { if (mapContainerRef.current) mapContainerRef.current.style.cursor = 'crosshair'; });
    mapRef.current = map;
  }, []);   // ← empty deps: runs once only

  // ── 2. Re-render site circles whenever sites prop changes ─────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    siteLayersRef.current.forEach((l) => map.removeLayer(l));
    siteLayersRef.current = [];
    sites.forEach((site) => {
      if (!site.location?.lat) return;
      const r = (site.radiusKm || 15) * 1000;
      const circle = L.circle([site.location.lat, site.location.lng], {
        radius: r, color: '#FFC500', weight: 2, fillColor: '#FFC500', fillOpacity: 0.08, dashArray: '6 6',
      }).addTo(map);
      circle.bindTooltip(`<strong>📍 ${site.name}</strong><br/><span style="font-family:monospace;font-size:11px;color:#71717a;">Geofence: ${site.radiusKm || 15} KM · ${site.location.lat.toFixed(4)}, ${site.location.lng.toFixed(4)}</span>`);
      const sm = L.marker([site.location.lat, site.location.lng], { icon: createSiteIcon(site.name) }).addTo(map);
      siteLayersRef.current.push(circle, sm);
    });
  }, [sites]);

  // ── 3. Add/update equipment markers when equipments prop changes ──────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const filtered = equipments.filter((eq) => {
      if (filterSite === 'all') return true;
      if (filterSite === 'assigned') {
        if (!assignedSiteIds?.length) return true;
        const sid = eq.siteId?._id?.toString() || eq.siteId?.toString();
        return assignedSiteIds.includes(sid);
      }
      const sid = eq.siteId?._id?.toString() || eq.siteId?.toString();
      return sid === filterSite;
    });

    // Remove markers for equipment no longer in filtered list
    const filteredIds = new Set(filtered.map((e) => e.equipmentId));
    Object.keys(eqMarkersRef.current).forEach((id) => {
      if (!filteredIds.has(id)) {
        map.removeLayer(eqMarkersRef.current[id]);
        delete eqMarkersRef.current[id];
      }
    });

    const boundsPoints = [];
    filtered.forEach((eq) => {
      const lat = eq.currentLocation?.lat;
      const lng = eq.currentLocation?.lng;
      if (!lat || !lng) return;
      boundsPoints.push([lat, lng]);
      const isSelected = selectedMachine?.equipmentId === eq.equipmentId;

      if (eqMarkersRef.current[eq.equipmentId]) {
        // Update existing marker — no map re-init
        eqMarkersRef.current[eq.equipmentId].setLatLng([lat, lng]);
        eqMarkersRef.current[eq.equipmentId].setIcon(createEquipmentIcon(eq.equipmentId, eq.type, eq.status, isSelected));
      } else {
        const marker = L.marker([lat, lng], { icon: createEquipmentIcon(eq.equipmentId, eq.type, eq.status, isSelected) }).addTo(map);
        marker.bindTooltip(makeTooltip(eq));
        marker.on('click', () => {
          if (onSelectMachine) onSelectMachine(eq);
          navigate(`/manager/equipment/${eq.equipmentId}`);
        });
        eqMarkersRef.current[eq.equipmentId] = marker;
      }
    });

    // Polyline / view management
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (selectedDijkstraPath?.length > 1) {
      const pts = selectedDijkstraPath.filter((s) => s.location?.lat).map((s) => [s.location.lat, s.location.lng]);
      if (pts.length > 1) {
        polylineRef.current = L.polyline(pts, { color: '#18181b', weight: 4, dashArray: '8 8' }).addTo(map);
        map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
      }
    } else if (selectedMachine?.currentLocation?.lat) {
      map.setView([selectedMachine.currentLocation.lat, selectedMachine.currentLocation.lng], 9, { animate: true });
    } else if (boundsPoints.length > 0 && Object.keys(eqMarkersRef.current).length === filtered.length) {
      map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 8 });
    }
  }, [equipments, sites, filterSite, selectedDijkstraPath, selectedMachine, assignedSiteIds]);

  // ── 4. Socket: move markers in-place, no map re-init ─────────────────────
  useEffect(() => {
    const onTelemetry = (data) => {
      const marker = eqMarkersRef.current[data.equipmentId];
      if (marker && data.location?.lat) marker.setLatLng([data.location.lat, data.location.lng]);
    };
    const onStatus = (data) => {
      const marker = eqMarkersRef.current[data.equipmentId];
      if (marker) {
        const eq = equipments.find((e) => e.equipmentId === data.equipmentId);
        marker.setIcon(createEquipmentIcon(data.equipmentId, eq?.type || '', data.status,
          selectedMachine?.equipmentId === data.equipmentId));
      }
    };
    socket.on(TELEMETRY_UPDATE, onTelemetry);
    socket.on(EQUIPMENT_STATUS, onStatus);
    return () => { socket.off(TELEMETRY_UPDATE, onTelemetry); socket.off(EQUIPMENT_STATUS, onStatus); };
  }, [equipments, selectedMachine]);

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FFC500] text-black rounded-md shadow-sm">
            <Navigation className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Fleet GIS Positioning & Geofence Map</h3>
            <p className="text-xs text-zinc-500 font-medium">Geofence Radius Circles (15KM Zone Tracking) & Real-Time Machine Telematics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="bg-white border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-4 min-h-[48px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
          >
            <option value="all">ALL SITES ({equipments.length} ASSETS)</option>
            <option value="assigned">MY ASSIGNED SITES ONLY</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>📍 {s.name.toUpperCase()}</option>
            ))}
          </select>

          <div className="flex items-center gap-3 bg-zinc-50 px-4 min-h-[48px] rounded-md border border-zinc-200 text-xs font-mono font-bold text-zinc-700">
            <span className="flex items-center gap-1.5 text-[#12B76A]"><span className="w-2.5 h-2.5 bg-[#12B76A] rounded-sm" /> ACTIVE</span>
            <span className="flex items-center gap-1.5 text-[#F79009]"><span className="w-2.5 h-2.5 bg-[#F79009] rounded-sm" /> IDLE</span>
            <span className="flex items-center gap-1.5 text-[#D92D20]"><span className="w-2.5 h-2.5 bg-[#D92D20] rounded-sm" /> OVERDUE</span>
          </div>
        </div>
      </div>

      <div className="h-[520px] w-full rounded-md overflow-hidden relative border border-zinc-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" style={{ cursor: 'crosshair' }} />
      </div>
    </div>
  );
}
