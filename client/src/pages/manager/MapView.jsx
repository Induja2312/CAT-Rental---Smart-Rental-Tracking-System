import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import socket, { TELEMETRY_UPDATE, EQUIPMENT_STATUS } from '../../sockets/socket';
import { Navigation, MapPin, Fuel, ShieldAlert } from 'lucide-react';

// Dedicated Clean Machinery Type Symbols
const getMachineTypeLabel = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('excavator')) return { symbol: 'EXC', label: 'EXCAVATOR', icon: '🚜' };
  if (t.includes('crane')) return { symbol: 'CRN', label: 'CRANE', icon: '🏗️' };
  if (t.includes('bulldozer')) return { symbol: 'BDOZ', label: 'BULLDOZER', icon: '🚜' };
  if (t.includes('grader')) return { symbol: 'GRD', label: 'GRADER', icon: '🚜' };
  if (t.includes('loader')) return { symbol: 'LDR', label: 'LOADER', icon: '🚜' };
  if (t.includes('truck')) return { symbol: 'TRK', label: 'DUMP TRUCK', icon: '🚚' };
  return { symbol: 'EQ', label: 'EQUIPMENT', icon: '⚙️' };
};

// Sleek Professional Enterprise Machinery Marker
const createEquipmentIcon = (type, status, isSelected = false) => {
  let statusColor = '#12B76A'; // active green
  if (status === 'idle') statusColor = '#F79009'; // idle amber
  else if (status === 'overdue') statusColor = '#D92D20'; // overdue red
  else if (status === 'unassigned') statusColor = '#71717A'; // unassigned zinc

  const { symbol, icon } = getMachineTypeLabel(type);
  const strokeWidth = isSelected ? '3' : '2';
  const strokeColor = isSelected ? '#FFC500' : '#18181b';
  const shadowFilter = isSelected ? 'drop-shadow(0 0 8px rgba(255, 197, 0, 0.8))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))';

  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: ${shadowFilter};
      cursor: pointer !important;
      transition: transform 0.2s ease;
    ">
      <!-- Pin Header Badge -->
      <div style="
        display: flex;
        align-items: center;
        gap: 4px;
        background: #18181b;
        color: #ffffff;
        padding: 4px 8px;
        border-radius: 4px;
        border: ${strokeWidth}px solid ${strokeColor};
        font-family: monospace;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        cursor: pointer !important;
      ">
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: ${statusColor};
          display: inline-block;
        "></span>
        <span>${icon} ${symbol}</span>
      </div>

      <!-- Pointer Arrow Tip -->
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid ${strokeColor};
        margin-top: -1px;
        cursor: pointer !important;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'sleek-cat-equipment-marker',
    iconSize: [80, 40],
    iconAnchor: [40, 40],
    popupAnchor: [0, -40],
  });
};

