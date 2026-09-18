import React, { useState } from "react";
import { api } from "../services/api";

function Login({ setStep, onLoginSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [branding, setBranding] = useState(null);

    const handleEmailChange = async (val) => {
        setEmail(val);
        const cleanVal = val.trim();
        if (cleanVal.includes("@") && cleanVal.split("@")[1]?.length > 2) {
            try {
                const data = await api.get(`/auth/branding-by-email`, { email: cleanVal });
                if (!data.defaultBranding) {
                    setBranding(data);
                    document.documentElement.style.setProperty('--accent-purple', data.primaryColor);
                    document.documentElement.style.setProperty('--accent-blue', data.secondaryColor);
                } else {
                    setBranding(null);
                    document.documentElement.style.setProperty('--accent-purple', '#8b5cf6');
                    document.documentElement.style.setProperty('--accent-blue', '#3b82f6');
                }
            } catch (e) {
                console.error("Branding load fail:", e);
            }
        } else if (branding) {
            setBranding(null);
            document.documentElement.style.setProperty('--accent-purple', '#8b5cf6');
            document.documentElement.style.setProperty('--accent-blue', '#3b82f6');
        }
    };

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        
        if (!email.trim() || !password) {
            setError("Both email and password are required ❌");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await api.post("/auth/login", { 
                email: email.trim(), 
                password 
            }, false);

            if (onLoginSuccess) {
                onLoginSuccess(data.user, data.accessToken, data.refreshToken);
            }
        } catch (err) {
            console.error("Login failed:", err);
            setError(err.message || "Invalid email or password ❌");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
            <div className="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-650 via-indigo-600 to-blue-600" style={{
                    background: branding ? `linear-gradient(to right, ${branding.primaryColor}, ${branding.secondaryColor})` : undefined
                }}></div>

                <div className="text-center">
                    {branding && branding.logo ? (
                        <div className="w-16 h-16 mx-auto border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 p-1 flex items-center justify-center mb-2 shadow-lg">
                            <img src={branding.logo} alt="College Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <span className="text-4xl">🎓</span>
                    )}

                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
                        {branding ? branding.name : "EduCRM Steering Portal"}
                    </h2>
                    <p className="mt-2 text-xs text-slate-400">
                        {branding && branding.motto ? branding.motto : "Faculty Activity Management System"}
                    </p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Registered Email Address
                        </label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="e.g. faculty@gmail.com"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Account Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none"
                            >
                                {showPassword ? "🙈 Hide" : "👁️ Show"}
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="current-password"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors pr-10"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-3.5 rounded-xl text-[11px] leading-relaxed animate-fade-in">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: branding ? branding.primaryColor : undefined
                            }}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? "Signing in..." : "Sign In to Account"}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(4)}
                                className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
                            >
                                Onboard Your Institution →
                            </button>
                        </div>
                    </div>
                </form>

                {branding && branding.footer && (
                    <div className="text-center text-[9px] text-slate-500 border-t border-slate-850/60 pt-4 mt-6">
                        {branding.footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Login;