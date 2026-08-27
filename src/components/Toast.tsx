import { useEffect, useRef } from "react";

export type ToastTone = "success" | "error";

export type ToastState = { message: string; tone: ToastTone } | null;

/**
 * Transient confirmation banner. Editors stay on the page after saving, so this is
 * the only feedback that the save landed — it auto-dismisses and can be closed.
 */
export default function Toast({
    toast,
    onDismiss,
    duration = 3500,
}: {
    toast: ToastState;
    onDismiss: () => void;
    duration?: number;
}) {
    /* Held in a ref so an inline arrow from the parent doesn't restart the timer on
       every re-render — the toast would otherwise never dismiss itself. */
    const dismissRef = useRef(onDismiss);
    useEffect(() => {
        dismissRef.current = onDismiss;
    }, [onDismiss]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => dismissRef.current(), duration);
        return () => clearTimeout(timer);
    }, [toast, duration]);

    if (!toast) return null;

    const isError = toast.tone === "error";

    return (
        <div className="fixed bottom-8 right-8 z-50 animate-toast-in" role="status" aria-live="polite">
            <div
                className={`flex items-center gap-3 pl-5 pr-4 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm ${
                    isError
                        ? "bg-red-600 border-red-500 shadow-red-600/25"
                        : "bg-[#101848] border-[#1a2560] shadow-[#101848]/25"
                }`}
            >
                <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isError ? "bg-white/20" : "bg-emerald-400/20"
                    }`}
                >
                    {isError ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>

                <span className="text-sm font-bold text-white pr-2">{toast.message}</span>

                <button
                    type="button"
                    onClick={onDismiss}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
