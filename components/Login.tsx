import React, { useState } from 'react';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simple check against m4_users for "admin/admin" or other users
      const { data, error: fetchError } = await supabase
        .from('m4_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Store session locally for this session
        localStorage.setItem('m4_crm_user_id', data.id);
        onLogin(data);
      } else {
        setError('Usuário ou senha inválidos.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-100 dark:shadow-none">
            <ICONS.Sales size={32} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">M4 CRM</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acesso Restrito</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Usuário</label>
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin"
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            M4 Marketing Digital – CRM & Agency Suite
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
