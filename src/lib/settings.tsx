import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { api } from "./api";

export interface AppSettings {
    default_currency: string;
    enabled_currencies: string[];
    default_city: string | null;
    default_country: string | null;
    default_address: string | null;
    timezone: string;
    date_format: string;
    organisation_name: string | null;
    support_email: string | null;
    support_phone: string | null;
    notify_payment: boolean;
    notify_program_registration: boolean;
    notify_membership_application: boolean;
    notify_participant: boolean;
    notification_poll_seconds: number;
    event_grand_meditation_enabled: boolean;
    event_announcement_enabled: boolean;
    event_grand_meditation_content: GrandMeditationContent | null;
    home_videos: HomeVideos | null;
}

export interface HomeVideos {
    youtube: string[];
    tiktok: string[];
}

export interface EventMaster {
    name: string;
    image: string | null;
}

export interface GrandMeditationContent {
    guru_name: string;
    guru_image: string | null;
    masters: EventMaster[];
    /** Local wall-time "YYYY-MM-DDTHH:MM" in the venue's timezone (SGT). */
    starts_at: string;
    duration_hours: number;
    venue_name: string;
    venue_subtitle: string;
    venue_address: string;
    announcement_text: string;
}

/**
 * What the panel renders before the real settings land, and what it falls back to
 * if the request fails. A dashboard that shows no currency at all is worse than
 * one showing the value the database was seeded with.
 */
export const FALLBACK_SETTINGS: AppSettings = {
    default_currency: "MYR",
    enabled_currencies: ["MYR", "SGD", "USD"],
    default_city: null,
    default_country: null,
    default_address: null,
    timezone: "Asia/Kuala_Lumpur",
    date_format: "d MMM yyyy",
    organisation_name: null,
    support_email: null,
    support_phone: null,
    notify_payment: true,
    notify_program_registration: true,
    notify_membership_application: true,
    notify_participant: true,
    notification_poll_seconds: 60,
    event_grand_meditation_enabled: true,
    event_announcement_enabled: true,
    event_grand_meditation_content: null,
    home_videos: null,
};

/** Defaults shown in the Events editor before anything is customised. */
export const DEFAULT_GRAND_MEDITATION_CONTENT: GrandMeditationContent = {
    guru_name: "Gnanaguru Paranjothi Subramaniam",
    guru_image: null,
    masters: [
        { name: "Dr William Brugh Joy", image: null },
        { name: "Gnanavallal Paranjothi Mahan", image: null },
        { name: "Gnanaguru Paranjothi Sivasankaran", image: null },
    ],
    starts_at: "2027-01-09T15:00",
    duration_hours: 3,
    venue_name: "Kensington Ballroom",
    venue_subtitle: "Serangoon Gardens Country Club",
    venue_address: "22 Kensington Park Road, Singapore 557271",
    announcement_text: "Grand Group Meditation with our Guru · 9 January 2027 · Kensington Ballroom, Serangoon Gardens Country Club",
};

interface SettingsContextValue {
    settings: AppSettings;
    loading: boolean;
    /** Re-reads from the API. Called after a save so every screen catches up. */
    refresh: () => Promise<void>;
    /** Applies a saved response without a second round trip. */
    apply: (next: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
    settings: FALLBACK_SETTINGS,
    loading: true,
    refresh: async () => {},
    apply: () => {},
});

/**
 * Fetches the site settings once for the whole panel.
 *
 * Currency and timezone are read by the dashboard, both programme forms and the
 * notification bell. Fetching per screen would mean four identical requests on
 * every navigation and four chances for them to disagree.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(FALLBACK_SETTINGS);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const data = await api.settings.get();
            setSettings({ ...FALLBACK_SETTINGS, ...data });
        } catch {
            // Keep the fallback. A settings outage must not blank the dashboard.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const value = useMemo(
        () => ({
            settings,
            loading,
            refresh,
            apply: (next: AppSettings) => setSettings({ ...FALLBACK_SETTINGS, ...next }),
        }),
        [settings, loading, refresh]
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

/**
 * Formats an amount in the site's default currency.
 *
 * Prices are stored per programme in that programme's own currency, so pass
 * `currency` wherever one is known; the default is only for aggregates like
 * dashboard revenue, which the API has already converted to the base currency.
 */
