import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Group, Vote, AggregatedVotes } from '../types/community';
import { STORAGE_KEYS } from '../utils/storageKeys';

interface CommunityContextType {
    currentGroup: Group | null;
    currentUser: string | null;
    votes: Vote[];
    aggregatedVotes: AggregatedVotes;
    isLoading: boolean;
    error: string | null;
    joinGroup: (groupId: string, userName: string) => Promise<boolean>;
    createGroup: (name: string) => Promise<string | null>;
    submitVotes: (newVotes: Partial<Vote>[]) => Promise<boolean>;
    leaveGroup: () => void;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: ReactNode }) {
    const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load from local storage on mount
    useEffect(() => {
        const savedGroupId = localStorage.getItem(STORAGE_KEYS.COMMUNITY_GROUP_ID);
        const savedUserName = localStorage.getItem(STORAGE_KEYS.COMMUNITY_USER_NAME);
        
        if (savedGroupId && savedUserName) {
            joinGroup(savedGroupId, savedUserName);
        }
    }, []);

    // Fetch votes whenever group changes
    useEffect(() => {
        if (!currentGroup) return;

        const fetchVotes = async () => {
            const { data, error } = await supabase
                .from('votes')
                .select('*')
                .eq('group_id', currentGroup.id);
            
            if (error) {
                console.error("Error fetching votes:", error);
            } else {
                setVotes(data || []);
            }
        };

        fetchVotes();

        // Optional: Set up real-time subscription
        const subscription = supabase
            .channel('public:votes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `group_id=eq.${currentGroup.id}` }, () => {
                fetchVotes(); // Re-fetch all on any change for simplicity
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentGroup]);

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
            // Because of the unique constraint, we use upsert
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

    const leaveGroup = () => {
        setCurrentGroup(null);
        setCurrentUser(null);
        setVotes([]);
        localStorage.removeItem(STORAGE_KEYS.COMMUNITY_GROUP_ID);
        localStorage.removeItem(STORAGE_KEYS.COMMUNITY_USER_NAME);
        
        // Remove URL param if present
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
            isLoading,
            error,
            joinGroup,
            createGroup,
            submitVotes,
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
