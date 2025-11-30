import React from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: UserRole | undefined;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, userRole, onLogout }) => {
  
  const navItems = [
    { id: 'session', label: 'Sessão', icon: '🎲' },
    { id: 'characters', label: 'Personagens', icon: '👥' },
    ...(userRole === UserRole.GM ? [{ id: 'gm-tools', label: 'Mestre', icon: '🔮' }] : []),
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ];

  return (
    <div className="flex h-screen w-full bg-ordo-900 overflow-hidden">
      
      {/* Desktop Sidebar (Visible on md and up) */}
      <aside className="hidden md:flex flex-col w-64 bg-ordo-800 border-r border-ordo-700 p-4">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-8 h-8 bg-ordo-500 rounded-full flex items-center justify-center">O</div>
          <h1 className="text-xl font-bold text-white tracking-wider">ORDO</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-ordo-500 text-white' 
                  : 'text-gray-400 hover:bg-ordo-700 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <button 
          onClick={onLogout}
          className="mt-auto px-4 py-2 text-sm text-gray-500 hover:text-red-400 text-left transition-colors"
        >
          Sair do Sistema
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24 md:pb-4">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (Visible on small screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ordo-800 border-t border-ordo-700 pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                activeTab === item.id ? 'text-ordo-400' : 'text-gray-500'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};