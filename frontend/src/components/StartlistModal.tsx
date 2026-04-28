import { useMemo, useState, useEffect } from 'react';
import { X, Plus, Check, Search, ListPlus } from 'lucide-react';
import { riders as allRiders } from '../data/riders';
import { useTeam } from '../context/TeamContext';
import { Renner } from '../types';

interface StartlistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StartlistModal({ isOpen, onClose }: StartlistModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const { slots, addRider } = useTeam();

    // Reset inner state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    };

    const isTeamFull = slots.filter(s => s.name.trim() !== '').length >= 20;

    const { groupedRiders, totalCount } = useMemo(() => {
        const filtered = allRiders.filter(r => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return r.naam.toLowerCase().includes(term) || r.ploeg.toLowerCase().includes(term);
            }
            return true;
        });

        const groups: Record<string, Renner[]> = {};
        filtered.forEach(r => {
            if (!groups[r.ploeg]) groups[r.ploeg] = [];
            groups[r.ploeg].push(r);
        });

        const sortedTeams = Object.keys(groups).sort();

        sortedTeams.forEach(team => {
            groups[team].sort((a, b) => {
                if (b.prijs !== a.prijs) return b.prijs - a.prijs;
                return a.naam.localeCompare(b.naam);
            });
        });

        return {
            groupedRiders: sortedTeams.map(team => ({ team, riders: groups[team] })),
            totalCount: filtered.length
        };
    }, [searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>

            <div
                className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl h-[95vh] sm:h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative z-10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            <ListPlus className="text-amber-500" size={24} />
                            Startlijst
                            <span className="text-xs sm:text-sm font-normal text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-md ml-2 border border-neutral-800">
                                {totalCount} renners
                            </span>
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-red-900/50 rounded-lg transition-colors"
                        title="Sluiten"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Menu */}
                <div className="p-4 border-b border-neutral-800 bg-neutral-900/60 flex shrink-0">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="text-neutral-500" size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Zoek renner of ploeg..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-lg pl-10 pr-10 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-neutral-600"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content: Grouped Riders */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-neutral-900/50">
                    {groupedRiders.length === 0 ? (
                        <div className="text-center text-neutral-400 flex flex-col items-center justify-center py-12 bg-neutral-950/30 rounded-xl border border-neutral-800/50 border-dashed">
                            <Search size={40} className="mb-3 text-neutral-600" />
                            <p className="text-base font-medium">Geen renners gevonden</p>
                            <p className="text-xs text-neutral-500 mt-1">Probeer een andere zoekopdracht.</p>
                        </div>
                    ) : (
                        <div className="columns-1 lg:columns-2 gap-4 lg:gap-6">
                            {groupedRiders.map(group => (
                                <div key={group.team} className="break-inside-avoid mb-4 sm:mb-6 bg-neutral-950/40 rounded-lg border border-neutral-800/80 overflow-hidden shadow-sm">
                                    <div className="bg-neutral-950 px-3 py-2 border-b border-neutral-800/80 font-bold text-neutral-200 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-3.5 bg-amber-500 rounded-full"></span>
                                            <span className="text-xs sm:text-sm tracking-wide uppercase font-black text-neutral-300">{group.team}</span>
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">{group.riders.length}</span>
                                    </div>
                                    <div className="divide-y divide-neutral-800/50 bg-neutral-900/20">
                                        {group.riders.map(rider => {
                                            const isAlreadyInTeam = slots.some(r => r.name === rider.naam && r.name !== '');

                                            return (
                                                <div key={rider.id} className="flex items-center justify-between px-3 py-2 gap-2 hover:bg-neutral-800/40 transition-colors group">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <div className="font-medium text-white text-xs sm:text-sm truncate flex-1">{rider.naam}</div>
                                                        <div className="text-[10px] sm:text-xs text-neutral-400 font-mono w-auto sm:w-20 shrink-0 bg-neutral-950/50 px-1.5 py-0.5 rounded text-right">
                                                            {formatMoney(rider.prijs)}
                                                        </div>
                                                        <div className="shrink-0 w-8 flex justify-center">
                                                            <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-neutral-800 text-neutral-500 border border-neutral-700">
                                                                {rider.gebruiker_type.substring(0,3)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 flex justify-end">
                                                        {isAlreadyInTeam ? (
                                                            <button
                                                                disabled
                                                                className="flex items-center justify-center gap-1 w-full sm:w-auto px-2 py-1 rounded text-[10px] font-bold bg-neutral-950 text-neutral-600 cursor-not-allowed border border-neutral-800"
                                                            >
                                                                <Check size={12} /> <span className="hidden sm:inline">Toegevoegd</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => addRider(rider)}
                                                                disabled={isTeamFull}
                                                                className={`flex items-center justify-center gap-1 w-full sm:w-auto px-2 py-1 rounded text-[10px] font-bold transition-all border active:scale-95 ${
                                                                    isTeamFull 
                                                                    ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
                                                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                                }`}
                                                            >
                                                                <Plus size={12} /> <span className="hidden sm:inline">Kies</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
