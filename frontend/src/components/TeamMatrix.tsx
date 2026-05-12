import { useMemo, useState, useCallback } from 'react';
import { useTeam } from '../context/TeamContext';
import { useCommunity } from '../context/CommunityContext';
import { Etappe, RennerType, RENNER_TYPES, TEAM_SIZE } from '../types';
import { formatMoney } from '../utils/formatUtils';
import { Autocomplete } from './Autocomplete';
import { StartlistModal } from './StartlistModal';
import { MobileTeamView } from './MobileTeamView';
import { DistributionSummary } from './DistributionSummary';
import { riders as allRiders } from '../data/riders';
import { useStageScores } from '../hooks/useStageScores';
import { calcRiderTotal, calcBaseTotal } from '../utils/scoreUtils';
import {
  Trash2,
  Crown,
  Euro,
  Trophy,
  ArrowUpDown,
  Link2,
  ListPlus,
  CheckCircle2,
  XCircle,
  Send,
  RefreshCw,
  BarChart2
} from 'lucide-react';


interface TeamMatrixProps {
  stages: Etappe[];
}

// Colors for synergy groups (2+ riders in same team)
const SYNERGY_COLORS = [
    'border-amber-500/50 text-amber-400 bg-amber-500/10',
    'border-blue-500/50 text-blue-400 bg-blue-500/10',
    'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
    'border-purple-500/50 text-purple-400 bg-purple-500/10',
    'border-red-500/50 text-red-400 bg-red-500/10',
    'border-pink-500/50 text-pink-400 bg-pink-500/10',
    'border-cyan-500/50 text-cyan-400 bg-cyan-500/10',
    'border-orange-500/50 text-orange-400 bg-orange-500/10',
];

type SortField = 'name' | 'team' | 'price' | 'type' | 'default';

