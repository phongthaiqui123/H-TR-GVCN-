import React, { useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ClassDataProvider, useClassData } from './hooks/useClassData';
import { ToastProvider } from './components/ui/Toast';
import { LoginPage } from './pages/LoginPage';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { BatchUndoToast } from './components/system/BatchUndoToast';
import { DashboardPage } from './pages/DashboardPage';
import { GradingPage } from './pages/GradingPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { RankingsPage } from './pages/RankingsPage';
import { HistoryAnalyticsPage } from './pages/HistoryAnalyticsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CadreReviewPage } from './pages/CadreReviewPage';
import { Modal } from './components/ui/Modal';
import { 
  BarChart3, 
  Bot, 
  FileText, 
  Settings, 
  School, 
  X, 
  ChevronRight,
  Sparkles,
  Loader2,
  Trophy
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, profile, loading: authLoading, roleSession, appRole } = useAuth();
  const { loading: classLoading, currentClass } = useClassData();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (authLoading || (user && classLoading && !currentClass)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 animate-pulse mb-4">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-800">GVCN SMART CLASS</h2>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
          Đang khởi tạo hệ thống quản lý lớp học...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSelectTab = (tab: NavTab) => {
    // Role protection
    if ((tab === 'settings' || tab === 'reports') && roleSession.category !== 'gvcn') {
      setActiveTab('dashboard');
      return;
    }
    if (tab === 'grading' && roleSession.category === 'thanh_vien') {
      setActiveTab('dashboard');
      return;
    }

    setSelectedStudentId(null);
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col">
      {/* Top Header */}
      <Header onNavigateTab={(tab) => handleSelectTab(tab as NavTab)} />

      {/* Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={handleSelectTab} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12 max-w-7xl mx-auto w-full">
          {selectedStudentId ? (
            <StudentDetailPage
              studentId={selectedStudentId}
              onBack={() => setSelectedStudentId(null)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardPage
                  onNavigate={handleSelectTab}
                  onSelectStudent={handleSelectStudent}
                />
              )}
              {activeTab === 'students' && (
                <StudentsPage onSelectStudent={handleSelectStudent} />
              )}
              {activeTab === 'grading' && <GradingPage />}
              {activeTab === 'cadre-review' && <CadreReviewPage />}
              {activeTab === 'rankings' && (
                <RankingsPage onSelectStudent={handleSelectStudent} />
              )}
              {activeTab === 'history' && (
                <HistoryAnalyticsPage onSelectStudent={handleSelectStudent} />
              )}
              {activeTab === 'ai-assistant' && <AiAssistantPage />}
              {activeTab === 'reports' && <ReportsPage />}
              {activeTab === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>

      {/* Floating Undo Toast for Quick Scoring and Batch Actions */}
      <BatchUndoToast />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Mobile "More" Drawer / Modal */}
      <Modal
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Danh mục mở rộng"
        maxWidth="sm"
      >
        <div className="space-y-1 py-1">
          <button
            onClick={() => handleSelectTab('cadre-review')}
            className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-sm font-semibold transition-colors ${
              activeTab === 'cadre-review' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Nhận xét Ban cán sự tuần</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">BCS</span>
          </button>

          <button
            onClick={() => handleSelectTab('rankings')}
            className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-sm font-semibold transition-colors ${
              activeTab === 'rankings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Bảng xếp hạng thi đua</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleSelectTab('history')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-semibold transition-colors ${
              activeTab === 'history' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Phân tích & Lịch sử</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleSelectTab('ai-assistant')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-semibold transition-colors ${
              activeTab === 'ai-assistant' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-violet-600" />
              <div className="flex items-center gap-1.5">
                <span>Trợ lý Sư phạm AI</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-violet-100 text-violet-700 font-bold">
                  PRO
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleSelectTab('reports')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-semibold transition-colors ${
              activeTab === 'reports' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Trung tâm Báo cáo & Phụ huynh</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-semibold transition-colors ${
              activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-600" />
              <span>Cài đặt lớp & 12 tiêu chí</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Đã xảy ra sự cố hiển thị lớp học">
      <AuthProvider>
        <ClassDataProvider>
          <ToastProvider>
            <MainAppContent />
          </ToastProvider>
        </ClassDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
