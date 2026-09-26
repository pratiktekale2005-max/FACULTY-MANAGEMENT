import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function PapersPanel({ currentUser, refreshTrigger, onRefresh }) {
    const [papers, setPapers] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [scopeFilter, setScopeFilter] = useState("ALL"); // "ALL" | "SELF" | "FACULTY"

    const currentUserId = (currentUser._id || currentUser.id || "").toString();

    // Form inputs
    const [form, setForm] = useState({
        title: "",
        journal: "",
        date: new Date().toISOString().split("T")[0],
        doi: "",
        coAuthors: "",
        description: "",
        fileBase64: ""
    });

    const loadPapers = async () => {
        try {
            const data = await api.get("/papers");
            setPapers(data.papers || []);
        } catch (err) {
            console.error("Failed to load papers:", err);
        }
    };

    useEffect(() => {
        loadPapers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, refreshTrigger]);

    // File converter
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            alert("File size exceeds 15MB limit.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({
                ...prev,
                fileBase64: reader.result
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/papers", form);
            alert(currentUser.role === "Principal" 
                ? "Principal self research publication logged and verified successfully! ✅" 
                : "Research publication logged successfully! (+10 Performance Index) ✅"
            );
            setShowAddForm(false);
            setForm({
                title: "",
                journal: "",
                date: new Date().toISOString().split("T")[0],
                doi: "",
                coAuthors: "",
                description: "",
                fileBase64: ""
            });
            await loadPapers();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.response?.data?.error || err.message || "Failed to log paper ❌");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter by Scope (All, Self, Faculty) & Search
    const filteredPapers = papers.filter(p => {
        const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
        const isSelf = pUserId === currentUserId;

        if (scopeFilter === "SELF" && !isSelf) return false;
        if (scopeFilter === "FACULTY" && isSelf) return false;

        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;

        return (
            (p.title || "").toLowerCase().includes(query) || 
            (p.journal || "").toLowerCase().includes(query) ||
            (p.coAuthors && p.coAuthors.toLowerCase().includes(query)) ||
            (p.submittedBy?.name && p.submittedBy.name.toLowerCase().includes(query))
        );
    });

    const selfPapersCount = papers.filter(p => {
        const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
        return pUserId === currentUserId;
    }).length;

    const facultyPapersCount = papers.filter(p => {
        const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
        return pUserId !== currentUserId;
    }).length;

    return (
        <div className="space-y-6 animate-fade-in text-xs">
            
            {/* ================= HEADER PANEL ================= */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>📝</span> Research Papers & Publications
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {currentUser.role === "Principal" 
                            ? "Track institution-wide research publications, or log and showcase your own research papers." 
                            : "Log peer-reviewed publications, co-authors list, and upload preprint files."}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                            showAddForm 
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700" 
                                : "bg-indigo-650 hover:bg-indigo-600 text-white"
                        }`}
                    >
                        <span>{showAddForm ? "✕ Close Form" : currentUser.role === "Principal" ? "➕ Add My Research Paper (Self)" : "➕ Log Publication"}</span>
                    </button>
                </div>
            </div>

            {/* ================= ADD PAPER FORM ================= */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <span>📄</span> {currentUser.role === "Principal" ? "Log Principal Research Paper (Self Publication)" : "Log Research Paper Details"}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {currentUser.role === "Principal" 
                                    ? "Add your personal research publication. It will be verified and displayed in the institutional research card portfolio." 
                                    : "Enter your publication metadata. Papers are submitted to HOD for appraisal credit."}
                            </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {currentUser.role === "Principal" ? "🏛️ Verified Author (Self)" : "👨‍🏫 Faculty Submission"}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Paper Title <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. A Deep Learning Approach to Smart Grid Load Estimation"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Journal / Conference Name <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={form.journal}
                                onChange={(e) => setForm({ ...form, journal: e.target.value })}
                                placeholder="e.g. IEEE Transactions on Power Systems"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Publication Date <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DOI Link / Index</label>
                            <input
                                type="text"
                                value={form.doi}
                                onChange={(e) => setForm({ ...form, doi: e.target.value })}
                                placeholder="e.g. 10.1109/TPWRS.2026.12345"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Co-authors (Comma separated)</label>
                            <input
                                type="text"
                                value={form.coAuthors}
                                onChange={(e) => setForm({ ...form, coAuthors: e.target.value })}
                                placeholder="Prof. Jane Doe, Dr. Suresh Kumar"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upload Preprint / Publication File (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf"
                                className="w-full text-xs text-slate-400 border border-slate-800 rounded-xl p-2 bg-slate-950 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abstract Description</label>
                            <textarea
                                rows="3"
                                required
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Enter abstract details or summary outcomes of this paper publication..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/80">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl shadow-lg transition disabled:opacity-50"
                        >
                            {loading ? "Logging Paper..." : currentUser.role === "Principal" ? "Publish My Research Paper" : "Log Publication"}
                        </button>
                    </div>
                </form>
            )}

            {/* ================= CONTROLS & FILTER TABS ================= */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Scope selector tabs (Principal & HOD) */}
                {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                        <button
                            onClick={() => setScopeFilter("ALL")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition ${
                                scopeFilter === "ALL" 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            🌐 All Publications ({papers.length})
                        </button>
                        <button
                            onClick={() => setScopeFilter("SELF")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                                scopeFilter === "SELF" 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <span>👤 My Research Papers (Self)</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 font-mono">{selfPapersCount}</span>
                        </button>
                        <button
                            onClick={() => setScopeFilter("FACULTY")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                                scopeFilter === "FACULTY" 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <span>👥 Faculty Papers</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 font-mono">{facultyPapersCount}</span>
                        </button>
                    </div>
                )}

                {/* Search bar */}
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search papers by title, journal, author or co-author..."
                    />
                    <span className="absolute left-3 top-2 text-slate-500 text-xs">🔍</span>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 font-bold text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* ================= PUBLICATIONS LIST GRID ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPapers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500 italic text-xs bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
                        <div className="text-3xl">📝</div>
                        <p>No research papers found matching the selected criteria.</p>
                        {scopeFilter === "SELF" && currentUser.role === "Principal" && (
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="mt-2 px-4 py-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition"
                            >
                                ➕ Add your first self research publication
                            </button>
                        )}
                    </div>
                ) : (
                    filteredPapers.map(p => {
                        const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
                        const isSelf = pUserId === currentUserId;
                        const isPrincipalAuthor = isSelf || (p.submittedBy?.role === "Principal");

                        return (
                            <div 
                                key={p._id} 
                                className={`bg-slate-900/60 border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] ${
                                    isSelf 
                                        ? "border-purple-500/40 hover:border-purple-500/80 bg-gradient-to-br from-slate-900/90 to-purple-950/20" 
                                        : "border-slate-800 hover:border-indigo-500/60"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-850/80 pb-2.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider truncate max-w-[170px] ${
                                            isSelf 
                                                ? "text-purple-300 bg-purple-500/15 border-purple-500/30" 
                                                : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                                        }`}>
                                            {p.journal}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isSelf && (
                                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                                    MY PAPER (SELF)
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-semibold">{p.date}</span>
                                        </div>
                                    </div>

                                    <h4 className="text-xs font-bold text-slate-100 leading-snug mb-1.5 line-clamp-2">
                                        {p.title}
                                    </h4>
                                    
                                    {p.coAuthors && (
                                        <p className="text-[10px] text-slate-400 mb-2 truncate">
                                            <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Co-authors:</span> {p.coAuthors}
                                        </p>
                                    )}

                                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 mb-4">
                                        {p.description || p.abstract || "No abstract provided."}
                                    </p>
                                </div>

                                <div className="border-t border-slate-850/80 pt-3 mt-4 flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-slate-500 shrink-0">Author:</span>
                                        <span className={`font-bold truncate ${isSelf ? "text-purple-300" : "text-slate-300"}`}>
                                            {isSelf ? "You (Principal)" : (p.submittedBy?.name || "Faculty Member")}
                                        </span>
                                        {isPrincipalAuthor && !isSelf && (
                                            <span className="text-[9px] px-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                                                Principal
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        {p.doi && (
                                            <a
                                                href={`https://doi.org/${p.doi}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/40 transition"
                                                title="Digital Object Identifier Link"
                                            >
                                                🔗 DOI
                                            </a>
                                        )}
                                        {p.fileBase64 ? (
                                            <a
                                                href={p.fileBase64}
                                                download={`${p.title.replace(/\s+/g, "_")}_preprint.pdf`}
                                                className="text-emerald-400 hover:text-emerald-300 font-bold text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/40 inline-flex items-center gap-1 transition"
                                            >
                                                <span>📥</span>
                                                <span>PDF</span>
                                            </a>
                                        ) : (
                                            <span className="text-slate-600 italic text-[10px]">No File</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

        </div>
    );
}

export default PapersPanel;
