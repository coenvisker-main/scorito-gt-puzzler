import { useState, useEffect } from 'react';
import { Database, DownloadCloud, Search, RefreshCw, Save, Lock, Settings2, Info, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Renner, RennerType, TypeConfig, FormulaParams, RENNER_TYPES } from '../types';
import { riders as initialRiders } from '../data/riders';

import { useTeam } from '../context/TeamContext';

// Backend API base URL (runs separately via server.js on port 3001)
const API_BASE = 'http://127.0.0.1:3001';

type SortKey = 'naam' | 'ploeg' | 'prijs' | 'type';

export function AdminDashboard() {
    const { resetStageOverrides, resetFormulaConfigs } = useTeam();
    const [ridersList, setRidersList] = useState<Renner[]>(initialRiders);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingUpdates, setPendingUpdates] = useState<Record<string, { prijs: number, type: RennerType, is_jongere: boolean }>>({});
    const [sortKey, setSortKey] = useState<SortKey>('prijs');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
    const [formulaConfig, setFormulaConfig] = useState<{ formulaParams: FormulaParams, typeConfigs: TypeConfig[] } | null>(null);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'formula' | 'analysis' | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Etappe import state
    const [importedStages, setImportedStages] = useState<Set<number>>(new Set());
    const [importingStage, setImportingStage] = useState<number | 'all' | null>(null);
    const [lastImportOutput, setLastImportOutput] = useState<string | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchImportedStages = async () => {
        try {
            const { data } = await supabase.from('stage_results').select('stage_number');
            if (data) {
                setImportedStages(new Set(data.map((r: { stage_number: number }) => r.stage_number)));
            }
        } catch (e) {
            console.error('Kon import-status niet ophalen', e);
        }
    };

    const handleImportStage = async (nummer: number | 'all') => {
        setImportingStage(nummer);
        setLastImportOutput(null);
        try {
            const res = await fetch(`${API_BASE}/api/import-stage/${nummer}`, { method: 'POST' });
            const data = await res.json();
            setLastImportOutput(data.output ?? data.error ?? 'Geen output');
            if (data.success) {
                await fetchImportedStages();
                showNotification('success', nummer === 'all' ? 'Inhaalimport succesvol!' : `Etappe ${nummer} geïmporteerd`);
            } else {
                showNotification('error', `Import mislukt: ${data.error ?? 'Onbekende fout'}`);
            }
        } catch (e) {
            showNotification('error', `Netwerkfout: ${e}`);
            setLastImportOutput(`Netwerkfout: ${e}`);
        } finally {
            setImportingStage(null);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/riders`, { method: 'GET' });
                if (res.ok) {
                    const data = await res.json();
                    setRidersList(data);
                    setIsApiAvailable(true);
                } else {
                    setIsApiAvailable(false);
                }
                fetchConfig();
            } catch (e) {
                setIsApiAvailable(false);
            }
            await fetchImportedStages();
        };
        init();
    }, []);

    const fetchRiders = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/riders`);
            const data = await res.json();
            setRidersList(data);
        } catch (e) { console.error("Failed to fetch riders", e); }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/config`);
            const data = await res.json();
            setFormulaConfig(data);
        } catch (e) { console.error("Failed to fetch config", e); }
    };

    const handleConfigChange = (type: RennerType, field: keyof TypeConfig, value: number) => {
        if (!formulaConfig) return;
        setFormulaConfig({
            ...formulaConfig,
            typeConfigs: formulaConfig.typeConfigs.map(tc => tc.type === type ? { ...tc, [field]: value } : tc)
        });
    };

    const saveConfig = async () => {
        if (!formulaConfig) return;
        setIsSavingConfig(true);
        try {
            await fetch(`${API_BASE}/api/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formulaConfig)
            });
            showNotification('success', 'Formule configuratie opgeslagen!');
        } catch (e) {
            showNotification('error', 'Fout bij opslaan: ' + e);
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'prijs' ? 'desc' : 'asc');
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <span className="ml-1 opacity-25">↕</span>;
        return <span className="ml-1 text-amber-400">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const handleScrape = async () => {
        setIsScraping(true);
        setScrapeStatus('Scraping ProCyclingStats... Dit kan even duren.');
        try {
            const res = await fetch(`${API_BASE}/api/scrape`, { method: 'POST' });
            if (!res.ok) {
                await res.text();
                throw new Error(`Serverfout ${res.status}: Is de Vite server herstart na de config-update?`);
            }
            const data = await res.json();
            if (data.success) {
                setScrapeStatus('Succesvol gesynchroniseerd!');
                fetchRiders(); // Refresh list from server
            } else {
                setScrapeStatus(`Fout bij laden: ${data.error}`);
            }
        } catch (e) {
            setScrapeStatus(`Netwerkfout: ${e}`);
        } finally {
            setIsScraping(false);
        }
    };

    const handleUpdateChange = (id: string, field: 'prijs' | 'type' | 'is_jongere', value: any) => {
        const original = ridersList.find(r => r.id === id);
        if (!original) return;

        setPendingUpdates(prev => {
            const current = prev[id] || { prijs: original.prijs, type: original.gebruiker_type, is_jongere: original.is_jongere };
            return {
                ...prev,
                [id]: { ...current, [field]: value }
            };
        });
    };

    const submitUpdate = async (id: string) => {
        const update = pendingUpdates[id];
        if (!update) return;

        try {
            const res = await fetch(`${API_BASE}/api/riders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, prijs: update.prijs, type: update.type, is_jongere: update.is_jongere })
            });
            if (!res.ok) throw new Error('API niet gevonden (herstart server)');
            const data = await res.json();
            if (data.success) {
                setRidersList(prev =>
                    prev.map(r => r.id === id ? { ...r, prijs: update.prijs, gebruiker_type: update.type, is_jongere: update.is_jongere } : r)
                );
                setPendingUpdates(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        } catch (e) {
            showNotification('error', 'Kon wijziging niet opslaan: ' + e);
        }
    };

    const submitAllUpdates = async () => {
        const updates = Object.entries(pendingUpdates).map(([id, u]) => ({
            id,
            prijs: u.prijs,
            type: u.type,
            is_jongere: u.is_jongere
        }));

        if (updates.length === 0) return;
        setIsSavingAll(true);

        try {
            const res = await fetch(`${API_BASE}/api/riders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('API niet gevonden');
            const data = await res.json();
            if (data.success) {
                setRidersList(prev =>
                    prev.map(r => {
                        const u = pendingUpdates[r.id];
                        return u ? { ...r, prijs: u.prijs, gebruiker_type: u.type, is_jongere: u.is_jongere } : r;
                    })
                );
                setPendingUpdates({});
            }
        } catch (e) {
            showNotification('error', 'Kon bulk-wijziging niet opslaan: ' + e);
        } finally {
            setIsSavingAll(false);
        }
    };

    const filtered = ridersList
        .filter(r =>
            r.naam.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.ploeg.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            let valA: string | number;
            let valB: string | number;
            switch (sortKey) {
                case 'prijs':  valA = a.prijs;                    valB = b.prijs;                    break;
                case 'ploeg':  valA = a.ploeg.toLowerCase();      valB = b.ploeg.toLowerCase();      break;
                case 'type':   valA = a.gebruiker_type.toLowerCase(); valB = b.gebruiker_type.toLowerCase(); break;
                default:       valA = a.naam.toLowerCase();       valB = b.naam.toLowerCase();
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });

    const thSortable = "p-4 cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap";

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32">
            {/* Header card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                    <Database className="w-64 h-64 rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">Data Beheer</h2>
                        <p className="text-neutral-400 font-bold uppercase tracking-wider text-xs mt-2">Vite API Integration – Database Editor</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {confirmAction === 'formula' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-neutral-400 font-bold">Formule resetten?</span>
                                <button onClick={() => { resetFormulaConfigs(); setConfirmAction(null); }} className="px-3 py-2 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase hover:bg-red-400 transition-all">Ja</button>
                                <button onClick={() => setConfirmAction(null)} className="px-3 py-2 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-[11px] font-black uppercase hover:bg-neutral-700 transition-all">Nee</button>
                            </div>
                        ) : confirmAction === 'analysis' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-neutral-400 font-bold">Analyse resetten?</span>
                                <button onClick={() => { resetStageOverrides(); setConfirmAction(null); }} className="px-3 py-2 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase hover:bg-red-400 transition-all">Ja</button>
                                <button onClick={() => setConfirmAction(null)} className="px-3 py-2 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-[11px] font-black uppercase hover:bg-neutral-700 transition-all">Nee</button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setConfirmAction('formula')}
                                    className="flex items-center gap-3 px-6 py-3 rounded-xl font-black uppercase tracking-wider transition-all bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700 hover:scale-105"
                                    title="Reset alle formule-instellingen naar de nieuwe standaarden"
                                >
                                    <Settings2 className="w-5 h-5" />
                                    Reset Formule
                                </button>
                                <button
                                    onClick={() => setConfirmAction('analysis')}
                                    className="flex items-center gap-3 px-6 py-3 rounded-xl font-black uppercase tracking-wider transition-all bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700 hover:scale-105"
                                    title="Reset alle handmatige etappe-aanpassingen naar de nieuwe standaarden"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Reset Analyse
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleScrape}
                            disabled={isScraping}
                            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black uppercase tracking-wider transition-all shadow-xl ${
                                isScraping
                                    ? 'bg-neutral-800 text-neutral-500'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:scale-105'
                            }`}
                        >
                            {isScraping ? <RefreshCw className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />}
                            {isScraping ? 'Bezig met Scrapen...' : 'Haal Startlijst Op (PCS)'}
                        </button>
                    </div>
                </div>

                    {scrapeStatus && (
                    <div className="mt-4 p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-500 text-xs font-mono font-bold">
                        {scrapeStatus}
                    </div>
                )}
                {isApiAvailable === false && (
                    <div className="mt-4 p-4 bg-blue-950/50 border border-blue-800/50 rounded-xl flex items-center gap-3">
                        <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                        <p className="text-blue-300 text-xs font-bold">
                            <span className="text-blue-200">Read-only modus</span> — De admin API draait alleen lokaal. Wijzigingen opslaan en scrapen werkt niet op deze omgeving. De rennerdata is up-to-date op het moment van de laatste deploy.
                        </p>
                    </div>
                )}
            </div>

            {notification && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                    notification.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* Formula Config Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <Settings2 className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tighter text-white uppercase italic">Formule Instellingen</h3>
                                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">TypeConfig: D-waarde & End-waarde</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsGuideOpen(!isGuideOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-[10px] font-black uppercase text-neutral-400 transition-all"
                        >
                            <Info className="w-3 h-3 text-amber-500" />
                            {isGuideOpen ? 'Sluit Gids' : 'Parameters Gids'}
                        </button>
                    </div>
                    <button
                        onClick={saveConfig}
                        disabled={isSavingConfig || !isApiAvailable}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-20"
                    >
                        <Save className="w-4 h-4" />
                        {isSavingConfig ? 'Opslaan...' : 'Config Opslaan'}
                    </button>
                </div>

                {/* Admin Guide */}
                {isGuideOpen && (
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 mb-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                    Scorito Dagbonus (D)
                                </div>
                                <p className="text-[11px] leading-relaxed text-neutral-400">
                                    Directe schatting: hoeveel klassementspunten scoort een toptarief van dit type gemiddeld per etappe? Dit is een vast puntenaantal, geen weging.
                                    <br/><br/>
                                    <span className="text-neutral-500 italic">Richtwaarden: GC ≈ 8 | Sprinter ≈ 5 | Sprint+ ≈ 3 | Klimmer ≈ 2 | Aanvaller ≈ 1</span>
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                    Eindklassementspunten (End)
                                </div>
                                <p className="text-[11px] leading-relaxed text-neutral-400">
                                    Directe schatting: hoeveel punten pakt een toptarief naar verwachting in de eindklassementen?
                                    <br/><br/>
                                    <span className="text-neutral-500 italic">Richtwaarden: GC ≈ 100 | Sprinter ≈ 50 | Sprint+ ≈ 25 | Klimmer ≈ 30</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {formulaConfig?.typeConfigs.map(tc => (
                        <div key={tc.type} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                <div className="text-sm font-black text-amber-500 uppercase tracking-widest">{tc.type}</div>
                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-neutral-800 text-neutral-500 rounded border border-neutral-700 uppercase tracking-tighter">Schatting</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-[9px] font-black uppercase text-neutral-500">Dagbonus (D)</label>
                                        <span className="text-[8px] font-bold text-neutral-700 uppercase">Punten</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={tc.daily_klassement_bonus} 
                                        onChange={e => handleConfigChange(tc.type, 'daily_klassement_bonus', parseFloat(e.target.value) || 0)}
                                        className="bg-neutral-900 border border-neutral-800 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-[9px] font-black uppercase text-neutral-500">Eindklassement</label>
                                        <span className="text-[8px] font-bold text-neutral-700 uppercase">Punten</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={tc.expected_eindklassement} 
                                        onChange={e => handleConfigChange(tc.type, 'expected_eindklassement', parseFloat(e.target.value) || 0)}
                                        className="bg-neutral-900 border border-neutral-800 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Table card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black tracking-tighter text-white uppercase italic">Renner Database</h3>
                        <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                            {filtered.length} renners — {Object.keys(pendingUpdates).length > 0 ? (
                                <span className="text-amber-500">{Object.keys(pendingUpdates).length} wijzigingen klaar</span>
                            ) : 'Geen wijzigingen'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        {Object.keys(pendingUpdates).length > 0 && (
                            <button
                                onClick={submitAllUpdates}
                                disabled={isSavingAll}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg text-xs font-black uppercase hover:bg-amber-400 transition-all shadow-lg animate-in fade-in zoom-in duration-300"
                            >
                                <Save className="w-4 h-4" />
                                {isSavingAll ? 'Opslaan...' : 'Alles Opslaan'}
                            </button>
                        )}
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Zoek renner of ploeg..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm font-bold placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-neutral-950 border-b border-neutral-800 text-[10px] uppercase font-black tracking-widest text-neutral-500">
                                <th className={`${thSortable} rounded-tl-xl`} onClick={() => handleSort('naam')}>
                                    Renner <SortIcon col="naam" />
                                </th>
                                <th className={thSortable} onClick={() => handleSort('ploeg')}>
                                    Ploeg <SortIcon col="ploeg" />
                                </th>
                                <th className="p-4 whitespace-nowrap">Scorito Type</th>
                                <th className={thSortable} onClick={() => handleSort('type')}>
                                    Gebr. Type <SortIcon col="type" />
                                </th>
                                <th className={thSortable} onClick={() => handleSort('prijs')}>
                                    Prijs <SortIcon col="prijs" />
                                </th>
                                <th className="p-4 text-center">Jongeren</th>
                                <th className="p-4 text-right rounded-tr-xl">Actie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {filtered.map(rider => {
                                const current = pendingUpdates[rider.id] || { prijs: rider.prijs, type: rider.gebruiker_type, is_jongere: rider.is_jongere };
                                const isDirty = !!pendingUpdates[rider.id];

                                return (
                                    <tr key={rider.id} className="hover:bg-neutral-950/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white tracking-tight">{rider.naam}</div>
                                            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{rider.id}</div>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-neutral-400">{rider.ploeg}</td>
                                        <td className="p-4 text-xs font-bold text-neutral-600">{rider.scorito_categorie || '-'}</td>
                                        <td className="p-4">
                                            <select
                                                value={current.type}
                                                onChange={e => handleUpdateChange(rider.id, 'type', e.target.value as RennerType)}
                                                className="bg-neutral-950 border border-neutral-800 p-2 rounded text-xs font-bold text-amber-400 uppercase outline-none focus:border-neutral-700"
                                            >
                                                {RENNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-neutral-500 font-bold text-sm">€</span>
                                                <input
                                                    type="number"
                                                    step="250000"
                                                    value={current.prijs}
                                                    onChange={e => handleUpdateChange(rider.id, 'prijs', parseInt(e.target.value) || 0)}
                                                    className="bg-neutral-950 border border-neutral-800 p-2 rounded text-xs font-mono font-bold text-white outline-none focus:border-neutral-700 w-28"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={current.is_jongere}
                                                onChange={e => handleUpdateChange(rider.id, 'is_jongere' as any, e.target.checked)}
                                                className="w-4 h-4 accent-amber-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => submitUpdate(rider.id)}
                                                disabled={!isDirty}
                                                className={`p-2 rounded transition-all ${
                                                    isDirty
                                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                        : 'opacity-20 cursor-not-allowed text-neutral-500'
                                                }`}
                                            >
                                                <Save className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Etappe Resultaten Import Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black tracking-tighter text-white uppercase italic">Etappe Resultaten</h3>
                        <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                            PCS → Supabase import per etappe
                        </p>
                    </div>
                    <button
                        onClick={() => handleImportStage('all')}
                        disabled={importingStage !== null || !isApiAvailable}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-lg ${
                            importingStage !== null || !isApiAvailable
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black hover:scale-105'
                        }`}
                    >
                        {importingStage === 'all'
                            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importeren...</>
                            : <><DownloadCloud className="w-4 h-4" /> Importeer alle gereden etappes</>
                        }
                    </button>
                </div>

                {isApiAvailable === false && (
                    <div className="mb-4 p-3 bg-blue-950/50 border border-blue-800/50 rounded-xl flex items-center gap-3">
                        <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                        <p className="text-blue-300 text-xs font-bold">Read-only modus — import werkt alleen lokaal.</p>
                    </div>
                )}

                {/* Stage buttons grid */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {Array.from({ length: 21 }, (_, i) => i + 1).map(n => {
                        const isImported = importedStages.has(n);
                        const isLoading = importingStage === n;
                        const isDisabled = importingStage !== null || !isApiAvailable;

                        return (
                            <button
                                key={n}
                                onClick={() => handleImportStage(n)}
                                disabled={isDisabled}
                                title={isImported ? `Etappe ${n} — opnieuw importeren` : `Etappe ${n} importeren`}
                                className={`relative flex flex-col items-center justify-center p-2 rounded-xl text-xs font-black transition-all ${
                                    isLoading
                                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                        : isImported
                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                        : isDisabled
                                        ? 'bg-neutral-950 border border-neutral-800 text-neutral-600 cursor-not-allowed'
                                        : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                                }`}
                            >
                                {isLoading
                                    ? <RefreshCw className="w-3 h-3 animate-spin mb-0.5" />
                                    : isImported
                                    ? <CheckCircle2 className="w-3 h-3 mb-0.5" />
                                    : <Clock className="w-3 h-3 mb-0.5 opacity-40" />
                                }
                                <span>{n}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Output log */}
                {lastImportOutput && (
                    <div className="mt-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-400 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {lastImportOutput}
                    </div>
                )}
            </div>
        </div>
    );
}
