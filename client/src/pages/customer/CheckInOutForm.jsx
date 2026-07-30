import { useState } from 'react';
import api from '../../api/axios';
import { ScanLine, LogIn, LogOut } from 'lucide-react';

export default function CheckInOutForm({ onActionComplete }) {
  const [equipmentId, setEquipmentId] = useState('');
  const [statusMsg, setStatusMsg]     = useState(null);
  const [errorMsg, setErrorMsg]       = useState(null);
  const [loading, setLoading]         = useState(false);

  const handleAction = async (action) => {
    if (!equipmentId.trim()) { setErrorMsg('Please enter an Equipment ID'); return; }
    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await api.post(`/api/rentals/${action}`, { equipmentId: equipmentId.trim() });
      setStatusMsg(`Successfully ${action === 'checkin' ? 'checked in to' : 'checked out of'} equipment ${equipmentId}`);
      setEquipmentId('');
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm">
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-4 mb-4">
        <div className="p-2 bg-black text-[#FFC500] rounded-md shadow-sm">
          <ScanLine className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Scanner Simulation</h3>
          <p className="text-xs text-zinc-500 font-medium">QR / RFID check-in and check-out</p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Scan or type Equipment ID (e.g. EQX1001)"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
          className="w-full bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none font-mono"
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAction('checkin')}
            disabled={loading}
            className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider min-h-[44px] rounded-md flex items-center justify-center gap-2 border-b-2 border-black/20 transition disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" /> Check In
          </button>
          <button
            onClick={() => handleAction('checkout')}
            disabled={loading}
            className="bg-[#D92D20] hover:bg-[#b91c1c] text-white font-extrabold text-xs uppercase tracking-wider min-h-[44px] rounded-md flex items-center justify-center gap-2 border-b-2 border-black/20 transition disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 stroke-[2.5]" /> Check Out
          </button>
        </div>
      </div>

      {statusMsg && (
        <p className="mt-3 text-xs font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] rounded-md px-3 py-2">{statusMsg}</p>
      )}
      {errorMsg && (
        <p className="mt-3 text-xs font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-md px-3 py-2">{errorMsg}</p>
      )}
    </div>
  );
}
