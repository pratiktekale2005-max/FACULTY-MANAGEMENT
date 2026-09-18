import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function UserManagement({ currentUser }) {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters state
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [deptFilter, setDeptFilter] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Password Modal state
    const [passwordModalUser, setPasswordModalUser] = useState(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // CSV Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [csvRows, setCsvRows] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);

    // Checkbox selections for bulk actions
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // Form fields state
    const [form, setForm] = useState({
        name: "",
        email: "",
        employeeId: "",
        phone: "",
        designation: "",
        role: "Faculty",
        departmentId: "",
        status: "ACTIVE",
        joiningDate: ""
    });

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");
            
            // Fetch departments
            const deptData = await api.get("/departments");
            setDepartments(deptData.departments || []);

            // Fetch users with query params
            const params = {};
            if (search.trim()) params.search = search.trim();
            if (roleFilter && roleFilter !== "All" && roleFilter !== "all") params.role = roleFilter;
            if (deptFilter && deptFilter !== "All" && deptFilter !== "all") params.departmentId = deptFilter;

            const userData = await api.get("/users", params);
            setUsers(userData.users || []);

            // Set default department in form if departments loaded
            if (deptData.departments && deptData.departments.length > 0 && !form.departmentId) {
                setForm(prev => ({ ...prev, departmentId: deptData.departments[0]._id }));
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load database index ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, roleFilter, deptFilter]);

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        setForm({
            name: "",
            email: "",
            employeeId: "",
            phone: "",
            designation: "Assistant Professor",
            role: "Faculty",
            departmentId: departments[0]?._id || "",
            status: "ACTIVE",
            joiningDate: new Date().toISOString().split("T")[0]
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setEditingUser(user);
        setForm({
            name: user.name || "",
            email: user.email || "",
            employeeId: user.employeeId || "",
            phone: user.phone || "",
            designation: user.designation || "",
            role: user.role || "Faculty",
            departmentId: user.departmentId?._id || user.departmentId || "",
            status: user.status || "ACTIVE",
            joiningDate: user.joiningDate || ""
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.name || !form.email || !form.designation || !form.departmentId) {
            alert("Please fill in all mandatory fields * ❌");
            return;
        }

        try {
            if (editingUser) {
                // Edit existing user
                await api.put(`/users/${editingUser._id}`, form);
                alert("Account details successfully updated! ✅");
            } else {
                // Create new user
                await api.post("/users", form);
                alert("New profile account registered! ✅");
            }
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.message || "Transaction failed ❌");
        }
    };

    const handleToggleStatus = async (user) => {
        const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const confirmed = window.confirm(`Are you sure you want to transition ${user.name}'s status to ${nextStatus}?`);
        if (!confirmed) return;

        try {
            await api.put(`/users/${user._id}/status`, { status: nextStatus });
            alert(`Account status updated to ${nextStatus}! ✅`);
            loadData();
        } catch (err) {
            alert(err.message || "Failed to alter account status ❌");
        }
    };

    const handleOpenPasswordModal = (user) => {
        setPasswordModalUser(user);
        setPasswordInput("");
        setConfirmPasswordInput("");
        setPasswordError("");
        setShowPasswordInModal(false);
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
            const res = await api.put(`/users/${passwordModalUser._id}/password`, {
                password: passwordInput
            });
            alert(res.message || `Password successfully updated for ${passwordModalUser.name}! ✅`);
            setPasswordModalUser(null);
        } catch (err) {
            console.error(err);
            setPasswordError(err.message || "Failed to update user password ❌");
        } finally {
            setIsSavingPassword(false);
        }
    };

    // --- Bulk Selection Handlers ---
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = users.filter(u => u.role !== "Principal").map(u => u._id);
            setSelectedUserIds(allIds);
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (userId, checked) => {
        if (checked) {
            setSelectedUserIds(prev => [...prev, userId]);
        } else {
            setSelectedUserIds(prev => prev.filter(id => id !== userId));
        }
    };

    const handleBulkStatusChange = async (nextStatus) => {
        if (selectedUserIds.length === 0) return;
        const confirmed = window.confirm(`Update status to ${nextStatus} for ${selectedUserIds.length} selected users?`);
        if (!confirmed) return;

        try {
            const data = await api.post("/users/bulk-update-status", {
                userIds: selectedUserIds,
                status: nextStatus
            });
            alert(data.message);
            setSelectedUserIds([]);
            loadData();
        } catch (err) {
            alert(err.message || "Bulk status transition failed ❌");
        }
    };

    const handleBulkExport = () => {
        if (selectedUserIds.length === 0) return;
        const targets = users.filter(u => selectedUserIds.includes(u._id));
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Employee ID,Name,Email,Phone,Role,Designation,Department,Status\n";
        
        targets.forEach(u => {
            const dept = u.department || u.departmentId?.name || "—";
            csvContent += `"${u.employeeId || ""}","${u.name}","${u.email}","${u.phone || ""}","${u.role}","${u.designation}","${dept}","${u.status}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `EduCRM_Roster_Export_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- CSV File Parser ---
    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
            if (lines.length <= 1) {
                alert("The selected CSV file is empty or has only headers ❌");
                return;
            }

            const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
            const parsed = [];
            const errors = [];

            // Email and Employee ID checkers for local duplicates
            const emailSet = new Set();
            const empIdSet = new Set();

            for (let i = 1; i < lines.length; i++) {
                const rowCells = lines[i].split(",").map(c => c.replace(/^["']|["']$/g, '').trim());
                if (rowCells.length < 5) continue;

                // Create key-value object matching headers
                const rowObj = {};
                headers.forEach((h, index) => {
                    rowObj[h] = rowCells[index] || "";
                });

                const { name, email, employeeid, phone, designation, role, departmentcode, status } = rowObj;
                const rowNum = i + 1;
                const errorFields = [];

                if (!name) errorFields.push("Name is required");
                if (!email || !email.includes("@")) errorFields.push("Valid email is required");
                if (!designation) errorFields.push("Designation is required");
                if (!role || !["Faculty", "HOD"].includes(role)) errorFields.push("Role must be Faculty or HOD");

                // Validate department mapping
                const dept = departments.find(d => d.code === departmentcode);
                let departmentId = "";
                if (!dept) {
                    errorFields.push(`Unknown department code '${departmentcode}'`);
                } else {
                    departmentId = dept._id;
                }

                // Check local duplicate emails
                if (email && emailSet.has(email.toLowerCase())) {
                    errorFields.push(`Duplicate email '${email}' in CSV`);
                } else if (email) {
                    emailSet.add(email.toLowerCase());
                }

                // Check local duplicate Employee IDs
                if (employeeid && empIdSet.has(employeeid.toLowerCase())) {
                    errorFields.push(`Duplicate employeeId '${employeeid}' in CSV`);
                } else if (employeeid) {
                    empIdSet.add(employeeid.toLowerCase());
                }

                // Check database duplicates
                const dbEmailMatch = users.find(u => u.email.toLowerCase() === email?.toLowerCase());
                if (dbEmailMatch) {
                    errorFields.push(`Email '${email}' already exists in DB`);
                }

                if (employeeid) {
                    const dbIdMatch = users.find(u => u.employeeId?.toLowerCase() === employeeid.toLowerCase());
                    if (dbIdMatch) {
                        errorFields.push(`Employee ID '${employeeid}' already exists in DB`);
                    }
                }

                // Validate HOD assignment limits
                if (role === "HOD" && (status || "ACTIVE") === "ACTIVE" && departmentId) {
                    const dbHasHod = users.some(u => u.role === "HOD" && u.status === "ACTIVE" && (u.departmentId?._id === departmentId || u.departmentId === departmentId));
                    const csvHasHod = parsed.some(p => p.role === "HOD" && (p.status || "ACTIVE") === "ACTIVE" && p.departmentId === departmentId);
                    if (dbHasHod || csvHasHod) {
                        errorFields.push(`Department already has an active HOD`);
                    }
                }

                parsed.push({
                    rowNum,
                    name,
                    email,
                    employeeId: employeeid,
                    phone,
                    designation,
                    role,
                    departmentId,
                    departmentCode: departmentcode,
                    status: status || "ACTIVE",
                    errorMsg: errorFields.join("; ")
                });

                if (errorFields.length > 0) {
                    errors.push(`Row ${rowNum}: ${errorFields.join(", ")}`);
                }
            }

            setCsvRows(parsed);
            setCsvErrors(errors);
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = async () => {
        if (csvRows.length === 0) return;
        if (csvErrors.length > 0) {
            alert("Cannot import roster. Please fix all highlighted cell errors in your CSV file first ❌");
            return;
        }

        try {
            const data = await api.post("/users/bulk-create", { users: csvRows });
            alert(data.message);
            if (data.errors && data.errors.length > 0) {
                alert(`Warnings during upload:\n${data.errors.join("\n")}`);
            }
            setIsImportModalOpen(false);
            setCsvRows([]);
            setCsvErrors([]);
            loadData();
        } catch (err) {
            alert(err.message || "Bulk import transaction failed ❌");
        }
    };

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header dashboard info */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">User & Access Management</h2>
                    <p className="text-slate-400 mt-1">Enroll faculty members, appoint department HOD leaders, and control active portal permissions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold rounded-xl transition-all shadow-md"
                    >
                        📤 Import CSV Roster
                    </button>
                    <button
                        onClick={handleOpenCreateModal}
                        className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md"
                    >
                        ➕ Register New Account
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {/* Filters & Bulk Action Headers */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search by name, email, employee id..."
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 w-64 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">All Roles</option>
                        <option value="Principal">Principal</option>
                        <option value="HOD">HODs Only</option>
                        <option value="Faculty">Faculty Only</option>
                    </select>
                    <select
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    {selectedUserIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-850 px-3 py-1.5 rounded-xl animate-fade-in">
                            <span className="font-bold text-slate-400 text-[10px] mr-2">{selectedUserIds.length} Selected</span>
                            <button
                                onClick={() => handleBulkStatusChange("ACTIVE")}
                                className="px-2.5 py-1 bg-emerald-650 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all"
                            >
                                Activate
                            </button>
                            <button
                                onClick={() => handleBulkStatusChange("INACTIVE")}
                                className="px-2.5 py-1 bg-rose-650 hover:bg-rose-600 text-white font-bold rounded-lg transition-all"
                            >
                                Deactivate
                            </button>
                            <button
                                onClick={handleBulkExport}
                                className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-lg transition-all"
                            >
                                Export CSV
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => { setSearch(""); setRoleFilter(""); setDeptFilter(""); setSelectedUserIds([]); }}
                        className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-semibold rounded-xl transition-all"
                    >
                        🧹 Clear Filters
                    </button>
                </div>
            </div>

            {/* Roster Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Institutional Roster</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-800 text-indigo-650 focus:ring-0 cursor-pointer"
                                        checked={users.length > 0 && selectedUserIds.length === users.filter(u => u.role !== "Principal").length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Name / Designation</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Role</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-center text-slate-550 italic">Loading user accounts directory...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-6 text-center text-slate-550 italic">No registered staff users found matching selected parameters.</td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u._id} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="py-3 px-4 text-center">
                                            {u.role !== "Principal" && (
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-800 text-indigo-650 focus:ring-0 cursor-pointer"
                                                    checked={selectedUserIds.includes(u._id)}
                                                    onChange={(e) => handleSelectUser(u._id, e.target.checked)}
                                                />
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-slate-350">{u.employeeId || "—"}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-200">{u.name}</div>
                                            <div className="text-[10px] text-slate-550 mt-0.5">{u.designation}</div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-400">{u.email}</td>
                                        <td className="py-3 px-4 font-bold uppercase">
                                            <span className={`px-2 py-0.5 rounded text-[9px] ${
                                                u.role === "Principal" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                                u.role === "HOD" ? "bg-sky-500/10 text-sky-400 border border-sky-550/20" :
                                                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-350">{u.department || u.departmentId?.name || "—"}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold ${
                                                u.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-450 border border-rose-500/20"
                                            }`}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenPasswordModal(u)}
                                                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 font-bold rounded-lg transition-all"
                                                    title="Set or reset login password"
                                                >
                                                    🔑 Password
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEditModal(u)}
                                                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-200 font-bold rounded-lg transition-all"
                                                >
                                                    ⚙️ Edit
                                                </button>
                                                {u.role !== "Principal" && (
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        className={`px-2.5 py-1 font-bold rounded-lg border transition-all ${
                                                            u.status === "ACTIVE" 
                                                                ? "bg-rose-650/10 hover:bg-rose-650/20 border-rose-500/20 text-rose-400" 
                                                                : "bg-emerald-650/10 hover:bg-emerald-650/20 border-emerald-500/20 text-emerald-400"
                                                        }`}
                                                    >
                                                        {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Roster CSV Bulk Import Dialog */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Bulk Import User Roster</h3>
                                <p className="text-[10px] text-slate-400 mt-1">Upload a CSV file containing columns matching our template requirements</p>
                            </div>
                            <button
                                onClick={() => { setIsImportModalOpen(false); setCsvRows([]); setCsvErrors([]); }}
                                className="text-slate-500 hover:text-slate-400 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Template link */}
                            <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-300">Download Template File</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Use this CSV structure to format your user rows accurately.</p>
                                </div>
                                <a
                                    href="data:text/csv;charset=utf-8,name,email,employeeId,phone,designation,role,departmentCode,status"
                                    download="EduCRM_Roster_Template.csv"
                                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-indigo-400 hover:text-indigo-305 font-bold rounded-xl transition-all"
                                >
                                    💾 Download CSV Template
                                </a>
                            </div>

                            {/* File Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select CSV Roster File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCsvUpload}
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-200"
                                />
                            </div>

                            {/* CSV Preview Grid */}
                            {csvRows.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-wider">CSV Rows Validation Grid</h4>
                                    <div className="border border-slate-850 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-left border-collapse text-[10px]">
                                            <thead>
                                                <tr className="bg-slate-950 border-b border-slate-850 text-slate-450 uppercase font-bold tracking-wider">
                                                    <th className="py-2.5 px-3 w-12 text-center">Row</th>
                                                    <th className="py-2.5 px-3">Employee ID</th>
                                                    <th className="py-2.5 px-3">Name</th>
                                                    <th className="py-2.5 px-3">Email</th>
                                                    <th className="py-2.5 px-3">Role</th>
                                                    <th className="py-2.5 px-3">Dept Code</th>
                                                    <th className="py-2.5 px-3">Status</th>
                                                    <th className="py-2.5 px-3">Validation Message</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-850/60">
                                                {csvRows.map((r, index) => (
                                                    <tr key={index} className={r.errorMsg ? "bg-rose-500/5 hover:bg-rose-500/10 transition-colors" : "bg-slate-900/20 hover:bg-slate-900/40 transition-colors"}>
                                                        <td className="py-2 px-3 text-center text-slate-500">{r.rowNum}</td>
                                                        <td className="py-2 px-3 font-mono text-slate-300">{r.employeeId}</td>
                                                        <td className="py-2 px-3 font-bold text-slate-200">{r.name}</td>
                                                        <td className="py-2 px-3 text-slate-400">{r.email}</td>
                                                        <td className="py-2 px-3 font-semibold uppercase">{r.role}</td>
                                                        <td className="py-2 px-3 font-mono text-slate-300">{r.departmentCode}</td>
                                                        <td className="py-2 px-3 font-bold">{r.status}</td>
                                                        <td className={`py-2 px-3 font-semibold ${r.errorMsg ? "text-rose-450" : "text-emerald-450"}`}>
                                                            {r.errorMsg ? `✕ ${r.errorMsg}` : "✓ Ready to Import"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Validation Warnings */}
                            {csvErrors.length > 0 && (
                                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-[10px] leading-relaxed">
                                    <p className="font-bold">Errors found in uploaded roster roster ({csvErrors.length}):</p>
                                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                        {csvErrors.slice(0, 10).map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                        {csvErrors.length > 10 && <li>... and {csvErrors.length - 10} more rows</li>}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-6">
                            <button
                                type="button"
                                onClick={() => { setIsImportModalOpen(false); setCsvRows([]); setCsvErrors([]); }}
                                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-semibold rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={csvRows.length === 0 || csvErrors.length > 0}
                                onClick={handleConfirmImport}
                                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                            >
                                Confirm Import ({csvRows.filter(r => !r.errorMsg).length} Rows)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                {editingUser ? "Edit User Details" : "Register New Account"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-500 hover:text-slate-400 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="e.g. Dr. Amit Patel"
                                        value={form.name}
                                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="e.g. amit.ee@college.edu"
                                        value={form.email}
                                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employee ID *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="e.g. EE-HOD-01"
                                        value={form.employeeId}
                                        onChange={(e) => setForm(prev => ({ ...prev, employeeId: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="e.g. +91 99999 00005"
                                        value={form.phone}
                                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="e.g. Professor & HOD"
                                        value={form.designation}
                                        onChange={(e) => setForm(prev => ({ ...prev, designation: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Joining Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-250 focus:outline-none focus:border-indigo-500 transition-colors"
                                        value={form.joiningDate}
                                        onChange={(e) => setForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Institutional Role *</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-455 focus:outline-none focus:border-indigo-500 transition-colors"
                                        value={form.role}
                                        onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                                    >
                                        <option value="Faculty">Faculty Member</option>
                                        <option value="HOD">Department HOD</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Department *</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-455 focus:outline-none focus:border-indigo-500 transition-colors"
                                        value={form.departmentId}
                                        onChange={(e) => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                                    >
                                        {departments.map(d => (
                                            <option key={d._id} value={d._id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Status</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-455 focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={form.status}
                                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="ACTIVE">ACTIVE (Authorized to login)</option>
                                    <option value="INACTIVE">INACTIVE (Access blocked)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                            </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md"
                                >
                                    {editingUser ? "Save Updates" : "Create Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Set / Change Password Modal Dialog */}
            {passwordModalUser && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span>🔑</span> Set Account Password
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Assign or update login credentials for this user
                                </p>
                            </div>
                            <button
                                onClick={() => setPasswordModalUser(null)}
                                className="text-slate-500 hover:text-slate-300 text-base font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* User Profile Card */}
                        <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 text-[12px]">{passwordModalUser.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {passwordModalUser.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{passwordModalUser.email}</div>
                            <div className="text-[10px] text-slate-500 pt-1">
                                Department: <strong className="text-slate-300">{passwordModalUser.department || passwordModalUser.departmentId?.name || "—"}</strong>
                            </div>
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

                            <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalUser(null)}
                                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPassword || !passwordInput}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                                >
                                    {isSavingPassword ? "Saving..." : "Save Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;
