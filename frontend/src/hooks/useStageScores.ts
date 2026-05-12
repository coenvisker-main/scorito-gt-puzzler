import { useState, useEffect, useMemo } from 'react';
import { TeamSlot } from '../types';
import { riders as allRiders } from '../data/riders';
import { supabase, RACE_EDITION_ID } from '../utils/supabaseClient';
import {
  StageBaseScore,
  JerseyHolders,
  PersonalizedScoreResult,
  calculatePersonalizedScores,
} from '../utils/scoreUtils';

const riderTeamMap: Record<string, string> = Object.fromEntries(
  allRiders.map(r => [r.id, r.ploeg])
);

interface RawStageScore {
  stage_number: number;
  rider_id: string;
  punten_etappe: number;
  punten_gc: number;
  punten_punten: number;
  punten_kom: number;
  punten_jong: number;
}

interface RawClassification {
  stage_number: number;
  rank: number;
  rider_id: string | null;
}

interface RawStageResult {
  stage_number: number;
  rider_id: string | null;
  rank: number | null;
}

function setHolder(
  map: Record<number, JerseyHolders>,
  stageNum: number,
  key: keyof JerseyHolders,
  riderId: string,
) {
  const team = riderTeamMap[riderId];
  if (!team) return;
  if (!map[stageNum]) map[stageNum] = {};
  (map[stageNum] as any)[key] = { riderId, team };
}

function buildJerseyHolders(
  gcRows: RawClassification[],
  ptsRows: RawClassification[],
  komRows: RawClassification[],
  jongRows: RawClassification[],
  winnerRows: RawStageResult[],
): Record<number, JerseyHolders> {
  const map: Record<number, JerseyHolders> = {};

  for (const row of gcRows) {
    if (row.rider_id) setHolder(map, row.stage_number, 'gc', row.rider_id);
  }
  for (const row of ptsRows) {
    if (row.rider_id) setHolder(map, row.stage_number, 'punten', row.rider_id);
  }
  for (const row of komRows) {
    if (row.rider_id) setHolder(map, row.stage_number, 'kom', row.rider_id);
  }
  for (const row of jongRows) {
    if (row.rider_id) setHolder(map, row.stage_number, 'jong', row.rider_id);
  }
  for (const row of winnerRows) {
    if (row.rider_id && row.rank === 1) setHolder(map, row.stage_number, 'stageWinner', row.rider_id);
  }

  return map;
}

export function useStageScores(slots: TeamSlot[]): {
  scores: PersonalizedScoreResult | null;
  availableStages: number[];
  isLoading: boolean;
  error: string | null;
} {
  const [rawScores, setRawScores] = useState<RawStageScore[]>([]);
  const [jerseyHolders, setJerseyHolders] = useState<Record<number, JerseyHolders>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);
      setError(null);
      try {
        const [scoresRes, gcRes, ptsRes, komRes, jongRes, resultsRes] = await Promise.all([
          supabase
            .from('stage_scores')
            .select('stage_number,rider_id,punten_etappe,punten_gc,punten_punten,punten_kom,punten_jong')
            .eq('race_edition_id', RACE_EDITION_ID),
          supabase
            .from('stage_gc')
            .select('stage_number,rank,rider_id')
            .eq('race_edition_id', RACE_EDITION_ID)
            .eq('rank', 1),
          supabase
            .from('stage_points_classification')
            .select('stage_number,rank,rider_id')
            .eq('race_edition_id', RACE_EDITION_ID)
            .eq('rank', 1),
          supabase
            .from('stage_kom_classification')
            .select('stage_number,rank,rider_id')
            .eq('race_edition_id', RACE_EDITION_ID)
            .eq('rank', 1),
          supabase
            .from('stage_youth_classification')
            .select('stage_number,rank,rider_id')
            .eq('race_edition_id', RACE_EDITION_ID)
            .eq('rank', 1),
          supabase
            .from('stage_results')
            .select('stage_number,rider_id,rank')
            .eq('race_edition_id', RACE_EDITION_ID)
            .eq('rank', 1),
        ]);

        if (cancelled) return;

        const err = [scoresRes, gcRes, ptsRes, komRes, jongRes, resultsRes]
          .find(r => r.error)?.error;
        if (err) throw new Error(err.message);

        setRawScores(scoresRes.data ?? []);
        setJerseyHolders(buildJerseyHolders(
          gcRes.data ?? [],
          ptsRes.data ?? [],
          komRes.data ?? [],
          jongRes.data ?? [],
          resultsRes.data ?? [],
        ));
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Onbekende fout');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  const stageScoresMap = useMemo<Record<string, Record<number, StageBaseScore>>>(() => {
    const map: Record<string, Record<number, StageBaseScore>> = {};
    for (const row of rawScores) {
      if (!map[row.rider_id]) map[row.rider_id] = {};
      map[row.rider_id][row.stage_number] = {
        punten_etappe: row.punten_etappe,
        punten_gc: row.punten_gc,
        punten_punten: row.punten_punten,
        punten_kom: row.punten_kom,
        punten_jong: row.punten_jong,
      };
    }
    return map;
  }, [rawScores]);

  const availableStages = useMemo(() => {
    const nums = new Set(rawScores.map(r => r.stage_number));
    return Array.from(nums).sort((a, b) => a - b);
  }, [rawScores]);

  const scores = useMemo<PersonalizedScoreResult | null>(() => {
    if (availableStages.length === 0) return null;
    return calculatePersonalizedScores(
      slots,
      stageScoresMap,
      jerseyHolders,
      availableStages,
    );
  }, [slots, stageScoresMap, jerseyHolders, availableStages]);

  return { scores, availableStages, isLoading, error };
}
