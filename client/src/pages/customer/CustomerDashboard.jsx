import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import socket, { TELEMETRY_UPDATE, EQUIPMENT_STATUS } from '../../sockets/socket';
import {
  LogOut,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Fuel,
  Activity,
  CalendarDays,
  Send,
  Truck,
  Package
} from 'lucide-react';

export default function CustomerDashboard() {
  const { auth, logout } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState({});
  const [pendingRequests, setPendingRequests] = useState([
    { id: 'REQ-1092', category: 'Bulldozer', site: 'Chennai', date: '2026-08-15', status: 'Pending Review' }
  ]);

  const [reqForm, setReqForm] = useState({
    site: 'Chennai',
    category: 'Excavator',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const { data } = await api.get('/api/rentals/mine');
        setRentals(data);
      } catch (err) {
        console.error('Failed to fetch rentals', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRentals();

    socket.on(TELEMETRY_UPDATE, (data) => {
      setLiveData((prev) => ({ ...prev, [data.equipmentId]: data }));
    });
    socket.on(EQUIPMENT_STATUS, (data) => {
      setLiveData((prev) => ({
        ...prev,
        [data.equipmentId]: { ...(prev[data.equipmentId] || {}), status: data.status },
      }));
    });

    return () => {
      socket.off(TELEMETRY_UPDATE);
      socket.off(EQUIPMENT_STATUS);
    };
  }, []);

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!reqForm.startDate || !reqForm.endDate) return;
    
    const newReq = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      category: reqForm.category,
      site: reqForm.site,
      date: reqForm.startDate,
      status: 'Awaiting Allocation'
    };
    
    setPendingRequests([newReq, ...pendingRequests]);
    setReqForm({ ...reqForm, startDate: '', endDate: '' });
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get('/api/rentals/export-pdf', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CAT-Rental-Customer-Report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to generate PDF report.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-zinc-900 font-sans selection:bg-[#FFC500] selection:text-black">
      {/* Top Brand Nav */}
      <nav className="bg-[#FFC500] px-6 py-3 flex items-center justify-between border-b-4 border-black sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-black text-[#FFC500] font-black text-2xl px-3 py-1 rounded-sm tracking-tighter flex items-center gap-1 shadow-sm">
            <span>CAT</span>
            <span className="text-[10px] bg-[#FFC500] text-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-mono">
              Rentals
            </span>
          </div>
          <span className="font-bold text-black uppercase tracking-wider text-sm hidden md:inline-block border-l-2 border-black/20 pl-4">
            Customer Allocation Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadPDF}
            className="bg-black hover:bg-zinc-900 text-[#FFC500] font-bold text-xs uppercase px-3 py-1.5 rounded transition shadow flex items-center gap-1.5 cursor-pointer font-mono"
            title="Download PDF Rental Report"
          >
            <span>📄 DOWNLOAD REPORT</span>
          </button>
          <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            <span className="text-black font-bold text-xs uppercase tracking-wider">Live</span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-black font-extrabold text-sm leading-tight uppercase">{auth?.name}</p>
            <p className="text-black/70 font-mono text-[10px] tracking-widest uppercase">{auth?.role} ACCOUNT</p>
          </div>
          <button
            onClick={logout}
            className="p-2 hover:bg-black/10 rounded-full transition text-black cursor-pointer"
            title="Secure Logout"
          >
            <LogOut className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Resource Requests */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Request Form */}
            <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-zinc-200 pb-4 mb-4">
                <div className="p-2 bg-black text-[#FFC500] rounded-md shadow-sm">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                    Request Resources
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Submit field request for admin allocation</p>
                </div>
              </div>

              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Target Site</label>
                  <select 
                    value={reqForm.site}
                    onChange={e => setReqForm({...reqForm, site: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-3 py-2.5 focus:border-[#FFC500] focus:ring-1 focus:ring-[#FFC500] outline-none"
                  >
                  <option value="Chennai">Chennai</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Madurai">Madurai</option>
                    <option value="Tiruchirappalli">Tiruchirappalli</option>
                    <option value="Salem">Salem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Machine Category</label>
                  <select 
                    value={reqForm.category}
                    onChange={e => setReqForm({...reqForm, category: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-3 py-2.5 focus:border-[#FFC500] focus:ring-1 focus:ring-[#FFC500] outline-none"
                  >
                    <option value="Excavator">Excavator</option>
                    <option value="Bulldozer">Bulldozer</option>
                    <option value="Crane">Crane</option>
                    <option value="Loader">Loader</option>
                    <option value="Grader">Grader</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Start Date</label>
                    <input 
                      type="date"
                      required
                      value={reqForm.startDate}
                      onChange={e => setReqForm({...reqForm, startDate: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-3 py-2.5 focus:border-[#FFC500] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">End Date</label>
                    <input 
                      type="date"
                      required
                      value={reqForm.endDate}
                      onChange={e => setReqForm({...reqForm, endDate: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold rounded-md px-3 py-2.5 focus:border-[#FFC500] outline-none"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full mt-2 bg-[#FFC500] hover:bg-[#e6b000] text-black font-black text-xs uppercase tracking-wider py-3 rounded-md transition shadow-sm border-b-2 border-black/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Request
                </button>
              </form>
            </div>

            {/* Pending Requests */}
            <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-3 mb-3">
                Active Requests
              </h3>
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-zinc-50 border border-zinc-200 p-3 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-black text-zinc-900">{req.category.toUpperCase()}</span>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{req.id}</div>
                      </div>
                      <span className="bg-zinc-200 text-zinc-700 text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                        {req.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-600 uppercase">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.site}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {req.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Allocated Resources & Live Telemetry */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                <Truck className="w-6 h-6 text-amber-600" />
                Allocated Resources & Telemetry
              </h2>
            </div>
            
            {loading ? (
              <div className="bg-white p-8 rounded-md border border-zinc-200 text-center text-zinc-500 text-sm font-bold">
                Loading resources...
              </div>
            ) : rentals.length === 0 ? (
              <div className="bg-white p-12 rounded-md border border-zinc-200 text-center shadow-sm">
                <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-zinc-700">No active resources</h3>
                <p className="text-xs text-zinc-500 mt-1">Submit a request to have equipment allocated to your sites.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rentals.map(rental => {
                  const eq = rental.equipmentId;
                  if (!eq) return null;
                  
                  const telemetry = liveData[eq.equipmentId];
                  const isOverdue = rental.status === 'overdue';
                  const checkOutDate = new Date(rental.checkOutDate).toLocaleDateString();
                  
                  return (
                    <div 
                      key={rental._id} 
                      className={`relative bg-white border-2 rounded-md p-5 shadow-sm transition-all ${
                        isOverdue ? 'border-[#D92D20]' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {isOverdue && (
                        <div className="absolute top-0 right-0 bg-[#D92D20] text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest rounded-bl-md flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> OVERDUE
                        </div>
                      )}
                      
                      <div className="mb-4 pr-16">
                        <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">
                          {eq.type}
                        </h3>
                        <p className="text-xs font-mono text-zinc-500 font-bold bg-zinc-100 inline-block px-2 py-0.5 rounded-sm mt-1">
                          {eq.equipmentId}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5 border-y border-zinc-100 py-3">
                        <div>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> Requested Till
                          </p>
                          <p className={`text-sm font-bold ${isOverdue ? 'text-[#D92D20]' : 'text-zinc-800'}`}>
                            {checkOutDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Real-time Status
                          </p>
                          <p className="text-sm font-bold text-green-600 capitalize">
                            {telemetry?.status || eq.status}
                          </p>
                        </div>
                      </div>

                      {/* Live Telemetry Display */}
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Live Telemetry</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-zinc-50 p-2.5 rounded-md border border-zinc-200 flex items-center gap-2">
                            <Fuel className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Fuel Level</p>
                              <p className="text-sm font-black font-mono text-zinc-900">
                                {telemetry ? telemetry.fuelLevel : eq.fuelLevel ?? '--'}%
                              </p>
                            </div>
                          </div>
                          <div className="bg-zinc-50 p-2.5 rounded-md border border-zinc-200 flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-amber-500" />
                            <div>
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Engine Hrs</p>
                              <p className="text-sm font-black font-mono text-zinc-900">
                                {telemetry ? telemetry.engineHoursToday?.toFixed(1) : eq.engineHoursToday?.toFixed(1) ?? '--'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
