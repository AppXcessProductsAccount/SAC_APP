import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, CornerDownLeft } from "lucide-react";

import { api } from "../lib/api";

/* ---------------------------------------------------------------------------
 * The header's "Search everything" box.
 *
 * It was an <input> with no value, no onChange and no state behind it - a
 * search field that looked exactly like a working one and did nothing when you
 * typed in it. This is the same box, wired up.
 *
 * WHERE THE RESULTS COME FROM. Users are searched on the server, because
 * /api/admin/users already takes a `q`. Programmes, memberships and enquiries
 * have no such parameter, so their lists are fetched ONCE on the first search
 * of a session and filtered here. That is the right trade at this size - a few
 * hundred rows, against a round trip per keystroke - and the point at which it
 * stops being right is when one of those lists needs paging, at which time it
 * wants a `q` of its own rather than a bigger download.
 *
 * EVERY RESULT LANDS SOMEWHERE REAL. Programmes and memberships have detail
 * routes and go straight to the record. Users and enquiries do not, so they go
 * to their list with `?q=` and that page seeds its own filter from it - which
 * is why UsersList and ContactSubmissions read the query string.
 * ------------------------------------------------------------------------- */

interface ProgramRow {
    id: string;
    program_name?: string;
    city?: string;
    class_id?: string;
    date_range?: string;
}

interface MembershipRow {
    id: string;
    name: string;
}

interface UserRow {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
}

interface ContactRow {
    id: number;
    full_name: string;
    email: string;
    subject: string | null;
}

interface Hit {
    /** Group heading. */
    kind: string;
    id: string;
    label: string;
    detail: string;
    to: string;
}

/** Admin destinations, so the box also works as a way to get around. */
const PAGES: { label: string; detail: string; to: string; terms: string }[] = [
    { label: "Dashboard", detail: "Overview and analytics", to: "/", terms: "dashboard home overview analytics" },
    { label: "Website Sections", detail: "Edit page content", to: "/sections", terms: "sections cms content hero slides website" },
    { label: "CMS Pages", detail: "Add and rename pages", to: "/cms/pages", terms: "cms pages" },
    { label: "Enquiries", detail: "Contact form submissions", to: "/enquiries", terms: "enquiries contact submissions messages" },
    { label: "Users", detail: "Registered people", to: "/users", terms: "users people members accounts participants" },
    { label: "Programs", detail: "Retreats and courses", to: "/programs", terms: "programs programmes retreats courses classes" },
    { label: "Memberships", detail: "Membership plans", to: "/memberships", terms: "memberships plans subscriptions" },
    { label: "Membership Applications", detail: "Pending applications", to: "/memberships/applications", terms: "membership applications pending requests" },
    { label: "Settings", detail: "Your account and site settings", to: "/settings", terms: "settings account profile password" },
];

const MAX_PER_GROUP = 4;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

const matches = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle);

