import React, { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";

const INDEXING_OPTIONS = ["Scopus", "Web of Science", "IEEE Xplore", "UGC CARE", "PubMed", "SCI / SCIE", "Peer Reviewed", "Other"];
const STATUS_OPTIONS = ["Published", "Accepted", "Under Review", "Communicated"];
const PUBLICATION_TYPES = ["Journal Article", "Conference Proceeding", "Book Chapter", "Monograph", "Patent", "Preprint"];

function PapersPanel({ currentUser, refreshTrigger, onRefresh }) {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Filtering & Sorting
    const [searchQuery, setSearchQuery] = useState("");
    const [scopeFilter, setScopeFilter] = useState("ALL"); // "ALL" | "SELF" | "FACULTY"
    const [filterIndexing, setFilterIndexing] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [sortBy, setSortBy] = useState("dateDesc"); // dateDesc, dateAsc, title

    const currentUserId = (currentUser._id || currentUser.id || "").toString();

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // 'add', 'edit', 'view'
    const [activePaper, setActivePaper] = useState(null);

    // Form inputs
    const [form, setForm] = useState({
        title: "",
        journal: "",
        publicationType: "Journal Article",
        date: new Date().toISOString().split("T")[0],
        doi: "",
        issnIsbn: "",
        researchArea: "",
        indexing: "Scopus",
        publicationStatus: "Published",
        authors: currentUser.name || "",
        coAuthors: "",
        description: "",
        fileBase64: ""
    });
    const [fileName, setFileName] = useState("");

    const loadPapers = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const queryParams = new URLSearchParams();
            if (filterIndexing !== "all") queryParams.append("indexing", filterIndexing);
            if (filterStatus !== "all") queryParams.append("publicationStatus", filterStatus);
            if (sortBy) queryParams.append("sort", sortBy);
            if (searchQuery.trim()) queryParams.append("search", searchQuery.trim());

            const url = `/papers${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
            const data = await api.get(url);
            setPapers(data.papers || []);
        } catch (err) {
            console.error("Failed to load papers:", err);
            setErrorMsg(err.response?.data?.error || "Failed to load research papers ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPapers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, refreshTrigger, filterIndexing, filterStatus, sortBy]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadPapers();
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    // File converter
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            setErrorMsg("File size exceeds 20MB limit ❌");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({
                ...prev,
                fileBase64: reader.result
            }));
            setFileName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const handleOpenAdd = () => {
        setModalMode("add");
        setActivePaper(null);
        setForm({
            title: "",
            journal: "",
            publicationType: "Journal Article",
            date: new Date().toISOString().split("T")[0],
            doi: "",
            issnIsbn: "",
            researchArea: "",
            indexing: "Scopus",
            publicationStatus: "Published",
            authors: currentUser.name || "",
            coAuthors: "",
            description: "",
            fileBase64: ""
        });
        setFileName("");
        setShowModal(true);
    };

    const handleOpenEdit = (p) => {
        setModalMode("edit");
        setActivePaper(p);
        setForm({
            title: p.title || "",
            journal: p.journal || p.conferenceName || "",
            publicationType: p.publicationType || "Journal Article",
            date: p.date ? p.date.split("T")[0] : new Date().toISOString().split("T")[0],
            doi: p.doi || "",
            issnIsbn: p.issnIsbn || "",
            researchArea: p.researchArea || "",
            indexing: p.indexing || "Scopus",
            publicationStatus: p.publicationStatus || "Published",
            authors: p.authors || p.submittedBy?.name || currentUser.name || "",
            coAuthors: p.coAuthors || "",
            description: p.description || p.abstract || "",
            fileBase64: p.fileBase64 || ""
        });
        setFileName(p.fileBase64 ? "Existing publication file attached" : "");
        setShowModal(true);
    };

    const handleOpenView = (p) => {
        setModalMode("view");
        setActivePaper(p);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.journal.trim()) {
            setErrorMsg("Please enter paper title and journal/conference name ❌");
            return;
        }

        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            if (modalMode === "edit" && activePaper) {
                await api.put(`/papers/${activePaper._id}`, form);
                setSuccessMsg(`Research publication "${form.title}" updated successfully! ✅`);
            } else {
                await api.post("/papers", form);
                setSuccessMsg(`Research publication "${form.title}" logged successfully! ✅`);
            }
            setShowModal(false);
            await loadPapers();
            if (onRefresh) onRefresh();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error("Failed to save paper:", err);
            setErrorMsg(err.response?.data?.error || err.message || "Failed to save paper ❌");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete paper "${title}"? This cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/papers/${id}`);
            setSuccessMsg("Research paper deleted successfully! ✅");
            await loadPapers();
            if (onRefresh) onRefresh();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error("Delete error:", err);
            setErrorMsg(err.response?.data?.error || "Failed to delete paper ❌");
        }
    };

    // Filter by Scope (All, Self, Faculty)
    const filteredPapers = useMemo(() => {
        return papers.filter(p => {
            const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
            const isSelf = pUserId === currentUserId;

            if (scopeFilter === "SELF" && !isSelf) return false;
            if (scopeFilter === "FACULTY" && isSelf) return false;

            return true;
        });
    }, [papers, scopeFilter, currentUserId]);

    const selfPapersCount = papers.filter(p => {
        const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
        return pUserId === currentUserId;
    }).length;

    const facultyPapersCount = papers.filter(p => {
        const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
        return pUserId !== currentUserId;
    }).length;

    return (
        <div className="space-y-6 text-slate-100 pb-12 animate-fade-in text-xs">
            {/* Header section */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📚</span> Research Papers &amp; Publications
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Track indexed peer-reviewed journal papers, conferences, DOI links, citations, and preprints.
                    </p>
                </div>

                <button
                    onClick={handleOpenAdd}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer text-xs"
                >
                    <span>➕</span>
                    <span>Add Research Paper</span>
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

            {/* Controls Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
                {/* Scope selector tabs for Principal / HOD */}
                {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                        <button
                            onClick={() => setScopeFilter("ALL")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                                scopeFilter === "ALL" 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            All ({papers.length})
                        </button>
                        <button
                            onClick={() => setScopeFilter("SELF")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                                scopeFilter === "SELF" 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <span>My Papers</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 font-mono">{selfPapersCount}</span>
                        </button>
                        <button
                            onClick={() => setScopeFilter("FACULTY")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                                scopeFilter === "FACULTY" 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <span>Faculty Papers</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 font-mono">{facultyPapersCount}</span>
                        </button>
                    </div>
                )}

                {/* Search bar */}
                <div className="relative flex-1 min-w-[200px]">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title, journal, DOI, author..."
                    />
                </div>

                {/* Indexing filter */}
                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={filterIndexing}
                    onChange={(e) => setFilterIndexing(e.target.value)}
                >
                    <option value="all">All Indexing</option>
                    {INDEXING_OPTIONS.map(idx => (
                        <option key={idx} value={idx}>{idx}</option>
                    ))}
                </select>

                {/* Status filter */}
                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    {STATUS_OPTIONS.map(st => (
                        <option key={st} value={st}>{st}</option>
                    ))}
                </select>

                {/* Sorting */}
                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="dateDesc">Newest Publication First</option>
                    <option value="dateAsc">Oldest Publication First</option>
                    <option value="title">Alphabetical (Title)</option>
                </select>
            </div>

            {/* Papers Grid */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Loading research papers...
                </div>
            ) : filteredPapers.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-2xl mb-2">📚</p>
                    <p className="font-semibold text-slate-300">No research papers found matching your filters.</p>
                    <p className="text-slate-500 mt-1">Click "Add Research Paper" to publish your academic contribution.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredPapers.map(p => {
                        const pUserId = (p.submittedBy?._id || p.submittedBy || "").toString();
                        const isSelf = pUserId === currentUserId;
                        const authorName = isSelf ? "You (Author)" : (p.submittedBy?.name || p.authors || "Faculty Author");

                        return (
                            <div 
                                key={p._id} 
                                className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col justify-between transition hover:border-indigo-500/50 ${
                                    isSelf ? "border-indigo-500/30" : "border-slate-800"
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-indigo-500/10 text-indigo-400 border-indigo-500/20 uppercase tracking-wider truncate max-w-[160px]">
                                            {p.journal || p.conferenceName || "Journal"}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {p.indexing && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {p.indexing}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono font-semibold">{p.date ? p.date.split("T")[0] : ""}</span>
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                                        {p.title}
                                    </h4>

                                    <div className="text-[11px] text-slate-400 space-y-0.5">
                                        {p.authors && (
                                            <p className="truncate"><span className="text-slate-500 font-semibold">Author(s):</span> {p.authors}</p>
                                        )}
                                        {p.coAuthors && (
                                            <p className="truncate"><span className="text-slate-500 font-semibold">Co-authors:</span> {p.coAuthors}</p>
                                        )}
                                        {p.researchArea && (
                                            <p className="truncate"><span className="text-slate-500 font-semibold">Area:</span> {p.researchArea}</p>
                                        )}
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                                        {p.description || p.abstract || "No abstract provided."}
                                    </p>
                                </div>

                                <div className="border-t border-slate-800 pt-3 mt-4 space-y-3">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-slate-500">By:</span>
                                            <span className={`font-bold truncate ${isSelf ? "text-indigo-400" : "text-slate-300"}`}>
                                                {authorName}
                                            </span>
                                        </div>

                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            p.publicationStatus === "Published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                        }`}>
                                            {p.publicationStatus || "Published"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 text-[11px] font-bold">
                                        <div className="flex items-center gap-2">
                                            {p.doi && (
                                                <a
                                                    href={p.doi.startsWith("http") ? p.doi : `https://doi.org/${p.doi}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 px-2 py-1 rounded-lg border border-indigo-700/40 transition flex items-center gap-1"
                                                >
                                                    <span>🔗</span>
                                                    <span>DOI</span>
                                                </a>
                                            )}
                                            {p.fileBase64 && (
                                                <a
                                                    href={p.fileBase64}
                                                    download={`${p.title.replace(/\s+/g, "_")}_preprint.pdf`}
                                                    className="text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-700/40 inline-flex items-center gap-1 transition"
                                                >
                                                    <span>📥</span>
                                                    <span>PDF</span>
                                                </a>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 ml-auto">
                                            <button
                                                onClick={() => handleOpenView(p)}
                                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                                            >
                                                View
                                            </button>
                                            {(isSelf || currentUser.role === "Principal") && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenEdit(p)}
                                                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30 transition cursor-pointer"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p._id, p.title)}
                                                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition cursor-pointer"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal for Add / Edit / View Paper */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>{modalMode === "view" ? "👁️" : modalMode === "edit" ? "✏️" : "➕"}</span>
                                <span>
                                    {modalMode === "view" ? "Research Paper Details" : modalMode === "edit" ? "Edit Research Paper" : "Add Research Paper"}
                                </span>
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-white text-base px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>

                        {modalMode === "view" && activePaper ? (
                            <div className="space-y-4 text-xs">
                                <div>
                                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Paper Title</span>
                                    <p className="text-base font-bold text-white mt-0.5">{activePaper.title}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Journal / Conference</span>
                                        <p className="text-indigo-400 font-semibold mt-0.5">{activePaper.journal || activePaper.conferenceName}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Publication Date</span>
                                        <p className="text-slate-200 font-mono mt-0.5">{activePaper.date ? activePaper.date.split("T")[0] : "—"}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Indexing</span>
                                        <p className="text-emerald-400 font-semibold mt-0.5">{activePaper.indexing || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Status</span>
                                        <p className="text-slate-200 mt-0.5">{activePaper.publicationStatus || "Published"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">ISSN / ISBN</span>
                                        <p className="text-slate-200 font-mono mt-0.5">{activePaper.issnIsbn || "—"}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Author(s)</span>
                                        <p className="text-slate-300 mt-0.5">{activePaper.authors || activePaper.submittedBy?.name || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Co-author(s)</span>
                                        <p className="text-slate-300 mt-0.5">{activePaper.coAuthors || "—"}</p>
                                    </div>
                                </div>

                                {activePaper.doi && (
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">DOI Link</span>
                                        <a
                                            href={activePaper.doi.startsWith("http") ? activePaper.doi : `https://doi.org/${activePaper.doi}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-indigo-400 hover:text-indigo-300 underline font-mono text-xs block mt-0.5"
                                        >
                                            {activePaper.doi}
                                        </a>
                                    </div>
                                )}

                                <div>
                                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Abstract</span>
                                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                                        {activePaper.description || activePaper.abstract || "No abstract provided."}
                                    </div>
                                </div>

                                {activePaper.fileBase64 && (
                                    <div className="pt-2">
                                        <a
                                            href={activePaper.fileBase64}
                                            download={`${activePaper.title.replace(/\s+/g, "_")}_preprint.pdf`}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl inline-flex items-center gap-2 font-semibold transition cursor-pointer"
                                        >
                                            <span>📥</span>
                                            <span>Download Preprint PDF</span>
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
                                        Paper Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. Robust Machine Learning Architectures for Edge Computing"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Journal / Conference Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={form.journal}
                                            onChange={(e) => setForm({ ...form, journal: e.target.value })}
                                            placeholder="e.g. IEEE Transactions on Knowledge and Data Engineering"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Publication Type *
                                        </label>
                                        <select
                                            value={form.publicationType}
                                            onChange={(e) => setForm({ ...form, publicationType: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        >
                                            {PUBLICATION_TYPES.map(pt => (
                                                <option key={pt} value={pt}>{pt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Publication Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Indexing Standard
                                        </label>
                                        <select
                                            value={form.indexing}
                                            onChange={(e) => setForm({ ...form, indexing: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        >
                                            {INDEXING_OPTIONS.map(idx => (
                                                <option key={idx} value={idx}>{idx}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Publication Status
                                        </label>
                                        <select
                                            value={form.publicationStatus}
                                            onChange={(e) => setForm({ ...form, publicationStatus: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        >
                                            {STATUS_OPTIONS.map(st => (
                                                <option key={st} value={st}>{st}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            DOI or Publication URL
                                        </label>
                                        <input
                                            type="text"
                                            value={form.doi}
                                            onChange={(e) => setForm({ ...form, doi: e.target.value })}
                                            placeholder="10.1109/TKDE.2026.12345"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            ISSN / ISBN
                                        </label>
                                        <input
                                            type="text"
                                            value={form.issnIsbn}
                                            onChange={(e) => setForm({ ...form, issnIsbn: e.target.value })}
                                            placeholder="e.g. 1041-4347"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Research Area / Domain
                                        </label>
                                        <input
                                            type="text"
                                            value={form.researchArea}
                                            onChange={(e) => setForm({ ...form, researchArea: e.target.value })}
                                            placeholder="e.g. Artificial Intelligence"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Primary Author(s)
                                        </label>
                                        <input
                                            type="text"
                                            value={form.authors}
                                            onChange={(e) => setForm({ ...form, authors: e.target.value })}
                                            placeholder="e.g. Dr. Jane Doe"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Co-Author(s) (Comma separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={form.coAuthors}
                                            onChange={(e) => setForm({ ...form, coAuthors: e.target.value })}
                                            placeholder="Prof. Alex Smith, Dr. John Doe"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Abstract / Description
                                    </label>
                                    <textarea
                                        rows="3"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Outline methodology, key experimental findings, and conclusion..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Upload Preprint / Publication File (PDF max 20MB)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer flex items-center gap-2">
                                            <span>📎</span>
                                            <span>Choose PDF</span>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="text-slate-400 text-xs truncate max-w-xs">
                                            {fileName || "No file selected"}
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
                                        {saving ? "Saving Paper..." : modalMode === "edit" ? "Update Publication" : "Log Publication"}
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

export default PapersPanel;
