import {
    getAccessToken,
    getRefreshToken,
    handleSessionExpired,
    setAccessToken,
} from "./session";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * The browser blocks any http:// request made from an https:// page (mixed content),
 * so an API URL configured or default as http:// must be upgraded.
 * Loopback hosts are exempt: they are trustworthy origins and are never blocked in local dev.
 */
const upgradeInsecureUrl = (url: string) => {
    if (typeof window === "undefined") return url;
    if (window.location.protocol !== "https:") return url;

    if (url.startsWith("https://")) return url;

    if (url.startsWith("http://")) {
        const rest = url.slice("http://".length);
        const hostWithPort = rest.split("/")[0];
        const host = hostWithPort.split(":")[0];

        if (LOCAL_HOSTS.has(host)) return url;

        if (host === "34.229.234.60") {
            const path = rest.slice(hostWithPort.length);
            return `https://api.selfawarenesscentre.org${path}`;
        }
        return `https://${rest}`;
    }

    return url;
};

export const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl.trim().length > 0) {
        return upgradeInsecureUrl(stripTrailingSlash(envUrl.trim()));
    }

    if (typeof window !== "undefined") {
        if (window.location.protocol === "https:") {
            return "https://api.selfawarenesscentre.org";
        }
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return "http://127.0.0.1:8000";
};

export const API_URL = getApiBaseUrl();

const getHeaders = (isMultipart = false) => {
    const token = getAccessToken();
    const headers: Record<string, string> = {};

    if (!isMultipart) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
};

/* One refresh at a time. A screen that fires five requests at once would otherwise
   send five refreshes, and the four that lost the race would work off a stale token. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return null;

        try {
            const res = await fetch(`${API_URL}/api/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (!res.ok) return null;

            const data = await res.json();
            if (!data?.access_token) return null;

            setAccessToken(data.access_token);
            return data.access_token as string;
        } catch {
            return null;
        }
    })();

    try {
        return await refreshInFlight;
    } finally {
        refreshInFlight = null;
    }
}

export class SessionExpiredError extends Error {
    constructor() {
        super("Your session has expired. Please sign in again.");
        this.name = "SessionExpiredError";
    }
}

type RequestOptions = {
    method?: string;
    body?: BodyInit | null;
    multipart?: boolean;
};

/**
 * Authenticated fetch. On a 401 it refreshes the access token once and replays the
 * request; if the refresh fails the session is over and the app returns to login.
 * Headers are built per attempt so the replay carries the new token, not the dead one.
 */
async function authFetch(url: string, options: RequestOptions = {}): Promise<Response> {
    const send = () =>
        fetch(url, {
            method: options.method,
            headers: getHeaders(options.multipart),
            body: options.body,
        });

    const res = await send();
    if (res.status !== 401) return res;

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
        handleSessionExpired();
        throw new SessionExpiredError();
    }

    const retried = await send();
    if (retried.status === 401) {
        handleSessionExpired();
        throw new SessionExpiredError();
    }
    return retried;
}

/** Authenticated request returning parsed JSON, or throwing `errorMessage` on failure. */
async function request(url: string, errorMessage: string, options: RequestOptions = {}) {
    const res = await authFetch(url, options);
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
}

/**
 * Like `request`, but prefers the API's own `detail` over the generic message.
 * Used where the server distinguishes failures the operator must act on — a
 * duplicate email and a duplicate phone need different corrections.
 */
async function requestDetailed(url: string, errorMessage: string, options: RequestOptions = {}) {
    const res = await authFetch(url, options);
    if (!res.ok) {
        let detail: string | undefined;
        try {
            const body = await res.json();
            // FastAPI answers a validation error with a list of issues.
            detail = typeof body?.detail === "string"
                ? body.detail
                : Array.isArray(body?.detail)
                    ? body.detail.map((d: any) => d?.msg).filter(Boolean).join(". ")
                    : undefined;
        } catch {
            // Not JSON; fall through to the generic message.
        }
        throw new Error(detail || errorMessage);
    }
    return res.json();
}

const jsonBody = (payload: unknown) => JSON.stringify(payload);

/**
 * Unauthenticated POST that surfaces the API's own `detail`.
 *
 * Login, forgot-password and reset-password all run before there is a session,
 * so they must not go through `authFetch`: a 401 or 400 here is the operator
 * mistyping something, not an expiry, and routing it to the login screen would
 * throw away the message that tells them what to fix.
 */
async function publicPost(path: string, payload: unknown, fallback: string) {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        let detail: string | undefined;
        try {
            const body = await res.json();
            detail = typeof body?.detail === "string"
                ? body.detail
                : Array.isArray(body?.detail)
                    ? body.detail.map((d: any) => d?.msg).filter(Boolean).join(". ")
                    : undefined;
        } catch {
            // Not JSON; the generic message is all we have.
        }
        throw new Error(detail || fallback);
    }
    return res.json();
}

