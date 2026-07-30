import { useState } from 'react';
import api from '../../api/axios';

export default function CheckInOutForm({ onActionComplete }) {
  const [equipmentId, setEquipmentId] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    if (!equipmentId.trim()) {
      setErrorMsg('Please enter an Equipment ID');
      return;
    }
    
    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      await api.post(`/api/rentals/${action}`, { equipmentId: equipmentId.trim() });
      setStatusMsg(`Successfully ${action === 'checkin' ? 'checked in' : 'checked out'} equipment ${equipmentId}`);
      setEquipmentId('');
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cat-surface border border-cat-border p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-bold text-cat-yellow mb-4">Scanner Simulation (QR/RFID)</h2>
      <div className="flex gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Scan or type Equipment ID (e.g., EQX1001)" 
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
          className="flex-1 bg-cat-bg border border-cat-border rounded p-3 text-white focus:outline-none focus:border-cat-yellow"
        />
        <button 
          onClick={() => handleAction('checkin')} 
          disabled={loading}
          className="bg-cat-yellow text-cat-black font-bold px-6 py-3 rounded hover:bg-yellow-500 transition disabled:opacity-50"
        >
          Check In
        </button>
        <button 
          onClick={() => handleAction('checkout')} 
          disabled={loading}
          className="bg-cat-red text-white font-bold px-6 py-3 rounded hover:bg-red-700 transition disabled:opacity-50"
        >
          Check Out
        </button>
      </div>
      {statusMsg && <div className="text-green-500 font-semibold">{statusMsg}</div>}
      {errorMsg && <div className="text-red-500 font-semibold">{errorMsg}</div>}
    </div>
  );
}
