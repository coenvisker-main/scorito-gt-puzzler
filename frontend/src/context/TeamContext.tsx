import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { TeamSlot, Renner, LineupStatus, RennerType, RennerTypeWeging, FormulaParams, TypeConfig, TEAM_SIZE } from '../types';
import { giro2026 } from '../data/giro2026';
import { calculateOptimalDistribution } from '../utils/formulaUtils';
import { STORAGE_KEYS } from '../utils/storageKeys';

interface TeamContextType {
  slots: TeamSlot[];
  budgetUsed: number;
  maxBudget: number;
  maxAffordablePrice: number;
  stageOverrides: Record<number, RennerTypeWeging[]>;
  updateSlot: (id: string, field: keyof TeamSlot, value: any) => void;
  selectRiderForSlot: (id: string, rider: Renner) => void;
  clearSlot: (id: string) => void;
  toggleLineup: (id: string, stageNumber: number) => void;
  updateStageWeights: (stageNumber: number, weights: RennerTypeWeging[]) => void;
  getOptimalDistribution: () => { slots: Record<RennerType, number>, tcsScores: Record<RennerType, number>, components: any };
  getTypeStatus: (type: RennerType) => 'under' | 'ok' | 'over';
  formulaParams: FormulaParams;
  typeConfigs: TypeConfig[];
  updateFormulaParams: (params: FormulaParams) => void;
  updateTypeConfigs: (configs: TypeConfig[]) => void;
  resetTeam: () => void;
  resetStageOverrides: () => void;
  resetFormulaConfigs: () => void;
  addRider: (rider: Renner) => boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const MAX_BUDGET = giro2026.budget;
const MIN_RIDER_PRICE = 500000;

const generateId = (index: number) => `slot-${index}`;

const createEmptySlot = (index: number): TeamSlot => ({
  id: generateId(index),
  name: '',
  team: '',
  price: 0,
  type: 'Wildcard',
  riderId: null,
  lineup: {}
});

const getInitialSlots = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return Array.from({ length: TEAM_SIZE }, (_, i) => {
                const existing = parsed[i] || {};
                return {
                    ...createEmptySlot(i),
                    ...existing,
                    id: generateId(i)
                };
            });
        } catch (e) {
            console.error("Failed to parse saved slots", e);
        }
    }
    return Array.from({ length: TEAM_SIZE }, (_, i) => createEmptySlot(i));
};

const getInitialOverrides = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.STAGE_OVERRIDES);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse stage overrides", e);
        }
    }
    return {};
};

const getInitialFormulaParams = (): FormulaParams => {
    const saved = localStorage.getItem(STORAGE_KEYS.FORMULA_PARAMS);
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            // Migration: if we have the old keys, convert them
            if ('alpha' in parsed) {
                return {
                    alpha_mult: 1.0,
                    beta_mult: 1.0,
                    gamma_mult: 1.0,
                    delta_mult: 1.0
                };
            }
            return parsed; 
        } catch (e) { 
            console.error(e); 
        }
    }
    return giro2026.formulaParams;
};

const getInitialTypeConfigs = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.TYPE_CONFIGS);
    if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return giro2026.typeConfigs;
};

