import { useEffect, useState } from "react";
import { CalendarHeart, Check, ExternalLink, ImagePlus, Loader2, Save, Star, User } from "lucide-react";
import { api, API_URL } from "../lib/api";
import {
    useSettings,
    DEFAULT_GRAND_MEDITATION_CONTENT,
    isGrandMeditationExpired,
    type GrandMeditationContent,
} from "../lib/settings";
import Toast, { type ToastState } from "../components/Toast";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || "http://localhost:3000";
const EVENT_PATH = "/events/grand-group-meditation";

/** An uploaded "/uploads/..." path is served by the backend; absolute URLs pass through. */
const resolveImg = (url: string | null): string => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
};

/** The nine object-position values, laid out as a 3×3 grid. */
const POSITIONS = [
    "left top", "center top", "right top",
    "left center", "center", "right center",
    "left bottom", "center bottom", "right bottom",
];

/**
 * One image slot with upload, live preview, and adjustment controls.
 *
 * Supports images of any size: pick Fit (Cover fills the frame and may crop;
 * Contain shows the whole image) and a focal point (the 3×3 grid) so the right
 * part stays visible when cropping. The preview reflects the choices live, and
 * the same fit/position are applied on the website.
 */
function ImageSlot({
    label,
    value,
    fit = "cover",
    pos = "center",
    onChange,
    onFit,
    onPos,
    rounded = "rounded-2xl",
}: {
    label: string;
    value: string | null;
    fit?: string;
    pos?: string;
    onChange: (url: string | null) => void;
    onFit?: (fit: string) => void;
    onPos?: (pos: string) => void;
    rounded?: string;
}) {
    const [uploading, setUploading] = useState(false);
    const src = resolveImg(value);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const data = await api.upload(file);
            onChange(data.url);
        } catch {
            alert("Image upload failed.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center gap-2">
                <div className={`relative w-28 h-28 ${rounded} overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center`}>
                    {src ? (
                        <img src={src} alt={label} className="w-full h-full" style={{ objectFit: fit as any, objectPosition: pos }} />
                    ) : (
                        <User className="w-8 h-8 text-gray-300" />
                    )}
                    {uploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-[#101848] animate-spin" />
                        </div>
                    )}
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#101848] cursor-pointer hover:underline">
                    <ImagePlus className="w-3.5 h-3.5" />
                    {value ? "Change" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
                </label>
                {value && (
                    <button type="button" onClick={() => onChange(null)} className="text-[11px] text-gray-400 hover:text-red-500">
                        Remove
                    </button>
                )}
            </div>

            {/* Adjustment controls — only once an image exists */}
            {value && (onFit || onPos) && (
                <div className="pt-1">
                    {onFit && (
                        <>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Fit</p>
                            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden mb-3">
                                {["cover", "contain"].map((f) => (
                                    <button key={f} type="button" onClick={() => onFit(f)}
                                        className={`px-3 py-1 text-xs font-semibold capitalize transition-colors ${fit === f ? "bg-[#101848] text-white" : "bg-white text-gray-500 hover:text-[#101848]"}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    {onPos && (
                        <>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Focus point</p>
                            <div className="grid grid-cols-3 gap-1 w-[4.75rem]">
                                {POSITIONS.map((p) => (
                                    <button key={p} type="button" title={p} onClick={() => onPos(p)}
                                        className={`w-5 h-5 rounded-sm border transition-colors ${pos === p ? "bg-[#C9A227] border-[#C9A227]" : "bg-gray-100 border-gray-200 hover:border-[#101848]"}`} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Events() {
    const { settings, loading, apply } = useSettings();
    const [enabled, setEnabled] = useState(true);
    const [announcementEnabled, setAnnouncementEnabled] = useState(true);
    const [content, setContent] = useState<GrandMeditationContent>(DEFAULT_GRAND_MEDITATION_CONTENT);
    const [savingToggle, setSavingToggle] = useState(false);
    const [savingAnnounce, setSavingAnnounce] = useState(false);
    const [savingContent, setSavingContent] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    // Seed the form from the loaded settings, merging over defaults so the three
    // master rows always exist even before anything is customised.
    useEffect(() => {
        if (loading) return;
        setEnabled(settings.event_grand_meditation_enabled ?? true);
        setAnnouncementEnabled(settings.event_announcement_enabled ?? true);
        const stored = settings.event_grand_meditation_content;
        const base = DEFAULT_GRAND_MEDITATION_CONTENT;
        setContent({
            guru_name: stored?.guru_name || base.guru_name,
            guru_image: stored?.guru_image ?? base.guru_image,
            guru_fit: stored?.guru_fit || "cover",
            guru_pos: stored?.guru_pos || "center",
            masters: base.masters.map((def, i) => ({
                name: stored?.masters?.[i]?.name || def.name,
                image: stored?.masters?.[i]?.image ?? def.image,
                fit: stored?.masters?.[i]?.fit || "cover",
                pos: stored?.masters?.[i]?.pos || "center",
            })),
            starts_at: stored?.starts_at || base.starts_at,
            duration_hours: stored?.duration_hours || base.duration_hours,
            venue_name: stored?.venue_name || base.venue_name,
            venue_subtitle: stored?.venue_subtitle || base.venue_subtitle,
            venue_address: stored?.venue_address || base.venue_address,
            announcement_text: stored?.announcement_text || base.announcement_text,
        });
    }, [loading, settings]);

    const toggleEnabled = async (next: boolean) => {
        setSavingToggle(true);
        try {
            const updated = await api.settings.update({ event_grand_meditation_enabled: next });
            apply(updated as never);
            setEnabled(next);
            setToast({ message: next ? "Event page published." : "Event page disabled.", tone: "success" });
        } catch (err: any) {
            setToast({ message: err?.message || "Could not update the event.", tone: "error" });
        } finally {
            setSavingToggle(false);
        }
    };

    const toggleAnnouncement = async (next: boolean) => {
        setSavingAnnounce(true);
        try {
            const updated = await api.settings.update({ event_announcement_enabled: next });
            apply(updated as never);
            setAnnouncementEnabled(next);
            setToast({ message: next ? "Announcement bar shown." : "Announcement bar hidden.", tone: "success" });
        } catch (err: any) {
            setToast({ message: err?.message || "Could not update the announcement.", tone: "error" });
        } finally {
            setSavingAnnounce(false);
        }
    };

    const saveContent = async () => {
        setSavingContent(true);
        try {
            const updated = await api.settings.update({ event_grand_meditation_content: content });
            apply(updated as never);
            setToast({ message: "Event details saved.", tone: "success" });
        } catch (err: any) {
            setToast({ message: err?.message || "Could not save the event details.", tone: "error" });
        } finally {
            setSavingContent(false);
        }
    };

    const setMaster = (i: number, patch: Partial<GrandMeditationContent["masters"][number]>) =>
        setContent((c) => ({ ...c, masters: c.masters.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));

    const inputClass =
        "w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50/60 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all text-sm";

    // The event auto-hides from the website 3 days after it ends, whatever the
    // toggle says — reflect that here so the panel matches the live site.
    const expired = isGrandMeditationExpired(content);
    const effectiveLive = enabled && !expired;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#101848] flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#101848] text-white flex items-center justify-center">
                        <CalendarHeart className="w-5 h-5" />
                    </span>
                    Events
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    Publish or retract the event page, and edit the Guru and the three remembered masters
                    (names and photos). A disabled event disappears from the website and the Events menu.
                </p>
            </div>

            {/* Publish card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-bold text-black">Grand Group Meditation with our Guru</h2>
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${expired ? "bg-amber-50 text-amber-600" : effectiveLive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                                {expired ? "Auto-hidden" : effectiveLive ? "Live" : "Disabled"}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1.5">
                            Remembrance Day of our Spiritual Masters · 9 January 2027 · Serangoon Gardens Country Club, Singapore.
                        </p>
                        {expired && (
                            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                This event ended more than 3 days ago, so it is automatically hidden from the website and the Events menu — regardless of the toggle. Update the date below to bring it back.
                            </p>
                        )}
                        {effectiveLive && (
                            <a href={`${SITE_URL}${EVENT_PATH}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#101848] hover:underline mt-3">
                                <ExternalLink className="w-3.5 h-3.5" /> Preview live page
                            </a>
                        )}
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        disabled={savingToggle || loading}
                        onClick={() => toggleEnabled(!enabled)}
                        className={`w-12 h-7 rounded-full flex-shrink-0 relative transition-colors disabled:opacity-60 ${enabled ? "bg-[#101848]" : "bg-gray-200"}`}
                    >
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center ${enabled ? "left-[1.625rem]" : "left-1"}`}>
                            {savingToggle ? <Loader2 className="w-3 h-3 text-[#101848] animate-spin" /> : enabled ? <Check className="w-3 h-3 text-[#101848]" /> : null}
                        </span>
                    </button>
                </div>
            </div>

            {/* Announcement bar card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-black">Landing-page announcement</h3>
                        <p className="text-sm text-gray-500 mt-1.5">
                            A scrolling banner across the top of the home page that links to this event.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={announcementEnabled}
                        disabled={savingAnnounce || loading}
                        onClick={() => toggleAnnouncement(!announcementEnabled)}
                        className={`w-12 h-7 rounded-full flex-shrink-0 relative transition-colors disabled:opacity-60 ${announcementEnabled ? "bg-[#101848]" : "bg-gray-200"}`}
                    >
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center ${announcementEnabled ? "left-[1.625rem]" : "left-1"}`}>
                            {savingAnnounce ? <Loader2 className="w-3 h-3 text-[#101848] animate-spin" /> : announcementEnabled ? <Check className="w-3 h-3 text-[#101848]" /> : null}
                        </span>
                    </button>
                </div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Announcement text</label>
                <input className={inputClass} value={content.announcement_text} onChange={(e) => setContent((c) => ({ ...c, announcement_text: e.target.value }))} placeholder="Short line shown in the scrolling banner" />
                <p className="text-xs text-gray-400 mt-2">Saved with “Save event details” below. The banner only shows while both this and the event are enabled.</p>
            </div>

            {/* Date, time & venue card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Date, Time &amp; Venue</h3>
                <p className="text-xs text-gray-400 mb-4">
                    The page's date/time, map, and the Add to Calendar, Open in Maps and Get Directions buttons are all built from these fields.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Starts (date &amp; time)</label>
                        <input type="datetime-local" className={inputClass} value={content.starts_at} onChange={(e) => setContent((c) => ({ ...c, starts_at: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Duration (hours)</label>
                        <input type="number" min={1} max={12} step={0.5} className={inputClass} value={content.duration_hours} onChange={(e) => setContent((c) => ({ ...c, duration_hours: Number(e.target.value) }))} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Venue name</label>
                        <input className={inputClass} value={content.venue_name} onChange={(e) => setContent((c) => ({ ...c, venue_name: e.target.value }))} placeholder="Kensington Ballroom" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Venue subtitle</label>
                        <input className={inputClass} value={content.venue_subtitle} onChange={(e) => setContent((c) => ({ ...c, venue_subtitle: e.target.value }))} placeholder="Serangoon Gardens Country Club" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full address</label>
                        <input className={inputClass} value={content.venue_address} onChange={(e) => setContent((c) => ({ ...c, venue_address: e.target.value }))} placeholder="22 Kensington Park Road, Singapore 557271" />
                    </div>
                </div>
            </div>

            {/* Guru card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Our Guru</h3>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <ImageSlot
                        label="Guru"
                        value={content.guru_image}
                        fit={content.guru_fit}
                        pos={content.guru_pos}
                        rounded="rounded-full"
                        onChange={(url) => setContent((c) => ({ ...c, guru_image: url }))}
                        onFit={(f) => setContent((c) => ({ ...c, guru_fit: f }))}
                        onPos={(p) => setContent((c) => ({ ...c, guru_pos: p }))}
                    />
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Guru name</label>
                        <input className={inputClass} value={content.guru_name} onChange={(e) => setContent((c) => ({ ...c, guru_name: e.target.value }))} placeholder="Guru name" />
                    </div>
                </div>
            </div>

            {/* Masters card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#C9A227]" /> Remembered Masters
                </h3>
                <div className="space-y-5">
                    {content.masters.map((m, i) => (
                        <div key={i} className="flex flex-col sm:flex-row gap-5 items-start sm:items-center pb-5 last:pb-0 border-b last:border-0 border-gray-50">
                            <ImageSlot
                                label={`Master ${i + 1}`}
                                value={m.image}
                                fit={m.fit}
                                pos={m.pos}
                                onChange={(url) => setMaster(i, { image: url })}
                                onFit={(f) => setMaster(i, { fit: f })}
                                onPos={(p) => setMaster(i, { pos: p })}
                            />
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Master {i + 1} name</label>
                                <input className={inputClass} value={m.name} onChange={(e) => setMaster(i, { name: e.target.value })} placeholder={`Master ${i + 1} name`} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={saveContent}
                        disabled={savingContent}
                        className="inline-flex items-center gap-2 bg-[#101848] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#1b1b2b] transition-all shadow-md disabled:opacity-60"
                    >
                        {savingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingContent ? "Saving..." : "Save event details"}
                    </button>
                </div>
            </div>

            <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
    );
}
