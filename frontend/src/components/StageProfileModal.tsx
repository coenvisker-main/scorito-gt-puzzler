import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Mountain, Image as ImageIcon, Save, Undo } from 'lucide-react';
import { Etappe, RennerType, RennerTypeWeging, RENNER_TYPES } from '../types';

interface StageProfileModalProps {
    stage: Etappe | null;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    currentWeights: RennerTypeWeging[];
    onSaveWeights: (weights: RennerTypeWeging[]) => void;
}

export function StageProfileModal({ stage, onClose, onNext, onPrev, currentWeights, onSaveWeights }: StageProfileModalProps) {
    const [tempWeights, setTempWeights] = useState<RennerTypeWeging[]>([]);

    useEffect(() => {
        if (stage) {
            setTempWeights([...currentWeights]);
        }
    }, [stage, currentWeights]);

    if (!stage) return null;

    const handleWeightChange = (type: RennerType, value: string) => {
        const val = parseFloat(value) || 0;
        setTempWeights(prev => prev.map(w => w.type === type ? { ...w, gewicht: Math.max(0, val) } : w));
    };

    const handleSave = () => {
        onSaveWeights(tempWeights);
        onClose();
    };

    const handleNextStage = () => {
        onSaveWeights(tempWeights);
        onNext();
    };

    const handlePrevStage = () => {
        onSaveWeights(tempWeights);
        onPrev();
    };

    const hasChanges = JSON.stringify(tempWeights) !== JSON.stringify(currentWeights);

    // Provide a dummy placeholder if no afbeelding is provided. The user can add real URLs in the data later.
    const imageSrc = stage.afbeelding || 'https://images.unsplash.com/photo-1541252119253-0669ce4ffc97?q=80&w=2000&auto=format&fit=crop'; // fallback mountain profile dummy

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-0" onClick={onClose}></div>

            <div
                className="bg-neutral-900 border border-neutral-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header elements */}
                <div className="p-6 pb-4 bg-neutral-900 border-b border-neutral-800 flex justify-between items-start">
                    <div>
                        <div className="text-amber-500 font-black tracking-widest uppercase text-xs sm:text-sm mb-1 drop-shadow-md">
                            Etappe {stage.nummer.toString().padStart(2, '0')}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter drop-shadow-xl">
                            {stage.startplaats} <span className="text-neutral-500 font-light mx-2">&rarr;</span> {stage.finishplaats}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className="px-2.5 py-1 bg-neutral-800 rounded text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                                {stage.afstand.toFixed(1)} km
                            </span>
                            {stage.hoogteverschil && (
                                <span className="px-2.5 py-1 bg-neutral-800 rounded text-[10px] font-bold text-neutral-300 flex items-center gap-1.5 uppercase">
                                    <Mountain size={12} className="text-amber-500" />
                                    {stage.hoogteverschil} m
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-colors flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Profile Image View */}
                <div className="relative w-full h-[25vh] sm:h-[45vh] bg-[#f8f9fa] flex items-center justify-center p-1 sm:p-4 rounded-b-none border-b border-neutral-300">
                    <img 
                        src={imageSrc} 
                        alt={`Profiel etappe ${stage.nummer}`} 
                        className="w-full h-full object-contain" 
                    />
                    
                    {/* Navigation Arrows */}
                    <button onClick={handlePrevStage} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/80 hover:bg-white text-neutral-800 rounded-full shadow-lg backdrop-blur transition-all hover:scale-110 border border-neutral-200 z-10">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleNextStage} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/80 hover:bg-white text-neutral-800 rounded-full shadow-lg backdrop-blur transition-all hover:scale-110 border border-neutral-200 z-10">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Weights Editor Area */}
                <div className="p-4 sm:p-6 bg-neutral-900 flex flex-col gap-4 sm:gap-6 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <span>Weging Configureren</span>
                        </h3>
                        {hasChanges && (
                            <button onClick={() => setTempWeights([...currentWeights])} className="text-[10px] sm:text-xs font-bold text-neutral-500 hover:text-white flex items-center gap-1 transition-colors">
                                <Undo size={14} /> Herstellen
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
                        {RENNER_TYPES.map(type => {
                            const w = tempWeights.find(tw => tw.type === type);
                            const val = w?.gewicht || 0;
                            const pct = Math.round(val * 100);

                            return (
                                <div key={type} className="flex flex-col gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800 relative overflow-hidden">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">{type}</label>
                                        <span className={`text-sm font-black ${val > 0 ? 'text-amber-400' : 'text-neutral-600'}`}>{pct}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.05"
                                        value={val}
                                        onChange={(e) => handleWeightChange(type, e.target.value)}
                                        className="w-full h-2 sm:h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    {/* Quick + / - buttons can go here if needed, but slider is nice */}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSave}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                                hasChanges 
                                ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105'
                                : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                            }`}
                        >
                            <Save size={18} />
                            {hasChanges ? 'Opslaan & Sluiten' : 'Sluiten'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
