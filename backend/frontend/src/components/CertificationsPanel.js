import React, { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import DocumentViewerModal from "./DocumentViewerModal";
import { openFileInNewTab, downloadAttachment, getAttachmentInfo } from "../utils/attachmentUtils";

const CERTIFICATE_TYPES = [
    "Training", "Workshop", "FDP", "STTP", "Certification Course",
    "NPTEL", "Coursera", "Udemy", "Internship", "Seminar",
    "Conference", "Webinar", "Industrial Training", "Value Added Course",
    "Skill Development Program", "Other"
];

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
    `${CURRENT_YEAR - 2}-${CURRENT_YEAR - 1}`,
    `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
    `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
    `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`
];

function CertificationsPanel({ currentUser }) {
    const [certifications, setCertifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    
    // Filters, Search & Sorting
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterAcademicYear, setFilterAcademicYear] = useState("");
    const [sortBy, setSortBy] = useState("desc"); // desc = newest first, asc = oldest first
    const [page, setPage] = useState(1);
    const limit = 6;

    // Form Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingCert, setEditingCert] = useState(null);
    const [form, setForm] = useState({
        title: "",
        issuedBy: "",
        type: "Certification Course",
        academicYear: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
        issueDate: "",
        expiryDate: "",
        description: "",
        skills: "",
        certificateNumber: "",
        credentialId: "",
        verificationUrl: "",
        file: "" // base64 string
    });

    // Preview modal state
    const [previewCert, setPreviewCert] = useState(null);

    const loadCertifications = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const data = await api.get("/certifications");
            setCertifications(data.certifications || []);
        } catch (err) {
            console.error("Failed to load certifications:", err);
            setErrorMsg(err.response?.data?.error || "Failed to load certifications ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCertifications();
    }, []);

    // File handler converting to base64 string
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setErrorMsg("Certificate file size limit is 10MB ❌");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, file: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    // Save Action (Create / Update)
    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title || !form.issuedBy || !form.type || !form.issueDate) {
            setErrorMsg("Please fill all required fields (*) ❌");
            return;
        }

        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            if (editingCert) {
                await api.put(`/certifications/${editingCert._id}`, form);
                setSuccessMsg("Certification updated successfully! ✅");
            } else {
                await api.post("/certifications", form);
                setSuccessMsg("Certification added successfully! ✅");
            }
            setShowModal(false);
            setEditingCert(null);
            resetForm();
            loadCertifications();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || err.message || "Failed to save certificate information ❌");
        } finally {
            setSaving(false);
        }
    };

    // Reset Form
    const resetForm = () => {
        setForm({
            title: "",
            issuedBy: "",
            type: "Certification Course",
            academicYear: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
            issueDate: "",
            expiryDate: "",
            description: "",
            skills: "",
            certificateNumber: "",
            credentialId: "",
            verificationUrl: "",
            file: ""
        });
    };

    // Edit Trigger
    const handleEdit = (cert) => {
        setEditingCert(cert);
        setForm({
            title: cert.title || "",
            issuedBy: cert.issuedBy || "",
            type: cert.type || cert.certificateType || "Certification Course",
            academicYear: cert.academicYear || `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
            issueDate: cert.issueDate ? cert.issueDate.split("T")[0] : "",
            expiryDate: cert.expiryDate ? cert.expiryDate.split("T")[0] : "",
            description: cert.description || "",
            skills: cert.skills || "",
            certificateNumber: cert.certificateNumber || "",
            credentialId: cert.credentialId || "",
            verificationUrl: cert.verificationUrl || "",
            file: cert.file || cert.certificateFile || ""
        });
        setShowModal(true);
    };

    // Delete Action with confirmation
    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete certificate "${title}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/certifications/${id}`);
            setSuccessMsg("Certification record deleted! ✅");
            loadCertifications();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || err.message || "Failed to delete certificate ❌");
        }
    };

    // Trigger file download
    const handleDownload = (cert) => {
        const fileContent = cert.file || cert.certificateFile || cert.certificate || cert.certificateBase64 || cert.documentPath;
        if (!fileContent) {
            setErrorMsg("No certificate file uploaded to download.");
            return;
        }
        const info = getAttachmentInfo(fileContent);
        downloadAttachment(fileContent, `${(cert.title || "Certificate").replace(/\s+/g, "_")}.${info.extension}`);
    };

    // Filters logic
    const filteredCerts = useMemo(() => {
        return certifications.filter(c => {
            const query = search.toLowerCase();
            const matchesSearch = 
                (c.title || "").toLowerCase().includes(query) || 
                (c.issuedBy || "").toLowerCase().includes(query) ||
                (c.skills || "").toLowerCase().includes(query) ||
                (c.description || "").toLowerCase().includes(query);

            const certType = c.type || c.certificateType || "";
            const matchesType = filterType ? certType === filterType : true;
            const matchesYear = filterAcademicYear ? (c.academicYear === filterAcademicYear) : true;

            return matchesSearch && matchesType && matchesYear;
        });
    }, [certifications, search, filterType, filterAcademicYear]);

    // Sort logic
    const sortedCerts = useMemo(() => {
        return [...filteredCerts].sort((a, b) => {
            const dateA = new Date(a.issueDate || 0);
            const dateB = new Date(b.issueDate || 0);
            return sortBy === "desc" ? dateB - dateA : dateA - dateB;
        });
    }, [filteredCerts, sortBy]);

    // Pagination
    const totalPages = Math.ceil(sortedCerts.length / limit) || 1;
    const paginatedCerts = sortedCerts.slice((page - 1) * limit, page * limit);

    return (
        <div className="space-y-6 text-slate-100 pb-12 animate-fade-in text-xs">
            {/* Header section */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📜</span> Faculty Certifications Portfolio
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Log training completions, FDPs, STTPs, NPTEL/Coursera certifications, and professional credentials with verification links.
                    </p>
                </div>

                <button
                    onClick={() => { resetForm(); setEditingCert(null); setShowModal(true); }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer text-xs"
                >
                    <span>➕</span>
                    <span>Add Certificate</span>
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
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by title, issuer, skills..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>

                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                >
                    <option value="">All Types (Filter)</option>
                    {CERTIFICATE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={filterAcademicYear}
                    onChange={(e) => { setFilterAcademicYear(e.target.value); setPage(1); }}
                >
                    <option value="">All Academic Years</option>
                    {ACADEMIC_YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
            </div>

            {/* Certifications Roster Grid */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Loading certifications portfolio...
                </div>
            ) : paginatedCerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-2xl mb-2">📜</p>
                    <p className="font-semibold text-slate-300">No certifications found matching your filters.</p>
                    <p className="text-slate-500 mt-1">Click "Add Certificate" to register your professional credentials.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedCerts.map(cert => {
                        const isExpired = cert.status === "Expired" || (cert.expiryDate && new Date(cert.expiryDate) < new Date());
                        const certFile = cert.file || cert.certificateFile || cert.certificate || cert.certificateBase64 || cert.documentPath;
                        const certType = cert.type || cert.certificateType || "Certification";

                        return (
                            <div 
                                key={cert._id}
                                className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/40 transition relative group shadow-xl"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold">
                                            {certType}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                                            isExpired 
                                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        }`}>
                                            {isExpired ? "Expired" : "Active / Verified"}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-white line-clamp-1">{cert.title}</h3>
                                        <p className="text-xs text-slate-400 font-semibold mt-0.5">{cert.issuedBy}</p>
                                    </div>

                                    {cert.description && (
                                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{cert.description}</p>
                                    )}

                                    {/* Skills Tags */}
                                    {cert.skills && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {cert.skills.split(",").map((s, idx) => (
                                                <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-indigo-300 rounded text-[10px] font-medium">
                                                    {s.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-1 text-[11px] border-t border-slate-800 pt-2 text-slate-400 font-mono">
                                        <p>Issue Date: {cert.issueDate ? cert.issueDate.split("T")[0] : "-"}</p>
                                        {cert.expiryDate && <p>Expiry Date: {cert.expiryDate.split("T")[0]}</p>}
                                        {cert.academicYear && <p>Academic Year: {cert.academicYear}</p>}
                                        {cert.credentialId && <p>Credential ID: {cert.credentialId}</p>}
                                    </div>

                                    {/* Verification URL Link */}
                                    {cert.verificationUrl && (
                                        <div className="pt-1">
                                            <a
                                                href={cert.verificationUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold underline underline-offset-2"
                                            >
                                                <span>🔗</span>
                                                <span className="truncate">Verify Credential</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800/80 text-[11px] font-bold">
                                    {certFile && (
                                        <button
                                            onClick={() => setPreviewCert(cert)}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                                        >
                                            👁️ Preview
                                        </button>
                                    )}
                                    {certFile && (
                                        <button
                                            onClick={() => openFileInNewTab(certFile, `${cert.title} - Certificate`)}
                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
                                            title="Open in new window"
                                        >
                                            ↗
                                        </button>
                                    )}
                                    {certFile && (
                                        <button
                                            onClick={() => handleDownload(cert)}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg border border-slate-700 transition cursor-pointer"
                                        >
                                            📥 Download
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(cert)}
                                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30 transition ml-auto cursor-pointer"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cert._id, cert.title)}
                                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition cursor-pointer"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                        Prev
                    </button>
                    <span className="text-xs text-slate-400 font-bold">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Add / Edit Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>{editingCert ? "✏️" : "➕"}</span>
                                <span>{editingCert ? "Modify Certification Record" : "Add Faculty Certification"}</span>
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-white text-base px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-200 text-xs">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Certificate Title *</label>
                                <input
                                    type="text"
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    placeholder="e.g. AWS Certified Solutions Architect / NPTEL Cloud Computing"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Issued By / Institution *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Amazon Web Services / IIT Kharagpur"
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.issuedBy}
                                    onChange={(e) => setForm({ ...form, issuedBy: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Certificate Type *</label>
                                <select
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    required
                                >
                                    {CERTIFICATE_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Academic Year *</label>
                                <select
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.academicYear}
                                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                                    required
                                >
                                    {ACADEMIC_YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Issue Date *</label>
                                <input
                                    type="date"
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.issueDate}
                                    onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date (Optional)</label>
                                <input
                                    type="date"
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.expiryDate}
                                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Certificate / Credential ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. CERT-982314-X"
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.credentialId || form.certificateNumber}
                                    onChange={(e) => setForm({ ...form, credentialId: e.target.value, certificateNumber: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verification URL (Optional)</label>
                                <input
                                    type="url"
                                    placeholder="https://verify.organization.com/..."
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.verificationUrl}
                                    onChange={(e) => setForm({ ...form, verificationUrl: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Relevant Skills (Comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Cloud Computing, Kubernetes, React, Python"
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.skills}
                                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description &amp; Highlights</label>
                                <textarea
                                    rows={2.5}
                                    placeholder="Brief outline of syllabus covered, duration, and score/grade achieved..."
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2 border-t border-slate-800 pt-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Certificate Attachment (PDF / JPG / PNG max 10MB)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                        id="cert-file-upload"
                                        onChange={handleFileUpload}
                                    />
                                    <label
                                        htmlFor="cert-file-upload"
                                        className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-center"
                                    >
                                        Choose File
                                    </label>
                                    {form.file && (
                                        <span className="text-xs text-emerald-400 font-semibold font-mono truncate max-w-sm">
                                            ✓ Document attached!
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-slate-800">
                                <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white mr-auto">Reset Form</button>
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl">Cancel</button>
                                <button type="submit" disabled={saving} className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30">
                                    {saving ? "Saving..." : editingCert ? "Update Certificate" : "Register Certificate"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Universal Document Preview Modal */}
            <DocumentViewerModal
                isOpen={!!previewCert}
                onClose={() => setPreviewCert(null)}
                document={previewCert ? {
                    file: previewCert.file || previewCert.certificateFile || previewCert.certificate || previewCert.certificateBase64 || previewCert.documentPath || previewCert.filePath,
                    type: "Certification",
                    title: previewCert.title,
                    subtitle: `${previewCert.issuedBy || "Certificate"} • ${previewCert.type || previewCert.certificateType || "Certification"}`,
                    category: "Certification",
                    fileName: `${(previewCert.title || "Certificate").replace(/\s+/g, "_")}.pdf`
                } : null}
            />
        </div>
    );
}

export default CertificationsPanel;
