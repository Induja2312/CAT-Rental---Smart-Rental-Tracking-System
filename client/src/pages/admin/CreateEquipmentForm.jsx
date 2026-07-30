import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Save, ArrowLeft } from 'lucide-react';

const EMPTY = { equipmentId: '', type: '', class: '', siteId: '', restTimeHours: '8', maxWorkHoursPerDay: '10', status: 'unassigned' };

export default function CreateEquipmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [sites, setSites] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/admin/sites').then((r) => setSites(r.data)).catch(() => {});
    if (isEdit) {
      api.get('/api/admin/equipment').then((r) => {
        const eq = r.data.find((e) => e._id === id);
        if (eq) setForm({
          equipmentId:        eq.equipmentId,
          type:               eq.type,
          class:              eq.class || '',
          siteId:             eq.siteId?._id || '',
          restTimeHours:      String(eq.restTimeHours ?? 8),
          maxWorkHoursPerDay: String(eq.maxWorkHoursPerDay ?? 10),
          status:             eq.status,
        });
      }).catch(() => {});
    }
  }, [id, isEdit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        restTimeHours:      parseFloat(form.restTimeHours),
        maxWorkHoursPerDay: parseFloat(form.maxWorkHoursPerDay),
        siteId:             form.siteId || null,
      };
      if (isEdit) {
        await api.put(`/api/admin/equipment/${id}`, payload);
      } else {
        await api.post('/api/admin/equipment', payload);
      }
      navigate('/admin/equipment');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none"
        {...extra}
      />
    </div>
  );

  return (
    <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-5 max-w-2xl">
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-4">
        <button onClick={() => navigate('/admin/equipment')} className="p-2 rounded hover:bg-zinc-100 text-zinc-600 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
            {isEdit ? 'Edit Equipment' : 'Add Equipment'}
          </h3>
          <p className="text-xs text-zinc-500 font-medium">Fill in all required fields and save</p>
        </div>
      </div>

      {error && <p className="text-xs text-[#D92D20] font-bold">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Equipment ID', 'equipmentId', 'text', { required: true, disabled: isEdit })}
          {field('Type', 'type', 'text', { required: true, placeholder: 'Excavator, Crane…' })}
          {field('Class', 'class', 'text', { placeholder: 'Heavy, Medium, Light…' })}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Site</label>
            <select
              value={form.siteId}
              onChange={set('siteId')}
              className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
            >
              <option value="">— Unassigned —</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          {field('Rest Time (hrs)', 'restTimeHours', 'number', { min: 0, max: 24, step: 0.5 })}
          {field('Max Work Hrs/Day', 'maxWorkHoursPerDay', 'number', { min: 1, max: 24, step: 0.5 })}
          {isEdit && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={set('status')}
                className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
              >
                {['active', 'idle', 'overdue', 'unassigned'].map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider px-6 min-h-[44px] rounded-md flex items-center gap-2 border-b-2 border-black/20 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4 stroke-[2.5]" />
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Equipment'}
        </button>
      </form>
    </div>
  );
}
