import { useEffect, useState } from "react";
import { Youtube, Music2, Plus, Trash2, Save, Loader2, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import { useSettings, type HomeVideos as HV } from "../lib/settings";
import Toast, { type ToastState } from "../components/Toast";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || "http://localhost:3000";

/** One editable list of video URLs (YouTube or TikTok). */
function VideoList({
    title,
    hint,
    accent,
    icon,
    urls,
    onChange,
}: {
    title: string;
    hint: string;
    accent: string;
    icon: React.ReactNode;
    urls: string[];
    onChange: (next: string[]) => void;
}) {
    const inputClass =
        "flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50/60 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all text-sm";
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: accent }}>
                    {icon}
                </span>
                <h3 className="text-lg font-bold text-black">{title}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">{hint}</p>

            <div className="space-y-3">
                {urls.length === 0 && <p className="text-sm text-gray-400 italic">No videos yet — add one below.</p>}
                {urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="w-6 text-xs font-bold text-gray-300 text-right">{i + 1}</span>
                        <input
                            className={inputClass}
                            value={url}
                            placeholder="Paste a video link"
                            onChange={(e) => onChange(urls.map((u, idx) => (idx === i ? e.target.value : u)))}
                        />
                        {url.trim() && (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#101848] p-1" title="Open link">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => onChange(urls.filter((_, idx) => idx !== i))}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Remove"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => onChange([...urls, ""])}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#101848] hover:underline"
            >
                <Plus className="w-4 h-4" /> Add {title.split(" ")[0]} video
            </button>
        </div>
    );
}

export default function HomeVideos() {
    const { settings, loading, apply } = useSettings();
    const [videos, setVideos] = useState<HV>({ youtube: [], tiktok: [] });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    useEffect(() => {
        if (loading) return;
        const v = settings.home_videos;
        setVideos({
            youtube: Array.isArray(v?.youtube) ? v!.youtube : [],
            tiktok: Array.isArray(v?.tiktok) ? v!.tiktok : [],
        });
    }, [loading, settings]);

    const save = async () => {
        setSaving(true);
        try {
            // Drop blank rows before saving.
            const payload = {
                youtube: videos.youtube.map((u) => u.trim()).filter(Boolean),
                tiktok: videos.tiktok.map((u) => u.trim()).filter(Boolean),
            };
            const updated = await api.settings.update({ home_videos: payload });
            apply(updated as never);
            setVideos(payload);
            setToast({ message: "Home-page videos saved.", tone: "success" });
        } catch (err: any) {
            setToast({ message: err?.message || "Could not save the videos.", tone: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#101848] flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#101848] text-white flex items-center justify-center">
                        <Youtube className="w-5 h-5" />
                    </span>
                    Home Videos
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    Add YouTube and TikTok links. They appear on the home page as two separate side-by-side rows —
                    YouTube first, then TikTok. Paste normal share links; embeds are handled automatically.
                </p>
                <a href={`${SITE_URL}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#101848] hover:underline mt-3">
                    <ExternalLink className="w-3.5 h-3.5" /> Preview home page
                </a>
            </div>

            <div className="space-y-6">
                <VideoList
                    title="YouTube"
                    hint="e.g. https://www.youtube.com/watch?v=… or https://youtu.be/…"
                    accent="#E23A2E"
                    icon={<Youtube className="w-5 h-5" />}
                    urls={videos.youtube}
                    onChange={(youtube) => setVideos((v) => ({ ...v, youtube }))}
                />
                <VideoList
                    title="TikTok"
                    hint="e.g. https://www.tiktok.com/@user/video/7412345678901234567"
                    accent="#111111"
                    icon={<Music2 className="w-5 h-5" />}
                    urls={videos.tiktok}
                    onChange={(tiktok) => setVideos((v) => ({ ...v, tiktok }))}
                />

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="inline-flex items-center gap-2 bg-[#101848] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#1b1b2b] transition-all shadow-md disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Saving…" : "Save videos"}
                    </button>
                </div>
            </div>

            <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
    );
}
