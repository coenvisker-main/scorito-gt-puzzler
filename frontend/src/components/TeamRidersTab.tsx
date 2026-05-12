import { useMemo, useState, useCallback } from 'react';
import { useTeam } from '../context/TeamContext';
import { useCommunity } from '../context/CommunityContext';
import { Etappe, RennerType, RENNER_TYPES, TEAM_SIZE } from '../types';
import { formatMoney } from '../utils/formatUtils';
import { Autocomplete } from './Autocomplete';
import { StartlistModal } from './StartlistModal';
import { DistributionSummary } from './DistributionSummary';
import { riders as allRiders } from '../data/riders';
import {
  Trash2, Euro, ArrowUpDown, Link2, ListPlus,
  CheckCircle2, XCircle, Send, RefreshCw, Crown,
} from 'lucide-react';

interface TeamRidersTabProps {
  stages: Etappe[];
}

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

export function TeamRidersTab({ stages }: TeamRidersTabProps) {
  const { slots, updateSlot, selectRiderForSlot, clearSlot, resetTeam, budgetUsed, maxBudget } = useTeam();
  const {
    aggregatedVotes, currentGroup,
    submitTeam, mySubmittedTeam, isSubmittingTeam,
  } = useCommunity();

  const [sortField, setSortField] = useState<SortField>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // ─── Derived state ──────────────────────────────────────────────────────────
  const teamSynergy = useMemo(() => {
    const counts: Record<string, number> = {};
    slots.forEach(s => { if (s.team) counts[s.team] = (counts[s.team] || 0) + 1; });
    const synergy: Record<string, { count: number; colorIndex: number }> = {};
    let colorIdx = 0;
    Object.entries(counts).forEach(([team, count]) => {
      if (count >= 2) { synergy[team] = { count, colorIndex: colorIdx++ % SYNERGY_COLORS.length }; }
    });
    return synergy;
  }, [slots]);

  const sortedSlots = useMemo(() => {
    if (sortField === 'default') return slots;
    return [...slots].sort((a, b) => {
      if (!a.name && b.name) return 1;
      if (a.name && !b.name) return -1;
      if (!a.name && !b.name) return 0;
      if (sortField === 'price') return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
      const cmp = String(a[sortField as keyof typeof a]).localeCompare(
        String(b[sortField as keyof typeof b]), 'nl', { sensitivity: 'base' }
      );
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [slots, sortField, sortOrder]);

  const activeRidersCount = useMemo(() => slots.filter(s => s.name.trim() !== '').length, [slots]);
  const isOverBudget = budgetUsed > maxBudget;
  const budgetPct = Math.min((budgetUsed / maxBudget) * 100, 100);
  const remainingBudget = maxBudget - budgetUsed;
  const remainingSlots = TEAM_SIZE - activeRidersCount;
  const avgPerSlot = remainingSlots > 0 ? remainingBudget / remainingSlots : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSubmitTeam = useCallback(async () => {
    const ok = await submitTeam(slots);
    setSubmitStatus(ok ? 'success' : 'error');
    if (ok) setTimeout(() => setSubmitStatus('idle'), 4000);
  }, [submitTeam, slots]);

  const getRiderStageCount = (slotLineup: Record<number, string>) =>
    Object.values(slotLineup).filter(s => s === 'X' || s === 'K').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Budget card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-2xl overflow-hidden relative">
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
          <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-gradient-to-r from-red-700 to-red-500' : 'bg-gradient-to-r from-amber-700 to-amber-400'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-neutral-600">{activeRidersCount}/{TEAM_SIZE} renners</span>
            <span className={remainingBudget < 0 ? 'text-red-500' : 'text-neutral-500'}>
              {formatMoney(Math.abs(remainingBudget))} {remainingBudget < 0 ? 'over budget' : 'resterend'}
            </span>
          </div>
        </div>
      </div>

      {/* Startlijst + Reset buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all"
        >
          <ListPlus className="w-4 h-4" /> Startlijst
        </button>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 font-bold">Zeker weten?</span>
            <button onClick={() => { resetTeam(); setConfirmReset(false); }}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase hover:bg-red-400 transition-all">
              Ja, wis
            </button>
            <button onClick={() => setConfirmReset(false)}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-xs font-black uppercase hover:bg-neutral-700 transition-all">
              Annuleer
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-700 hover:text-white transition-all">
            <Trash2 className="w-4 h-4" /> Reset
          </button>
        )}
      </div>

      <DistributionSummary hideFormula />

      {/* ── MOBILE CARDS (< lg) ───────────────────────────────────────────── */}
      <div className="block lg:hidden flex flex-col gap-4">
        {sortedSlots.map((slot, displayIdx) => {
          const hasRider = !!slot.name;
          const synergy = teamSynergy[slot.team];
          return (
            <div key={slot.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-lg relative overflow-hidden focus-within:ring-1 focus-within:ring-neutral-700">
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-neutral-950 border border-neutral-800 rounded-md text-[10px] font-bold text-neutral-500">
                  {(displayIdx + 1).toString().padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0 z-50">
                  <Autocomplete
                    value={slot.name}
                    options={allRiders}
                    placeholder="Selecteer renner..."
                    onChange={(val) => updateSlot(slot.id, 'name', val)}
                    onSelect={(rider) => selectRiderForSlot(slot.id, rider)}
                    onClear={() => clearSlot(slot.id)}
                    communityVotes={aggregatedVotes}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={slot.team}
                    onChange={(e) => updateSlot(slot.id, 'team', e.target.value)}
                    placeholder="Ploeg"
                    className={`w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs font-bold outline-none focus:border-neutral-700 transition-all ${
                      synergy ? SYNERGY_COLORS[synergy.colorIndex] : 'text-neutral-400'
                    }`}
                  />
                  {synergy && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-1.5 flex items-center gap-0.5">
                      <Link2 className="w-3 h-3 opacity-40" />
                      <span className="text-[9px] font-black">{synergy.count}</span>
                    </div>
                  )}
                </div>
                <select
                  value={slot.type}
                  onChange={(e) => updateSlot(slot.id, 'type', e.target.value as RennerType)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-[10px] uppercase font-black text-neutral-400 focus:text-amber-400 outline-none"
                >
                  {RENNER_TYPES.map(t => (
                    <option key={t} value={t} className="bg-neutral-900 text-neutral-200">{t}</option>
                  ))}
                </select>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={slot.price === 0 ? '' : slot.price.toLocaleString('nl-NL')}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/\./g, '')) || 0;
                      updateSlot(slot.id, 'price', val);
                    }}
                    placeholder="Prijs €"
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-neutral-700"
                  />
                  {hasRider && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-neutral-800/50 rounded border border-neutral-700 border-dashed text-[10px] text-neutral-400">
                      <Crown className="w-2.5 h-2.5 text-amber-500" />
                      <span className="font-bold">Ritten:</span>
                      <span className={`font-black ${getRiderStageCount(slot.lineup) > 0 ? 'text-amber-500' : 'text-neutral-500'}`}>
                        {getRiderStageCount(slot.lineup)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE (lg+) ───────────────────────────────────────────── */}
      <div className="hidden lg:block bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-40 bg-neutral-950 border-b border-neutral-800">
              <tr className="text-[10px] text-neutral-400 uppercase font-black tracking-widest leading-none">
                <th className="p-2 w-7 text-center sticky left-0 z-50 bg-neutral-950 border-r border-neutral-800">#</th>
                <th className="p-2 w-56 sticky left-7 z-50 bg-neutral-950 border-r border-neutral-800 cursor-pointer group/h hover:text-white transition-colors shadow-[2px_0_10px_rgba(0,0,0,0.5)]"
                  onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    Naam <ArrowUpDown className={`w-2.5 h-2.5 ${sortField === 'name' ? 'opacity-100 text-amber-500' : 'opacity-40'}`} />
                  </div>
                </th>
                <th className="p-2 w-32 border-r border-neutral-800 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('team')}>Ploeg</th>
                <th className="p-2 w-20 text-right border-r border-neutral-800 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('price')}>Prijs</th>
                <th className="p-2 w-28 border-r border-neutral-800 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('type')}>Type</th>
                <th className="p-2 w-12 text-center text-neutral-600">Ritten</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/30">
              {sortedSlots.map((slot, displayIdx) => {
                const hasRider = !!slot.name;
                const synergy = teamSynergy[slot.team];
                const stageCount = getRiderStageCount(slot.lineup);
                return (
                  <tr key={slot.id} className="group/row hover:bg-neutral-800/40 transition-all relative focus-within:z-[60] focus-within:relative">
                    <td className="p-2 text-center font-mono text-[10px] text-neutral-500 font-bold sticky left-0 z-40 bg-neutral-900 group-hover/row:bg-neutral-800 border-r border-neutral-800 group-hover/row:text-amber-500 transition-colors">
                      {(displayIdx + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="p-1 w-56 sticky left-7 z-30 bg-neutral-900 group-hover/row:bg-neutral-800 border-r border-neutral-800 shadow-[2px_0_10px_rgba(0,0,0,0.4)]">
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
                    <td className="p-0.5 w-32 border-r border-neutral-800/20">
                      <div className="relative">
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
                        placeholder="€ 0"
                        className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:bg-neutral-800 focus:border-neutral-700 rounded px-1.5 py-1 text-[11px] text-white text-right font-mono font-bold outline-none transition-all placeholder:text-neutral-700"
                      />
                    </td>
                    <td className="p-0.5 w-28 border-r border-neutral-800/20">
                      <select
                        value={slot.type}
                        onChange={(e) => updateSlot(slot.id, 'type', e.target.value as RennerType)}
                        className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:bg-neutral-800 focus:border-neutral-700 rounded px-1 py-1 text-[9px] uppercase font-black text-neutral-400 focus:text-amber-400 outline-none cursor-pointer appearance-none transition-all"
                      >
                        {RENNER_TYPES.map(t => (
                          <option key={t} value={t} className="bg-neutral-900 text-neutral-200">{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1 w-12 text-center">
                      {hasRider && (
                        <span className={`text-[11px] font-black ${stageCount > 0 ? 'text-amber-400' : 'text-neutral-600'}`}>
                          {stageCount}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Team Definitief Maken ─────────────────────────────────────────── */}
      <TeamSubmitSection
        activeRidersCount={activeRidersCount}
        currentGroup={currentGroup}
        mySubmittedTeam={mySubmittedTeam}
        isSubmittingTeam={isSubmittingTeam}
        submitStatus={submitStatus}
        onSubmit={handleSubmitTeam}
      />

      {isModalOpen && <StartlistModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

// ─── Interne helper component ────────────────────────────────────────────────
function TeamSubmitSection({
  activeRidersCount, currentGroup, mySubmittedTeam,
  isSubmittingTeam, submitStatus, onSubmit,
}: {
  activeRidersCount: number;
  currentGroup: any;
  mySubmittedTeam: any;
  isSubmittingTeam: boolean;
  submitStatus: 'idle' | 'success' | 'error';
  onSubmit: () => void;
}) {
  const { budgetUsed, maxBudget } = useTeam();
  const isOverBudget = budgetUsed > maxBudget;

  const checks = [
    { ok: activeRidersCount === TEAM_SIZE, label: `${activeRidersCount}/20 renners geselecteerd` },
    { ok: !isOverBudget, label: isOverBudget ? 'Budget overschreden' : 'Binnen budget' },
    { ok: !!currentGroup, label: currentGroup ? `Groep: ${currentGroup.name}` : 'Niet in een groep' },
  ];

  const canSubmit = checks.every(c => c.ok) && !isSubmittingTeam;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <Send size={16} className="text-pink-400" />
        Team Definitief Maken
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {checks.map(({ ok, label }) => (
          <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ok ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
            {ok ? <CheckCircle2 size={14} className="shrink-0 text-emerald-400" /> : <XCircle size={14} className="shrink-0 text-neutral-500" />}
            {label}
          </div>
        ))}
      </div>

      {!currentGroup && (
        <p className="text-xs text-neutral-500 mb-4">
          Ga naar het <span className="text-pink-400 font-semibold">Community</span>-tabblad om een groep aan te maken of te joinen.
        </p>
      )}

      {mySubmittedTeam && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2 mb-4">
          <CheckCircle2 size={13} className="shrink-0" />
          Ingediend op {new Date(mySubmittedTeam.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          <span className="ml-1 text-neutral-500">— klik om te bijwerken</span>
        </div>
      )}

      {submitStatus === 'success' && (
        <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-950/50 border border-emerald-700/50 rounded-lg px-3 py-2 mb-4">
          <CheckCircle2 size={14} /> Team succesvol ingediend!
        </div>
      )}
      {submitStatus === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-300 bg-red-950/50 border border-red-700/50 rounded-lg px-3 py-2 mb-4">
          <XCircle size={14} /> Indienen mislukt — probeer opnieuw.
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
          canSubmit
            ? 'bg-pink-500 hover:bg-pink-400 text-white shadow-lg shadow-pink-500/20'
            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
        }`}
      >
        {isSubmittingTeam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {mySubmittedTeam ? 'Team Bijwerken' : 'Team Indienen'}
      </button>
    </div>
  );
}

