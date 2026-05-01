import { useMemo, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { RennerType, TypeConfig } from '../types';
import { BarChart3, Info, AlertCircle } from 'lucide-react';
import { giro2026 } from '../data/giro2026';

const RENNER_TYPES: RennerType[] = ['GC', 'Klimmer', 'Sprinter', 'Sprint+', 'Aanvaller', 'Tijdrijder', 'Wildcard'];

interface DistributionSummaryProps {
    hideComparison?: boolean;
}

export function DistributionSummary({ hideComparison = false }: DistributionSummaryProps) {
    const { slots, getOptimalDistribution, formulaParams, updateFormulaParams } = useTeam();
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const typeDistribution = useMemo(() => {
        return slots.reduce((acc, slot) => {
            if (slot.name) {
                acc[slot.type] = (acc[slot.type] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [slots]);

    const { slots: optimalSlots, tcsScores, components } = useMemo(() => getOptimalDistribution(), [getOptimalDistribution]);

    const handleParamChange = (key: keyof typeof formulaParams, val: number) => {
        updateFormulaParams({ ...formulaParams, [key]: val });
    };

    const resetParams = () => {
        updateFormulaParams({ alpha_mult: 1.0, beta_mult: 1.0, gamma_mult: 1.0, delta_mult: 1.0 });
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-amber-500">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-[0.1em]">TCS Formule Analyse</span>
                    </div>
                    <button 
                        onClick={() => setIsGuideOpen(!isGuideOpen)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-[10px] font-black uppercase text-neutral-400 transition-all"
                    >
                        <Info className="w-3 h-3" />
                        {isGuideOpen ? 'Sluit Gids' : 'Formule Gids'}
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={resetParams}
                        className="text-[9px] font-black uppercase text-neutral-500 hover:text-amber-500 transition-colors"
                    >
                        Reset Formule
                    </button>
                    <span className="text-[10px] text-neutral-500 font-bold uppercase italic">Hamilton-allocatie</span>
                </div>
            </div>

            {/* Expandable Guide */}
            {isGuideOpen && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { 
                                id: 'α', 
                                title: 'Etappegewicht (α)', 
                                text: 'Bepaalt hoeveel gewicht de etappewinstkansen krijgen. Verhoog dit als je de teamverdeling puur op etappewinsten wil baseren.' 
                            },
                            { 
                                id: 'β', 
                                title: 'Kopman-bonus (β)', 
                                text: 'Bepaalt de waarde van het type dat vaak de beste kopmankeuze is. Hoe hoger β, hoe meer slots er naar types gaan die vaak als kopman dienen.' 
                            },
                            { 
                                id: 'γ', 
                                title: 'Trui-multiplier (γ)', 
                                text: 'Factor voor dagelijkse klassementsbonussen (D). Standaard gelijk aan het aantal etappes (21).' 
                            },
                            { 
                                id: 'δ', 
                                title: 'Eindklassement-gewicht (δ)', 
                                text: 'Bepaalt hoe zwaar de grote puntenbonussen na de laatste etappe meetellen ten opzichte van dagelijkse punten.' 
                            }
                        ].map(item => (
                            <div key={item.id} className="space-y-1">
                                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{item.title}</div>
                                <p className="text-[11px] leading-relaxed text-neutral-400">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sliders Grid */}
            <div className="space-y-4 pb-4 border-b border-neutral-800/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { 
                            label: 'Etappe-winst kans', 
                            sub: 'α (Gewicht)', 
                            key: 'alpha_mult', 
                            min: 0, 
                            max: 2, 
                            step: 0.1,
                            info: 'Hoe zwaar tellen dagelijkse winstkansen mee? (Base: 1.0)' 
                        },
                        { 
                            label: 'Kopman Waarde', 
                            sub: 'β (Gewicht)', 
                            key: 'beta_mult', 
                            min: 0, 
                            max: 2, 
                            step: 0.1,
                            info: 'Hoe zwaar weegt het mee dat een type vaak de beste kopmankeuze is? (Base: 15)' 
                        },
                        { 
                            label: 'Trui Punten', 
                            sub: 'γ (Gewicht)', 
                            key: 'gamma_mult', 
                            min: 0, 
                            max: 2, 
                            step: 0.1,
                            info: 'Hoe zwaar tellen dagelijkse klassementspunten mee over de hele ronde? (Base: 21)' 
                        },
                        { 
                            label: 'Eindklassement', 
                            sub: 'δ (Gewicht)', 
                            key: 'delta_mult', 
                            min: 0, 
                            max: 2, 
                            step: 0.1,
                            info: 'Hoe zwaar tellen de grote puntenbonussen na de laatste etappe mee? (Base: 1.0)' 
                        }
                    ].map(param => (
                        <div key={param.key} className="flex flex-col gap-2 group">
                            <div className="flex justify-between items-start px-1">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-[10px] font-black uppercase text-white tracking-tight">{param.label}</label>
                                        <div title={param.info} className="cursor-help text-neutral-600 hover:text-amber-500 transition-colors">
                                            <Info className="w-3 h-3" />
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-bold text-neutral-500 uppercase">{param.sub}</span>
                                </div>
                                <span className="text-xs font-mono font-black text-amber-500">{((formulaParams as any)[param.key] || 1.0).toFixed(1)}x</span>
                            </div>
                            <input 
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={(formulaParams as any)[param.key]}
                                onChange={(e) => handleParamChange(param.key as any, parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                    <AlertCircle className="w-3 h-3 text-amber-500/50" />
                    <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                        De onderlinge verhouding tussen de schuifjes bepaalt het resultaat.
                    </p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {RENNER_TYPES.map(type => {
                    const actual = typeDistribution[type] || 0;
                    const optimal = optimalSlots[type] || 0;
                    const diff = actual - optimal;
                    const isOk = Math.abs(diff) < 0.1;

                    // Breakdown for tooltip
                    const W = components.W[type] || 0;
                    const K = components.K[type] || 0;
                    const config = giro2026.typeConfigs.find((c: TypeConfig) => c.type === type) || { daily_klassement_bonus: 0, expected_eindklassement: 0 };
                    const score = tcsScores[type] || 0;

                    const breakdown = `
TCS Score Breakdown (${type}):
----------------------------
W(t) × α: ${(W * formulaParams.alpha_mult * 1.0).toFixed(1)}
K(t) × β: ${(K * formulaParams.beta_mult * 15).toFixed(1)}
D(t) × γ: ${(config.daily_klassement_bonus * formulaParams.gamma_mult * 21).toFixed(1)}
End(t) × δ: ${(config.expected_eindklassement * formulaParams.delta_mult * 1.0).toFixed(1)}
----------------------------
Total TCS: ${score.toFixed(1)}
                    `.trim();

                    return (
                        <div 
                            key={type} 
                            title={breakdown}
                            className={`flex flex-col min-w-[95px] p-2 rounded-xl border transition-all cursor-help ${
                                hideComparison 
                                    ? (optimal > 0 ? 'bg-neutral-800 border-amber-500/30' : 'bg-transparent border-neutral-800 opacity-20')
                                    : (actual > 0 || optimal > 0 ? 'bg-neutral-800 border-neutral-700 shadow-lg hover:border-amber-500/50' : 'bg-transparent border-neutral-800 opacity-40')
                            }`}
                        >
                            <span className="text-[9px] font-black uppercase text-neutral-400 mb-1">{type}</span>
                            <div className="flex items-baseline justify-between">
                                {hideComparison ? (
                                    <div className="flex flex-col">
                                        <span className="text-lg font-black text-white">{optimal}</span>
                                        <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Advies</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className={`text-lg font-black ${actual > 0 ? 'text-white' : 'text-neutral-500'}`}>{actual}</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold text-neutral-500">/{optimal}</span>
                                            {(actual > 0 || optimal > 0) && (
                                                <span className={`text-[8px] font-black px-1 rounded ${
                                                    isOk ? 'text-emerald-500 bg-emerald-500/10' : diff > 0 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10'
                                                }`}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
