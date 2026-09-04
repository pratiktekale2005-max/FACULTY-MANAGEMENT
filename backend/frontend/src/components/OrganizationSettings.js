import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function OrganizationSettings({ currentUser }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Vision/Mission options tab: manual, pdf, ocr
    const [visionTab, setVisionTab] = useState("manual");
    const [extractLoading, setExtractLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        shortName: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        logo: "",
        vision: "",
        mission: "",
        visionSource: "text",
        missionSource: "text",
        settings: {
            restrictDomain: false,
            allowedDomain: "",
            academicYear: "2026-2027",
            semesterSystem: "Semester",
            collegeTiming: "09:00 AM - 05:00 PM",
            workingDays: 5,
            maxLeave: 12,
            branding: {
                primaryColor: "#4F46E5",
                secondaryColor: "#06B6D4",
                favicon: "",
                motto: "",
                footer: ""
            },
            instituteHolidays: []
        }
    });

    // Temp holiday input state
    const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });

    const loadOrgData = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await api.get("/organizations/my-org");
            if (data.organization) {
                const org = data.organization;
                setForm({
                    name: org.name || "",
                    shortName: org.shortName || "",
                    email: org.email || "",
                    phone: org.phone || "",
                    address: org.address || "",
                    website: org.website || "",
                    logo: org.logo || "",
                    vision: org.vision || "",
                    mission: org.mission || "",
                    visionSource: org.visionSource || "text",
                    missionSource: org.missionSource || "text",
                    settings: {
                        restrictDomain: org.settings?.restrictDomain || false,
                        allowedDomain: org.settings?.allowedDomain || "",
                        academicYear: org.settings?.academicYear || "2026-2027",
                        semesterSystem: org.settings?.semesterSystem || "Semester",
                        collegeTiming: org.settings?.collegeTiming || "09:00 AM - 05:00 PM",
                        workingDays: org.settings?.workingDays || 5,
                        maxLeave: org.settings?.maxLeave || 12,
                        branding: {
                            primaryColor: org.settings?.branding?.primaryColor || "#4F46E5",
                            secondaryColor: org.settings?.branding?.secondaryColor || "#06B6D4",
                            favicon: org.settings?.branding?.favicon || "",
                            motto: org.settings?.branding?.motto || "",
                            footer: org.settings?.branding?.footer || ""
                        },
                        instituteHolidays: org.settings?.instituteHolidays || []
                    }
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load institution details ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrgData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Logo file size must be under 2MB ❌");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, logo: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleVisionFileExtract = async (e, mode) => {
        const file = e.target.files[0];
        if (!file) return;

        setExtractLoading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Str = reader.result;
            try {
                let responseData;
                if (mode === "pdf") {
                    responseData = await api.post("/organizations/extract-pdf", { pdfBase64: base64Str });
                } else {
                    responseData = await api.post("/organizations/ocr-image", { imageBase64: base64Str });
                }

                if (responseData && responseData.text) {
                    const text = responseData.text;
                    // Intelligently parse Vision vs Mission text
                    let parsedVision = "";
                    let parsedMission = "";

                    const visionIndex = text.toLowerCase().indexOf("vision");
                    const missionIndex = text.toLowerCase().indexOf("mission");

                    if (visionIndex !== -1 && missionIndex !== -1) {
                        if (visionIndex < missionIndex) {
                            parsedVision = text.substring(visionIndex + 6, missionIndex).trim();
                            parsedMission = text.substring(missionIndex + 7).trim();
                        } else {
                            parsedMission = text.substring(missionIndex + 7, visionIndex).trim();
                            parsedVision = text.substring(visionIndex + 6).trim();
                        }
                    } else if (visionIndex !== -1) {
                        parsedVision = text.substring(visionIndex + 6).trim();
                    } else if (missionIndex !== -1) {
                        parsedMission = text.substring(missionIndex + 7).trim();
                    } else {
                        // Fallback split in middle or load entire text in both
                        const halfLength = Math.floor(text.length / 2);
                        parsedVision = text.substring(0, halfLength).trim();
                        parsedMission = text.substring(halfLength).trim();
                    }

                    // Clean leading/trailing colons or symbols
                    const cleanText = (t) => t.replace(/^[:\s\-*#]+/, "").trim();

                    setForm(prev => ({
                        ...prev,
                        vision: cleanText(parsedVision) || prev.vision,
                        mission: cleanText(parsedMission) || prev.mission,
                        visionSource: mode,
                        missionSource: mode
                    }));

                    alert("Extracted vision & mission from file! Review and refine below. 📄");
                }
            } catch (err) {
                console.error(err);
                alert("File text extraction failed: " + (err.message || "Parse Error"));
            } finally {
                setExtractLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAddHoliday = () => {
        if (!newHoliday.name || !newHoliday.date) {
            alert("Please enter both holiday name and date ❌");
            return;
        }
        setForm(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                instituteHolidays: [...prev.settings.instituteHolidays, newHoliday]
            }
        }));
        setNewHoliday({ name: "", date: "" });
    };

    const handleRemoveHoliday = (index) => {
        setForm(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                instituteHolidays: prev.settings.instituteHolidays.filter((_, idx) => idx !== index)
            }
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            await api.put("/organizations/my-org", form);
            setSuccess("Institution settings successfully saved! ✅");
            
            document.documentElement.style.setProperty('--accent-purple', form.settings.branding.primaryColor);
            document.documentElement.style.setProperty('--accent-blue', form.settings.branding.secondaryColor);
            
            loadOrgData();
        } catch (err) {
            console.error(err);
            setError(err.message || "Transaction failure ❌");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center italic py-8 text-slate-550">Loading organization configuration...</div>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-6 text-xs animate-fade-in pb-12">
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Institution Profile Settings</h2>
                    <p className="text-slate-400 mt-1">Configure your college profile details, academic calendars, email restrictions, and theme branding</p>
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                    {saving ? "Saving Changes..." : "Save Settings"}
                </button>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 p-3.5 rounded-xl">
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. INSTITUTION METADATA */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2">
                        1. Institution Profile Details
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">College Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Short Code Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                value={form.shortName}
                                onChange={(e) => setForm(prev => ({ ...prev, shortName: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Contact Phone</label>
                            <input
                                type="text"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                value={form.phone}
                                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Website URL</label>
                            <input
                                type="text"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                value={form.website}
                                onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Campus Address</label>
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                            value={form.address}
                            onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">College Logo</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id="logo-edit"
                                onChange={handleLogoUpload}
                            />
                            <label
                                htmlFor="logo-edit"
                                className="cursor-pointer bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-350 px-4 py-2 rounded-xl transition-all flex-1 text-center font-semibold"
                            >
                                Change logo image
                            </label>
                            {form.logo && (
                                <div className="w-12 h-12 border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-1 flex items-center justify-center">
                                    <img src={form.logo} alt="Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. DYNAMIC BRANDING & STYLING */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2">
                        2. Dynamic Theme Branding
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Branding Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    className="w-10 h-8 bg-transparent border-0 cursor-pointer"
                                    value={form.settings.branding.primaryColor}
                                    onChange={(e) => setForm(prev => ({
                                        ...prev,
                                        settings: {
                                            ...prev.settings,
                                            branding: { ...prev.settings.branding, primaryColor: e.target.value }
                                        }
                                    }))}
                                />
                                <input
                                    type="text"
                                    className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1 text-slate-200 font-mono w-24 text-center"
                                    value={form.settings.branding.primaryColor}
                                    onChange={(e) => setForm(prev => ({
                                        ...prev,
                                        settings: {
                                            ...prev.settings,
                                            branding: { ...prev.settings.branding, primaryColor: e.target.value }
                                        }
                                    }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Secondary Branding Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    className="w-10 h-8 bg-transparent border-0 cursor-pointer"
                                    value={form.settings.branding.secondaryColor}
                                    onChange={(e) => setForm(prev => ({
                                        ...prev,
                                        settings: {
                                            ...prev.settings,
                                            branding: { ...prev.settings.branding, secondaryColor: e.target.value }
                                        }
                                    }))}
                                />
                                <input
                                    type="text"
                                    className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1 text-slate-200 font-mono w-24 text-center"
                                    value={form.settings.branding.secondaryColor}
                                    onChange={(e) => setForm(prev => ({
                                        ...prev,
                                        settings: {
                                            ...prev.settings,
                                            branding: { ...prev.settings.branding, secondaryColor: e.target.value }
                                        }
                                    }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Motto / Slogan</label>
                        <input
                            type="text"
                            placeholder="e.g. In Service of Science and Humanity"
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                            value={form.settings.branding.motto}
                            onChange={(e) => setForm(prev => ({
                                ...prev,
                                settings: {
                                    ...prev.settings,
                                    branding: { ...prev.settings.branding, motto: e.target.value }
                                }
                            }))}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Footer text</label>
                        <input
                            type="text"
                            placeholder="e.g. © 2026 DY Patil Campus. All rights reserved."
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                            value={form.settings.branding.footer}
                            onChange={(e) => setForm(prev => ({
                                ...prev,
                                settings: {
                                    ...prev.settings,
                                    branding: { ...prev.settings.branding, footer: e.target.value }
                                }
                            }))}
                        />
                    </div>
                </div>

                {/* 3. EMAIL DOMAIN RESTRICTIONS */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2">
                        3. Email Domain Restrictions
                    </h3>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="restrict-domain-chk"
                            className="w-4 h-4 rounded border-slate-800 text-indigo-650 bg-slate-950 focus:ring-0 focus:ring-offset-0"
                            checked={form.settings.restrictDomain}
                            onChange={(e) => setForm(prev => ({
                                ...prev,
                                settings: {
                                    ...prev.settings,
                                    restrictDomain: e.target.checked
                                }
                            }))}
                        />
                        <label htmlFor="restrict-domain-chk" className="text-slate-300 font-semibold cursor-pointer">
                            Enforce Institutional Domain Restriction
                        </label>
                    </div>

                    {form.settings.restrictDomain && (
                        <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allowed Domain Suffix *</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. dypcoe.ac.in"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                                value={form.settings.allowedDomain}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    settings: {
                                        ...prev.settings,
                                        allowedDomain: e.target.value
                                    }
                                }))}
                            />
                            <p className="text-[10px] text-slate-500">Logins will be rejected if email does not match this domain suffix.</p>
                        </div>
                    )}
                </div>

                {/* 4. ACADEMIC COMPLIANCE TIMINGS */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2">
                        4. Academic Timing & Compliance Settings
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Academic Year</label>
                            <input
                                type="text"
                                placeholder="e.g. 2026-2027"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                value={form.settings.academicYear}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, academicYear: e.target.value }
                                }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Semester System</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                                value={form.settings.semesterSystem}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, semesterSystem: e.target.value }
                                }))}
                            >
                                <option value="Semester">Semester System (2/year)</option>
                                <option value="Trimester">Trimester System (3/year)</option>
                                <option value="Yearly">Yearly Scheme</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">College Timing</label>
                            <input
                                type="text"
                                placeholder="e.g. 09:00 AM - 05:00 PM"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
                                value={form.settings.collegeTiming}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, collegeTiming: e.target.value }
                                }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Working Days / Week</label>
                            <input
                                type="number"
                                min={1}
                                max={7}
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
                                value={form.settings.workingDays}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, workingDays: Number(e.target.value) }
                                }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Maximum Annual Leave</label>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
                                value={form.settings.maxLeave}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, maxLeave: Number(e.target.value) }
                                }))}
                            />
                        </div>
                    </div>
                </div>

                {/* 5. INSTITUTE VISION & MISSION */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 lg:col-span-2">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span>5. Institute Vision & Mission Statements</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-semibold">
                            <button
                                type="button"
                                onClick={() => setVisionTab("manual")}
                                className={`px-2.5 py-1 rounded-lg border transition-all ${visionTab === "manual" ? "bg-indigo-650 border-indigo-500 text-white font-bold" : "bg-slate-900 border-slate-800 text-slate-450 hover:bg-slate-850"}`}
                            >
                                Option 1: Enter Text
                            </button>
                            <button
                                type="button"
                                onClick={() => setVisionTab("pdf")}
                                className={`px-2.5 py-1 rounded-lg border transition-all ${visionTab === "pdf" ? "bg-indigo-650 border-indigo-500 text-white font-bold" : "bg-slate-900 border-slate-800 text-slate-455 hover:bg-slate-855"}`}
                            >
                                Option 2: Upload PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => setVisionTab("ocr")}
                                className={`px-2.5 py-1 rounded-lg border transition-all ${visionTab === "ocr" ? "bg-indigo-650 border-indigo-500 text-white font-bold" : "bg-slate-900 border-slate-800 text-slate-455 hover:bg-slate-855"}`}
                            >
                                Option 3: Upload Image
                            </button>
                        </div>
                    </h3>

                    {visionTab === "pdf" && (
                        <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
                            <strong className="text-[10px] text-slate-200 block">Upload Institute Vision & Mission PDF Document</strong>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleVisionFileExtract(e, "pdf")}
                                className="w-full text-xs text-slate-400 border border-slate-800 rounded-xl p-1 bg-slate-900"
                            />
                            {extractLoading ? (
                                <p className="text-indigo-400 animate-pulse text-[10px] font-semibold">⏳ Reading PDF structure and extracting vision/mission text logs...</p>
                            ) : (
                                <p className="text-[9px] text-slate-500">Supported: standard PDF. The system will automatically attempt to split Vision and Mission sections.</p>
                            )}
                        </div>
                    )}

                    {visionTab === "ocr" && (
                        <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
                            <strong className="text-[10px] text-slate-200 block">Upload Vision & Mission Logo / Certificate Image</strong>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleVisionFileExtract(e, "ocr")}
                                className="w-full text-xs text-slate-400 border border-slate-800 rounded-xl p-1 bg-slate-900"
                            />
                            {extractLoading ? (
                                <p className="text-indigo-400 animate-pulse text-[10px] font-semibold">⏳ Scanning layout and running character recognition engine...</p>
                            ) : (
                                <p className="text-[9px] text-slate-500">Supported: JPG, PNG, JPEG. System runs OCR locally to pull technical paragraphs.</p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Institute Vision Statement</label>
                            <textarea
                                rows={5}
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none text-xs"
                                placeholder="Enter or paste Vision Statement..."
                                value={form.vision}
                                onChange={(e) => setForm(prev => ({ ...prev, vision: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Institute Mission Statement</label>
                            <textarea
                                rows={5}
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none text-xs"
                                placeholder="Enter or paste Mission Statement..."
                                value={form.mission}
                                onChange={(e) => setForm(prev => ({ ...prev, mission: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {/* 6. HOLIDAYS CONFIGURATION */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 lg:col-span-2">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2">
                        6. Institution Holidays Calendar
                    </h3>

                    <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                        {form.settings.instituteHolidays.length === 0 ? (
                            <p className="text-slate-550 italic text-[11px]">No custom holidays added yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {form.settings.instituteHolidays.map((h, index) => (
                                    <div key={index} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-850 rounded-xl">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-200 truncate">{h.name}</p>
                                            <p className="text-[10px] text-indigo-400 mt-0.5 font-mono">{h.date}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveHoliday(index)}
                                            className="text-rose-400 hover:text-rose-350 p-1 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-all"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl flex items-end gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Holiday Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Independence Day"
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                value={newHoliday.name}
                                onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="w-48 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</label>
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 focus:outline-none"
                                value={newHoliday.date}
                                onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleAddHoliday}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold rounded-xl transition-all h-[34px] leading-[14px]"
                        >
                            ＋ Add Holiday
                        </button>
                    </div>
                </div>

            </div>
        </form>
    );
}

export default OrganizationSettings;
