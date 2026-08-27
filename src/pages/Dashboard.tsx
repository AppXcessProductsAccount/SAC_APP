import { useEffect, useState } from "react";
import { 
    TrendingUp, 
    Users, 
    Calendar, 
    ArrowUpRight, 
    ArrowDownRight,
    Loader2
} from "lucide-react";
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

export default function Dashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [trends, setTrends] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30d");
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);

    // The base currency every figure on this page is reported in.
    const { settings } = useSettings();
    const currency = settings.default_currency;

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [analyticsRes, trendsRes] = await Promise.all([
                    api.admin.analytics.get(),
                    api.admin.analytics.trends(period)
                ]);
                setData(analyticsRes);
                setTrends(trendsRes);
            } catch (err) {
                console.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [period]);

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-black animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Assembling your insights...</p>
            </div>
        );
    }

    const stats = data ? [
        { 
            ...data.total_participants,
            icon: Users,
            formatter: (v: number) => v.toLocaleString()
        },
        { 
            ...data.active_programs,
            icon: Calendar,
            formatter: (v: number) => v.toString()
        },
        { 
            ...data.total_revenue,
            icon: TrendingUp,
            /* The API converts every programme's takings into the base currency
               before summing, so this labels the total with the site default
               rather than a hardcoded "MYR". */
            formatter: (v: number) => `${currency} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
        { 
            ...data.completion_rate,
            icon: ArrowUpRight,
            formatter: (v: number) => `${v}%`
        },
    ] : [];

    // Dynamic SVG Chart Logic
    const trendPoints = trends?.trends || [];
    const rawMax = Math.max(...trendPoints.map((p: any) => p.revenue), 100);
    
    // Calculate a "nice" max value and step size
    const getNiceMax = (max: number) => {
        if (max <= 100) return { max: Math.ceil(max / 20) * 20, step: 20 };
        if (max <= 500) return { max: Math.ceil(max / 100) * 100, step: 100 };
        if (max <= 1000) return { max: Math.ceil(max / 200) * 200, step: 200 };
        if (max <= 5000) return { max: Math.ceil(max / 500) * 500, step: 500 };
        if (max <= 10000) return { max: Math.ceil(max / 1000) * 1000, step: 1000 };
        return { max: Math.ceil(max / 2000) * 2000, step: 2000 };
    };

    const { max: niceMax, step: stepSize } = getNiceMax(rawMax);
    const yAxisSteps = [];
    for (let i = niceMax; i >= 0; i -= stepSize) {
        yAxisSteps.push(i);
    }

    return (
        <div className="space-y-10">
            {/* ... rest of the component ... */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black">Overview</h1>
                    <p className="text-gray-400 font-medium mt-1">Welcome back to your control center.</p>
                </div>
                <div className="flex gap-2 p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <button 
                        onClick={() => setPeriod("7d")}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${period === '7d' ? 'bg-[#F2F2F2] text-black' : 'text-gray-400 hover:text-black'}`}
                    >
                        7 Days
                    </button>
                    <button 
                        onClick={() => setPeriod("30d")}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${period === '30d' ? 'bg-[#F2F2F2] text-black' : 'text-gray-400 hover:text-black'}`}
                    >
                        30 Days
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white p-8 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                <Icon className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                            </div>
                            <div className="flex items-baseline gap-3">
                                <h3 className="text-3xl font-bold text-black">{stat.formatter(stat.value)}</h3>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                                    stat.is_growth 
                                        ? "bg-green-50 text-[#00BA71]" 
                                        : "bg-red-50 text-red-500"
                                }`}>
                                    {stat.is_growth ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {Math.abs(stat.change_percentage)}%
                                </span>
                            </div>
                            <p className="text-xs text-gray-300 font-bold mt-4 uppercase tracking-widest">Growth vs last 30d</p>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Income Trends Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[1.5rem] border border-gray-100 shadow-sm relative overflow-visible">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Income Trends</p>
                            <h3 className="text-2xl font-bold text-black mt-1">
                                {period === "30d" ? "Monthly Revenue Velocity" : "Weekly Revenue Velocity"}
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total for Period</p>
                            <p className="text-lg font-bold text-[#00BA71]">{currency} {trends?.total_revenue?.toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        {/* Y-Axis Labels */}
                        <div className="flex flex-col justify-between h-64 text-[10px] font-bold text-gray-300 w-8">
                            {yAxisSteps.map((val) => (
                                <span key={val}>
                                    {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                </span>
                            ))}
                        </div>

                        {/* Chart Area */}
                        <div className="h-64 flex-1 relative group">
                            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                {/* Grid Lines */}
                                {yAxisSteps.map((val) => {
                                    const y = 100 - (val / niceMax) * 100;
                                    return (
                                        <line 
                                            key={val}
                                            x1="0" y1={y} x2="100" y2={y}
                                            stroke="#F2F2F2" strokeWidth="0.1"
                                        />
                                    );
                                })}
                                
                                {/* Area Path */}
                                <path
                                    d={`
                                        M 0 100
                                        ${trendPoints.map((p: any, i: number) => {
                                            const x = (i / (trendPoints.length - 1 || 1)) * 100;
                                            const y = 100 - (p.revenue / niceMax) * 100;
                                            return `L ${x} ${y}`;
                                        }).join(' ')}
                                        L 100 100
                                        Z
                                    `}
                                    fill="url(#gradient)"
                                    opacity="0.1"
                                />
                                
                                {/* Line Path */}
                                <path
                                    d={`
                                        M ${ (0 / (trendPoints.length - 1 || 1)) * 100 } ${ 100 - (trendPoints[0]?.revenue / niceMax) * 100 }
                                        ${trendPoints.map((p: any, i: number) => {
                                            const x = (i / (trendPoints.length - 1 || 1)) * 100;
                                            const y = 100 - (p.revenue / niceMax) * 100;
                                            return `L ${x} ${y}`;
                                        }).join(' ')}
                                    `}
                                    fill="none"
                                    stroke="#7C3AED"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                {/* Interactive Overlay */}
                                {trendPoints.map((p: any, i: number) => {
                                    const x = (i / (trendPoints.length - 1 || 1)) * 100;
                                    return (
                                        <rect
                                            key={i}
                                            x={x - (100 / (trendPoints.length * 2))}
                                            y="0"
                                            width={100 / (trendPoints.length || 1)}
                                            height="100"
                                            fill="transparent"
                                            className="cursor-crosshair"
                                            onMouseEnter={() => setHoveredPoint({ ...p, x, y: 100 - (p.revenue / niceMax) * 100 })}
                                            onMouseLeave={() => setHoveredPoint(null)}
                                        />
                                    );
                                })}

                                {hoveredPoint && (
                                    <g>
                                        <line x1={hoveredPoint.x} y1="0" x2={hoveredPoint.x} y2="100" stroke="#7C3AED" strokeWidth="0.2" strokeDasharray="2" />
                                        <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="1.5" fill="#7C3AED" stroke="white" strokeWidth="0.5" />
                                    </g>
                                )}

                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#7C3AED" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            
                            {/* Custom Tooltip */}
                            {hoveredPoint && (
                                <div 
                                    className="absolute z-50 bg-[#1A1A1A] text-white p-3 rounded-xl shadow-2xl pointer-events-none min-w-[120px]"
                                    style={{ 
                                        left: `${hoveredPoint.x}%`, 
                                        top: `${hoveredPoint.y}%`,
                                        transform: `translate(${hoveredPoint.x > 80 ? '-110%' : '10px'}, -50%)`
                                    }}
                                >
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                        {new Date(hoveredPoint.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: period === '7d' ? 'long' : undefined })}
                                    </p>
                                    <p className="text-xs font-bold flex items-center gap-2">
                                        income: <span className="text-[#FF9F1C]">{currency} {hoveredPoint.revenue.toLocaleString()}</span>
                                    </p>
                                    <p className="text-[10px] font-medium text-gray-500 mt-1">
                                        {hoveredPoint.participants} Registrations
                                    </p>
                                </div>
                            )}

                            {/* X-Axis Labels */}
                            <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                {period === "7d" ? (
                                    trendPoints.map((p: any, i: number) => (
                                        <span key={i}>{new Date(p.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                    ))
                                ) : period === "30d" ? (
                                    // Show labels for every 5th day to avoid crowding
                                    trendPoints.filter((_: any, i: number) => i % 5 === 0 || i === trendPoints.length - 1).map((p: any, i: number) => (
                                        <span key={i}>{new Date(p.date).getDate()}</span>
                                    ))
                                ) : (
                                    <>
                                        <span>{new Date(trendPoints[0]?.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span>{new Date(trendPoints[trendPoints.length - 1]?.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Info */}
                <div className="bg-black p-8 rounded-[1.5rem] border border-black shadow-xl shadow-black/10">
                    <div className="flex items-center justify-between mb-8 text-white">
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Quick Actions</p>
                    </div>
                    <div className="space-y-4">
                        <button 
                            onClick={() => window.location.href = '/programs'}
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all"
                        >
                            <div className="text-left">
                                <p className="text-xs font-bold text-white uppercase tracking-widest">View Programs</p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Manage schedules</p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-all" />
                        </button>
                        <button 
                            onClick={() => window.location.href = '/users'}
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all"
                        >
                            <div className="text-left">
                                <p className="text-xs font-bold text-white uppercase tracking-widest">Manage Users</p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Admin & Members</p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-all" />
                        </button>
                        <button 
                            onClick={() => window.location.href = '/cms'}
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all"
                        >
                            <div className="text-left">
                                <p className="text-xs font-bold text-white uppercase tracking-widest">Website CMS</p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Content Management</p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-all" />
                        </button>
                    </div>
                    
                    <div className="mt-10 p-6 bg-[#00BA71]/10 border border-[#00BA71]/20 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#00BA71] animate-pulse" />
                            <p className="text-[10px] font-bold text-[#00BA71] uppercase tracking-widest">Performance Peak</p>
                        </div>
                        <p className="text-xs text-white/70 mt-3 leading-relaxed font-medium">
                            Your completion rate is up <span className="text-white font-bold">{data?.completion_rate.change_percentage}%</span> this month. Great job!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
