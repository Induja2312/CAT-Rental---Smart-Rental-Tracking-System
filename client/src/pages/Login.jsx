import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Zap, ShieldCheck, Clock } from 'lucide-react';

const ROLE_REDIRECT = { admin: '/manager', manager: '/manager', customer: '/customer', operator: '/operator' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const handleLoginClick = async (email, password) => {
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      login(data);
      setTimeout(() => {
        navigate(ROLE_REDIRECT[data.role] || '/manager');
      }, 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Server offline — cannot login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5] text-zinc-900 p-4 font-sans selection:bg-[#FFC500] selection:text-black">
      <div className="bg-white border border-zinc-200 p-8 rounded-md shadow-xl w-full max-w-md space-y-6">
        {/* Cat Header Brand Mark */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#FFC500] text-black font-black text-3xl px-4 py-1.5 rounded-sm tracking-tighter shadow-sm border border-black/10">
            <span>CAT</span>
            <span className="text-xs bg-black text-[#FFC500] px-2 py-1 font-mono uppercase font-bold tracking-widest">
              RENTALS
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight uppercase">
              CAT Rentals Portal
            </h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Role-Based Access Login
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-[#D92D20]/10 border border-[#D92D20]/40 text-[#D92D20] text-xs font-bold p-3.5 rounded-md text-center">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => handleLoginClick('admin@catrentals.com', 'admin123')}
            className="w-full bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs min-h-[48px] uppercase tracking-wider rounded-md transition shadow flex items-center justify-center gap-2 cursor-pointer border-b-2 border-black/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Login as Super Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoginClick('admin@catrentals.com', 'admin123')}
            className="w-full bg-zinc-900 hover:bg-black text-[#FFC500] font-bold text-xs min-h-[48px] uppercase tracking-wider rounded-md border border-zinc-800 transition shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-[#FFC500]" />
            <span>Login as Fleet Manager</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoginClick('customer@catrentals.com', 'customer123')}
            className="w-full bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs min-h-[48px] uppercase tracking-wider rounded-md border border-zinc-300 transition shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Login as Customer</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoginClick('operator1@catrentals.com', 'operator123')}
            className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs min-h-[48px] uppercase tracking-wider rounded-md border border-amber-300 transition shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-700" />
            <span>Login as Machine Operator</span>
          </button>
        </div>
      </div>
    </div>
  );
}
