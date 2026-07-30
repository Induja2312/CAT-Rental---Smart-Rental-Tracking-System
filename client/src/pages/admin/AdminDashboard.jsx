import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EquipmentList from './EquipmentList';
import CreateEquipmentForm from './CreateEquipmentForm';
import { LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const { auth, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FFC500] rounded-md">
            <span className="font-black text-black text-sm font-mono">CAT</span>
          </div>
          <span className="font-bold text-zinc-900 uppercase tracking-wide text-sm">Admin Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-zinc-500 uppercase">{auth?.name}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-[#D92D20] transition uppercase"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="p-6">
        <Routes>
          <Route index element={<Navigate to="equipment" replace />} />
          <Route path="equipment" element={<EquipmentList />} />
          <Route path="equipment/new" element={<CreateEquipmentForm />} />
          <Route path="equipment/:id/edit" element={<CreateEquipmentForm />} />
        </Routes>
      </main>
    </div>
  );
}
