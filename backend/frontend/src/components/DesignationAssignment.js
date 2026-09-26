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
    const [roleFilter, setRoleFilter] = useState("");

    // Row-specific state for inline editing
    const [selectedDesignations, setSelectedDesignations] = useState({});
    const [selectedRoles, setSelectedRoles] = useState({});
    const [customInputs, setCustomInputs] = useState({});
    const [savingUserId, setSavingUserId] = useState(null);

    // Modal state for focused assignment
    const [modalUser, setModalUser] = useState(null);
    const [modalDesignation, setModalDesignation] = useState("");
    const [modalRole, setModalRole] = useState("Faculty");
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
            const initRoles = {};
            allUsers.forEach(u => {
                initSelections[u._id] = u.designation || "Assistant Professor";
                initRoles[u._id] = u.role || "Faculty";
            });
            setSelectedDesignations(initSelections);
            setSelectedRoles(initRoles);
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

        const matchesRole = !roleFilter || (u.role === roleFilter);

        return matchesSearch && matchesDept && matchesDesignation && matchesRole;
    });

    // Metric counts
    const totalFaculty = users.length;
    const hodCount = users.filter(u => u.role === "HOD").length;
    const assistantCount = users.filter(u => u.designation?.includes("Assistant")).length;
    const associateCount = users.filter(u => u.designation?.includes("Associate")).length;
    const professorCount = users.filter(u => u.designation?.toLowerCase() === "professor" || u.designation?.includes("Professor & HOD")).length;

    // Handle inline role change
    const handleRoleChangeInline = (userId, newRole) => {
        setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));
        
        const currentDesig = selectedDesignations[userId] || "";
        if (newRole === "HOD") {
            if (!currentDesig.toLowerCase().includes("hod") && !currentDesig.toLowerCase().includes("head of")) {
                setSelectedDesignations(prev => ({ ...prev, [userId]: "Professor & HOD" }));
            }
        } else if (newRole === "Faculty") {
            if (currentDesig === "Professor & HOD" || currentDesig === "Head of the Department") {
                setSelectedDesignations(prev => ({ ...prev, [userId]: "Professor" }));
            }
        }
    };

    // Handle inline designation select change
    const handleInlineSelectChange = (userId, value) => {
        if (value === "__CUSTOM__") {
            setCustomInputs(prev => ({ ...prev, [userId]: true }));
            setSelectedDesignations(prev => ({ ...prev, [userId]: "" }));
        } else {
            setCustomInputs(prev => ({ ...prev, [userId]: false }));
            setSelectedDesignations(prev => ({ ...prev, [userId]: value }));

            // If selecting an HOD designation, automatically promote role to HOD
            if (value === "Professor & HOD" || value === "Head of the Department") {
                setSelectedRoles(prev => ({ ...prev, [userId]: "HOD" }));
            }
        }
    };

    // Inline Save
    const handleSaveInline = async (user) => {
        const newDesignation = selectedDesignations[user._id];
        const newRole = selectedRoles[user._id] || user.role || "Faculty";

        if (!newDesignation || !newDesignation.trim()) {
            alert("Please specify a valid designation before saving ❌");
            return;
        }

        if (newDesignation.trim() === user.designation && newRole === user.role) {
            alert(`No change: ${user.name} is already ${user.role} with designation '${user.designation}' ℹ️`);
            return;
        }

        try {
            setSavingUserId(user._id);
            setError("");
            setSuccess("");

            const res = await api.put(`/users/${user._id}/designation`, { 
                designation: newDesignation.trim(),
                role: newRole
            });

            const successMsg = res.message || `Successfully updated ${user.name} to ${newRole} ('${newDesignation.trim()}')! ✅`;
            setSuccess(successMsg);
            
            // Update local user record
            const targetDeptId = user.departmentId?._id || user.departmentId;
            const targetDeptName = user.department;

            setUsers(prev => prev.map(u => {
                if (u._id === user._id) {
                    return { 
                        ...u, 
                        designation: newDesignation.trim(), 
                        role: newRole,
                        ...(res.user || {})
                    };
                }
                // If this user was promoted to HOD, demote previous HOD in the same department
                if (newRole === "HOD" && u.role === "HOD") {
                    const sameDept = (targetDeptId && (u.departmentId?._id === targetDeptId || u.departmentId === targetDeptId)) ||
                                     (targetDeptName && u.department === targetDeptName);
                    if (sameDept) {
                        return { 
                            ...u, 
                            role: "Faculty",
                            designation: (u.designation === "Professor & HOD" || u.designation === "Head of the Department") ? "Professor" : u.designation
                        };
                    }
                }
                return u;
            }));

            // Sync selectedRoles and customInputs
            setSelectedRoles(prev => {
                const next = { ...prev, [user._id]: newRole };
                if (newRole === "HOD") {
                    users.forEach(u => {
                        if (u._id !== user._id && u.role === "HOD") {
                            const sameDept = (targetDeptId && (u.departmentId?._id === targetDeptId || u.departmentId === targetDeptId)) ||
                                             (targetDeptName && u.department === targetDeptName);
                            if (sameDept) {
                                next[u._id] = "Faculty";
                            }
                        }
                    });
                }
                return next;
            });

            setCustomInputs(prev => ({ ...prev, [user._id]: false }));

            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to update faculty designation and role ❌");
        } finally {
            setSavingUserId(null);
        }
    };

    // Open detailed modal
    const handleOpenModal = (user) => {
        setModalUser(user);
        setModalRole(user.role || "Faculty");
        const currentDesig = user.designation || "Assistant Professor";
        if (STANDARD_DESIGNATIONS.includes(currentDesig)) {
            setModalDesignation(currentDesig);
            setIsCustomModal(false);
        } else {
            setModalDesignation(currentDesig);
            setIsCustomModal(true);
        }
    };

    // Modal Save
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

            const res = await api.put(`/users/${modalUser._id}/designation`, { 
                designation: modalDesignation.trim(),
                role: modalRole
            });

            const successMsg = res.message || `Successfully updated ${modalUser.name} as ${modalRole} ('${modalDesignation.trim()}')! ✅`;
            setSuccess(successMsg);
            
            const targetDeptId = modalUser.departmentId?._id || modalUser.departmentId;
            const targetDeptName = modalUser.department;

            setUsers(prev => prev.map(u => {
                if (u._id === modalUser._id) {
                    return { 
                        ...u, 
                        designation: modalDesignation.trim(), 
                        role: modalRole,
                        ...(res.user || {})
                    };
                }
                if (modalRole === "HOD" && u.role === "HOD") {
                    const sameDept = (targetDeptId && (u.departmentId?._id === targetDeptId || u.departmentId === targetDeptId)) ||
                                     (targetDeptName && u.department === targetDeptName);
                    if (sameDept) {
                        return { 
                            ...u, 
                            role: "Faculty",
                            designation: (u.designation === "Professor & HOD" || u.designation === "Head of the Department") ? "Professor" : u.designation
                        };
                    }
                }
                return u;
            }));

            setSelectedDesignations(prev => ({ ...prev, [modalUser._id]: modalDesignation.trim() }));
            setSelectedRoles(prev => ({ ...prev, [modalUser._id]: modalRole }));
            
            setModalUser(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to save designation and role ❌");
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
                        <span>🎖️</span> Designation & HOD Role Assignment
                    </h2>
                    <p className="text-slate-400 mt-1 text-[11px]">
                        Assign academic designations and appoint Head of the Department (HOD) leaders across all institutional departments
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
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">👑 HODs / Dept Heads</p>
                    <p className="text-lg font-bold text-sky-300 mt-1">{hodCount}</p>
                </div>
                <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl shadow-md">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Assistant Profs</p>
                    <p className="text-lg font-bold text-indigo-300 mt-1">{assistantCount}</p>
                </div>
                <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl shadow-md">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Associate & Professors</p>
                    <p className="text-lg font-bold text-emerald-300 mt-1">{associateCount + professorCount}</p>
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
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">All Roles</option>
                        <option value="Faculty">Faculty Only</option>
                        <option value="HOD">HODs Only</option>
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

                {(search || deptFilter || roleFilter || designationFilter) && (
                    <button
                        onClick={() => { setSearch(""); setDeptFilter(""); setRoleFilter(""); setDesignationFilter(""); }}
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
                        Adjust Role (Faculty / HOD) or Designation, then click <span className="text-indigo-400 font-bold">Save</span>
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4 w-16 text-center">Serial No.</th>
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Faculty Member (Click for Profile)</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4 min-w-[130px]">Role / Position</th>
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
                                    const selectedRole = selectedRoles[u._id] !== undefined ? selectedRoles[u._id] : (u.role || "Faculty");
                                    const isCustom = customInputs[u._id];
                                    const hasChanged = selectedDesig.trim() !== currentDesig || selectedRole !== u.role;
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
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                                        selectedRole === "HOD"
                                                            ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                    }`}>
                                                        {selectedRole === "HOD" ? "👑" : (u.name ? u.name.charAt(0).toUpperCase() : "👤")}
                                                    </span>
                                                    <span>{u.name}</span>
                                                    <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                                </button>
                                                <div className="text-[10px] text-slate-500 mt-0.5">{u.email}</div>
                                            </td>

                                            <td className="py-3.5 px-4 text-slate-350 font-medium">
                                                {u.department || u.departmentId?.name || "—"}
                                            </td>

                                            {/* Role Selector (Faculty vs HOD) */}
                                            <td className="py-3.5 px-4">
                                                <select
                                                    value={selectedRole}
                                                    onChange={(e) => handleRoleChangeInline(u._id, e.target.value)}
                                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer focus:outline-none ${
                                                        selectedRole === "HOD"
                                                            ? "bg-sky-500/20 border-sky-400/60 text-sky-200 shadow-sm"
                                                            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                                                    }`}
                                                    title={`Assign ${u.name} as Faculty or Department HOD`}
                                                >
                                                    <option value="Faculty" className="bg-slate-900 text-indigo-300">👨‍🏫 Faculty</option>
                                                    <option value="HOD" className="bg-slate-900 text-sky-300">👑 HOD</option>
                                                </select>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                                                    u.role === "HOD"
                                                        ? "bg-sky-950/40 border-sky-800 text-sky-300"
                                                        : "bg-slate-950 border-slate-800 text-slate-300"
                                                }`}>
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
                                                        title={hasChanged ? "Save updated designation & role" : "No changes to save"}
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

            {/* Focused Designation & Role Assignment Modal */}
            {modalUser && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span>🎖️</span> Assign Designation & Role
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Configure academic designation and administrative leadership status
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
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    modalRole === "HOD" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                }`}>
                                    {modalRole === "HOD" ? "👑 HOD" : "👨‍🏫 Faculty"}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{modalUser.email}</div>
                            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                                <span>Dept: <strong className="text-slate-300">{modalUser.department || modalUser.departmentId?.name || "—"}</strong></span>
                                <span>Current: <strong className="text-indigo-400">{modalUser.designation || "Assistant Professor"}</strong></span>
                            </div>
                        </div>

                        <form onSubmit={handleSaveModal} className="space-y-4">
                            {/* Role Selection */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Role / Administrative Level *
                                </label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalRole("Faculty");
                                            if (modalDesignation === "Professor & HOD" || modalDesignation === "Head of the Department") {
                                                setModalDesignation("Professor");
                                            }
                                        }}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            modalRole === "Faculty"
                                                ? "bg-indigo-650/20 border-indigo-500 text-white shadow-sm"
                                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                                        }`}
                                    >
                                        <div className="font-bold flex items-center gap-1.5 text-xs">
                                            <span>👨‍🏫</span> Faculty Member
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">Regular teaching faculty</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalRole("HOD");
                                            if (!modalDesignation || modalDesignation === "Assistant Professor" || modalDesignation === "Associate Professor") {
                                                setModalDesignation("Professor & HOD");
                                            }
                                        }}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            modalRole === "HOD"
                                                ? "bg-sky-500/20 border-sky-400 text-white shadow-sm"
                                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                                        }`}
                                    >
                                        <div className="font-bold flex items-center gap-1.5 text-xs">
                                            <span>👑</span> Head of Dept (HOD)
                                        </div>
                                        <div className="text-[10px] text-sky-400/80 mt-0.5">Department Head leadership</div>
                                    </button>
                                </div>
                            </div>

                            {modalRole === "HOD" && (
                                <div className="bg-sky-500/10 border border-sky-500/25 p-3 rounded-xl text-sky-300 text-[11px] flex items-start gap-2">
                                    <span className="text-sm shrink-0">👑</span>
                                    <div>
                                        <strong>Assigning as Head of Department:</strong> This will appoint <strong>{modalUser.name}</strong> as the official HOD of the <strong>{modalUser.department || modalUser.departmentId?.name || "department"}</strong>, granting full departmental management, approvals queue, and faculty directory visibility.
                                    </div>
                                </div>
                            )}

                            {/* Designation Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Academic / Official Designation *
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
                                                    if (e.target.value === "Professor & HOD" || e.target.value === "Head of the Department") {
                                                        setModalRole("HOD");
                                                    }
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
                                                setModalDesignation(modalRole === "HOD" ? "Professor & HOD" : "Assistant Professor");
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
                                    {isSavingModal ? "Saving..." : "Confirm & Save Assignment"}
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
