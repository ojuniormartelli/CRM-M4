
import React from 'react';
import { ICONS } from '../../constants';
import SupabaseStatus from '../SupabaseStatus';
import UserMenu from '../UserMenu';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: any;
  handleLogout: () => void;
  setActiveTab: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  currentUser,
  handleLogout,
  setActiveTab
}) => {
  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-xl w-[400px] border border-border/50">
        <ICONS.Search className="text-muted-foreground dark:text-slate-500 w-4 h-4" />
        <input 
          type="text" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          placeholder="Pesquisar em tudo..." 
          className="bg-transparent border-none outline-none text-xs w-full font-bold text-foreground" 
        />
      </div>
      <div className="flex items-center gap-6">
        <SupabaseStatus />
        <UserMenu 
          user={currentUser} 
          onNavigate={setActiveTab} 
          onLogout={handleLogout} 
        />
      </div>
    </header>
  );
};

export default Header;
