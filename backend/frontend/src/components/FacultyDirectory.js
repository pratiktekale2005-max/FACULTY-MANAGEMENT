import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function FacultyDirectory({ currentUser, onSelectFaculty, refreshTrigger, onRefresh }) {
    const isHod = currentUser?.role === "HOD";
    const isPrincipal = currentUser?.role === "Principal";

    const [facultyList, setFacultyList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [search, setSearch] = useState("");
    const [selectedDept, setSelectedDept] = useState("ALL");
    const [deleteModalFaculty, setDeleteModalFaculty] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Password Assignment Modal state (Principal Only)
    const [passwordModalFaculty, setPasswordModalFaculty] = useState(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Load departments and faculty
    const loadDirectoryData = async () => {
        try {
            setLoading(true);
            setError("");

            const [deptRes, userRes] = await Promise.all([
                api.get("/departments").catch(() => ({ departments: [] })),
                api.get("/users").catch(() => ({ users: [] }))
            ]);

            const rawDepts = deptRes.departments || [];
            const allUsers = userRes.users || [];

            // Primary requested order: ALL -> AIDS -> CS -> AIML -> Administration -> Others
            const customDepts = [];

            // Check if standard depts exist in rawDepts or add virtual entries
            const deptMap = new Map();

            // 1. AIDS
            const aidsMatch = rawDepts.find(d => 
                (d.code || "").toUpperCase() === "AIDS" || 
                (d.code || "").toUpperCase() === "AID" || 
                (d.name || "").toLowerCase().includes("data science")
            );
            deptMap.set("AIDS", {
                code: "AIDS",
                name: aidsMatch?.name || "Artificial Intelligence & Data Science",
                id: aidsMatch?._id || "AIDS"
            });

            // 2. CS
            const csMatch = rawDepts.find(d => 
                (d.code || "").toUpperCase() === "CS" || 
                (d.code || "").toUpperCase() === "CSE" || 
                (d.name || "").toLowerCase().includes("computer science")
            );
            deptMap.set("CS", {
                code: "CS",
                name: csMatch?.name || "Computer Science & Engineering",
                id: csMatch?._id || "CS"
            });

            // 3. AIML
            const aimlMatch = rawDepts.find(d => 
                (d.code || "").toUpperCase() === "AIML" || 
                (d.name || "").toLowerCase().includes("machine learning")
            );
            deptMap.set("AIML", {
                code: "AIML",
                name: aimlMatch?.name || "Artificial Intelligence & Machine Learning",
                id: aimlMatch?._id || "AIML"
            });

            // 4. Administration
            const admMatch = rawDepts.find(d => 
                (d.code || "").toUpperCase() === "ADM" || 
                (d.name || "").toLowerCase().includes("admin")
            );
            deptMap.set("ADM", {
                code: "Administration",
                name: admMatch?.name || "Administration",
                id: admMatch?._id || "ADM"
            });

            // 5. Add any other departments from the institution
            rawDepts.forEach(d => {
                const code = (d.code || "").toUpperCase();
                const name = d.name || "";
                const isStandard = 
                    code === "AIDS" || code === "AID" || code === "322" || name.toLowerCase().includes("data science") ||
                    code === "CS" || code === "CSE" || code === "321" || name.toLowerCase().includes("computer science") ||
                    code === "AIML" || name.toLowerCase().includes("machine learning") ||
                    code === "ADM" || name.toLowerCase().includes("admin");

                if (!isStandard) {
                    customDepts.push({
                        code: d.code || d.name,
                        name: d.name,
                        id: d._id
                    });
                }
            });

            const orderedDeptList = [
                deptMap.get("AIDS"),
                deptMap.get("CS"),
                deptMap.get("AIML"),
                deptMap.get("ADM"),
                ...customDepts
            ].filter(Boolean);

            if (isHod) {
                // HOD Scope: Only faculties from that HOD's department.
                // Principal is strictly excluded.
                const hodDeptId = String(currentUser.departmentId?._id || currentUser.departmentId || "");
                const hodDeptName = (currentUser.department || "").toLowerCase().trim();

                const staff = allUsers.filter(u => {
                    if (u.role === "Principal") return false;
                    const uDeptId = String(u.departmentId?._id || u.departmentId || "");
                    const uDeptName = (u.department || u.departmentId?.name || "").toLowerCase().trim();
                    const idMatches = hodDeptId && uDeptId && hodDeptId === uDeptId;
                    const nameMatches = hodDeptName && uDeptName && (
                        hodDeptName === uDeptName || 
                        uDeptName.includes(hodDeptName) || 
                        hodDeptName.includes(uDeptName)
                    );
                    return idMatches || nameMatches;
                });
                setFacultyList(staff);

                // Scope HOD department selector to only their department
                const hodDeptObj = rawDepts.find(d => 
                    (hodDeptId && String(d._id) === hodDeptId) || 
                    (hodDeptName && (d.name || "").toLowerCase().trim() === hodDeptName) ||
                    (hodDeptName && (d.code || "").toLowerCase().trim() === hodDeptName)
                );
                const myDeptCode = hodDeptObj?.code || currentUser.department || "DEPT";
                const myDeptName = hodDeptObj?.name || currentUser.department || "My Department";
                setDepartments([{
                    code: myDeptCode,
                    name: myDeptName,
                    id: hodDeptObj?._id || hodDeptId
                }]);
                setSelectedDept(myDeptCode);
            } else {
                // Principal Scope: View all members across the institution
                setDepartments(orderedDeptList);
                setSelectedDept("ALL");

                const staff = allUsers.filter(u => 
                    u.role === "Faculty" || 
                    u.role === "HOD" || 
                    u.role === "Principal"
                );
                setFacultyList(staff);
            }

        } catch (err) {
            console.error("Faculty directory loading error:", err);
            setError(err.message || "Failed to load faculty directory ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDirectoryData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const handleConfirmDelete = async () => {
        if (!deleteModalFaculty) return;
        try {
            setIsDeleting(true);
            const res = await api.delete(`/users/${deleteModalFaculty._id}`);
            setSuccess(res.message || `Faculty account '${deleteModalFaculty.name}' deleted successfully! ✅`);
            setDeleteModalFaculty(null);
            loadDirectoryData();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Delete faculty error:", err);
            alert(err.message || "Failed to delete faculty account ❌");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        setPasswordError("");

        if (!passwordInput || passwordInput.length < 6) {
            setPasswordError("Password must be at least 6 characters long ❌");
            return;
        }

        if (passwordInput !== confirmPasswordInput) {
            setPasswordError("Passwords do not match. Please verify both fields ❌");
            return;
        }

        try {
            setIsSavingPassword(true);
            const res = await api.put(`/users/${passwordModalFaculty._id}/password`, {
                password: passwordInput
            });
            setSuccess(res.message || `Password successfully updated for ${passwordModalFaculty.name}! Credentials dispatched to ${passwordModalFaculty.email}. 📧✅`);
            setPasswordModalFaculty(null);
        } catch (err) {
            console.error(err);
            setPasswordError(err.message || "Failed to update user password ❌");
        } finally {
            setIsSavingPassword(false);
        }
    };

    // Matching helper for department filter
    const matchesDepartment = (user, deptCode) => {
        if (isHod) return true; // HOD is already strictly isolated
        if (!deptCode || deptCode === "ALL") return true;

        const uDeptName = (user.department || user.departmentId?.name || "").toLowerCase();
        const uDeptCode = (user.departmentId?.code || "").toLowerCase();
        const target = deptCode.toLowerCase();

        if (target === "administration" || target === "adm") {
            return user.role === "Principal" || uDeptCode === "adm" || uDeptName.includes("admin");
        }

        if (target === "aids" || target === "aid") {
            return (
                uDeptCode === "aids" || uDeptCode === "aid" || uDeptCode === "ai" || uDeptCode === "322" ||
                uDeptName.includes("data science") || uDeptName === "aids" || uDeptName === "aid" ||
                uDeptName.includes("artificial intelligence & data science") ||
                uDeptName.includes("artificial intelligence and data science")
            );
        }

        if (target === "aiml") {
            return (
                uDeptCode === "aiml" || uDeptName.includes("machine learning") || uDeptName === "aiml" ||
                uDeptName.includes("artificial intelligence & machine learning") ||
                uDeptName.includes("artificial intelligence and machine learning")
            );
        }

        if (target === "cs" || target === "cse") {
            return (
                uDeptCode === "cs" || uDeptCode === "cse" || uDeptCode === "321" ||
                uDeptName.includes("computer science") || uDeptName === "cs" || uDeptName === "cse"
            );
        }

        return (
            (uDeptCode && uDeptCode === target) ||
            (uDeptName && (uDeptName.includes(target) || target.includes(uDeptName)))
        );
    };

    // Filter faculty list by Department & Search
    const filteredFaculty = facultyList.filter(f => {
        const matchesDept = matchesDepartment(f, selectedDept);
        if (!matchesDept) return false;

        const q = search.trim().toLowerCase();
        if (!q) return true;

        return (
            (f.name || "").toLowerCase().includes(q) ||
            (f.email || "").toLowerCase().includes(q) ||
            (f.designation || "").toLowerCase().includes(q) ||
            (f.department || f.departmentId?.name || "").toLowerCase().includes(q) ||
            (f.employeeId || "").toLowerCase().includes(q) ||
            (f.phone || "").toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6 animate-fade-in text-xs">
            {/* Header & Controls Panel */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                            <span>👥</span> {isHod ? `${departments[0]?.name || currentUser.department || "Department"} Faculty Directory` : "Faculty Directory & Profiles"}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            {isHod 
                                ? `Browse academic faculty members in your department (${departments[0]?.name || currentUser.department || "your department"}). Click on any faculty name to inspect their complete detailed profile.`
                                : "Browse department-wise academic staff across the institution. Click on any faculty name to inspect their complete detailed profile."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                            Showing <span className="text-indigo-400 font-bold">{filteredFaculty.length}</span> of {facultyList.length} {isHod ? "Department Faculty" : "Members"}
                        </span>
                    </div>
                </div>

                {/* Filter and Dropdown Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                    {/* Department Dropdown Selector / Scope Indicator */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {isHod ? "Your Department Scope" : "Department Filter"}
                        </label>
                        {isHod ? (
                            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-semibold flex items-center justify-between">
                                <span className="flex items-center gap-2 truncate">
                                    <span>🏛️</span>
                                    <span className="truncate">{departments[0]?.name || currentUser.department}</span>
                                </span>
                                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono shrink-0">
                                    {departments[0]?.code || "HOD Scope"}
                                </span>
                            </div>
                        ) : (
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer font-medium"
                            >
                                <option value="ALL">🌐 All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.code} value={dept.code}>
                                        {dept.code} - {dept.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Search Input */}
                    <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Search Staff
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by faculty name, designation, email or phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                            />
                            <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs">
                    {success}
                </div>
            )}

            {/* Quick Department Pill Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {isPrincipal && (
                    <button
                        onClick={() => setSelectedDept("ALL")}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                            selectedDept === "ALL"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                        }`}
                    >
                        All Departments ({facultyList.length})
                    </button>
                )}
                {departments.map((d) => {
                    const countInDept = isHod ? facultyList.length : facultyList.filter(u => matchesDepartment(u, d.code)).length;
                    return (
                        <button
                            key={d.code}
                            onClick={() => setSelectedDept(d.code)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 ${
                                selectedDept === d.code
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                            }`}
                        >
                            <span>{isHod ? `🏛️ ${d.name}` : d.code}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-950/60 font-black">
                                {countInDept}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Faculty Cards Roster */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Faculty Member</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Designation</th>
                                <th className="py-3 px-4">Contact Details</th>
                                <th className="py-3 px-4">Qualifications / Specialties</th>
                                <th className="py-3 px-4 text-center">Full Profile</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                                        Loading faculty directory records...
                                    </td>
                                </tr>
                            ) : filteredFaculty.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-500 italic space-y-2">
                                        <div className="text-2xl">👥</div>
                                        <p>No faculty members found for the selected department or search criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredFaculty.map((fac) => {
                                    const isPrincipal = fac.role === "Principal";
                                    const isHOD = fac.role === "HOD";
                                    const deptBadgeColor = 
                                        isPrincipal ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                        isHOD ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                        "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

                                    return (
                                        <tr key={fac._id} className="hover:bg-slate-850/50 transition-colors group">
                                            {/* Clickable Faculty Name & Avatar */}
                                            <td className="py-3.5 px-4">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectFaculty && onSelectFaculty(fac)}
                                                    className="flex items-center gap-3 text-left group/btn focus:outline-none cursor-pointer"
                                                    title={`Click to view complete detailed profile of ${fac.name}`}
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 group-hover/btn:border-indigo-400 bg-slate-950 flex items-center justify-center shrink-0 transition-colors shadow">
                                                        {fac.photoPath ? (
                                                            <img src={fac.photoPath} alt={fac.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-base">{isPrincipal ? "🏛️" : isHOD ? "👨‍💼" : "👨‍🏫"}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-100 group-hover/btn:text-indigo-300 transition-colors flex items-center gap-1.5 text-xs">
                                                            <span>{fac.name}</span>
                                                            <span className="text-[10px] text-indigo-400 opacity-0 group-hover/btn:opacity-100 transition-opacity">↗</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                            {fac.employeeId && <span className="font-mono">{fac.employeeId}</span>}
                                                            {fac.employeeId && <span>&bull;</span>}
                                                            <span className="capitalize">{fac.role}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </td>

                                            {/* Department */}
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide inline-block ${deptBadgeColor}`}>
                                                    {fac.department || fac.departmentId?.name || "General"}
                                                </span>
                                            </td>

                                            {/* Designation */}
                                            <td className="py-3.5 px-4 font-medium text-slate-300">
                                                {fac.designation || fac.role}
                                            </td>

                                            {/* Contact Details */}
                                            <td className="py-3.5 px-4 text-slate-400 space-y-0.5">
                                                <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={fac.email}>
                                                    <span className="text-slate-500 text-[10px]">📧</span>
                                                    <span className="text-slate-300 text-[11px]">{fac.email}</span>
                                                </div>
                                                {fac.phone && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400">
                                                        <span className="text-slate-500 text-[10px]">📞</span>
                                                        <span>{fac.phone}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Qualifications & Specialties */}
                                            <td className="py-3.5 px-4 text-slate-400">
                                                <div className="line-clamp-2 max-w-xs text-[11px]">
                                                    {fac.qualification && (
                                                        <span className="font-bold text-slate-200 block truncate">
                                                            🎓 {fac.qualification}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-400 truncate block">
                                                        {fac.skills || fac.experience || "Academic credentials logged"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Action Button: View Profile & Delete & Password */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onSelectFaculty && onSelectFaculty(fac)}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-md hover:shadow-indigo-600/30 flex items-center gap-1 active:scale-95 cursor-pointer"
                                                        title={`Redirect to whole profile of ${fac.name}`}
                                                    >
                                                        <span>View Profile</span>
                                                        <span>&rarr;</span>
                                                    </button>
                                                    {isPrincipal && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPasswordModalFaculty(fac);
                                                                setPasswordInput("");
                                                                setConfirmPasswordInput("");
                                                                setPasswordError("");
                                                                setShowPasswordInModal(false);
                                                            }}
                                                            className="px-2 py-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                                            title={`Set or reset password for ${fac.name}`}
                                                        >
                                                            <span>🔑</span>
                                                            <span>Password</span>
                                                        </button>
                                                    )}
                                                    {currentUser?.role === "Principal" && String(fac._id) !== String(currentUser._id || currentUser.id) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteModalFaculty(fac)}
                                                            className="px-2.5 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                                            title={`Delete faculty profile for ${fac.name}`}
                                                        >
                                                            <span>🗑️</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Direct Delete Faculty Confirmation Modal (Principal Only) */}
            {deleteModalFaculty && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                                <span className="text-base">⚠️</span> Confirm Faculty Deletion
                            </div>
                            <button
                                onClick={() => setDeleteModalFaculty(null)}
                                className="text-slate-500 hover:text-slate-300 text-base font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-2 text-slate-300">
                            <p className="font-semibold text-rose-300">
                                Are you sure you want to permanently delete this faculty account?
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Use this option if this faculty member has <strong className="text-slate-200">resigned their position</strong> or was <strong className="text-slate-200">removed by institution administration</strong> for any reason. This action is permanent and will completely remove their account and credentials from the institutional roster.
                            </p>
                        </div>

                        <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 text-xs">{deleteModalFaculty.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {deleteModalFaculty.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{deleteModalFaculty.email}</div>
                            <div className="text-[10px] text-slate-400">
                                Department: <span className="text-slate-200 font-semibold">{deleteModalFaculty.department || deleteModalFaculty.departmentId?.name || "—"}</span>
                            </div>
                            {deleteModalFaculty.employeeId && (
                                <div className="text-[10px] text-slate-400">
                                    Employee ID: <span className="font-mono text-slate-200">{deleteModalFaculty.employeeId}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end border-t border-slate-800 pt-4">
                            <button
                                type="button"
                                onClick={() => setDeleteModalFaculty(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
                            >
                                {isDeleting ? (
                                    <span>Deleting...</span>
                                ) : (
                                    <>
                                        <span>🗑️</span>
                                        <span>Yes, Delete Account</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set / Change Password Modal (Principal Only) */}
            {passwordModalFaculty && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span>🔑</span> Set Account Password
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Assign or reset login credentials for this staff member
                                </p>
                            </div>
                            <button
                                onClick={() => setPasswordModalFaculty(null)}
                                className="text-slate-500 hover:text-slate-300 text-base font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* User Profile Card */}
                        <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 text-[12px]">{passwordModalFaculty.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {passwordModalFaculty.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{passwordModalFaculty.email}</div>
                            <div className="text-[10px] text-slate-500 pt-1">
                                Department: <strong className="text-slate-300">{passwordModalFaculty.department || passwordModalFaculty.departmentId?.name || "—"}</strong>
                            </div>
                        </div>

                        {/* Email Dispatch Notice */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-[11px] text-indigo-300 flex items-start gap-2">
                            <span className="text-base shrink-0">📧</span>
                            <span>
                                An automated notification with the <strong>Username ({passwordModalFaculty.email})</strong> and new <strong>password</strong> will be immediately dispatched to the user's email.
                            </span>
                        </div>

                        {passwordError && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-[11px]">
                                {passwordError}
                            </div>
                        )}

                        <form onSubmit={handleSavePassword} className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        New Password *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none"
                                    >
                                        {showPasswordInModal ? "🙈 Hide" : "👁️ Show"}
                                    </button>
                                </div>
                                <input
                                    type={showPasswordInModal ? "text" : "password"}
                                    required
                                    minLength={6}
                                    placeholder="Enter new password (min. 6 characters)"
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Confirm New Password *
                                </label>
                                <input
                                    type={showPasswordInModal ? "text" : "password"}
                                    required
                                    minLength={6}
                                    placeholder="Confirm new password"
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={confirmPasswordInput}
                                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 justify-end border-t border-slate-800 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalFaculty(null)}
                                    disabled={isSavingPassword}
                                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPassword}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                                >
                                    {isSavingPassword ? (
                                        <span>Saving & Dispatching Email...</span>
                                    ) : (
                                        <>
                                            <span>🔑</span>
                                            <span>Save & Email Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FacultyDirectory;
