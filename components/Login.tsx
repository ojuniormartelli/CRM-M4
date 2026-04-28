
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { COMPLETE_INSTALL_SQL, SEED_SQL } from '../src/constants/sqlScripts';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mustChangePasswordUser, setMustChangePasswordUser] = useState<User | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const email = username === 'admin' ? 'admin@crm.com' : (username.includes('@') ? username : `${username}@crm.com`);

    try {
      // 1. Authenticate with Supabase Auth (Enables RLS)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Fallback for demo: if auth fails but user exists in m4_users with this password, 
        // we might be in a "non-migrated" state. But for RLS, we WANT auth.
        throw new Error('E-mail ou senha incorretos no Supabase Auth.');
      }

      if (authData?.user) {
        // 2. Fetch profile from m4_users
        const { data: profile, error: profileError } = await supabase
          .from('m4_users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile) {
          if (profile.status === 'inactive') {
            await supabase.auth.signOut();
            setError('Sua conta está inativa. Entre em contato com o administrador.');
            return;
          }

          if (profile.must_change_password) {
            setMustChangePasswordUser(profile);
          } else {
            localStorage.setItem('m4_crm_user_id', profile.id);
            if (profile.workspace_id) {
              localStorage.setItem('m4_crm_workspace_id', profile.workspace_id);
            }
            onLogin(profile);
          }
        } else {
          setError('Perfil de usuário não encontrado no banco de dados.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      try {
        // Extrair mensagem de erro amigável
        let msg = 'Erro ao realizar login.';
        if (err.message) {
          msg = err.message;
          if (msg.includes('Invalid login credentials')) msg = 'E-mail ou senha incorretos.';
          if (msg.includes('relation "public.m4_users" does not exist')) msg = 'Tabelas não encontradas. Por favor, execute o script de instalação.';
        } else if (typeof err === 'string') {
          msg = err;
        }
        setError(msg);
      } catch (innerErr) {
        setError('Erro ao processar erro de login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = () => {
    if (window.confirm('Deseja limpar as configurações de conexão (Supabase URL/Key)?')) {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_anon_key');
      window.location.reload();
    }
  };

  if (mustChangePasswordUser) {
    return (
      <ForcePasswordChange 
        user={mustChangePasswordUser} 
        onSuccess={(updatedUser) => {
          localStorage.setItem('m4_crm_user_id', updatedUser.id);
          if (updatedUser.workspace_id) {
            localStorage.setItem('m4_crm_workspace_id', updatedUser.workspace_id);
          }
          onLogin(updatedUser);
        }} 
      />
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-8 animate-zoom-in-95">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none">
            <ICONS.Users size={40} />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">M4 CRM</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acesso Restrito</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 group-focus-within:text-indigo-600 transition-colors">Usuário</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pl-12 transition-all" 
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <ICONS.User size={20} />
                </div>
              </div>
            </div>

            <div className="relative group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 group-focus-within:text-indigo-600 transition-colors">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 px-12 transition-all" 
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <ICONS.Lock size={20} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-310 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <ICONS.EyeOff size={20} /> : <ICONS.Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest text-center uppercase">
                {error}
              </div>
              
              {/* Botão de instalação sugerido quando há erro (tabelas não encontradas) */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(COMPLETE_INSTALL_SQL);
                  alert('DATABASE_COMPLETE_INSTALL.sql copiado! Cole no SQL Editor do Supabase.');
                }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-3"
              >
                <ICONS.Copy size={16} />
                Copiar DATABASE_COMPLETE_INSTALL.sql
              </button>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
          >
            {loading ? (
              <ICONS.RefreshCw className="animate-spin" size={18} />
            ) : (
              'ENTRAR NO SISTEMA'
            )}
          </button>
        </form>

        <div className="text-center space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
            M4 Marketing Digital – CRM & Agency Suite
          </p>
          
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest text-center">Acesso Padrão:</p>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1 text-center">admin / admin123</p>
          </div>

          <button
            onClick={handleResetConfig}
            className="text-[9px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
          >
            Refazer Configuração de Conexão
          </button>

          <InstallationAccordion />
        </div>
      </div>
    </div>
  );
};

const ForcePasswordChange: React.FC<{ user: User; onSuccess: (user: User) => void }> = ({ user, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update Supabase Auth password
      const { error: authUpdateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      if (authUpdateError) throw authUpdateError;

      // 2. Update local profile
      const { data, error: updateError } = await supabase
        .from('m4_users')
        .update({ 
          must_change_password: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      onSuccess(data);
    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err.message || 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 space-y-8 animate-zoom-in-95">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-amber-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-amber-100 dark:shadow-none">
            <ICONS.Lock size={32} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Primeiro Acesso</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Por segurança, defina sua senha definitiva</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPasswords.new ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPasswords.new ? <ICONS.EyeOff size={20} /> : <ICONS.Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Confirmar Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPasswords.confirm ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPasswords.confirm ? <ICONS.EyeOff size={20} /> : <ICONS.Eye size={20} />}
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
            {loading ? 'SALVANDO...' : 'SALVAR E CONTINUAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

const InstallationAccordion: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 py-3 text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-all"
      >
        <ICONS.Settings size={12} className={isOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
        {isOpen ? 'Fechar Instruções' : 'Primeira Instalação? Clique Aqui'}
      </button>

      {isOpen && (
        <div className="mt-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] text-left space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Passo a Passo:</h4>
            <ol className="text-[10px] font-bold text-slate-500 dark:text-slate-400 space-y-2">
              <li>1. Copie o script SQL abaixo</li>
              <li>2. Acesse seu projeto no Supabase</li>
              <li>3. Abra SQL Editor</li>
              <li>4. Cole e execute</li>
              <li>5. Volte aqui e entre com <span className="text-indigo-600">admin / admin123</span></li>
            </ol>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">1. Instalação do Banco (Essencial)</p>
              <pre className="text-[8px] bg-slate-900 text-slate-300 p-4 rounded-xl overflow-x-auto max-h-32 scrollbar-hide font-mono leading-relaxed">
                {COMPLETE_INSTALL_SQL}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(COMPLETE_INSTALL_SQL);
                  alert('Script de Instalação copiado!');
                }}
                className="absolute top-6 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
              >
                <ICONS.Copy size={10} />
              </button>
            </div>

            <div className="relative">
              <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">2. Dados de Teste (Opcional)</p>
              <pre className="text-[8px] bg-slate-900 text-slate-300 p-4 rounded-xl overflow-x-auto max-h-32 scrollbar-hide font-mono leading-relaxed">
                {SEED_SQL}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(SEED_SQL);
                  alert('Script de Dados de Teste copiado!');
                }}
                className="absolute top-6 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
              >
                <ICONS.Copy size={10} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
