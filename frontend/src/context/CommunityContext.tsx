import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Group, Vote, AggregatedVotes, SubmittedTeam, SubmittedRiderSlot, CommunityTeamStats, RiderPickStats } from '../types/community';
import { TeamSlot } from '../types';
import { STORAGE_KEYS } from '../utils/storageKeys';
import ridersData from '../data/riders.json';

interface CommunityContextType {
    currentGroup: Group | null;
    currentUser: string | null;
    votes: Vote[];
    aggregatedVotes: AggregatedVotes;
    submittedTeams: SubmittedTeam[];
    mySubmittedTeam: SubmittedTeam | null;
    communityStats: CommunityTeamStats | null;
    isLoading: boolean;
    isSubmittingTeam: boolean;
    error: string | null;
    joinGroup: (groupId: string, userName: string) => Promise<boolean>;
    createGroup: (name: string) => Promise<string | null>;
    submitVotes: (newVotes: Partial<Vote>[]) => Promise<boolean>;
    submitTeam: (slots: TeamSlot[]) => Promise<boolean>;
    leaveGroup: () => void;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

const PCT_GROUPS = [
    { label: '100%', min: 100, max: 100 },
    { label: '90–99%', min: 90, max: 99 },
    { label: '80–89%', min: 80, max: 89 },
    { label: '70–79%', min: 70, max: 79 },
    { label: '60–69%', min: 60, max: 69 },
    { label: '50–59%', min: 50, max: 59 },
    { label: '40–49%', min: 40, max: 49 },
    { label: '30–39%', min: 30, max: 39 },
    { label: '20–29%', min: 20, max: 29 },
    { label: '< 20%', min: 0, max: 19 },
];

export function CommunityProvider({ children }: { children: ReactNode }) {
    const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [submittedTeams, setSubmittedTeams] = useState<SubmittedTeam[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const savedGroupId = localStorage.getItem(STORAGE_KEYS.COMMUNITY_GROUP_ID);
        const savedUserName = localStorage.getItem(STORAGE_KEYS.COMMUNITY_USER_NAME);
        if (savedGroupId && savedUserName) {
            joinGroup(savedGroupId, savedUserName);
        }
    }, []);

    const fetchVotes = useCallback(async (groupId: string) => {
        const { data, error } = await supabase
            .from('votes')
            .select('*')
            .eq('group_id', groupId);
        if (!error) setVotes(data || []);
    }, []);

    const fetchSubmittedTeams = useCallback(async (groupId: string) => {
        const { data, error } = await supabase
            .from('submitted_teams')
            .select('*')
            .eq('group_id', groupId);
        if (!error) setSubmittedTeams(data || []);
    }, []);

