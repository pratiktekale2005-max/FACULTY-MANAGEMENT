import React, { useState } from "react";
import { api } from "../services/api";

function Onboarding({ setStep, theme = "dark", toggleTheme }) {
    const [form, setForm] = useState({
        collegeName: "",
        collegeCode: "",
        principalName: "",
        principalEmail: "",
        password: "",
        phone: "",
        address: "",
        website: "",
        logo: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Logo image size must be under 2MB ❌");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, logo: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.collegeName || !form.collegeCode || !form.principalName || !form.principalEmail || !form.password) {
            setError("All mandatory fields * (including password) must be filled ❌");
            return;
        }

        if (form.password.length < 6) {
            setError("Password must be at least 6 characters long ❌");
            return;
        }

        setLoading(true);

        try {
            await api.post("/organizations/onboard", form, false);

            alert("Institution successfully created! You can now log in with your email and password. ✅");
            setStep(1);

        } catch (err) {
            console.error(err);
            setError(err.message || "Network error. Make sure the server is online.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative transition-colors duration-300">
            {/* Top Right Theme Toggle */}
            {toggleTheme && (
                <div className="absolute top-5 right-5 z-20">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
                        title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
                    >
                        {theme === "dark" ? (
                            <>
                                <span className="text-amber-400 text-sm">☀️</span>
                                <span>Light Mode</span>
                            </>
                        ) : (
                            <>
                                <span className="text-indigo-600 text-sm">🌙</span>
                                <span className="text-slate-800">Dark Mode</span>
                            </>
                        )}
                    </button>
                </div>
            )}
            <div className="max-w-2xl w-full space-y-8 bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden text-xs">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600"></div>

                <div className="text-center space-y-2">
                    <span className="text-4xl">🏢</span>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-100">
                        Create Your Institution
                    </h2>
                    <p className="text-slate-400">
                        Register your college or university to set up your dedicated EduCRM tenant.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-4 rounded-xl leading-relaxed">
                            {error}
                        </div>
                    )}

                    {/* College Details Section */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-[11px] text-slate-450 uppercase tracking-widest border-b border-slate-850 pb-2">
                            1. Institution Profile
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    College Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. DY Patil College of Engineering"
                                    value={form.collegeName}
                                    onChange={(e) => setForm(prev => ({ ...prev, collegeName: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    College Code (Unique Suffix) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. DYPCOE"
                                    value={form.collegeCode}
                                    onChange={(e) => setForm(prev => ({ ...prev, collegeCode: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Official Website
                                </label>
                                <input
                                    type="url"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. https://dypcoe.ac.in"
                                    value={form.website}
                                    onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Institution Logo
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                        id="logo-upload"
                                        disabled={loading}
                                    />
                                    <label
                                        htmlFor="logo-upload"
                                        className="cursor-pointer bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl transition-all block text-center flex-1"
                                    >
                                        {form.logo ? "✓ Logo Selected" : "Upload Logo Image"}
                                    </label>
                                    {form.logo && (
                                        <div className="w-10 h-10 border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-1 flex items-center justify-center">
                                            <img src={form.logo} alt="Preview" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Full Address
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="e.g. Sector 29, Nigdi Pradhikaran, Akurdi, Pune"
                                value={form.address}
                                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Principal Credentials Section */}
                    <div className="space-y-4 pt-4">
                        <h3 className="font-bold text-[11px] text-slate-455 uppercase tracking-widest border-b border-slate-850 pb-2">
                            2. Institution Administrator (Principal) Account
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Principal Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. Dr. Ramesh Kumar"
                                    value={form.principalName}
                                    onChange={(e) => setForm(prev => ({ ...prev, principalName: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Contact Phone Number
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. +91 99999 00001"
                                    value={form.phone}
                                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Principal Official Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. principal@dypcoe.ac.in"
                                    value={form.principalEmail}
                                    onChange={(e) => setForm(prev => ({ ...prev, principalEmail: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Administrator Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Minimum 6 characters"
                                    value={form.password}
                                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-850">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-slate-450 hover:text-slate-200 transition-colors"
                            disabled={loading}
                        >
                            ← Back to Login
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 border border-transparent text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {loading ? "Creating Institution..." : "Create Institution"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Onboarding;
