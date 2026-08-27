/*
 * Ported from the public site (frontend/components/forms/PhoneField.tsx) so the
 * admin panel collects phone numbers exactly the way the website does: same
 * country list, same per-country validation, same E.164 value shape.
 *
 * Keep the two in step — a fix to one belongs in the other.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PhoneInput, { isValidPhoneNumber, getCountryCallingCode, parsePhoneNumber } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import countryLabels from "react-phone-number-input/locale/en.json";
import { validatePhoneNumberLength } from "libphonenumber-js";
import { Check, ChevronDown, Search } from "lucide-react";
import "react-phone-number-input/style.css";

/**
 * The one phone input used across the site.
 *
 * Wraps `react-phone-number-input`, which carries the full country list with flags
 * and dial codes and validates against libphonenumber's per-country rules — so an
 * 8-digit Singapore number and a 10-digit Malaysian one are each judged by their own
 * country's format rather than one loose length check.
 *
 * The value it reports is E.164 ("+6591234567"), which is what the API stores.
 */

/** True when `value` is a complete, valid number for the country it declares. */
export const isValidPhone = (value?: string | null) =>
    !!value && isValidPhoneNumber(value);

/**
 * Whether a longer real number for this country begins with `value`.
 *
 * The reason the cap cannot simply be a maximum length: India's plan runs from 8
 * to 13 digits, because alongside its 10-digit mobiles it has real 11-digit
 * toll-free and 12-digit service numbers. Any fixed cap is therefore either too
 * short for one of those or too long for a mobile. What actually distinguishes
 * them is the prefix, so the question asked here is about this number, not about
 * its country.
 *
 * Two digits of lookahead, because a country's number lengths can step by two —
 * one is not always enough to see the next valid length from the current one.
 */
const hasLongerValidNumber = (value: string, lookahead = 2): boolean => {
    if (lookahead === 0) return false;

    for (const digit of "0123456789") {
        const next = value + digit;
        if (validatePhoneNumberLength(next) === "TOO_LONG") continue;
        if (isValidPhoneNumber(next)) return true;
        if (hasLongerValidNumber(next, lookahead - 1)) return true;
    }
    return false;
};

/**
 * True when `value` is a real number that no further digit could extend into a
 * different real number — in other words, the person has finished typing.
 */
const isCompleteNumber = (value: string): boolean =>
    isValidPhoneNumber(value) && !hasLongerValidNumber(value);

/**
 * Whether one more digit may be added to `value`.
 *
 * A number that is still being typed always accepts more, so an unfinished
 * number is never fought with while it is being entered. It is only once the
 * number is complete — or past every length its country allows — that the next
 * keystroke is refused.
 *
 * The library's own `limitMaxLength` is the second clause of this and stays
 * switched on; it is the first clause that it cannot do, because it caps on the
 * lengths a country finds POSSIBLE rather than the ones it finds VALID, and for
 * India those are 8-13 either way.
 */
const canAcceptAnotherDigit = (value: string, digit: string): boolean =>
    !isCompleteNumber(value) && validatePhoneNumberLength(value + digit) !== "TOO_LONG";

/** Drops trailing digits until nothing is left that the field would have refused. */
const trimToAcceptable = (value: string): string => {
    let trimmed = value;
    while (trimmed.length > 2 && !canAcceptAnotherDigit(trimmed.slice(0, -1), trimmed.slice(-1))) {
        trimmed = trimmed.slice(0, -1);
    }
    return trimmed;
};

/**
 * The message a form shows when it is submitted with an unusable number.
 *
 * Deliberately plain. The field now refuses a digit that could never belong to a
 * real number, so "too long" cannot reach a form at all and the only case left is
 * a number the person has not finished typing — which is worth a nudge, not an
 * accusation that their number is wrong.
 *
 * Names the country only to say which set of rules the number is short of.
 */
export const phoneErrorMessage = (value?: string | null) => {
    const country = value ? parsePhoneNumber(value)?.country : undefined;
    const label = country ? (countryLabels as Record<string, string>)[country] : undefined;
    return label
        ? `Enter a complete ${label} phone number.`
        : "Enter a phone number, including its country code.";
};

/* No SSR here, unlike the public site, so the layout effect can be used directly. */
const useIsomorphicLayoutEffect = useLayoutEffect;

interface CountryOption {
    value?: Country;
    label: string;
}

interface CountrySelectProps {
    value?: Country;
    onChange: (value?: Country) => void;
    options: CountryOption[];
    iconComponent?: React.ComponentType<{ country?: Country; label?: string }>;
    disabled?: boolean;
    readOnly?: boolean;
    /** Fired after a country is picked, with the country being replaced and the one
     *  chosen. Reaches here through the library's `countrySelectProps`. */
    onCountrySelected?: (prevCountry?: Country, nextCountry?: Country) => void;
}

