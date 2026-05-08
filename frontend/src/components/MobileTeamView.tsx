import { Crown, Link2 } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { Etappe, RennerType } from '../types';
import { AggregatedVotes } from '../types/community';
import { Autocomplete } from './Autocomplete';
import { riders as allRiders } from '../data/riders';

interface MobileTeamViewProps {
    stages: Etappe[];
    teamSynergy: Record<string, { count: number, colorIndex: number }>;
    SYNERGY_COLORS: string[];
    RENNER_TYPES: RennerType[];
    communityVotes: AggregatedVotes;
}

export function MobileTeamView({ stages, teamSynergy, SYNERGY_COLORS, RENNER_TYPES, communityVotes }: MobileTeamViewProps) {
    const { slots, updateSlot, selectRiderForSlot, clearSlot, toggleLineup } = useTeam();

    const getRiderStageCount = (slotLineup: Record<number, string>) => {
        return Object.values(slotLineup).filter(s => s === 'X' || s === 'K').length;
    };

    return (
        <div className="flex flex-col gap-4">
            {slots.map((slot, displayIdx) => {
                const hasRider = !!slot.name;
                const stageCount = getRiderStageCount(slot.lineup);
                const synergy = teamSynergy[slot.team];

                return (
                    <div key={slot.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-lg relative overflow-hidden focus-within:ring-1 focus-within:ring-neutral-700">
                        {/* Header: Name and number */}
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
                                    communityVotes={communityVotes}
                                />
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
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
                            
                            <div>
                                <select
                                    value={slot.type}
                                    onChange={(e) => updateSlot(slot.id, 'type', e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-[10px] uppercase font-black text-neutral-400 focus:text-amber-400 outline-none"
                                >
                                    {RENNER_TYPES.map(t => (
                                        <option key={t} value={t} className="bg-neutral-900 text-neutral-200">{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={slot.price === 0 ? '' : slot.price.toLocaleString('nl-NL')}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value.replace(/\./g, '')) || 0;
                                            updateSlot(slot.id, 'price', val);
                                        }}
                                        placeholder="Prijs &euro;"
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-neutral-700"
                                    />
                                </div>
                                {hasRider && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800/50 rounded border border-neutral-700 border-dashed text-[10px] text-neutral-400">
                                        <span className="font-bold">Ritten:</span>
                                        <span className={`font-black ${stageCount > 0 ? 'text-amber-500' : 'text-neutral-500'}`}>{stageCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stages Strip (Mobile line-up) */}
                        {hasRider && (
                            <div className="mt-2 pt-3 border-t border-neutral-800">
                                <div className="text-[9px] font-black uppercase text-neutral-500 tracking-wider mb-2">Opstelling (klik om te wijzigen)</div>
                                <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
                                    {stages.map(s => {
                                        const status = slot.lineup[s.nummer] || '';
                                        let cellClass = "bg-neutral-950 border-neutral-800 text-neutral-600";
                                        if (status === 'X') cellClass = "bg-blue-500/20 text-blue-300 border-blue-500/30";
                                        if (status === 'K') cellClass = "bg-amber-400 text-neutral-950 font-black border-amber-400";
                                        
                                        return (
                                            <button
                                                key={s.nummer}
                                                onClick={() => toggleLineup(slot.id, s.nummer)}
                                                className={`flex-shrink-0 flex flex-col items-center justify-center w-8 h-10 rounded-md border text-[10px] transition-all ${cellClass}`}
                                            >
                                                <span className="opacity-60 mb-0.5">{s.nummer}</span>
                                                {status === 'K' ? <Crown className="w-3 h-3 fill-current" /> : <span className="font-bold">{status || '-'}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
