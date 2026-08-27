import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useSettings } from "../lib/settings";
import DateRangePicker from "../components/DateRangePicker";
import { format } from "date-fns";
import { 
    ChevronLeft, 
    Rocket, 
    MapPin, 
    FileText, 
    Layers,
    CheckCircle2,
    Plus,
    X,
    Globe,
    MessageSquare
} from "lucide-react";

export default function CreateProgram() {
    const navigate = useNavigate();
    const { settings, loading: settingsLoading } = useSettings();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        program_name: "",
        city: "",
        address: "",
        class_id: "",
        is_active: true,
        order_id: 0,
        languages: ["English", "Tamil", "Chinese"] as string[],
        discovery_sources: ["TikTok", "Facebook", "Instagram", "Introducer"] as string[],
        price: 0.0,
        is_refundable: true,
        refund_percentage: 100.0,
        allow_partial_payment: false,
        minimum_deposit: 0.0,
        balance_due_days: 7,
        currency: "MYR"
    });
    const [newLang, setNewLang] = useState("");
    const [newSource, setNewSource] = useState("");

    /* Prefill from the site settings once they land. Only fields the operator has
       not touched are filled, so an early typist does not have their entry
       overwritten by a late response. */
    useEffect(() => {
        if (settingsLoading) return;
        setFormData((prev) => ({
            ...prev,
            currency: prev.currency === "MYR" ? settings.default_currency : prev.currency,
            city: prev.city || settings.default_city || "",
            address: prev.address || settings.default_address || "",
        }));
    }, [settingsLoading, settings.default_currency, settings.default_city, settings.default_address]);

    const currencyOptions = useMemo(
        () => Array.from(new Set([...(settings.enabled_currencies || []), formData.currency].filter(Boolean))),
        [settings.enabled_currencies, formData.currency]
    );
    const [dates, setDates] = useState<{ start: Date | null, end: Date | null }>({
        start: null,
        end: null
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dates.start || !dates.end) {
            alert("Please select a date range");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...formData,
                date_range: `${format(dates.start, "dd-MM-yyyy")} to ${format(dates.end, "dd-MM-yyyy")}`
            };
            await api.admin.programs.create(payload);
            navigate("/programs");
        } catch (err: any) {
            alert(err.message || "Failed to create program");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-black font-bold text-xs mb-4 transition-colors uppercase tracking-widest"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to list
                    </button>
                    <h1 className="text-3xl font-bold text-black">New Program</h1>
                    <p className="text-gray-400 font-medium mt-1 text-sm">Launch a new session for your community.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[1.5rem] border border-gray-100 shadow-sm space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Program Name (Optional)</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="text"
                                    placeholder="e.g. SASM IPOH"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                    value={formData.program_name}
                                    onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">City / Hub</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Kuala Lumpur"
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Class Code</label>
                                <div className="relative">
                                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. KL-2024"
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                        value={formData.class_id}
                                        onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Sort Order</label>
                                <div className="relative">
                                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        required
                                        type="number"
                                        placeholder="1"
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                        value={formData.order_id}
                                        onChange={(e) => setFormData({ ...formData, order_id: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Full Venue Address</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-5 w-4 h-4 text-gray-300" />
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Complete street address and landmarks..."
                                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black resize-none"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Schedule / Date Range</label>
                            <DateRangePicker 
                                value={dates}
                                onChange={(newRange) => setDates(newRange)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                                    <Globe className="w-3 h-3" />
                                    Available Languages
                                </label>
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl min-h-[100px] content-start">
                                    {formData.languages.map(lang => (
                                        <div key={lang} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-black group">
                                            {lang}
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({ ...formData, languages: formData.languages.filter(l => l !== lang) })}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex-1 min-w-[120px]">
                                        <input 
                                            type="text"
                                            placeholder="Add language..."
                                            className="w-full px-2 py-1 bg-transparent border-none outline-none text-xs font-bold text-black"
                                            value={newLang}
                                            onChange={(e) => setNewLang(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newLang.trim()) {
                                                    e.preventDefault();
                                                    if (!formData.languages.includes(newLang.trim())) {
                                                        setFormData({ ...formData, languages: [...formData.languages, newLang.trim()] });
                                                    }
                                                    setNewLang("");
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-gray-400 font-medium italic">Press Enter to add multiple languages</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" />
                                    Discovery Sources
                                </label>
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl min-h-[100px] content-start">
                                    {formData.discovery_sources.map(source => (
                                        <div key={source} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-black">
                                            {source}
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({ ...formData, discovery_sources: formData.discovery_sources.filter(s => s !== source) })}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex-1 min-w-[120px]">
                                        <input 
                                            type="text"
                                            placeholder="Add source..."
                                            className="w-full px-2 py-1 bg-transparent border-none outline-none text-xs font-bold text-black"
                                            value={newSource}
                                            onChange={(e) => setNewSource(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newSource.trim()) {
                                                    e.preventDefault();
                                                    if (!formData.discovery_sources.includes(newSource.trim())) {
                                                        setFormData({ ...formData, discovery_sources: [...formData.discovery_sources, newSource.trim()] });
                                                    }
                                                    setNewSource("");
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-gray-400 font-medium italic">Press Enter to add multiple sources</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Configuration */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[1.5rem] border border-gray-100 shadow-sm space-y-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Visibility</p>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <p className="text-sm font-bold text-black">Active Status</p>
                                <p className="text-[10px] text-gray-400 font-medium">Show on website</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_active ? 'bg-[#00BA71]' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="pt-4 space-y-4 border-t border-gray-50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pricing & Payment</p>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Currency</label>
                                {/* The list comes from Settings, so a code that is not
                                    enabled cannot be typed in by accident. The programme's
                                    own value is added in case it predates the current list. */}
                                <select
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                >
                                    {currencyOptions.map((code) => (
                                        <option key={code} value={code}>{code}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Total Price</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-xs font-bold text-black">Refundable</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_refundable: !formData.is_refundable })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.is_refundable ? 'bg-black' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.is_refundable ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {formData.is_refundable && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Refund %</label>
                                    <input
                                        type="number"
                                        placeholder="100"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                        value={formData.refund_percentage}
                                        onChange={(e) => setFormData({ ...formData, refund_percentage: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-xs font-bold text-black">Partial Payment</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({ ...formData, allow_partial_payment: !formData.allow_partial_payment })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.allow_partial_payment ? 'bg-black' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.allow_partial_payment ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {formData.allow_partial_payment && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Min Deposit (RM)</label>
                                        <input
                                            type="number"
                                            placeholder="50.00"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                            value={formData.minimum_deposit}
                                            onChange={(e) => setFormData({ ...formData, minimum_deposit: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Balance Due (Days)</label>
                                        <input
                                            type="number"
                                            placeholder="7"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold text-sm text-black"
                                            value={formData.balance_due_days}
                                            onChange={(e) => setFormData({ ...formData, balance_due_days: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="pt-4 space-y-4">
                            <button 
                                disabled={loading}
                                type="submit"
                                className="w-full py-4 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></div>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4" />
                                        Launch Program
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-gray-300 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-[#00BA71]" />
                                Data is automatically saved
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