/**
 * Replaces the library's native <select>.
 *
 * The default is a real `<select>`, so the browser draws its option list as an OS
 * popup that is positioned outside the page and can extend past the window. This
 * draws the list itself — scrollable, width-capped to the viewport, and searchable,
 * which matters for a ~250-entry list.
 *
 * The list is rendered through a PORTAL onto <body>, fixed-positioned against the
 * trigger, rather than absolutely inside the field. Every form this field appears in
 * sits in a card or dialog that clips its own overflow — the contact page's "Send an
 * Inquiry" card is `overflow-hidden`, and so is the programs registration dialog — so
 * an in-flow dropdown got cut off at the container's edge and most of the country list
 * was simply unreachable. Nothing outside <body> can clip a portal.
 */
function CountrySelect({ value, onChange, options, iconComponent: Icon, disabled, readOnly, onCountrySelected }: CountrySelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    /* Viewport coordinates for the portalled panel. Undefined until first measured, so
       the panel is never painted at the top-left corner for a frame. */
    const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | undefined>();

    /** Widest the panel is allowed to get, and the gap it keeps from the trigger. */
    const PANEL_WIDTH = 288;   // w-72
    const PANEL_HEIGHT = 320;  // search row + max-h-60 list
    const GAP = 8;

    /* Measured against the viewport because the panel is `position: fixed`. Flips above
       the trigger when the space below it is too small, and is clamped so neither edge
       can end up off screen on a narrow window. */
    const positionPanel = useCallback(() => {
        const trigger = rootRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * GAP);
        const below = window.innerHeight - rect.bottom - GAP;
        const above = rect.top - GAP;
        const openUpward = below < Math.min(PANEL_HEIGHT, above);
        const top = openUpward
            ? Math.max(GAP, rect.top - GAP - Math.min(PANEL_HEIGHT, above))
            : rect.bottom + GAP;
        const left = Math.min(Math.max(GAP, rect.left), window.innerWidth - width - GAP);
        setPanelStyle({ top, left, width });
    }, []);

    // Only real countries are searchable; the library's "International" entry has no
    // country code and no dial code to match on.
    const countries = useMemo(() => options.filter((o) => !!o.value), [options]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return countries;
        return countries.filter((o) => {
            const dial = o.value ? `+${getCountryCallingCode(o.value)}` : "";
            return (
                o.label.toLowerCase().includes(q) ||
                dial.includes(q) ||
                (o.value ?? "").toLowerCase().includes(q)
            );
        });
    }, [countries, query]);

    /* Before paint, so the panel never appears at a stale position for a frame. */
    useIsomorphicLayoutEffect(() => {
        if (open) positionPanel();
    }, [open, positionPanel]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node;
            // The panel lives outside this subtree now, so it has to be tested too —
            // otherwise clicking inside the list would count as clicking away.
            if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        /* A fixed panel does not move with the page, so it is repositioned as the page
           scrolls. Capture phase catches scrolling of any ancestor, not just the window
           — the registration dialog scrolls its own container. */
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", positionPanel, true);
        window.addEventListener("resize", positionPanel);
        // Focus the search box so typing filters immediately.
        searchRef.current?.focus();
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", positionPanel, true);
            window.removeEventListener("resize", positionPanel);
        };
    }, [open, positionPanel]);

    const selected = options.find((o) => o.value === value);

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                disabled={disabled || readOnly}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={selected ? `Country: ${selected.label}` : "Select country"}
                className="flex items-center gap-1 py-0.5 pr-1 disabled:opacity-50"
            >
                {/* Flag and chevron only. The dial code is NOT repeated here: with
                    `international` the library already renders it as part of the input's
                    own value ("+65 9123 4567"), so showing it again in the trigger put
                    two country codes side by side. */}
                {Icon && <Icon country={value} label={selected?.label ?? ""} />}
                <ChevronDown size={14} className="text-[#101848]/40" />
            </button>

            {open && panelStyle && createPortal(
                /* z-index sits above the registration dialog (z-1200), which is the
                   highest layer this field is used inside. */
                <div
                    ref={panelRef}
                    style={{ position: "fixed", top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
                    className="z-[2000] rounded-2xl border border-black/10 bg-white shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2">
                        <Search size={14} className="text-black/30 shrink-0" />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search country or code"
                            className="w-full min-w-0 bg-transparent text-sm outline-none"
                        />
                    </div>

                    <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
                        {filtered.length === 0 && (
                            <li className="px-3 py-3 text-sm text-black/40">No matches</li>
                        )}
                        {filtered.map((o) => (
                            <li key={o.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={o.value === value}
                                    onClick={() => {
                                        const prevCountry = value;
                                        onChange(o.value);
                                        setOpen(false);
                                        setQuery("");
                                        onCountrySelected?.(prevCountry, o.value);
                                    }}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/[0.04] ${
                                        o.value === value ? "bg-black/[0.04] font-semibold" : ""
                                    }`}
                                >
                                    {Icon && <Icon country={o.value} label={o.label} />}
                                    <span className="min-w-0 flex-1 truncate text-[#101848]">{o.label}</span>
                                    <span className="shrink-0 text-black/40">
                                        +{o.value ? getCountryCallingCode(o.value) : ""}
                                    </span>
                                    {o.value === value && <Check size={14} className="shrink-0 text-[#101848]" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>,
                document.body,
            )}
        </div>
    );
}

interface Props {
    value?: string;
    onChange: (value: string | undefined) => void;
    /** Country pre-selected before the user types a `+` prefix. */
    defaultCountry?: Country;
    label?: string;
    /** Shown under the field; also puts the control into its error styling. */
    error?: string;
    required?: boolean;
    placeholder?: string;
    id?: string;
    /** Renders a hidden input of this name carrying the E.164 value, for forms
     *  that read fields by name (FormData, or a native POST to an external service). */
    name?: string;
    className?: string;
}

export default function PhoneField({
    value,
    onChange,
    defaultCountry = "SG",
    label,
    error,
    required,
    placeholder = "Phone number",
    id,
    name,
    className = "",
}: Props) {
    /* The library does not type a ref through to its <input>, so the number input is
       reached through the wrapper instead. `PhoneInputInput` is the class the library
       puts on it. */
    const fieldRef = useRef<HTMLDivElement>(null);
    const numberInput = () => fieldRef.current?.querySelector<HTMLInputElement>("input.PhoneInputInput") ?? null;

    /**
     * Puts the caret after the last character of the number.
     *
     * Picking a country makes the library focus the number input itself, and a
     * programmatic `.focus()` on an input that has not been clicked yet leaves the
     * caret at position 0 — in front of the "+65" the field is pre-filled with. The
     * next digit typed then lands BEFORE the country code, which the formatter throws
     * away, so the field looks like it is ignoring every keystroke: a country can be
     * selected but no number can be entered after it.
     *
     * Deferred a tick because the library focuses inside a setState callback, so at
     * the moment focus lands the input still holds the previous country's prefix.
     *
     * Only a caret still sitting at 0 is moved. A click lands its own caret before
     * this runs, so clicking into the middle of a typed number is left alone.
     *
     * `takeFocus` is for the country-selection path: the panel that was just dismissed
     * held the focus, and the library's own re-focus is not something to depend on.
     */
    const caretToEnd = (takeFocus = false) => {
        setTimeout(() => {
            const el = numberInput();
            if (!el) return;
            if (takeFocus && document.activeElement !== el) el.focus();
            if (document.activeElement !== el) return;
            if (el.selectionStart !== 0 || el.selectionEnd !== 0) return;
            el.setSelectionRange(el.value.length, el.value.length);
        }, 0);
    };

    /**
     * Carries the digits already typed over to a newly picked country.
     *
     * In `international` mode the library deliberately DISCARDS whatever is in the
     * field when the country changes, replacing it with the bare new dial code
     * (`getPhoneDigitsForNewCountry` in phoneInputHelpers.js). The field opens on a
     * default country, so the natural order — type your number, then correct the flag —
     * wiped the number every time, which reads as the field refusing to keep a number
     * after a country is selected.
     *
     * The old dial code is stripped and the new one prepended, keeping the national
     * digits. Re-emitted on the next tick, after the library has applied its own reset,
     * so this lands as an external `value` change and the library re-derives the input
     * from it. If the result is wrong for the new country, validation says so on blur —
     * far better than silently emptying the field.
     */
    const carryDigitsToNewCountry = (prevCountry?: Country, nextCountry?: Country) => {
        caretToEnd(true);
        if (!nextCountry || prevCountry === nextCountry) return;

        const digits = (value ?? "").replace(/[^0-9]/g, "");
        if (!digits) return;
        const prevDial = prevCountry ? getCountryCallingCode(prevCountry) : "";
        const national = prevDial && digits.startsWith(prevDial) ? digits.slice(prevDial.length) : digits;
        if (!national) return;

        /* Trimmed for the country being moved to: carrying ten digits onto a
           country that never has more than eight would otherwise hand the field a
           number it will not let the next keystroke extend or the form accept. */
        const carried = trimToAcceptable(`+${getCountryCallingCode(nextCountry)}${national}`);
        setTimeout(() => onChange(carried), 0);
    };

    /**
     * Refuses a digit that could not belong to a real number for the country in
     * the flag — so an Indian mobile simply stops taking input after its tenth
     * digit rather than accepting an eleventh and being rejected later.
     *
     * This runs on keydown and calls `preventDefault`, so the library never sees
     * the keystroke. Gating inside `onChange` instead would desync it, for the
     * same reason `limitMaxLength` has to be the library's own: the library sets
     * its internal state from the digit it has already accepted and re-derives it
     * only when the `value` PROPERTY changes — which is exactly what swallowing a
     * keystroke fails to do.
     */
    const refuseImpossibleDigit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Shortcuts and IME composition are not digits being typed.
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (!/^[0-9]$/.test(e.key)) return;

        const el = e.currentTarget;
        // Typing over a selection replaces digits rather than adding one.
        if (el.selectionStart !== el.selectionEnd) return;

        const current = value ?? "";
        // Nothing to measure against until a country code is in place.
        if (!current.startsWith("+")) return;

        if (!canAcceptAnotherDigit(current, e.key)) e.preventDefault();
    };

    /**
     * Paste takes the same cap, and for the same reason is handled before the
     * library sees it. A pasted number carrying its own "+" replaces the field;
     * bare digits extend what is already there.
     *
     * An empty field is left to the library: with nothing typed yet there is no
     * country code to measure the digits against, and guessing one would turn a
     * pasted local number into a foreign one.
     */
    const pasteWithinLimit = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const current = value ?? "";
        if (!current.startsWith("+")) return;

        const pasted = e.clipboardData.getData("text");
        const digits = pasted.replace(/[^0-9]/g, "");
        if (!digits) return;

        e.preventDefault();
        const merged = pasted.trimStart().startsWith("+") ? `+${digits}` : `${current}${digits}`;
        onChange(trimToAcceptable(merged));
    };

    /* Only the form's own submit-time error is shown now. The field used to run
       its own check the moment it lost focus, so a number that was merely
       unfinished was called invalid while the person was still working on it. The
       digit cap prevents the over-long case outright, which was the case that
       check mostly caught, so there is nothing left worth interrupting for. */
    const shownError = error;

    return (
        <div ref={fieldRef} className={className}>
            {/* Mirrors the value for forms that read submitted fields by name (FormData
                or a native POST) rather than from React state. */}
            {name && <input type="hidden" name={name} value={value ?? ""} />}
            {label && (
                <label htmlFor={id} className="text-xs font-bold text-black/70 uppercase">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <PhoneInput
                id={id}
                international
                /* `countryCallingCodeEditable={false}` is deliberately NOT set. It locks
                   the "+65" prefix inside the input, and with a custom country trigger
                   beside it that made the field feel unresponsive — the caret lands in
                   the protected prefix and keystrokes appear to do nothing. Leaving the
                   prefix editable lets the number be typed or pasted normally; the value
                   is still emitted as E.164. */
                defaultCountry={defaultCountry}
                /* Normalised to undefined: the library treats "" as a controlled value
                   it cannot parse, which leaves the input inert. Callers hold their
                   phone as a plain string default of "", so convert at the boundary. */
                value={value || undefined}
                onChange={onChange}
                /* The library's own max-length stop, from the same per-country
                   "possible lengths" table. This has to be the LIBRARY's, not ours: a
                   gate in `onChange` that swallows a keystroke leaves the library's
                   internal state holding the digit it already accepted while the value
                   we report stays behind. Nothing resyncs them — the library only
                   re-derives its state when the `value` PROPERTY changes, and a
                   swallowed keystroke is precisely the case where it does not. The
                   input then kept showing digits that never reached the form, and once
                   past the country's maximum the reported value froze for good.
                   `limitMaxLength` trims inside the library, before its state is set,
                   so the input and the value cannot drift apart. */
                limitMaxLength
                placeholder={placeholder}
                countrySelectComponent={CountrySelect}
                /* Spread onto CountrySelect by the library, which is the only way to
                   reach our own country trigger with an extra prop. */
                countrySelectProps={{ onCountrySelected: carryDigitsToNewCountry }}
                onFocus={() => caretToEnd()}
                onKeyDown={refuseImpossibleDigit}
                onPaste={pasteWithinLimit}
                aria-invalid={!!shownError}
                /* `phone-field` is styled in index.css — the library ships structural
                   CSS only, so the country control and the text input need to be matched
                   to the surrounding form controls there. */
                className={`phone-field ${shownError ? "phone-field--error" : ""}`}
            />
            {shownError && <p className="text-[11px] font-bold text-red-600 mt-1">{shownError}</p>}
        </div>
    );
}
