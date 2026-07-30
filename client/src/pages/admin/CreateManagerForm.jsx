import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function CreateManagerForm({ onManagerCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [availableSites, setAvailableSites] = useState([]);
  const [selectedSites, setSelectedSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const { data } = await api.get('/api/admin/sites');
      setAvailableSites(data || []);
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  const handleSiteToggle = (siteId) => {
    setSelectedSites((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        assignedSites: selectedSites,
      };
      await api.post('/api/admin/managers', payload);
      setSuccess(`Manager "${form.name}" created successfully!`);
      setForm({ name: '', email: '', password: '' });
      setSelectedSites([]);
      if (onManagerCreated) {
        onManagerCreated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
          +
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Create New Site Manager</h2>
          <p className="text-xs text-gray-500">Add a new manager account and assign site responsibilities</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 font-bold hover:text-emerald-700">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="manager@catrental.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Initial Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Assigned Construction Sites
          </label>
          {availableSites.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No sites available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableSites.map((site) => {
                const isSelected = selectedSites.includes(site._id);
                return (
                  <label
                    key={site._id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition select-none ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-medium'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSiteToggle(site._id)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300 mr-2.5"
                    />
                    <span className="text-sm">{site.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <span>Creating...</span>
            ) : (
              <>
                <span>Create Manager Account</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
