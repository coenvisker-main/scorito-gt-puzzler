export type RennerType = 'GC' | 'Sprinter' | 'Sprint+' | 'Klimmer' | 'Aanvaller' | 'Tijdrijder' | 'Wildcard';

export const RENNER_TYPES: RennerType[] = ['GC', 'Klimmer', 'Sprinter', 'Sprint+', 'Aanvaller', 'Tijdrijder', 'Wildcard'];

export const TEAM_SIZE = 20;

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
  is_jongere: boolean;
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

export interface FormulaParams {
  alpha_mult: number;
  beta_mult: number;
  gamma_mult: number;
  delta_mult: number;
}

export interface TypeConfig {
  type: RennerType;
  daily_klassement_bonus: number;
  expected_eindklassement: number;
}

export interface Ronde {
  id: string;
  naam: string;
  jaar: number;
  budget: number;
  status: 'aankomend' | 'actief' | 'afgelopen';
  etappes: Etappe[];
  renners: Renner[];
  formulaParams: FormulaParams;
  typeConfigs: TypeConfig[];
}
