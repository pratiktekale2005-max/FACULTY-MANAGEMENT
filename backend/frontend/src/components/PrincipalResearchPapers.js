import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import DocumentViewerModal from "./DocumentViewerModal";

function PrincipalResearchPapers({ currentUser }) {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [indexingFilter, setIndexingFilter] = useState("all");
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingPaper, setEditingPaper] = useState(null);
    const [selectedDocPreview, setSelectedDocPreview] = useState(null);

    // Form inputs state
    const initialFormState = {
        title: "",
        authors: currentUser?.fullName || currentUser?.name || "Dr. Principal",
        journal: "",
        conferenceName: "",
        publicationType: "Journal Article",
        publisher: "IEEE / Springer",
        issnIsbn: "",
        doi: "",
        publicationDate: new Date().toISOString().split("T")[0],
        volume: "",
        issue: "",
        pageNumbers: "",
        indexing: "Scopus",
        impactFactor: "",
        citationCount: 0,
        abstract: "",
        researchArea: "Computer Science & Engineering",
        publicationStatus: "Published",
        fileBase64: "",
        certificateBase64: ""
    };

    const [form, setForm] = useState(initialFormState);

    // Load Principal's self papers strictly with scope=self
    const loadSelfPapers = async () => {
        try {
            setLoading(true);
            const data = await api.get("/papers", { scope: "self" });
            setPapers(data.papers || []);
        } catch (err) {
            console.error("Failed to load Principal research papers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSelfPapers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Handle file upload to Base64
    const handleFileUpload = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 12 * 1024 * 1024) {
            alert("File size exceeds 12MB limit ⚠️");
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

    // Open create modal
    const handleOpenCreate = () => {
        setEditingPaper(null);
        setForm({
            ...initialFormState,
            authors: currentUser?.fullName || currentUser?.name || "Dr. Principal"
        });
        setShowModal(true);
    };

    // Open edit modal
    const handleOpenEdit = (paper) => {
        setEditingPaper(paper);
        setForm({
            title: paper.title || "",
            authors: paper.authors || paper.coAuthors || "",
            journal: paper.journal || "",
            conferenceName: paper.conferenceName || "",
            publicationType: paper.publicationType || "Journal Article",
            publisher: paper.publisher || "",
            issnIsbn: paper.issnIsbn || "",
            doi: paper.doi || "",
            publicationDate: paper.publicationDate || paper.date || new Date().toISOString().split("T")[0],
            volume: paper.volume || "",
            issue: paper.issue || "",
            pageNumbers: paper.pageNumbers || "",
            indexing: paper.indexing || "Scopus",
            impactFactor: paper.impactFactor || "",
            citationCount: paper.citationCount || 0,
            abstract: paper.abstract || paper.description || "",
            researchArea: paper.researchArea || "",
            publicationStatus: paper.publicationStatus || "Published",
            fileBase64: paper.fileBase64 || "",
            certificateBase64: paper.certificateBase64 || ""
        });
        setShowModal(true);
    };

    // Save paper (Create or Edit)
    const handleSavePaper = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingPaper) {
                // Update
                await api.put(`/papers/${editingPaper._id}`, form);
                alert("Research publication updated successfully! ✅");
            } else {
                // Create
                await api.post("/papers", form);
                alert("Research publication added to your profile! ✅");
            }
            setShowModal(false);
            setEditingPaper(null);
            loadSelfPapers();
        } catch (err) {
            alert(err.message || "Failed to save research publication ❌");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Delete paper
    const handleDeletePaper = async (paperId, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}" from your profile? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/papers/${paperId}`);
            alert("Research paper deleted successfully! 🗑️");
            loadSelfPapers();
        } catch (err) {
            alert(err.message || "Failed to delete publication ❌");
            console.error(err);
        }
    };

    // Filtered papers
    const filteredPapers = papers.filter(p => {
        const query = searchQuery.toLowerCase();
        const matchesQuery = (p.title || "").toLowerCase().includes(query) ||
                             (p.journal || "").toLowerCase().includes(query) ||
                             (p.authors || "").toLowerCase().includes(query) ||
                             (p.researchArea || "").toLowerCase().includes(query) ||
                             (p.indexing || "").toLowerCase().includes(query);

        const matchesStatus = statusFilter === "all" || p.publicationStatus === statusFilter || p.status === statusFilter;
        const matchesIndexing = indexingFilter === "all" || p.indexing === indexingFilter;

        return matchesQuery && matchesStatus && matchesIndexing;
    });

    // Compute stats
    const totalPapers = papers.length;
    const scopusCount = papers.filter(p => (p.indexing || "").toLowerCase().includes("scopus")).length;
    const sciCount = papers.filter(p => (p.indexing || "").toLowerCase().includes("sci")).length;
    const totalCitations = papers.reduce((sum, p) => sum + (Number(p.citationCount) || 0), 0);

    return (
        <div className="space-y-6">
            
            {/* Top Scorecard Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                        📚
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">My Publications</span>
                        <div className="text-xl font-black text-slate-100">{totalPapers}</div>
                        <span className="text-[9px] text-indigo-400 font-semibold">Self-authored research</span>
                    </div>
                </div>

                <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
                        🌐
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Scopus Indexed</span>
                        <div className="text-xl font-black text-slate-100">{scopusCount}</div>
                        <span className="text-[9px] text-emerald-400 font-semibold">High-impact journals</span>
                    </div>
                </div>

                <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl shrink-0">
                        ⚡
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SCI / WoS Indexed</span>
                        <div className="text-xl font-black text-slate-100">{sciCount}</div>
                        <span className="text-[9px] text-purple-400 font-semibold">Peer-reviewed standard</span>
                    </div>
                </div>

                <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
                        📈
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Citations</span>
                        <div className="text-xl font-black text-slate-100">{totalCitations}</div>
                        <span className="text-[9px] text-amber-400 font-semibold">Academic influence index</span>
                    </div>
                </div>
            </div>

            {/* Filter & Action Bar */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search publications by title, journal, indexing..."
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <select
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="Published">Published</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Under Review">Under Review</option>
                    </select>

                    <select
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        value={indexingFilter}
                        onChange={(e) => setIndexingFilter(e.target.value)}
                    >
                        <option value="all">All Indexing</option>
                        <option value="Scopus">Scopus</option>
                        <option value="SCI / SCIE">SCI / SCIE</option>
                        <option value="Web of Science">Web of Science</option>
                        <option value="UGC CARE">UGC CARE</option>
                        <option value="Peer-Reviewed">Peer-Reviewed</option>
                    </select>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                    <button
                        onClick={loadSelfPapers}
                        className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all"
                        title="Refresh papers"
                    >
                        🔄
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5"
                    >
                        <span>➕ Add Research Paper</span>
                    </button>
                </div>
            </div>

            {/* Research Papers Cards / List */}
            {loading ? (
                <div className="bg-[#101622] border border-slate-800 p-8 rounded-2xl text-center text-xs text-slate-400">
                    Loading your research publications...
                </div>
            ) : filteredPapers.length === 0 ? (
                <div className="bg-[#101622] border border-slate-800 p-12 rounded-2xl text-center space-y-3 shadow-md">
                    <span className="text-4xl block">📝</span>
                    <h3 className="text-sm font-bold text-slate-200">No Research Papers Found</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {searchQuery || statusFilter !== "all" || indexingFilter !== "all"
                            ? "No papers matched your search criteria. Try resetting filters."
                            : "You haven't logged any self-authored research papers yet. Click 'Add Research Paper' above to register your publications."}
                    </p>
                    {(!searchQuery && statusFilter === "all" && indexingFilter === "all") && (
                        <button
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all inline-block mt-2"
                        >
                            ➕ Register First Paper
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPapers.map((p) => (
                        <div 
                            key={p._id} 
                            className="bg-[#101622] border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all shadow-md space-y-4"
                        >
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            {p.publicationType || "Journal Article"}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            {p.indexing || "Scopus"}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                            p.publicationStatus === "Published" 
                                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                : p.publicationStatus === "Accepted"
                                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                : "bg-slate-800 text-slate-400 border border-slate-700"
                                        }`}>
                                            ● {p.publicationStatus || "Published"}
                                        </span>
                                        {p.impactFactor && (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                IF: {p.impactFactor}
                                            </span>
                                        )}
                                        {p.citationCount > 0 && (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                Citations: {p.citationCount}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-100 leading-snug pt-1">
                                        {p.title}
                                    </h3>

                                    <p className="text-xs text-indigo-400 font-medium">
                                        {p.journal || p.conferenceName}
                                        {p.volume && ` • Vol. ${p.volume}`}
                                        {p.issue && ` (${p.issue})`}
                                        {p.pageNumbers && ` • pp. ${p.pageNumbers}`}
                                        {p.publisher && ` • ${p.publisher}`}
                                    </p>
                                </div>

                                {/* Actions Menu */}
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    <button
                                        onClick={() => handleOpenEdit(p)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeletePaper(p._id, p.title)}
                                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition-all"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>

                            {/* Authors & Publication Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-y border-slate-800/60 py-2.5">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Authors</span>
                                    <span className="text-slate-300 font-medium">{p.authors || p.coAuthors || currentUser.name}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Publication Date</span>
                                    <span className="text-slate-300 font-medium">
                                        {p.publicationDate || p.date || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Research Area / Domain</span>
                                    <span className="text-slate-300 font-medium">{p.researchArea || "Academic Research"}</span>
                                </div>
                            </div>

                            {/* Abstract / Description */}
                            {(p.abstract || p.description) && (
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                    {p.abstract || p.description}
                                </p>
                            )}

                            {/* Footer links: DOI, PDF attachment, Certificate */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                                <div className="flex flex-wrap items-center gap-3">
                                    {p.doi && (
                                        <a
                                            href={p.doi.startsWith("http") ? p.doi : `https://doi.org/${p.doi}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium flex items-center gap-1"
                                        >
                                            🔗 DOI: {p.doi}
                                        </a>
                                    )}
                                    {p.issnIsbn && (
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            ISSN/ISBN: {p.issnIsbn}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {p.fileBase64 && (
                                        <button
                                            onClick={() => setSelectedDocPreview({ title: p.title, file: p.fileBase64, type: "Full Paper PDF" })}
                                            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                                        >
                                            📄 View Paper PDF
                                        </button>
                                    )}

                                    {p.certificateBase64 && (
                                        <button
                                            onClick={() => setSelectedDocPreview({ title: p.title, file: p.certificateBase64, type: "Certificate / Proof" })}
                                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                                        >
                                            🏅 View Certificate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ================= MODAL: ADD / EDIT RESEARCH PAPER ================= */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl my-8">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                    {editingPaper ? "Edit Research Publication" : "Add Self Research Paper"}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Log your publications directly into your Principal profile portfolio
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSavePaper} className="space-y-4 text-xs">
                            {/* Title */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Paper Title <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter full title of research publication"
                                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            {/* Authors & Publication Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Authors / Co-Authors
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Dr. Ramesh Rao, Dr. S. K. Kulkarni"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.authors}
                                        onChange={(e) => setForm({ ...form, authors: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Publication Type
                                    </label>
                                    <select
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.publicationType}
                                        onChange={(e) => setForm({ ...form, publicationType: e.target.value })}
                                    >
                                        <option value="Journal Article">Journal Article</option>
                                        <option value="Conference Proceeding">Conference Proceeding</option>
                                        <option value="Book Chapter">Book Chapter</option>
                                        <option value="Patent / Invention">Patent / Invention</option>
                                        <option value="Technical Monograph">Technical Monograph</option>
                                    </select>
                                </div>
                            </div>

                            {/* Journal / Conference Name & Publisher */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Journal / Conference Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. IEEE Transactions on Cloud Computing"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.journal}
                                        onChange={(e) => setForm({ ...form, journal: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Publisher
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. IEEE, Springer, Elsevier, Nature"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.publisher}
                                        onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Date, Status & Indexing */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Publication Date
                                    </label>
                                    <input
                                        type="date"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.publicationDate}
                                        onChange={(e) => setForm({ ...form, publicationDate: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Publication Status
                                    </label>
                                    <select
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.publicationStatus}
                                        onChange={(e) => setForm({ ...form, publicationStatus: e.target.value })}
                                    >
                                        <option value="Published">Published</option>
                                        <option value="Accepted">Accepted (In Press)</option>
                                        <option value="Under Review">Under Review</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Indexing
                                    </label>
                                    <select
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.indexing}
                                        onChange={(e) => setForm({ ...form, indexing: e.target.value })}
                                    >
                                        <option value="Scopus">Scopus</option>
                                        <option value="SCI / SCIE">SCI / SCIE</option>
                                        <option value="Web of Science">Web of Science</option>
                                        <option value="UGC CARE">UGC CARE Group I/II</option>
                                        <option value="Peer-Reviewed">Peer-Reviewed International</option>
                                        <option value="Other">Other Indexing</option>
                                    </select>
                                </div>
                            </div>

                            {/* Volume, Issue, Pages, ISSN/ISBN */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Volume</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 14"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.volume}
                                        onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Issue</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 3"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.issue}
                                        onChange={(e) => setForm({ ...form, issue: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Pages</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 120-135"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.pageNumbers}
                                        onChange={(e) => setForm({ ...form, pageNumbers: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">ISSN / ISBN</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2168-7161"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.issnIsbn}
                                        onChange={(e) => setForm({ ...form, issnIsbn: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* DOI, Impact Factor, Citations, Research Area */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="flex flex-col gap-1.5 sm:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">DOI (Digital Object Identifier)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 10.1109/TCC.2026.1234567"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.doi}
                                        onChange={(e) => setForm({ ...form, doi: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Impact Factor</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 5.12"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.impactFactor}
                                        onChange={(e) => setForm({ ...form, impactFactor: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Citations Count</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.citationCount}
                                        onChange={(e) => setForm({ ...form, citationCount: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Research Area */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Research Area / Discipline</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Artificial Intelligence, Cloud Infrastructure, Machine Learning"
                                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                    value={form.researchArea}
                                    onChange={(e) => setForm({ ...form, researchArea: e.target.value })}
                                />
                            </div>

                            {/* Abstract */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Abstract / Summary</label>
                                <textarea
                                    rows={3}
                                    placeholder="Provide brief abstract, findings, and technical contributions..."
                                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                                    value={form.abstract}
                                    onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                                />
                            </div>

                            {/* File Uploads: PDF and Certificate */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-indigo-400 uppercase flex items-center justify-between">
                                        <span>Supporting Document (PDF)</span>
                                        {form.fileBase64 && <span className="text-emerald-400 text-[9px]">✓ File attached</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={(e) => handleFileUpload(e, "fileBase64")}
                                        className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-[9px] text-slate-500">Upload paper preprint or full paper document</span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-between">
                                        <span>Certificate / Proof Upload (Optional)</span>
                                        {form.certificateBase64 && <span className="text-emerald-400 text-[9px]">✓ File attached</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => handleFileUpload(e, "certificateBase64")}
                                        className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                                    />
                                    <span className="text-[9px] text-slate-500">Upload acceptance letter or publication certificate</span>
                                </div>
                            </div>

                            {/* Submit buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg hover:shadow-indigo-500/20 transition-all"
                                >
                                    {loading ? "Saving..." : editingPaper ? "Update Publication" : "Save to Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: DOCUMENT / CERTIFICATE PREVIEW ================= */}
            <DocumentViewerModal
                isOpen={!!selectedDocPreview}
                onClose={() => setSelectedDocPreview(null)}
                document={selectedDocPreview ? {
                    file: selectedDocPreview.file,
                    title: selectedDocPreview.title,
                    subtitle: selectedDocPreview.type,
                    category: "Research Paper",
                    fileName: `${(selectedDocPreview.title || "Paper").replace(/\s+/g, "_")}.pdf`
                } : null}
            />

        </div>
    );
}

export default PrincipalResearchPapers;
