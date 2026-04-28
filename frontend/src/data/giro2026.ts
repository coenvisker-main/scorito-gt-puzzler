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

const etappes: Etappe[] = (stagesData as any[]).map(s => ({
  ...s,
  afbeelding: `https://cdn.touretappe.nl/images/giro/2026/etappe-${s.nummer}-profiel.jpg`,
  wegingen: defaultWegingen(s.terreintype)
}));

export const giro2026: Ronde = {
  id: 'giro-2026',
  naam: "Giro d'Italia",
  jaar: 2026,
  budget: 52000000,
  status: 'aankomend',
  etappes: etappes,
  renners: []
};
