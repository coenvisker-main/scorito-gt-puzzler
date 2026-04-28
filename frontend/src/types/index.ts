export type RennerType = 'GC' | 'Sprinter' | 'Sprint+' | 'Klimmer' | 'Aanvaller' | 'Tijdrijder' | 'Wildcard';

export interface RennerTypeWeging {
  type: RennerType;
  gewicht: number; // 0.0 to 1.0 (som = 1.0)
}

export interface Etappe {
  nummer: number;
  datum: string;
  startplaats: string;
  finishplaats: string;
  afstand: number;
  terreintype: string;
  hoogteverschil?: number;
  beschrijving?: string;
  afbeelding?: string;
  weging_tijdrit: boolean;
  wegingen: RennerTypeWeging[];
}

export interface Renner {
  id: string;
  naam: string;
  ploeg: string;
  scorito_categorie: string;
  gebruiker_type: RennerType;
  prijs: number;
  is_actief: boolean;
}

// Lineup state for a single stage
export type LineupStatus = '' | 'X' | 'K';

export interface TeamSlot {
  id: string; // unique slot id
  name: string;
  team: string;
  price: number;
  type: RennerType;
  riderId: string | null;
  lineup: Record<number, LineupStatus>; // stageNumber -> status
}

export interface Ronde {
  id: string;
  naam: string;
  jaar: number;
  budget: number;
  status: 'aankomend' | 'actief' | 'afgelopen';
  etappes: Etappe[];
  renners: Renner[];
}
