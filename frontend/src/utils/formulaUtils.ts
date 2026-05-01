import { Etappe, RennerType, RennerTypeWeging, FormulaParams, TypeConfig } from '../types';

const TYPE_PRIORITY: RennerType[] = ['GC', 'Klimmer', 'Aanvaller', 'Sprint+', 'Sprinter', 'Tijdrijder', 'Wildcard'];

export function calculateOptimalDistribution(
  etappes: Etappe[],
  stageOverrides: Record<number, RennerTypeWeging[]>,
  params: FormulaParams,
  configs: TypeConfig[],
  teamSize: number = 20
): { slots: Record<RennerType, number>, tcsScores: Record<RennerType, number>, components: any } {
  const tcsScores: Record<RennerType, number> = {
    'GC': 0, 'Klimmer': 0, 'Sprinter': 0, 'Sprint+': 0, 'Aanvaller': 0, 'Tijdrijder': 0, 'Wildcard': 0
  };

  // Step 1 & 2: Calculate W(t) and K(t)
  const W: Record<RennerType, number> = { 'GC': 0, 'Klimmer': 0, 'Sprinter': 0, 'Sprint+': 0, 'Aanvaller': 0, 'Tijdrijder': 0, 'Wildcard': 0 };
  const K: Record<RennerType, number> = { 'GC': 0, 'Klimmer': 0, 'Sprinter': 0, 'Sprint+': 0, 'Aanvaller': 0, 'Tijdrijder': 0, 'Wildcard': 0 };

  etappes.forEach(stage => {
    const weights = stageOverrides[stage.nummer] || stage.wegingen;
    
    // W(t) calculation
    weights.forEach(w => {
      W[w.type] += (w.gewicht * 100);
    });

    // K(t) calculation (Optimal Captain)
    let maxWeight = -1;
    let bestType: RennerType | null = null;

    // First find the max weight
    weights.forEach(w => {
      if (w.gewicht > maxWeight) {
        maxWeight = w.gewicht;
      }
    });

    if (maxWeight > 0) {
      // Find all types with this max weight
      const topTypes = weights.filter(w => w.gewicht === maxWeight).map(w => w.type);
      
      // Tie-breaking based on priority list
      for (const priorityType of TYPE_PRIORITY) {
        if (topTypes.includes(priorityType)) {
          bestType = priorityType;
          break;
        }
      }

      if (bestType) {
        K[bestType]++;
      }
    }
  });

  // Step 3 & 4: Calculate final TCS per type
  const types = Object.keys(tcsScores) as RennerType[];
  const ALPHA_BASE = 1.0;
  const BETA_BASE = 15;
  const GAMMA_BASE = 21; // standard round length
  const DELTA_BASE = 1.0;

  types.forEach(t => {
    const config = configs.find((c: TypeConfig) => c.type === t) || { daily_klassement_bonus: 0, expected_eindklassement: 0 };
    
    tcsScores[t] = 
      (W[t] * params.alpha_mult * ALPHA_BASE) + 
      (K[t] * params.beta_mult * BETA_BASE) + 
      (config.daily_klassement_bonus * params.gamma_mult * GAMMA_BASE) + 
      (config.expected_eindklassement * params.delta_mult * DELTA_BASE);
  });

  const totalTCS = Object.values(tcsScores).reduce((a, b) => a + b, 0);
  if (totalTCS === 0) return { slots: tcsScores as any, tcsScores, components: { W, K } };

  // Step 5: Raw slots
  const rawSlots: Record<RennerType, number> = {} as any;
  types.forEach(t => {
    rawSlots[t] = teamSize * (tcsScores[t] / totalTCS);
  });

  // Step 6: Hamilton / Largest Remainder Rounding
  let slots: Record<RennerType, number> = {} as any;
  const residuals: { type: RennerType, res: number }[] = [];

  types.forEach(t => {
    slots[t] = Math.floor(rawSlots[t]);
    residuals.push({ type: t, res: rawSlots[t] - slots[t] });
  });

  let currentTotal = Object.values(slots).reduce((a, b) => a + b, 0);
  let remaining = teamSize - currentTotal;

  // Sort residuals descending
  residuals.sort((a, b) => {
    if (b.res !== a.res) return b.res - a.res;
    // Tie-break: highest TCS
    return tcsScores[b.type] - tcsScores[a.type];
  });

  for (let i = 0; i < remaining; i++) {
    slots[residuals[i].type]++;
  }

  // Step 7: Business Rules / Corrections
  // Rule 1: Min slots per type with K(t) > 0
  types.forEach(t => {
    if (K[t] > 0 && slots[t] < 1) {
      slots[t] = 1;
      // Subtract from type with most slots
      const mostSlotsType = types.reduce((a, b) => slots[a] > slots[b] ? a : b);
      slots[mostSlotsType]--;
    }
  });

  // Rule 2: Min slots for GC
  if (slots['GC'] < 2) {
    const diff = 2 - slots['GC'];
    slots['GC'] = 2;
    for (let i = 0; i < diff; i++) {
        const mostSlotsType = types.reduce((a, b) => (slots[a] > slots[b] && a !== 'GC') ? a : b);
        slots[mostSlotsType]--;
    }
  }

  // Rule 3: Max slots per type (6)
  types.forEach(t => {
    if (slots[t] > 6) {
      const diff = slots[t] - 6;
      slots[t] = 6;
      // Add to type with fewest slots and not exceeding 6
      for (let i = 0; i < diff; i++) {
          const targetType = types.reduce((a, b) => (slots[a] < slots[b] && slots[a] < 6) ? a : b);
          slots[targetType]++;
      }
    }
  });

  return { slots, tcsScores, components: { W, K } };
}

export function calculateRecommendedCaptain(weights: RennerTypeWeging[]): { type: RennerType, weight: number } | null {
  let maxWeight = -1;
  weights.forEach(w => {
    if (w.gewicht > maxWeight) maxWeight = w.gewicht;
  });

  if (maxWeight <= 0) return null;

  const topTypes = weights.filter(w => w.gewicht === maxWeight).map(w => w.type);
  for (const priorityType of TYPE_PRIORITY) {
    if (topTypes.includes(priorityType)) {
      return { type: priorityType, weight: maxWeight };
    }
  }

  return null;
}
