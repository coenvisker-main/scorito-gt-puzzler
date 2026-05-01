import { useMemo, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { Etappe, RennerType } from '../types';
import { Autocomplete } from './Autocomplete';
import { StartlistModal } from './StartlistModal';
import { MobileTeamView } from './MobileTeamView';
import { DistributionSummary } from './DistributionSummary';
import { riders as allRiders } from '../data/riders';
import { 
  Trash2, 
  Crown, 
  Euro, 
  AlertCircle,
  Users,
  Trophy,
  ArrowUpDown,
  BarChart3,
  Link2,
  ListPlus
} from 'lucide-react';


interface TeamMatrixProps {
  stages: Etappe[];
}

const RENNER_TYPES: RennerType[] = ['GC', 'Klimmer', 'Sprinter', 'Sprint+', 'Aanvaller', 'Tijdrijder', 'Wildcard'];

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
    updateSlot, 
    selectRiderForSlot, 
    clearSlot, 
    toggleLineup,
    getOptimalDistribution,
    resetTeam 
  } = useTeam();

  const [sortField, setSortField] = useState<SortField>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isOverBudget = budgetUsed > maxBudget;
  const activeRidersCount = slots.filter(s => s.name.trim() !== '').length;

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

  return (
    <div className="flex flex-col space-y-4 pb-48 max-w-7xl mx-auto">
      {/* Top Stats & Distribution Bar */}
      <div className="flex flex-col gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-12">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-neutral-400 tracking-[0.2em] mb-1">Puzzel Budget</span>
                  <div className={`flex items-center gap-2 text-3xl font-black italic tracking-tighter ${isOverBudget ? 'text-red-500' : 'text-amber-500'}`}>
                    <Euro className="w-6 h-6" />
                    &euro;{(budgetUsed / 1000000).toFixed(1)}M<span className="text-neutral-500 text-sm font-bold ml-1 font-sans not-italic">/ 52M</span>
                  </div>
                </div>
                <div className="w-px h-12 bg-neutral-800 hidden md:block"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-neutral-400 tracking-[0.2em] mb-1">Aantal Selectie</span>
                  <div className={`flex items-center gap-2 text-3xl font-black italic tracking-tighter ${activeRidersCount === 20 ? 'text-emerald-500' : 'text-white'}`}>
                    <Users className="w-6 h-6 text-neutral-500" />
                    {activeRidersCount}<span className="text-neutral-500 text-sm font-bold ml-1 font-sans not-italic">/ 20</span>
                  </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {isOverBudget && (
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[11px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-red-500/5">
                        <AlertCircle className="w-4 h-4" />
                        Budget Overschreden
                    </div>
                )}
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                    <ListPlus className="w-4 h-4" />
                    Open Startlijst
                </button>
                <button 
                    onClick={resetTeam}
                    className="flex items-center gap-2 px-6 py-2.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-neutral-700 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                >
                    <Trash2 className="w-4 h-4" />
                    Reset Team
                </button>
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
        />
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
                        <span className="text-[8px] text-neutral-400 font-black uppercase leading-none">{s.nummer}</span>
                        <div className={`w-1 h-1 mt-0.5 rounded-full ${
                            s.terreintype === 'bergen' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' :
                            s.terreintype === 'heuvels' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                            s.terreintype === 'tijdrit' ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 
                            'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                        }`}></div>
                    </div>
                  </th>
                ))}
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
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-40 bg-neutral-950 border-t-2 border-neutral-800">
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
            </tfoot>
          </table>
        </div>
      </div>
      
      <StartlistModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

