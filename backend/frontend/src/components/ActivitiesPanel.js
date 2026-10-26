import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

const CATEGORIES = [
    "Academic",
    "Technical",
    "Cultural",
    "Sports",
    "Extension",
    "Administrative",
    "Social Responsibility",
    "Other"
];

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
    `${CURRENT_YEAR - 2}-${CURRENT_YEAR - 1}`,
    `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
    `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
    `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`
];

function ActivitiesPanel({ currentUser, refreshTrigger, onRefresh }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [academicYearFilter, setAcademicYearFilter] = useState("All");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // 'add', 'edit', 'view'
    const [activeActivity, setActiveActivity] = useState(null);

    // Form fields
    const [form, setForm] = useState({
        activityName: "",
        category: "Academic",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        organizer: "",
        facultyRole: "Coordinator",
        academicYear: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
        description: "",
        participationDetails: "",
        documentBase64: ""
    });
    const [docFileName, setDocFileName] = useState("");

    const loadActivities = useCallback(async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const data = await api.get("/activities");
            setActivities(data.activities || []);
        } catch (err) {
            console.error("Failed to load activities:", err);
            setErrorMsg(err.response?.data?.error || "Failed to load activities ❌");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActivities();
    }, [loadActivities, refreshTrigger]);

    // Convert file to base64
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            setErrorMsg("File size exceeds 15MB limit ❌");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({
                ...prev,
                documentBase64: reader.result
            }));
            setDocFileName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const handleOpenAdd = () => {
        setModalMode("add");
        setActiveActivity(null);
        setForm({
            activityName: "",
            category: "Academic",
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            organizer: "",
            facultyRole: "Coordinator",
            academicYear: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
            description: "",
            participationDetails: "",
            documentBase64: ""
        });
        setDocFileName("");
        setShowModal(true);
    };

    const handleOpenEdit = (act) => {
        setModalMode("edit");
        setActiveActivity(act);
        setForm({
            activityName: act.activityName || "",
            category: act.category || "Academic",
            startDate: act.startDate || act.date || "",
            endDate: act.endDate || "",
            organizer: act.organizer || "",
            facultyRole: act.facultyRole || "Coordinator",
            academicYear: act.academicYear || `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
            description: act.description || "",
            participationDetails: act.participationDetails || "",
            documentBase64: act.documentPath || ""
        });
        setDocFileName(act.documentPath ? "Existing document attached" : "");
        setShowModal(true);
    };

    const handleOpenView = (act) => {
        setModalMode("view");
        setActiveActivity(act);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.activityName.trim()) {
            setErrorMsg("Please enter an activity title ❌");
            return;
        }

        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const payload = {
                ...form,
                date: form.startDate || form.date || new Date().toISOString().split("T")[0]
            };

            if (modalMode === "edit" && activeActivity) {
                await api.put(`/activities/${activeActivity._id}`, payload);
                setSuccessMsg(`Activity "${form.activityName}" updated successfully! ✅`);
            } else {
                await api.post("/activities", payload);
                setSuccessMsg(`Activity "${form.activityName}" logged successfully! ✅`);
            }

            setShowModal(false);
            loadActivities();
            if (onRefresh) onRefresh();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error("Save activity error:", err);
            setErrorMsg(err.response?.data?.error || err.message || "Failed to log activity ❌");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete activity "${title}"? This cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/activities/${id}`);
            setSuccessMsg("Activity deleted successfully! ✅");
            loadActivities();
            if (onRefresh) onRefresh();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error("Delete error:", err);
            setErrorMsg(err.response?.data?.error || "Failed to delete activity ❌");
        }
    };

    const getBadgeStyle = (cat) => {
        switch (cat) {
            case "Academic": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "Technical": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
            case "Cultural": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            case "Sports": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
            case "Extension": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "Administrative": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
            case "Social Responsibility": return "bg-teal-500/10 text-teal-400 border-teal-500/20";
            default: return "bg-slate-800 text-slate-300 border-slate-700";
        }
    };

    // Filter activities
    const filteredActivities = useMemo(() => {
        return activities.filter(act => {
            const matchesCat = categoryFilter === "All" || act.category === categoryFilter;
            const matchesYear = academicYearFilter === "All" || act.academicYear === academicYearFilter;

            const q = searchQuery.trim().toLowerCase();
            const matchesSearch = !q || (
                (act.activityName || "").toLowerCase().includes(q) ||
                (act.description || "").toLowerCase().includes(q) ||
                (act.organizer || "").toLowerCase().includes(q) ||
                (act.facultyRole || "").toLowerCase().includes(q) ||
                (act.participationDetails || "").toLowerCase().includes(q)
            );

            return matchesCat && matchesYear && matchesSearch;
        });
    }, [activities, categoryFilter, academicYearFilter, searchQuery]);

    return (
        <div className="space-y-6 text-slate-100 pb-12 animate-fade-in text-xs">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🎖️</span> Other Faculty Activities &amp; Contributions
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Track institutional, technical, cultural, extension, social responsibility, and community outreach contributions.
                    </p>
                </div>

                <button
                    onClick={handleOpenAdd}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer text-xs"
                >
                    <span>➕</span>
                    <span>Log Activity</span>
                </button>
            </div>

            {/* Notification Messages */}
            {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={() => setSuccessMsg("")} className="hover:text-white font-bold">✕</button>
                </div>
            )}
            {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between">
                    <span>{errorMsg}</span>
                    <button onClick={() => setErrorMsg("")} className="hover:text-white font-bold">✕</button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search activities by title, role, organizer..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={academicYearFilter}
                    onChange={(e) => setAcademicYearFilter(e.target.value)}
                >
                    <option value="All">All Academic Years</option>
                    {ACADEMIC_YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Activities Grid */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Loading portfolio activities...
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-2xl mb-2">🎖️</p>
                    <p className="font-semibold text-slate-300">No activities found matching your filters.</p>
                    <p className="text-slate-500 mt-1">Click "Log Activity" to register your faculty contribution.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredActivities.map(act => (
                        <div 
                            key={act._id} 
                            className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${getBadgeStyle(act.category)}`}>
                                        {act.category}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono font-semibold">
                                        {act.startDate || act.date || "—"}
                                    </span>
                                </div>

                                <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                                    {act.activityName}
                                </h4>

                                <div className="text-[11px] text-slate-400 space-y-0.5">
                                    {act.facultyRole && (
                                        <p><span className="text-slate-500 font-semibold">Role:</span> {act.facultyRole}</p>
                                    )}
                                    {act.organizer && (
                                        <p><span className="text-slate-500 font-semibold">Organizer:</span> {act.organizer}</p>
                                    )}
                                    {act.academicYear && (
                                        <p><span className="text-slate-500 font-semibold">Academic Year:</span> {act.academicYear}</p>
                                    )}
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                                    {act.description}
                                </p>
                            </div>

                            <div className="border-t border-slate-800 pt-3 mt-4 space-y-3">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">
                                        Recorded by: <strong className="text-slate-200">{act.userId?.name || currentUser.name || "Faculty Member"}</strong>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    {act.documentPath ? (
                                        <a
                                            href={act.documentPath}
                                            download={`${act.activityName.replace(/\s+/g, "_")}_doc.pdf`}
                                            className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-flex items-center gap-1 transition"
                                        >
                                            <span>📥</span>
                                            <span>Document</span>
                                        </a>
                                    ) : (
                                        <span className="text-slate-600 italic text-[11px]">No Attachment</span>
                                    )}

                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <button
                                            onClick={() => handleOpenView(act)}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer text-[11px]"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(act)}
                                            className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30 transition cursor-pointer text-[11px]"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(act._id, act.activityName)}
                                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition cursor-pointer text-[11px]"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Add / Edit / View Activity */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>{modalMode === "view" ? "👁️" : modalMode === "edit" ? "✏️" : "➕"}</span>
                                <span>
                                    {modalMode === "view" ? "Activity Details" : modalMode === "edit" ? "Edit Activity Record" : "Log Activity Details"}
                                </span>
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-white text-base px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>

                        {modalMode === "view" && activeActivity ? (
                            <div className="space-y-4 text-xs">
                                <div>
                                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Activity Title</span>
                                    <p className="text-base font-bold text-white mt-0.5">{activeActivity.activityName}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Category</span>
                                        <span className={`inline-block px-2.5 py-0.5 rounded-lg border mt-1 font-bold ${getBadgeStyle(activeActivity.category)}`}>
                                            {activeActivity.category}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Academic Year</span>
                                        <p className="text-slate-200 font-mono mt-1">{activeActivity.academicYear || "—"}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Date(s)</span>
                                        <p className="text-slate-200 font-mono mt-0.5">
                                            {activeActivity.startDate || activeActivity.date || "—"}
                                            {activeActivity.endDate && ` to ${activeActivity.endDate}`}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Faculty Role</span>
                                        <p className="text-indigo-400 font-semibold mt-0.5">{activeActivity.facultyRole || "—"}</p>
                                    </div>
                                </div>

                                {activeActivity.organizer && (
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Organizer</span>
                                        <p className="text-slate-200 mt-0.5">{activeActivity.organizer}</p>
                                    </div>
                                )}

                                <div>
                                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Description</span>
                                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                                        {activeActivity.description}
                                    </div>
                                </div>

                                {activeActivity.participationDetails && (
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Participation / Outcomes</span>
                                        <p className="text-slate-300 mt-0.5">{activeActivity.participationDetails}</p>
                                    </div>
                                )}

                                {activeActivity.documentPath && (
                                    <div className="pt-2">
                                        <a
                                            href={activeActivity.documentPath}
                                            download={`${activeActivity.activityName.replace(/\s+/g, "_")}_doc.pdf`}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl inline-flex items-center gap-2 font-semibold transition cursor-pointer"
                                        >
                                            <span>📥</span>
                                            <span>Download Supporting Document</span>
                                        </a>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-slate-800 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Activity Name / Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.activityName}
                                        onChange={(e) => setForm({ ...form, activityName: e.target.value })}
                                        placeholder="e.g. Smart India Hackathon Faculty Mentor / NSS Camp Coordinator"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Category *
                                        </label>
                                        <select
                                            value={form.category}
                                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        >
                                            {CATEGORIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Academic Year *
                                        </label>
                                        <select
                                            value={form.academicYear}
                                            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        >
                                            {ACADEMIC_YEARS.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Start Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={form.startDate}
                                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            End Date (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={form.endDate}
                                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Organizer / Organizing Body
                                        </label>
                                        <input
                                            type="text"
                                            value={form.organizer}
                                            onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                                            placeholder="e.g. AICTE, State University, Institutional Cell"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Faculty Role
                                        </label>
                                        <input
                                            type="text"
                                            value={form.facultyRole}
                                            onChange={(e) => setForm({ ...form, facultyRole: e.target.value })}
                                            placeholder="e.g. Convener, Coordinator, Judge, Resource Person"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Description of Contribution *
                                    </label>
                                    <textarea
                                        rows="3"
                                        required
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe responsibilities undertaken, outcomes, or impact..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Participation / Outcome Details (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.participationDetails}
                                        onChange={(e) => setForm({ ...form, participationDetails: e.target.value })}
                                        placeholder="e.g. Guided 24 student teams; 2 winning submissions"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Supporting Document or Photograph (PDF / Image max 15MB)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer flex items-center gap-2">
                                            <span>📎</span>
                                            <span>Choose File</span>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="text-slate-400 text-xs truncate max-w-xs">
                                            {docFileName || "No file selected"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                                    >
                                        {saving ? "Saving..." : modalMode === "edit" ? "Update Activity" : "Log Activity"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ActivitiesPanel;
