import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { api } from "../lib/api";
import { isValidEmail, emailErrorMessage, normaliseEmail } from "../lib/email";
import { saveSession } from "../lib/session";

type Step = "request" | "verify";

const inputClass =
    "w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all placeholder:text-gray-400";

/** Seconds to wait before another code may be requested. */
const RESEND_SECONDS = 45;

export default function ForgotPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Carried over from the login form, so the address does not have to be retyped.
    const [email, setEmail] = useState(searchParams.get("email") || "");
    const [step, setStep] = useState<Step>("request");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [shown, setShown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => window.clearTimeout(id);
    }, [cooldown]);

    const requestCode = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");

        /* Sending the reset code to an address that cannot receive it looks
           identical to a successful send, since the reply is deliberately vague
           about whether the account exists. */
        const address = normaliseEmail(email);
        if (!isValidEmail(address)) {
            setError(emailErrorMessage(address));
            return;
        }

        setLoading(true);
        try {
            const res = await api.auth.forgotPassword(address);
            /* The API answers the same way whether or not the address belongs to
               an admin — it must not confirm who has panel access. So the screen
               advances regardless, and a wrong address simply never receives a
               code. */
            setNotice(res?.message || "If that email belongs to an admin account, a reset code is on its way.");
            setStep("verify");
            setCooldown(RESEND_SECONDS);
        } catch (err: any) {
            setError(err?.message || "Could not send the reset code.");
        } finally {
            setLoading(false);
        }
    };

    const submitReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("The new password must be at least 8 characters.");
            return;
        }
        if (password !== confirm) {
            setError("The two passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const data = await api.auth.resetPassword({
                email: email.trim(),
                otp: otp.trim(),
                new_password: password,
            });
            // The reset signs the admin in, so there is no second login to do.
            saveSession(data.tokens.access_token, data.tokens.refresh_token, data.user);
            navigate("/", { replace: true });
        } catch (err: any) {
            setError(err?.message || "Could not reset the password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 px-8 py-10 sm:px-10">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#101848] transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to sign in
                    </Link>

                    <div className="mb-10 text-center">
                        <img
                            src="/logo.png"
                            alt="Self Awareness Centre"
                            className="h-20 w-auto mx-auto mb-6"
                        />
                        <h1 className="text-4xl font-serif font-bold text-[#101848] mb-2">
                            {step === "request" ? "Forgot password" : "Check your email"}
                        </h1>
                        <p className="text-gray-500">
                            {step === "request"
                                ? "We will email you a code to set a new one."
                                : "Enter the code we sent, then choose a new password."}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 mb-6 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm">
                            {error}
                        </div>
                    )}

                    {step === "request" ? (
                        <form onSubmit={requestCode} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#101848] uppercase tracking-wider ml-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    autoFocus
                                    className={inputClass}
                                    placeholder="admin@gmail.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email.trim()}
                                className="w-full py-4 bg-[#101848] text-white rounded-2xl font-bold text-lg hover:bg-[#1a2560] transition-all disabled:opacity-50 shadow-xl shadow-[#101848]/20 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {loading ? "Sending..." : "Send reset code"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={submitReset} className="space-y-6">
                            {notice && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-sm flex gap-3">
                                    <MailCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{notice}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#101848] uppercase tracking-wider ml-1">
                                    Reset Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    className={`${inputClass} tracking-[0.5em] text-center text-2xl font-bold`}
                                    placeholder="000000"
                                    value={otp}
                                    // Codes are six digits; stripping anything else stops a
                                    // pasted "Code: 123456" from failing validation.
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                />
                                <p className="text-xs text-gray-400 ml-1 pt-1">
                                    Sent to {email}. It expires in 10 minutes.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#101848] uppercase tracking-wider ml-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={shown ? "text" : "password"}
                                        required
                                        autoComplete="new-password"
                                        className={`${inputClass} pr-14`}
                                        placeholder="At least 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShown((s) => !s)}
                                        aria-label={shown ? "Hide password" : "Show password"}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-black transition-colors"
                                    >
                                        {shown ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#101848] uppercase tracking-wider ml-1">
                                    Confirm Password
                                </label>
                                <input
                                    type={shown ? "text" : "password"}
                                    required
                                    autoComplete="new-password"
                                    className={inputClass}
                                    placeholder="Repeat it"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                />
                                {confirm.length > 0 && confirm !== password && (
                                    <p className="text-xs text-red-600 font-bold ml-1 pt-1">
                                        These do not match.
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length < 4 || !password || !confirm}
                                className="w-full py-4 bg-[#101848] text-white rounded-2xl font-bold text-lg hover:bg-[#1a2560] transition-all disabled:opacity-50 shadow-xl shadow-[#101848]/20 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {loading ? "Updating..." : "Set new password"}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => requestCode()}
                                    disabled={loading || cooldown > 0}
                                    className="text-sm text-[#101848] font-bold hover:underline disabled:text-gray-400 disabled:no-underline"
                                >
                                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Send another code"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
