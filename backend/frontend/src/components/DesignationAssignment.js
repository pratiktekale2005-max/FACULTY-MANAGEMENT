import React, { useState, useEffect } from "react";
import { api } from "../services/api";

const STANDARD_DESIGNATIONS = [
    "Assistant Professor",
    "Associate Professor",
    "Professor",
    "Professor & HOD",
    "Head of the Department",
    "Senior Professor",
    "Dean / Director",
    "Adjunct Faculty",
    "Visiting Professor",
    "Lecturer",
    "Senior Lecturer",
    "Research Associate",
    "Lab Instructor"
];

function DesignationAssignment({ currentUser, onRefresh, onSelectFaculty }) {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Filters state
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [designationFilter, setDesignationFilter] = useState("");

    // Row-specific state for inline editing
    const [selectedDesignations, setSelectedDesignations] = useState({});
    const [customInputs, setCustomInputs] = useState({});
    const [savingUserId, setSavingUserId] = useState(null);

    // Modal state for focused assignment
    const [modalUser, setModalUser] = useState(null);
    const [modalDesignation, setModalDesignation] = useState("");
    const [isCustomModal, setIsCustomModal] = useState(false);
    const [isSavingModal, setIsSavingModal] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const [deptData, userData] = await Promise.all([
                api.get("/departments"),
                api.get("/users")
            ]);

            const allDepts = deptData.departments || [];
            const allUsers = (userData.users || []).filter(u => u.role !== "Principal"); // Focus on Faculty and HODs

            setDepartments(allDepts);
            setUsers(allUsers);

            // Initialize inline selection mapping
            const initSelections = {};
            allUsers.forEach(u => {
                initSelections[u._id] = u.designation || "Assistant Professor";
            });
            setSelectedDesignations(initSelections);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load faculty roster for designation assignment ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filtered users list
    const filteredUsers = users.filter(u => {
        const matchesSearch = !search.trim() || 
            (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
            (u.employeeId && u.employeeId.toLowerCase().includes(search.toLowerCase()));

        const matchesDept = !deptFilter || 
            (u.departmentId?._id === deptFilter || u.departmentId === deptFilter);

        const matchesDesignation = !designationFilter || 
            (u.designation === designationFilter);

        return matchesSearch && matchesDept && matchesDesignation;
    });

    // Metric counts
    const totalFaculty = users.length;
    const assistantCount = users.filter(u => u.designation?.includes("Assistant")).length;
    const associateCount = users.filter(u => u.designation?.includes("Associate")).length;
    const professorCount = users.filter(u => u.designation?.toLowerCase() === "professor" || u.designation?.includes("Professor & HOD")).length;
    const otherCount = totalFaculty - (assistantCount + associateCount + professorCount);

    const handleInlineSelectChange = (userId, value) => {
        if (value === "__CUSTOM__") {
            setCustomInputs(prev => ({ ...prev, [userId]: true }));
            setSelectedDesignations(prev => ({ ...prev, [userId]: "" }));
        } else {
            setCustomInputs(prev => ({ ...prev, [userId]: false }));
            setSelectedDesignations(prev => ({ ...prev, [userId]: value }));
        }
    };

    const handleSaveInline = async (user) => {
        const newDesignation = selectedDesignations[user._id];
        if (!newDesignation || !newDesignation.trim()) {
            alert("Please specify a valid designation before saving ❌");
            return;
        }

        if (newDesignation.trim() === user.designation) {
            alert(`No change: ${user.name} already has designation '${user.designation}' ℹ️`);
            return;
        }

        try {
            setSavingUserId(user._id);
            setError("");
            setSuccess("");

            const res = await api.put(`/users/${user._id}/designation`, { designation: newDesignation.trim() });
            setSuccess(res.message || `Successfully assigned '${newDesignation}' to ${user.name}! ✅`);
            
            // Update local user record
            setUsers(prev => prev.map(u => u._id === user._id ? { ...u, designation: newDesignation.trim() } : u));
            setCustomInputs(prev => ({ ...prev, [user._id]: false }));

            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to update faculty designation ❌");
        } finally {
            setSavingUserId(null);
        }
    };

    const handleOpenModal = (user) => {
        setModalUser(user);
        const currentDesig = user.designation || "Assistant Professor";
        if (STANDARD_DESIGNATIONS.includes(currentDesig)) {
            setModalDesignation(currentDesig);
            setIsCustomModal(false);
        } else {
            setModalDesignation(currentDesig);
            setIsCustomModal(true);
        }
    };

    const handleSaveModal = async (e) => {
        e.preventDefault();
        if (!modalUser || !modalDesignation.trim()) {
            alert("Please enter or select a valid designation ❌");
            return;
        }

        try {
            setIsSavingModal(true);
            setError("");
            setSuccess("");

            const res = await api.put(`/users/${modalUser._id}/designation`, { designation: modalDesignation.trim() });
            setSuccess(res.message || `Successfully updated designation for ${modalUser.name}! ✅`);
            
            setUsers(prev => prev.map(u => u._id === modalUser._id ? { ...u, designation: modalDesignation.trim() } : u));
            setSelectedDesignations(prev => ({ ...prev, [modalUser._id]: modalDesignation.trim() }));
            
            setModalUser(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to save designation ❌");
        } finally {
            setIsSavingModal(false);
        }
    };

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header Dashboard Banner */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>🎖️</span> Designation Assignment
                    </h2>
                    <p className="text-slate-400 mt-1 text-[11px]">
                        Assign, update, and manage official academic and administrative designations across all institutional faculty members
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                        title="Reload roster and designations"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Faculty</p>
                    <p className="text-lg font-bold text-slate-100 mt-1">{totalFaculty}</p>
                </div>
                <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl shadow-md">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Assistant Profs</p>
                    <p className="text-lg font-bold text-indigo-300 mt-1">{assistantCount}</p>
                </div>
                <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl shadow-md">
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Associate Profs</p>
                    <p className="text-lg font-bold text-sky-300 mt-1">{associateCount}</p>
                </div>
                <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl shadow-md">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Professors & HODs</p>
                    <p className="text-lg font-bold text-emerald-300 mt-1">{professorCount + otherCount}</p>
                </div>
            </div>

            {/* Alerts Feedback Banner */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl animate-fade-in flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-300 font-bold ml-3">✕</button>
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl animate-fade-in flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span>{success}</span>
                    </div>
                    <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-300 font-bold ml-3">✕</button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                    <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                        <input
                            type="text"
                            placeholder="Search by name, email, employee ID..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button 
                                onClick={() => setSearch("")} 
                                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <select
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                    </select>

                    <select
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={designationFilter}
                        onChange={(e) => setDesignationFilter(e.target.value)}
                    >
                        <option value="">All Designations</option>
                        {STANDARD_DESIGNATIONS.map(des => (
                            <option key={des} value={des}>{des}</option>
                        ))}
                    </select>
                </div>

                {(search || deptFilter || designationFilter) && (
                    <button
                        onClick={() => { setSearch(""); setDeptFilter(""); setDesignationFilter(""); }}
                        className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-all"
                    >
                        🧹 Clear Filters
                    </button>
                )}
            </div>

            {/* Designation Assignment Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <span>👥</span> Faculty Members ({filteredUsers.length})
                    </h3>
                    <p className="text-[10px] text-slate-500">
                        Select designation and click <span className="text-indigo-400 font-bold">Save</span> to apply changes
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4 w-16">Serial No.</th>
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Faculty Member (Click for Profile)</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Role</th>
                                <th className="py-3 px-4">Current Designation</th>
                                <th className="py-3 px-4 min-w-[240px]">Assign Designation</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                                        Loading faculty directory and designation records...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                                        No faculty members found matching selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u, idx) => {
                                    const currentDesig = u.designation || "Assistant Professor";
                                    const selectedDesig = selectedDesignations[u._id] !== undefined ? selectedDesignations[u._id] : currentDesig;
                                    const isCustom = customInputs[u._id];
                                    const hasChanged = selectedDesig.trim() !== currentDesig;
                                    const isSaving = savingUserId === u._id;

                                    return (
                                        <tr key={u._id} className="hover:bg-slate-900/40 transition-colors group">
                                            <td className="py-3.5 px-4 font-mono text-indigo-400 font-bold text-center">
                                                {String(idx + 1).padStart(2, "0")}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-slate-350">{u.employeeId || "—"}</td>
                                            
                                            <td className="py-3.5 px-4">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectFaculty && onSelectFaculty(u)}
                                                    className="font-bold text-slate-200 hover:text-indigo-300 text-left transition flex items-center gap-1.5 cursor-pointer group-hover:underline"
                                                    title={`View complete academic profile of ${u.name}`}
                                                >
                                                    <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold">
                                                        {u.name ? u.name.charAt(0).toUpperCase() : "👤"}
                                                    </span>
                                                    <span>{u.name}</span>
                                                    <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                                </button>
                                                <div className="text-[10px] text-slate-500 mt-0.5">{u.email}</div>
                                            </td>

                                            <td className="py-3.5 px-4 text-slate-350">
                                                {u.department || u.departmentId?.name || "—"}
                                            </td>

                                            <td className="py-3.5 px-4 font-bold uppercase">
                                                <span className={`px-2 py-0.5 rounded text-[9px] ${
                                                    u.role === "HOD" 
                                                        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                                                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-300">
                                                    {currentDesig}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    {isCustom ? (
                                                        <div className="flex items-center gap-1.5 flex-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Enter custom title..."
                                                                className="w-full bg-slate-950 border border-indigo-500/60 rounded-xl px-3 py-1.5 text-slate-200 text-[11px] focus:outline-none"
                                                                value={selectedDesig}
                                                                onChange={(e) => setSelectedDesignations(prev => ({ ...prev, [u._id]: e.target.value }))}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    setCustomInputs(prev => ({ ...prev, [u._id]: false }));
                                                                    setSelectedDesignations(prev => ({ ...prev, [u._id]: currentDesig }));
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg text-[10px]"
                                                                title="Cancel custom title"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            className={`w-full bg-slate-950 border rounded-xl px-3 py-1.5 text-[11px] transition-colors focus:outline-none ${
                                                                hasChanged 
                                                                    ? "border-indigo-500 text-indigo-300 font-semibold" 
                                                                    : "border-slate-800 text-slate-300"
                                                            }`}
                                                            value={STANDARD_DESIGNATIONS.includes(selectedDesig) ? selectedDesig : "__CUSTOM__"}
                                                            onChange={(e) => handleInlineSelectChange(u._id, e.target.value)}
                                                        >
                                                            {STANDARD_DESIGNATIONS.map(des => (
                                                                <option key={des} value={des}>{des}</option>
                                                            ))}
                                                            <option value="__CUSTOM__">✏️ Custom Designation...</option>
                                                        </select>
                                                    )}

                                                    <button
                                                        onClick={() => handleSaveInline(u)}
                                                        disabled={isSaving || !hasChanged}
                                                        className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                                                            hasChanged 
                                                                ? "bg-indigo-650 hover:bg-indigo-600 text-white shadow-md shadow-indigo-650/20 cursor-pointer" 
                                                                : "bg-slate-900/60 border border-slate-850 text-slate-600 cursor-not-allowed"
                                                        }`}
                                                        title={hasChanged ? "Save updated designation" : "No changes to save"}
                                                    >
                                                        {isSaving ? "⏳" : "💾 Save"}
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleOpenModal(u)}
                                                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-200 font-bold rounded-lg transition-all"
                                                    title="Open detailed assignment modal"
                                                >
                                                    ⚙️ Assign
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Focused Designation Assignment Modal */}
            {modalUser && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span>🎖️</span> Assign Designation
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Configure academic designation for faculty profile
                                </p>
                            </div>
                            <button
                                onClick={() => setModalUser(null)}
                                className="text-slate-500 hover:text-slate-300 text-base font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Faculty Profile Summary */}
                        <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 text-[12px]">{modalUser.name}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    modalUser.role === "HOD" ? "bg-sky-500/10 text-sky-400" : "bg-indigo-500/10 text-indigo-400"
                                }`}>
                                    {modalUser.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{modalUser.email}</div>
                            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                                <span>Dept: <strong className="text-slate-300">{modalUser.department || modalUser.departmentId?.name || "—"}</strong></span>
                                <span>Current: <strong className="text-indigo-400">{modalUser.designation || "Assistant Professor"}</strong></span>
                            </div>
                        </div>

                        <form onSubmit={handleSaveModal} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Select New Designation *
                                </label>
                                
                                {!isCustomModal ? (
                                    <div className="space-y-2">
                                        <select
                                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                            value={STANDARD_DESIGNATIONS.includes(modalDesignation) ? modalDesignation : "__CUSTOM__"}
                                            onChange={(e) => {
                                                if (e.target.value === "__CUSTOM__") {
                                                    setIsCustomModal(true);
                                                    setModalDesignation("");
                                                } else {
                                                    setModalDesignation(e.target.value);
                                                }
                                            }}
                                        >
                                            {STANDARD_DESIGNATIONS.map(des => (
                                                <option key={des} value={des}>{des}</option>
                                            ))}
                                            <option value="__CUSTOM__">✏️ Custom Designation...</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Distinguished Professor, Research Chair..."
                                            className="w-full bg-slate-950 border border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none"
                                            value={modalDesignation}
                                            onChange={(e) => setModalDesignation(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomModal(false);
                                                setModalDesignation("Assistant Professor");
                                            }}
                                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                                        >
                                            ← Switch back to standard options
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setModalUser(null)}
                                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingModal || !modalDesignation.trim()}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSavingModal ? "Saving..." : "Confirm & Save Designation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DesignationAssignment;
