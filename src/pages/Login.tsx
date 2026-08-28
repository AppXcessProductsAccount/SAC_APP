import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { saveSession } from "../lib/session";
import { isValidEmail, emailErrorMessage, normaliseEmail } from "../lib/email";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Set by the API layer when a refresh failed, so the redirect explains itself.
    const sessionExpired = searchParams.get("expired") === "1";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        /* `type="email"` accepts "abc@abc", which reached the server as a login
           attempt and came back as "invalid credentials" — pointing at the
           password rather than at the address that is actually wrong. */
        const address = normaliseEmail(email);
        if (!isValidEmail(address)) {
            setError(emailErrorMessage(address));
            return;
        }

        setLoading(true);

        try {
            const data = await api.auth.login({ email: address, password });
            /* The refresh token used to be dropped on the floor, which is why a session
               could only ever die at the 30-minute mark. */
            saveSession(data.tokens.access_token, data.tokens.refresh_token, data.user);
            navigate("/");
        } catch (err: any) {
            setError(err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 px-8 py-10 sm:px-10">
                    <div className="mb-10 text-center">
                        <img
                            src="/logo.png"
                            alt="Self Awareness Centre"
                            className="h-20 w-auto mx-auto mb-6"
                        />
                        <h1 className="text-3xl font-serif font-bold text-[#101848] mb-2">Welcome Back</h1>
                        <p className="text-gray-500">Sign in to manage your meditation centre.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {sessionExpired && !error && (
                            <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl text-sm">
                                Your session expired. Please sign in again to continue.
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#101848] uppercase tracking-wider ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all placeholder:text-gray-400"
                                placeholder="admin@gmail.com"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between ml-1">
                                <label className="block text-sm font-bold text-[#101848] uppercase tracking-wider">Password</label>
                                {/* Carries the typed address across so it is not retyped on the next screen. */}
                                <Link
                                    to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                                    className="text-xs font-bold text-gray-400 hover:text-[#101848] transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                type="password"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#101848]/5 focus:border-[#101848] outline-none transition-all placeholder:text-gray-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#101848] text-white rounded-2xl font-bold text-lg hover:bg-[#1a2560] transition-all disabled:opacity-50 shadow-xl shadow-[#101848]/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : "Sign In"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
