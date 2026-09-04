import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function PapersPanel({ currentUser, refreshTrigger, onRefresh }) {
    const [papers, setPapers] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Form inputs
    const [form, setForm] = useState({
        title: "",
        journal: "",
        date: "",
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
            alert("Research publication logged successfully! (+10 Performance Index) ✅");
            setShowAddForm(false);
            setForm({
                title: "",
                journal: "",
                date: "",
                doi: "",
                coAuthors: "",
                description: "",
                fileBase64: ""
            });
            loadPapers();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to log paper ❌");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPapers = papers.filter(p => {
        const query = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(query) || 
               p.journal.toLowerCase().includes(query) ||
               (p.coAuthors && p.coAuthors.toLowerCase().includes(query)) ||
               (p.submittedBy?.name && p.submittedBy.name.toLowerCase().includes(query));
    });

    return (
        <div className="space-y-6">
            
            {/* ================= HEADER PANEL ================= */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Research Papers & Publications</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {currentUser.role === "Principal" ? "Track research publications, preprints, and journals across all faculty members." : "Log peer-reviewed publications, co-authors list, and upload preprint files."}
                    </p>
                </div>

                {currentUser.role === "Faculty" && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all"
                    >
                        {showAddForm ? "Close Form" : "Log Publication"}
                    </button>
                )}
            </div>

            {/* ================= ADD PAPER FORM ================= */}
            {showAddForm && currentUser.role === "Faculty" && (
                <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Log Research Paper Details</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Paper Title</label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. A Deep Learning Approach to Smart Grid Load Estimation"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Journal / Conference Name</label>
                            <input
                                type="text"
                                required
                                value={form.journal}
                                onChange={(e) => setForm({ ...form, journal: e.target.value })}
                                placeholder="e.g. IEEE Transactions on Power Systems"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Publication Date</label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">DOI Link / Index</label>
                            <input
                                type="text"
                                value={form.doi}
                                onChange={(e) => setForm({ ...form, doi: e.target.value })}
                                placeholder="e.g. 10.1109/TPWRS.2026.12345"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Co-authors (Comma separated)</label>
                            <input
                                type="text"
                                value={form.coAuthors}
                                onChange={(e) => setForm({ ...form, coAuthors: e.target.value })}
                                placeholder="Prof. Jane Doe, Dr. Suresh Kumar"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Upload Preprint / Publication File (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf"
                                className="w-full text-xs text-slate-450 border border-slate-800 rounded-xl p-1 bg-slate-950"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Abstract Description</label>
                            <textarea
                                rows="3"
                                required
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Enter abstract details or summary outcomes of this paper publication..."
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
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 rounded-xl shadow-lg"
                        >
                            {loading ? "Logging..." : "Log Publication"}
                        </button>
                    </div>
                </form>
            )}

            {/* ================= SEARCH FILTER INPUT ================= */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
                <input
                    type="text"
                    className="w-full sm:w-80 text-xs bg-slate-950 border border-slate-850 placeholder-slate-500 rounded-xl py-1.5"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search papers by title, journal, or co-author..."
                />
            </div>

            {/* ================= PUBLICATIONS LIST GRID ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPapers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500 italic text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                        No research papers matching query.
                    </div>
                ) : (
                    filteredPapers.map(p => (
                        <div key={p._id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between hover:border-slate-700/60 transition-colors">
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-850/60 pb-2">
                                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider">
                                        {p.journal}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold">{p.date}</span>
                                </div>

                                <h4 className="text-xs font-bold text-slate-200 leading-snug mb-1.5">{p.title}</h4>
                                
                                {p.coAuthors && (
                                    <p className="text-[10px] text-slate-500 font-semibold mb-2">
                                        Co-authors: <span className="text-slate-400">{p.coAuthors}</span>
                                    </p>
                                )}

                                <p className="text-[11px] text-slate-450 leading-relaxed line-clamp-3 mb-4">{p.description}</p>
                            </div>

                            <div className="border-t border-slate-850 pt-3 mt-4 flex items-center justify-between text-[10px]">
                                <span className="text-slate-500">Submitted by: <strong className="text-slate-350">{p.submittedBy?.name || "Faculty Member"}</strong></span>
                                
                                <div className="flex items-center gap-3">
                                    {p.doi && (
                                        <a
                                            href={`https://doi.org/${p.doi}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-indigo-400 hover:text-indigo-300 font-bold"
                                            title="Digital Object Identifier Link"
                                        >
                                            🔗 DOI
                                        </a>
                                    )}
                                    {p.fileBase64 ? (
                                        <a
                                            href={p.fileBase64}
                                            download={`${p.title.replace(/\s+/g, "_")}_preprint.pdf`}
                                            className="text-indigo-400 hover:text-indigo-300 font-bold underline inline-flex items-center gap-0.5"
                                        >
                                            📥 Preprint
                                        </a>
                                    ) : (
                                        <span className="text-slate-600 italic">No File</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}

export default PapersPanel;
