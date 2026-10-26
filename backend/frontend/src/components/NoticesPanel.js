import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function NoticesPanel({ currentUser }) {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState("all");

    const loadNotices = async () => {
        setLoading(true);
        try {
            const data = await api.get("/notices");
            if (data.success) {
                setNotices(data.notices || []);
            }
        } catch (err) {
            console.error("Failed to load notices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotices();
    }, []);

    const filtered = notices.filter(n => {
        if (filterType === "all") return true;
        return n.type === filterType;
    });

    return (
        <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📢</span> Institutional Notices & Announcements
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Official circulars, academic calendar deadlines, memos, and administration notifications.
                    </p>
                </div>

                {/* Filter tags */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 text-xs">
                    <button
                        onClick={() => setFilterType("all")}
                        className={`px-3 py-1.5 rounded-lg transition font-medium ${filterType === "all" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType("deadline")}
                        className={`px-3 py-1.5 rounded-lg transition font-medium ${filterType === "deadline" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        Deadlines
                    </button>
                    <button
                        onClick={() => setFilterType("warning")}
                        className={`px-3 py-1.5 rounded-lg transition font-medium ${filterType === "warning" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        Alerts
                    </button>
                    <button
                        onClick={() => setFilterType("info")}
                        className={`px-3 py-1.5 rounded-lg transition font-medium ${filterType === "info" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        Circulars
                    </button>
                </div>
            </div>

            {/* Notices List */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Loading announcements...
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                    <span className="text-3xl block mb-2">📢</span>
                    <p className="font-semibold text-slate-200">No announcements found.</p>
                    <p className="text-slate-500 mt-1">Check back later for newly published institutional circulars.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(n => (
                        <div
                            key={n._id}
                            className={`p-4 bg-slate-900 border rounded-2xl transition hover:border-slate-700/80 flex items-start gap-4 ${
                                n.type === "deadline" ? "border-amber-500/30" : n.type === "warning" ? "border-rose-500/30" : "border-slate-800"
                            }`}
                        >
                            <span className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-base shrink-0 mt-0.5">
                                {n.type === "deadline" ? "⏰" : n.type === "warning" ? "⚠️" : n.type === "approval" ? "🔔" : "📄"}
                            </span>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-bold text-slate-200">{n.title}</h4>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Recent"}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default NoticesPanel;
