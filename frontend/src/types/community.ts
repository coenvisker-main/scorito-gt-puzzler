export interface Group {
    id: string;
    name: string;
    created_at: string;
}

export interface Vote {
    id: string;
    group_id: string;
    voter_name: string;
    rider_id: string;
    interest_score: number | null; // 1-5 for >= 1M
    is_gem: boolean; // true for <= 750k
    created_at: string;
}

export interface AggregatedVotes {
    [riderId: string]: {
        averageScore: number;
        totalScores: number; // How many rated it
        gemCount: number; // How many marked as gem
    }
}

export interface SubmittedRiderSlot {
    riderId: string;
    name: string;
    team: string;
    price: number;
    type: string;
}

export interface SubmittedTeam {
    id: string;
    group_id: string;
    user_name: string;
    riders: SubmittedRiderSlot[];
    budget_used: number;
    submitted_at: string;
    updated_at: string;
}

export interface RiderPickStats {
    riderId: string;
    name: string;
    team: string;
    price: number;
    pickCount: number;
    pickPct: number; // 0-100
}

export interface CommunityTeamStats {
    totalTeams: number;
    totalUniqueRiders: number;
    avgSelectionsPerRider: number;
    mostUniqueRiders: number;
    moreThanHalfCount: number;

    topBoven: RiderPickStats[];
    topMidden: RiderPickStats[];
    topOnder: RiderPickStats[];
    leastChosen: RiderPickStats[];

    distributionByCount: { timesChosen: number; riderCount: number }[];
    percentageGroups: { label: string; count: number }[];

    allRiderStats: RiderPickStats[];
}
