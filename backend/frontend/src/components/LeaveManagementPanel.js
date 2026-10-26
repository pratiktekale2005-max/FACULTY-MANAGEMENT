import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function LeaveManagementPanel({ currentUser }) {
    const [leavesData, setLeavesData] = useState({ totalQuota: 12, used: 0, remaining: 12, leaves: [] });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingLeaveId, setEditingLeaveId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        subject: "Academic Leave Request",
        startDate: "",
        endDate: "",
        leaveType: "Casual Leave",
        reason: "",
        attachment: "",
        attachmentName: ""
    });

    // Department leaves for HOD and Principal review
    const [deptLeaves, setDeptLeaves] = useState([]);
    const [loadingDeptLeaves, setLoadingDeptLeaves] = useState(false);
    const [reviewingLeave, setReviewingLeave] = useState(null);
    const [reviewRemarks, setReviewRemarks] = useState("");
    const [processingReview, setProcessingReview] = useState(false);

    const [msg, setMsg] = useState("");
    const [errMsg, setErrMsg] = useState("");

    const isApprover = currentUser?.role === "HOD" || currentUser?.role === "Principal";

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const data = await api.get("/leaves/my-leaves");
            if (data && data.success) {
                setLeavesData(data);
            }
        } catch (err) {
            console.error("Failed to load leaves:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadDeptLeaves = async () => {
        if (!isApprover) return;
        setLoadingDeptLeaves(true);
        try {
            const data = await api.get("/leaves/department-leaves");
            if (data && data.leaves) {
                setDeptLeaves(data.leaves);
            }
        } catch (err) {
            console.error("Failed to load department leaves:", err);
        } finally {
            setLoadingDeptLeaves(false);
        }
    };

    useEffect(() => {
        loadLeaves();
        if (isApprover) {
            loadDeptLeaves();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Handle file attachment (Medical certificates, leave letters, etc.)
    const handleAttachmentChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSizeBytes = 5 * 1024 * 1024;
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

        if (!validTypes.includes(file.type.toLowerCase())) {
            alert(`"${file.name}" is not supported. Please upload a PDF, JPG, or PNG document.`);
            return;
        }
        if (file.size > maxSizeBytes) {
            alert(`"${file.name}" exceeds the 5MB size limit.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setForm(prev => ({
                ...prev,
                attachment: reader.result,
                attachmentName: file.name
            }));
        };
        reader.readAsDataURL(file);
    };

    // Open Apply Modal
    const handleOpenApply = () => {
        setEditingLeaveId(null);
        setForm({
            subject: "Academic Leave Request",
            startDate: "",
            endDate: "",
            leaveType: "Casual Leave",
            reason: "",
            attachment: "",
            attachmentName: ""
        });
        setErrMsg("");
        setShowModal(true);
    };

    // Open Edit Modal for eligible applications
    const handleOpenEdit = (leave) => {
        if (leave.status !== "PENDING") {
            setErrMsg("Only pending applications can be edited. This leave is already processed ❌");
            setTimeout(() => setErrMsg(""), 4000);
            return;
        }

        setEditingLeaveId(leave._id);
        setForm({
            subject: leave.subject || "Academic Leave Request",
            startDate: leave.startDate ? leave.startDate.split("T")[0] : "",
            endDate: leave.endDate ? leave.endDate.split("T")[0] : "",
            leaveType: leave.leaveType || "Casual Leave",
            reason: leave.reason || "",
            attachment: leave.attachment || "",
            attachmentName: leave.attachmentName || ""
        });
        setErrMsg("");
        setShowModal(true);
    };

    // Submit Add or Edit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.startDate || !form.endDate) {
            setErrMsg("Please select start date and end date ❌");
            return;
        }

        if (new Date(form.startDate) > new Date(form.endDate)) {
            setErrMsg("Start date cannot be after end date ❌");
            return;
        }

        setSubmitting(true);
        setErrMsg("");
        setMsg("");

        try {
            if (editingLeaveId) {
                const res = await api.put(`/leaves/${editingLeaveId}`, form);
                setMsg(res.message || "Leave application updated successfully! ✅");
            } else {
                const res = await api.post("/leaves/apply", form);
                setMsg(res.message || "Leave application submitted and routed to HOD! 🏖️✅");
            }
            setShowModal(false);
            setForm({
                subject: "Academic Leave Request",
                startDate: "",
                endDate: "",
                leaveType: "Casual Leave",
                reason: "",
                attachment: "",
                attachmentName: ""
            });
            setEditingLeaveId(null);
            loadLeaves();
            if (isApprover) loadDeptLeaves();
            setTimeout(() => setMsg(""), 5000);
        } catch (err) {
            console.error("Save leave error:", err);
            setErrMsg(err.response?.data?.error || err.message || "Failed to save leave application ❌");
        } finally {
            setSubmitting(false);
        }
    };

    // Approver actions (HOD or Principal)
    const handleProcessReview = async (leaveId, action) => {
        setProcessingReview(true);
        try {
            const res = await api.put(`/leaves/${leaveId}/review`, {
                action,
                remarks: reviewRemarks.trim() || (action === "approve" ? "Approved" : "Rejected")
            });
            setMsg(res.message || `Leave application ${action}d successfully! ✅`);
            setReviewingLeave(null);
            setReviewRemarks("");
            await loadDeptLeaves();
            await loadLeaves();
            setTimeout(() => setMsg(""), 5000);
        } catch (err) {
            console.error("Review leave error:", err);
            alert(err.response?.data?.error || err.message || "Failed to review leave application ❌");
        } finally {
            setProcessingReview(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🏖️</span> Faculty Leave &amp; Absence Portal
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Track academic leave quotas, submit leave requests with official letters, and review department approvals.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenApply}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                        <span>➕</span> Apply For Leave
                    </button>
                    <button
                        onClick={() => {
                            loadLeaves();
                            if (isApprover) loadDeptLeaves();
                        }}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="Refresh Leaves"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {msg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center justify-between animate-fade-in">
                    <span>{msg}</span>
                    <button onClick={() => setMsg("")} className="font-bold cursor-pointer">✕</button>
                </div>
            )}
            {errMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between animate-fade-in">
                    <span>{errMsg}</span>
                    <button onClick={() => setErrMsg("")} className="font-bold cursor-pointer">✕</button>
                </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Annual Quota</p>
                    <p className="text-3xl font-bold text-slate-100 mt-1">{leavesData.totalQuota} <span className="text-sm font-normal text-slate-500">days</span></p>
                    <span className="text-[10px] text-slate-400">Institutional allocation</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Days Utilized</p>
                    <p className="text-3xl font-bold text-amber-400 mt-1">{leavesData.used} <span className="text-sm font-normal text-slate-500">days</span></p>
                    <span className="text-[10px] text-slate-400">Approved leaves</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Remaining Balance</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">{leavesData.remaining} <span className="text-sm font-normal text-slate-500">days</span></p>
                    <span className="text-[10px] text-slate-400">Available to apply</span>
                </div>
            </div>

            {/* ================= HOD / PRINCIPAL REVIEW ROSTER ================= */}
            {isApprover && (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-sm font-bold">📋</span>
                            <div>
                                <h3 className="text-sm font-bold text-white">
                                    {currentUser.role === "HOD" ? "Department Leave Review Queue" : "Institutional Leave Approvals (Principal)"}
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    {currentUser.role === "HOD"
                                        ? "Review faculty leaves and forward recommended requests to Principal."
                                        : "Grant final institutional approval or record decisions on faculty leaves."
                                    }
                                </p>
                            </div>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg font-bold">
                            {deptLeaves.filter(l => currentUser.role === "HOD" ? (l.currentLevel === "HOD" && l.status === "PENDING") : l.currentLevel === "PRINCIPAL").length} Pending Your Action
                        </span>
                    </div>

                    {loadingDeptLeaves ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            Loading department leave requests...
                        </div>
                    ) : deptLeaves.length === 0 ? (
                        <p className="text-slate-500 text-xs italic py-4 text-center">
                            No faculty leave applications found for review.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-3.5">Faculty Member</th>
                                        <th className="py-3 px-3.5">Leave Type &amp; Purpose</th>
                                        <th className="py-3 px-3.5 whitespace-nowrap">Dates</th>
                                        <th className="py-3 px-3.5">Reason</th>
                                        <th className="py-3 px-3.5 text-center">Attachment</th>
                                        <th className="py-3 px-3.5 text-center">Current Status</th>
                                        <th className="py-3 px-3.5 text-center">Decision</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {deptLeaves.map((dl) => {
                                        const isActionable = currentUser.role === "HOD" 
                                            ? (dl.currentLevel === "HOD" && dl.status === "PENDING")
                                            : (dl.currentLevel === "PRINCIPAL");

                                        return (
                                            <tr key={dl._id} className="hover:bg-slate-850/40 transition">
                                                <td className="py-3 px-3.5">
                                                    <span className="font-bold text-slate-200 block">{dl.facultyName || dl.userId?.name}</span>
                                                    <span className="text-[10px] text-slate-500">{dl.department || dl.userId?.department}</span>
                                                </td>
                                                <td className="py-3 px-3.5">
                                                    <span className="font-semibold text-indigo-300 block">{dl.leaveType}</span>
                                                    <span className="text-[10px] text-slate-400">{dl.subject || "Academic Leave"}</span>
                                                </td>
                                                <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                                                    {dl.startDate} to {dl.endDate}
                                                </td>
                                                <td className="py-3 px-3.5 text-slate-400 max-w-xs truncate" title={dl.reason}>
                                                    {dl.reason || "Not specified"}
                                                </td>
                                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                                    {dl.attachment ? (
                                                        <a
                                                            href={dl.attachment}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            download={dl.attachmentName || "Leave_Attachment"}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-600/10 px-2 py-1 rounded border border-indigo-500/20"
                                                        >
                                                            <span>📎</span> View File
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-600">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        dl.status === "APPROVED"
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                            : dl.status === "REJECTED"
                                                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                                : dl.status === "HOD_APPROVED"
                                                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                    }`}>
                                                        {dl.status === "HOD_APPROVED" ? "HOD Approved → Principal" : dl.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                                    {isActionable ? (
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReviewingLeave(dl);
                                                                    setReviewRemarks("");
                                                                }}
                                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                                            >
                                                                Review / Action
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-600 italic">
                                                            {dl.status === "APPROVED" ? "Completed ✓" : dl.status === "REJECTED" ? "Rejected ✕" : "In Progress"}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Leaves Table (Faculty View) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">My Leave Applications &amp; History</h3>
                    <span className="text-[11px] text-slate-500">
                        {leavesData.leaves?.length || 0} application{leavesData.leaves?.length === 1 ? "" : "s"}
                    </span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Loading leave records...
                    </div>
                ) : (leavesData.leaves || []).length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        No leave applications recorded yet. Click &quot;Apply For Leave&quot; above to submit an application.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Subject &amp; Type</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Start Date</th>
                                    <th className="py-3 px-4 whitespace-nowrap">End Date</th>
                                    <th className="py-3 px-4">Reason / Remarks</th>
                                    <th className="py-3 px-4 text-center">Attachment</th>
                                    <th className="py-3 px-4 text-center">Approval Status</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {leavesData.leaves.map((l) => {
                                    const isPending = l.status === "PENDING";
                                    const startDateStr = l.startDate ? new Date(l.startDate).toLocaleDateString() : "—";
                                    const endDateStr = l.endDate ? new Date(l.endDate).toLocaleDateString() : "—";

                                    return (
                                        <tr key={l._id} className="hover:bg-slate-850/40 transition">
                                            {/* Leave Type & Subject */}
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-slate-200 block">{l.leaveType}</span>
                                                <span className="text-[10px] text-slate-400">{l.subject || "Academic Leave"}</span>
                                            </td>

                                            {/* Start Date */}
                                            <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                                                {startDateStr}
                                            </td>

                                            {/* End Date */}
                                            <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                                                {endDateStr}
                                            </td>

                                            {/* Reason & Approver Remarks */}
                                            <td className="py-3 px-4 max-w-xs">
                                                <p className="text-slate-300 truncate" title={l.reason}>{l.reason || "Personal work"}</p>
                                                {l.hodRemarks && (
                                                    <span className="text-[10px] text-amber-400 block mt-0.5">
                                                        HOD: {l.hodRemarks}
                                                    </span>
                                                )}
                                                {l.principalRemarks && (
                                                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                                                        Principal: {l.principalRemarks}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Attachment */}
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                {l.attachment ? (
                                                    <a
                                                        href={l.attachment}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        download={l.attachmentName || "Leave_Document"}
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-600/10 px-2 py-1 rounded border border-indigo-500/20"
                                                    >
                                                        <span>📎</span> Document
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-600 text-[10px]">—</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    l.status === "APPROVED"
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : l.status === "REJECTED"
                                                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                            : l.status === "HOD_APPROVED"
                                                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                }`}>
                                                    {l.status === "HOD_APPROVED" ? "HOD Approved → Principal" : l.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                {isPending ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(l)}
                                                        className="px-2.5 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition flex items-center gap-1 mx-auto cursor-pointer"
                                                        title="Edit this pending application"
                                                    >
                                                        <span>✏️</span> Edit
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 italic select-none">
                                                        Locked
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Apply / Edit Leave Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>{editingLeaveId ? "✏️" : "🏖️"}</span>
                                <span>{editingLeaveId ? "Edit Leave Application" : "Apply For Academic Leave"}</span>
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer font-bold">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Application Subject *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Medical Leave for Hospitalization or Casual Leave"
                                    value={form.subject}
                                    onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Leave Type *</label>
                                <select
                                    value={form.leaveType}
                                    onChange={(e) => setForm(prev => ({ ...prev, leaveType: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value="Casual Leave">Casual Leave (CL)</option>
                                    <option value="Medical Leave">Medical Leave (ML)</option>
                                    <option value="On Duty (OD)">On Duty / Conference / Exam Duty (OD)</option>
                                    <option value="Earned Leave">Earned Leave (EL)</option>
                                    <option value="Compensatory Leave">Compensatory Off</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.startDate}
                                        onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.endDate}
                                        onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason / Justification</label>
                                <textarea
                                    rows="3"
                                    placeholder="Explain the reason for leave and class handover arrangements..."
                                    value={form.reason}
                                    onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            {/* Attachment Upload */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Official Letter / Medical Certificate Attachment (Optional, PDF or Image up to 5MB)
                                </label>
                                <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 bg-slate-950/60 text-center">
                                    <input
                                        type="file"
                                        id="leaveAttachmentInput"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        className="hidden"
                                        onChange={handleAttachmentChange}
                                    />
                                    <label htmlFor="leaveAttachmentInput" className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold flex items-center justify-center gap-2">
                                        <span>📎</span>
                                        <span>{form.attachmentName ? `Selected: ${form.attachmentName}` : "Choose Document (PDF, JPG, PNG)"}</span>
                                    </label>
                                </div>
                                {form.attachment && (
                                    <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg mt-2 border border-emerald-500/20">
                                        <span>✓ File ready: {form.attachmentName}</span>
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, attachment: "", attachmentName: "" }))}
                                            className="text-rose-400 hover:text-rose-300 font-bold ml-2 cursor-pointer"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                                >
                                    {submitting ? "Submitting..." : editingLeaveId ? "Update Application" : "Submit to HOD & Principal"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Decision Modal (For HOD & Principal) */}
            {reviewingLeave && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>⚖️</span> Review Leave Application
                            </h3>
                            <button onClick={() => setReviewingLeave(null)} className="text-slate-400 hover:text-white cursor-pointer font-bold">✕</button>
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                            <p className="text-slate-200 font-bold">{reviewingLeave.facultyName || reviewingLeave.userId?.name}</p>
                            <p className="text-indigo-400 font-semibold">{reviewingLeave.leaveType} ({reviewingLeave.startDate} to {reviewingLeave.endDate})</p>
                            <p className="text-slate-400"><strong className="text-slate-300">Reason:</strong> {reviewingLeave.reason || "Not specified"}</p>
                            {reviewingLeave.attachment && (
                                <div className="pt-1">
                                    <a
                                        href={reviewingLeave.attachment}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={reviewingLeave.attachmentName || "Leave_Attachment"}
                                        className="text-indigo-400 underline font-semibold flex items-center gap-1"
                                    >
                                        <span>📎</span> View Attached Letter / Medical Document
                                    </a>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Evaluation Remarks / Comments (Mandatory for rejection)
                            </label>
                            <textarea
                                rows="3"
                                placeholder={currentUser.role === "HOD" ? "Add recommendation remarks for Principal..." : "Add institutional approval remarks..."}
                                value={reviewRemarks}
                                onChange={(e) => setReviewRemarks(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setReviewingLeave(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={processingReview}
                                onClick={() => handleProcessReview(reviewingLeave._id, "reject")}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                            >
                                ✕ Reject
                            </button>
                            <button
                                type="button"
                                disabled={processingReview}
                                onClick={() => handleProcessReview(reviewingLeave._id, "approve")}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                            >
                                {processingReview ? "Processing..." : currentUser.role === "HOD" ? "✓ Recommend to Principal" : "✓ Grant Final Approval"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaveManagementPanel;
