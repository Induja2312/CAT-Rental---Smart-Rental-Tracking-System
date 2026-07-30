import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function ManagerList({ refreshKey, onManagerUpdated }) {
  const [managers, setManagers] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing state
  const [editingManager, setEditingManager] = useState(null);
  const [editSites, setEditSites] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // Deleting state
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [mgrRes, sitesRes] = await Promise.all([
        api.get('/api/admin/managers'),
        api.get('/api/admin/sites'),
      ]);
      setManagers(mgrRes.data || []);
      setAllSites(sitesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load managers list');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (manager) => {
    setEditingManager(manager);
    const siteIds = (manager.assignedSites || []).map((s) => (typeof s === 'string' ? s : s._id));
    setEditSites(siteIds);
  };

  const handleToggleEditSite = (siteId) => {
    setEditSites((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingManager) return;
    setEditLoading(true);
    try {
      await api.put(`/api/admin/managers/${editingManager._id}`, {
        assignedSites: editSites,
      });
      setEditingManager(null);
      fetchData();
      if (onManagerUpdated) onManagerUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update manager assigned sites');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this site manager account?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/managers/${id}`);
      fetchData();
      if (onManagerUpdated) onManagerUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete manager');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-2"></div>
        <p className="text-sm font-medium">Loading Managers & Equipment...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Site Managers Registry</h2>
          <p className="text-xs text-gray-500">Overview of managers, assigned sites, and site equipment</p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md font-medium transition"
        >
          Refresh List
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {managers.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-500 font-medium">No site managers found.</p>
          <p className="text-xs text-gray-400 mt-1">Use the form above to add a new manager.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 uppercase text-[11px] tracking-wider font-semibold">
                <th className="py-3 px-4">Manager Name & Email</th>
                <th className="py-3 px-4">Assigned Sites</th>
                <th className="py-3 px-4">Site Equipment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {managers.map((manager) => {
                const isDeleting = deletingId === manager._id;
                return (
                  <tr key={manager._id} className="hover:bg-gray-50/50 transition">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900">{manager.name}</div>
                      <div className="text-xs text-gray-500">{manager.email}</div>
                    </td>

                    <td className="py-4 px-4">
                      {manager.assignedSites && manager.assignedSites.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {manager.assignedSites.map((site) => (
                            <span
                              key={site._id || site}
                              className="px-2.5 py-1 bg-amber-100 text-amber-800 font-medium text-xs rounded-full border border-amber-200"
                            >
                              {site.name || 'Site'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No assigned sites</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {manager.equipment && manager.equipment.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {manager.equipment.map((eq) => (
                            <span
                              key={eq._id || eq.equipmentId}
                              className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded font-mono border border-slate-200"
                            >
                              <span className="font-semibold mr-1">{eq.equipmentId}</span>
                              <span className="text-[10px] text-slate-500">({eq.type})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No active equipment</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(manager)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md transition"
                      >
                        Edit Sites
                      </button>
                      <button
                        onClick={() => handleDelete(manager._id)}
                        disabled={isDeleting}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-md transition disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Sites Modal */}
      {editingManager && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Edit Assigned Sites for {editingManager.name}
            </h3>
            <p className="text-xs text-gray-500">
              Select or deselect construction sites assigned to this manager.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {allSites.map((site) => {
                const isSelected = editSites.includes(site._id);
                return (
                  <label
                    key={site._id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-900 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleEditSite(site._id)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300 mr-3"
                    />
                    <span className="text-sm">{site.name}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setEditingManager(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Site Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
