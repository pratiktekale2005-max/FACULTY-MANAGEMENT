import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { api } from "../services/api";
import WorkshopLetterModal from "./WorkshopLetterModal";

function WorkshopsPanel({ currentUser, refreshTrigger, onRefresh, onSelectFaculty }) {
    const [workshops, setWorkshops] = useState([]);
    const [activeTab, setActiveTab] = useState("events"); // "events" | "remuneration"
    const [loading, setLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Letter modal state
    const [letterModalConfig, setLetterModalConfig] = useState({
        isOpen: false,
        workshop: null,
        initialType: "invitation",
        initialStep: "generate"
    });

    // Workshop Report Modal state (Section 1: Invitation -> Section 2: Gallery -> Section 3: Thanking)
    const [reportModalWorkshop, setReportModalWorkshop] = useState(null);
    const [reportLetterPdfs, setReportLetterPdfs] = useState({ invitation: null, thanking: null });
    const [loadingReportPdf, setLoadingReportPdf] = useState(false);
    const [downloadingSummaryReport, setDownloadingSummaryReport] = useState(false);

    // View All Details Modal state
    const [detailsModalWorkshop, setDetailsModalWorkshop] = useState(null);

    // Edit Modal state (fixes unnecessary scrolling bug)
    const [editModalWorkshop, setEditModalWorkshop] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Assessment & Post-Assessment Ranking state
    const [activeFeedbackId, setActiveFeedbackId] = useState("");
    const [fbName, setFbName] = useState("");
    const [fbRating, setFbRating] = useState(5);
    const [fbScore, setFbScore] = useState(5);
    const [fbCriteria, setFbCriteria] = useState("Content & Delivery");
    const [fbComments, setFbComments] = useState("");
    const [submittingAssessment, setSubmittingAssessment] = useState(false);

    // Remuneration Tab state
    const [selectedRemunWorkshopId, setSelectedRemunWorkshopId] = useState("");
    const [remunForm, setRemunForm] = useState({
        guestName: "",
        accountHolderName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        branchName: "",
        panNumber: "",
        contactNumber: "",
        lectureHours: 3,
        ratePerHour: 2000,
        otherAmount: 0,
        totalRemuneration: 6000,
        totalPayable: 6000,
        notes: ""
    });
    const [savingRemun, setSavingRemun] = useState(false);
    const [generatingRemunPdf, setGeneratingRemunPdf] = useState(false);
    const [remunPdfData, setRemunPdfData] = useState(null); // { pdfBase64, filename }

    // Form fields for Add/Edit
    const [form, setForm] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        speakerName: "",
        speakerBio: "",
        speakerOrganization: "",
        speakerContact: "",
        guestDesignation: "",
        guestOrganization: "",
        guestEmail: "",
        workshopType: "Arranged by Self",
        speakerResumeBase64: "",
        photosBase64: []
    });

    const resetForm = () => {
        setForm({
            title: "",
            description: "",
            date: "",
            time: "",
            venue: "",
            speakerName: "",
            speakerBio: "",
            speakerOrganization: "",
            speakerContact: "",
            guestDesignation: "",
            guestOrganization: "",
            guestEmail: "",
            workshopType: "Arranged by Self",
            speakerResumeBase64: "",
            photosBase64: []
        });
        setEditModalWorkshop(null);
        setShowAddModal(false);
    };

    const validateForm = () => {
        const required = [
            { key: "title", label: "Event Title" },
            { key: "description", label: "Workshop / Seminar Description" },
            { key: "date", label: "Event Date" },
            { key: "time", label: "Event Time / Duration" },
            { key: "speakerName", label: "Guest Professional Name" }
        ];
        for (const field of required) {
            const val = form[field.key];
            if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
                return `${field.label} is required. ❌`;
            }
        }
        return null;
    };

    const loadWorkshops = async () => {
        try {
            setLoading(true);
            const data = await api.get("/workshops");
            const list = data.workshops || [];
            setWorkshops(list);

            // Initialize remuneration selected workshop
            if (list.length > 0 && !selectedRemunWorkshopId) {
                initRemunForWorkshop(list[0]);
            }
        } catch (err) {
            console.error("Failed to load workshops:", err);
        } finally {
            setLoading(false);
        }
    };

    const initRemunForWorkshop = (w) => {
        if (!w) return;
        setSelectedRemunWorkshopId(w._id);
        const rem = w.remuneration || {};
        const hours = rem.lectureHours !== undefined ? rem.lectureHours : 3;
        const rate = rem.ratePerHour !== undefined ? rem.ratePerHour : 2000;
        const other = rem.otherAmount !== undefined ? rem.otherAmount : 0;
        const totalRem = rem.totalRemuneration !== undefined ? rem.totalRemuneration : (hours * rate);
        const totalPay = rem.totalPayable !== undefined ? rem.totalPayable : (totalRem + other);

        setRemunForm({
            guestName: rem.guestName || w.speakerName || "",
            accountHolderName: rem.accountHolderName || rem.guestName || w.speakerName || "",
            bankName: rem.bankName || "",
            accountNumber: rem.accountNumber || "",
            ifscCode: rem.ifscCode || "",
            branchName: rem.branchName || "",
            panNumber: rem.panNumber || "",
            contactNumber: rem.contactNumber || w.speakerContact || "",
            lectureHours: hours,
            ratePerHour: rate,
            otherAmount: other,
            totalRemuneration: totalRem,
            totalPayable: totalPay,
            notes: rem.notes || ""
        });
    };

    useEffect(() => {
        loadWorkshops();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, refreshTrigger]);

    // Handle Remuneration Calculation Changes
    const handleRemunFieldChange = (field, value) => {
        setRemunForm(prev => {
            const updated = { ...prev, [field]: value };
            if (field === "lectureHours" || field === "ratePerHour" || field === "otherAmount") {
                const h = field === "lectureHours" ? Number(value) || 0 : Number(prev.lectureHours) || 0;
                const r = field === "ratePerHour" ? Number(value) || 0 : Number(prev.ratePerHour) || 0;
                const o = field === "otherAmount" ? Number(value) || 0 : Number(prev.otherAmount) || 0;
                updated.totalRemuneration = h * r;
                updated.totalPayable = (h * r) + o;
            }
            return updated;
        });
    };

    const handleSaveRemuneration = async (e) => {
        e?.preventDefault();
        if (!selectedRemunWorkshopId) {
            alert("Please select a workshop first ❌");
            return;
        }

        // Account number validation (if entered)
        if (remunForm.accountNumber && remunForm.accountNumber.trim().length < 5) {
            alert("Please enter a valid bank account number (at least 5 characters) ❌");
            return;
        }

        // IFSC code validation (if entered)
        if (remunForm.ifscCode && remunForm.ifscCode.trim().length < 4) {
            alert("Please enter a valid Bank IFSC code (e.g. SBIN0001234) ❌");
            return;
        }

        try {
            setSavingRemun(true);
            const res = await api.put(`/workshops/${selectedRemunWorkshopId}/remuneration`, remunForm);
            alert(res.message || "Remuneration & account details saved successfully! 💰✅");
            loadWorkshops();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save remuneration details ❌");
        } finally {
            setSavingRemun(false);
        }
    };

    const handleGenerateRemunerationPdf = async () => {
        if (!selectedRemunWorkshopId) {
            alert("Please select a workshop first ❌");
            return;
        }

        try {
            setGeneratingRemunPdf(true);
            const res = await api.post(`/workshops/${selectedRemunWorkshopId}/generate-remuneration-pdf`, {
                remunerationData: remunForm
            });

            if (res.pdfBase64) {
                setRemunPdfData({
                    pdfBase64: res.pdfBase64,
                    filename: res.filename || "Remuneration_Report.pdf"
                });
            } else {
                alert("Failed to retrieve generated PDF data.");
            }
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to generate remuneration PDF ❌");
        } finally {
            setGeneratingRemunPdf(false);
        }
    };

    // Open dedicated Workshop Report Modal
    const handleOpenWorkshopReport = async (w) => {
        setReportModalWorkshop(w);
        setReportLetterPdfs({ invitation: null, thanking: null });
        setLoadingReportPdf(true);

        try {
            // Generate both official PDFs in the background for instant preview/download
            const [invRes, thankRes] = await Promise.all([
                api.post(`/workshops/${w._id}/generate-letter-pdf`, {
                    letterData: { letterType: "invitation" }
                }).catch(() => null),
                api.post(`/workshops/${w._id}/generate-letter-pdf`, {
                    letterData: { letterType: "thanking" }
                }).catch(() => null)
            ]);

            setReportLetterPdfs({
                invitation: invRes?.pdfBase64 || null,
                thanking: thankRes?.pdfBase64 || null
            });
        } catch (err) {
            console.error("Report PDF loading error:", err);
        } finally {
            setLoadingReportPdf(false);
        }
    };

    // Download official complete Workshop Summary Report (PDF)
    const handleDownloadSummaryReport = async (workshopId, title) => {
        setDownloadingSummaryReport(true);
        try {
            const res = await api.post(`/workshops/${workshopId}/generate-summary-report-pdf`, {});
            if (res.pdfBase64) {
                const link = document.createElement("a");
                link.href = res.pdfBase64;
                link.download = res.filename || `Activity_Report_${(title || "Workshop").replace(/\s+/g, "_")}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error("Failed to download summary report:", err);
            alert("Failed to generate official workshop summary report PDF ❌");
        } finally {
            setDownloadingSummaryReport(false);
        }
    };

    // Submit Post Assessment
    const handleSubmitPostAssessment = async (workshopId) => {
        if (!fbComments.trim() && !fbName.trim()) {
            alert("Please provide evaluator/participant name and assessment comments ❌");
            return;
        }

        try {
            setSubmittingAssessment(true);
            await api.post(`/workshops/${workshopId}/post-assessment`, {
                participantName: fbName.trim() || "Faculty / Student Evaluator",
                score: fbScore,
                rating: fbRating,
                criteria: fbCriteria,
                comments: fbComments.trim()
            });

            alert("Post-Assessment evaluation submitted and recorded in Workshop Ranking! ⭐✅");
            setFbName("");
            setFbComments("");
            setFbScore(5);
            setFbRating(5);
            setActiveFeedbackId("");
            loadWorkshops();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to submit post assessment ❌");
        } finally {
            setSubmittingAssessment(false);
        }
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert(`File "${file.name}" is too large! Maximum allowed size is 2MB. ❌`);
            e.target.value = "";
            setForm(prev => ({ ...prev, [field]: "" }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleMultiplePhotosChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        let totalSize = 0;
        for (const file of files) {
            totalSize += file.size;
        }

        if (totalSize > 5 * 1024 * 1024) {
            alert("Combined photos size is too large! Please upload smaller images (Max total 5MB). ❌");
            e.target.value = "";
            return;
        }

        const promises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then(base64Photos => {
            setForm(prev => ({ ...prev, photosBase64: base64Photos }));
        });
    };

    // Open Edit Modal directly (Zero scrolling bug fixed)
    const handleEditClick = (w) => {
        setEditModalWorkshop(w);
        setForm({
            title: w.title || "",
            description: w.description || "",
            date: w.date ? new Date(w.date).toISOString().split("T")[0] : "",
            time: w.time || "",
            venue: w.venue || "",
            speakerName: w.speakerName || "",
            speakerBio: w.speakerBio || "",
            speakerOrganization: w.speakerOrganization || "",
            speakerContact: w.speakerContact || "",
            guestDesignation: w.guestDesignation || "",
            guestOrganization: w.guestOrganization || "",
            guestEmail: w.guestEmail || "",
            workshopType: w.workshopType || "Arranged by Self",
            speakerResumeBase64: w.speakerResumePath || "",
            photosBase64: w.photos || []
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const valError = validateForm();
        if (valError) {
            alert(valError);
            return;
        }

        setLoading(true);

        try {
            if (editModalWorkshop) {
                await api.put(`/workshops/${editModalWorkshop._id}`, form);
                alert("Workshop updated successfully! ✅");
                setEditModalWorkshop(null);
            } else {
                await api.post("/workshops", form);
                alert("Workshop registered successfully! Waiting for HOD verification. ✅");
                setShowAddModal(false);
            }
            resetForm();
            loadWorkshops();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to save workshop ❌");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveStatus = async (id, nextStatus) => {
        try {
            const res = await api.put(`/workshops/${id}/status`, {
                status: nextStatus
            });
            alert(res.message || `Workshop has been set to: ${nextStatus}! ✅`);
            loadWorkshops();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to update status.");
            console.error(err);
        }
    };

    const getDraftWorkshop = () => {
        if (workshops.length > 0) {
            return workshops[0];
        }
        return {
            _id: "draft",
            title: "Academic Expert Seminar / Workshop",
            workshopType: "Arranged by Self",
            department: currentUser?.department || currentUser?.departmentId?.name || "Department of Computer Science & Engineering",
            speakerName: "Dr. Ramesh Kumar",
            speakerBio: "Professor & Senior Research Consultant",
            speakerOrganization: "Leading Tech Institution / Enterprise",
            speakerContact: "",
            guestDesignation: "Professor & Head of Research",
            guestOrganization: "Leading Tech Institution / Enterprise",
            guestEmail: "",
            date: new Date().toISOString().split("T")[0],
            time: "10:00 AM - 01:00 PM",
            venue: "Sir M. Visvesvaraya Seminar Auditorium",
            submittedBy: {
                _id: currentUser?._id || currentUser?.id,
                name: currentUser?.name || currentUser?.fullName || "Faculty Coordinator",
                department: currentUser?.department || "Academic"
            }
        };
    };

    const openLetterModal = (workshop, type, step) => {
        const targetWorkshop = workshop || getDraftWorkshop();
        setLetterModalConfig({
            isOpen: true,
            workshop: targetWorkshop,
            initialType: type || "invitation",
            initialStep: step || "generate"
        });
    };

    const filteredWorkshops = workshops.filter(w => {
        const isSeminar = (w.workshopType && w.workshopType.toLowerCase().includes("seminar")) || (w.title && w.title.toLowerCase().includes("seminar"));
        
        let matchesCategory = true;
        if (filterCategory === "Workshops") {
            matchesCategory = !isSeminar;
        } else if (filterCategory === "Seminars") {
            matchesCategory = isSeminar;
        } else if (filterCategory === "Arranged by Self") {
            matchesCategory = w.workshopType === "Arranged by Self" || w.eventType === "organized";
        } else if (filterCategory === "Attended") {
            matchesCategory = w.workshopType === "Attended" || w.eventType === "attended";
        } else if (filterCategory === "External") {
            matchesCategory = w.workshopType === "External";
        }

        let matchesSearch = true;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            matchesSearch = 
                (w.title && w.title.toLowerCase().includes(q)) ||
                (w.speakerName && w.speakerName.toLowerCase().includes(q)) ||
                (w.speakerOrganization && w.speakerOrganization.toLowerCase().includes(q)) ||
                (w.department && w.department.toLowerCase().includes(q)) ||
                (w.submittedBy?.name && w.submittedBy.name.toLowerCase().includes(q));
        }

        return matchesCategory && matchesSearch;
    });

    const selectedRemunWorkshop = workshops.find(w => String(w._id) === String(selectedRemunWorkshopId)) || null;

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Letter Workflow Modal */}
            {letterModalConfig.isOpen && letterModalConfig.workshop && (
                <WorkshopLetterModal
                    workshop={letterModalConfig.workshop}
                    workshopsList={workshops}
                    initialType={letterModalConfig.initialType}
                    initialStep={letterModalConfig.initialStep}
                    currentUser={currentUser}
                    onClose={() => setLetterModalConfig({ isOpen: false, workshop: null, initialType: "invitation", initialStep: "generate" })}
                    onUpdated={() => loadWorkshops()}
                />
            )}

            {/* ================= HEADER PANEL ================= */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>🎓 Workshops & Seminars Steering</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">
                        Manage academic workshops, guest lectures, invitation workflows, event reports, post-assessments, and remuneration.
                    </p>
                </div>

                {currentUser?.role !== "Principal" && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        {currentUser?.role !== "Faculty" && (
                            <button
                                type="button"
                                onClick={() => openLetterModal(null, "official", "generate")}
                                className="px-3.5 py-2 text-xs font-bold text-blue-200 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/70 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:translate-y-0.5 cursor-pointer"
                                title="Generate, Preview, Scan, or Send official Institutional Letter"
                            >
                                <span>🏛️ Official Letter</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => openLetterModal(null, "invitation", "generate")}
                            className="px-3.5 py-2 text-xs font-bold text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/70 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:translate-y-0.5 cursor-pointer"
                            title="Generate, Preview, Scan, or Send official Invitation Letter"
                        >
                            <span>✉️ Invitation Letter</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => openLetterModal(null, "thanking", "generate")}
                            className="px-3.5 py-2 text-xs font-bold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/70 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:translate-y-0.5 cursor-pointer"
                            title="Generate, Preview, Scan, or Send official Thanking / Appreciation Letter"
                        >
                            <span>🤝 Thanking Letter</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setShowAddModal(true);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
                        >
                            <span>➕ Register Workshop</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ================= NAVIGATION TABS (WORKSHOPS vs REMUNERATION) ================= */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                <button
                    type="button"
                    onClick={() => setActiveTab("events")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === "events"
                            ? "bg-indigo-650 text-white shadow-md shadow-indigo-650/20"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                >
                    <span>🎓</span>
                    <span>All Workshops & Seminars ({workshops.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("remuneration")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === "remuneration"
                            ? "bg-indigo-650 text-white shadow-md shadow-indigo-650/20"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                >
                    <span>💰</span>
                    <span>Remuneration Details</span>
                </button>
            </div>

            {/* ================= TAB 1: WORKSHOPS & SEMINARS VIEW ================= */}
            {activeTab === "events" && (
                <div className="space-y-5">
                    {/* Search & Category Filter Bar */}
                    <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            {["All", "Workshops", "Seminars", "Arranged by Self", "Attended", "External"].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilterCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg border transition ${
                                        filterCategory === cat
                                            ? "bg-indigo-650 text-white border-indigo-500 shadow-sm"
                                            : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-72">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search title, speaker, organizer..."
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                            <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
                        </div>
                    </div>

                    {/* ================= WORKSHOPS / SEMINARS LISTING ================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filteredWorkshops.length === 0 ? (
                            <div className="col-span-2 bg-[#101622] border border-slate-800/80 rounded-2xl p-10 text-center text-slate-400">
                                <span className="text-3xl block mb-2">📂</span>
                                <p className="text-sm font-semibold text-slate-200">No workshops or seminars match the selected filters.</p>
                                <p className="text-xs text-slate-500 mt-1 mb-4">You can register a new event or generate official invitation and thanking letters below.</p>
                                {currentUser?.role !== "Principal" && (
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { resetForm(); setShowAddModal(true); }}
                                            className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
                                        >
                                            ➕ Register Event
                                        </button>
                                        {currentUser?.role !== "Faculty" && (
                                            <button
                                                type="button"
                                                onClick={() => openLetterModal(null, "official", "generate")}
                                                className="px-3.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/70 text-blue-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                                            >
                                                🏛️ Generate Official Letter
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => openLetterModal(null, "invitation", "generate")}
                                            className="px-3.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                                        >
                                            ✉️ Generate Invitation Letter
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openLetterModal(null, "thanking", "generate")}
                                            className="px-3.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                                        >
                                            🤝 Generate Thanking Letter
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            filteredWorkshops.map(w => {
                                const isSeminar = (w.workshopType && w.workshopType.toLowerCase().includes("seminar")) || (w.title && w.title.toLowerCase().includes("seminar"));
                                const isApproved = w.status === "verified" || w.status === "approved";
                                const isOwner = currentUser.role === "Faculty" && String(w.submittedBy?._id || w.submittedBy) === String(currentUser.id || currentUser._id);
                                const canApprove = currentUser.role === "HOD" && (!w.department || w.department === currentUser.department);

                                return (
                                    <div 
                                        key={w._id} 
                                        className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
                                    >
                                        <div>
                                            {/* Card Header & Status */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                        isSeminar 
                                                            ? "bg-purple-950/80 text-purple-300 border-purple-700" 
                                                            : "bg-indigo-950/80 text-indigo-300 border-indigo-700"
                                                    }`}>
                                                        {isSeminar ? "🎙️ Seminar" : "🛠️ Workshop"}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                                                        {w.workshopType || "Event"}
                                                    </span>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                                    isApproved
                                                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-700" 
                                                        : w.status === "rejected" 
                                                        ? "bg-rose-950/80 text-rose-400 border-rose-700" 
                                                        : "bg-amber-950/80 text-amber-300 border-amber-700"
                                                }`}>
                                                    {isApproved ? "✓ Approved" : w.status}
                                                </span>
                                            </div>

                                            {/* Title & Description */}
                                            <h4 className="text-sm font-bold text-white leading-snug mb-1.5">{w.title}</h4>
                                            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{w.description}</p>
                                            
                                            <div className="flex flex-wrap gap-y-1 gap-x-4 text-[11px] text-slate-400 mb-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                                                {w.date && <span>📅 <strong>{new Date(w.date).toLocaleDateString()}</strong></span>}
                                                {w.time && <span>⏰ {w.time}</span>}
                                                {w.venue && <span>📍 {w.venue}</span>}
                                            </div>

                                            {/* Dynamic HOD Approval Display (Requirement #12) */}
                                            {isApproved && (
                                                <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between text-[11px] text-emerald-300">
                                                    <div className="flex items-center gap-1.5 font-bold">
                                                        <span>👑</span>
                                                        <span>Approved by: {w.approvedByName || "Head of Department (HOD)"}</span>
                                                    </div>
                                                    {w.approvedAt && (
                                                        <span className="text-[10px] text-emerald-400/80">
                                                            {new Date(w.approvedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Speaker Profile Box */}
                                            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl mb-4 space-y-1 text-xs">
                                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Speaker / Resource Person</span>
                                                    {w.speakerResumePath && (
                                                        <a 
                                                            href={w.speakerResumePath} 
                                                            download={`${(w.speakerName || "Speaker").replace(/\s+/g, "_")}_CV.pdf`}
                                                            className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] underline"
                                                        >
                                                            📥 Resume CV
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="font-bold text-slate-200">{w.speakerName}</div>
                                                {w.speakerOrganization && <div className="text-indigo-300 text-[11px]">{w.speakerOrganization}</div>}
                                                {w.guestEmail && <div className="text-slate-400 text-[11px]">✉️ {w.guestEmail}</div>}
                                                {w.speakerBio && <div className="text-slate-400 text-[11px] pt-1 italic">{w.speakerBio}</div>}
                                            </div>

                                            {/* ================= 4-STEP LETTER WORKFLOW PANELS (Removed for Faculty, Available for HOD & Authorized Roles) ================= */}
                                            {currentUser?.role !== "Faculty" && (
                                                <div className="space-y-2.5 mb-4 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Letter Generation & Status</span>
                                                        <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">4-Step Workflow</span>
                                                    </div>

                                                    {/* OFFICIAL LETTER WORKFLOW */}
                                                    <div className="border-t border-slate-850 pt-2">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                                                                <span>🏛️</span>
                                                                <span>Official Letter:</span>
                                                            </span>
                                                            {w.officialLetterSentAt ? (
                                                                <span className="text-[10px] text-emerald-400 font-medium">
                                                                    ✓ Sent {new Date(w.officialLetterSentAt).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-500">Not Dispatched</span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "official", "generate")}
                                                                className="px-2 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-700/60 text-blue-300 rounded text-[10px] font-semibold text-center transition"
                                                            >
                                                                ✍️ 1. Generate
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "official", "view")}
                                                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-semibold text-center transition"
                                                            >
                                                                👁️ 2. View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "official", "scan")}
                                                                className={`px-2 py-1 rounded text-[10px] font-semibold text-center transition border ${
                                                                    w.scannedOfficialLetter
                                                                        ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                                                                        : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                                                                }`}
                                                            >
                                                                📷 3. Scan {w.scannedOfficialLetter && "✓"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "official", "send")}
                                                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold text-center shadow transition"
                                                            >
                                                                🚀 4. Send
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* INVITATION LETTER WORKFLOW */}
                                                    <div className="border-t border-slate-850 pt-2">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                                                                <span>✉️</span>
                                                                <span>Invitation Letter:</span>
                                                            </span>
                                                            {w.invitationSentAt ? (
                                                                <span className="text-[10px] text-emerald-400 font-medium">
                                                                    ✓ Sent {new Date(w.invitationSentAt).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-500">Not Dispatched</span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "invitation", "generate")}
                                                                className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded text-[10px] font-semibold text-center transition"
                                                            >
                                                                ✍️ 1. Generate
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "invitation", "view")}
                                                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-semibold text-center transition"
                                                            >
                                                                👁️ 2. View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "invitation", "scan")}
                                                                className={`px-2 py-1 rounded text-[10px] font-semibold text-center transition border ${
                                                                    w.scannedInvitation
                                                                        ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                                                                        : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                                                                }`}
                                                            >
                                                                📷 3. Scan {w.scannedInvitation && "✓"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "invitation", "send")}
                                                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold text-center shadow transition"
                                                            >
                                                                🚀 4. Send
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* THANKING / APPRECIATION LETTER WORKFLOW */}
                                                    <div className="border-t border-slate-850 pt-2">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                                <span>🤝</span>
                                                                <span>Thanking Letter:</span>
                                                            </span>
                                                            {w.thankingSentAt ? (
                                                                <span className="text-[10px] text-emerald-400 font-medium">
                                                                    ✓ Sent {new Date(w.thankingSentAt).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-500">Not Dispatched</span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "thanking", "generate")}
                                                                className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded text-[10px] font-semibold text-center transition"
                                                            >
                                                                ✍️ 1. Generate
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "thanking", "view")}
                                                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-semibold text-center transition"
                                                            >
                                                                👁️ 2. View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "thanking", "scan")}
                                                                className={`px-2 py-1 rounded text-[10px] font-semibold text-center transition border ${
                                                                    w.scannedThankingLetter
                                                                        ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                                                                        : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                                                                }`}
                                                            >
                                                                📷 3. Scan {w.scannedThankingLetter && "✓"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openLetterModal(w, "thanking", "send")}
                                                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold text-center shadow transition"
                                                            >
                                                                🚀 4. Send
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            {/* Faculty Submitter link */}
                                            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
                                                <div>
                                                    Organized by:{" "}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (w.submittedBy && onSelectFaculty) {
                                                                onSelectFaculty(w.submittedBy);
                                                            }
                                                        }}
                                                        className="text-indigo-300 font-bold hover:underline"
                                                    >
                                                        {w.submittedBy?.name || "Faculty Member"}
                                                    </button>
                                                </div>
                                                {w.department && <span className="text-[10px] text-slate-500 uppercase">{w.department}</span>}
                                            </div>

                                            {/* Primary Card Action Bar: Workshop Report, View Details, Edit (Delete removed!) */}
                                            <div className="mt-3 pt-2.5 border-t border-slate-850 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    {/* Requirement #1: Workshop Report Option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenWorkshopReport(w)}
                                                        className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5 shadow-sm active:translate-y-0.5 cursor-pointer"
                                                        title="Open complete Workshop Report: Invitation Letter → Event Gallery → Thanking Letter"
                                                    >
                                                        <span>📄</span>
                                                        <span>Workshop Report</span>
                                                    </button>

                                                    {/* Requirement #8: View Details for completed workshop */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetailsModalWorkshop(w)}
                                                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-semibold rounded-lg text-[11px] transition-all flex items-center gap-1"
                                                        title="View all details of this workshop"
                                                    >
                                                        <span>👁️</span>
                                                        <span>View Details</span>
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Requirement #9: Direct Edit Popup (No scrolling required) */}
                                                    {isOwner && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(w)}
                                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-400 hover:text-indigo-300 font-bold rounded-lg text-[11px] transition-all flex items-center gap-1"
                                                        >
                                                            <span>✏️</span>
                                                            <span>Edit</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Post Assessment & Ranking Toggle Button (Requirement #2, Attendees Removed Requirement #10) */}
                                            <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveFeedbackId(activeFeedbackId === w._id ? "" : w._id)}
                                                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5"
                                                >
                                                    <span>⭐</span>
                                                    <span>Post-Assessment & Ranking ({w.feedbacks?.length || 0})</span>
                                                </button>

                                                {w.photos && w.photos.length > 0 && (
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                        📸 {w.photos.length} Gallery Photos
                                                    </span>
                                                )}
                                            </div>

                                            {/* Post Assessment & Ranking Panel (Requirement #2 Activated) */}
                                            {activeFeedbackId === w._id && (
                                                <div className="mt-3 bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3 animate-fade-in">
                                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                                        <strong className="text-xs text-white flex items-center gap-1.5">
                                                            <span>⭐</span>
                                                            <span>Workshop Post-Assessment & Ranking</span>
                                                        </strong>
                                                        <span className="text-[10px] text-amber-400 font-bold">
                                                            {w.ranking?.rank ? `${w.ranking.rank} (${w.ranking.score}/5)` : "Not Evaluated"}
                                                        </span>
                                                    </div>

                                                    {currentUser?.role !== "Principal" && (
                                                        <div className="space-y-2.5">
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Evaluator / Participant</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                                        placeholder="Name or Roll No"
                                                                        value={fbName}
                                                                        onChange={(e) => setFbName(e.target.value)}
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assessment Criteria</label>
                                                                    <select
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                                        value={fbCriteria}
                                                                        onChange={(e) => setFbCriteria(e.target.value)}
                                                                    >
                                                                        <option value="Content & Delivery">Content & Delivery</option>
                                                                        <option value="Practical Hands-on">Practical Hands-on</option>
                                                                        <option value="Speaker Interaction">Speaker Interaction</option>
                                                                        <option value="Syllabus Relevance">Syllabus Relevance</option>
                                                                        <option value="Overall Impact">Overall Impact</option>
                                                                    </select>
                                                                </div>

                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Post Score / Rating</label>
                                                                    <select
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                                        value={fbRating}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value);
                                                                            setFbRating(val);
                                                                            setFbScore(val);
                                                                        }}
                                                                    >
                                                                        <option value={5}>⭐⭐⭐⭐⭐ 5/5 (Exemplary)</option>
                                                                        <option value={4}>⭐⭐⭐⭐ 4/5 (Very Good)</option>
                                                                        <option value={3}>⭐⭐⭐ 3/5 (Good)</option>
                                                                        <option value={2}>⭐⭐ 2/5 (Satisfactory)</option>
                                                                        <option value={1}>⭐ 1/5 (Needs Improvement)</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <textarea
                                                                rows="2"
                                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                                placeholder="Post-Assessment remarks, student feedback, and evaluation observations..."
                                                                value={fbComments}
                                                                onChange={(e) => setFbComments(e.target.value)}
                                                            />

                                                            <div className="flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    disabled={submittingAssessment}
                                                                    onClick={() => handleSubmitPostAssessment(w._id)}
                                                                    className="px-4 py-1.5 bg-emerald-650 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
                                                                >
                                                                    <span>{submittingAssessment ? "Submitting..." : "📝 Submit Post Assessment"}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Existing Reviews & Evaluations List */}
                                                    <div className="space-y-1.5 border-t border-slate-800 pt-2.5 max-h-36 overflow-y-auto">
                                                        {(w.feedbacks || []).length === 0 ? (
                                                            <span className="text-xs text-slate-500 italic block py-1 text-center">No post-assessments recorded yet.</span>
                                                        ) : (
                                                            (w.feedbacks || []).map((fb, idx) => (
                                                                <div key={idx} className="bg-slate-900/60 border border-slate-850 p-2 rounded text-xs space-y-0.5">
                                                                    <div className="flex items-center justify-between text-[11px]">
                                                                        <strong className="text-slate-200">{fb.name || "Participant"}</strong>
                                                                        <span className="text-amber-400 font-mono">{"★".repeat(fb.rating || 5)}</span>
                                                                    </div>
                                                                    {fb.category && (
                                                                        <span className="text-[9px] text-indigo-400 font-semibold uppercase">{fb.category}</span>
                                                                    )}
                                                                    <p className="text-slate-400 italic text-[11px]">"{fb.comments}"</p>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Approval Actions for HOD and Principal */}
                                            {canApprove && w.status === "pending" && (
                                                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800">
                                                    <button
                                                        onClick={() => handleApproveStatus(w._id, "verified")}
                                                        className="py-1.5 text-xs font-bold rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 transition flex items-center justify-center gap-1.5"
                                                    >
                                                        <span>✓</span>
                                                        <span>Approve Workshop</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveStatus(w._id, "rejected")}
                                                        className="py-1.5 text-xs font-bold rounded bg-rose-950/60 text-rose-300 border border-rose-700 hover:bg-rose-900 transition flex items-center justify-center gap-1.5"
                                                    >
                                                        <span>✕</span>
                                                        <span>Reject Entry</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ================= TAB 2: REMUNERATION DETAILS (Requirements #3, #4, #5) ================= */}
            {activeTab === "remuneration" && (
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
                    <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span>💰</span>
                                <span>Remuneration & Guest Honorarium Management</span>
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-1">
                                Record bank accounts and honorarium details for external resource persons, and generate official payment vouchers.
                            </p>
                        </div>

                        {selectedRemunWorkshop && currentUser?.role !== "Principal" && (
                            <button
                                type="button"
                                onClick={handleGenerateRemunerationPdf}
                                disabled={generatingRemunPdf}
                                className="px-4 py-2 bg-emerald-650 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                                <span>{generatingRemunPdf ? "⏳ Generating..." : "📄 Generate Remuneration Report"}</span>
                            </button>
                        )}
                    </div>

                    {/* Workshop Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Select Workshop / Guest Session *
                        </label>
                        <select
                            value={selectedRemunWorkshopId}
                            onChange={(e) => {
                                const found = workshops.find(w => String(w._id) === String(e.target.value));
                                initRemunForWorkshop(found);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            {workshops.map(w => (
                                <option key={w._id} value={w._id}>
                                    {w.title} — {w.speakerName} ({w.date ? new Date(w.date).toLocaleDateString() : "Date TBD"})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedRemunWorkshop ? (
                        <form onSubmit={handleSaveRemuneration} className="space-y-6">
                            {/* Summary Card for Selected Session */}
                            <div className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">Guest Speaker</div>
                                    <div className="text-slate-100 font-bold text-sm mt-0.5">{selectedRemunWorkshop.speakerName}</div>
                                    <div className="text-slate-400 text-[11px]">{selectedRemunWorkshop.speakerOrganization || selectedRemunWorkshop.guestOrganization || "External Resource Person"}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">Event Date</div>
                                    <div className="text-indigo-400 font-semibold mt-0.5">{selectedRemunWorkshop.date ? new Date(selectedRemunWorkshop.date).toLocaleDateString() : "—"}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">Department</div>
                                    <div className="text-slate-300 font-semibold mt-0.5">{selectedRemunWorkshop.department}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">Approval Status</div>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                                        selectedRemunWorkshop.status === "verified" ? "bg-emerald-950 text-emerald-400 border border-emerald-700" : "bg-amber-950 text-amber-300 border border-amber-700"
                                    }`}>
                                        {selectedRemunWorkshop.status}
                                    </span>
                                </div>
                            </div>

                            {/* Section 1: Guest / Resource Person Remuneration Breakdown */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                                    <span>📊</span>
                                    <span>Honorarium & Session Breakdown</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resource Person Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={remunForm.guestName}
                                            onChange={(e) => handleRemunFieldChange("guestName", e.target.value)}
                                            placeholder="Dr. Speaker Name"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lecture / Work Hours *</label>
                                        <input
                                            type="number"
                                            min="0.5"
                                            step="0.5"
                                            required
                                            value={remunForm.lectureHours}
                                            onChange={(e) => handleRemunFieldChange("lectureHours", e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rate per Hour (INR) *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={remunForm.ratePerHour}
                                            onChange={(e) => handleRemunFieldChange("ratePerHour", e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Other Amount (TA / DA)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={remunForm.otherAmount}
                                            onChange={(e) => handleRemunFieldChange("otherAmount", e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculated Remuneration</span>
                                            <span className="text-base font-bold text-slate-200 font-mono">₹ {Number(remunForm.totalRemuneration || 0).toLocaleString("en-IN")}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono">({remunForm.lectureHours} hrs × ₹{remunForm.ratePerHour})</span>
                                    </div>

                                    <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-700/40 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Total Payable Amount</span>
                                            <span className="text-lg font-black text-emerald-300 font-mono">₹ {Number(remunForm.totalPayable || 0).toLocaleString("en-IN")}</span>
                                        </div>
                                        <span className="text-[10px] text-emerald-400/80 font-bold uppercase">Approved Voucher</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Bank Account Details for Remittance */}
                            <div className="space-y-3 pt-2">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                                    <span>🏦</span>
                                    <span>Bank Account & Remittance Details</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Holder Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={remunForm.accountHolderName}
                                            onChange={(e) => handleRemunFieldChange("accountHolderName", e.target.value)}
                                            placeholder="As per bank passbook"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={remunForm.bankName}
                                            onChange={(e) => handleRemunFieldChange("bankName", e.target.value)}
                                            placeholder="e.g. State Bank of India, HDFC"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Number *</label>
                                        <input
                                            type="text"
                                            required
                                            value={remunForm.accountNumber}
                                            onChange={(e) => handleRemunFieldChange("accountNumber", e.target.value)}
                                            placeholder="Bank Account Number"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code *</label>
                                        <input
                                            type="text"
                                            required
                                            value={remunForm.ifscCode}
                                            onChange={(e) => handleRemunFieldChange("ifscCode", e.target.value.toUpperCase())}
                                            placeholder="e.g. SBIN0001234"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono uppercase"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch Name</label>
                                        <input
                                            type="text"
                                            value={remunForm.branchName}
                                            onChange={(e) => handleRemunFieldChange("branchName", e.target.value)}
                                            placeholder="Branch Location"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAN / Tax Number</label>
                                        <input
                                            type="text"
                                            value={remunForm.panNumber}
                                            onChange={(e) => handleRemunFieldChange("panNumber", e.target.value.toUpperCase())}
                                            placeholder="e.g. ABCDE1234F"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                                <span className="text-[10px] text-slate-500 italic">
                                    🔒 Account information is encrypted and only accessible to authorized institutional officers.
                                </span>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleGenerateRemunerationPdf}
                                        disabled={generatingRemunPdf}
                                        className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                                    >
                                        <span>📄 Preview Report</span>
                                    </button>

                                    {currentUser?.role !== "Principal" && (
                                        <button
                                            type="submit"
                                            disabled={savingRemun}
                                            className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <span>{savingRemun ? "Saving..." : "💾 Save Remuneration Details"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="p-8 text-center text-slate-500 italic">
                            No workshop records available to manage remuneration.
                        </div>
                    )}
                </div>
            )}

            {/* ================= MODAL: WORKSHOP REPORT (Requirement #1: Exact Sequence) ================= */}
            {reportModalWorkshop && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>📑</span>
                                    <span>Workshop Comprehensive Report</span>
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {reportModalWorkshop.title} &bull; Facilitated by {reportModalWorkshop.submittedBy?.name || "Faculty"}
                                </p>
                            </div>
                            <button
                                onClick={() => setReportModalWorkshop(null)}
                                className="text-slate-500 hover:text-slate-300 text-lg font-bold p-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* SEQUENCE ENFORCEMENT BANNER & SUMMARY REPORT EXPORT */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-950/40 border border-indigo-700/50 p-3 rounded-xl text-[11px] text-indigo-300">
                            <div className="flex items-center gap-2">
                                <span className="font-bold">Official Document Sequence:</span>
                                {loadingReportPdf && (
                                    <span className="text-[10px] text-amber-400 animate-pulse font-sans font-medium">⏳ Generating PDF downloads...</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[10px]">
                                <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-600">1. Invitation Letter</span>
                                <span>➔</span>
                                <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-600">2. Event Gallery</span>
                                <span>➔</span>
                                <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-600">3. Thanking Letter</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDownloadSummaryReport(reportModalWorkshop._id, reportModalWorkshop.title)}
                                disabled={downloadingSummaryReport}
                                className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold rounded-lg text-[11px] shadow transition flex items-center gap-1.5 ml-auto"
                            >
                                <span>{downloadingSummaryReport ? "⏳ Generating Report..." : "📄 Full Summary Report (PDF)"}</span>
                            </button>
                        </div>

                        {/* SECTION 1 – INVITATION LETTER */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>✉️</span>
                                    <span>Section 1 – Official Invitation Letter</span>
                                </h4>
                                {reportLetterPdfs.invitation && (
                                    <a
                                        href={reportLetterPdfs.invitation}
                                        download={`Invitation_${(reportModalWorkshop.title || "Letter").replace(/\s+/g, "_")}.pdf`}
                                        className="px-3 py-1 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg text-[10px] transition shadow"
                                    >
                                        📥 Download Invitation PDF
                                    </a>
                                )}
                            </div>

                            {/* Letter Visual Preview Block */}
                            <div className="bg-white text-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 font-serif text-[11px] space-y-3">
                                {/* Official Master Fixed College Letterhead */}
                                <div className="border-b-2 border-[#800000] pb-2 mb-3 flex items-center justify-between gap-3 text-center font-sans">
                                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/assets/college_logo.jpeg"
                                            alt="DYP Crest Logo"
                                            className="w-11 h-11 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-[9px] text-[#800000] uppercase tracking-wider">Dr. D. Y. Patil Educational Federation’s</p>
                                        <div className="font-extrabold text-[11px] tracking-tight text-[#1e1b4b] uppercase leading-tight">
                                            Dr. D. Y. PATIL COLLEGE OF ENGINEERING &amp; INNOVATION
                                        </div>
                                        <div className="text-[8.5px] font-bold text-slate-700 leading-tight">
                                            (An Autonomous Institute Affiliated to SPPU)
                                        </div>
                                        <div className="text-[7.5px] text-slate-500 leading-tight">
                                            Survey No. 27/A/1/2C, Varale Campus, Near Talegaon Railway Station, Tal. Maval, Dist. Pune 410 507
                                        </div>
                                        <div className="text-[7.5px] text-slate-500">
                                            Web Site: www.dypcoei.edu.in • Email: principal.dypcoei@dypatilef.com
                                        </div>
                                        <div className="text-[9px] font-bold text-indigo-900 uppercase mt-1">
                                            Department of {reportModalWorkshop.department}
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/assets/naac_logo.jpeg"
                                            alt="NAAC A Logo"
                                            className="w-11 h-11 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between text-[10px] font-sans pt-1">
                                    <span><strong>Ref No:</strong> DYPCOEI/{(reportModalWorkshop.department || "DEPT").toUpperCase().slice(0, 4)}/{new Date().getFullYear()}/{reportModalWorkshop._id.toString().slice(-4).toUpperCase()}</span>
                                    <span><strong>Date:</strong> {reportModalWorkshop.date ? new Date(reportModalWorkshop.date).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                </div>

                                <div className="pt-1">
                                    <p className="font-bold">To,</p>
                                    <p className="font-bold text-[12px]">{reportModalWorkshop.speakerName}</p>
                                    <p className="text-slate-600">{reportModalWorkshop.guestDesignation || "Distinguished Expert"}</p>
                                    <p className="text-slate-600">{reportModalWorkshop.speakerOrganization || reportModalWorkshop.guestOrganization || "Industry / Academic Organization"}</p>
                                </div>

                                <div className="bg-slate-100 p-2 rounded border border-slate-300 font-sans font-bold text-[10px] text-indigo-950">
                                    SUBJECT: Official Invitation as Guest Speaker / Resource Person for "{reportModalWorkshop.title}"
                                </div>

                                <p className="leading-relaxed">
                                    Dear {reportModalWorkshop.speakerName},<br />
                                    It gives us immense pleasure to cordially invite you as our distinguished Guest Speaker for the workshop on <strong>"{reportModalWorkshop.title}"</strong> scheduled on <strong>{reportModalWorkshop.date ? new Date(reportModalWorkshop.date).toLocaleDateString() : "the scheduled date"}</strong> at {reportModalWorkshop.venue || "Campus Auditorium"}.
                                </p>

                                <div className="flex justify-between pt-6 border-t border-slate-300 font-sans text-[10px] text-center">
                                    <div>
                                        <p className="font-bold">{reportModalWorkshop.submittedBy?.name || "Faculty Coordinator"}</p>
                                        <p className="text-slate-500 text-[9px]">Faculty Coordinator</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{reportModalWorkshop.approvedByName || "Head of Department"}</p>
                                        <p className="text-slate-500 text-[9px]">HOD ({reportModalWorkshop.department})</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">Principal & Director</p>
                                        <p className="text-slate-500 text-[9px]">Institution Head</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2 – EVENT GALLERY (Photos) */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>📸</span>
                                    <span>Section 2 – Event Gallery & Photos</span>
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                    {reportModalWorkshop.photos?.length || 0} Photos Uploaded
                                </span>
                            </div>

                            {(!reportModalWorkshop.photos || reportModalWorkshop.photos.length === 0) ? (
                                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 italic">
                                    No event gallery photos uploaded for this session yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {reportModalWorkshop.photos.map((imgSrc, idx) => (
                                        <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group aspect-video">
                                            <img
                                                src={imgSrc}
                                                alt={`Event Gallery ${idx + 1}`}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <a
                                                    href={imgSrc}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-2 py-1 bg-slate-900/90 text-white rounded text-[10px] font-bold shadow"
                                                >
                                                    🔍 View Full
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SECTION 3 – THANKING LETTER */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>🤝</span>
                                    <span>Section 3 – Official Thanking & Appreciation Letter</span>
                                </h4>
                                {reportLetterPdfs.thanking && (
                                    <a
                                        href={reportLetterPdfs.thanking}
                                        download={`Appreciation_${(reportModalWorkshop.title || "Letter").replace(/\s+/g, "_")}.pdf`}
                                        className="px-3 py-1 bg-emerald-650 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] transition shadow"
                                    >
                                        📥 Download Thanking PDF
                                    </a>
                                )}
                            </div>

                            {/* Letter Visual Preview Block */}
                            <div className="bg-white text-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 font-serif text-[11px] space-y-3">
                                {/* Official Master Fixed College Letterhead */}
                                <div className="border-b-2 border-[#800000] pb-2 mb-3 flex items-center justify-between gap-3 text-center font-sans">
                                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/assets/college_logo.jpeg"
                                            alt="DYP Crest Logo"
                                            className="w-11 h-11 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-[9px] text-[#800000] uppercase tracking-wider">Dr. D. Y. Patil Educational Federation’s</p>
                                        <div className="font-extrabold text-[11px] tracking-tight text-[#1e1b4b] uppercase leading-tight">
                                            Dr. D. Y. PATIL COLLEGE OF ENGINEERING &amp; INNOVATION
                                        </div>
                                        <div className="text-[8.5px] font-bold text-slate-700 leading-tight">
                                            (An Autonomous Institute Affiliated to SPPU)
                                        </div>
                                        <div className="text-[7.5px] text-slate-500 leading-tight">
                                            Survey No. 27/A/1/2C, Varale Campus, Near Talegaon Railway Station, Tal. Maval, Dist. Pune 410 507
                                        </div>
                                        <div className="text-[7.5px] text-slate-500">
                                            Web Site: www.dypcoei.edu.in • Email: principal.dypcoei@dypatilef.com
                                        </div>
                                        <div className="text-[9px] font-bold text-emerald-900 uppercase mt-1">
                                            Department of {reportModalWorkshop.department}
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/assets/naac_logo.jpeg"
                                            alt="NAAC A Logo"
                                            className="w-11 h-11 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between text-[10px] font-sans pt-1">
                                    <span><strong>Ref No:</strong> DYPCOEI/{(reportModalWorkshop.department || "DEPT").toUpperCase().slice(0, 4)}/{new Date().getFullYear()}/{reportModalWorkshop._id.toString().slice(-4).toUpperCase()}</span>
                                    <span><strong>Date:</strong> {reportModalWorkshop.thankingSentAt ? new Date(reportModalWorkshop.thankingSentAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                </div>

                                <div className="pt-1">
                                    <p className="font-bold">To,</p>
                                    <p className="font-bold text-[12px]">{reportModalWorkshop.speakerName}</p>
                                    <p className="text-slate-600">{reportModalWorkshop.guestDesignation || "Distinguished Expert"}</p>
                                    <p className="text-slate-600">{reportModalWorkshop.speakerOrganization || reportModalWorkshop.guestOrganization || "Industry / Academic Organization"}</p>
                                </div>

                                <div className="bg-emerald-50 p-2 rounded border border-emerald-300 font-sans font-bold text-[10px] text-emerald-950">
                                    SUBJECT: Letter of Appreciation & Heartfelt Gratitude for "{reportModalWorkshop.title}"
                                </div>

                                <p className="leading-relaxed">
                                    Dear {reportModalWorkshop.speakerName},<br />
                                    On behalf of the faculty and students of the Department of {reportModalWorkshop.department}, we express our profound gratitude for delivering an exceptional and thought-provoking session during the workshop on <strong>"{reportModalWorkshop.title}"</strong>. Your deep technical expertise and inspiring mentorship left an indelible impact on our students.
                                </p>

                                <div className="flex justify-between pt-6 border-t border-slate-300 font-sans text-[10px] text-center">
                                    <div>
                                        <p className="font-bold">{reportModalWorkshop.submittedBy?.name || "Faculty Coordinator"}</p>
                                        <p className="text-slate-500 text-[9px]">Faculty Coordinator</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{reportModalWorkshop.approvedByName || "Head of Department"}</p>
                                        <p className="text-slate-500 text-[9px]">HOD ({reportModalWorkshop.department})</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">Principal & Director</p>
                                        <p className="text-slate-500 text-[9px]">Sanctioning Authority</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setReportModalWorkshop(null)}
                                className="px-5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                            >
                                Close Report
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL: VIEW ALL DETAILS (Requirement #8) ================= */}
            {detailsModalWorkshop && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>🔍</span>
                                    <span>Complete Workshop Dossier</span>
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Comprehensive view of all event information, letters, assessments, and remuneration</p>
                            </div>
                            <button
                                onClick={() => setDetailsModalWorkshop(null)}
                                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Basic & Event Details */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-white text-sm">{detailsModalWorkshop.title}</h4>
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    detailsModalWorkshop.status === "verified" ? "bg-emerald-950 text-emerald-400 border border-emerald-700" : "bg-amber-950 text-amber-300 border border-amber-700"
                                }`}>
                                    {detailsModalWorkshop.status}
                                </span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">{detailsModalWorkshop.description}</p>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] border-t border-slate-850/80">
                                <div><span className="text-slate-500 block">Date</span><strong className="text-slate-200">{detailsModalWorkshop.date ? new Date(detailsModalWorkshop.date).toLocaleDateString() : "—"}</strong></div>
                                <div><span className="text-slate-500 block">Time</span><strong className="text-slate-200">{detailsModalWorkshop.time || "—"}</strong></div>
                                <div><span className="text-slate-500 block">Venue</span><strong className="text-slate-200">{detailsModalWorkshop.venue || "—"}</strong></div>
                                <div><span className="text-slate-500 block">Category</span><strong className="text-indigo-400">{detailsModalWorkshop.workshopType || "Event"}</strong></div>
                            </div>
                        </div>

                        {/* Speaker & Organizer */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Speaker & Resource Person</span>
                                <div className="font-bold text-slate-100 text-xs">{detailsModalWorkshop.speakerName}</div>
                                <div className="text-indigo-300 text-[11px]">{detailsModalWorkshop.speakerOrganization || detailsModalWorkshop.guestOrganization || "—"}</div>
                                <div className="text-slate-400 text-[11px]">✉️ {detailsModalWorkshop.guestEmail || "No email"} &bull; 📞 {detailsModalWorkshop.speakerContact || "No contact"}</div>
                                {detailsModalWorkshop.speakerBio && <div className="text-slate-400 text-[11px] italic pt-1">{detailsModalWorkshop.speakerBio}</div>}
                            </div>

                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faculty Organizer & Approval</span>
                                <div className="font-bold text-slate-100 text-xs">{detailsModalWorkshop.submittedBy?.name || "Faculty Coordinator"}</div>
                                <div className="text-slate-400 text-[11px]">Department of {detailsModalWorkshop.department}</div>
                                <div className="pt-2 border-t border-slate-850/80">
                                    <div className="text-[10px] text-emerald-400 font-bold">
                                        👑 Approved by: {detailsModalWorkshop.approvedByName || "Pending HOD"}
                                    </div>
                                    {detailsModalWorkshop.approvedAt && (
                                        <div className="text-[10px] text-slate-500">
                                            Date: {new Date(detailsModalWorkshop.approvedAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Letters Status */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Letters & Documentation</span>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                    <span className="font-bold text-indigo-300 block mb-1">✉️ Invitation Letter</span>
                                    <span className="text-[11px] text-slate-400">
                                        {detailsModalWorkshop.invitationSentAt ? `Dispatched on ${new Date(detailsModalWorkshop.invitationSentAt).toLocaleDateString()}` : "Not yet dispatched"}
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                    <span className="font-bold text-emerald-300 block mb-1">🤝 Thanking Letter</span>
                                    <span className="text-[11px] text-slate-400">
                                        {detailsModalWorkshop.thankingSentAt ? `Dispatched on ${new Date(detailsModalWorkshop.thankingSentAt).toLocaleDateString()}` : "Not yet dispatched"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Remuneration Summary */}
                        {detailsModalWorkshop.remuneration && (
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remuneration Details</span>
                                    <span className="text-emerald-400 font-bold font-mono">
                                        ₹ {Number(detailsModalWorkshop.remuneration.totalPayable || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                                    <div>Bank: <strong className="text-slate-200">{detailsModalWorkshop.remuneration.bankName || "—"}</strong></div>
                                    <div>A/C: <strong className="text-slate-200">{detailsModalWorkshop.remuneration.accountNumber || "—"}</strong></div>
                                    <div>IFSC: <strong className="text-slate-200">{detailsModalWorkshop.remuneration.ifscCode || "—"}</strong></div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDetailsModalWorkshop(null)}
                                className="px-5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                            >
                                Close Dossier
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL: EDIT / REGISTER WORKSHOP (Requirement #9: Zero Scrolling Popup) ================= */}
            {(showAddModal || editModalWorkshop) && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span>📝</span>
                                <span>{editModalWorkshop ? "Edit Workshop / Seminar Details" : "Register New Workshop / Seminar"}</span>
                            </h3>
                            <button
                                onClick={resetForm}
                                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5 sm:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Title / Theme *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. Workshop on Cloud Architecture & Generative AI"
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Category</label>
                                    <select
                                        value={form.workshopType}
                                        onChange={(e) => setForm({ ...form, workshopType: e.target.value })}
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="Arranged by Self">Workshop (Self Arranged)</option>
                                        <option value="Seminar">Seminar / Guest Lecture</option>
                                        <option value="Attended">Attended</option>
                                        <option value="External">External Workshop</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Guest Professional Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.speakerName}
                                        onChange={(e) => setForm({ ...form, speakerName: e.target.value })}
                                        placeholder="Dr. Rajesh Kumar"
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Guest Speaker Email</label>
                                    <input
                                        type="email"
                                        value={form.guestEmail}
                                        onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                                        placeholder="speaker@institution.org"
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Speaker Organization</label>
                                    <input
                                        type="text"
                                        value={form.speakerOrganization}
                                        onChange={(e) => setForm({ ...form, speakerOrganization: e.target.value })}
                                        placeholder="e.g. Microsoft / IIT Bombay"
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Speaker Contact Info</label>
                                    <input
                                        type="text"
                                        value={form.speakerContact}
                                        onChange={(e) => setForm({ ...form, speakerContact: e.target.value })}
                                        placeholder="+91 9876543210"
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Time / Duration *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.time}
                                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                                        placeholder="10:00 AM - 01:00 PM"
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Venue / Mode</label>
                                    <input
                                        type="text"
                                        value={form.venue}
                                        onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                        placeholder="e.g. Seminar Hall / MS Teams"
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Guest Resume (PDF)</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="w-full text-xs text-slate-400 border border-slate-700 rounded-lg p-1.5 bg-slate-950"
                                        onChange={(e) => handleFileChange(e, "speakerResumeBase64")}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 sm:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Upload Event Gallery Images</label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="w-full text-xs text-slate-400 border border-slate-700 rounded-lg p-1.5 bg-slate-950"
                                        onChange={handleMultiplePhotosChange}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 sm:col-span-3">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Workshop Description / Objectives *</label>
                                    <textarea
                                        rows="3"
                                        required
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe the syllabus, topics covered, and student outcomes..."
                                        className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 sm:col-span-3">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Speaker Credentials / Bio</label>
                                    <textarea
                                        rows="2"
                                        value={form.speakerBio}
                                        onChange={(e) => setForm({ ...form, speakerBio: e.target.value })}
                                        placeholder="Brief summary of speaker achievements and research background..."
                                        className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 rounded-lg shadow-md transition"
                                >
                                    {loading ? "Saving..." : editModalWorkshop ? "Update Event" : "Register Event"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL: REMUNERATION PDF REPORT PREVIEW ================= */}
            {remunPdfData && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span>📄</span>
                                <span>Remuneration Report Generated</span>
                            </h3>
                            <button
                                onClick={() => setRemunPdfData(null)}
                                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                <span>✓</span>
                                <span>Official Remuneration Voucher Created Successfully</span>
                            </div>
                            <p className="text-slate-300 text-xs">
                                Formatted with institutional header, session hours, rate breakdown, account remittance details, and signature blocks.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setRemunPdfData(null)}
                                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                            >
                                Close
                            </button>
                            <a
                                href={remunPdfData.pdfBase64}
                                download={remunPdfData.filename}
                                className="px-5 py-2 bg-emerald-650 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
                            >
                                <span>📥 Download PDF</span>
                            </a>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default WorkshopsPanel;
