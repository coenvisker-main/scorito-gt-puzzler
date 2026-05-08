import { useMemo } from 'react';
import { CommunityTeamStats, RiderPickStats } from '../types/community';
import { Users, TrendingUp, Star, Percent } from 'lucide-react';

interface CommunityStatsProps {
    stats: CommunityTeamStats;
}

// Donut chart segment colors matching the infographic palette
const PCT_GROUP_COLORS = [
    '#ec4899', // 100% — pink
    '#f43f5e', // 90-99%
    '#8b5cf6', // 80-89%
    '#3b82f6', // 70-79%
    '#06b6d4', // 60-69%
    '#10b981', // 50-59%
    '#22c55e', // 40-49%
    '#eab308', // 30-39%
    '#f97316', // 20-29%
    '#6b7280', // <20%
];

const SEGMENT_COLORS = {
    boven: { bar: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-800/40', bg: 'bg-pink-950/20' },
    midden: { bar: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-800/40', bg: 'bg-amber-950/20' },
    onder: { bar: 'bg-teal-500', text: 'text-teal-400', border: 'border-teal-800/40', bg: 'bg-teal-950/20' },
    minst: { bar: 'bg-red-500', text: 'text-red-400', border: 'border-red-800/40', bg: 'bg-red-950/20' },
};

function RiderBar({ rider, totalTeams, barColor }: { rider: RiderPickStats; totalTeams: number; barColor: string }) {
    return (
        <div className="flex items-center gap-2 py-1">
            <span className="w-28 text-xs font-semibold text-white truncate shrink-0" title={rider.name}>
                {rider.name}
            </span>
            <div className="flex-1 bg-neutral-800 rounded-full h-2 relative overflow-hidden">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
                    style={{ width: `${rider.pickPct}%` }}
                />
            </div>
            <span className="text-xs text-neutral-400 w-20 text-right shrink-0">
                {rider.pickCount}/{totalTeams} ({rider.pickPct}%)
            </span>
        </div>
    );
}

function Top5Panel({
    title,
    riders,
    totalTeams,
    colors,
    priceRange,
}: {
    title: string;
    riders: RiderPickStats[];
    totalTeams: number;
    colors: typeof SEGMENT_COLORS.boven;
    priceRange?: string;
}) {
    return (
        <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{title}</h3>
                {priceRange && <span className="text-[10px] text-neutral-500">{priceRange}</span>}
            </div>
            {riders.length === 0 ? (
                <p className="text-xs text-neutral-600">Geen renners in dit segment</p>
            ) : (
                <div className="space-y-0.5">
                    {riders.map((r, i) => (
                        <div key={r.riderId} className="flex items-center gap-2 py-1">
                            <span className="text-xs font-bold text-neutral-500 w-4 shrink-0">{i + 1}</span>
                            <span className="w-24 text-xs font-semibold text-white truncate shrink-0" title={r.name}>{r.name}</span>
                            <div className="flex-1 bg-neutral-800 rounded-full h-2 relative overflow-hidden">
                                <div
                                    className={`absolute inset-y-0 left-0 rounded-full ${colors.bar}`}
                                    style={{ width: `${r.pickPct}%` }}
                                />
                            </div>
                            <span className="text-xs text-neutral-400 w-20 text-right shrink-0">
                                {r.pickCount}/{totalTeams} ({r.pickPct}%)
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const BAR_MAX_PX = 96; // pixel height reserved for bars (total container = 128px, ~32px for labels)

function DistributionChart({ data }: { data: { timesChosen: number; riderCount: number }[] }) {
    const maxCount = Math.max(...data.map(d => d.riderCount), 1);
    const sorted = [...data].sort((a, b) => b.timesChosen - a.timesChosen);

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
                Verdeling per aantal keuzes
            </h3>
            <div className="flex items-end gap-1" style={{ height: '128px' }}>
                {sorted.map(d => {
                    const barPx = Math.max(2, (d.riderCount / maxCount) * BAR_MAX_PX);
                    return (
                        <div key={d.timesChosen} className="flex flex-col items-center gap-1 flex-1 min-w-0 justify-end">
                            <span className="text-[9px] text-neutral-400 leading-none">{d.riderCount}</span>
                            <div
                                className="w-full bg-pink-500 rounded-t-sm"
                                style={{ height: `${barPx}px` }}
                            />
                            <span className="text-[9px] text-neutral-500 leading-none">{d.timesChosen}</span>
                        </div>
                    );
                })}
            </div>
            <p className="text-[10px] text-neutral-600 mt-1 text-center">Aantal keer gekozen</p>
        </div>
    );
}

function DonutChart({ groups }: { groups: { label: string; count: number }[] }) {
    const total = groups.reduce((s, g) => s + g.count, 0);
    const nonEmpty = groups.filter(g => g.count > 0);

    const RADIUS = 40;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    const segments = useMemo(() => {
        let offset = 0;
        return nonEmpty.map((g) => {
            const pct = total > 0 ? g.count / total : 0;
            const dash = pct * CIRCUMFERENCE;
            const seg = {
                label: g.label,
                count: g.count,
                dash,
                offset,
                color: PCT_GROUP_COLORS[groups.indexOf(g)],
            };
            offset += dash;
            return seg;
        });
    }, [nonEmpty, total]);

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
                Percentageverdeling
            </h3>
            <div className="flex gap-4 items-start">
                <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
                    <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#262626" strokeWidth="16" />
                    {segments.map((seg) => (
                        <circle
                            key={seg.label}
                            cx="50"
                            cy="50"
                            r={RADIUS}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="16"
                            strokeDasharray={`${seg.dash} ${CIRCUMFERENCE - seg.dash}`}
                            strokeDashoffset={-(seg.offset - CIRCUMFERENCE / 4)}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
                        />
                    ))}
                    <text x="50" y="46" textAnchor="middle" className="text-xs" fill="#e5e7eb" fontSize="10" fontWeight="bold">
                        {total}
                    </text>
                    <text x="50" y="58" textAnchor="middle" fill="#9ca3af" fontSize="7">
                        renners
                    </text>
                </svg>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    {groups.filter(g => g.count > 0).map((g) => (
                        <div key={g.label} className="flex items-center gap-1.5 text-[11px]">
                            <span
                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{ backgroundColor: PCT_GROUP_COLORS[groups.indexOf(g)] }}
                            />
                            <span className="text-neutral-300 truncate">{g.label}</span>
                            <span className="text-neutral-500 ml-auto shrink-0">{g.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function CommunityStats({ stats }: CommunityStatsProps) {
    if (stats.totalTeams === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-600">
                <Users size={40} className="mb-3 opacity-40" />
                <p className="text-sm">Nog geen teams ingediend in deze groep.</p>
                <p className="text-xs mt-1">Maak je team definitief via de Teambuilder.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-pink-800/40 bg-pink-950/20 p-4 text-center">
                    <div className="text-3xl font-black text-pink-400">{stats.totalTeams}</div>
                    <div className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1">
                        <Users size={11} /> Deelnemers
                    </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-center">
                    <div className="text-3xl font-black text-white">{stats.totalUniqueRiders}</div>
                    <div className="text-xs text-neutral-400 mt-1">Unieke renners</div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-center">
                    <div className="text-3xl font-black text-white">{stats.avgSelectionsPerRider.toFixed(1)}</div>
                    <div className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1">
                        <TrendingUp size={11} /> Gem. keuzes
                    </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-center">
                    <div className="text-3xl font-black text-white">{stats.moreThanHalfCount}</div>
                    <div className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1">
                        <Percent size={11} /> Meer dan helft
                    </div>
                </div>
            </div>

            {/* Top 5 per segment — 2x2 grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Top5Panel
                    title="Top 5 – Boven segment"
                    riders={stats.topBoven}
                    totalTeams={stats.totalTeams}
                    colors={SEGMENT_COLORS.boven}
                    priceRange="≥ €1.500.000"
                />
                <Top5Panel
                    title="Top 5 – Midden segment"
                    riders={stats.topMidden}
                    totalTeams={stats.totalTeams}
                    colors={SEGMENT_COLORS.midden}
                    priceRange="€750k – €1,5M"
                />
                <Top5Panel
                    title="Top 5 – Onder segment"
                    riders={stats.topOnder}
                    totalTeams={stats.totalTeams}
                    colors={SEGMENT_COLORS.onder}
                    priceRange="< €750.000"
                />
                <Top5Panel
                    title="Top 5 – Minst gekozen"
                    riders={stats.leastChosen}
                    totalTeams={stats.totalTeams}
                    colors={SEGMENT_COLORS.minst}
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.distributionByCount.length > 0 && (
                    <DistributionChart data={stats.distributionByCount} />
                )}
                <DonutChart groups={stats.percentageGroups} />
            </div>

            {/* Interesting stats */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                    <Star size={12} className="text-amber-400" /> Interessante statistieken
                </h3>
                <ul className="space-y-1.5 text-sm">
                    <li className="flex items-start gap-2 text-neutral-300">
                        <span className="text-pink-400 shrink-0">•</span>
                        Totaal verschillende renners gekozen: <strong className="text-white ml-1">{stats.totalUniqueRiders}</strong>
                    </li>
                    <li className="flex items-start gap-2 text-neutral-300">
                        <span className="text-pink-400 shrink-0">•</span>
                        Gemiddeld aantal selecties per renner: <strong className="text-white ml-1">{stats.avgSelectionsPerRider.toFixed(2)}</strong>
                    </li>
                    <li className="flex items-start gap-2 text-neutral-300">
                        <span className="text-pink-400 shrink-0">•</span>
                        Meest unieke keuzes (1 selectie): <strong className="text-white ml-1">{stats.mostUniqueRiders} renners</strong>
                    </li>
                    <li className="flex items-start gap-2 text-neutral-300">
                        <span className="text-pink-400 shrink-0">•</span>
                        Gekozen door meer dan helft van de deelnemers: <strong className="text-white ml-1">{stats.moreThanHalfCount} renners</strong>
                    </li>
                </ul>
            </div>

            {/* All riders table */}
            {stats.allRiderStats.length > 0 && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                        Alle gekozen renners
                    </h3>
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                        {stats.allRiderStats.map(r => (
                            <RiderBar
                                key={r.riderId}
                                rider={r}
                                totalTeams={stats.totalTeams}
                                barColor="bg-pink-500"
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
