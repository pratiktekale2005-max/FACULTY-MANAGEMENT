import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function ApprovalCenter({ currentUser }) {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedApp, setSelectedApp] = useState(null);
    const [remarks, setRemarks] = useState("");
    const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'pending', 'approved', 'rejected', 'returned'

    const loadApprovals = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await api.get("/approvals");
            setApprovals(data.approvals || []);
        } catch (err) {
            console.error(err);
            setError("Failed to retrieve approvals queue ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApprovals();
    }, [currentUser]);

    const handleTransition = async (id, action) => {
        if (action !== "approve" && !remarks) {
            alert("A comment / remark is mandatory when rejecting or returning submissions ❌");
            return;
        }

        try {
            await api.post(`/approvals/${id}/transition`, { action, comment: remarks });
            alert(`Approval request successfully updated! ✅`);
            setRemarks("");
            setSelectedApp(null);
            loadApprovals();
        } catch (err) {
            alert(err.message || "Failed to update approval ❌");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "APPROVED": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            case "HOD_APPROVED": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
            case "SUBMITTED": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
            case "REJECTED": return "bg-rose-500/10 text-rose-450 border border-rose-500/20";
            case "RETURNED": return "bg-sky-500/10 text-sky-400 border border-sky-550/20";
            default: return "bg-slate-550/10 text-slate-400 border border-slate-500/20";
        }
    };

    const filteredList = approvals.filter(a => {
        if (activeFilter === "all") return true;
        if (activeFilter === "pending") return a.status === "SUBMITTED" || a.status === "HOD_APPROVED";
        if (activeFilter === "approved") return a.status === "APPROVED";
        if (activeFilter === "rejected") return a.status === "REJECTED";
        if (activeFilter === "returned") return a.status === "RETURNED";
        return true;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <p className="text-slate-400 text-xs italic">Loading approvals queue...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header section */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Academic Approval Center</h2>
                    <p className="text-slate-400 mt-1">
                        {currentUser.role === "Principal" || currentUser.role === "HOD"
                            ? "Review and authorize logged faculty workshops, publications, and professional activities"
                            : "Track submission status, HOD review remarks, and approval progress"
                        }
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2.5">
                {["all", "pending", "approved", "rejected", "returned"].map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-3 py-1.5 font-bold uppercase rounded-lg border transition-all text-[9px] tracking-wider ${activeFilter === f 
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15" 
                            : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-350"
                        }`}
                    >
                        {f} Queue ({approvals.filter(a => {
                            if (f === "all") return true;
                            if (f === "pending") return a.status === "SUBMITTED" || a.status === "HOD_APPROVED";
                            if (f === "approved") return a.status === "APPROVED";
                            if (f === "rejected") return a.status === "REJECTED";
                            if (f === "returned") return a.status === "RETURNED";
                            return true;
                        }).length})
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Approvals List Table */}
                <div className="lg:col-span-2 bg-[#101622] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Approvals Roster</h3>
                    
                    <div className="space-y-3">
                        {filteredList.length === 0 ? (
                            <p className="text-slate-500 italic py-6 text-center">No approval requests matching filters.</p>
                        ) : (
                            filteredList.map((a) => (
                                <div 
                                    key={a._id}
                                    onClick={() => setSelectedApp(a)}
                                    className={`p-4 bg-slate-950/40 hover:bg-slate-900/40 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all ${selectedApp?._id === a._id ? "border-indigo-650" : "border-slate-850"}`}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-200">{a.entityDetails?.title || a.entityDetails?.activityName || "Logged Activity"}</span>
                                            <span className="text-[9px] px-2 py-0.5 bg-slate-900 text-indigo-400 font-bold border border-slate-800 rounded uppercase">{a.entityType}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500">
                                            Submitted by: <strong className="text-slate-400">{a.submittedBy?.name}</strong> ({a.departmentId?.code}) &bull; {new Date(a.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 text-right">
                                        <div>
                                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadge(a.status)}`}>
                                                {a.status}
                                            </span>
                                            {a.currentLevel !== "COMPLETED" && (
                                                <span className="block text-[8px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Pending level: {a.currentLevel}</span>
                                            )}
                                        </div>
                                        <span className="text-slate-600 text-sm">→</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Inspect Details Column (right) */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg min-h-[300px]">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">Inspection Details</h3>
                    
                    {!selectedApp ? (
                        <p className="text-slate-550 italic py-12 text-center">Select an item from the roster to inspect details, view history, and perform actions.</p>
                    ) : (
                        <div className="space-y-5">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Submitter Details</span>
                                <p className="font-bold text-slate-200">{selectedApp.submittedBy?.name}</p>
                                <p className="text-slate-400 font-medium">{selectedApp.submittedBy?.designation} &bull; {selectedApp.submittedBy?.department}</p>
                            </div>

                            <div className="space-y-1 border-t border-slate-850 pt-3">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Logged Entity Details</span>
                                <h4 className="font-bold text-indigo-400 mt-1">{selectedApp.entityDetails?.title || selectedApp.entityDetails?.activityName}</h4>
                                <p className="text-slate-350 mt-1.5 leading-relaxed">{selectedApp.entityDetails?.description || "No description provided."}</p>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    Date: {selectedApp.entityDetails?.date || selectedApp.entityDetails?.time}
                                    {selectedApp.entityDetails?.venue && ` | Venue: ${selectedApp.entityDetails.venue}`}
                                    {selectedApp.entityDetails?.journal && ` | Journal: ${selectedApp.entityDetails.journal}`}
                                </p>
                            </div>

                            {/* Timeline history */}
                            <div className="space-y-2 border-t border-slate-850 pt-3">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Approval Timeline</span>
                                <div className="relative pl-4 border-l border-slate-850 space-y-3.5">
                                    {selectedApp.history && selectedApp.history.map((h, idx) => (
                                        <div key={idx} className="relative">
                                            <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-indigo-650 border border-[#101622]" />
                                            <p className="font-bold text-slate-200 text-[10px]">{h.status}</p>
                                            <p className="text-[9px] text-slate-500 mt-0.5">By: {h.actionByName} &bull; {new Date(h.date).toLocaleDateString()}</p>
                                            {h.comment && <p className="text-[9px] italic text-slate-400 mt-1 bg-slate-950/40 p-2 rounded-lg border border-slate-850">"{h.comment}"</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions Form */}
                            {(currentUser.role === "Principal" || currentUser.role === "HOD") && selectedApp.currentLevel === currentUser.role && (
                                <div className="space-y-3 border-t border-slate-850 pt-4">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Decision Actions</span>
                                    
                                    <textarea
                                        rows={2}
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-850 rounded-xl p-2.5 focus:outline-none resize-none"
                                        placeholder="Add evaluation comments (mandatory for corrections and rejects)..."
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleTransition(selectedApp._id, "approve")}
                                            className="flex-1 py-2 bg-emerald-650 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all text-center"
                                        >
                                            ✅ Approve
                                        </button>
                                        <button
                                            onClick={() => handleTransition(selectedApp._id, "return")}
                                            className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all text-center"
                                        >
                                            ↩️ Return
                                        </button>
                                        <button
                                            onClick={() => handleTransition(selectedApp._id, "reject")}
                                            className="flex-1 py-2 bg-rose-650 hover:bg-rose-600 text-white font-bold rounded-lg transition-all text-center"
                                        >
                                            ✕ Reject
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ApprovalCenter;
