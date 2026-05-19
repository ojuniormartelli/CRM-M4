
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
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 z-20">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setActiveTab('menu_toggle')} // We'll handle this in App.tsx or use a prop
          className="lg:hidden p-2 hover:bg-muted rounded-xl text-muted-foreground mr-1"
        >
          <ICONS.Menu className="w-6 h-6" />
        </button>
        
        <div className="hidden sm:flex items-center gap-4 bg-muted px-4 py-2 rounded-xl w-[300px] md:w-[400px] border border-border/50 transition-all focus-within:w-[350px] md:focus-within:w-[450px]">
          <ICONS.Search className="text-muted-foreground dark:text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Pesquisar..." 
            className="bg-transparent border-none outline-none text-xs w-full font-bold text-foreground" 
          />
        </div>

        {/* Small screen search icon */}
        <button className="sm:hidden p-2 hover:bg-muted rounded-xl text-muted-foreground">
          <ICONS.Search className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <div className="hidden xs:block">
          <SupabaseStatus />
        </div>
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
