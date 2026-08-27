import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    Bell,
    Building2,
    Check,
    Coins,
    Eye,
    EyeOff,
    Globe2,
    KeyRound,
    Loader2,
    MapPin,
    Plus,
    ShieldCheck,
    X,
} from "lucide-react";
import { api } from "../lib/api";
import { isValidEmail, emailErrorMessage, normaliseEmail } from "../lib/email";
import { saveSession } from "../lib/session";
import Toast, { type ToastState } from "../components/Toast";
import {
    COUNTRIES,
    CURRENCY_OPTIONS,
    DATE_FORMATS,
    TIMEZONES,
    useSettings,
    type AppSettings,
} from "../lib/settings";

type TabKey = "account" | "localisation" | "organisation" | "notifications";

const TABS: { key: TabKey; label: string; icon: typeof KeyRound }[] = [
    { key: "account", label: "Account", icon: KeyRound },
    { key: "localisation", label: "Location & Currency", icon: Globe2 },
    { key: "organisation", label: "Organisation", icon: Building2 },
    { key: "notifications", label: "Notifications", icon: Bell },
];

const NOTIFICATION_ROWS: {
    field: keyof AppSettings;
    label: string;
    description: string;
}[] = [
    {
        field: "notify_payment",
        label: "Payments",
        description: "A participant completes a payment.",
    },
    {
        field: "notify_program_registration",
        label: "Programme registrations",
        description: "Someone registers for a programme.",
    },
    {
        field: "notify_membership_application",
        label: "Membership applications",
        description: "A membership application is submitted.",
    },
    {
        field: "notify_participant",
        label: "New participants",
        description: "A new participant account is created.",
    },
];

const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/60 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all text-sm";

const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