export const api = {
    auth: {
        login: async (payload: any) => publicPost(`/api/auth/login`, payload, "Login failed"),

        /** Starts a reset. Answers the same whether or not the address exists. */
        forgotPassword: async (email: string) =>
            publicPost(`/api/auth/forgot-password`, { email }, "Could not send the reset code."),

        /** Redeems the emailed code and signs the admin straight in. */
        resetPassword: async (payload: { email: string; otp: string; new_password: string }) =>
            publicPost(`/api/auth/reset-password`, payload, "Could not reset the password."),

        /* Authenticated: changing a password revokes the old sessions, so the
           response carries the replacement token pair. */
        changePassword: async (payload: { current_password: string; new_password: string }) =>
            requestDetailed(`${API_URL}/api/auth/change-password`, "Could not change the password.", {
                method: "POST",
                body: jsonBody(payload),
            }),
    },
    settings: {
        get: async () => request(`${API_URL}/api/admin/settings`, "Failed to load settings"),
        update: async (payload: unknown) =>
            requestDetailed(`${API_URL}/api/admin/settings`, "Failed to save settings", {
                method: "PUT",
                body: jsonBody(payload),
            }),
    },
    cms: {
        pages: {
            list: async () => request(`${API_URL}/api/cms/admin/pages`, "Failed to fetch pages"),
            create: async (payload: any) =>
                request(`${API_URL}/api/cms/admin/pages`, "Failed to create page", {
                    method: "POST",
                    body: jsonBody(payload),
                }),
            update: async (pageId: number, payload: any) =>
                request(`${API_URL}/api/cms/admin/pages/${pageId}`, "Failed to update page", {
                    method: "PUT",
                    body: jsonBody(payload),
                }),
            delete: async (pageId: number) =>
                request(`${API_URL}/api/cms/admin/pages/${pageId}`, "Failed to delete page", {
                    method: "DELETE",
                }),
        },
        listSections: async (page_id?: number) => {
            const url = new URL(`${API_URL}/api/cms/admin/sections`);
            if (page_id) url.searchParams.append("page_id", page_id.toString());
            return request(url.toString(), "Failed to fetch sections");
        },
        createSection: async (payload: any) =>
            request(`${API_URL}/api/cms/admin/sections`, "Failed to create section", {
                method: "POST",
                body: jsonBody(payload),
            }),
        updateSection: async (section_id: string, payload: any) =>
            request(`${API_URL}/api/cms/admin/sections/${section_id}`, "Failed to update section", {
                method: "PUT",
                body: jsonBody(payload),
            }),
        deleteSection: async (section_id: string) =>
            request(`${API_URL}/api/cms/admin/sections/${section_id}`, "Failed to delete section", {
                method: "DELETE",
            }),
        getSectionContent: async (page_id: number, section_id: string) =>
            request(
                `${API_URL}/api/cms/admin/website/${page_id}/${section_id}/content`,
                "Failed to fetch section content"
            ),
    },
    admin: {
        users: {
            list: async (q?: string) => {
                const url = new URL(`${API_URL}/api/admin/users`);
                if (q) url.searchParams.append("q", q);
                return request(url.toString(), "Failed to fetch users");
            },
            create: async (payload: unknown) =>
                requestDetailed(`${API_URL}/api/admin/users`, "Failed to add participant", {
                    method: "POST",
                    body: jsonBody(payload),
                }),
            promote: async (userId: string) =>
                request(`${API_URL}/api/admin/promote-to-admin/${userId}`, "Failed to promote user", {
                    method: "POST",
                }),
        },
        notifications: {
            list: async (limit = 20) =>
                request(`${API_URL}/api/admin/notifications?limit=${limit}`, "Failed to fetch notifications"),
        },
        analytics: {
            get: async () => request(`${API_URL}/api/admin/analytics`, "Failed to fetch analytics"),
            trends: async (period: string = "30d") =>
                request(`${API_URL}/api/admin/analytics/trends?period=${period}`, "Failed to fetch trends"),
        },
        programs: {
            list: async () => request(`${API_URL}/api/admin/programs/`, "Failed to fetch programs"),
            get: async (programId: string) =>
                request(`${API_URL}/api/admin/programs/${programId}`, "Failed to fetch program details"),
            create: async (payload: any) =>
                request(`${API_URL}/api/admin/programs/`, "Failed to create program", {
                    method: "POST",
                    body: jsonBody(payload),
                }),
            toggleStatus: async (programId: string) =>
                request(
                    `${API_URL}/api/admin/programs/${programId}/toggle-status`,
                    "Failed to toggle program status",
                    { method: "PATCH" }
                ),
            update: async (programId: string, payload: any) =>
                request(`${API_URL}/api/admin/programs/${programId}`, "Failed to update program", {
                    method: "PUT",
                    body: jsonBody(payload),
                }),
            delete: async (programId: string) =>
                request(`${API_URL}/api/admin/programs/${programId}`, "Failed to delete program", {
                    method: "DELETE",
                }),
        },
        memberships: {
            list: async () => request(`${API_URL}/api/admin/memberships/`, "Failed to fetch memberships"),
            create: async (payload: any) =>
                request(`${API_URL}/api/admin/memberships/`, "Failed to create membership", {
                    method: "POST",
                    body: jsonBody(payload),
                }),
            update: async (membershipId: string, payload: any) =>
                request(`${API_URL}/api/admin/memberships/${membershipId}`, "Failed to update membership", {
                    method: "PUT",
                    body: jsonBody(payload),
                }),
            delete: async (membershipId: string) =>
                request(`${API_URL}/api/admin/memberships/${membershipId}`, "Failed to delete membership", {
                    method: "DELETE",
                }),
            listApplications: async (membershipId?: string) => {
                let url = `${API_URL}/api/admin/memberships/applications`;
                if (membershipId) url += `?membership_id=${membershipId}`;
                return request(url, "Failed to fetch applications");
            },
            updateStatus: async (applicationId: string, status: string) =>
                request(
                    `${API_URL}/api/admin/memberships/applications/${applicationId}/status?status=${status}`,
                    "Failed to update application status",
                    { method: "PATCH" }
                ),
        },
    },
    contacts: {
        list: async () =>
            request(`${API_URL}/api/contacts/admin/list`, "Failed to fetch contact submissions"),
    },
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return request(`${API_URL}/api/upload`, "Failed to upload file", {
            method: "POST",
            body: formData,
            multipart: true,
        });
    },
};
