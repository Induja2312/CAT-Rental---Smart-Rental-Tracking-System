import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Plus, Pencil, Trash2, UserCheck } from 'lucide-react';

const STATUS_STYLE = {
  active:     'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
  idle:       'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
  overdue:    'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]',
  unassigned: 'bg-zinc-100 text-zinc-600 border border-zinc-300',
};

export default function EquipmentList() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [eqRes, mgRes] = await Promise.all([
        api.get('/api/admin/equipment'),
        api.get('/api/admin/managers'),
      ]);
      setEquipment(eqRes.data);
      setManagers(mgRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAssign = async (eqId, managerId) => {
    setAssigningId(eqId);
    try {
      await api.put(`/api/admin/equipment/${eqId}`, { lastOperatorId: managerId || null });
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  const handleDelete = async (eqId, label) => {
    if (!window.confirm(`Delete ${label}?`)) return;
    setDeletingId(eqId);
    try {
      await api.delete(`/api/admin/equipment/${eqId}`);
      setEquipment((prev) => prev.filter((e) => e._id !== eqId));
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Equipment Registry</h3>
          <p className="text-xs text-zinc-500 font-medium">Manage fleet assets, assignments and thresholds</p>
        </div>
        <button
          onClick={() => navigate('/admin/equipment/new')}
          className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider px-5 min-h-[44px] rounded-md flex items-center gap-2 border-b-2 border-black/20 transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Add Equipment
        </button>
      </div>

      {error && <p className="text-xs text-[#D92D20] font-bold">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-800">
          <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
            <tr>
              <th className="py-3 px-4">Asset ID</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Class</th>
              <th className="py-3 px-4">Site</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Rest Hrs</th>
              <th className="py-3 px-4">Max Hrs/Day</th>
              <th className="py-3 px-4">Assigned Manager</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 font-mono">
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-zinc-500 font-sans text-xs">Loading...</td></tr>
            ) : equipment.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-zinc-500 font-sans text-xs">No equipment found.</td></tr>
            ) : equipment.map((eq) => (
              <tr key={eq._id} className="hover:bg-zinc-50 transition">
                <td className="py-3.5 px-4 font-black text-zinc-900">{eq.equipmentId}</td>
                <td className="py-3.5 px-4 font-sans font-semibold">{eq.type}</td>
                <td className="py-3.5 px-4 font-sans">{eq.class || '—'}</td>
                <td className="py-3.5 px-4 font-sans">{eq.siteId?.name || 'Unassigned'}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[eq.status] || STATUS_STYLE.unassigned}`}>
                    {eq.status}
                  </span>
                </td>
                <td className="py-3.5 px-4">{eq.restTimeHours ?? '—'}</td>
                <td className="py-3.5 px-4">{eq.maxWorkHoursPerDay ?? '—'}</td>
                <td className="py-3.5 px-4">
                  <select
                    value={eq.lastOperatorId?._id || ''}
                    onChange={(e) => handleAssign(eq._id, e.target.value)}
                    disabled={assigningId === eq._id}
                    className="bg-white border border-zinc-300 text-zinc-900 text-[10px] font-mono rounded px-2 py-1 focus:border-[#FFC500] focus:outline-none cursor-pointer"
                  >
                    <option value="">— Unassigned —</option>
                    {managers.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/admin/equipment/${eq._id}/edit`)}
                    className="p-2 rounded hover:bg-zinc-100 text-zinc-600 transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(eq._id, eq.equipmentId)}
                    disabled={deletingId === eq._id}
                    className="p-2 rounded hover:bg-[#FEF2F2] text-[#D92D20] transition disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