// Sleek Professional Enterprise Site Radius Badge
const createSiteIcon = (siteName) => {
  const shortName = siteName.replace(/Site|\(S\d+\)/gi, '').trim().toUpperCase();

  const html = `
    <div style="
      display: flex;
      align-items: center;
      gap: 5px;
      background: #FFC500;
      color: #000000;
      padding: 5px 10px;
      border-radius: 4px;
      font-weight: 900;
      font-size: 11px;
      font-family: monospace;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      border: 1.5px solid #000000;
      white-space: nowrap;
      letter-spacing: 0.5px;
      cursor: pointer !important;
    ">
      <span style="font-size: 12px;">📍</span>
      <span>${shortName}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'sleek-cat-site-marker',
    iconSize: [140, 32],
    iconAnchor: [70, 16],
  });
};

export default function MapView({
  equipments = [],
  sites = [],
  assignedSiteIds = [],
  selectedDijkstraPath = null,
  selectedMachine = null,
  onSelectMachine = null,
  onInitiateTransfer = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]);
  const polylineRef = useRef(null);

  const [liveEquipment, setLiveEquipment] = useState(equipments);
  const [filterSite, setFilterSite] = useState('all');

  useEffect(() => {
    setLiveEquipment(equipments);
  }, [equipments]);

  // Real-time socket telematics update
  useEffect(() => {
    const handleTelemetryUpdate = (data) => {
      setLiveEquipment((prev) =>
        prev.map((eq) => {
          if (eq._id === data.equipmentId || eq.equipmentId === data.equipmentId) {
            return {
              ...eq,
              currentLocation: data.location || eq.currentLocation,
              engineHoursToday: data.engineHoursToday ?? eq.engineHoursToday,
              idleHoursToday: data.idleHoursToday ?? eq.idleHoursToday,
              fuelLevel: data.fuelLevel ?? eq.fuelLevel,
            };
          }
          return eq;
        })
      );
    };

    const handleStatusUpdate = (data) => {
      setLiveEquipment((prev) =>
        prev.map((eq) => {
          if (eq._id === data.equipmentId || eq.equipmentId === data.equipmentId) {
            return { ...eq, status: data.status };
          }
          return eq;
        })
      );
    };

    socket.on(TELEMETRY_UPDATE, handleTelemetryUpdate);
    socket.on(EQUIPMENT_STATUS, handleStatusUpdate);

    return () => {
      socket.off(TELEMETRY_UPDATE, handleTelemetryUpdate);
      socket.off(EQUIPMENT_STATUS, handleStatusUpdate);
    };
  }, []);

  const filteredEquipment = liveEquipment.filter((eq) => {
    if (filterSite === 'all') return true;
    if (filterSite === 'assigned') {
      if (!assignedSiteIds || assignedSiteIds.length === 0) return true;
      const siteIdStr = eq.siteId?._id?.toString() || eq.siteId?.toString();
      return assignedSiteIds.includes(siteIdStr);
    }
    const siteIdStr = eq.siteId?._id?.toString() || eq.siteId?.toString();
    return siteIdStr === filterSite;
  });

  const defaultTnCenter = [10.7905, 78.7047];

  // Native Leaflet Map Initialization & Sleek Rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultTnCenter,
        zoom: 7,
        zoomControl: true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
          maxZoom: 19,
        }
      ).addTo(map);

      // Force high-contrast cursor on map drag events
      map.on('dragstart', () => {
        if (mapContainerRef.current) mapContainerRef.current.style.cursor = 'move';
      });
      map.on('dragend', () => {
        if (mapContainerRef.current) mapContainerRef.current.style.cursor = 'crosshair';
      });

      mapRef.current = map;
    }

    const map = mapRef.current;

    // Clear previous layers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    circlesRef.current.forEach((c) => map.removeLayer(c));
    circlesRef.current = [];

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Render Construction Sites & Geofence Radius Circles (15km radius)
    sites.forEach((site) => {
      if (site.location?.lat && site.location?.lng) {
        const radiusMeters = (site.radiusKm || 15) * 1000;

        // Render Geofence Circle Overlay
        const circle = L.circle([site.location.lat, site.location.lng], {
          radius: radiusMeters,
          color: '#FFC500',
          weight: 2,
          fillColor: '#FFC500',
          fillOpacity: 0.08,
          dashArray: '6, 6',
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif; color: #18181b; padding: 4px;">
            <strong style="color: #18181b; font-size: 13px; font-weight: 900; text-transform: uppercase;">📍 ${site.name}</strong>
            <p style="margin: 4px 0 0 0; font-size: 11px; font-family: monospace; color: #71717a;">
              Geofence Radius: <strong>${site.radiusKm || 15} KM</strong> Coverage
            </p>
            <p style="margin: 2px 0 0 0; font-size: 11px; font-family: monospace; color: #71717a;">
              TN Coordinates: ${site.location.lat.toFixed(4)}, ${site.location.lng.toFixed(4)}
            </p>
          </div>
        `);
        circlesRef.current.push(circle);

        // Render Site Badge Marker
        const marker = L.marker([site.location.lat, site.location.lng], {
          icon: createSiteIcon(site.name),
        }).addTo(map);

        markersRef.current.push(marker);
      }
    });

    // Render Equipment Markers
    const boundsPoints = [];
    filteredEquipment.forEach((eq) => {
      const lat = eq.currentLocation?.lat || 10.7905;
      const lng = eq.currentLocation?.lng || 78.7047;

      if (lat !== 0 || lng !== 0) {
        boundsPoints.push([lat, lng]);
        const isSelected = selectedMachine?.equipmentId === eq.equipmentId;

        const marker = L.marker([lat, lng], {
          icon: createEquipmentIcon(eq.type, eq.status, isSelected),
        }).addTo(map);

        marker.on('click', () => {
          if (onSelectMachine) onSelectMachine(eq);
        });

        const statusBadge =
          eq.status === 'active'
            ? 'background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;'
            : eq.status === 'idle'
            ? 'background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A;'
            : 'background: #FEF2F2; color: #B91C1C; border: 1px solid #FCA5A5;';

        const { label, icon } = getMachineTypeLabel(eq.type);

        marker.bindPopup(`
          <div style="color: #18181b; font-family: Inter, sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-size: 15px;">${icon} <strong style="color: #18181b; font-size: 15px; font-family: monospace; font-weight: 900;">${eq.equipmentId}</strong></span>
              <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; font-weight: 800; padding: 2px 8px; border-radius: 4px; ${statusBadge}">
                ${eq.status}
              </span>
            </div>
            <div style="font-size: 12px; line-height: 1.6; color: #27272a;">
              <div><strong>Machine Category:</strong> ${label}</div>
              <div><strong>Stationed Site:</strong> ${eq.siteId?.name || 'Tamil Nadu Depot'}</div>
              <div><strong>Operator ID:</strong> <span style="font-family: monospace; font-weight: 800;">${eq.lastOperatorId?.name || 'UNASSIGNED'}</span></div>
              <div><strong>Engine Run:</strong> <span style="font-family: monospace; font-weight: 800; color: #047857;">${eq.engineHoursToday ?? 4} hrs/day</span></div>
              <div><strong>Idle Hours:</strong> <span style="font-family: monospace; font-weight: 800; color: #B45309;">${eq.idleHoursToday ?? 2} hrs/day</span></div>
              <div><strong>Fuel Level:</strong> <span style="font-family: monospace; font-weight: 800;">${eq.fuelLevel ?? 85}%</span></div>
              <div><strong>Contract Expiry:</strong> <span style="font-family: monospace;">${eq.checkOutDate || '2025-05-15'}</span></div>
            </div>
          </div>
        `);

        markersRef.current.push(marker);
      }
    });

    // Dijkstra Polyline Route Overlay
    if (selectedDijkstraPath && selectedDijkstraPath.length > 1) {
      const pathPoints = selectedDijkstraPath
        .filter((s) => s.location?.lat)
        .map((s) => [s.location.lat, s.location.lng]);

      if (pathPoints.length > 1) {
        polylineRef.current = L.polyline(pathPoints, {
          color: '#18181b',
          weight: 4,
          dashArray: '8, 8',
        }).addTo(map);

        map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
      }
    } else if (selectedMachine && selectedMachine.currentLocation?.lat) {
      map.setView([selectedMachine.currentLocation.lat, selectedMachine.currentLocation.lng], 9, {
        animate: true,
      });
    } else if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 8 });
    }
  }, [filteredEquipment, sites, selectedDijkstraPath, selectedMachine]);

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FFC500] text-black rounded-md shadow-sm">
            <Navigation className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
              Tamil Nadu Fleet GIS Positioning & Geofence Map
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Geofence Radius Circles (15KM Zone Tracking) & Real-Time Machine Telematics
            </p>
          </div>
        </div>

        {/* Touch Target Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="bg-white border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-4 min-h-[48px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
          >
            <option value="all">ALL TN SITES ({liveEquipment.length} ASSETS)</option>
            <option value="assigned">MY ASSIGNED SITES ONLY</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>
                📍 {s.name.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Alert Legend */}
          <div className="flex items-center gap-3 bg-zinc-50 px-4 min-h-[48px] rounded-md border border-zinc-200 text-xs font-mono font-bold text-zinc-700">
            <span className="flex items-center gap-1.5 text-[#12B76A]">
              <span className="w-2.5 h-2.5 bg-[#12B76A] rounded-sm"></span> ACTIVE
            </span>
            <span className="flex items-center gap-1.5 text-[#F79009]">
              <span className="w-2.5 h-2.5 bg-[#F79009] rounded-sm"></span> IDLE
            </span>
            <span className="flex items-center gap-1.5 text-[#D92D20]">
              <span className="w-2.5 h-2.5 bg-[#D92D20] rounded-sm"></span> OVERDUE
            </span>
          </div>
        </div>
      </div>

      {/* Map DOM Element */}
      <div className="h-[520px] w-full rounded-md overflow-hidden relative border border-zinc-200 shadow-inner">
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ cursor: 'crosshair' }}
        />
      </div>
    </div>
  );
}
