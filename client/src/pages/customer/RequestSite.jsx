import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import L from 'leaflet';
import { MapPin, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

export default function RequestSite() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [form, setForm] = useState({
    siteName: '',
    lat: '',
    lng: '',
    equipmentTypeNeeded: 'Excavator',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myRequests, setMyRequests] = useState([]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Default center to Tamil Nadu
    const map = L.map(mapContainerRef.current, { center: [10.7905, 78.7047], zoom: 7 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
    }).addTo(map);
    
    mapRef.current = map;

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setForm(prev => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
      
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        const html = `
          <div style="display:inline-flex;align-items:center;justify-content:center;
            background:#18181b;color:#FFC500;width:24px;height:24px;border-radius:50%;
            border:2px solid #FFC500;box-shadow:0 2px 6px rgba(0,0,0,.3);">
            📍
          </div>`;
        const icon = L.divIcon({ html, className: 'custom-pin', iconSize: [24, 24], iconAnchor: [12, 12] });
        markerRef.current = L.marker(e.latlng, { icon }).addTo(map);
      }
    });
    
    fetchRequests();
  }, []);
  
  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/api/rentals/my-site-requests');
      setMyRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      await api.post('/api/rentals/site-request', {
        siteName: form.siteName,
        lat: form.lat,
        lng: form.lng,
        equipmentTypeNeeded: form.equipmentTypeNeeded,
        notes: form.notes
      });
      setSuccess('Site request submitted successfully for review.');
      setForm({ ...form, siteName: '', notes: '' });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] font-sans">
      <nav className="bg-[#FFC500] px-6 py-3 flex items-center justify-between border-b-4 border-black sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-black text-[#FFC500] font-black text-2xl px-3 py-1 rounded-sm tracking-tighter flex items-center gap-1 shadow-sm">
            <span>CAT</span>
            <span className="text-[10px] bg-[#FFC500] text-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-mono">Rentals</span>
          </div>
          <span className="font-bold text-black uppercase tracking-wider text-sm hidden md:inline-block border-l-2 border-black/20 pl-4">
            Request New Site Setup
          </span>
        </div>
        <button
          onClick={() => navigate('/customer')}
          className="flex items-center gap-2 bg-black/10 hover:bg-black/20 text-black font-bold text-xs uppercase px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-zinc-200 pb-4 mb-4">
                <div className="p-2 bg-black text-[#FFC500] rounded-md shadow-sm">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                    New Site Registration
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Click on the map to pin the location</p>
                </div>
              </div>
              
              {error && <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded text-xs font-bold mb-4">{error}</div>}
              {success && <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded text-xs font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {success}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Site Name</label>
                  <input 
                    required type="text"
                    value={form.siteName}
                    onChange={e => setForm({...form, siteName: e.target.value})}
                    placeholder="e.g. Coimbatore Hub"
                    className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-3 py-2.5 focus:border-[#FFC500] outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Latitude</label>
                    <input readOnly required value={form.lat} placeholder="Click on map" className="w-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs font-bold rounded-md px-3 py-2.5 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Longitude</label>
                    <input readOnly required value={form.lng} placeholder="Click on map" className="w-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs font-bold rounded-md px-3 py-2.5 cursor-not-allowed" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Primary Equipment Needed</label>
                  <select 
                    value={form.equipmentTypeNeeded}
                    onChange={e => setForm({...form, equipmentTypeNeeded: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-3 py-2.5 focus:border-[#FFC500] outline-none"
                  >
                    <option value="Excavator">Excavator</option>
                    <option value="Bulldozer">Bulldozer</option>
                    <option value="Crane">Crane</option>
                    <option value="Loader">Loader</option>
                    <option value="Grader">Grader</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Additional Notes</label>
                  <textarea 
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-3 py-2.5 focus:border-[#FFC500] outline-none resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black hover:bg-zinc-800 text-[#FFC500] font-black text-xs uppercase tracking-wider py-3 rounded-md transition shadow-sm border-b-2 border-[#FFC500]/50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Submitting...' : 'Submit Site For Review'}
                </button>
              </form>
            </div>
            
            <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-3 mb-3">
                My Site Requests
              </h3>
              <div className="space-y-3">
                {myRequests.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-bold">No site requests submitted.</p>
                ) : myRequests.map(req => (
                  <div key={req._id} className="bg-zinc-50 border border-zinc-200 p-3 rounded-md flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-zinc-900">{req.name}</h4>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">LAT: {req.location?.lat} / LNG: {req.location?.lng}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${req.status === 'active' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-zinc-200 text-zinc-700'}`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Map */}
          <div className="h-[600px] bg-white border border-zinc-200 rounded-md p-2 shadow-sm sticky top-24">
            <div ref={mapContainerRef} className="w-full h-full rounded bg-zinc-100 z-10" style={{ cursor: 'crosshair' }} />
          </div>
          
        </div>
      </div>
    </div>
  );
}