export function useMoney() {
    const { settings } = useSettings();

    return useCallback(
        (amount: number | null | undefined, currency?: string | null) => {
            const code = (currency || settings.default_currency || "MYR").toUpperCase();
            const value = Number(amount ?? 0);
            return `${code} ${value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        },
        [settings.default_currency]
    );
}

/** Formats a timestamp in the site's timezone, in the operator's chosen style. */
export function useDateFormat() {
    const { settings } = useSettings();

    return useCallback(
        (value: string | Date | null | undefined, withTime = false) => {
            if (!value) return "";
            // API timestamps arrive without a zone; they are UTC.
            const iso = typeof value === "string" ? value : value.toISOString();
            const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
            if (Number.isNaN(date.getTime())) return "";

            const base: Intl.DateTimeFormatOptions = { timeZone: settings.timezone };
            const style: Intl.DateTimeFormatOptions =
                settings.date_format === "dd/MM/yyyy"
                    ? { day: "2-digit", month: "2-digit", year: "numeric" }
                    : settings.date_format === "MM/dd/yyyy"
                        ? { month: "2-digit", day: "2-digit", year: "numeric" }
                        : settings.date_format === "yyyy-MM-dd"
                            ? { year: "numeric", month: "2-digit", day: "2-digit" }
                            : { day: "numeric", month: "short", year: "numeric" };

            const time: Intl.DateTimeFormatOptions = withTime
                ? { hour: "2-digit", minute: "2-digit" }
                : {};

            try {
                return new Intl.DateTimeFormat(undefined, { ...base, ...style, ...time }).format(date);
            } catch {
                // An unknown IANA zone would otherwise take the whole screen down.
                return new Intl.DateTimeFormat(undefined, { ...style, ...time }).format(date);
            }
        },
        [settings.timezone, settings.date_format]
    );
}

export const DATE_FORMATS = [
    { value: "d MMM yyyy", label: "20 Apr 2026" },
    { value: "dd/MM/yyyy", label: "20/04/2026" },
    { value: "MM/dd/yyyy", label: "04/20/2026" },
    { value: "yyyy-MM-dd", label: "2026-04-20" },
];

/** IANA zones the centre is plausibly run from, plus UTC as a neutral fallback. */
export const TIMEZONES = [
    "Asia/Kuala_Lumpur",
    "Asia/Singapore",
    "Asia/Kolkata",
    "Asia/Jakarta",
    "Asia/Bangkok",
    "Asia/Hong_Kong",
    "Asia/Dubai",
    "Australia/Sydney",
    "Europe/London",
    "America/New_York",
    "UTC",
];

/** Currencies offered by the picker. Any 3-letter code is accepted by the API. */
export const CURRENCY_OPTIONS = [
    { code: "MYR", label: "Malaysian Ringgit" },
    { code: "SGD", label: "Singapore Dollar" },
    { code: "USD", label: "US Dollar" },
    { code: "INR", label: "Indian Rupee" },
    { code: "EUR", label: "Euro" },
    { code: "GBP", label: "Pound Sterling" },
    { code: "AUD", label: "Australian Dollar" },
    { code: "IDR", label: "Indonesian Rupiah" },
    { code: "THB", label: "Thai Baht" },
    { code: "AED", label: "UAE Dirham" },
];

export const COUNTRIES = [
    "Malaysia",
    "Singapore",
    "India",
    "Indonesia",
    "Thailand",
    "Australia",
    "United Kingdom",
    "United States",
    "United Arab Emirates",
];
