import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { openFileInNewTab, downloadAttachment } from "../utils/attachmentUtils";

function MyProfileView({ currentUser, onRefresh }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

    // Form inputs state
    const [form, setForm] = useState({
        name: "",
        phone: "",
        designation: "",
        qualification: "",
        experience: "",
        skills: "",
        researchInterests: "",
        achievements: "",
        employeeId: "",
        joiningDate: "",
        photoBase64: "",
        resumeBase64: ""
    });

    // Email sending settings state
    const [emailSettings, setEmailSettings] = useState({ configured: false });
    const [showEmailConfig, setShowEmailConfig] = useState(false);
    const [showAppPassword, setShowAppPassword] = useState(false);
    const [emailForm, setEmailForm] = useState({
        service: "gmail",
        email: "",
        appPassword: "",
        host: "",
        port: 587,
        secure: false
    });
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [emailTestResult, setEmailTestResult] = useState(null);

    // Load current user's profile details and email settings from backend
    const loadProfile = async () => {
        try {
            setLoading(true);
            setStatusMsg({ type: "", text: "" });
            const data = await api.get("/faculty/me");
            const fac = data.faculty || currentUser;
            setProfile(fac);

            setForm({
                name: fac.name || "",
                phone: fac.phone || "",
                designation: fac.designation || (fac.role === "Principal" ? "Principal & Director" : "Assistant Professor"),
                qualification: fac.qualification || "",
                experience: fac.experience || "",
                skills: fac.skills || "",
                researchInterests: fac.researchInterests || "",
                achievements: fac.achievements || "",
                employeeId: fac.employeeId || "",
                joiningDate: fac.joiningDate || "",
                photoBase64: fac.photoPath || "",
                resumeBase64: fac.resumePath || ""
            });

            // Load email configuration
            try {
                const settingsData = await api.get("/faculty/me/email-settings");
                if (settingsData) {
                    setEmailSettings(settingsData);
                    setEmailForm(prev => ({
                        ...prev,
                        service: settingsData.service || "gmail",
                        email: settingsData.email || fac.email || currentUser?.email || "",
                        host: settingsData.host || "",
                        port: settingsData.port || 587,
                        secure: !!settingsData.secure
                    }));
                }
            } catch (errSettings) {
                console.warn("Could not load email settings:", errSettings);
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
            // Fallback to currentUser prop
            setProfile(currentUser);
            setForm(prev => ({
                ...prev,
                name: currentUser.name || currentUser.fullName || "",
                phone: currentUser.phone || "",
                designation: currentUser.designation || (currentUser.role === "Principal" ? "Principal & Director" : "Assistant Professor"),
                qualification: currentUser.qualification || "",
                experience: currentUser.experience || "",
                skills: currentUser.skills || "",
                achievements: currentUser.achievements || "",
                photoBase64: currentUser.photoPath || ""
            }));
            setEmailForm(prev => ({
                ...prev,
                email: currentUser?.email || ""
            }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // File converter helper
    const handleFileChange = (e, field) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            alert("File size exceeds 8MB. Please choose a smaller file.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({
                ...prev,
                [field]: reader.result
            }));
        };
        reader.readAsDataURL(file);
    };

    // Save profile changes
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMsg({ type: "", text: "" });

        try {
            const res = await api.put("/faculty/profile", form);
            setStatusMsg({ type: "success", text: res.message || "Profile details saved successfully! ✅" });
            setIsEditing(false);
            await loadProfile();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Failed to update profile:", err);
            setStatusMsg({ type: "error", text: err.message || "Failed to update profile details ❌" });
        } finally {
            setIsSaving(false);
        }
    };

    // Test email connection
    const handleTestEmailSettings = async () => {
        setIsTestingEmail(true);
        setEmailTestResult(null);
        try {
            const res = await api.post("/faculty/me/test-email-settings", emailForm);
            setEmailTestResult({ type: "success", text: res.message || "Connection verified successfully! ✅" });
        } catch (err) {
            console.error("Test email connection failed:", err);
            setEmailTestResult({ type: "error", text: err.message || "Failed to verify mail credentials ❌" });
        } finally {
            setIsTestingEmail(false);
        }
    };

    // Save and verify email settings
    const handleSaveEmailSettings = async (e) => {
        if (e) e.preventDefault();
        setIsSavingEmail(true);
        setEmailTestResult(null);
        try {
            const res = await api.put("/faculty/me/email-settings", {
                ...emailForm,
                configured: true
            });
            setEmailSettings(res.emailSettings || { configured: true, ...emailForm });
            setEmailTestResult({ type: "success", text: res.message || "Email credentials saved and verified! ✅" });
            setShowEmailConfig(false);
            setStatusMsg({ type: "success", text: "Authorized college email credentials saved successfully! ✅" });
        } catch (err) {
            console.error("Save email settings failed:", err);
            setEmailTestResult({ type: "error", text: err.message || "Failed to save email settings ❌" });
        } finally {
            setIsSavingEmail(false);
        }
    };

    // Remove email credentials
    const handleRemoveEmailSettings = async () => {
        if (!window.confirm("Are you sure you want to remove your email credentials? Workshop email sending will be blocked until configured again.")) {
            return;
        }
        setIsSavingEmail(true);
        try {
            await api.put("/faculty/me/email-settings", { configured: false });
            setEmailSettings({ configured: false });
            setEmailForm(prev => ({ ...prev, appPassword: "" }));
            setEmailTestResult(null);
            setShowEmailConfig(false);
            setStatusMsg({ type: "success", text: "Email sending credentials removed." });
        } catch (err) {
            console.error("Remove email settings failed:", err);
            setStatusMsg({ type: "error", text: err.message || "Failed to remove email settings ❌" });
        } finally {
            setIsSavingEmail(false);
        }
    };

    if (loading && !profile) {
        return (
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 animate-fade-in">
                <div className="text-3xl animate-bounce">👤</div>
                <p className="text-xs font-semibold text-slate-300">Loading your profile details...</p>
            </div>
        );
    }

    const activeData = profile || currentUser;

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in text-xs">
            {/* Notification alert */}
            {statusMsg.text && (
                <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between shadow-md ${
                    statusMsg.type === "success" 
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" 
                        : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                }`}>
                    <span>{statusMsg.text}</span>
                    <button 
                        onClick={() => setStatusMsg({ type: "", text: "" })}
                        className="text-slate-400 hover:text-white font-bold ml-3"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Profile Header Hero Card */}
            <div className="bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* Profile Photo Avatar */}
                <div className="relative group shrink-0">
                    <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-950 flex items-center justify-center shadow-xl">
                        {activeData.photoPath ? (
                            <img src={activeData.photoPath} alt={activeData.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-5xl">{activeData.role === "Principal" ? "🏛️" : "👨‍🏫"}</span>
                        )}
                    </div>
                    {isEditing && (
                        <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-90 hover:opacity-100 transition p-2 text-center text-[10px] font-bold">
                            <span>📷 Change Photo</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleFileChange(e, "photoBase64")} 
                                className="hidden" 
                            />
                        </label>
                    )}
                </div>

                {/* Profile Identity Details */}
                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                        <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
                            {activeData.name || activeData.fullName}
                        </h2>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                            {activeData.role === "Principal" ? "Head of Institution" : activeData.role}
                        </span>
                        {activeData.qualification && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                🎓 {activeData.qualification}
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-indigo-300 font-semibold">
                        {activeData.designation || (activeData.role === "Principal" ? "Principal & Director of Academic Affairs" : "Faculty Member")}
                    </p>

                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                        {activeData.experience ? (
                            activeData.experience.slice(0, 180) + (activeData.experience.length > 180 ? "..." : "")
                        ) : (
                            "Institutional leader overseeing curriculum development, university accreditations, academic faculty research, and institutional excellence."
                        )}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 text-xs text-slate-300 border-t border-slate-800/80">
                        <div className="flex items-center gap-2 text-left">
                            <span className="text-slate-500">📧</span>
                            <span className="truncate">{activeData.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-left">
                            <span className="text-slate-500">📞</span>
                            <span>{activeData.phone || <span className="italic text-slate-500">Not configured</span>}</span>
                        </div>
                        <div className="flex items-center gap-2 text-left">
                            <span className="text-slate-500">🏢</span>
                            <span className="truncate">{activeData.department || (activeData.role === "Principal" ? "Administration" : "Academic")}</span>
                        </div>
                        {activeData.employeeId && (
                            <div className="flex items-center gap-2 text-left">
                                <span className="text-slate-500">🆔</span>
                                <span className="font-mono text-indigo-400 font-bold">{activeData.employeeId}</span>
                            </div>
                        )}
                        {activeData.joiningDate && (
                            <div className="flex items-center gap-2 text-left">
                                <span className="text-slate-500">📅</span>
                                <span>Tenure: {activeData.joiningDate}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 active:scale-95"
                        >
                            <span>{isEditing ? "✕ Cancel Editing" : "✏️ Edit Profile Information"}</span>
                        </button>

                        {(activeData.resumePath || activeData.cvPath) && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => openFileInNewTab(activeData.resumePath || activeData.cvPath, `${activeData.name || "Faculty"} - Curriculum Vitae (PDF)`)}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <span>👁️</span>
                                    <span>View CV (PDF)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => downloadAttachment(activeData.resumePath || activeData.cvPath, `${(activeData.name || "My").replace(/\s+/g, "_")}_CV.pdf`)}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
                                >
                                    <span>📥</span>
                                    <span>Download CV</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AUTHORIZED EMAIL SENDER & SMTP CONFIGURATION CARD */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                            emailSettings.configured
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}>
                            {emailSettings.configured ? "🛡️" : "✉️"}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-100">
                                    Authorized College Email & Sender Identity
                                </h3>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    emailSettings.configured
                                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                                        : "bg-amber-950/80 text-amber-300 border-amber-700/60"
                                }`}>
                                    {emailSettings.configured ? "✅ Authenticated Sender Active" : "⚠️ Not Configured"}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Used for Workshops & Seminars invitation and thanking letters. Emails authenticate as your authorized college account rather than the system account.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setShowEmailConfig(!showEmailConfig);
                            setEmailTestResult(null);
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-center"
                    >
                        <span>{showEmailConfig ? "✕ Close Setup" : (emailSettings.configured ? "⚙️ Manage Credentials" : "➕ Configure Email Sender")}</span>
                    </button>
                </div>

                {/* Collapsed Status Summary */}
                {!showEmailConfig && (
                    <div className="text-xs text-slate-300">
                        {emailSettings.configured ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Authorized Sender Address</span>
                                    <span className="font-semibold text-emerald-300 font-mono">{emailSettings.email}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Provider / Connection</span>
                                    <span className="font-medium text-slate-300 capitalize">{emailSettings.service === "gmail" ? "Gmail / Google Workspace" : (emailSettings.host || "Custom SMTP")}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Verification Status</span>
                                    <span className="text-emerald-400 text-[11px] font-medium">
                                        ✓ Authenticated & Verified {emailSettings.verifiedAt ? new Date(emailSettings.verifiedAt).toLocaleDateString() : ""}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-xl text-amber-200/90 text-xs leading-relaxed flex items-start gap-2.5">
                                <span className="text-amber-400 text-base">⚠️</span>
                                <div>
                                    <p className="font-semibold text-amber-300">Workshop email sending is currently blocked for this account.</p>
                                    <p className="text-[11px] text-amber-200/70 mt-0.5">
                                        To ensure guest speaker invitation and thanking letters are sent directly from your verified identity (and never display "via college admin"), please configure your 16-character Google App Password or college SMTP account.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Expanded Configuration Form */}
                {showEmailConfig && (
                    <form onSubmit={handleSaveEmailSettings} className="bg-slate-950/70 border border-slate-800/90 p-4 md:p-5 rounded-xl space-y-4 animate-scale-up">
                        {emailTestResult && (
                            <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
                                emailTestResult.type === "success"
                                    ? "bg-emerald-950/80 border border-emerald-600/60 text-emerald-300"
                                    : "bg-rose-950/80 border border-rose-600/60 text-rose-300"
                            }`}>
                                <span>{emailTestResult.text}</span>
                                <button type="button" onClick={() => setEmailTestResult(null)} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mail Service / Provider</label>
                                <select
                                    value={emailForm.service}
                                    onChange={(e) => setEmailForm({ ...emailForm, service: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="gmail">Gmail / Google Workspace (Recommended)</option>
                                    <option value="custom">Custom SMTP Server (College Server, Office 365, etc.)</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorized College Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={emailForm.email}
                                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                                    placeholder="faculty@college-domain.ac.in"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                />
                            </div>

                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>
                                        {emailForm.service === "gmail" ? "Google App Password (16 characters) *" : "SMTP Password / App Secret *"}
                                    </span>
                                    {emailSettings.configured && (
                                        <span className="text-[10px] text-slate-500 font-normal">
                                            (Leave blank to keep current saved password)
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showAppPassword ? "text" : "password"}
                                        value={emailForm.appPassword}
                                        onChange={(e) => setEmailForm({ ...emailForm, appPassword: e.target.value })}
                                        placeholder={emailSettings.configured ? "•••••••••••••••• (Saved securely)" : "e.g. abcd efgh ijkl mnop"}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono pr-20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAppPassword(!showAppPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-slate-200"
                                    >
                                        {showAppPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                {emailForm.service === "gmail" && (
                                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                        💡 Google accounts with 2-Step Verification require an <strong>App Password</strong>. Visit{" "}
                                        <a
                                            href="https://myaccount.google.com/apppasswords"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-400 underline hover:text-indigo-300 font-medium"
                                        >
                                            myaccount.google.com/apppasswords
                                        </a>{" "}
                                        to generate a 16-letter password for "Mail". Never use your primary account password.
                                    </p>
                                )}
                            </div>

                            {emailForm.service === "custom" && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMTP Host *</label>
                                        <input
                                            type="text"
                                            required
                                            value={emailForm.host}
                                            onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })}
                                            placeholder="smtp.office365.com or mail.college.ac.in"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMTP Port *</label>
                                        <input
                                            type="number"
                                            value={emailForm.port}
                                            onChange={(e) => setEmailForm({ ...emailForm, port: Number(e.target.value) })}
                                            placeholder="587"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 sm:col-span-2 pt-1">
                                        <input
                                            type="checkbox"
                                            id="secureSmtp"
                                            checked={emailForm.secure}
                                            onChange={(e) => setEmailForm({ ...emailForm, secure: e.target.checked })}
                                            className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                                        />
                                        <label htmlFor="secureSmtp" className="text-xs text-slate-300 cursor-pointer">
                                            Enable SSL/TLS Direct Encryption (Port 465)
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-850">
                            {emailSettings.configured && (
                                <button
                                    type="button"
                                    onClick={handleRemoveEmailSettings}
                                    disabled={isSavingEmail}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 rounded-xl transition"
                                >
                                    🗑️ Disconnect Credentials
                                </button>
                            )}

                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={handleTestEmailSettings}
                                    disabled={isTestingEmail || (!emailForm.appPassword && !emailSettings.configured)}
                                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                                >
                                    {isTestingEmail ? "⏳ Testing Connection..." : "🔌 Test Connection"}
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSavingEmail}
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
                                >
                                    {isSavingEmail ? "Verifying & Saving..." : "💾 Save & Activate"}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Profile Content: Edit Form vs View Mode */}
            {isEditing ? (
                /* EDIT PROFILE DETAILS FORM */
                <form onSubmit={handleSaveProfile} className="bg-slate-900/70 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-6 animate-scale-up">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                Edit My Profile Information
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Update your personal biography, degrees, contact numbers, and scholarly achievements.
                            </p>
                        </div>
                        <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                            Personal Profile
                        </span>
                    </div>

                    {/* Institutional Read-Only Attributes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Official Email</span>
                            <span className="font-mono text-slate-300 text-xs block mt-1">{activeData.email}</span>
                            <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">🔒 Verified login</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Employee ID</span>
                            <span className="font-mono text-indigo-400 font-bold text-xs block mt-1">{activeData.employeeId || "Assigned by Admin"}</span>
                            <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">🔒 Protected identifier</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Department</span>
                            <span className="text-slate-300 font-semibold text-xs block mt-1">{activeData.department || "Institutional"}</span>
                            <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">🔒 Administrative allocation</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Mobile / Phone</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="+91 98765 43210"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation / Role Title</label>
                            <input
                                type="text"
                                value={form.designation}
                                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                placeholder="e.g. Principal & Director of Academic Affairs"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Qualifications & Degrees</label>
                            <input
                                type="text"
                                value={form.qualification}
                                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                                placeholder="e.g. Ph.D. in Computer Science, M.Tech, B.Tech"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Biography & Leadership Experience</label>
                            <textarea
                                rows="4"
                                value={form.experience}
                                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                                placeholder="Provide comprehensive overview of academic career, previous leadership appointments, teaching credentials, and institutional accreditations..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Specializations / Technical Expertise</label>
                            <input
                                type="text"
                                value={form.skills}
                                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                                placeholder="e.g. Artificial Intelligence, Data Systems, Higher Education Governance"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Research Interests & Focus</label>
                            <input
                                type="text"
                                value={form.researchInterests}
                                onChange={(e) => setForm({ ...form, researchInterests: e.target.value })}
                                placeholder="e.g. Machine Learning, Cloud Architecture, Quantum Information"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accreditation Honors, Awards & NAAC Achievements</label>
                            <input
                                type="text"
                                value={form.achievements}
                                onChange={(e) => setForm({ ...form, achievements: e.target.value })}
                                placeholder="e.g. Best Principal Award 2025, NBA Committee Member, IEEE Senior Member"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Photo (JPG / PNG)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, "photoBase64")}
                                className="w-full text-xs text-slate-400 border border-slate-800 rounded-xl p-1 bg-slate-950 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curriculum Vitae / Resume (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange(e, "resumeBase64")}
                                className="w-full text-xs text-slate-400 border border-slate-800 rounded-xl p-1 bg-slate-950 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition shadow-lg shadow-indigo-600/30"
                        >
                            {isSaving ? "Saving Changes..." : "Save Profile Details"}
                        </button>
                    </div>
                </form>
            ) : (
                /* PROFILE VIEWING MODE */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Academic Biography & Career Experience */}
                    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-3 md:col-span-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <span>📖</span> Academic Biography & Career Experience
                            </h4>
                            <span className="text-[10px] text-slate-500">Official Profile Bio</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                            {activeData.experience || "No extended biography or experience details entered yet. Click 'Edit Profile Information' above to add your academic credentials."}
                        </p>
                    </div>

                    {/* Qualifications & Degrees */}
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                            <span>🎓</span> Academic Qualifications & Degrees
                        </h4>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-200">
                                {activeData.qualification || "Unspecified"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Highest academic qualification and honors accredited under institutional registry.
                            </p>
                        </div>
                    </div>

                    {/* Specializations & Core Competencies */}
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                            <span>💡</span> Specializations & Domain Focus
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {activeData.skills || "No specific domain specializations configured."}
                        </p>
                    </div>

                    {/* Research Interests */}
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                            <span>🔬</span> Research Interests & Scholarship
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {activeData.researchInterests || "Academic scholarship and research fields not specified."}
                        </p>
                    </div>

                    {/* Accreditation Achievements & Honors */}
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                            <span>🏆</span> Accreditation Achievements & Honors
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {activeData.achievements || "No external academic achievements or honors entered."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyProfileView;
