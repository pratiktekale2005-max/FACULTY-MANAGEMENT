import React, { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";

const SUBMISSION_TYPES = [
    "Lesson Plan",
    "Course File",
    "Lab Manual",
    "Syllabus Completion Report",
    "Continuous Assessment / Green Book",
    "Research Proposal",
    "Conference Deputation",
    "Workshop / FDP Report",
    "Administrative Duty Report",
    "Committee Report",
    "Annual Self-Appraisal (PBAS/APAR)",
    "Other Academic Submission"
];

const STATUS_CONFIG = {
    Draft: { label: "Draft", bg: "bg-slate-800 text-slate-300 border-slate-700", icon: "📝" },
    Submitted: { label: "Submitted", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: "📤" },
    "Under Review": { label: "Under Review", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: "⏳" },
    Approved: { label: "Approved", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: "✅" },
    Rejected: { label: "Rejected", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: "❌" }
};

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
    `${CURRENT_YEAR - 2}-${CURRENT_YEAR - 1}`,
    `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
    `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
    `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`
];

function SubmissionsPanel({ currentUser }) {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedType, setSelectedType] = useState("all");
    const [selectedAcademicYear, setSelectedAcademicYear] = useState("all");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // 'create', 'edit', 'view'
    const [activeSubmission, setActiveSubmission] = useState(null);

    // Form fields
    const [formData, setFormData] = useState({
        title: "",
        type: "Course File",
        academicYear: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
        description: "",
        status: "Submitted",
        supportingDocument: null
    });
    const [filePreviewName, setFilePreviewName] = useState("");

    const fetchSubmissions = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const queryParams = new URLSearchParams();
            if (selectedStatus !== "all") queryParams.append("status", selectedStatus);
            if (selectedType !== "all") queryParams.append("type", selectedType);
            if (selectedAcademicYear !== "all") queryParams.append("academicYear", selectedAcademicYear);
            if (searchTerm.trim()) queryParams.append("search", searchTerm.trim());

            const url = `/submissions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
            const res = await api.get(url);
            setSubmissions(res.submissions || []);
        } catch (err) {
            console.error("Failed to load submissions:", err);
            setErrorMsg(err.response?.data?.error || "Failed to load submissions ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStatus, selectedType, selectedAcademicYear]);

    // Handle Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSubmissions();
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const handleOpenCreate = () => {
        setModalMode("create");
        setActiveSubmission(null);
        setFormData({
            title: "",
            type: "Course File",
            academicYear: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
            description: "",
            status: "Submitted",
            supportingDocument: null
        });
        setFilePreviewName("");
        setShowModal(true);
    };

    const handleOpenEdit = (sub) => {
        setModalMode("edit");
        setActiveSubmission(sub);
        setFormData({
            title: sub.title || "",
            type: sub.type || "Course File",
            academicYear: sub.academicYear || `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
            description: sub.description || "",
            status: sub.status === "Rejected" ? "Submitted" : sub.status,
            supportingDocument: sub.supportingDocument || null
        });
        setFilePreviewName(sub.supportingDocument?.fileName || "");
        setShowModal(true);
    };

    const handleOpenView = (sub) => {
        setModalMode("view");
        setActiveSubmission(sub);
        setShowModal(true);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            setErrorMsg("File size exceeds 15MB limit ❌");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setFormData(prev => ({
                ...prev,
                supportingDocument: {
                    fileName: file.name,
                    fileType: file.type || "application/octet-stream",
                    fileBase64: reader.result
                }
            }));
            setFilePreviewName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e, directSubmitStatus = null) => {
        if (e) e.preventDefault();

        if (!formData.title.trim()) {
            setErrorMsg("Please enter a submission title ❌");
            return;
        }

        const finalStatus = directSubmitStatus || formData.status || "Submitted";

        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const payload = {
                ...formData,
                status: finalStatus
            };

            if (modalMode === "create") {
                await api.post("/submissions", payload);
                setSuccessMsg(`Submission "${formData.title}" created successfully! ✅`);
            } else if (modalMode === "edit" && activeSubmission) {
                await api.put(`/submissions/${activeSubmission._id}`, payload);
                setSuccessMsg(`Submission updated successfully! ✅`);
            }

            setShowModal(false);
            fetchSubmissions();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error("Submission save error:", err);
            setErrorMsg(err.response?.data?.error || "Failed to save submission ❌");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete submission "${title}"? This cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/submissions/${id}`);
            setSuccessMsg("Submission deleted successfully! ✅");
            fetchSubmissions();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error("Delete error:", err);
            setErrorMsg(err.response?.data?.error || "Failed to delete submission ❌");
        }
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        const total = submissions.length;
        const drafts = submissions.filter(s => s.status === "Draft").length;
        const submitted = submissions.filter(s => s.status === "Submitted" || s.status === "Under Review").length;
        const approved = submissions.filter(s => s.status === "Approved").length;
        const rejected = submissions.filter(s => s.status === "Rejected").length;
        return { total, drafts, submitted, approved, rejected };
    }, [submissions]);

    return (
        <div className="space-y-6 text-slate-100 pb-12 animate-fade-in">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📤</span> My Submissions
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Track academic files, course files, syllabus completion, and departmental compliance reports submitted for review.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                        <span>➕</span>
                        <span>New Submission</span>
                    </button>
                </div>
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

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Filed</p>
                    <p className="text-2xl font-bold text-white mt-1">{metrics.total}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drafts</p>
                    <p className="text-2xl font-bold text-slate-300 mt-1">{metrics.drafts}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">In Review</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{metrics.submitted}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Approved</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics.approved}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Returned / Rejected</p>
                    <p className="text-2xl font-bold text-rose-400 mt-1">{metrics.rejected}</p>
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search submissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    {/* Type Filter */}
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="all">All Types</option>
                        {SUBMISSION_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    {/* Academic Year Filter */}
                    <select
                        value={selectedAcademicYear}
                        onChange={(e) => setSelectedAcademicYear(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="all">All Academic Years</option>
                        {ACADEMIC_YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Submissions Roster */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Loading your submissions...
                </div>
            ) : submissions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-2xl mb-2">📭</p>
                    <p className="font-semibold text-slate-300">No submissions found.</p>
                    <p className="text-slate-500 mt-1">Click "New Submission" to upload academic or administrative compliance records.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-4">Title &amp; Type</th>
                                <th className="py-3 px-3">Academic Year</th>
                                <th className="py-3 px-3">Submission Date</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-3">Reviewer Remarks</th>
                                <th className="py-3 px-3">Document</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {submissions.map((sub) => {
                                const stConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.Draft;
                                const isEditable = sub.status === "Draft" || sub.status === "Rejected";

                                return (
                                    <tr key={sub._id} className="hover:bg-slate-850/40 transition">
                                        {/* Title & Type */}
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-200">{sub.title}</div>
                                            <div className="text-[11px] text-indigo-400 font-medium mt-0.5">{sub.type}</div>
                                        </td>

                                        {/* Academic Year */}
                                        <td className="py-3 px-3 font-mono text-slate-300">
                                            {sub.academicYear || "—"}
                                        </td>

                                        {/* Submission Date */}
                                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                                            {sub.submissionDate ? new Date(sub.submissionDate).toLocaleDateString() : "—"}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${stConfig.bg}`}>
                                                <span>{stConfig.icon}</span>
                                                <span>{stConfig.label}</span>
                                            </span>
                                        </td>

                                        {/* Reviewer Remarks */}
                                        <td className="py-3 px-3 max-w-[200px]">
                                            {sub.reviewerRemarks ? (
                                                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                                                    <span className="font-bold text-indigo-400 block text-[10px]">
                                                        {sub.reviewerName ? `By ${sub.reviewerName}` : "Reviewer"}:
                                                    </span>
                                                    <span className="line-clamp-2">{sub.reviewerRemarks}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 italic text-[11px]">No remarks yet</span>
                                            )}
                                        </td>

                                        {/* Document */}
                                        <td className="py-3 px-3">
                                            {sub.supportingDocument?.fileBase64 || sub.supportingDocument?.url ? (
                                                <a
                                                    href={sub.supportingDocument.fileBase64 || sub.supportingDocument.url}
                                                    download={sub.supportingDocument.fileName || "submission-document"}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] border border-slate-700 transition"
                                                >
                                                    <span>📎</span>
                                                    <span className="truncate max-w-[100px]">{sub.supportingDocument.fileName || "View Doc"}</span>
                                                </a>
                                            ) : (
                                                <span className="text-slate-600 text-[11px]">—</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                {/* View */}
                                                <button
                                                    onClick={() => handleOpenView(sub)}
                                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition cursor-pointer"
                                                >
                                                    View
                                                </button>

                                                {/* Edit if Draft or Rejected */}
                                                {isEditable && (
                                                    <button
                                                        onClick={() => handleOpenEdit(sub)}
                                                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition cursor-pointer"
                                                    >
                                                        {sub.status === "Rejected" ? "Resubmit" : "Edit"}
                                                    </button>
                                                )}

                                                {/* Delete if Draft or Rejected */}
                                                {isEditable && (
                                                    <button
                                                        onClick={() => handleDelete(sub._id, sub.title)}
                                                        className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] transition cursor-pointer"
                                                        title="Delete submission"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit / View Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>{modalMode === "view" ? "👁️" : modalMode === "edit" ? "✏️" : "➕"}</span>
                                <span>
                                    {modalMode === "view"
                                        ? "Submission Details"
                                        : modalMode === "edit"
                                            ? activeSubmission?.status === "Rejected"
                                                ? "Revise & Resubmit"
                                                : "Edit Submission"
                                            : "New Academic Submission"}
                                </span>
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-white text-base px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>

                        {modalMode === "view" && activeSubmission ? (
                            <div className="space-y-4 text-xs">
                                <div>
                                    <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Title</span>
                                    <p className="text-base font-bold text-white mt-0.5">{activeSubmission.title}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Type</span>
                                        <p className="text-indigo-400 font-semibold mt-0.5">{activeSubmission.type}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Academic Year</span>
                                        <p className="text-slate-200 font-mono mt-0.5">{activeSubmission.academicYear || "—"}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Submission Date</span>
                                        <p className="text-slate-200 font-mono mt-0.5">
                                            {activeSubmission.submissionDate ? new Date(activeSubmission.submissionDate).toLocaleString() : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Current Status</span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border mt-0.5 ${STATUS_CONFIG[activeSubmission.status]?.bg}`}>
                                            <span>{STATUS_CONFIG[activeSubmission.status]?.icon}</span>
                                            <span>{activeSubmission.status}</span>
                                        </span>
                                    </div>
                                </div>

                                {activeSubmission.description && (
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Description &amp; Notes</span>
                                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 mt-1 whitespace-pre-wrap">
                                            {activeSubmission.description}
                                        </div>
                                    </div>
                                )}

                                {activeSubmission.reviewerRemarks && (
                                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                                        <span className="text-amber-400 font-bold text-[11px] block">
                                            Reviewer Remarks {activeSubmission.reviewerName && `(By ${activeSubmission.reviewerName})`}:
                                        </span>
                                        <p className="text-amber-200 mt-1">{activeSubmission.reviewerRemarks}</p>
                                    </div>
                                )}

                                {activeSubmission.supportingDocument?.fileBase64 && (
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px] mb-1">Attached Document</span>
                                        <a
                                            href={activeSubmission.supportingDocument.fileBase64}
                                            download={activeSubmission.supportingDocument.fileName || "submission-doc"}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl inline-flex items-center gap-2 font-semibold transition"
                                        >
                                            <span>📥</span>
                                            <span>Download {activeSubmission.supportingDocument.fileName}</span>
                                        </a>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-slate-800 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Submission Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Course File - Data Structures & Algorithms Div A"
                                        value={formData.title}
                                        onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Submission Type *
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        >
                                            {SUBMISSION_TYPES.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Academic Year *
                                        </label>
                                        <select
                                            value={formData.academicYear}
                                            onChange={(e) => setFormData(p => ({ ...p, academicYear: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                        >
                                            {ACADEMIC_YEARS.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Description / Summary Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Brief notes detailing what is enclosed in this submission..."
                                        value={formData.description}
                                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Upload Supporting Document (PDF / DOC / Image max 15MB)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer flex items-center gap-2">
                                            <span>📎</span>
                                            <span>Choose File</span>
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="text-slate-400 text-[11px] truncate max-w-xs">
                                            {filePreviewName || "No file selected"}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                                    >
                                        Cancel
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={(e) => handleSubmit(e, "Draft")}
                                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-semibold transition cursor-pointer"
                                        >
                                            Save as Draft
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                    <span>Submitting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>📤</span>
                                                    <span>{activeSubmission?.status === "Rejected" ? "Resubmit for Review" : "Submit for Review"}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SubmissionsPanel;
