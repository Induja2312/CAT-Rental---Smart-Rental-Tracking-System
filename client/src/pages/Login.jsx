import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Zap, ShieldCheck, Clock, Mail, Lock } from 'lucide-react';

const ROLE_REDIRECT = { admin: '/admin', manager: '/manager', customer: '/customer', operator: '/operator' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [emailInput, setEmailInput] = useState('indujaee@gmail.com');
  const [passwordInput, setPasswordInput] = useState('customer123');

  const handleLoginClick = async (email, password) => {
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      login(data);
      setTimeout(() => {
        navigate(ROLE_REDIRECT[data.role] || '/customer');
      }, 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Server offline — cannot login');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleLoginClick(emailInput, passwordInput);
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
              Customer & Fleet Management Portal Login
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-[#D92D20]/10 border border-[#D92D20]/40 text-[#D92D20] text-xs font-bold p-3.5 rounded-md text-center">
            {error}
          </div>
        )}

        {/* Manual Login Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="indujaee@gmail.com"
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded text-sm focus:outline-none focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-xs min-h-[48px] uppercase tracking-wider rounded-md transition shadow flex items-center justify-center gap-2 cursor-pointer border-b-2 border-black/20"
          >
            <span>SIGN IN TO PORTAL</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono font-bold text-zinc-400 uppercase">
            OR QUICK DEMO LOGIN
          </span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        {/* Quick Role Shortcuts */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleLoginClick('indujaee@gmail.com', 'customer123')}
            className="bg-zinc-900 hover:bg-black text-[#FFC500] font-bold text-xs min-h-[44px] uppercase tracking-wider rounded transition shadow flex items-center justify-center gap-1.5 cursor-pointer col-span-2 border border-zinc-800"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Login as Customer</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoginClick('admin@catrentals.com', 'admin123')}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[11px] min-h-[42px] uppercase tracking-wider rounded border border-zinc-300 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoginClick('manager@catrentals.com', 'manager123')}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[11px] min-h-[42px] uppercase tracking-wider rounded border border-zinc-300 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Fleet Manager</span>
          </button>
        </div>
      </div>
    </div>
  );
}
