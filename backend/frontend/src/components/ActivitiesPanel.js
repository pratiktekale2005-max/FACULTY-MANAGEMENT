import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

function ActivitiesPanel({ currentUser, refreshTrigger, onRefresh }) {
    const [activities, setActivities] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState("All");

    // Form fields
    const [form, setForm] = useState({
        activityName: "",
        date: "",
        description: "",
        category: "Academic",
        documentBase64: ""
    });

    const loadActivities = useCallback(async () => {
        try {
            const data = await api.get("/activities");
            setActivities(data.activities || []);
        } catch (err) {
            console.error("Failed to load activities:", err);
        }
    }, []);

    useEffect(() => {
        loadActivities();
    }, [loadActivities, refreshTrigger]);

    // Convert file to base64
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({
                ...prev,
                documentBase64: reader.result
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/activities", form);
            alert("Activity successfully logged in your portfolio! ✅");
            setShowAddForm(false);
            setForm({
                activityName: "",
                date: "",
                description: "",
                category: "Academic",
                documentBase64: ""
            });
            loadActivities();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to log activity ❌");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeStyle = (cat) => {
        switch (cat) {
            case "Academic": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
            case "Technical": return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
            case "Cultural": return "bg-rose-500/10 text-rose-455 border border-rose-500/20";
            default: return "bg-slate-800 text-slate-350 border border-slate-700/60";
        }
    };

    const filteredActivities = activities.filter(act => {
        return categoryFilter === "All" || act.category === categoryFilter;
    });

    return (
        <div className="space-y-6">
            
            {/* ================= HEADER PANEL ================= */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Other Activities Portfolio</h2>
                    <p className="text-xs text-slate-400 mt-1">Log external responsibilities, cultural events, hackathons, and certifications.</p>
                </div>

                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all"
                >
                    {showAddForm ? "Close Form" : "Log Activity"}
                </button>
            </div>

            {/* ================= LOG ACTIVITY FORM ================= */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Log Portfolio Activity Details</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Activity Name / Title</label>
                            <input
                                type="text"
                                required
                                value={form.activityName}
                                onChange={(e) => setForm({ ...form, activityName: e.target.value })}
                                placeholder="e.g. Smart India Hackathon Mentor"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="bg-slate-950 text-xs text-slate-200 rounded-xl"
                            >
                                <option value="Academic">Academic</option>
                                <option value="Technical">Technical</option>
                                <option value="Cultural">Cultural</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date of Activity</label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Supporting Document (PDF / Image)</label>
                            <input
                                type="file"
                                className="w-full text-xs text-slate-450 border border-slate-800 rounded-xl p-1 bg-slate-950"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Brief Description of Responsibilities</label>
                            <textarea
                                rows="3"
                                required
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Describe role, outcomes, student count involved, or certification details..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-xs text-slate-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl shadow-lg"
                        >
                            {loading ? "Submitting..." : "Log Activity"}
                        </button>
                    </div>
                </form>
            )}

            {/* ================= CATEGORY FILTERS ================= */}
            <div className="flex flex-wrap gap-1 bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                {["All", "Academic", "Technical", "Cultural"].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${categoryFilter === cat ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ================= ACTIVITIES GRID ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500 italic text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                        No portfolio activities logged yet.
                    </div>
                ) : (
                    filteredActivities.map(act => (
                        <div key={act._id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between hover:border-slate-700/60 transition-colors">
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeStyle(act.category)}`}>
                                        {act.category}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold">{act.date}</span>
                                </div>

                                <h4 className="text-xs font-bold text-slate-200 leading-snug mb-1.5">{act.activityName}</h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 mb-4">{act.description}</p>
                            </div>

                            <div className="border-t border-slate-850 pt-3 mt-4 flex items-center justify-between text-[10px]">
                                <span className="text-slate-500">Logged by: <strong className="text-slate-350">{act.userId?.name || "Faculty Member"}</strong></span>
                                {act.documentPath ? (
                                    <a
                                        href={act.documentPath}
                                        download={`${act.activityName.replace(/\s+/g, "_")}_doc.pdf`}
                                        className="text-indigo-400 hover:text-indigo-300 font-bold underline inline-flex items-center gap-0.5"
                                    >
                                        📥 Document
                                    </a>
                                ) : (
                                    <span className="text-slate-600 italic">No Document</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}

export default ActivitiesPanel;
