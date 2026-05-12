import { TeamSlot } from '../types';

export interface StageBaseScore {
  punten_etappe: number;
  punten_gc: number;
  punten_punten: number;
  punten_kom: number;
  punten_jong: number;
}

export interface JerseyHolders {
  stageWinner?: { riderId: string; team: string };
  gc?: { riderId: string; team: string };
  punten?: { riderId: string; team: string };
  kom?: { riderId: string; team: string };
  jong?: { riderId: string; team: string };
}

export interface SlotStageScore {
  punten_etappe: number;
  punten_gc: number;
  punten_punten: number;
  punten_kom: number;
  punten_jong: number;
  punten_team: number;
  punten_kopman_bonus: number;
  totaal: number;
  opgesteld: boolean;
}

export interface PersonalizedScoreResult {
  perSlot: Record<string, Record<number, SlotStageScore>>;
  perStage: Record<number, {
    score_opgesteld: number;
    score_max_mogelijk: number;
  }>;
}

const NULL_SCORE: StageBaseScore = {
  punten_etappe: 0,
  punten_gc: 0,
  punten_punten: 0,
  punten_kom: 0,
  punten_jong: 0,
};

// Ordered highest → lowest for "alleen hoogste trui" rule
const JERSEY_HIERARCHY: Array<{ key: keyof Omit<JerseyHolders, 'stageWinner'>; punten: number }> = [
  { key: 'gc',     punten: 8 },
  { key: 'punten', punten: 6 },
  { key: 'kom',    punten: 6 },
  { key: 'jong',   punten: 3 },
];

function calcTeamPoints(slotTeam: string, jerseys: JerseyHolders): number {
  let total = 0;

  // Stage win bonus — separate from jersey hierarchy
  if (jerseys.stageWinner?.team === slotTeam) {
    total += 10;
  }

  // Build riderId → highest jersey points map (ordered highest→lowest, first entry wins)
  const riderHighestPts: Record<string, number> = {};
  for (const { key, punten } of JERSEY_HIERARCHY) {
    const holder = jerseys[key];
    if (!holder) continue;
    if (riderHighestPts[holder.riderId] === undefined) {
      riderHighestPts[holder.riderId] = punten;
    }
  }

  // For each jersey in hierarchy order: if holder is from slotTeam, add their highest pts once
  const counted = new Set<string>();
  for (const { key } of JERSEY_HIERARCHY) {
    const holder = jerseys[key];
    if (!holder || holder.team !== slotTeam || counted.has(holder.riderId)) continue;
    total += riderHighestPts[holder.riderId];
    counted.add(holder.riderId);
  }

  return total;
}

export function calculatePersonalizedScores(
  slots: TeamSlot[],
  stageScores: Record<string, Record<number, StageBaseScore>>,
  jerseyHolders: Record<number, JerseyHolders>,
  stages: number[],
): PersonalizedScoreResult {
  const perSlot: PersonalizedScoreResult['perSlot'] = {};
  const perStage: PersonalizedScoreResult['perStage'] = {};

  for (const slot of slots) {
    if (!slot.riderId) continue;
    perSlot[slot.id] = {};

    for (const stageNum of stages) {
      const lineupStatus = slot.lineup[stageNum] ?? '';
      const opgesteld = lineupStatus === 'X' || lineupStatus === 'K';
      const base = stageScores[slot.riderId]?.[stageNum] ?? NULL_SCORE;
      const jerseys = jerseyHolders[stageNum] ?? {};

      const punten_kopman_bonus = opgesteld && lineupStatus === 'K' ? base.punten_etappe : 0;
      const punten_team = opgesteld ? calcTeamPoints(slot.team, jerseys) : 0;

      const totaal = opgesteld
        ? base.punten_etappe + punten_kopman_bonus
          + base.punten_gc + base.punten_punten + base.punten_kom + base.punten_jong
          + punten_team
        : 0;

      perSlot[slot.id][stageNum] = {
        punten_etappe: base.punten_etappe,
        punten_gc: base.punten_gc,
        punten_punten: base.punten_punten,
        punten_kom: base.punten_kom,
        punten_jong: base.punten_jong,
        punten_team,
        punten_kopman_bonus,
        totaal,
        opgesteld,
      };
    }
  }

  for (const stageNum of stages) {
    let scoreOpgesteld = 0;
    let actualKopmanBonus = 0;
    let maxEtappePts = 0;

    for (const slot of slots) {
      if (!slot.riderId) continue;
      const s = perSlot[slot.id]?.[stageNum];
      if (!s?.opgesteld) continue;

      scoreOpgesteld += s.totaal;
      actualKopmanBonus += s.punten_kopman_bonus;
      if (s.punten_etappe > maxEtappePts) maxEtappePts = s.punten_etappe;
    }

    perStage[stageNum] = {
      score_opgesteld: scoreOpgesteld,
      score_max_mogelijk: scoreOpgesteld - actualKopmanBonus + maxEtappePts,
    };
  }

  return { perSlot, perStage };
}

export function calcRiderTotal(slotScores: Record<number, SlotStageScore>): number {
  return Object.values(slotScores).reduce((sum, s) => sum + (s.opgesteld ? s.totaal : 0), 0);
}

export function calcBaseTotal(s: SlotStageScore): number {
  return s.punten_etappe + s.punten_gc + s.punten_punten + s.punten_kom + s.punten_jong;
}