export function TeamMatrix({ stages }: TeamMatrixProps) {
    const {
        slots,
        budgetUsed,
        maxBudget,
        maxAffordablePrice,
        updateSlot,
        selectRiderForSlot,
        clearSlot,
        toggleLineup,
        getOptimalDistribution,
        resetTeam
    } = useTeam();
    const { aggregatedVotes, currentGroup, submitTeam, mySubmittedTeam, isSubmittingTeam } = useCommunity();

    const [sortField, setSortField] = useState<SortField>('default');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [viewMode, setViewMode] = useState<'opstelling' | 'scores'>('opstelling');

    const { scores, availableStages, isLoading: scoresLoading } = useStageScores(slots);

    const isOverBudget = budgetUsed > maxBudget;
    const activeRidersCount = slots.filter(s => s.name.trim() !== '').length;
    const remainingSlots = TEAM_SIZE - activeRidersCount;
    const remainingBudget = maxBudget - budgetUsed;
    const avgPerSlot = remainingSlots > 0 ? remainingBudget / remainingSlots : 0;
    const budgetPercentage = Math.min(100, (budgetUsed / maxBudget) * 100);

  // US-14: Identify team synergy
  const teamSynergy = useMemo(() => {
    const counts: Record<string, number> = {};
    slots.forEach(s => {
        if (s.team) counts[s.team] = (counts[s.team] || 0) + 1;
    });
    
    // Only keep teams with 2+ riders
    const synergy: Record<string, { count: number, colorIndex: number }> = {};
    let colorIdx = 0;
    Object.entries(counts).forEach(([team, count]) => {
        if (count >= 2) {
            synergy[team] = { count, colorIndex: colorIdx % SYNERGY_COLORS.length };
            colorIdx++;
        }
    });
    return synergy;
  }, [slots]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedSlots = useMemo(() => {
    if (sortField === 'default') return slots;

    return [...slots].sort((a, b) => {
      if (!a.name && b.name) return 1;
      if (a.name && !b.name) return -1;
      if (!a.name && !b.name) return 0;

      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      
      if (sortField === 'price') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const comparison = String(aVal).localeCompare(String(bVal), 'nl', { sensitivity: 'base' });
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [slots, sortField, sortOrder]);

  const stageTotals = useMemo(() => {
    return stages.reduce((acc, stage) => {
      const counts = slots.reduce((sums, slot) => {
        const status = slot.lineup[stage.nummer] || '';
        if (status === 'X' || status === 'K') sums.total++;
        if (status === 'K') sums.captains++;
        return sums;
      }, { total: 0, captains: 0 });
      acc[stage.nummer] = counts;
      return acc;
    }, {} as Record<number, { total: number, captains: number }>);
  }, [slots, stages]);

  const getRiderStageCount = (slotLineup: Record<number, string>) => {
    return Object.values(slotLineup).filter(s => s === 'X' || s === 'K').length;
  };

  const handleSubmitTeam = useCallback(async () => {
    const ok = await submitTeam(slots);
    setSubmitStatus(ok ? 'success' : 'error');
    if (ok) setTimeout(() => setSubmitStatus('idle'), 4000);
  }, [submitTeam, slots]);

  return (
    <div className="flex flex-col space-y-4 pb-48 max-w-7xl mx-auto">
      {/* Top Stats & Distribution Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-2xl overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Euro className="w-32 h-32 rotate-12" />
            </div>

            <div className="flex-1 space-y-4 relative z-10">
                <div className="flex justify-between items-end mb-1">
                    <div>
                        <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-1">Budget Beheer</h3>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black italic tracking-tighter ${isOverBudget ? 'text-red-500' : 'text-white'}`}>
                                {formatMoney(budgetUsed)}
                            </span>
                            <span className="text-neutral-500 text-sm font-bold">/ {formatMoney(maxBudget)}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Resterend per plek</h3>
                        <span className={`text-sm font-black italic ${avgPerSlot < 500000 ? 'text-red-500 animate-pulse' : avgPerSlot < 750000 ? 'text-amber-500' : 'text-emerald-400'}`}>
                            {formatMoney(avgPerSlot)}
                        </span>
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50 shadow-inner">
                    <div 
                        className={`h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                            isOverBudget ? 'bg-red-500' : 
                            budgetPercentage > 95 ? 'bg-amber-500' : 
                            'bg-emerald-500'
                        }`}
                        style={{ width: `${budgetPercentage}%` }}
                    />
                </div>

                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-neutral-500">{activeRidersCount} / {TEAM_SIZE} renners</span>
                    {remainingBudget >= 0 ? (
                        <span className="text-emerald-500">Nog {formatMoney(remainingBudget)} over</span>
                    ) : (
                        <span className="text-red-500">{formatMoney(Math.abs(remainingBudget))} overschreden</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/10"
                >
                    <ListPlus className="w-5 h-5" />
                    Startlijst
                </button>
                {confirmReset ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400 font-bold">Zeker weten?</span>
                        <button
                            onClick={() => { resetTeam(); setConfirmReset(false); }}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-red-400 transition-all active:scale-95"
                        >
                            Ja, wis
                        </button>
                        <button
                            onClick={() => setConfirmReset(false)}
                            className="px-4 py-2 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-neutral-700 transition-all active:scale-95"
                        >
                            Annuleer
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmReset(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-neutral-700 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                    >
                        <Trash2 className="w-5 h-5" />
                        Reset
                    </button>
                )}
            </div>
        </div>

          <DistributionSummary />
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="block lg:hidden mt-4">
        <MobileTeamView
            stages={stages}
            teamSynergy={teamSynergy}
            SYNERGY_COLORS={SYNERGY_COLORS}
            RENNER_TYPES={RENNER_TYPES}
            communityVotes={aggregatedVotes}
        />
      </div>

      {/* View mode toggle */}
      <div className="hidden lg:flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode('opstelling')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              viewMode === 'opstelling'
                ? 'bg-neutral-700 text-white shadow'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Crown className="w-3 h-3" />
            Opstelling
          </button>
          <button
            onClick={() => setViewMode('scores')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              viewMode === 'scores'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            Scores
            {scoresLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
            {!scoresLoading && availableStages.length > 0 && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded px-1">
                E{availableStages.length}
              </span>
            )}
          </button>
        </div>
        {viewMode === 'scores' && !scoresLoading && availableStages.length === 0 && (
          <p className="text-[11px] text-neutral-500 font-bold">
            Geen scores beschikbaar — bereken eerst via Admin → Score Berekeningen.
          </p>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-separate border-spacing-0 min-w-max">
            <thead className="sticky top-0 z-40 bg-neutral-950 border-b border-neutral-800">
              <tr className="text-[10px] text-neutral-400 uppercase font-black tracking-widest leading-none">
                <th className="p-2 w-7 text-center sticky left-0 z-50 bg-neutral-950 border-r border-neutral-800 shadow-[1px_0_0_0_#262626]">#</th>
                <th 
                  className="p-2 w-48 sm:w-56 sticky left-7 z-50 bg-neutral-950 border-r border-neutral-800 cursor-pointer group/h transition-colors hover:text-white shadow-[2px_0_10px_rgba(0,0,0,0.5)]"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1.5 font-black uppercase">
                    Naam 
                    <ArrowUpDown className={`w-2.5 h-2.5 transition-opacity ${sortField === 'name' ? 'opacity-100 text-amber-500' : 'opacity-40 group-hover/h:opacity-70'}`} />
                  </div>
                </th>
                <th className="p-2 w-28 border-r border-neutral-800 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('team')}>Ploeg</th>
                <th className="p-2 w-20 text-right border-r border-neutral-800 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('price')}>Prijs</th>
                <th className="p-2 w-24 border-r border-neutral-800 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('type')}>Type</th>
                {stages.map(s => (
                  <th key={s.nummer} className="p-0.5 w-8 text-center border-r border-neutral-800/50" title={`${s.startplaats} -> ${s.finishplaats}`}>
                    <div className="flex flex-col items-center">
                        <span className={`text-[8px] font-black uppercase leading-none ${
                          viewMode === 'scores' && availableStages.includes(s.nummer)
                            ? 'text-emerald-400'
                            : 'text-neutral-400'
                        }`}>{s.nummer}</span>
                        <div className={`w-1 h-1 mt-0.5 rounded-full ${
                            s.terreintype === 'bergen' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' :
                            s.terreintype === 'heuvels' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                            s.terreintype === 'tijdrit' ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]' :
                            'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                        }`}></div>
                    </div>
                  </th>
                ))}
                {viewMode === 'scores' && (
                  <th className="p-1 w-12 text-center text-emerald-500 text-[9px] font-black uppercase tracking-widest">Tot.</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/30">
              {sortedSlots.map((slot, displayIdx) => {
                const hasRider = !!slot.name;
                const stageCount = getRiderStageCount(slot.lineup);
                const synergy = teamSynergy[slot.team];

                return (
                  <tr key={slot.id} className="group/row transition-all hover:bg-neutral-800/40 relative focus-within:z-[60] focus-within:relative">
                    <td className="p-2 text-center font-mono text-[10px] text-neutral-500 font-bold sticky left-0 z-40 bg-neutral-900 group-hover/row:bg-neutral-800 border-r border-neutral-800 group-hover/row:text-amber-500 transition-colors">
                        {(displayIdx + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="p-1 w-48 sm:w-56 sticky left-7 z-30 bg-neutral-900 group-hover/row:bg-neutral-800 border-r border-neutral-800 shadow-[2px_0_10px_rgba(0,0,0,0.4)]">
                      <div className="flex items-center gap-1.5">
                        <Autocomplete
                          value={slot.name}
                          options={allRiders}
                          placeholder="Selecteer..."
                          onChange={(val) => updateSlot(slot.id, 'name', val)}
                          onSelect={(rider) => selectRiderForSlot(slot.id, rider)}
                          onClear={() => clearSlot(slot.id)}
                          communityVotes={aggregatedVotes}
                        />
                        {allRiders.find(r => r.naam === slot.name)?.is_jongere && (
                          <span className="text-amber-500 font-black text-sm" title="Jongerenklassement">*</span>
                        )}
                        {hasRider && (
                          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-neutral-800 border border-neutral-700 text-[9px] font-black text-neutral-300 group-hover/row:text-amber-500 group-hover/row:border-amber-500/50 transition-all cursor-help" title="In ritten geselecteerd">
                            {stageCount}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-0.5 w-28 border-r border-neutral-800/20">
                      <div className="relative group/synergy">
                        <input
                            type="text"
                            value={slot.team}
                            onChange={(e) => updateSlot(slot.id, 'team', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Ploeg"
                            className={`w-full bg-transparent border border-transparent hover:border-neutral-700 focus:bg-neutral-800 focus:border-neutral-700 rounded px-1.5 py-1 text-[10px] font-bold outline-none transition-all placeholder:text-neutral-700 ${
                                synergy ? SYNERGY_COLORS[synergy.colorIndex] : 'text-neutral-400 focus:text-neutral-100'
                            }`}
                        />
                        {synergy && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center gap-1">
                                <Link2 className="w-2.5 h-2.5 opacity-40" />
                                <span className="text-[8px] font-black bg-neutral-900/50 px-1 rounded border border-current">{synergy.count}</span>
                            </div>
                        )}
                      </div>
                    </td>
                    <td className="p-0.5 w-20 border-r border-neutral-800/20">
                      <input
                        type="text"
                        value={slot.price === 0 ? '' : slot.price.toLocaleString('nl-NL')}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/\./g, '')) || 0;
                          updateSlot(slot.id, 'price', val);
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="&euro; 0"
                        className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:bg-neutral-800 focus:border-neutral-700 rounded px-1.5 py-1 text-[11px] text-white text-right font-mono font-bold outline-none transition-all placeholder:text-neutral-700"
                      />
                    </td>
                    <td className="p-0.5 w-24 border-r border-neutral-800/20">
                        <select
                          value={slot.type}
                          onChange={(e) => updateSlot(slot.id, 'type', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:bg-neutral-800 focus:border-neutral-700 rounded px-1 py-1 text-[9px] uppercase font-black text-neutral-400 font-semibold focus:text-amber-400 outline-none cursor-pointer appearance-none transition-all"
                        >
                          {RENNER_TYPES.map(t => (
                              <option key={t} value={t} className="bg-neutral-900 text-neutral-200">{t}</option>
                          ))}
                        </select>
                    </td>
                    
                    {stages.map(s => {
                      if (viewMode === 'scores') {
                        const slotScore = scores?.perSlot[slot.id]?.[s.nummer];
                        const base = slotScore ? calcBaseTotal(slotScore) : 0;
                        const showVal = slotScore?.opgesteld
                          ? slotScore.totaal
                          : base > 0 ? base : null;

                        // Tooltip text
                        const tipLines: string[] = [];
                        if (slotScore && (slotScore.opgesteld || base > 0)) {
                          tipLines.push(`Etappe: ${slotScore.punten_etappe} pt`);
                          if (slotScore.punten_kopman_bonus > 0) tipLines.push(`  + ${slotScore.punten_kopman_bonus} kopman`);
                          if (slotScore.punten_gc > 0)     tipLines.push(`GC:     ${slotScore.punten_gc} pt`);
                          if (slotScore.punten_punten > 0) tipLines.push(`Punten: ${slotScore.punten_punten} pt`);
                          if (slotScore.punten_kom > 0)    tipLines.push(`Berg:   ${slotScore.punten_kom} pt`);
                          if (slotScore.punten_jong > 0)   tipLines.push(`Jong:   ${slotScore.punten_jong} pt`);
                          if (slotScore.punten_team > 0)   tipLines.push(`Team:   ${slotScore.punten_team} pt`);
                          tipLines.push(`──────────────`);
                          tipLines.push(`Totaal: ${slotScore.opgesteld ? slotScore.totaal : base} pt${!slotScore.opgesteld ? ' (niet opgesteld)' : ''}`);
                        }

                        let cellCls = 'text-neutral-800';
                        if (slotScore?.opgesteld) {
                          if (slotScore.totaal >= 51)     cellCls = 'bg-emerald-500/25 text-emerald-200 font-black';
                          else if (slotScore.totaal >= 21) cellCls = 'bg-emerald-500/15 text-emerald-300 font-bold';
                          else if (slotScore.totaal >= 1)  cellCls = 'bg-emerald-500/10 text-emerald-400 font-bold';
                          else                             cellCls = 'text-neutral-600';
                        } else if (base > 0) {
                          cellCls = 'text-neutral-600 italic';
                        }

                        return (
                          <td key={s.nummer} className="p-0.5 w-8 text-center border-r border-neutral-800/10">
                            <div
                              title={tipLines.join('\n')}
                              className={`w-7 h-5 mx-auto rounded-sm flex items-center justify-center text-[10px] transition-colors ${cellCls}`}
                            >
                              {showVal ?? ''}
                            </div>
                          </td>
                        );
                      }

                      // Opstelling mode (default)
                      const status = slot.lineup[s.nummer] || '';
                      let cellClass = "bg-transparent text-transparent";
                      if (status === 'X') cellClass = "bg-blue-500/30 text-blue-100 border-blue-500/40 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]";
                      if (status === 'K') cellClass = "bg-amber-400 text-neutral-950 font-black shadow-[0_0_12px_rgba(251,191,36,0.4)] scale-105";

                      return (
                        <td key={s.nummer} className="p-0.5 w-8 text-center border-r border-neutral-800/10">
                          <button
                            onClick={() => hasRider && toggleLineup(slot.id, s.nummer)}
                            disabled={!hasRider}
                            className={`w-7 h-5 mx-auto rounded-sm border flex items-center justify-center text-[10px] transition-all duration-300 focus:outline-none select-none disabled:opacity-0 ${
                                status === '' ? 'border-neutral-800/30 hover:border-neutral-600' : 'border-transparent'
                            } ${cellClass}`}
                          >
                            {status === 'K' ? <Crown className="w-2.5 h-2.5 fill-neutral-950" /> : status}
                          </button>
                        </td>
                      );
                    })}
                    {viewMode === 'scores' && (
                      <td className="p-1 w-12 text-center border-l border-neutral-800/30">
                        {scores && slot.riderId ? (() => {
                          const total = calcRiderTotal(scores.perSlot[slot.id] ?? {});
                          return total > 0 ? (
                            <span className="text-[11px] font-black text-emerald-400">{total}</span>
                          ) : null;
                        })() : null}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-40 bg-neutral-950 border-t-2 border-neutral-800">
                {viewMode === 'opstelling' && (
                  <tr className="divide-x divide-neutral-900 text-neutral-400">
                      <td className="sticky left-0 bg-neutral-950 z-50"></td>
                      <td className="p-3 sticky left-7 bg-neutral-950 z-50 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-[4px_0_15px_rgba(0,0,0,0.5)]">
                          <Trophy className="w-4 h-4 text-amber-500" /> TOTAAL OPSTELLING
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      {stages.map(s => {
                          const count = stageTotals[s.nummer].total;
                          let color = "text-neutral-700";
                          if (count > 0) color = "text-white font-black";
                          if (count >= 5 && count <= 8) color = "text-amber-400 font-extrabold";
                          if (count >= 9) color = "text-emerald-400 font-extrabold";
                          return (
                              <td key={`tot-${s.nummer}`} className={`p-1.5 text-center text-[11px] ${color}`}>
                                  {count || ''}
                              </td>
                          )
                      })}
                  </tr>
                )}
                {viewMode === 'scores' && (
                  <>
                    {/* Score rij: som van 9 opgestelde rijders */}
                    <tr className="divide-x divide-neutral-900 text-neutral-400 border-t border-neutral-800">
                        <td className="sticky left-0 bg-neutral-950 z-50"></td>
                        <td className="p-2 sticky left-7 bg-neutral-950 z-50 text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 shadow-[4px_0_15px_rgba(0,0,0,0.5)] text-emerald-500">
                            <BarChart2 className="w-3.5 h-3.5" /> Score
                        </td>
                        <td></td><td></td><td></td>
                        {stages.map(s => {
                            const st = scores?.perStage[s.nummer];
                            return (
                                <td key={`sc-${s.nummer}`} className="p-1 text-center text-[11px] font-black text-emerald-400">
                                    {st?.score_opgesteld || ''}
                                </td>
                            );
                        })}
                        <td className="p-1 text-center text-[11px] font-black text-emerald-400">
                            {scores ? Object.values(scores.perStage).reduce((s, v) => s + v.score_opgesteld, 0) || '' : ''}
                        </td>
                    </tr>
                    {/* Max mogelijk rij */}
                    <tr className="divide-x divide-neutral-900 text-neutral-400">
                        <td className="sticky left-0 bg-neutral-950 z-50"></td>
                        <td className="p-2 sticky left-7 bg-neutral-950 z-50 text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 shadow-[4px_0_15px_rgba(0,0,0,0.5)] text-neutral-500">
                            <Trophy className="w-3.5 h-3.5" /> Max mogelijk
                        </td>
                        <td></td><td></td><td></td>
                        {stages.map(s => {
                            const st = scores?.perStage[s.nummer];
                            const isSuboptimal = st && st.score_max_mogelijk > st.score_opgesteld;
                            return (
                                <td key={`mx-${s.nummer}`}
                                    title={isSuboptimal ? `Je had ${st.score_max_mogelijk - st.score_opgesteld} pt meer kunnen scoren met een andere kopman` : undefined}
                                    className={`p-1 text-center text-[11px] font-bold ${isSuboptimal ? 'text-amber-400' : 'text-neutral-700'}`}>
                                    {st?.score_max_mogelijk || ''}
                                </td>
                            );
                        })}
                        <td className="p-1 text-center text-[11px] font-bold text-neutral-600">
                            {scores ? Object.values(scores.perStage).reduce((s, v) => s + v.score_max_mogelijk, 0) || '' : ''}
                        </td>
                    </tr>
                  </>
                )}
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* Team Definitief Maken */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Send size={16} className="text-pink-400" />
          Team Definitief Maken
        </h2>

        {/* Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { ok: activeRidersCount === TEAM_SIZE, label: `${activeRidersCount}/20 renners geselecteerd` },
            { ok: !isOverBudget, label: isOverBudget ? 'Budget overschreden' : 'Binnen budget' },
            { ok: !!currentGroup, label: currentGroup ? `Groep: ${currentGroup.name}` : 'Niet in een groep' },
          ].map(({ ok, label }) => (
            <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ok ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
              {ok
                ? <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                : <XCircle size={14} className="shrink-0 text-neutral-500" />}
              {label}
            </div>
          ))}
        </div>

        {!currentGroup && (
          <p className="text-xs text-neutral-500 mb-4">
            Ga naar het <span className="text-pink-400 font-semibold">Community</span>-tabblad om een groep aan te maken of te joinen.
          </p>
        )}

        {/* Previously submitted banner */}
        {mySubmittedTeam && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2 mb-4">
            <CheckCircle2 size={13} className="shrink-0" />
            Ingediend op {new Date(mySubmittedTeam.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            <span className="ml-1 text-neutral-500">— klik om te bijwerken</span>
          </div>
        )}

        {/* Submit feedback */}
        {submitStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-950/50 border border-emerald-700/50 rounded-lg px-3 py-2 mb-4">
            <CheckCircle2 size={15} /> Team opgeslagen voor <strong>{currentGroup?.name}</strong>!
          </div>
        )}
        {submitStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-300 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2 mb-4">
            <XCircle size={15} /> Er ging iets mis. Probeer opnieuw.
          </div>
        )}

        <button
          onClick={handleSubmitTeam}
          disabled={activeRidersCount !== TEAM_SIZE || isOverBudget || !currentGroup || isSubmittingTeam}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all
            bg-pink-600 hover:bg-pink-500 text-white
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-pink-600"
        >
          {isSubmittingTeam
            ? <><RefreshCw size={14} className="animate-spin" /> Opslaan...</>
            : mySubmittedTeam
              ? <><RefreshCw size={14} /> Team Bijwerken</>
              : <><Send size={14} /> Team Definitief Maken</>}
        </button>
      </div>

      <StartlistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

