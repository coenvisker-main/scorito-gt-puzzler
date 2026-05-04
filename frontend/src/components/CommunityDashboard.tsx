import { useState, useEffect } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { riders } from '../data/riders';
// Removed Renner import as it is unused
import { Link, Users, Star, Gem, Check, LogOut, Loader2, Globe } from 'lucide-react';

export function CommunityDashboard() {
    const { currentGroup, currentUser, votes, createGroup, joinGroup, leaveGroup, submitVotes, isLoading, aggregatedVotes, error } = useCommunity();
    const [groupName, setGroupName] = useState('');
    const [userName, setUserName] = useState('');
    const [joinGroupId, setJoinGroupId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [expensivePage, setExpensivePage] = useState(0);
    const [gemPage, setGemPage] = useState(0);
    const [gemSearch, setGemSearch] = useState('');
    const PAGE_SIZE = 10;

    // Voting state
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [gems, setGems] = useState<string[]>([]);
    
    // Derived state
    const expensiveRiders = riders.filter(r => r.prijs >= 1000000);
    const cheapRiders = riders.filter(r => r.prijs <= 750000);
    
    const filteredCheapRiders = cheapRiders.filter(r => 
        r.naam.toLowerCase().includes(gemSearch.toLowerCase()) || 
        r.ploeg.toLowerCase().includes(gemSearch.toLowerCase())
    );

    // Load existing user votes into form
    useEffect(() => {
        if (votes.length > 0 && currentUser) {
            const userVotes = votes.filter(v => v.voter_name === currentUser);
            
            const newRatings: Record<string, number> = {};
            const newGems: string[] = [];
            
            userVotes.forEach(v => {
                if (v.is_gem) {
                    newGems.push(v.rider_id);
                } else if (v.interest_score !== null) {
                    newRatings[v.rider_id] = v.interest_score;
                }
            });
            
            setRatings(newRatings);
            setGems(newGems);
        }
    }, [votes, currentUser]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const groupParam = urlParams.get('group');
        if (groupParam && !currentGroup) {
            setJoinGroupId(groupParam);
        }
    }, [currentGroup]);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName || !userName) return;
        const id = await createGroup(groupName);
        if (id) {
            await joinGroup(id, userName);
            // Update URL
            const url = new URL(window.location.href);
            url.searchParams.set('group', id);
            window.history.pushState({}, '', url);
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinGroupId || !userName) return;
        await joinGroup(joinGroupId, userName);
    };

    const handleCopyLink = () => {
        const url = new URL(window.location.href);
        if (currentGroup) {
            url.searchParams.set('group', currentGroup.id);
        }
        navigator.clipboard.writeText(url.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRatingChange = (riderId: string, score: number) => {
        setRatings(prev => ({ ...prev, [riderId]: score }));
    };

    const handleGemToggle = (riderId: string) => {
        setGems(prev => {
            if (prev.includes(riderId)) {
                return prev.filter(id => id !== riderId);
            }
            if (prev.length >= 6) {
                alert("Je mag maximaal 6 pareltjes selecteren.");
                return prev;
            }
            return [...prev, riderId];
        });
    };

    const handleSubmitVotes = async () => {
        if (gems.length < 2) {
            alert("Selecteer minimaal 2 pareltjes.");
            return;
        }

        const newVotes = [];
        for (const [riderId, score] of Object.entries(ratings)) {
            newVotes.push({ rider_id: riderId, interest_score: score, is_gem: false });
        }
        for (const riderId of gems) {
            newVotes.push({ rider_id: riderId, interest_score: null, is_gem: true });
        }

        const success = await submitVotes(newVotes);
        if (success) {
            alert("Stemmen succesvol opgeslagen!");
        }
    };

    if (isLoading && !currentGroup) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
    }

    if (!currentGroup) {
        return (
            <div className="max-w-2xl mx-auto mt-12 p-8 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <Globe className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Community Shortlist</h2>
                    <p className="text-neutral-400">Vergelijk je keuzes met vrienden en ontdek wie de echte pareltjes zijn.</p>
                </div>

                {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-xl mb-6 text-sm">{error}</div>}

                {joinGroupId ? (
                    <div className="space-y-6">
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                            <p className="text-amber-500 text-sm font-bold">Je bent uitgenodigd voor een groep!</p>
                        </div>
                        <form onSubmit={handleJoinGroup} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Jouw Naam</label>
                                <input 
                                    type="text" 
                                    value={userName} 
                                    onChange={e => setUserName(e.target.value)} 
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none text-lg font-bold"
                                    placeholder="bijv. Mathieu"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black uppercase tracking-wider py-4 rounded-xl transition-colors shadow-lg shadow-amber-500/20">
                                Groep Joinen & Starten
                            </button>
                        </form>
                    </div>
                ) : (
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Naam Vriendengroep</label>
                            <input 
                                type="text" 
                                value={groupName} 
                                onChange={e => setGroupName(e.target.value)} 
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                                placeholder="bijv. De Wielergekken"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Jouw Naam</label>
                            <input 
                                type="text" 
                                value={userName} 
                                onChange={e => setUserName(e.target.value)} 
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                                placeholder="bijv. Mathieu"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black uppercase tracking-wider py-3 rounded-xl transition-colors">
                            Nieuwe Groep Aanmaken
                        </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
                <div className="text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-white flex items-center justify-center sm:justify-start gap-3">
                        <Users className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6" />
                        {currentGroup.name}
                    </h2>
                    <p className="text-neutral-400 text-xs sm:text-sm mt-1">Ingelogd als <span className="font-bold text-amber-500">{currentUser}</span></p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleCopyLink}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 sm:py-2.5 rounded-xl text-sm font-bold transition-colors"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link className="w-3.5 h-3.5" />}
                        {copied ? 'Gekopieerd' : 'Deel Link'}
                    </button>
                    <button 
                        onClick={leaveGroup}
                        className="flex items-center justify-center p-2 sm:p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors"
                        title="Groep verlaten"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Voting Section */}
                <div className="space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                            <Star className="text-amber-500 w-5 h-5" />
                            Rennerswaardering (&ge; 1M)
                        </h3>
                        <p className="text-xs text-neutral-400 mb-6">Hoe interessant is deze renner voor jouw team op basis van zijn prijs?</p>
                        
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {expensiveRiders.map(rider => (
                                <div key={rider.id} className="flex flex-row items-center justify-between gap-3 p-2.5 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-[13px] text-white truncate leading-tight">{rider.naam}</div>
                                        <div className="text-[9px] text-amber-500 font-mono flex items-center gap-1.5 mt-0.5">
                                            &euro;{(rider.prijs/1000000).toFixed(1)}M
                                            <span className="opacity-30 text-white">|</span>
                                            <span className="uppercase tracking-widest opacity-50">{rider.ploeg}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {[1,2,3,4,5].map(score => (
                                            <button
                                                key={score}
                                                onClick={() => handleRatingChange(rider.id, score)}
                                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                                                    ratings[rider.id] >= score ? 'bg-amber-500 text-neutral-950 scale-105' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                                                }`}
                                            >
                                                {score}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <h3 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
                                <Gem className="text-emerald-500 w-5 h-5" />
                                Pareltjes (&le; 750k)
                            </h3>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={gemSearch}
                                    onChange={e => setGemSearch(e.target.value)}
                                    placeholder="Zoek pareltje..."
                                    className="w-full sm:w-48 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-neutral-400 mb-6">Selecteer 2 tot 6 pareltjes. Geselecteerd: <span className={`font-black ${gems.length >= 2 ? 'text-emerald-500' : 'text-amber-500'}`}>{gems.length}/6</span></p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredCheapRiders.map(rider => (
                                <button
                                    key={rider.id}
                                    onClick={() => handleGemToggle(rider.id)}
                                    className={`p-2.5 rounded-xl text-left transition-all border ${
                                        gems.includes(rider.id) 
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                        : 'bg-neutral-950/50 border-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
                                    }`}
                                >
                                    <div className="font-bold text-[11px] truncate leading-tight">{rider.naam}</div>
                                    <div className="text-[9px] opacity-70 mt-0.5">&euro;{(rider.prijs/1000).toFixed(0)}k • {rider.ploeg}</div>
                                </button>
                            ))}
                            {filteredCheapRiders.length === 0 && (
                                <div className="col-span-full py-8 text-center text-neutral-500 text-xs italic">Geen renners gevonden...</div>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmitVotes}
                        disabled={isLoading || gems.length < 2}
                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-black uppercase tracking-wider py-4 rounded-xl transition-colors shadow-xl shadow-amber-500/20"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Stemmen Opslaan'}
                    </button>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-black uppercase tracking-widest text-white mb-6">Community Resultaten</h3>
                        
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-neutral-800 pb-2">
                                    <Star className="w-4 h-4" /> Hoogst Gewaardeerd
                                </h4>
                                <div className="space-y-2">
                                    {expensiveRiders
                                        .map(rider => ({
                                            ...rider,
                                            stats: aggregatedVotes[rider.id] || { averageScore: 0, totalScores: 0 }
                                        }))
                                        .filter(r => r.stats.totalScores > 0)
                                        .sort((a, b) => b.stats.averageScore - a.stats.averageScore)
                                        .slice(expensivePage * PAGE_SIZE, (expensivePage + 1) * PAGE_SIZE)
                                        .map(rider => (
                                            <div key={rider.id} className="flex items-center justify-between bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-white truncate">{rider.naam}</span>
                                                    <span className="text-[10px] text-neutral-500 truncate">{rider.ploeg}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-neutral-400 font-mono">€ {rider.prijs.toLocaleString()}</span>
                                                    <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded text-amber-500 border border-amber-500/20">
                                                        <span className="text-xs font-black">{rider.stats.averageScore.toFixed(1)}</span>
                                                        <Star size={10} fill="currentColor" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {expensiveRiders.filter(r => (aggregatedVotes[r.id]?.totalScores || 0) > 0).length > PAGE_SIZE && (
                                    <div className="flex items-center justify-between mt-4">
                                        <button 
                                            disabled={expensivePage === 0}
                                            onClick={() => setExpensivePage(p => p - 1)}
                                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Vorige
                                        </button>
                                        <span className="text-[10px] font-bold text-neutral-600 uppercase">Pagina {expensivePage + 1}</span>
                                        <button 
                                            disabled={(expensivePage + 1) * PAGE_SIZE >= expensiveRiders.filter(r => (aggregatedVotes[r.id]?.totalScores || 0) > 0).length}
                                            onClick={() => setExpensivePage(p => p + 1)}
                                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Volgende
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-neutral-800 pb-2">
                                    <Gem className="w-4 h-4" /> Populairste Pareltjes
                                </h4>
                                <div className="space-y-2">
                                    {cheapRiders
                                        .map(rider => ({
                                            ...rider,
                                            stats: aggregatedVotes[rider.id] || { gemCount: 0 }
                                        }))
                                        .filter(r => r.stats.gemCount > 0)
                                        .sort((a, b) => b.stats.gemCount - a.stats.gemCount)
                                        .slice(gemPage * PAGE_SIZE, (gemPage + 1) * PAGE_SIZE)
                                        .map(rider => (
                                            <div key={rider.id} className="flex items-center justify-between bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-white truncate">{rider.naam}</span>
                                                    <span className="text-[10px] text-neutral-500 truncate">{rider.ploeg}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-neutral-400 font-mono">€ {rider.prijs.toLocaleString()}</span>
                                                    <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded text-emerald-500 border border-emerald-500/20">
                                                        <span className="text-xs font-black">{rider.stats.gemCount}</span>
                                                        <Gem size={10} fill="currentColor" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {cheapRiders.filter(r => (aggregatedVotes[r.id]?.gemCount || 0) > 0).length > PAGE_SIZE && (
                                    <div className="flex items-center justify-between mt-4">
                                        <button 
                                            disabled={gemPage === 0}
                                            onClick={() => setGemPage(p => p - 1)}
                                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Vorige
                                        </button>
                                        <span className="text-[10px] font-bold text-neutral-600 uppercase">Pagina {gemPage + 1}</span>
                                        <button 
                                            disabled={(gemPage + 1) * PAGE_SIZE >= cheapRiders.filter(r => (aggregatedVotes[r.id]?.gemCount || 0) > 0).length}
                                            onClick={() => setGemPage(p => p + 1)}
                                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Volgende
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