function Card({
    title,
    description,
    icon: Icon,
    children,
    footer,
}: {
    title: string;
    description?: string;
    icon: typeof KeyRound;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <header className="px-8 pt-7 pb-5 flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-gray-50 text-[#101848] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-black">{title}</h2>
                    {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
                </div>
            </header>
            <div className="px-8 pb-7 space-y-5">{children}</div>
            {footer && (
                <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex justify-end">
                    {footer}
                </div>
            )}
        </section>
    );
}

function SaveButton({
    saving,
    disabled,
    label = "Save changes",
}: {
    saving: boolean;
    disabled?: boolean;
    label?: string;
}) {
    return (
        <button
            type="submit"
            disabled={saving || disabled}
            className="px-6 py-3 bg-[#101848] text-white rounded-xl font-bold text-sm hover:bg-[#1a2560] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : label}
        </button>
    );
}

/** Password field with a reveal toggle — long passwords are mistyped otherwise. */
function PasswordInput({
    value,
    onChange,
    placeholder,
    autoComplete,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
}) {
    const [shown, setShown] = useState(false);
    return (
        <div className="relative">
            <input
                type={shown ? "text" : "password"}
                required
                value={value}
                autoComplete={autoComplete}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${inputClass} pr-12`}
            />
            <button
                type="button"
                onClick={() => setShown((s) => !s)}
                aria-label={shown ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-black transition-colors"
            >
                {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
}

/* ── Account ─────────────────────────────────────────────────────────────── */

function AccountTab({ notify }: { notify: (t: ToastState) => void }) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);

    const tooShort = next.length > 0 && next.length < 8;
    const mismatch = confirm.length > 0 && confirm !== next;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (next.length < 8) {
            setError("The new password must be at least 8 characters.");
            return;
        }
        if (next !== confirm) {
            setError("The two new passwords do not match.");
            return;
        }

        setSaving(true);
        try {
            const tokens = await api.auth.changePassword({
                current_password: current,
                new_password: next,
            });
            /* The change revoked every session the old password authorised,
               including this one. The response carries its replacement — store it
               or the very next request 401s the admin back to the login screen. */
            if (tokens?.access_token) {
                saveSession(tokens.access_token, tokens.refresh_token, user);
            }
            setCurrent("");
            setNext("");
            setConfirm("");
            notify({ message: "Password updated. Other sessions signed out.", tone: "success" });
        } catch (err: any) {
            setError(err?.message || "Could not change the password.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <Card
                title="Change password"
                description="Signs out every other browser this account is open in."
                icon={KeyRound}
                footer={
                    <SaveButton
                        saving={saving}
                        disabled={!current || !next || !confirm}
                        label="Update password"
                    />
                }
            >
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                    <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                        Signed in as <span className="font-bold text-black">{user.email || "—"}</span>
                    </p>
                </div>

                {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
                        {error}
                    </div>
                )}

                <div>
                    <label className={labelClass}>Current password</label>
                    <PasswordInput
                        value={current}
                        onChange={setCurrent}
                        placeholder="Your current password"
                        autoComplete="current-password"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>New password</label>
                        <PasswordInput
                            value={next}
                            onChange={setNext}
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                        />
                        {tooShort && (
                            <p className="text-xs text-amber-600 font-medium mt-2">
                                At least 8 characters.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>Confirm new password</label>
                        <PasswordInput
                            value={confirm}
                            onChange={setConfirm}
                            placeholder="Repeat it"
                            autoComplete="new-password"
                        />
                        {mismatch && (
                            <p className="text-xs text-red-600 font-medium mt-2">
                                These do not match.
                            </p>
                        )}
                    </div>
                </div>
            </Card>
        </form>
    );
}

/* ── Location & currency ─────────────────────────────────────────────────── */

function LocalisationTab({
    draft,
    setDraft,
    onSave,
    saving,
    dirty,
}: {
    draft: AppSettings;
    setDraft: (patch: Partial<AppSettings>) => void;
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
    dirty: boolean;
}) {
    const [adding, setAdding] = useState("");

    const enabled = draft.enabled_currencies || [];
    const addable = CURRENCY_OPTIONS.filter((c) => !enabled.includes(c.code));

    const addCurrency = (code: string) => {
        const clean = code.trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(clean) || enabled.includes(clean)) return;
        setDraft({ enabled_currencies: [...enabled, clean] });
        setAdding("");
    };

    const removeCurrency = (code: string) => {
        // The default has to stay selectable, so it cannot be the one removed.
        if (code === draft.default_currency) return;
        setDraft({ enabled_currencies: enabled.filter((c) => c !== code) });
    };

    return (
        <form onSubmit={onSave} className="space-y-6">
            <Card
                title="Currency"
                description="The default is preselected on new programmes; the enabled list is what the currency picker offers."
                icon={Coins}
            >
                <div>
                    <label className={labelClass}>Default currency</label>
                    <select
                        value={draft.default_currency}
                        onChange={(e) => setDraft({ default_currency: e.target.value })}
                        className={inputClass}
                    >
                        {/* The current default must appear even if it is not one of the
                            known options — it may have been typed in by hand. */}
                        {Array.from(new Set([draft.default_currency, ...enabled])).map((code) => {
                            const known = CURRENCY_OPTIONS.find((c) => c.code === code);
                            return (
                                <option key={code} value={code}>
                                    {code}
                                    {known ? ` — ${known.label}` : ""}
                                </option>
                            );
                        })}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                        Dashboard revenue is reported in this currency.
                    </p>
                </div>

                <div>
                    <label className={labelClass}>Enabled currencies</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {enabled.map((code) => {
                            const isDefault = code === draft.default_currency;
                            return (
                                <span
                                    key={code}
                                    className={`inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl text-sm font-bold border ${
                                        isDefault
                                            ? "bg-[#101848] text-white border-[#101848]"
                                            : "bg-gray-50 text-black border-gray-100"
                                    }`}
                                >
                                    {code}
                                    {isDefault ? (
                                        <span className="text-[10px] uppercase tracking-wider opacity-70 pr-1">
                                            Default
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeCurrency(code)}
                                            aria-label={`Remove ${code}`}
                                            className="w-5 h-5 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </span>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={adding}
                            onChange={(e) => setAdding(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Add a currency...</option>
                            {addable.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.code} — {c.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => addCurrency(adding)}
                            disabled={!adding}
                            className="px-4 py-3 rounded-xl bg-gray-100 text-black font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                </div>
            </Card>

            <Card
                title="Location"
                description="Prefills new programmes and shows on the public contact details."
                icon={MapPin}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Default city</label>
                        <input
                            type="text"
                            value={draft.default_city || ""}
                            onChange={(e) => setDraft({ default_city: e.target.value })}
                            placeholder="Kuala Lumpur"
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Country</label>
                        <input
                            list="settings-countries"
                            value={draft.default_country || ""}
                            onChange={(e) => setDraft({ default_country: e.target.value })}
                            placeholder="Malaysia"
                            className={inputClass}
                        />
                        <datalist id="settings-countries">
                            {COUNTRIES.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Centre address</label>
                    <textarea
                        rows={3}
                        value={draft.default_address || ""}
                        onChange={(e) => setDraft({ default_address: e.target.value })}
                        placeholder="Street, unit, postcode"
                        className={`${inputClass} resize-none`}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Timezone</label>
                        <input
                            list="settings-timezones"
                            value={draft.timezone}
                            onChange={(e) => setDraft({ timezone: e.target.value })}
                            className={inputClass}
                        />
                        <datalist id="settings-timezones">
                            {TIMEZONES.map((tz) => (
                                <option key={tz} value={tz} />
                            ))}
                        </datalist>
                        <p className="text-xs text-gray-400 mt-2">
                            Dates in the panel are shown in this zone.
                        </p>
                    </div>
                    <div>
                        <label className={labelClass}>Date format</label>
                        <select
                            value={draft.date_format}
                            onChange={(e) => setDraft({ date_format: e.target.value })}
                            className={inputClass}
                        >
                            {DATE_FORMATS.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <SaveButton saving={saving} disabled={!dirty} />
            </div>
        </form>
    );
}

/* ── Organisation ────────────────────────────────────────────────────────── */

function OrganisationTab({
    draft,
    setDraft,
    onSave,
    saving,
    dirty,
}: {
    draft: AppSettings;
    setDraft: (patch: Partial<AppSettings>) => void;
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
    dirty: boolean;
}) {
    return (
        <form onSubmit={onSave} className="space-y-6">
            <Card
                title="Organisation"
                description="Shown in the panel header and on the public contact details."
                icon={Building2}
            >
                <div>
                    <label className={labelClass}>Organisation name</label>
                    <input
                        type="text"
                        value={draft.organisation_name || ""}
                        onChange={(e) => setDraft({ organisation_name: e.target.value })}
                        placeholder="Self Awareness Meditation Centre"
                        className={inputClass}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Support email</label>
                        <input
                            type="email"
                            value={draft.support_email || ""}
                            onChange={(e) => setDraft({ support_email: e.target.value })}
                            placeholder="hello@example.com"
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Support phone</label>
                        <input
                            type="tel"
                            value={draft.support_phone || ""}
                            onChange={(e) => setDraft({ support_phone: e.target.value })}
                            placeholder="+60 12 345 6789"
                            className={inputClass}
                        />
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <SaveButton saving={saving} disabled={!dirty} />
            </div>
        </form>
    );
}

/* ── Notifications ───────────────────────────────────────────────────────── */

function NotificationsTab({
    draft,
    setDraft,
    onSave,
    saving,
    dirty,
}: {
    draft: AppSettings;
    setDraft: (patch: Partial<AppSettings>) => void;
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
    dirty: boolean;
}) {
    const anyOn = NOTIFICATION_ROWS.some((row) => draft[row.field] as boolean);

    return (
        <form onSubmit={onSave} className="space-y-6">
            <Card
                title="What reaches the bell"
                description="Switched-off kinds are filtered by the API, so they never reach the unread count."
                icon={Bell}
            >
                <div className="divide-y divide-gray-50 -mx-2">
                    {NOTIFICATION_ROWS.map((row) => {
                        const on = draft[row.field] as boolean;
                        return (
                            <label
                                key={row.field}
                                className="flex items-center gap-4 px-2 py-4 cursor-pointer"
                            >
                                <span
                                    className={`w-11 h-6 rounded-full flex-shrink-0 relative transition-colors ${
                                        on ? "bg-[#101848]" : "bg-gray-200"
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                                            on ? "left-[1.375rem]" : "left-0.5"
                                        }`}
                                    />
                                </span>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={on}
                                    onChange={(e) =>
                                        setDraft({ [row.field]: e.target.checked } as Partial<AppSettings>)
                                    }
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-black">{row.label}</span>
                                    <span className="block text-xs text-gray-500">{row.description}</span>
                                </span>
                                {on && <Check className="w-4 h-4 text-[#101848] flex-shrink-0" />}
                            </label>
                        );
                    })}
                </div>

                {!anyOn && (
                    <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700 font-medium">
                        Every kind is switched off — the bell will stay empty.
                    </div>
                )}

                <div className="pt-2">
                    <label className={labelClass}>Refresh every</label>
                    <select
                        value={draft.notification_poll_seconds}
                        onChange={(e) => setDraft({ notification_poll_seconds: Number(e.target.value) })}
                        className={inputClass}
                    >
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={300}>5 minutes</option>
                        <option value={900}>15 minutes</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                        The bell only polls while the tab is visible.
                    </p>
                </div>
            </Card>

            <div className="flex justify-end">
                <SaveButton saving={saving} disabled={!dirty} />
            </div>
        </form>
    );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Settings() {
    const { settings, loading, apply, refresh } = useSettings();
    const [tab, setTab] = useState<TabKey>("account");
    const [draft, setDraftState] = useState<AppSettings>(settings);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    /* Re-seed the draft from whatever the provider holds, but only once the
       first fetch has landed — seeding on every settings change would wipe an
       edit in progress the moment another screen refreshed. */
    useEffect(() => {
        if (!loading) setDraftState(settings);
    }, [loading, settings]);

    const setDraft = (patch: Partial<AppSettings>) => setDraftState((d) => ({ ...d, ...patch }));

    const dirty = useMemo(
        () => JSON.stringify(draft) !== JSON.stringify(settings),
        [draft, settings]
    );

    const save = async (e: React.FormEvent) => {
        e.preventDefault();

        /* The API types this as EmailStr, so an unreachable address comes back as
           a 422 that reads "could not save settings" — naming the field here is
           the difference between a fixable message and a mystery. */
        const supportEmail = normaliseEmail(draft.support_email);
        if (supportEmail && !isValidEmail(supportEmail)) {
            setToast({ message: `Support email: ${emailErrorMessage(supportEmail)}`, tone: "error" });
            return;
        }

        setSaving(true);
        try {
            const saved = await api.settings.update({
                default_currency: draft.default_currency,
                enabled_currencies: draft.enabled_currencies,
                default_city: draft.default_city,
                default_country: draft.default_country,
                default_address: draft.default_address,
                timezone: draft.timezone,
                date_format: draft.date_format,
                organisation_name: draft.organisation_name,
                // An empty box means "no support address", which the API stores as
                // null; sending "" would fail its email validation instead.
                support_email: supportEmail || null,
                support_phone: draft.support_phone,
                notify_payment: draft.notify_payment,
                notify_program_registration: draft.notify_program_registration,
                notify_membership_application: draft.notify_membership_application,
                notify_participant: draft.notify_participant,
                notification_poll_seconds: draft.notification_poll_seconds,
            });
            // The API normalises what it stores — currency casing, and forcing the
            // default into the enabled list — so render what came back, not the draft.
            apply(saved);
            setToast({ message: "Settings saved.", tone: "success" });
        } catch (err: any) {
            setToast({ message: err?.message || "Could not save settings.", tone: "error" });
            // Pull the stored values back so the form is not left claiming a change
            // that never landed.
            refresh();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-black">Settings</h1>
                <p className="text-gray-500 mt-1">
                    Your password, and how the panel handles money, place and alerts.
                </p>
            </header>

            <div className="flex gap-2 flex-wrap border-b border-gray-100">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2 -mb-px ${
                            tab === key
                                ? "border-[#101848] text-black"
                                : "border-transparent text-gray-500 hover:text-black"
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {loading && tab !== "account" ? (
                <div className="flex items-center gap-3 text-gray-400 py-16 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-bold">Loading settings...</span>
                </div>
            ) : (
                <div className="max-w-3xl">
                    {tab === "account" && <AccountTab notify={setToast} />}
                    {tab === "localisation" && (
                        <LocalisationTab
                            draft={draft}
                            setDraft={setDraft}
                            onSave={save}
                            saving={saving}
                            dirty={dirty}
                        />
                    )}
                    {tab === "organisation" && (
                        <OrganisationTab
                            draft={draft}
                            setDraft={setDraft}
                            onSave={save}
                            saving={saving}
                            dirty={dirty}
                        />
                    )}
                    {tab === "notifications" && (
                        <NotificationsTab
                            draft={draft}
                            setDraft={setDraft}
                            onSave={save}
                            saving={saving}
                            dirty={dirty}
                        />
                    )}
                </div>
            )}

            <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
    );
}
