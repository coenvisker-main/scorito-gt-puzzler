import { useState } from 'react';
import { StageList } from './components/StageList';
import { TeamMatrix } from './components/TeamMatrix';
import { AdminDashboard } from './components/AdminDashboard';
import { giro2026 } from './data/giro2026';
import { TeamProvider } from './context/TeamContext';
import { LayoutDashboard, Users, Trophy, Database } from 'lucide-react';

type TabType = 'etappes' | 'teambuilder' | 'beheer';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('teambuilder');

  return (
    <TeamProvider>
      <div className="min-h-screen bg-neutral-950 pb-20 text-neutral-200 selection:bg-amber-500/30 selection:text-amber-200">
        {/* Header & Navigation */}
        <nav className="bg-neutral-900/60 backdrop-blur-xl border-b border-neutral-800/50 sticky top-0 z-[60] shadow-2xl shadow-black/20">
          <div className="max-w-full mx-auto px-4 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-6">
              <div className="flex items-center gap-4 group cursor-default">
                <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
                    <Trophy className="w-5 h-5 text-neutral-950" />
                </div>
                <div className="flex flex-col">
                   <h1 className="text-xl font-black text-white tracking-tight uppercase italic leading-none">
                    Scorito GT <span className="text-amber-500">Puzzler</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] leading-none">Giro d'Italia 2026</p>
                  </div>
                </div>
              </div>
              
              <div className="flex bg-neutral-800/50 p-1.5 rounded-2xl border border-neutral-700/50 backdrop-blur-md">
                <button
                  onClick={() => setActiveTab('etappes')}
                  className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${
                    activeTab === 'etappes'
                      ? 'bg-neutral-700 text-amber-400 shadow-xl border border-neutral-600'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  STAGES
                </button>
                <button
                  onClick={() => setActiveTab('teambuilder')}
                  className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${
                    activeTab === 'teambuilder'
                      ? 'bg-neutral-700 text-amber-400 shadow-xl border border-neutral-600'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  TEAMBUILDER
                </button>
                <button
                  onClick={() => setActiveTab('beheer')}
                  className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${
                    activeTab === 'beheer'
                      ? 'bg-neutral-700 text-amber-400 shadow-xl border border-neutral-600'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  BEHEER
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-full mx-auto px-4 sm:px-8 mt-10">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {activeTab === 'etappes' ? (
              <StageList ronde={giro2026} />
            ) : activeTab === 'teambuilder' ? (
              <TeamMatrix stages={giro2026.etappes} />
            ) : (
              <AdminDashboard />
            )}
          </div>
        </main>
      </div>
    </TeamProvider>
  );
}
