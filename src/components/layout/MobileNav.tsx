import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Zap, 
  Bot, 
  Menu
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMoreMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onSelectTab, onOpenMoreMenu }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto">
        {/* 1. Home */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Tổng quan</span>
        </button>

        {/* 2. Students */}
        <button
          onClick={() => onSelectTab('students')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'students' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Học sinh</span>
        </button>

        {/* 3. Center Quick Action: Chấm điểm */}
        <button
          onClick={() => onSelectTab('grading')}
          className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border-2 border-white transition-all transform group-active:scale-95">
            <Zap className="w-6 h-6 fill-white text-white" />
          </div>
          <span className="text-[10px] font-bold text-indigo-700 mt-1">Chấm điểm</span>
        </button>

        {/* 4. AI Assistant */}
        <button
          onClick={() => onSelectTab('ai-assistant')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'ai-assistant' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Trợ lý AI</span>
        </button>

        {/* 5. Menu */}
        <button
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            ['rankings', 'history', 'reports', 'settings'].includes(activeTab) 
              ? 'text-indigo-600 font-bold' 
              : 'text-slate-500'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
};
