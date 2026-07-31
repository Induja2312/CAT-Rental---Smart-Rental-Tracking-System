import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Pencil, Trash2, ShieldCheck, User, Building, Lock, Mail } from 'lucide-react';

const ROLE_BADGE = {
  admin:    'bg-[#FFC500]/20 text-zinc-900 border border-[#FFC500]',
  manager:  'bg-blue-50 text-blue-700 border border-blue-200',
  customer: 'bg-purple-50 text-purple-700 border border-purple-200',
  operator: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'customer',
  assignedSites: [],
};

export default function UserList() {
  const [users, setUsers]           = useState([]);
  const [sites, setSites]           = useState([]);
  const [filter, setFilter]         = useState('all'); // 'all' | 'manager' | 'customer'
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsersAndSites = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/sites'),
      ]);
      setUsers(uRes.data);
      setSites(sRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsersAndSites(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditId(u._id);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '', // leave empty to keep unchanged
      role: u.role || 'customer',
      assignedSites: u.assignedSites?.map((s) => s._id || s) || [],
    });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setError('');
  };

  const toggleSiteAssignment = (siteId) => {
    setForm((prev) => {
      const current = prev.assignedSites || [];
      const updated = current.includes(siteId)
        ? current.filter((id) => id !== siteId)
        : [...current, siteId];
      return { ...prev, assignedSites: updated };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await api.put(`/api/admin/users/${editId}`, form);
      } else {
        await api.post('/api/admin/users', form);
      }
      closeForm();
      fetchUsersAndSites();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user account "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filter === 'all') return true;
    return u.role === filter;
  });

  return (
    <div className="space-y-4">
      {/* Inline Create/Edit Form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4 text-[#FFC500]" />
              {editId ? 'Edit User Account' : 'Create New User Account'}
            </h3>
            <button onClick={closeForm} className="text-zinc-400 hover:text-zinc-700 text-xs font-mono">✕ Cancel</button>
          </div>

          {error && <p className="text-xs text-[#D92D20] font-bold">{error}</p>}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Fleet Lead"
                  className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-3.5 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@catrentals.com"
                  className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-3.5 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Password {editId && <span className="text-[10px] text-zinc-400 font-normal">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  required={!editId}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-3.5 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">System Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm font-bold rounded-md px-3.5 min-h-[44px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none cursor-pointer"
                >
                  <option value="customer">Customer</option>
                  <option value="manager">Fleet Manager</option>
                </select>
              </div>
            </div>

            {/* Site Checklist for Manager Role */}
            {form.role === 'manager' && (
              <div className="border border-zinc-200 rounded-md p-3.5 bg-zinc-50 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#FFC500]" />
                  Assigned Construction Sites (Manager Site Scope)
                </label>
                <p className="text-[11px] text-zinc-500 font-mono">Select site locations this fleet manager will oversee:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto">
                  {sites.map((site) => {
                    const isChecked = form.assignedSites?.includes(site._id);
                    return (
                      <label key={site._id} className="flex items-center gap-2 p-2 bg-white border border-zinc-200 rounded text-xs cursor-pointer hover:bg-zinc-100">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSiteAssignment(site._id)}
                          className="w-4 h-4 text-[#FFC500] rounded focus:ring-[#FFC500] cursor-pointer"
                        />
                        <span className="font-bold text-zinc-800">{site.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider px-6 min-h-[44px] rounded-md flex items-center gap-2 border-b-2 border-black/20 transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : editId ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-wider px-4 min-h-[44px] rounded-md transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Registry Card */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">User Account Registry</h3>
            <p className="text-xs text-zinc-500 font-medium">Manage enterprise accounts, roles, and site permissions</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs uppercase tracking-wider px-5 min-h-[44px] rounded-md flex items-center gap-2 border-b-2 border-black/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Create User
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all',      label: `All Users (${users.length})` },
            { key: 'manager',  label: `Fleet Managers (${users.filter((u) => u.role === 'manager').length})` },
            { key: 'customer', label: `Customers (${users.filter((u) => u.role === 'customer').length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 min-h-[36px] rounded-md text-xs font-bold uppercase tracking-wide transition cursor-pointer ${
                filter === t.key
                  ? 'bg-[#FFC500] text-black border-b-2 border-black/20 font-extrabold'
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
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Assigned Site Scope</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-500 font-sans text-xs">Loading accounts...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-500 font-sans text-xs">No users found for this filter.</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-zinc-50 transition">
                  <td className="py-3.5 px-4 font-bold text-zinc-900">{u.name}</td>
                  <td className="py-3.5 px-4 text-zinc-600">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${ROLE_BADGE[u.role] || ROLE_BADGE.customer}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-700 text-[11px]">
                    {u.role === 'manager' ? (
                      u.assignedSites && u.assignedSites.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.assignedSites.map((s) => (
                            <span key={s._id || s} className="bg-zinc-100 border border-zinc-300 text-zinc-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {s.name || 'Site'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">No sites assigned</span>
                      )
                    ) : (
                      <span className="text-zinc-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-2 rounded hover:bg-zinc-100 text-zinc-600 transition cursor-pointer"
                        title="Edit User"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        disabled={deletingId === u._id}
                        className="p-2 rounded hover:bg-[#FEF2F2] text-[#D92D20] transition disabled:opacity-50 cursor-pointer"
                        title="Delete User"
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
