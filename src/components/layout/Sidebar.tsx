import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Zap, 
  Trophy, 
  BarChart3, 
  Bot, 
  FileText, 
  Settings,
  Sparkles,
  Award,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { useAuth } from '../../hooks/useAuth';

export type NavTab = 
  | 'dashboard'
  | 'students'
  | 'grading'
  | 'cadre-review'
  | 'rankings'
  | 'history'
  | 'ai-assistant'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { currentClass, students } = useClassData();
  const { appRole, roleSession } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isTeamLeader = roleSession.category === 'to_truong';
  const isCadre = roleSession.category === 'cadre';
  const isStudent = roleSession.category === 'thanh_vien';

  const teamStudentsCount = isTeamLeader && roleSession.teamName 
    ? students.filter(s => s.teamName === roleSession.teamName).length
    : students.length;

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    highlight?: boolean;
  }> = isCadre
    ? [
        { id: 'dashboard', label: 'Tổng quan lớp', icon: LayoutDashboard },
        { id: 'cadre-review', label: 'Nhận xét tuần', icon: FileText, badge: 'BCS', highlight: true },
        { id: 'grading', label: 'Chấm thi đua', icon: Zap },
        { id: 'rankings', label: 'Bảng xếp hạng', icon: Trophy },
        { id: 'students', label: 'Danh sách học sinh', icon: Users, badge: `${students.length}` },
        { id: 'history', label: 'Lịch sử thi đua', icon: BarChart3 },
        { id: 'ai-assistant', label: 'Trợ lý AI', icon: Bot, badge: 'AI' },
      ]
    : isTeamLeader
    ? [
        { id: 'dashboard', label: 'Tổng quan tổ', icon: LayoutDashboard },
        { id: 'students', label: `Thành viên ${roleSession.teamName || 'tổ'}`, icon: Users, badge: `${teamStudentsCount}` },
        { id: 'grading', label: 'Chấm thi đua', icon: Zap, highlight: true },
        { id: 'cadre-review', label: 'Nhận xét tổ & BCS', icon: FileText, badge: 'Tổ' },
        { id: 'rankings', label: 'Xếp hạng', icon: Trophy },
        { id: 'history', label: 'Lịch sử tổ', icon: BarChart3 },
        { id: 'ai-assistant', label: 'Trợ lý AI tổ', icon: Bot, badge: 'AI' },
      ]
    : isStudent
    ? [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'cadre-review', label: 'Nhận xét tuần BCS', icon: FileText },
        { id: 'rankings', label: 'Xếp hạng', icon: Trophy },
        { id: 'students', label: 'Danh sách lớp', icon: Users, badge: `${students.length}` },
        { id: 'history', label: 'Lịch sử thi đua', icon: BarChart3 },
      ]
    : [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'students', label: 'Học sinh', icon: Users, badge: `${students.length}` },
        { id: 'grading', label: 'Chấm thi đua', icon: Zap, highlight: true },
        { id: 'cadre-review', label: 'Nhận xét Ban cán sự', icon: FileText, badge: 'MỚI' },
        { id: 'rankings', label: 'Xếp hạng', icon: Trophy },
        { id: 'history', label: 'Phân tích', icon: BarChart3 },
        { id: 'ai-assistant', label: 'Trợ lý AI', icon: Bot, badge: 'AI' },
        { id: 'reports', label: 'Báo cáo & Phụ huynh', icon: FileText, badge: 'PRO' },
        { id: 'settings', label: 'Cài đặt', icon: Settings },
      ];

  return (
    <aside 
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between p-3 shrink-0 select-none transition-all duration-200`}
    >
      <div>
        {/* Logo Section */}
        <div className="flex items-center justify-between px-2 py-3 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-100">
              <GraduationCap className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="font-black text-sm tracking-tight text-slate-900 leading-none">
                  GVCN
                </div>
                <div className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase mt-0.5">
                  SMART CLASS
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-0 py-3' : 'justify-between px-3.5 py-2.5'
                } rounded-2xl font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : item.highlight
                    ? 'text-amber-800 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-amber-600' : 'text-slate-500'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.id === 'ai-assistant'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info box */}
      {!collapsed ? (
        <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
          <div className="flex items-center gap-2 mb-1 text-slate-800 font-bold">
            {isTeamLeader ? (
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            ) : isStudent ? (
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>
              {isTeamLeader 
                ? `CHẾ ĐỘ TỔ TRƯỞNG` 
                : isStudent 
                ? 'CHẾ ĐỘ THÀNH VIÊN' 
                : 'TOÀN QUYỀN GVCN'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {isTeamLeader 
              ? `${roleSession.teamName} • ${currentClass?.className || ''}`
              : isStudent 
              ? `Xem thi đua cá nhân & tổ`
              : `${currentClass?.className || ''} • Chuẩn ${currentClass?.startingScore || 100}đ`}
          </p>
        </div>
      ) : (
        <div className="flex justify-center p-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs" title="12 Tiêu chí">
            ⭐
          </div>
        </div>
      )}
    </aside>
  );
};
