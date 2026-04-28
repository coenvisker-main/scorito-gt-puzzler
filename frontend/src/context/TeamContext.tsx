import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { TeamSlot, Renner, LineupStatus, RennerType, RennerTypeWeging } from '../types';
import { giro2026 } from '../data/giro2026';

interface TeamContextType {
  slots: TeamSlot[];
  budgetUsed: number;
  maxBudget: number;
  stageOverrides: Record<number, RennerTypeWeging[]>;
  updateSlot: (id: string, field: keyof TeamSlot, value: any) => void;
  selectRiderForSlot: (id: string, rider: Renner) => void;
  clearSlot: (id: string) => void;
  toggleLineup: (id: string, stageNumber: number) => void;
  updateStageWeights: (stageNumber: number, weights: RennerTypeWeging[]) => void;
  getOptimalDistribution: () => Record<RennerType, number>;
  resetTeam: () => void;
  addRider: (rider: Renner) => boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const MAX_BUDGET = 52000000;
const SLOTS_COUNT = 20;

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
    const saved = localStorage.getItem('scorito_gt_slots');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return Array.from({ length: SLOTS_COUNT }, (_, i) => {
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
    return Array.from({ length: SLOTS_COUNT }, (_, i) => createEmptySlot(i));
};

const getInitialOverrides = () => {
    const saved = localStorage.getItem('scorito_gt_overrides');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse stage overrides", e);
        }
    }
    return {};
};

export function TeamProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<TeamSlot[]>(getInitialSlots);
  const [stageOverrides, setStageOverrides] = useState<Record<number, RennerTypeWeging[]>>(getInitialOverrides);

  useEffect(() => {
    localStorage.setItem('scorito_gt_slots', JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem('scorito_gt_overrides', JSON.stringify(stageOverrides));
  }, [stageOverrides]);

  const budgetUsed = useMemo(() => {
    return slots.reduce((sum, slot) => sum + (Number(slot.price) || 0), 0);
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
    const totals: Record<RennerType, number> = {
        'GC': 0, 'Klimmer': 0, 'Sprinter': 0, 'Sprint+': 0, 'Aanvaller': 0, 'Tijdrijder': 0, 'Wildcard': 0
    };
    let globalSum = 0;

    giro2026.etappes.forEach(stage => {
        const weights = stageOverrides[stage.nummer] || stage.wegingen;
        weights.forEach(w => {
            totals[w.type] += w.gewicht;
            globalSum += w.gewicht;
        });
    });

    const distribution: any = {};
    Object.keys(totals).forEach(key => {
        const type = key as RennerType;
        distribution[type] = globalSum > 0 ? (totals[type] / globalSum) * 20 : 0;
    });

    return distribution;
  }, [stageOverrides]);

  const resetTeam = useCallback(() => {
    if (window.confirm("Weet je zeker dat je je team wilt wisselen?")) {
      setSlots(Array.from({ length: SLOTS_COUNT }, (_, i) => createEmptySlot(i)));
      setStageOverrides({}); // Optional: also reset overrides? User probably just wants team reset.
      // Keeping overrides for now as they are "parcours analysis".
    }
  }, []);

  const addRider = useCallback((rider: Renner) => {
    const emptySlot = slots.find(s => s.name.trim() === '');
    if (emptySlot) {
      selectRiderForSlot(emptySlot.id, rider);
      return true;
    }
    return false;
  }, [slots, selectRiderForSlot]);

  return (
    <TeamContext.Provider value={{
      slots,
      budgetUsed,
      maxBudget: MAX_BUDGET,
      stageOverrides,
      updateSlot,
      selectRiderForSlot,
      clearSlot,
      toggleLineup,
      updateStageWeights,
      getOptimalDistribution,
      resetTeam,
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
