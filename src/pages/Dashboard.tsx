import { useEffect, useMemo, useState } from "react";
import {
    TrendingUp,
    Users,
    Calendar,
    Award,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Sparkles,
    LayoutGrid,
    UserCog,
    Globe,
} from "lucide-react";
import { motion, animate, AnimatePresence, type Variants } from "framer-motion";
import { api } from "../lib/api";
import { useSettings } from "../lib/settings";

interface StatCardData {
    value: number;
    change_percentage: number;
    is_growth: boolean;
    label: string;
}
interface AnalyticsData {
    total_participants: StatCardData;
    active_programs: StatCardData;
    total_revenue: StatCardData;
    completion_rate: StatCardData;
}

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

/** Counts a number up from 0 on mount / when the value changes. */
function useCountUp(value: number, duration = 1.2) {
    const [n, setN] = useState(0);
    useEffect(() => {
        const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(v) });
        return () => controls.stop();
    }, [value, duration]);
    return n;
}

const CARD_THEMES = [
    { grad: "linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)", icon: Users, glow: "rgba(139,92,246,0.45)" },
    { grad: "linear-gradient(135deg,#0EA5E9 0%,#14B8A6 100%)", icon: Calendar, glow: "rgba(20,184,166,0.45)" },
    { grad: "linear-gradient(135deg,#F59E0B 0%,#C9A227 100%)", icon: TrendingUp, glow: "rgba(201,162,39,0.45)" },
    { grad: "linear-gradient(135deg,#F43F5E 0%,#FB7185 100%)", icon: Award, glow: "rgba(244,63,94,0.45)" },
];