    useEffect(() => {
        if (!currentGroup) return;

        fetchVotes(currentGroup.id);
        fetchSubmittedTeams(currentGroup.id);

        const votesSub = supabase
            .channel(`votes:${currentGroup.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `group_id=eq.${currentGroup.id}` }, () => {
                fetchVotes(currentGroup.id);
            })
            .subscribe();

        const teamsSub = supabase
            .channel(`submitted_teams:${currentGroup.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'submitted_teams', filter: `group_id=eq.${currentGroup.id}` }, () => {
                fetchSubmittedTeams(currentGroup.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(votesSub);
            supabase.removeChannel(teamsSub);
        };
    }, [currentGroup, fetchVotes, fetchSubmittedTeams]);

    const aggregatedVotes = useMemo<AggregatedVotes>(() => {
        const aggregated: AggregatedVotes = {};
        votes.forEach(vote => {
            if (!aggregated[vote.rider_id]) {
                aggregated[vote.rider_id] = { averageScore: 0, totalScores: 0, gemCount: 0 };
            }
            if (vote.is_gem) {
                aggregated[vote.rider_id].gemCount++;
            }
            if (vote.interest_score !== null) {
                const current = aggregated[vote.rider_id];
                const newTotal = current.totalScores + 1;
                const newAvg = ((current.averageScore * current.totalScores) + vote.interest_score) / newTotal;
                aggregated[vote.rider_id].averageScore = newAvg;
                aggregated[vote.rider_id].totalScores = newTotal;
            }
        });
        return aggregated;
    }, [votes]);

    const mySubmittedTeam = useMemo(
        () => submittedTeams.find(t => t.user_name === currentUser) ?? null,
        [submittedTeams, currentUser]
    );

    const communityStats = useMemo<CommunityTeamStats | null>(() => {
        if (submittedTeams.length === 0) return null;

        const totalTeams = submittedTeams.length;
        const pickCount: Record<string, number> = {};
        const riderMeta: Record<string, { name: string; team: string; price: number }> = {};

        // Build pick counts from submitted teams
        submittedTeams.forEach(st => {
            st.riders.forEach(r => {
                pickCount[r.riderId] = (pickCount[r.riderId] ?? 0) + 1;
                if (!riderMeta[r.riderId]) {
                    riderMeta[r.riderId] = { name: r.name, team: r.team, price: r.price };
                }
            });
        });

        // Enrich with local rider data for price (override JSONB snapshot prices with current data)
        const riderById: Record<string, { naam: string; ploeg: string; prijs: number }> = {};
        (ridersData as any[]).forEach((r: any) => {
            riderById[r.id] = { naam: r.naam, ploeg: r.ploeg, prijs: r.prijs };
        });

        const allRiderStats: RiderPickStats[] = Object.entries(pickCount).map(([riderId, count]) => {
            const local = riderById[riderId];
            const meta = riderMeta[riderId];
            return {
                riderId,
                name: local?.naam ?? meta.name,
                team: local?.ploeg ?? meta.team,
                price: local?.prijs ?? meta.price,
                pickCount: count,
                pickPct: Math.round((count / totalTeams) * 100),
            };
        }).sort((a, b) => b.pickCount - a.pickCount);

        const topBySegment = (minPrice: number, maxPrice: number) =>
            allRiderStats
                .filter(r => r.price >= minPrice && r.price < maxPrice)
                .slice(0, 5);

        const topBoven = topBySegment(1_500_000, Infinity);
        const topMidden = topBySegment(750_000, 1_500_000);
        const topOnder = topBySegment(0, 750_000);
        const leastChosen = [...allRiderStats].sort((a, b) => a.pickCount - b.pickCount).slice(0, 5);

        // Distribution: how many riders were chosen X times
        const countToRiders: Record<number, number> = {};
        allRiderStats.forEach(r => {
            countToRiders[r.pickCount] = (countToRiders[r.pickCount] ?? 0) + 1;
        });
        const distributionByCount = Object.entries(countToRiders)
            .map(([times, count]) => ({ timesChosen: Number(times), riderCount: count }))
            .sort((a, b) => b.timesChosen - a.timesChosen);

        // Percentage groups
        const percentageGroups = PCT_GROUPS.map(g => ({
            label: g.label,
            count: allRiderStats.filter(r => r.pickPct >= g.min && r.pickPct <= g.max).length,
        }));

        const totalUniqueRiders = allRiderStats.length;
        const totalPicks = allRiderStats.reduce((s, r) => s + r.pickCount, 0);
        const avgSelectionsPerRider = totalUniqueRiders > 0 ? Math.round((totalPicks / totalUniqueRiders) * 100) / 100 : 0;
        const mostUniqueRiders = allRiderStats.filter(r => r.pickCount === 1).length;
        const moreThanHalfCount = allRiderStats.filter(r => r.pickPct > 50).length;

        return {
            totalTeams,
            totalUniqueRiders,
            avgSelectionsPerRider,
            mostUniqueRiders,
            moreThanHalfCount,
            topBoven,
            topMidden,
            topOnder,
            leastChosen,
            distributionByCount,
            percentageGroups,
            allRiderStats,
        };
    }, [submittedTeams]);

    const joinGroup = async (groupId: string, userName: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (error || !data) {
                setError("Groep niet gevonden of link is ongeldig.");
                setIsLoading(false);
                return false;
            }

            setCurrentGroup(data);
            setCurrentUser(userName);
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_GROUP_ID, groupId);
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_USER_NAME, userName);
            setIsLoading(false);
            return true;
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return false;
        }
    };

    const createGroup = async (name: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('groups')
                .insert([{ name }])
                .select()
                .single();

            if (error) throw error;
            setIsLoading(false);
            return data.id as string;
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return null;
        }
    };

    const submitVotes = async (newVotes: Partial<Vote>[]) => {
        if (!currentGroup || !currentUser) return false;
        setIsLoading(true);

        const votesToInsert = newVotes.map(v => ({
            ...v,
            group_id: currentGroup.id,
            voter_name: currentUser
        }));

        try {
            const { error } = await supabase
                .from('votes')
                .upsert(votesToInsert, { onConflict: 'group_id,voter_name,rider_id' });

            if (error) throw error;
            setIsLoading(false);
            return true;
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return false;
        }
    };

    const submitTeam = async (slots: TeamSlot[]) => {
        if (!currentGroup || !currentUser) return false;

        const filledSlots = slots.filter(s => s.riderId !== null);
        if (filledSlots.length !== 20) return false;

        setIsSubmittingTeam(true);
        setError(null);

        const riderPayload: SubmittedRiderSlot[] = filledSlots.map(s => ({
            riderId: s.riderId!,
            name: s.name,
            team: s.team,
            price: s.price,
            type: s.type,
        }));
        const budgetUsed = filledSlots.reduce((sum, s) => sum + s.price, 0);

        try {
            const { error } = await supabase
                .from('submitted_teams')
                .upsert(
                    [{
                        group_id: currentGroup.id,
                        user_name: currentUser,
                        riders: riderPayload,
                        budget_used: budgetUsed,
                        updated_at: new Date().toISOString(),
                    }],
                    { onConflict: 'group_id,user_name' }
                );

            if (error) throw error;
            await fetchSubmittedTeams(currentGroup.id);
            setIsSubmittingTeam(false);
            return true;
        } catch (err: any) {
            setError(err.message);
            setIsSubmittingTeam(false);
            return false;
        }
    };

    const leaveGroup = () => {
        setCurrentGroup(null);
        setCurrentUser(null);
        setVotes([]);
        setSubmittedTeams([]);
        localStorage.removeItem(STORAGE_KEYS.COMMUNITY_GROUP_ID);
        localStorage.removeItem(STORAGE_KEYS.COMMUNITY_USER_NAME);

        const url = new URL(window.location.href);
        if (url.searchParams.has('group')) {
            url.searchParams.delete('group');
            window.history.replaceState({}, '', url);
        }
    };

    return (
        <CommunityContext.Provider value={{
            currentGroup,
            currentUser,
            votes,
            aggregatedVotes,
            submittedTeams,
            mySubmittedTeam,
            communityStats,
            isLoading,
            isSubmittingTeam,
            error,
            joinGroup,
            createGroup,
            submitVotes,
            submitTeam,
            leaveGroup
        }}>
            {children}
        </CommunityContext.Provider>
    );
}

export function useCommunity() {
    const context = useContext(CommunityContext);
    if (context === undefined) {
        throw new Error('useCommunity must be used within a CommunityProvider');
    }
    return context;
}
