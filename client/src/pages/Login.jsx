import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Zap, ShieldCheck } from 'lucide-react';

const ROLE_REDIRECT = { admin: '/manager', manager: '/manager', customer: '/customer' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@catrental.com', password: 'admin123' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', form);
      login(data);
      setTimeout(() => {
        navigate(ROLE_REDIRECT[data.role] || '/manager');
      }, 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Server offline — click Quick Demo below');
    }
  };

  const handleQuickDemoLogin = (role = 'manager') => {
    const demoData = {
      token: 'mock_demo_jwt_token_for_hackathon',
      role: role,
      name: 'Fleet Operations Manager',
    };
    login(demoData);
    setTimeout(() => {
      navigate('/manager');
    }, 50);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5] text-zinc-900 p-4 font-sans selection:bg-[#FFC500] selection:text-black">
      <div className="bg-white border border-zinc-200 p-8 rounded-md shadow-xl w-full max-w-md space-y-6">
        {/* Cat Header Brand Mark */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#FFC500] text-black font-black text-3xl px-4 py-1.5 rounded-sm tracking-tighter shadow-sm border border-black/10">
            <span>CAT</span>
            <span className="text-xs bg-black text-[#FFC500] px-2 py-1 font-mono uppercase font-bold tracking-widest">
              TELEMATICS
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight uppercase">
              Fleet Tracking Portal
            </h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Caterpillar Enterprise Equipment Tracking & Allocation System
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-[#D92D20]/10 border border-[#D92D20]/40 text-[#D92D20] text-xs font-bold p-3.5 rounded-md text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Operator Email / Account ID
            </label>
            <input
              className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[48px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none font-mono"
              type="email"
              placeholder="operator@catrental.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Access Code / Password
            </label>
            <input
              className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-md px-4 min-h-[48px] focus:border-[#FFC500] focus:ring-2 focus:ring-[#FFC500]/30 focus:outline-none font-mono"
              type="password"
              placeholder="••••••••"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#FFC500] hover:bg-[#e6b000] text-black font-extrabold text-sm min-h-[48px] uppercase tracking-wider rounded-md transition shadow flex items-center justify-center gap-2 cursor-pointer border-b-2 border-black/20"
          >
            <span>Sign In to System</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative border-t border-zinc-200 pt-5 space-y-3">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
            Field Operations Quick Access
          </span>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('manager')}
            className="w-full bg-zinc-900 hover:bg-black text-[#FFC500] font-bold text-xs uppercase tracking-wider min-h-[48px] rounded-md border border-zinc-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Zap className="w-4 h-4 fill-[#FFC500]" />
            <span>Launch Fleet Manager Portal (Demo)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
