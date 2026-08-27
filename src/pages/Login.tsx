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
        <div className="min-h-screen flex bg-white overflow-hidden">
            {/* Left Side: Login Form */}
            <div className="w-full lg:w-[450px] flex flex-col justify-center px-8 md:px-16 lg:px-12 bg-white relative z-10 shadow-2xl">
                <div className="max-w-md w-full mx-auto">
                    <div className="mb-12">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#101848] text-white font-serif font-bold text-2xl mb-6 shadow-lg shadow-[#101848]/20">M</div>
                        <h1 className="text-4xl font-serif font-bold text-[#101848] mb-2">Welcome Back</h1>
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
                        
                        <div className="pt-6 text-center">
                            <p className="text-sm text-gray-400">
                                Need technical help? <button type="button" className="text-[#101848] font-bold hover:underline">Contact Support</button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side: Decorative/Brand Section */}
            <div className="hidden lg:flex flex-1 relative bg-[#101848] items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400 blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>
                
                <div className="relative z-10 text-center px-20">
                    <h2 className="text-5xl font-serif font-bold text-white mb-6 leading-tight">Mastering Inner Peace through Technology.</h2>
                    <p className="text-xl text-white/60 leading-relaxed max-w-xl mx-auto">
                        Your central hub for managing content, meditation programs, and community engagement.
                    </p>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-10 left-10 right-10 flex justify-between text-white/20 text-xs font-bold uppercase tracking-[0.3em]">
                    <span>Meditation Centre CMS</span>
                    <span>v2.0.4</span>
                    <span>Internal Use Only</span>
                </div>
            </div>
        </div>
    );
}
