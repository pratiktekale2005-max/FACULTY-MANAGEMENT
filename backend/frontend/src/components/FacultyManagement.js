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

    // Filters state
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");

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

            // Fetch users (filtered to role=Faculty)
            const params = { role: "Faculty" };
            if (search.trim()) params.search = search.trim();
            if (deptFilter) params.departmentId = deptFilter;

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
    }, [search, deptFilter]);

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

    // eslint-disable-next-line no-unused-vars
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
            status: user.status || "ACTIVE",
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
            setSuccess(res.message || `Password successfully updated for ${passwordModalUser.name}! ✅`);
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

    // eslint-disable-next-line no-unused-vars
    const handleToggleStatus = async (user) => {
        const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const confirmed = window.confirm(`Change access permission: Transition status of ${user.name} to ${nextStatus}?`);
        if (!confirmed) return;

        try {
            await api.put(`/users/${user._id}/status`, { status: nextStatus });
            setSuccess(`Faculty status successfully updated to ${nextStatus}! ✅`);
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to alter status ❌");
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleDeleteUser = async (user) => {
        const confirmed = window.confirm(`CRITICAL WARNING: Are you sure you want to permanently delete the faculty profile for '${user.name}'? This action is irreversible.`);
        if (!confirmed) return;

        try {
            await api.delete(`/users/${user._id}`);
            setSuccess("Faculty account successfully deleted from system! ✅");
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to delete user profile ❌");
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleAssignHOD = async (user) => {
        if (user.status !== "ACTIVE") {
            alert("Cannot assign an inactive user as HOD. HODs must be ACTIVE. ❌");
            return;
        }

        const confirmed = window.confirm(`Appoint HOD: Are you sure you want to appoint ${user.name} as HOD? This will automatically update department leadership and demote any existing HOD.`);
        if (!confirmed) return;

        try {
            const deptId = user.departmentId?._id || user.departmentId;
            if (!deptId) {
                alert("Faculty is not mapped to any department! ❌");
                return;
            }
            await api.put(`/departments/${deptId}`, { hodId: user._id });
            setSuccess(`${user.name} appointed as Head of Department successfully! ✅`);
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to assign HOD ❌");
        }
    };

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header dashboard info */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Faculty Management</h2>
                    <p className="text-slate-400 mt-1">Enroll faculty members, edit details, set login passwords, and manage institutional credentials</p>
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
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl flex items-center gap-3">
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
                    <option value="" className="bg-slate-900 text-slate-200">All Departments</option>
                    {departments.map(d => (
                        <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">{d.name}</option>
                    ))}
                </select>
                <button
                    onClick={() => { setSearch(""); setDeptFilter(""); }}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-all"
                >
                    🧹 Clear
                </button>
            </div>

            {/* All Faculty Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">All Faculty</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Faculty Name</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Designation</th>
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
                                        <td className="py-3 px-4 text-slate-300">{u.department || u.departmentId?.name || "—"}</td>
                                        <td className="py-3 px-4 text-slate-400 font-medium">{u.designation || "—"}</td>
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
                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold border border-slate-700 transition-all"
                                                    title="Edit Faculty Details"
                                                >
                                                    ✏️ Edit
                                                </button>
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
        </div>
    );
}

export default FacultyManagement;
