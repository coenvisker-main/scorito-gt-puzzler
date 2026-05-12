import { useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { useStageScores } from '../hooks/useStageScores';
import { Etappe } from '../types';
import { Loader2, Mountain, Zap, Timer } from 'lucide-react';

interface TeamScoresTabProps {
  stages: Etappe[];
}

const TERRAIN_ICONS: Record<string, React.ReactNode> = {
  'Berg':    <Mountain className="w-3 h-3" />,
  'Sprint':  <Zap className="w-3 h-3" />,
  'Tijdrit': <Timer className="w-3 h-3" />,
  'Klimrit': <Mountain className="w-3 h-3" />,
};

type ScoreEntry = { punten_etappe: number; punten_gc: number; punten_punten: number; punten_kom: number; punten_jong: number; punten_team: number; punten_kopman_bonus: number; totaal: number; opgesteld: boolean };

// Sum of individual components — totaal is zeroed for non-deployed riders by the backend
function rawScore(s: ScoreEntry): number {
  return s.punten_etappe + s.punten_gc + s.punten_punten + s.punten_kom + s.punten_jong + s.punten_team + s.punten_kopman_bonus;
}

function makeTooltip(stageNum: number, s: ScoreEntry | undefined): string {
  if (!s) return '';
  const raw = rawScore(s);
  return [
    `Et. ${stageNum}${!s.opgesteld && raw > 0 ? ' (niet opgesteld)' : ''}`,
    `──────────────`,
    `Etappe:      ${s.punten_etappe}`,
    `GC:          ${s.punten_gc}`,
    `Punten:      ${s.punten_punten}`,
    `KOM:         ${s.punten_kom}`,
    `Jong:        ${s.punten_jong}`,
    `Team:        ${s.punten_team}`,
    `Kopman:      ${s.punten_kopman_bonus}`,
    `──────────────`,
    `${s.opgesteld ? 'Totaal' : 'Gemist'}:      ${raw}`,
  ].join('\n');
}

export function TeamScoresTab({ stages }: TeamScoresTabProps) {
  const { slots } = useTeam();
  const { scores, availableStages, isLoading, error } = useStageScores(slots);

  const riderTotals = useMemo(() => {
    if (!scores) return {} as Record<string, number>;
    const totals: Record<string, number> = {};
    for (const slotId of Object.keys(scores.perSlot)) {
      totals[slotId] = Object.values(scores.perSlot[slotId])
        .reduce((sum, s) => sum + s.totaal, 0);
    }
    return totals;
  }, [scores]);

  const grandTotal = useMemo(
    () => Object.values(riderTotals).reduce((sum, v) => sum + v, 0),
    [riderTotals],
  );

  const filledSlots = useMemo(() => slots.filter(s => s.name.trim() !== ''), [slots]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-bold uppercase tracking-wider">Scores laden…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-6 text-sm text-red-400">
        Fout bij laden scores: {error}
      </div>
    );
  }

  if (availableStages.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-sm font-black uppercase tracking-widest text-neutral-600">
          Nog geen scores beschikbaar
        </div>
        <div className="text-xs text-neutral-700 mt-1">Scores verschijnen na elke etappe</div>
      </div>
    );
  }

  const maxPossible = scores
    ? Object.values(scores.perStage).reduce((s, v) => s + v.score_max_mogelijk, 0)
    : 0;

  const teamPct = maxPossible > 0 ? Math.round((grandTotal / maxPossible) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <div>
          <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Team totaal</div>
          <div className="text-3xl font-black italic text-emerald-400 leading-none">{grandTotal}</div>
        </div>
        <div>
          <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Max mogelijk</div>
          <div className="text-3xl font-black italic text-amber-400 leading-none">{maxPossible}</div>
        </div>
        <div>
          <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Rendement</div>
          <div className={`text-3xl font-black italic leading-none ${teamPct >= 70 ? 'text-emerald-400' : teamPct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {teamPct}%
          </div>
        </div>
      </div>

      {/* ── MOBILE: stage-first cards ────────────────────────────────────────── */}
      <div className="block lg:hidden flex flex-col gap-2">
        {availableStages.map(stageNum => {
          const stageInfo = stages.find(s => s.nummer === stageNum);
          const stageTotal = scores?.perStage[stageNum]?.score_opgesteld ?? 0;
          const stageMax = scores?.perStage[stageNum]?.score_max_mogelijk ?? 0;
          const stagePct = stageMax > 0 ? Math.round((stageTotal / stageMax) * 100) : 0;

          const stageRiders = filledSlots
            .filter(slot => {
              const s = scores?.perSlot[slot.id]?.[stageNum];
              if (!s) return false;
              return s.opgesteld || (!s.opgesteld && rawScore(s) > 0);
            })
            .sort((a, b) => {
              const aS = scores?.perSlot[a.id]?.[stageNum];
              const bS = scores?.perSlot[b.id]?.[stageNum];
              const aDeployed = aS?.opgesteld ?? false;
              const bDeployed = bS?.opgesteld ?? false;
              if (aDeployed !== bDeployed) return bDeployed ? 1 : -1;
              const aScore = aS ? rawScore(aS) : 0;
              const bScore = bS ? rawScore(bS) : 0;
              return bScore - aScore;
            });

          return (
            <div key={stageNum} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              {/* Stage header */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-neutral-800/60 bg-neutral-800/30">
                <div className="flex-shrink-0 w-7 h-7 bg-neutral-700 rounded-lg flex items-center justify-center text-xs font-black text-amber-400">
                  {stageNum}
                </div>
                <div className="flex-1 min-w-0">
                  {stageInfo ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white truncate">
                        {stageInfo.startplaats} → {stageInfo.finishplaats}
                      </span>
                      <span className="flex-shrink-0 text-neutral-600">
                        {TERRAIN_ICONS[stageInfo.terreintype] ?? null}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-neutral-500">Etappe {stageNum}</span>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`text-sm font-black italic ${stageTotal > 0 ? 'text-emerald-400' : 'text-neutral-600'}`}>
                    {stageTotal}
                  </span>
                  <span className="text-[10px] text-neutral-600">/{stageMax}</span>
                  {stageMax > 0 && (
                    <span className={`block text-[9px] font-black ${stagePct >= 70 ? 'text-emerald-600' : stagePct >= 40 ? 'text-amber-700' : 'text-neutral-600'}`}>
                      {stagePct}%
                    </span>
                  )}
                </div>
              </div>

              {/* Rider list */}
              <div className="divide-y divide-neutral-800/30">
                {stageRiders.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-neutral-700 italic">Geen renners opgesteld</div>
                ) : (
                  stageRiders.map(slot => {
                    const s = scores?.perSlot[slot.id]?.[stageNum];
                    const pts = s ? rawScore(s) : 0;
                    const deployed = s?.opgesteld ?? false;
                    return (
                      <div key={slot.id} className={`flex items-center px-3 py-2 gap-2 ${deployed ? '' : 'opacity-70'}`}>
                        <span className="text-xs font-bold text-white flex-1 truncate">{slot.name}</span>
                        {!deployed && (
                          <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider">niet opgesteld</span>
                        )}
                        <span className={`text-sm font-black italic ${deployed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {pts}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE ────────────────────────────────────────────────────── */}
      <div className="hidden lg:block bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-neutral-950">
              {/* Stage number header */}
              <tr className="border-b border-neutral-800">
                <th className="p-2 w-52 sticky left-0 z-30 bg-neutral-950 border-r border-neutral-800 text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                  Renner
                </th>
                {availableStages.map(stageNum => (
                  <th key={stageNum} className="p-0 w-9 text-center text-[9px] font-black text-neutral-600">
                    <div className="py-2">{stageNum}</div>
                  </th>
                ))}
                <th className="p-2 w-16 text-right text-[9px] font-black text-emerald-600 uppercase tracking-wider sticky right-0 z-30 bg-neutral-950 border-l border-neutral-800">
                  Totaal
                </th>
              </tr>

              {/* Team totals row */}
              <tr className="border-b border-neutral-800/50 bg-neutral-950/80">
                <td className="px-2 py-1 sticky left-0 z-30 bg-neutral-950/80 border-r border-neutral-800 text-[9px] text-neutral-600 font-black uppercase tracking-wider">
                  Team
                </td>
                {availableStages.map(stageNum => {
                  const pts = scores?.perStage[stageNum]?.score_opgesteld ?? 0;
                  return (
                    <td key={stageNum} className="p-0 text-center">
                      <div className={`text-[9px] font-black py-1 ${pts > 0 ? 'text-emerald-500' : 'text-neutral-700'}`}>
                        {pts > 0 ? pts : ''}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right sticky right-0 z-30 bg-neutral-950/80 border-l border-neutral-800">
                  <span className="text-xs font-black italic text-emerald-400">{grandTotal}</span>
                </td>
              </tr>

              {/* Max mogelijk row */}
              <tr className="border-b border-neutral-800/30 bg-neutral-950/60">
                <td className="px-2 py-1 sticky left-0 z-30 bg-neutral-950/60 border-r border-neutral-800 text-[9px] text-neutral-600 font-black uppercase tracking-wider">
                  Max
                </td>
                {availableStages.map(stageNum => {
                  const max = scores?.perStage[stageNum]?.score_max_mogelijk ?? 0;
                  return (
                    <td key={stageNum} className="p-0 text-center">
                      <div className={`text-[9px] font-black py-1 ${max > 0 ? 'text-amber-600' : 'text-neutral-700'}`}>
                        {max > 0 ? max : ''}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right sticky right-0 z-30 bg-neutral-950/60 border-l border-neutral-800">
                  <span className="text-xs font-black italic text-amber-600">{maxPossible}</span>
                </td>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-800/20">
              {slots.map(slot => {
                if (!slot.name) return null;
                const total = riderTotals[slot.id] ?? 0;
                return (
                  <tr key={slot.id} className="group/row hover:bg-neutral-800/20 transition-all">
                    <td className="p-2 w-52 sticky left-0 z-10 bg-neutral-900 group-hover/row:bg-neutral-800/40 border-r border-neutral-800 transition-colors">
                      <span className="text-xs font-bold text-white">{slot.name}</span>
                    </td>
                    {availableStages.map(stageNum => {
                      const s = scores?.perSlot[slot.id]?.[stageNum];
                      const pts = s?.totaal ?? 0;
                      const deployed = s?.opgesteld ?? false;
                      const missed = s ? rawScore(s) : 0;

                      let bgColor: string;
                      let textColor: string;
                      let displayVal: string;

                      if (deployed) {
                        bgColor = 'rgba(52,211,153,0.15)';
                        textColor = '#6ee7b7';
                        displayVal = String(pts);
                      } else if (missed > 0) {
                        // Not deployed but scored real-race points: amber missed-opportunity indicator
                        bgColor = 'rgba(251,191,36,0.12)';
                        textColor = '#d97706';
                        displayVal = String(missed);
                      } else {
                        bgColor = 'transparent';
                        textColor = '#1f2937';
                        displayVal = '';
                      }

                      return (
                        <td
                          key={stageNum}
                          className="p-0.5 text-center"
                          title={s && (deployed || missed > 0) ? makeTooltip(stageNum, s) : undefined}
                        >
                          <div
                            className="flex items-center justify-center h-8 rounded mx-0.5 text-[10px] font-black transition-all"
                            style={{ backgroundColor: bgColor, color: textColor }}
                          >
                            {displayVal}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-right sticky right-0 z-10 bg-neutral-900 group-hover/row:bg-neutral-800/40 border-l border-neutral-800 transition-colors">
                      <span className={`text-sm font-black italic ${total > 0 ? 'text-emerald-400' : 'text-neutral-700'}`}>
                        {total > 0 ? total : '—'}
                      </span>
                    </td>
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
