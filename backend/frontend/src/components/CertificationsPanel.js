import React, { useState, useEffect } from "react";
import { api } from "../services/api";

const CERTIFICATE_TYPES = [
    "Training", "Workshop", "FDP", "STTP", "Certification Course",
    "NPTEL", "Coursera", "Udemy", "Internship", "Seminar",
    "Conference", "Webinar", "Industrial Training", "Value Added Course",
    "Skill Development Program", "Other"
];

function CertificationsPanel({ currentUser }) {
    const [certifications, setCertifications] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters, Search & Sorting
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [sortBy, setSortBy] = useState("desc"); // desc = newest first, asc = oldest first
    const [page, setPage] = useState(1);
    const limit = 6;

    // Form Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingCert, setEditingCert] = useState(null);
    const [form, setForm] = useState({
        title: "",
        issuedBy: "",
        type: "Training",
        issueDate: "",
        expiryDate: "",
        description: "",
        certificateNumber: "",
        credentialId: "",
        verificationUrl: "",
        file: "" // base64 string
    });

    // Preview modal state
    const [previewCert, setPreviewCert] = useState(null);

    const loadCertifications = async () => {
        setLoading(true);
        try {
            const data = await api.get("/certifications");
            setCertifications(data.certifications || []);
        } catch (err) {
            console.error("Failed to load certifications:", err);
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

        if (file.size > 5 * 1024 * 1024) {
            alert("Certificate file size limit is 5MB ❌");
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
            alert("Please fill all required fields (*) ❌");
            return;
        }

        try {
            if (editingCert) {
                await api.put(`/certifications/${editingCert._id}`, form);
                alert("Certification updated successfully! ✅");
            } else {
                await api.post("/certifications", form);
                alert("Certification added successfully! ✅");
            }
            setShowModal(false);
            setEditingCert(null);
            resetForm();
            loadCertifications();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save certificate information.");
        }
    };

    // Reset Form
    const resetForm = () => {
        setForm({
            title: "",
            issuedBy: "",
            type: "Training",
            issueDate: "",
            expiryDate: "",
            description: "",
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
            type: cert.type || "Training",
            issueDate: cert.issueDate ? cert.issueDate.split("T")[0] : "",
            expiryDate: cert.expiryDate ? cert.expiryDate.split("T")[0] : "",
            description: cert.description || "",
            certificateNumber: cert.certificateNumber || "",
            credentialId: cert.credentialId || "",
            verificationUrl: cert.verificationUrl || "",
            file: cert.file || ""
        });
        setShowModal(true);
    };

    // Delete Action
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this certification record? 🗑️")) return;
        try {
            await api.delete(`/certifications/${id}`);
            alert("Certification record deleted. ✅");
            loadCertifications();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to delete certificate.");
        }
    };

    // Trigger base64 download
    const handleDownload = (cert) => {
        if (!cert.file) {
            alert("No certificate attachment file uploaded to download.");
            return;
        }
        // Extract extension from mime
        let extension = "png";
        if (cert.file.includes("pdf")) extension = "pdf";
        else if (cert.file.includes("jpeg") || cert.file.includes("jpg")) extension = "jpg";

        const link = document.createElement("a");
        link.href = cert.file;
        link.download = `${cert.title.replace(/\s+/g, "_")}_Certificate.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filters logic
    const filteredCerts = certifications.filter(c => {
        const query = search.toLowerCase();
        const matchesSearch = c.title.toLowerCase().includes(query) || c.issuedBy.toLowerCase().includes(query);
        const matchesType = filterType ? c.type === filterType : true;
        return matchesSearch && matchesType;
    });

    // Sort logic
    const sortedCerts = [...filteredCerts].sort((a, b) => {
        const dateA = new Date(a.issueDate);
        const dateB = new Date(b.issueDate);
        return sortBy === "desc" ? dateB - dateA : dateA - dateB;
    });

    // Pagination
    const totalPages = Math.ceil(sortedCerts.length / limit);
    const paginatedCerts = sortedCerts.slice((page - 1) * limit, page * limit);

    return (
        <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl text-xs text-slate-205">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-850 pb-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-105 uppercase tracking-wider">Faculty Certifications Portfolio</h2>
                    <p className="text-[10px] text-slate-400 mt-1">Log training completions, FDPs, STTPs, industrial courses, and accreditation credits</p>
                </div>

                <button
                    onClick={() => { resetForm(); setEditingCert(null); setShowModal(true); }}
                    className="px-4.5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md"
                >
                    ＋ Add New Certificate
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row items-center gap-3.5 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                <input
                    type="text"
                    placeholder="Search by certificate title or issuer..."
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />

                <select
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-300 focus:outline-none w-48"
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                >
                    <option value="">All Types (Filter)</option>
                    {CERTIFICATE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-300 focus:outline-none w-36"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
            </div>

            {/* Certifications Roster Grid */}
            {loading ? (
                <p className="text-center italic text-slate-500 py-10">Fetching certification portfolio...</p>
            ) : paginatedCerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic bg-slate-950/10 border border-slate-850 rounded-2xl">
                    No certifications found matching your filters.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedCerts.map(cert => {
                        const isExpired = cert.status === "Expired";
                        return (
                            <div 
                                key={cert._id}
                                className="bg-slate-950/25 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/25 transition-all relative group hover:-translate-y-0.5 shadow"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] uppercase tracking-wider font-semibold">
                                            {cert.type}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isExpired ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                            {cert.status}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-slate-100 line-clamp-1">{cert.title}</h3>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{cert.issuedBy}</p>
                                    </div>

                                    {cert.description && (
                                        <p className="text-[10px] text-slate-450 line-clamp-2 leading-relaxed">{cert.description}</p>
                                    )}

                                    <div className="space-y-1 text-[9px] border-t border-slate-900/60 pt-2 text-slate-500 font-mono">
                                        <p>Issue Date: {cert.issueDate ? cert.issueDate.split("T")[0] : "-"}</p>
                                        {cert.expiryDate && <p>Expiry Date: {cert.expiryDate.split("T")[0]}</p>}
                                        {cert.credentialId && <p>Credential ID: {cert.credentialId}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-900/60 text-[10px] font-bold">
                                    {cert.file && (
                                        <button
                                            onClick={() => setPreviewCert(cert)}
                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all"
                                        >
                                            👁️ Preview
                                        </button>
                                    )}
                                    {cert.file && (
                                        <button
                                            onClick={() => handleDownload(cert)}
                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-indigo-400 rounded-lg border border-slate-800 transition-all"
                                        >
                                            📥 Download
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(cert)}
                                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-350 rounded-lg border border-slate-800 transition-all ml-auto"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cert._id)}
                                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
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
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded disabled:opacity-40"
                    >
                        Prev
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Add / Edit Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-[#101622] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                        <div>
                            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">{editingCert ? "Modify Certification Record" : "Add Faculty Certification"}</h3>
                            <p className="text-[10px] text-slate-450 mt-0.5">Fill out credential information and attach certificates</p>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-200">
                            
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-450 uppercase">Certificate Title *</label>
                                <input
                                    type="text"
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Issued By / Institution *</label>
                                <input
                                    type="text"
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2"
                                    value={form.issuedBy}
                                    onChange={(e) => setForm({ ...form, issuedBy: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Certificate Type *</label>
                                <select
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-205 focus:outline-none"
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
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Issue Date *</label>
                                <input
                                    type="date"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2 text-slate-250 focus:outline-none"
                                    value={form.issueDate}
                                    onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase font-semibold">Expiry Date (Optional)</label>
                                <input
                                    type="date"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2 text-slate-250"
                                    value={form.expiryDate}
                                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Certificate Number (Optional)</label>
                                <input
                                    type="text"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2"
                                    value={form.certificateNumber}
                                    onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Credential ID (Optional)</label>
                                <input
                                    type="text"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2"
                                    value={form.credentialId}
                                    onChange={(e) => setForm({ ...form, credentialId: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Verification Link (Optional)</label>
                                <input
                                    type="url"
                                    placeholder="https://verify.udemy.com/..."
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200"
                                    value={form.verificationUrl}
                                    onChange={(e) => setForm({ ...form, verificationUrl: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Short Description</label>
                                <textarea
                                    rows={2.5}
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 text-xs"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2 border-t border-slate-850 pt-3">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Attach Certificate File (PDF / JPG / PNG)</label>
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
                                        className="cursor-pointer bg-slate-900 border border-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-center"
                                    >
                                        Choose File
                                    </label>
                                    {form.file && (
                                        <span className="text-[10px] text-indigo-400 font-semibold font-mono truncate max-w-sm">Certificate file loaded!</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-slate-850">
                                <button type="button" onClick={resetForm} className="text-slate-450 hover:text-slate-350 mr-auto">Reset Form</button>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-250">Cancel</button>
                                <button type="submit" className="px-5 py-2 font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl">
                                    {editingCert ? "Update Certificate" : "Register Certificate"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {previewCert && (
                <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl w-full max-w-3xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                            <div>
                                <h3 className="text-xs font-bold text-slate-100 uppercase">{previewCert.title}</h3>
                                <p className="text-[9px] text-slate-500 uppercase font-mono">{previewCert.issuedBy} &bull; {previewCert.type}</p>
                            </div>
                            <button
                                onClick={() => setPreviewCert(null)}
                                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
                            >
                                &times; Close
                            </button>
                        </div>

                        <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden p-2 flex items-center justify-center min-h-[400px] max-h-[70vh]">
                            {previewCert.file.includes("pdf") ? (
                                <iframe
                                    src={previewCert.file}
                                    title="Certificate Preview PDF"
                                    className="w-full h-[500px] border-0"
                                />
                            ) : (
                                <img
                                    src={previewCert.file}
                                    alt="Certificate Preview"
                                    className="max-w-full max-h-[500px] object-contain rounded"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default CertificationsPanel;
