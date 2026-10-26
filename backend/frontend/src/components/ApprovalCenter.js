import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

function ApprovalCenter({ currentUser }) {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [selectedApp, setSelectedApp] = useState(null);
    const [remarks, setRemarks] = useState("");
    const [submittingAction, setSubmittingAction] = useState(false);

    // Multi-factor Filters
    const [statusFilter, setStatusFilter] = useState("pending"); // default to pending queue for productivity
    const [typeFilter, setTypeFilter] = useState("all");
    const [deptFilter, setDeptFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const loadApprovals = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setIsRefreshing(true);
            setError("");

            const data = await api.get("/approvals");
            const list = data.approvals || [];
            setApprovals(list);

            // Update selectedApp if already open
            setSelectedApp(prev => {
                if (!prev) return null;
                return list.find(item => item._id === prev._id) || prev;
            });
        } catch (err) {
            console.error("Failed to load approvals queue:", err);
            if (!isSilent) setError("Failed to retrieve approvals queue ❌");
        } finally {
            if (!isSilent) setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Initial load + Real-time fallback polling every 5 seconds
    useEffect(() => {
        loadApprovals(false);
        const interval = setInterval(() => {
            loadApprovals(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [loadApprovals]);

    const handleTransition = async (id, action) => {
        // Enforce mandatory remarks for reject/return
        if (action !== "approve" && !remarks.trim()) {
            alert("A comment / remark is mandatory when rejecting or returning submissions ❌");
            return;
        }

        try {
            setSubmittingAction(true);
            const res = await api.post(`/approvals/${id}/transition`, { 
                action, 
                comment: remarks.trim() 
            });

            const actionWord = action === "approve" ? "approved" : action === "reject" ? "rejected" : "returned";
            setSuccessMsg(`Request successfully ${actionWord} and notification dispatched! ✅`);
            setTimeout(() => setSuccessMsg(""), 5000);

            setRemarks("");

            // Immediate local state update for zero-delay UI reactivity
            const updatedApproval = res.approval;
            if (updatedApproval) {
                setApprovals(prev => prev.map(item => item._id === id ? { ...item, ...updatedApproval } : item));
                setSelectedApp(prev => prev && prev._id === id ? { ...prev, ...updatedApproval } : prev);
            }

            // Silent background refresh to re-sync
            loadApprovals(true);
        } catch (err) {
            alert(err.response?.data?.error || err.message || "Failed to update approval ❌");
        } finally {
            setSubmittingAction(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "APPROVED": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            case "HOD_APPROVED": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
            case "PENDING":
            case "SUBMITTED": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
            case "REJECTED": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
            case "RETURNED": return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
            default: return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
        }
    };

    // Extract unique departments for filter dropdown
    const availableDepartments = Array.from(
        new Set(
            approvals.map(a => a.departmentName || a.departmentId?.name || a.submittedBy?.department).filter(Boolean)
        )
    );

    // Multi-factor filter
    const filteredList = approvals.filter(a => {
        // 1. Status Filter
        let matchesStatus = true;
        if (statusFilter === "pending") {
            // Pending queue shows requests awaiting review
            matchesStatus = a.status === "PENDING" || a.status === "SUBMITTED" || (currentUser?.role === "Principal" && a.status === "HOD_APPROVED");
        } else if (statusFilter === "approved") {
            // Approved tab shows requests approved by HOD or Principal
            matchesStatus = a.status === "APPROVED" || a.status === "HOD_APPROVED";
        } else if (statusFilter === "rejected") {
            matchesStatus = a.status === "REJECTED";
        } else if (statusFilter === "returned") {
            matchesStatus = a.status === "RETURNED";
        }

        // 2. Request Type Filter
        const matchesType = typeFilter === "all" || a.entityType === typeFilter;

        // 3. Department Filter
        const appDept = a.departmentName || a.departmentId?.name || a.submittedBy?.department;
        const matchesDept = deptFilter === "all" || appDept === deptFilter;

        // 4. Search Query
        const refNo = `APP-${a._id.slice(-6).toUpperCase()}`;
        const facultyName = a.submittedBy?.name || "";
        const entityTitle = a.entityDetails?.title || a.entityDetails?.subject || a.entityDetails?.activityName || "";
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            refNo.toLowerCase().includes(q) ||
            facultyName.toLowerCase().includes(q) ||
            entityTitle.toLowerCase().includes(q) ||
            (appDept && appDept.toLowerCase().includes(q));

        return matchesStatus && matchesType && matchesDept && matchesSearch;
    });

    return (
        <div className="space-y-6 text-xs animate-fade-in pb-12">
            {/* Header section */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                            {currentUser.role === "Principal" ? "Principal Approvals Queue" : "Department Approvals Center"}
                        </h2>
                        {isRefreshing && (
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full animate-pulse border border-indigo-500/20">
                                ⚡ Live Sync
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 mt-1">
                        {currentUser.role === "Principal"
                            ? "Review forwarded faculty leave requests, workshops, publications, and administrative sanctions"
                            : currentUser.role === "HOD"
                                ? "Evaluate departmental leave applications, verify faculty workshops, and forward eligible requests"
                                : "Track submission status, approver endorsements, and sanction history"
                        }
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadApprovals(false)}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl transition-all"
                        title="Refresh Queue"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl animate-fade-in flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-emerald-300">✕</button>
                </div>
            )}

            {/* Multi-Factor Filter Toolbar */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="w-full md:w-64 relative">
                    <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        placeholder="Search ref no, faculty, title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">🔍</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Status Filter Tabs */}
                    <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                        {[
                            { id: "pending", label: "Pending" },
                            { id: "approved", label: "Approved" },
                            { id: "rejected", label: "Rejected" },
                            { id: "returned", label: "Returned" },
                            { id: "all", label: "All" }
                        ].map(st => (
                            <button
                                key={st.id}
                                onClick={() => setStatusFilter(st.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                    statusFilter === st.id
                                        ? "bg-indigo-650 text-white shadow"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>

                    {/* Request Type Filter */}
                    <select
                        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="all">All Request Types</option>
                        <option value="LEAVE">🏖️ Leave Applications</option>
                        <option value="WORKSHOP">🎤 Workshops & Seminars</option>
                        <option value="PUBLICATION">📚 Research Papers</option>
                        <option value="ACTIVITY">🎖️ Other Activities</option>
                    </select>

                    {/* Department Filter (Principal only) */}
                    {currentUser.role === "Principal" && availableDepartments.length > 0 && (
                        <select
                            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none"
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {availableDepartments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    )}

                    <span className="text-[10px] text-slate-500 shrink-0">
                        Showing {filteredList.length} of {approvals.length}
                    </span>
                </div>
            </div>

            {/* Split Screen Layout: Queue Roster (Left) + Detail Inspection (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Approvals List Table / Cards */}
                <div className="lg:col-span-2 bg-[#101622] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                        Approval Queue Roster
                    </h3>
                    
                    <div className="space-y-2.5">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl animate-pulse flex items-center justify-between">
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-slate-800 rounded w-2/5"></div>
                                            <div className="h-3 bg-slate-800/60 rounded w-3/5"></div>
                                        </div>
                                        <div className="h-7 bg-slate-800/80 rounded-lg w-20"></div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 italic space-y-1">
                                <p className="text-2xl">📭</p>
                                <p>No approval requests found matching your filter criteria.</p>
                            </div>
                        ) : (
                            filteredList.map((a) => {
                                const refNo = `APP-${a._id.slice(-6).toUpperCase()}`;
                                const deptName = a.departmentName || a.departmentId?.name || a.submittedBy?.department || "General";
                                const isSelected = selectedApp?._id === a._id;
                                
                                // Check approval and rejection history details
                                const approvalHistoryItem = a.history && a.history.slice().reverse().find(h => h.status === "APPROVED" || h.status === "HOD_APPROVED");
                                const rejectionHistoryItem = a.history && a.history.slice().reverse().find(h => h.status === "REJECTED");
                                const isApproved = a.status === "APPROVED" || a.status === "HOD_APPROVED";
                                const isPending = a.status === "PENDING" || a.status === "SUBMITTED";
                                const approvedByName = a.approvedByName || a.approvedBy?.name || approvalHistoryItem?.actionByName;
                                const approvedAt = a.approvedAt || approvalHistoryItem?.date;

                                return (
                                    <div 
                                        key={a._id}
                                        onClick={() => {
                                            setSelectedApp(a);
                                            setRemarks("");
                                        }}
                                        className={`p-4 bg-slate-950/40 hover:bg-slate-900/60 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all ${
                                            isSelected ? "border-indigo-500 shadow-md shadow-indigo-500/10 bg-slate-900/60" : "border-slate-800/80"
                                        }`}
                                    >
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                    {refNo}
                                                </span>
                                                <span className="font-bold text-slate-200 truncate">
                                                    {a.entityType === "LEAVE"
                                                        ? `${a.entityDetails?.leaveType || "Leave"}: ${a.entityDetails?.subject || "Leave Request"}`
                                                        : a.entityDetails?.title || a.entityDetails?.activityName || `${a.entityType} Submission`
                                                    }
                                                </span>
                                                <span className="text-[9px] px-2 py-0.5 bg-slate-900 text-slate-350 font-bold border border-slate-800 rounded uppercase">
                                                    {a.entityType}
                                                </span>
                                            </div>

                                            <p className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                                                <span>Faculty: <strong className="text-slate-200">{a.submittedBy?.name || "Faculty Member"}</strong></span>
                                                <span>&bull;</span>
                                                <span>Dept: <strong className="text-slate-300">{deptName}</strong></span>
                                                <span>&bull;</span>
                                                <span>Submitted: {new Date(a.createdAt).toLocaleDateString()}</span>
                                            </p>

                                            {/* Approved view details: Approved Date & Approved By */}
                                            {isApproved && (
                                                <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg inline-flex items-center gap-2 border border-emerald-500/20 flex-wrap">
                                                    <span>✅ <strong>Approved by:</strong> {approvedByName || "HOD"}</span>
                                                    {approvedAt && <span>&bull; <strong>Approved:</strong> {new Date(approvedAt).toLocaleDateString()}</span>}
                                                    {a.remarks && <span className="italic text-emerald-300">"{a.remarks}"</span>}
                                                </div>
                                            )}

                                            {/* Rejection summary if rejected */}
                                            {rejectionHistoryItem && a.status === "REJECTED" && (
                                                <p className="text-[10px] text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg inline-block border border-rose-500/20">
                                                    ✕ <strong>Rejected by:</strong> {rejectionHistoryItem.actionByName} {rejectionHistoryItem.comment ? `("${rejectionHistoryItem.comment}")` : ""}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                                            <div className="text-left sm:text-right">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadge(a.status)}`}>
                                                    {a.status}
                                                </span>
                                                {a.currentLevel !== "COMPLETED" && (
                                                    <span className="block text-[8px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                                                        Level: {a.currentLevel}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quick Action button for pending approvals */}
                                            {isPending && (currentUser.role === "HOD" || currentUser.role === "Principal") && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedApp(a);
                                                        handleTransition(a._id, "approve");
                                                    }}
                                                    disabled={submittingAction}
                                                    title="Quick Approve Request"
                                                    className="px-2.5 py-1 bg-emerald-650 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-lg text-[10px] transition shadow flex items-center gap-1 shrink-0"
                                                >
                                                    {submittingAction && selectedApp?._id === a._id ? "⏳" : "✅ Approve"}
                                                </button>
                                            )}

                                            <span className={`text-sm ${isSelected ? "text-indigo-400" : "text-slate-600"}`}>➔</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Inspect Details Column (Right Side) */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg min-h-[350px]">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                        Inspection &amp; Review Drawer
                    </h3>
                    
                    {!selectedApp ? (
                        <div className="py-16 text-center text-slate-500 italic space-y-2">
                            <span className="text-3xl block">🔍</span>
                            <p>Select an item from the queue roster to inspect details, attachments, approval timeline, and execute decisions.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 text-xs">
                            {/* Request Reference & Submitter Card */}
                            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] font-bold text-indigo-400">
                                        Ref: APP-{selectedApp._id.slice(-6).toUpperCase()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getStatusBadge(selectedApp.status)}`}>
                                        {selectedApp.status}
                                    </span>
                                </div>
                                <p className="font-bold text-slate-200 text-sm">{selectedApp.submittedBy?.name}</p>
                                <p className="text-slate-400 text-[11px]">
                                    {selectedApp.submittedBy?.designation || "Faculty"} &bull; {selectedApp.departmentName || selectedApp.departmentId?.name || selectedApp.submittedBy?.department}
                                </p>
                                {selectedApp.submittedBy?.email && (
                                    <p className="text-slate-500 text-[10px]">{selectedApp.submittedBy.email}</p>
                                )}
                            </div>

                            {/* Entity Specific Details */}
                            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                                    {selectedApp.entityType === "LEAVE" ? "Leave Application Details" : `${selectedApp.entityType} Details`}
                                </span>

                                {selectedApp.entityType === "LEAVE" ? (
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-indigo-400">
                                            {selectedApp.entityDetails?.leaveType || "Academic Leave"} — {selectedApp.entityDetails?.subject || "Leave Request"}
                                        </h4>
                                        <p className="text-slate-300">
                                            <strong className="text-slate-400">Duration:</strong> {selectedApp.entityDetails?.startDate} to {selectedApp.entityDetails?.endDate}
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-slate-400">Reason:</strong> {selectedApp.entityDetails?.reason || "No reason specified"}
                                        </p>

                                        {selectedApp.entityDetails?.attachment && (
                                            <div className="pt-1">
                                                <a 
                                                    href={selectedApp.entityDetails.attachment} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    download={selectedApp.entityDetails.attachmentName || "Leave_Document"}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow"
                                                >
                                                    <span>📎</span> Download Attached Document ({selectedApp.entityDetails.attachmentName || "Document"})
                                                </a>
                                            </div>
                                        )}

                                        {selectedApp.entityDetails?.hodRemarks && (
                                            <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                                                <strong>HOD Remarks:</strong> {selectedApp.entityDetails.hodRemarks}
                                            </p>
                                        )}
                                        {selectedApp.entityDetails?.principalRemarks && (
                                            <p className="text-[11px] text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                                <strong>Principal Remarks:</strong> {selectedApp.entityDetails.principalRemarks}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <h4 className="font-bold text-indigo-400">
                                            {selectedApp.entityDetails?.title || selectedApp.entityDetails?.activityName || "Event"}
                                        </h4>
                                        <p className="text-slate-300 leading-relaxed">
                                            {selectedApp.entityDetails?.description || "No description provided."}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            Date: {selectedApp.entityDetails?.date || selectedApp.entityDetails?.time || "N/A"}
                                            {selectedApp.entityDetails?.venue && ` | Venue: ${selectedApp.entityDetails.venue}`}
                                            {selectedApp.entityDetails?.speakerName && ` | Speaker: ${selectedApp.entityDetails.speakerName}`}
                                        </p>

                                        {selectedApp.entityDetails?.speakerResumePath && (
                                            <div className="pt-1">
                                                <a 
                                                    href={selectedApp.entityDetails.speakerResumePath} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    download="Speaker_CV"
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition shadow"
                                                >
                                                    <span>📎</span> Download Speaker CV
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Timeline History */}
                            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Approval Timeline &amp; History
                                </span>
                                <div className="relative pl-4 border-l border-slate-800 space-y-3">
                                    {selectedApp.history && selectedApp.history.map((h, idx) => (
                                        <div key={idx} className="relative">
                                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-[#101622]" />
                                            <p className="font-bold text-slate-200 text-[10px]">{h.status}</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">By: {h.actionByName || "Approver"} &bull; {new Date(h.date).toLocaleDateString()}</p>
                                            {h.comment && <p className="text-[9px] italic text-slate-300 mt-1 bg-slate-950/60 p-1.5 rounded border border-slate-850">"{h.comment}"</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Decision Actions Form */}
                            {(() => {
                                const isFinalized = selectedApp.currentLevel === "COMPLETED" || ["APPROVED", "REJECTED"].includes(selectedApp.status);
                                const isAuthorizedApprover = currentUser.role === "Principal" || currentUser.role === "HOD";
                                const isPendingAtMyLevel = selectedApp.currentLevel === currentUser.role;

                                if (isFinalized) {
                                    const isApprovedState = selectedApp.status === "APPROVED" || selectedApp.status === "HOD_APPROVED";
                                    const approverName = selectedApp.approvedByName || selectedApp.approvedBy?.name || selectedApp.history?.slice().reverse().find(h => h.status === selectedApp.status)?.actionByName || (isApprovedState ? "HOD" : "Reviewer");
                                    const decisionDate = selectedApp.approvedAt || selectedApp.history?.slice().reverse().find(h => h.status === selectedApp.status)?.date || selectedApp.updatedAt;
                                    const finalRemarks = selectedApp.remarks || selectedApp.history?.slice().reverse().find(h => h.status === selectedApp.status)?.comment;

                                    return (
                                        <div className={`p-4 rounded-xl border text-left space-y-2.5 ${
                                            isApprovedState 
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                    {isApprovedState ? "✅ Request Approved" : "✕ Request Rejected"}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getStatusBadge(selectedApp.status)}`}>
                                                    {selectedApp.status}
                                                </span>
                                            </div>
                                            <div className="text-[11px] space-y-1 text-slate-300">
                                                <p><strong>{isApprovedState ? "Approved by:" : "Reviewed by:"}</strong> {approverName}</p>
                                                <p><strong>Decision Date:</strong> {new Date(decisionDate).toLocaleDateString()} {new Date(decisionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                {finalRemarks && (
                                                    <p className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 text-slate-350 italic">
                                                        "{finalRemarks}"
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 italic">
                                                This application has reached a final decision and cannot be modified again.
                                            </p>
                                        </div>
                                    );
                                }

                                if (!isAuthorizedApprover || !isPendingAtMyLevel) {
                                    return (
                                        <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-500">
                                            <p className="text-[11px]">Currently pending review at: <strong className="text-slate-300">{selectedApp.currentLevel}</strong></p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3 border-t border-slate-800 pt-3">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Approver Decision &amp; Remarks
                                        </label>
                                        
                                        <textarea
                                            rows={2}
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 resize-none"
                                            placeholder="Enter approval remarks or reason for rejection (mandatory for rejects)..."
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                        />

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleTransition(selectedApp._id, "approve")}
                                                disabled={submittingAction}
                                                className="flex-1 py-2 bg-emerald-650 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 text-center"
                                            >
                                                {submittingAction ? "⏳ Processing..." : "✅ Approve"}
                                            </button>
                                            <button
                                                onClick={() => handleTransition(selectedApp._id, "reject")}
                                                disabled={submittingAction}
                                                className="flex-1 py-2 bg-rose-650 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 text-center"
                                            >
                                                {submittingAction ? "⏳ Processing..." : "✕ Reject"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ApprovalCenter;
