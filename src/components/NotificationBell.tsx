import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    BellOff,
    CheckCheck,
    CreditCard,
    CalendarCheck,
    BadgeCheck,
    UserPlus,
    Loader2,
    RefreshCw,
    Settings as SettingsIcon,
} from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../lib/settings";

interface NotificationItem {
    id: string;
    type: "payment" | "program_registration" | "membership_application" | "participant" | string;
    title: string;
    detail?: string | null;
    created_at: string;
    link?: string | null;
}

/**
 * Timestamp of the newest item the operator has already seen.
 *
 * Kept in localStorage rather than the database: read state is per-person and
 * per-browser, and storing it server-side would mean a table and a write on
 * every glance at the bell for no benefit the operator can perceive.
 */
const SEEN_KEY = "admin_notifications_seen_at";

const readSeenAt = (): number => {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        return raw ? Number(raw) || 0 : 0;
    } catch {
        return 0;
    }
};

const writeSeenAt = (value: number) => {
    try {
        localStorage.setItem(SEEN_KEY, String(value));
    } catch {
        // A browser refusing storage just means the dot returns on the next load.
    }
};

const ICONS: Record<string, typeof Bell> = {
    payment: CreditCard,
    program_registration: CalendarCheck,
    membership_application: BadgeCheck,
    participant: UserPlus,
};

const TONES: Record<string, string> = {
    payment: "bg-emerald-50 text-emerald-600",
    program_registration: "bg-blue-50 text-blue-600",
    membership_application: "bg-violet-50 text-violet-600",
    participant: "bg-amber-50 text-amber-600",
};

/** "just now", "5m", "3h", "2d", then a date. */
function timeAgo(iso: string): string {
    // Timestamps come back from the API without a zone; they are UTC.
    const then = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`).getTime();
    if (!then) return "";
    const secs = Math.floor((Date.now() - then) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
    return new Date(then).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const timestampOf = (item: NotificationItem) => {
    const iso = item.created_at;
    return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`).getTime() || 0;
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [seenAt, setSeenAt] = useState(readSeenAt);
    const rootRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { settings } = useSettings();

    /* Which kinds reach the bell, and how often it refreshes, both live in
       Settings. The API filters the kinds as well — reading them here is what
       lets a Settings save take effect without a reload. */
    const allOff =
        !settings.notify_payment &&
        !settings.notify_program_registration &&
        !settings.notify_membership_application &&
        !settings.notify_participant;

    const pollMs = Math.max(15, settings.notification_poll_seconds || 60) * 1000;

    const load = useCallback(async () => {
        if (allOff) {
            // Nothing can come back; skip the request rather than poll for an
            // empty list every minute.
            setItems([]);
            setError("");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = await api.admin.notifications.list(20);
            setItems(Array.isArray(data?.items) ? data.items : []);
        } catch (err: any) {
            setError(err?.message || "Could not load notifications.");
        } finally {
            setLoading(false);
        }
    }, [allOff]);

    // Fetch on mount so the unread dot is truthful before the bell is ever opened,
    // then poll while the tab is visible. Re-runs when the interval or the enabled
    // kinds change, so a Settings save takes effect straight away.
    useEffect(() => {
        load();
        const tick = () => {
            if (document.visibilityState === "visible") load();
        };
        const id = window.setInterval(tick, pollMs);
        document.addEventListener("visibilitychange", tick);
        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [load, pollMs]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const newest = useMemo(
        () => items.reduce((max, i) => Math.max(max, timestampOf(i)), 0),
        [items]
    );
    const unread = items.filter((i) => timestampOf(i) > seenAt);

    const markAllRead = useCallback(() => {
        if (!newest) return;
        writeSeenAt(newest);
        setSeenAt(newest);
    }, [newest]);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) load();
    };

    const go = (item: NotificationItem) => {
        /* Opening the panel is not by itself proof of reading it — items keep
           arriving while it is open. Following one is a definite read of
           everything listed above it, so clear up to the newest shown. */
        markAllRead();
        setOpen(false);
        if (item.link) navigate(item.link);
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                onClick={toggle}
                aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
                aria-expanded={open}
                className="relative p-2 text-black hover:text-gray-600 transition-colors"
            >
                {allOff ? <BellOff className="w-5 h-5 text-gray-300" /> : <Bell className="w-5 h-5" />}
                {unread.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                        {unread.length > 9 ? "9+" : unread.length}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-3 w-[23rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-50"
                    >
                        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between gap-3">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Notifications
                                {unread.length > 0 && (
                                    <span className="ml-2 text-red-500">{unread.length} new</span>
                                )}
                            </h3>
                            <div className="flex items-center gap-1">
                                {loading && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-300 mr-1" />
                                )}
                                {unread.length > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        title="Mark all as read"
                                        aria-label="Mark all as read"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition-colors"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={load}
                                    disabled={loading}
                                    title="Refresh"
                                    aria-label="Refresh notifications"
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition-colors disabled:opacity-40"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <Link
                                    to="/settings"
                                    onClick={() => setOpen(false)}
                                    title="Notification settings"
                                    aria-label="Notification settings"
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition-colors"
                                >
                                    <SettingsIcon className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="max-h-[26rem] overflow-y-auto">
                            {error && (
                                <div className="px-5 py-4 space-y-2">
                                    <p className="text-sm font-bold text-red-600">{error}</p>
                                    <button
                                        onClick={load}
                                        className="text-xs font-bold text-[#101848] hover:underline"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}

                            {!error && allOff && (
                                <div className="px-5 py-8 text-center space-y-2">
                                    <p className="text-sm text-gray-400">
                                        Every notification kind is switched off.
                                    </p>
                                    <Link
                                        to="/settings"
                                        onClick={() => setOpen(false)}
                                        className="text-xs font-bold text-[#101848] hover:underline"
                                    >
                                        Turn some back on
                                    </Link>
                                </div>
                            )}

                            {!error && !allOff && !loading && items.length === 0 && (
                                <p className="px-5 py-8 text-sm text-gray-400 text-center">
                                    Nothing yet. Payments, registrations and new participants will
                                    appear here.
                                </p>
                            )}

                            {!allOff &&
                                items.map((item) => {
                                    const Icon = ICONS[item.type] ?? Bell;
                                    const tone = TONES[item.type] ?? "bg-gray-50 text-gray-600";
                                    const isUnread = timestampOf(item) > seenAt;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => go(item)}
                                            className={`w-full text-left px-5 py-3.5 flex gap-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${
                                                isUnread ? "bg-blue-50/30" : ""
                                            }`}
                                        >
                                            <span
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-bold text-black truncate">
                                                    {item.title}
                                                </span>
                                                {item.detail && (
                                                    <span className="block text-xs text-gray-500 truncate">
                                                        {item.detail}
                                                    </span>
                                                )}
                                                <span className="block text-[11px] text-gray-400 font-medium mt-0.5">
                                                    {timeAgo(item.created_at)}
                                                </span>
                                            </span>
                                            {isUnread && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                                            )}
                                        </button>
                                    );
                                })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
