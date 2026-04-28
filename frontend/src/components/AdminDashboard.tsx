import { useState, useEffect } from 'react';
import { Database, DownloadCloud, Search, RefreshCw, Save, Lock } from 'lucide-react';
import { Renner, RennerType } from '../types';
import { riders as initialRiders } from '../data/riders';

// Backend API base URL (runs separately via server.js on port 3001)
const API_BASE = 'http://127.0.0.1:3001';

const RENNER_TYPES: RennerType[] = ['GC', 'Klimmer', 'Sprinter', 'Sprint+', 'Aanvaller', 'Tijdrijder', 'Wildcard'];

type SortKey = 'naam' | 'ploeg' | 'prijs' | 'type';

export function AdminDashboard() {
    const [ridersList, setRidersList] = useState<Renner[]>(initialRiders);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingUpdates, setPendingUpdates] = useState<Record<string, { prijs: number, type: RennerType }>>({});
    const [sortKey, setSortKey] = useState<SortKey>('prijs');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/riders`, { method: 'GET', signal: AbortSignal.timeout(2000) })
            .then(() => setIsApiAvailable(true))
            .catch(() => setIsApiAvailable(false));
    }, []);

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
                setScrapeStatus('Succes! Herlaad de pagina om de verse data in te laden.');
            } else {
                setScrapeStatus(`Fout bij laden: ${data.error}`);
            }
        } catch (e) {
            setScrapeStatus(`Netwerkfout: ${e}`);
        } finally {
            setIsScraping(false);
        }
    };

    const handleUpdateChange = (id: string, field: 'prijs' | 'type', value: any) => {
        const original = ridersList.find(r => r.id === id);
        if (!original) return;

        setPendingUpdates(prev => {
            const current = prev[id] || { prijs: original.prijs, type: original.gebruiker_type };
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
                body: JSON.stringify({ id, prijs: update.prijs, type: update.type })
            });
            if (!res.ok) throw new Error('API niet gevonden (herstart server)');
            const data = await res.json();
            if (data.success) {
                setRidersList(prev =>
                    prev.map(r => r.id === id ? { ...r, prijs: update.prijs, gebruiker_type: update.type } : r)
                );
                setPendingUpdates(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        } catch (e) {
            alert('Kon wijziging niet opslaan: ' + e);
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

            {/* Table card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black tracking-tighter text-white uppercase italic">Renner Database</h3>
                        <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                            {filtered.length} renners — klik kolomhoofd om te sorteren
                        </p>
                    </div>
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
                                <th className="p-4 text-right rounded-tr-xl">Actie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {filtered.map(rider => {
                                const current = pendingUpdates[rider.id] || { prijs: rider.prijs, type: rider.gebruiker_type };
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
        </div>
    );
}
