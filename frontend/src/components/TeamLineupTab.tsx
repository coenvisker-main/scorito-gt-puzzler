import { useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { Etappe } from '../types';
import { Crown, Mountain, Zap, Timer, Clock } from 'lucide-react';

interface TeamLineupTabProps {
  stages: Etappe[];
}

const TERRAIN_ICONS: Record<string, React.ReactNode> = {
  'Berg':      <Mountain className="w-3 h-3" />,
  'Sprint':    <Zap className="w-3 h-3" />,
  'Tijdrit':   <Timer className="w-3 h-3" />,
  'Klimrit':   <Mountain className="w-3 h-3" />,
};

export function TeamLineupTab({ stages }: TeamLineupTabProps) {
  const { slots, toggleLineup } = useTeam();

  const today = new Date().toISOString().split('T')[0];

  const currentStageIndex = useMemo(() => {
    const idx = stages.findIndex(s => s.datum >= today);
    return idx === -1 ? stages.length - 1 : idx;
  }, [stages, today]);

  const currentStage = stages[currentStageIndex];

  return (
    <div className="flex flex-col gap-4">

      {/* Current stage banner */}
      {currentStage && (
        <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex-shrink-0 w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center text-neutral-950 font-black text-lg leading-none">
            {currentStage.nummer}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Huidige etappe</div>
            <div className="text-sm font-bold text-white truncate">
              {currentStage.startplaats} → {currentStage.finishplaats}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {currentStage.datum} · {currentStage.terreintype} · {currentStage.afstand} km
            </div>
          </div>
          <div className="flex-shrink-0 text-amber-500/40">
            {TERRAIN_ICONS[currentStage.terreintype] ?? <Clock className="w-3 h-3" />}
          </div>
        </div>
      )}

      {/* ── MOBILE (< lg) ────────────────────────────────────────────────────── */}
      <div className="block lg:hidden flex flex-col gap-2">
        {slots.map(slot => {
          const hasRider = !!slot.name;
          const stageCount = Object.values(slot.lineup).filter(s => s === 'X' || s === 'K').length;

          return (
            <div key={slot.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              {/* Rider header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-800/60">
                <span className={`text-sm font-bold flex-1 truncate ${hasRider ? 'text-white' : 'text-neutral-700 italic'}`}>
                  {hasRider ? slot.name : 'Lege plek'}
                </span>
                {hasRider && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    stageCount > 0
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-neutral-600 bg-neutral-800 border-neutral-700'
                  }`}>
                    {stageCount} {stageCount === 1 ? 'rit' : 'ritten'}
                  </span>
                )}
              </div>

              {/* Stage strip */}
              {hasRider ? (
                <div className="flex gap-1 overflow-x-auto px-2 py-2 custom-scrollbar">
                  {stages.map((s, idx) => {
                    const status = slot.lineup[s.nummer] || '';
                    const isCurrent = idx === currentStageIndex;
                    let cellClass = 'bg-neutral-800/60 border-neutral-700/50 text-neutral-600';
                    if (status === 'X') cellClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                    if (status === 'K') cellClass = 'bg-amber-400 text-neutral-950 border-amber-400';

                    return (
                      <button
                        key={s.nummer}
                        onClick={() => toggleLineup(slot.id, s.nummer)}
                        title={`Et. ${s.nummer} — ${s.startplaats} → ${s.finishplaats}`}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-10 h-12 rounded-lg border font-black transition-all active:scale-95 ${cellClass} ${
                          isCurrent ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-neutral-900' : ''
                        }`}
                      >
                        <span className="text-[8px] opacity-50 leading-none">{s.nummer}</span>
                        <div className="mt-1 leading-none">
                          {status === 'K'
                            ? <Crown className="w-3.5 h-3.5 fill-current" />
                            : <span className="text-[13px]">{status || '–'}</span>
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 text-[11px] text-neutral-700 italic">
                  Voeg een renner toe via het Team-tabblad
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE (lg+) ──────────────────────────────────────────────── */}
      <div className="hidden lg:block bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-neutral-950 border-b border-neutral-800">
              <tr>
                <th className="p-2 w-52 sticky left-0 z-30 bg-neutral-950 border-r border-neutral-800 text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                  Renner
                </th>
                {stages.map((s, idx) => {
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <th
                      key={s.nummer}
                      title={`Et. ${s.nummer} — ${s.startplaats} → ${s.finishplaats} (${s.terreintype})`}
                      className={`p-0 w-8 text-center text-[9px] font-black uppercase transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'text-neutral-600 hover:text-neutral-400'
                      }`}
                    >
                      <div className="py-1.5">{s.nummer}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/30">
              {slots.map(slot => {
                const hasRider = !!slot.name;
                return (
                  <tr key={slot.id} className="group/row hover:bg-neutral-800/30 transition-all">
                    <td className="p-2 w-52 sticky left-0 z-10 bg-neutral-900 group-hover/row:bg-neutral-800/50 border-r border-neutral-800 transition-colors">
                      <span className={`text-xs font-bold ${hasRider ? 'text-white' : 'text-neutral-700 italic'}`}>
                        {hasRider ? slot.name : '—'}
                      </span>
                    </td>
                    {stages.map((s, idx) => {
                      const status = slot.lineup[s.nummer] || '';
                      const isCurrent = idx === currentStageIndex;

                      let innerClass = 'text-neutral-700';
                      let content: React.ReactNode = <span className="text-[9px]">–</span>;

                      if (status === 'X') {
                        innerClass = 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30';
                        content = <span className="text-[10px] font-black">X</span>;
                      } else if (status === 'K') {
                        innerClass = 'bg-amber-400 text-neutral-950 hover:bg-amber-300';
                        content = <Crown className="w-2.5 h-2.5 fill-current" />;
                      } else if (hasRider) {
                        innerClass = 'hover:bg-neutral-700/50 text-neutral-600';
                      }

                      return (
                        <td
                          key={s.nummer}
                          className={`p-0 ${isCurrent ? 'bg-amber-500/5' : ''}`}
                          onClick={hasRider ? () => toggleLineup(slot.id, s.nummer) : undefined}
                        >
                          <div className={`flex items-center justify-center h-7 rounded transition-all ${hasRider ? `cursor-pointer ${innerClass}` : ''}`}>
                            {hasRider && content}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
