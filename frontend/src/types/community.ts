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
