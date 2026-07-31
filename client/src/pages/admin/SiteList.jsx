import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Pencil, Trash2, CheckCircle2, MapPin } from 'lucide-react';

// Tamil Nadu bounding box (from Prompt 1)
const TN = { latMin: 8.0, latMax: 13.5, lngMin: 76.0, lngMax: 80.5 };

const STATUS_STYLE = {
  active:  'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
  pending: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
};

const EMPTY_FORM = { name: '', lat: '', lng: '' };

function validateTN(lat, lng) {
  const la = parseFloat(lat), lo = parseFloat(lng);
  if (isNaN(la) || isNaN(lo)) return 'Lat and Lng must be numbers';
  if (la < TN.latMin || la > TN.latMax) return `Lat must be ${TN.latMin}–${TN.latMax} (Tamil Nadu)`;
  if (lo < TN.lngMin || lo > TN.lngMax) return `Lng must be ${TN.lngMin}–${TN.lngMax} (Tamil Nadu)`;
  return null;
}

export default function SiteList() {
  const [sites, setSites]         = useState([]);
  const [filter, setFilter]       = useState('all');   // 'all' | 'pending' | 'active'
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await api.get('/api/admin/sites', { params });
      setSites(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSites(); }, [filter]);

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); setShowForm(true); };
  const openEdit   = (s)  => {
    setEditId(s._id);
    setForm({ name: s.name, lat: String(s.location?.lat ?? ''), lng: String(s.location?.lng ?? '') });
    setError('');
    setShowForm(true);
  };
  const closeForm  = ()   => { setShowForm(false); setEditId(null); setError(''); };

  const handleSave = async (e) => {
    e.preventDefault();
    const validErr = validateTN(form.lat, form.lng);
    if (validErr) { setError(validErr); return; }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await api.put(`/api/admin/sites/${editId}`, form);
      } else {
        await api.post('/api/admin/sites', form);
      }
      closeForm();
      fetchSites();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/api/admin/sites/${id}`, { status: 'active' });
      fetchSites();
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/sites/${id}`);
      setSites((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pendingCount = sites.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Inline create/edit form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4 max-w-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
              {editId ? 'Edit Site' : 'Create Site'}
            </h3>
            <button onClick={closeForm} className="text-zinc-400 hover:text-zinc-700 text-xs font-mono">✕ Cancel</button>
          </div>
          {error && <p className="text-xs text-[#D92D20] font-bold">{error}</p>}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Site Name</label>
              <input
                required value={form.name} onChange={set('name')}
                className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Latitude</label>
                <input
                  required type="number" step="any" value={form.lat} onChange={set('lat')}
                  placeholder="8.0 – 13.5"
                  className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Longitude</label>
                <input
                  required type="number" step="any" value={form.lng} onChange={set('lng')}
                  placeholder="76.0 – 80.5"
                  className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit" disabled={saving}
              className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider px-6 min-h-[44px] rounded-md flex items-center gap-2 border-b-2 border-black/20 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Site'}
            </button>
          </form>
        </div>
      )}

      {/* Main table card */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Site Registry</h3>
            <p className="text-xs text-zinc-500 font-medium">Manage construction sites and approve customer submissions</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider px-5 min-h-[44px] rounded-md flex items-center gap-2 border-b-2 border-black/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Site
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { key: 'all',     label: 'All Sites' },
            { key: 'active',  label: 'Active' },
            { key: 'pending', label: `Pending Approval${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 min-h-[36px] rounded-md text-xs font-bold uppercase tracking-wide transition ${
                filter === t.key
                  ? 'bg-[#FFC500] text-black border-b-2 border-black/20'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && !showForm && <p className="text-xs text-[#D92D20] font-bold">{error}</p>}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-800">
            <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-mono font-bold border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Site Name</th>
                <th className="py-3 px-4">Customer / Submitter</th>
                <th className="py-3 px-4">Equipment Needed</th>
                <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-zinc-500 font-sans text-xs">Loading...</td></tr>
              ) : sites.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-zinc-500 font-sans text-xs">No sites found.</td></tr>
              ) : sites.map((s) => (
                <tr key={s._id} className="hover:bg-zinc-50 transition">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#FFC500] shrink-0" />{s.name}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-medium text-zinc-700">
                    {s.submittedBy ? `${s.submittedBy.name} (${s.submittedBy.email})` : 'System / Admin'}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-semibold text-zinc-800">
                    {s.equipmentTypeNeeded || '—'}
                  </td>
                  <td className="py-3.5 px-4">{s.location?.lat?.toFixed(4)}, {s.location?.lng?.toFixed(4)}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[s.status] || STATUS_STYLE.active}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {s.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(s._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#ECFDF5] hover:bg-[#12B76A] text-[#047857] hover:text-white border border-[#A7F3D0] rounded text-[10px] font-bold uppercase transition"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 rounded hover:bg-zinc-100 text-zinc-600 transition"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s._id, s.name)}
                        disabled={deletingId === s._id}
                        className="p-2 rounded hover:bg-[#FEF2F2] text-[#D92D20] transition disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