export default function GlobalSearch() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<{ loading: boolean; hits: Hit[] }>({ loading: false, hits: [] });
    const [active, setActive] = useState(0);

    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    /* Fetched once per session, then filtered locally. A ref rather than state:
       nothing renders from it directly, and putting it in state would re-run
       the search effect the moment it arrived. */
    const cache = useRef<{ programs: ProgramRow[]; memberships: MembershipRow[]; contacts: ContactRow[] } | null>(null);

    const term = query.trim().toLowerCase();

    /* Page hits are computed, not fetched - they are instant and they are what
       makes the box useful before a single request has come back. */
    const pageHits = useMemo<Hit[]>(() => {
        if (term.length < MIN_CHARS) return [];
        return PAGES.filter((p) => matches(p.label, term) || matches(p.terms, term))
            .slice(0, MAX_PER_GROUP)
            .map((p) => ({ kind: "Go to", id: p.to, label: p.label, detail: p.detail, to: p.to }));
    }, [term]);

    useEffect(() => {
        let live = true;
        /* Every setState lives inside the timeout, none in the effect body -
           including the "too short to search" reset. A synchronous one here
           would be a cascading render on every keystroke, and the 250ms it now
           waits to clear is invisible: the panel is hidden below MIN_CHARS
           anyway, so nobody ever sees the stale hits it is clearing. */
        const timer = setTimeout(async () => {
            if (term.length < MIN_CHARS) {
                setState({ loading: false, hits: [] });
                return;
            }
            setState((prev) => ({ ...prev, loading: true }));
            try {
                if (!cache.current) {
                    const [programs, memberships, contacts] = await Promise.all([
                        api.admin.programs.list().catch(() => []),
                        api.admin.memberships.list().catch(() => []),
                        api.contacts.list().catch(() => []),
                    ]);
                    cache.current = {
                        programs: Array.isArray(programs) ? programs : [],
                        memberships: Array.isArray(memberships) ? memberships : [],
                        contacts: Array.isArray(contacts) ? contacts : [],
                    };
                }
                const users: UserRow[] = await api.admin.users
                    .list(term)
                    .then((r: unknown) => (Array.isArray(r) ? (r as UserRow[]) : []))
                    .catch(() => []);

                if (!live) return;

                const encoded = encodeURIComponent(query.trim());
                const hits: Hit[] = [
                    ...users.slice(0, MAX_PER_GROUP).map((u) => ({
                        kind: "People",
                        id: `u-${u.id}`,
                        label: u.full_name || u.email,
                        detail: [u.email, u.phone_number].filter(Boolean).join(" · "),
                        to: `/users?q=${encoded}`,
                    })),
                    ...cache.current.programs
                        .filter((p) =>
                            matches(p.program_name ?? "", term) ||
                            matches(p.city ?? "", term) ||
                            matches(p.class_id ?? "", term))
                        .slice(0, MAX_PER_GROUP)
                        .map((p) => ({
                            kind: "Programs",
                            id: `p-${p.id}`,
                            label: p.program_name || p.class_id || "Untitled program",
                            detail: [p.city, p.date_range].filter(Boolean).join(" · "),
                            to: `/programs/${p.id}`,
                        })),
                    ...cache.current.memberships
                        .filter((m) => matches(m.name ?? "", term))
                        .slice(0, MAX_PER_GROUP)
                        .map((m) => ({
                            kind: "Memberships",
                            id: `m-${m.id}`,
                            label: m.name,
                            detail: "Membership plan",
                            to: `/memberships/edit/${m.id}`,
                        })),
                    ...cache.current.contacts
                        .filter((c) =>
                            matches(c.full_name ?? "", term) ||
                            matches(c.email ?? "", term) ||
                            matches(c.subject ?? "", term))
                        .slice(0, MAX_PER_GROUP)
                        .map((c) => ({
                            kind: "Enquiries",
                            id: `c-${c.id}`,
                            label: c.full_name,
                            detail: [c.subject, c.email].filter(Boolean).join(" · "),
                            to: `/enquiries?q=${encoded}`,
                        })),
                ];
                setState({ loading: false, hits });
                setActive(0);
            } catch {
                if (live) setState({ loading: false, hits: [] });
            }
        }, DEBOUNCE_MS);

        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [term, query]);

    // Click outside closes the panel.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const all = [...pageHits, ...state.hits];
    const showPanel = open && term.length >= MIN_CHARS;

    const go = (hit: Hit) => {
        setOpen(false);
        setQuery("");
        navigate(hit.to);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
            return;
        }
        if (!all.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % all.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + all.length) % all.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const hit = all[active] ?? all[0];
            if (hit) go(hit);
        }
    };

    let lastKind = "";

    return (
        <div ref={boxRef} className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black group-focus-within:text-black transition-colors pointer-events-none" />
            <input
                ref={inputRef}
                type="text"
                placeholder="Search everything..."
                className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border-transparent rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-black/5 focus:border-gray-200 outline-none transition-all"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
            />
            {state.loading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 animate-spin" />
            )}

            {showPanel && (
                /* Above the header's own stacking order, but below the modals
                   (z-[100]) so a dialog is never covered by a stale panel. */
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                    {all.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-400 text-center">
                            {state.loading ? "Searching…" : `Nothing matches “${query.trim()}”.`}
                        </p>
                    ) : (
                        <ul className="py-2">
                            {all.map((hit, i) => {
                                const heading = hit.kind !== lastKind ? hit.kind : null;
                                lastKind = hit.kind;
                                return (
                                    <li key={hit.id}>
                                        {heading && (
                                            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                                                {heading}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onMouseEnter={() => setActive(i)}
                                            onClick={() => go(hit)}
                                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                                                i === active ? "bg-gray-50" : "hover:bg-gray-50"
                                            }`}
                                        >
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-[#101848] truncate">{hit.label}</span>
                                                {hit.detail && (
                                                    <span className="block text-xs text-gray-400 truncate">{hit.detail}</span>
                                                )}
                                            </span>
                                            {i === active && <CornerDownLeft size={13} className="text-gray-300 shrink-0" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