function StatCard({
    theme,
    stat,
    render,
}: {
    theme: typeof CARD_THEMES[number];
    stat: StatCardData;
    render: (n: number) => string;
}) {
    const n = useCountUp(stat.value);
    const Icon = theme.icon;
    return (
        <motion.div
            variants={fadeUp}
            whileHover={{ y: -6 }}
            className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg"
            style={{ background: theme.grad, boxShadow: `0 18px 40px -18px ${theme.glow}` }}
        >
            {/* running shine sweep */}
            <motion.div
                className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-12 bg-white/20 blur-md"
                animate={{ x: ["0%", "320%"] }}
                transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
            />
            <div className="relative flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/80 max-w-[8rem] leading-tight">{stat.label}</p>
                <span className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </span>
            </div>
            <div className="relative mt-6 flex items-end justify-between">
                <h3 className="text-3xl font-extrabold tracking-tight tabular-nums">{render(n)}</h3>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${stat.is_growth ? "bg-white/20" : "bg-black/20"}`}>
                    {stat.is_growth ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(stat.change_percentage)}%
                </span>
            </div>
            <p className="relative text-[10px] text-white/70 font-semibold mt-3 uppercase tracking-widest">vs previous period</p>
        </motion.div>
    );
}

/** Animated radial gauge for a 0–100 percentage. */
function Gauge({ value }: { value: number }) {
    const n = useCountUp(value);
    const r = 52;
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div className="relative w-40 h-40">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle cx="70" cy="70" r={r} fill="none" stroke="#EAECF4" strokeWidth="12" />
                <motion.circle
                    cx="70" cy="70" r={r} fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                />
                <defs>
                    <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#C9A227" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[#101848] tabular-nums">{Math.round(n)}%</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completion</span>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [trends, setTrends] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30d");
    const [hover, setHover] = useState<any>(null);

    const { settings } = useSettings();
    const currency = settings.default_currency;

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [analyticsRes, trendsRes] = await Promise.all([
                    api.admin.analytics.get(),
                    api.admin.analytics.trends(period),
                ]);
                setData(analyticsRes);
                setTrends(trendsRes);
            } catch {
                console.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [period]);

    const pts = trends?.trends || [];

    const chart = useMemo(() => {
        const W = 700, H = 240;
        const revMaxRaw = Math.max(...pts.map((p: any) => p.revenue), 10);
        const partMaxRaw = Math.max(...pts.map((p: any) => p.participants), 1);
        const niceMax = (m: number) => {
            const pow = Math.pow(10, Math.floor(Math.log10(m)));
            return Math.ceil(m / pow) * pow;
        };
        const revMax = niceMax(revMaxRaw);
        const n = pts.length;
        const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
        const y = (v: number) => H - (v / revMax) * H;
        const line = pts.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.revenue).toFixed(1)}`).join(" ");
        const area = `M 0 ${H} ${pts.map((p: any, i: number) => `L ${x(i).toFixed(1)} ${y(p.revenue).toFixed(1)}`).join(" ")} L ${W} ${H} Z`;
        const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: H - f * H, val: Math.round(revMax * f) }));
        return { W, H, revMax, partMax: partMaxRaw, x, y, line, area, grid, n };
    }, [pts]);

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#101848] animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Assembling your insights…</p>
            </div>
        );
    }

    const stats = data
        ? [
              { theme: CARD_THEMES[0], stat: data.total_participants, render: (n: number) => Math.round(n).toLocaleString() },
              { theme: CARD_THEMES[1], stat: data.active_programs, render: (n: number) => Math.round(n).toString() },
              { theme: CARD_THEMES[2], stat: data.total_revenue, render: (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              { theme: CARD_THEMES[3], stat: data.completion_rate, render: (n: number) => `${Math.round(n)}%` },
          ]
        : [];

    const quickActions = [
        { label: "View Programs", sub: "Manage schedules", icon: LayoutGrid, href: "/programs", grad: "from-[#6366F1] to-[#8B5CF6]" },
        { label: "Manage Users", sub: "Admins & members", icon: UserCog, href: "/users", grad: "from-[#0EA5E9] to-[#14B8A6]" },
        { label: "Website CMS", sub: "Content & pages", icon: Globe, href: "/cms/pages", grad: "from-[#F59E0B] to-[#C9A227]" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#101848]">Overview</h1>
                    <p className="text-gray-500 mt-1">Welcome back to your control center.</p>
                </div>
                <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
                    {["7d", "30d"].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`relative px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${period === p ? "text-white" : "text-gray-400 hover:text-[#101848]"}`}
                        >
                            {period === p && <motion.span layoutId="period-pill" className="absolute inset-0 rounded-lg bg-[#101848]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                            <span className="relative">{p === "7d" ? "7 Days" : "30 Days"}</span>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Stat cards */}
            <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((s, i) => (
                    <StatCard key={i} theme={s.theme} stat={s.stat} render={s.render} />
                ))}
            </motion.div>

            {/* Revenue chart + gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="lg:col-span-2 bg-white p-7 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">Income Trends</p>
                            <h3 className="text-xl font-bold text-[#101848] mt-1">{period === "30d" ? "Monthly Revenue Velocity" : "Weekly Revenue Velocity"}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total for period</p>
                            <p className="text-lg font-extrabold text-[#C9A227]">{currency} {trends?.total_revenue?.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex flex-col justify-between h-60 text-[10px] font-bold text-gray-300 w-10 text-right pr-1">
                            {[...chart.grid].reverse().map((g) => <span key={g.y}>{g.val >= 1000 ? `${(g.val / 1000).toFixed(0)}k` : g.val}</span>)}
                        </div>
                        <div className="relative flex-1 h-60">
                            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                {chart.grid.map((g) => <line key={g.y} x1="0" y1={g.y} x2={chart.W} y2={g.y} stroke="#EEF0F5" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
                                <motion.path d={chart.area} fill="url(#areaGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} />
                                <motion.path
                                    d={chart.line} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeInOut" }}
                                />
                                {hover && <line x1={hover.px} y1="0" x2={hover.px} y2={chart.H} stroke="#8B5CF6" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
                                {pts.map((p: any, i: number) => (
                                    <rect key={i} x={chart.x(i) - chart.W / (chart.n * 2)} y="0" width={chart.W / (chart.n || 1)} height={chart.H} fill="transparent"
                                        onMouseEnter={() => setHover({ ...p, px: chart.x(i), leftPct: (chart.x(i) / chart.W) * 100, topPct: (chart.y(p.revenue) / chart.H) * 100 })}
                                        onMouseLeave={() => setHover(null)} className="cursor-crosshair" />
                                ))}
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient>
                                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366F1" /><stop offset="100%" stopColor="#C9A227" /></linearGradient>
                                </defs>
                            </svg>
                            <AnimatePresence>
                                {hover && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                        className="absolute z-20 bg-[#101848] text-white px-3 py-2 rounded-xl shadow-2xl pointer-events-none min-w-[130px]"
                                        style={{ left: `${hover.leftPct}%`, top: `${hover.topPct}%`, transform: `translate(${hover.leftPct > 75 ? "-110%" : "12px"}, -50%)` }}>
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{new Date(hover.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                                        <p className="text-sm font-bold text-[#E8C766]">{currency} {hover.revenue.toLocaleString()}</p>
                                        <p className="text-[10px] text-white/60 mt-0.5">{hover.participants} registrations</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                {(period === "7d" ? pts : pts.filter((_: any, i: number) => i % 6 === 0 || i === pts.length - 1)).map((p: any, i: number) => (
                                    <span key={i}>{period === "7d" ? new Date(p.date).toLocaleDateString(undefined, { weekday: "short" }) : new Date(p.date).getDate()}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Completion gauge */}
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] self-start">Programme Completion</p>
                    <div className="flex-1 flex items-center"><Gauge value={data?.completion_rate.value ?? 0} /></div>
                    <div className="w-full flex items-center gap-2 justify-center rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-xs font-semibold text-emerald-700">{data?.completion_rate.is_growth ? "Up" : "Down"} {Math.abs(data?.completion_rate.change_percentage ?? 0)}% this period</p>
                    </div>
                </motion.div>
            </div>

            {/* Participants bar chart + quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-2 bg-white p-7 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">Engagement</p>
                            <h3 className="text-xl font-bold text-[#101848] mt-1">Registrations per {period === "7d" ? "day" : "period"}</h3>
                        </div>
                        <Sparkles className="w-5 h-5 text-[#C9A227]" />
                    </div>
                    <div className="flex items-end gap-1.5 h-48">
                        {pts.map((p: any, i: number) => {
                            const h = Math.max(4, (p.participants / (chart.partMax || 1)) * 100);
                            return (
                                <motion.div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] relative group"
                                    initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.7, delay: 0.3 + i * 0.02, ease: [0.22, 1, 0.36, 1] }}>
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#101848] bg-white px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{p.participants}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }} className="relative overflow-hidden rounded-3xl p-7 shadow-xl" style={{ background: "linear-gradient(150deg,#101848 0%,#1e1b4b 100%)" }}>
                    <motion.div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[#C9A227]/20 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
                    <p className="relative text-[11px] font-bold text-white/60 uppercase tracking-[0.15em] mb-5">Quick Actions</p>
                    <div className="relative space-y-3">
                        {quickActions.map((a) => {
                            const Icon = a.icon;
                            return (
                                <button key={a.href} onClick={() => (window.location.href = a.href)}
                                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 group hover:bg-white/10 transition-all">
                                    <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.grad} flex items-center justify-center flex-shrink-0`}><Icon className="w-5 h-5 text-white" /></span>
                                    <span className="text-left flex-1">
                                        <span className="block text-sm font-bold text-white">{a.label}</span>
                                        <span className="block text-[11px] text-white/50">{a.sub}</span>
                                    </span>
                                    <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
