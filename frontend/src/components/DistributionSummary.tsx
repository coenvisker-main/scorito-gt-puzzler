import { useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { RennerType } from '../types';
import { BarChart3 } from 'lucide-react';

const RENNER_TYPES: RennerType[] = ['GC', 'Klimmer', 'Sprinter', 'Sprint+', 'Aanvaller', 'Tijdrijder', 'Wildcard'];

export function DistributionSummary() {
    const { slots, getOptimalDistribution } = useTeam();

    const typeDistribution = useMemo(() => {
        return slots.reduce((acc, slot) => {
            if (slot.name) {
                acc[slot.type] = (acc[slot.type] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [slots]);

    const optimalDistribution = useMemo(() => getOptimalDistribution(), [getOptimalDistribution]);

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-amber-500">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-[0.1em]">Parcoursfit Analyse</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase italic">Actueel vs. Optimaal model</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {RENNER_TYPES.map(type => {
                    const actual = typeDistribution[type] || 0;
                    const optimal = optimalDistribution[type] || 0;
                    const diff = actual - optimal;
                    const isOk = Math.abs(diff) <= 1;

                    return (
                        <div key={type} className={`flex flex-col min-w-[90px] p-2 rounded-xl border transition-all ${
                            actual > 0 || optimal > 0 ? 'bg-neutral-800 border-neutral-700 shadow-lg' : 'bg-transparent border-neutral-800 opacity-40'
                        }`}>
                            <span className="text-[9px] font-black uppercase text-neutral-400 mb-1">{type}</span>
                            <div className="flex items-baseline justify-between">
                                <span className={`text-lg font-black ${actual > 0 ? 'text-white' : 'text-neutral-500'}`}>{actual}</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-neutral-500">/{optimal.toFixed(1)}</span>
                                    {(actual > 0 || optimal > 0) && (
                                        <span className={`text-[8px] font-black px-1 rounded ${
                                            isOk ? 'text-emerald-500 bg-emerald-500/10' : diff > 0 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10'
                                        }`}>
                                            {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
