import { useState } from 'react';
import { Ronde, RennerType } from '../types';
import { useTeam } from '../context/TeamContext';
import { calculateRecommendedCaptain } from '../utils/formulaUtils';
import { Mountain, ArrowRight, Timer, Map, Layers, Info, Trophy, Eye } from 'lucide-react';
import { StageProfileModal } from './StageProfileModal';
import { DistributionSummary } from './DistributionSummary';

interface StageListProps {
  ronde: Ronde;
}



function getTerreinStyles(terreintype: string) {
  if (terreintype === 'bergen') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (terreintype === 'heuvels') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (terreintype === 'tijdrit') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
}

export function StageList({ ronde }: StageListProps) {
  const { stageOverrides, updateStageWeights } = useTeam();
  const [activeStageNum, setActiveStageNum] = useState<number | null>(null);

  const activeStage = ronde.etappes.find(e => e.nummer === activeStageNum) || null;
  const activeStageIndex = activeStage ? ronde.etappes.findIndex(e => e.nummer === activeStageNum) : -1;

  const handleNext = () => {
      if (activeStageIndex < ronde.etappes.length - 1) {
          setActiveStageNum(ronde.etappes[activeStageIndex + 1].nummer);
      }
  };

  const handlePrev = () => {
      if (activeStageIndex > 0) {
          setActiveStageNum(ronde.etappes[activeStageIndex - 1].nummer);
      }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto">
      {/* Ronde Header Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <Trophy className="w-64 h-64 rotate-12" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">{ronde.naam} {ronde.jaar}</h2>
          <div className="flex flex-wrap items-center gap-6 mt-6">
            <div className="flex items-center gap-3 bg-neutral-800/50 px-4 py-2 rounded-xl border border-neutral-700/50 backdrop-blur-md">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-neutral-200 uppercase tracking-widest">{ronde.etappes.length} Etappes</span>
            </div>
            <div className="flex items-center gap-3 bg-neutral-800/50 px-4 py-2 rounded-xl border border-neutral-700/50 backdrop-blur-md">
              <Map className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black text-neutral-200 uppercase tracking-widest">
                {ronde.etappes.reduce((sum, e) => sum + e.afstand, 0).toFixed(0)} KM Totaal
              </span>
            </div>
            <div className="flex items-center gap-3 bg-neutral-800/50 px-4 py-2 rounded-xl border border-neutral-700/50 backdrop-blur-md">
              <Timer className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black text-neutral-200 uppercase tracking-widest">Giro d'Italia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
            <p className="font-bold uppercase tracking-wider text-amber-400">Parcours Analyse (US-03)</p>
            <p className="opacity-80">Pas hieronder de wegingen per etappe aan. Deze wegingen worden gebruikt door de Teambuilder om de optimale balans van je team te berekenen. Je kunt boven de 100% gaan om extra belang aan een etappe te geven.</p>
        </div>
      </div>

      {/* Live Distribution Summary */}
      <DistributionSummary hideComparison={true} />

      <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-neutral-400 uppercase font-black tracking-widest bg-neutral-950 border-b border-neutral-800">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Datum</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4 text-right">Afstand</th>
                <th className="px-6 py-4 text-right">Hoogte</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4">Kopman Advies</th>
                <th className="px-6 py-4 text-right">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {ronde.etappes.map((etappe) => {
                const weights = stageOverrides[etappe.nummer] || etappe.wegingen;
                const totalWeight = weights.reduce((sum, w) => sum + w.gewicht, 0);

                return (
                  <tr key={etappe.nummer} className="transition-colors group hover:bg-neutral-800/60 cursor-pointer" onClick={() => setActiveStageNum(etappe.nummer)}>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-500 font-black group-hover:text-amber-400 transition-colors">
                      {etappe.nummer.toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[11px] text-neutral-400 font-bold uppercase tracking-tight italic">
                      {new Date(etappe.datum).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-white font-black text-sm tracking-tight">
                        <span>{etappe.startplaats}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                        <span>{etappe.finishplaats}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-neutral-300 font-bold">
                      {etappe.afstand.toFixed(1)}<span className="text-[9px] ml-1 text-neutral-500 uppercase font-black">km</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(etappe.hoogteverschil ?? 0) > 0 ? (
                        <div className="inline-flex items-center gap-1.5 text-neutral-200 font-mono text-xs font-bold">
                          <Mountain className="w-3.5 h-3.5 text-neutral-500" />
                          {(etappe.hoogteverschil ?? 0).toLocaleString()}
                          <span className="text-[9px] text-neutral-500 font-black uppercase">m</span>
                        </div>
                      ) : (
                        <span className="text-neutral-700 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-tighter ${getTerreinStyles(etappe.terreintype)}`}>
                        {etappe.terreintype}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const rec = calculateRecommendedCaptain(weights);
                        if (!rec) return <span className="text-neutral-700 text-[10px]">-</span>;
                        return (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-amber-500 uppercase tracking-tighter">{rec.type}</span>
                            <span className="text-[9px] text-neutral-500 font-bold">{(rec.weight * 100).toFixed(0)}% kans</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveStageNum(etappe.nummer);
                            }}
                            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-neutral-800 text-neutral-300 hover:text-amber-500 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                            title="Bekijk Profiel & Wegingen"
                          >
                            <Eye className="w-4 h-4" />
                            Bekijk
                          </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {ronde.etappes.map((etappe) => {
          const weights = stageOverrides[etappe.nummer] || etappe.wegingen;
          return (
            <div 
              key={etappe.nummer} 
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg active:scale-[0.98] transition-all"
              onClick={() => setActiveStageNum(etappe.nummer)}
            >
              <div className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-neutral-950 rounded-lg text-xs font-black text-amber-500 border border-neutral-800">
                      {etappe.nummer}
                    </span>
                    <div>
                      <div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest leading-none mb-1">
                        {new Date(etappe.datum).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className={`inline-block px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-tighter ${getTerreinStyles(etappe.terreintype)}`}>
                        {etappe.terreintype}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 bg-neutral-800 rounded-lg text-neutral-400">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm font-black text-white italic tracking-tight">
                  <span className="truncate">{etappe.startplaats}</span>
                  <ArrowRight className="w-3 h-3 text-neutral-700 shrink-0" />
                  <span className="truncate">{etappe.finishplaats}</span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-tight">Focus:</span>
                    <span className="text-xs font-black text-white uppercase italic">{etappe.terreintype}</span>
                  </div>
                  {(() => {
                    const rec = calculateRecommendedCaptain(weights);
                    if (!rec) return null;
                    return (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                         <span className="text-[8px] font-black text-amber-500/60 uppercase">Kopman</span>
                         <span className="text-[11px] font-black text-amber-500 uppercase italic tracking-tighter">{rec.type}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <StageProfileModal
        stage={activeStage}
        onClose={() => setActiveStageNum(null)}
        onNext={handleNext}
        onPrev={handlePrev}
        currentWeights={activeStage ? (stageOverrides[activeStage.nummer] || activeStage.wegingen) : []}
        onSaveWeights={(weights) => {
            if (activeStage) {
                updateStageWeights(activeStage.nummer, weights);
            }
        }}
      />
    </div>
  );
}
