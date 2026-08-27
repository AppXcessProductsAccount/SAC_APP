/**
 * Where the admin session lives, and what happens when it ends.
 *
 * Access tokens expire after 30 minutes. Before this, every request made after that
 * point simply failed with a 401 and the screen showed "Failed to load …" with no
 * way forward. Now the API layer refreshes the token in place, and only when the
 * refresh itself fails does the session end and the app return to the login page.
 */

const TOKEN_KEY = "token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "user";

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export function saveSession(accessToken: string, refreshToken: string | undefined, user: unknown) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setAccessToken(accessToken: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
}

/* The API layer lives outside React, so the router hands it a way to navigate.
   Falls back to a hard redirect if nothing has registered yet. */
type ExpiryHandler = () => void;
let expiryHandler: ExpiryHandler | null = null;
let alreadyExpiring = false;

export function setSessionExpiredHandler(handler: ExpiryHandler | null) {
    expiryHandler = handler;
}

/** Ends the session and sends the user to the login screen — once, not once per failed request. */
export function handleSessionExpired() {
    if (alreadyExpiring) return;
    alreadyExpiring = true;

    clearSession();

    if (expiryHandler) {
        expiryHandler();
        // Let a fresh login start the cycle over.
        setTimeout(() => {
            alreadyExpiring = false;
        }, 1000);
        return;
    }

    window.location.replace("/login?expired=1");
}
