import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function FacultyManagement({ currentUser, onRefresh, onSelectFaculty }) {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Password Assignment Modal state
    const [passwordModalUser, setPasswordModalUser] = useState(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Delete Confirmation Modal state
    const [deleteModalUser, setDeleteModalUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters state
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    // Form fields state
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        employeeId: "",
        phone: "",
        designation: "Assistant Professor",
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

            // Fetch all users across all departments (or filtered by role/dept/search)
            const params = {};
            if (roleFilter && roleFilter !== "ALL") params.role = roleFilter;
            if (search.trim()) params.search = search.trim();
            if (deptFilter && deptFilter !== "ALL") params.departmentId = deptFilter;

            const userData = await api.get("/users", params);
            setUsers(userData.users || []);

            if (deptData.departments && deptData.departments.length > 0 && !form.departmentId) {
                setForm(prev => ({ ...prev, departmentId: deptData.departments[0]._id }));
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load faculty directory ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, deptFilter, roleFilter]);

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        setForm({
            name: "",
            email: "",
            password: "",
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
            password: "",
            employeeId: user.employeeId || "",
            phone: user.phone || "",
            designation: user.designation || "Assistant Professor",
            role: user.role || "Faculty",
            departmentId: user.departmentId?._id || user.departmentId || "",
            status: "ACTIVE",
            joiningDate: user.joiningDate || ""
        });
        setIsModalOpen(true);
    };

    // eslint-disable-next-line no-unused-vars
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
            setSuccess(res.message || `Password successfully updated for ${passwordModalUser.name}! Credentials dispatched to ${passwordModalUser.email}. 📧✅`);
            setPasswordModalUser(null);
        } catch (err) {
            console.error(err);
            setPasswordError(err.message || "Failed to update user password ❌");
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name || !form.email || !form.designation || !form.departmentId) {
            alert("Please fill in all mandatory fields * ❌");
            return;
        }

        try {
            if (editingUser) {
                // Update
                await api.put(`/users/${editingUser._id}`, form);
                setSuccess("Faculty profile details successfully updated! ✅");
            } else {
                // Create
                await api.post("/users", form);
                setSuccess("New Faculty account registered! Password assigned successfully. ✅");
            }
            setIsModalOpen(false);
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Operation failed ❌");
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteModalUser) return;
        try {
            setIsDeleting(true);
            const res = await api.delete(`/users/${deleteModalUser._id}`);
            setSuccess(res.message || `Faculty account for '${deleteModalUser.name}' was permanently deleted! ✅`);
            setDeleteModalUser(null);
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Delete user error:", err);
            alert(err.message || "Failed to delete user profile ❌");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header dashboard info */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Faculty & Staff Management</h2>
                    <p className="text-slate-400 mt-1">
                        All registered members across all departments ({users.length} Total Members). Enroll staff, edit profiles, and set credentials.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md"
                >
                    ➕ Register New Faculty
                </button>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 p-3.5 rounded-xl">
                    {success}
                </div>
            )}

            {/* Filters */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    placeholder="Search by name, email, employee id..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 w-64 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                >
                    <option value="" className="bg-slate-900 text-slate-200">🌐 All Departments</option>
                    {departments.map(d => (
                        <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">{d.name}</option>
                    ))}
                </select>
                <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="" className="bg-slate-900 text-slate-200">👥 All Roles (Faculty, HOD, Principal)</option>
                    <option value="Faculty" className="bg-slate-900 text-slate-200">👨‍🏫 Faculty Only</option>
                    <option value="HOD" className="bg-slate-900 text-slate-200">👨‍💼 Head of Department (HOD)</option>
                    <option value="Principal" className="bg-slate-900 text-slate-200">🏛️ Principal / Administration</option>
                </select>
                <button
                    onClick={() => { setSearch(""); setDeptFilter(""); setRoleFilter(""); }}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-all"
                >
                    🧹 Clear
                </button>
            </div>

            {/* All Faculty Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Institution Members Roster</h3>
                    <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                        Showing {users.length} Active Staff & Faculty
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Member Name</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Role & Designation</th>
                                <th className="py-3 px-4">Mobile No.</th>
                                <th className="py-3 px-4">Students</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-500 italic">Loading faculty accounts directory...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-500 italic">No registered faculty found matching search parameters.</td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u._id} className="hover:bg-slate-900/40 transition-colors group">
                                        <td className="py-3 px-4 font-mono text-slate-400">{u.employeeId || "—"}</td>
                                        <td className="py-3 px-4">
                                            <button
                                                type="button"
                                                onClick={() => onSelectFaculty && onSelectFaculty(u)}
                                                className="font-bold text-slate-200 hover:text-indigo-300 text-left transition flex items-center gap-1.5 cursor-pointer group-hover:underline"
                                                title={`View academic profile of ${u.name}`}
                                            >
                                                <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold">
                                                    {u.name ? u.name.charAt(0).toUpperCase() : "👤"}
                                                </span>
                                                <span>{u.name}</span>
                                                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">
                                            {u.department || u.departmentId?.name || (u.role === "Principal" ? "Administration" : "—")}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-200 font-medium">{u.designation || "—"}</span>
                                                <span className={`inline-block px-1.5 py-0.5 w-fit rounded text-[9px] font-bold uppercase tracking-wide ${
                                                    u.role === "Principal" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                                                    u.role === "HOD" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                    "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                }`}>
                                                    {u.role === "Principal" ? "🏛️ Principal" : u.role === "HOD" ? "👨‍💼 HOD" : "👨‍🏫 Faculty"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{u.phone || "—"}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
                                                <span className="font-bold text-slate-200">Students: <span className="text-indigo-400 font-bold">{u.studentStats?.total || 0}</span></span>
                                                <span className="text-[10px] text-slate-400">Male: <span className="text-slate-300 font-semibold">{u.studentStats?.male || 0}</span></span>
                                                <span className="text-[10px] text-slate-400">Female: <span className="text-slate-300 font-semibold">{u.studentStats?.female || 0}</span></span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => setPasswordModalUser(u)}
                                                    className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold border border-indigo-500/20 transition-all flex items-center gap-1"
                                                    title="Set Account Password"
                                                >
                                                    <span>🔑</span>
                                                    <span>Password</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEditModal(u)}
                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold border border-slate-700 transition-all cursor-pointer"
                                                    title="Edit Faculty Details"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                {currentUser?.role === "Principal" && String(u._id) !== String(currentUser._id || currentUser.id) && (
                                                    <button
                                                        onClick={() => setDeleteModalUser(u)}
                                                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                                        title={`Delete faculty profile for ${u.name}`}
                                                    >
                                                        <span>🗑️</span>
                                                        <span>Delete</span>
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

            {/* Set / Change Password Modal */}
            {passwordModalUser && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span>🔑</span> Set Account Password
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Assign or update login credentials for this staff member
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

                        {/* Email Dispatch Notice */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-[11px] text-indigo-300 flex items-start gap-2">
                            <span className="text-base shrink-0">📧</span>
                            <span>
                                An automated notification with the <strong>Username ({passwordModalUser.email})</strong> and newly assigned <strong>password</strong> will be immediately dispatched to the user's email address.
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

                            <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalUser(null)}
                                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-semibold rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPassword || !passwordInput}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                    {isSavingPassword ? (
                                        <span>Saving & Dispatching Email...</span>
                                    ) : (
                                        <>
                                            <span>🔑</span>
                                            <span>Set & Email Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create / Edit Faculty Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                {editingUser ? "Edit Faculty Profile" : "Register New Faculty Member"}
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        placeholder="Dr. Vivek Mishra"
                                        value={form.name}
                                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        placeholder="vivek.cs@college.edu"
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        placeholder="CS-FAC-09"
                                        value={form.employeeId}
                                        onChange={(e) => setForm(prev => ({ ...prev, employeeId: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        placeholder="+91 9876543210"
                                        value={form.phone}
                                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        {editingUser ? "New Password (optional)" : "Login Password"}
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        placeholder={editingUser ? "Leave blank to keep current" : "Default: Password@123"}
                                        value={form.password}
                                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                    />
                                    <p className="text-[9px] text-indigo-400 mt-1">
                                        📧 Credentials (Username as email & password) will be sent automatically via email.
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        placeholder="Assistant Professor"
                                        value={form.designation}
                                        onChange={(e) => setForm(prev => ({ ...prev, designation: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Department *</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.departmentId}
                                        onChange={(e) => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                                    >
                                        {departments.map(d => (
                                            <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Joining Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        value={form.joiningDate}
                                        onChange={(e) => setForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                                    />
                                </div>
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
                                    {editingUser ? "Save Changes" : "Create Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Direct Delete Faculty Confirmation Modal (Principal Only) */}
            {deleteModalUser && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                                <span className="text-base">⚠️</span> Confirm Faculty Deletion
                            </div>
                            <button
                                onClick={() => setDeleteModalUser(null)}
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
                                Use this option if this faculty member has <strong className="text-slate-200">resigned their position</strong> or was <strong className="text-slate-200">removed by institution administration</strong> for any reason. This will permanently remove their credentials and profile from the institutional roster.
                            </p>
                        </div>

                        <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 text-xs">{deleteModalUser.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {deleteModalUser.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{deleteModalUser.email}</div>
                            <div className="text-[10px] text-slate-400">
                                Department: <span className="text-slate-200 font-semibold">{deleteModalUser.department || deleteModalUser.departmentId?.name || "—"}</span>
                            </div>
                            {deleteModalUser.employeeId && (
                                <div className="text-[10px] text-slate-400">
                                    Employee ID: <span className="font-mono text-slate-200">{deleteModalUser.employeeId}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end border-t border-slate-800 pt-4">
                            <button
                                type="button"
                                onClick={() => setDeleteModalUser(null)}
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
        </div>
    );
}

export default FacultyManagement;