export function TeamProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<TeamSlot[]>(getInitialSlots);
  const [stageOverrides, setStageOverrides] = useState<Record<number, RennerTypeWeging[]>>(getInitialOverrides);
  const [formulaParams, setFormulaParams] = useState<FormulaParams>(getInitialFormulaParams);
  const [typeConfigs, setTypeConfigs] = useState<TypeConfig[]>(getInitialTypeConfigs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STAGE_OVERRIDES, JSON.stringify(stageOverrides));
  }, [stageOverrides]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FORMULA_PARAMS, JSON.stringify(formulaParams));
  }, [formulaParams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TYPE_CONFIGS, JSON.stringify(typeConfigs));
  }, [typeConfigs]);

  const { budgetUsed, maxAffordablePrice } = useMemo(() => {
    const used = slots.reduce((sum, slot) => sum + (Number(slot.price) || 0), 0);
    const emptySlotsCount = slots.filter(s => (Number(s.price) || 0) === 0).length;
    
    // Max we can spend on ONE rider is: Remaining Budget - (Remaining Slots - 1) * 500k
    const remainingBudget = MAX_BUDGET - used;
    const affordable = emptySlotsCount > 0 
      ? remainingBudget - (emptySlotsCount - 1) * MIN_RIDER_PRICE 
      : 0;

    return { 
      budgetUsed: used, 
      maxAffordablePrice: Math.max(0, affordable) 
    };
  }, [slots]);

  const updateSlot = useCallback((id: string, field: keyof TeamSlot, value: any) => {
    setSlots(prev => prev.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  }, []);

  const selectRiderForSlot = useCallback((id: string, rider: Renner) => {
    setSlots(prev => prev.map(slot => 
      slot.id === id ? {
        ...slot,
        name: rider.naam,
        team: rider.ploeg,
        price: rider.prijs,
        type: rider.gebruiker_type || 'Wildcard',
        riderId: rider.id,
      } : slot
    ));
  }, []);

  const clearSlot = useCallback((id: string) => {
    setSlots(prev => prev.map(slot => 
      slot.id === id ? {
        ...slot,
        name: '',
        team: '',
        price: 0,
        type: 'Wildcard',
        riderId: null,
        lineup: {}
      } : slot
    ));
  }, []);

  const toggleLineup = useCallback((id: string, stageNumber: number) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id !== id) return slot;
      
      const currentStatus = slot.lineup[stageNumber] || '';
      let nextStatus: LineupStatus = '';
      if (currentStatus === '') nextStatus = 'X';
      else if (currentStatus === 'X') nextStatus = 'K';
      else nextStatus = '';

      return {
        ...slot,
        lineup: { ...slot.lineup, [stageNumber]: nextStatus }
      };
    }));
  }, []);

  const updateStageWeights = useCallback((stageNumber: number, weights: RennerTypeWeging[]) => {
    setStageOverrides(prev => ({
        ...prev,
        [stageNumber]: weights
    }));
  }, []);

  const getOptimalDistribution = useCallback(() => {
    return calculateOptimalDistribution(
        giro2026.etappes,
        stageOverrides,
        formulaParams,
        typeConfigs
    );
  }, [stageOverrides, formulaParams, typeConfigs]);

  const updateFormulaParams = useCallback((params: FormulaParams) => {
    setFormulaParams(params);
  }, []);

  const updateTypeConfigs = useCallback((configs: TypeConfig[]) => {
    setTypeConfigs(configs);
  }, []);

  const getTypeStatus = useCallback((type: RennerType) => {
    const actual = slots.reduce((count, slot) => (slot.name && slot.type === type) ? count + 1 : count, 0);
    const { slots: optimalSlots } = getOptimalDistribution();
    const optimal = optimalSlots[type] || 0;
    if (actual < optimal) return 'under';
    if (actual > optimal) return 'over';
    return 'ok';
  }, [slots, getOptimalDistribution]);

  const resetTeam = useCallback(() => {
    setSlots(Array.from({ length: TEAM_SIZE }, (_, i) => createEmptySlot(i)));
  }, []);

  const addRider = useCallback((rider: Renner) => {
    const emptySlot = slots.find(s => s.name.trim() === '');
    if (emptySlot) {
      selectRiderForSlot(emptySlot.id, rider);
      return true;
    }
    return false;
  }, [slots, selectRiderForSlot]);

  const resetFormulaConfigs = useCallback(() => {
    setFormulaParams(giro2026.formulaParams);
    setTypeConfigs(giro2026.typeConfigs);
  }, []);

  const resetStageOverrides = useCallback(() => {
    setStageOverrides({});
  }, []);

  return (
    <TeamContext.Provider value={{
      slots,
      budgetUsed,
      maxBudget: MAX_BUDGET,
      maxAffordablePrice,
      stageOverrides,
      updateSlot,
      selectRiderForSlot,
      clearSlot,
      toggleLineup,
      updateStageWeights,
      getOptimalDistribution,
      formulaParams,
      typeConfigs,
      updateFormulaParams,
      updateTypeConfigs,
      getTypeStatus,
      resetTeam,
      resetStageOverrides,
      resetFormulaConfigs,
      addRider
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
