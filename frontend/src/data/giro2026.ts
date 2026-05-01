import stagesData from './stages.json';
import { Ronde, Etappe, RennerTypeWeging } from '../types';

function defaultWegingen(type: string): RennerTypeWeging[] {
  if (type === 'vlak') {
    return [
      { type: 'Sprinter', gewicht: 0.6 },
      { type: 'Sprint+', gewicht: 0.3 },
      { type: 'GC', gewicht: 0.1 },
      { type: 'Aanvaller', gewicht: 0.0 },
      { type: 'Klimmer', gewicht: 0.0 },
      { type: 'Tijdrijder', gewicht: 0.0 },
      { type: 'Wildcard', gewicht: 0.0 }
    ];
  }
  if (type === 'tijdrit') {
    return [
      { type: 'Tijdrijder', gewicht: 0.8 },
      { type: 'GC', gewicht: 0.2 },
      { type: 'Sprinter', gewicht: 0.0 },
      { type: 'Sprint+', gewicht: 0.0 },
      { type: 'Aanvaller', gewicht: 0.0 },
      { type: 'Klimmer', gewicht: 0.0 },
      { type: 'Wildcard', gewicht: 0.0 }
    ];
  }
  if (type === 'bergen') {
      return [
        { type: 'Klimmer', gewicht: 0.5 },
        { type: 'GC', gewicht: 0.4 },
        { type: 'Aanvaller', gewicht: 0.1 },
        { type: 'Sprinter', gewicht: 0.0 },
        { type: 'Sprint+', gewicht: 0.0 },
        { type: 'Tijdrijder', gewicht: 0.0 },
        { type: 'Wildcard', gewicht: 0.0 }
      ];
  }
  // heuvels
  return [
    { type: 'Aanvaller', gewicht: 0.4 },
    { type: 'Sprint+', gewicht: 0.3 },
    { type: 'GC', gewicht: 0.2 },
    { type: 'Klimmer', gewicht: 0.1 },
    { type: 'Sprinter', gewicht: 0.0 },
    { type: 'Tijdrijder', gewicht: 0.0 },
    { type: 'Wildcard', gewicht: 0.0 }
  ];
}

const STAGE_OVERRIDES: Record<number, RennerTypeWeging[]> = {
  1: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.9}, {type: 'Sprint+', gewicht: 0.1}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  2: [{type: 'GC', gewicht: 0.3}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.1}, {type: 'Klimmer', gewicht: 0.2}, {type: 'Aanvaller', gewicht: 0.4}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  3: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.55}, {type: 'Sprint+', gewicht: 0.45}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  4: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.3}, {type: 'Klimmer', gewicht: 0.4}, {type: 'Aanvaller', gewicht: 0.3}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  5: [{type: 'GC', gewicht: 0.3}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.2}, {type: 'Klimmer', gewicht: 0.25}, {type: 'Aanvaller', gewicht: 0.25}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  6: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.9}, {type: 'Sprint+', gewicht: 0.1}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  7: [{type: 'GC', gewicht: 0.7}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.0}, {type: 'Klimmer', gewicht: 0.3}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  8: [{type: 'GC', gewicht: 0.2}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.1}, {type: 'Klimmer', gewicht: 0.2}, {type: 'Aanvaller', gewicht: 0.5}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  9: [{type: 'GC', gewicht: 0.55}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.0}, {type: 'Klimmer', gewicht: 0.4}, {type: 'Aanvaller', gewicht: 0.05}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  10: [{type: 'GC', gewicht: 0.3}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.0}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.7}, {type: 'Wildcard', gewicht: 0.0}],
  11: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.2}, {type: 'Klimmer', gewicht: 0.4}, {type: 'Aanvaller', gewicht: 0.4}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  12: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.3}, {type: 'Sprint+', gewicht: 0.6}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.1}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  13: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.5}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.5}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  14: [{type: 'GC', gewicht: 0.6}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.0}, {type: 'Klimmer', gewicht: 0.4}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  15: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.9}, {type: 'Sprint+', gewicht: 0.1}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  16: [{type: 'GC', gewicht: 0.6}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.0}, {type: 'Klimmer', gewicht: 0.4}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  17: [{type: 'GC', gewicht: 0.1}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.1}, {type: 'Klimmer', gewicht: 0.4}, {type: 'Aanvaller', gewicht: 0.4}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  18: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.1}, {type: 'Sprint+', gewicht: 0.4}, {type: 'Klimmer', gewicht: 0.1}, {type: 'Aanvaller', gewicht: 0.4}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  19: [{type: 'GC', gewicht: 0.8}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.0}, {type: 'Klimmer', gewicht: 0.2}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  20: [{type: 'GC', gewicht: 0.6}, {type: 'Sprinter', gewicht: 0.0}, {type: 'Sprint+', gewicht: 0.0}, {type: 'Klimmer', gewicht: 0.4}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
  21: [{type: 'GC', gewicht: 0.0}, {type: 'Sprinter', gewicht: 0.9}, {type: 'Sprint+', gewicht: 0.1}, {type: 'Klimmer', gewicht: 0.0}, {type: 'Aanvaller', gewicht: 0.0}, {type: 'Tijdrijder', gewicht: 0.0}, {type: 'Wildcard', gewicht: 0.0}],
};

const etappes: Etappe[] = (stagesData as any[]).map(s => ({
  ...s,
  afbeelding: `https://cdn.touretappe.nl/images/giro/2026/etappe-${s.nummer}-profiel.jpg`,
  wegingen: STAGE_OVERRIDES[s.nummer] || defaultWegingen(s.terreintype)
}));

export const giro2026: Ronde = {
  id: 'giro-2026',
  naam: "Giro d'Italia",
  jaar: 2026,
  budget: 42000000,
  status: 'aankomend',
  etappes: etappes,
  renners: [],
  formulaParams: {
    alpha_mult: 1.0,
    beta_mult: 1.0,
    gamma_mult: 1.0,
    delta_mult: 1.0
  },
  typeConfigs: [
    { type: 'GC', daily_klassement_bonus: 8, expected_eindklassement: 100 },
    { type: 'Sprinter', daily_klassement_bonus: 6, expected_eindklassement: 60 },
    { type: 'Sprint+', daily_klassement_bonus: 4, expected_eindklassement: 20 },
    { type: 'Klimmer', daily_klassement_bonus: 2, expected_eindklassement: 20 },
    { type: 'Aanvaller', daily_klassement_bonus: 0, expected_eindklassement: 2 },
    { type: 'Tijdrijder', daily_klassement_bonus: 0, expected_eindklassement: 0 },
    { type: 'Wildcard', daily_klassement_bonus: 10, expected_eindklassement: 24 }
  ]
};
