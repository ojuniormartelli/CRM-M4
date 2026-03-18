import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface UserMenuProps {
  user: User | null;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onNavigate, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button 
        onClick={() => onNavigate('settings')}
        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <ICONS.Settings size={20} />
      </button>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user.email.substring(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center bg-indigo-600 text-white font-bold text-xs"
      >
        {user.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-bottom border-slate-50 dark:border-slate-800/50 mb-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name || 'Usuário'}</p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">{user.email}</p>
            <div className="mt-2 inline-flex px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-tighter">
              {user.role}
            </div>
          </div>

          <button
            onClick={() => {
              onNavigate('settings');
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-colors">
              <ICONS.Settings size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-tight">Meu Perfil</span>
          </button>

          <div className="h-px bg-slate-50 dark:bg-slate-800/50 my-1 mx-4" />

          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left flex items-center gap-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
              <ICONS.LogOut size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-tight">Sair</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
