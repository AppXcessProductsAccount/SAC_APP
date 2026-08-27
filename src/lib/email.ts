/*
 * Ported from the public site (frontend/lib/email.ts) so the admin judges an
 * email address exactly the way the website does, and both agree with the
 * server's EmailStr.
 *
 * Keep the two in step — a fix to one belongs in the other.
 */
/**
 * The one place an email address is judged, for every form that collects one.
 *
 * `<input type="email">` alone is not enough, which is why these forms looked
 * like they had no validation at all: the HTML5 rule requires only "something,
 * an @, something", so `abc@abc`, `a@b` and `name@localhost` all pass it and are
 * submitted happily. The server then rejects them — or worse, accepts an address
 * that no one can ever be reached at, which for a sign-in code or an enquiry
 * reply means the person simply never hears back.
 *
 * The check here is the practical one rather than the full RFC 5322 grammar:
 * exactly one @, a sane local part, and a real domain with a dotted, alphabetic
 * ending. RFC 5322 permits quoted strings, comments and bare hostnames that no
 * mail provider will actually issue, and accepting them here would only let
 * through addresses that cannot receive mail.
 *
 * The native `type="email"` attributes are deliberately left in place: they give
 * the mobile keyboard its @ key and catch the crudest mistakes before submit.
 * This runs on top of them.
 */

/** Longest address SMTP will carry, local + @ + domain. */
const MAX_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;

/* Dot-separated atoms of unquoted "atext" characters — no leading, trailing or
   doubled dot, which is where hand-typed addresses usually go wrong. */
const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

/* One DNS label: alphanumeric, hyphens allowed inside but not at either end. */
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

type Failure = "empty" | "shape" | "local" | "domain" | "length";

/** Why `value` is unusable, or null when it is fine. */
function failureOf(value?: string | null): Failure | null {
    const address = (value ?? "").trim();
    if (!address) return "empty";
    if (address.length > MAX_LENGTH) return "length";

    // Split on the LAST @, so an unquoted @ in the local part is reported as a
    // local-part problem rather than silently making the domain wrong.
    const at = address.lastIndexOf("@");
    if (at <= 0 || at === address.length - 1) return "shape";
    if (/\s/.test(address)) return "shape";

    const local = address.slice(0, at);
    const domain = address.slice(at + 1);

    if (local.length > MAX_LOCAL_LENGTH || !LOCAL_PART.test(local)) return "local";

    const labels = domain.split(".");
    // A single label ("localhost", "abc") is a hostname, not an address anyone
    // outside this network can be reached at.
    if (labels.length < 2) return "domain";
    if (labels.some((label) => label.length > 63 || !DOMAIN_LABEL.test(label))) return "domain";

    // The ending has to be a real one: letters only, at least two of them.
    if (!/^[A-Za-z]{2,}$/.test(labels[labels.length - 1])) return "domain";

    return null;
}

/** True when `value` is an address that could actually receive mail. */
export const isValidEmail = (value?: string | null): boolean => failureOf(value) === null;

/**
 * What to tell someone whose address was refused.
 *
 * Each message names the part that is wrong, because "invalid email address" on
 * a line the person has just read back to themselves is no help at all.
 */
export const emailErrorMessage = (value?: string | null): string => {
    switch (failureOf(value)) {
        case null:
            return "";
        case "empty":
            return "Enter an email address.";
        case "length":
            return "That email address is too long.";
        case "local":
            return "Check the part before the @.";
        case "domain":
            return "Check the part after the @ — it needs a domain ending, like name@example.com.";
        default:
            return "Enter a valid email address, like name@example.com.";
    }
};

/** Trimmed, ready to send. Case is left alone — the local part is not ours to change. */
export const normaliseEmail = (value?: string | null): string => (value ?? "").trim();
