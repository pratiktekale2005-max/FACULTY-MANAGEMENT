import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function FacultyManagement({ currentUser, onRefresh }) {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Filters state
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");

    // Form fields state
    const [form, setForm] = useState({
        name: "",
        email: "",
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
            designation: user.designation || "Assistant Professor",
            role: user.role || "Faculty",
            departmentId: user.departmentId?._id || user.departmentId || "",
            status: user.status || "ACTIVE",
            joiningDate: user.joiningDate || ""
        });
        setIsModalOpen(true);
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
                setSuccess("New Faculty account registered and welcome email dispatched! ✅");
            }
            setIsModalOpen(false);
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Operation failed ❌");
        }
    };

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
                    <p className="text-slate-400 mt-1">Enroll faculty members, edit details, assign to academic departments, and manage credentials</p>
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 w-64 text-slate-205 placeholder-slate-650 focus:outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="bg-slate-955 border border-slate-805 rounded-xl px-3 py-2 text-slate-400 focus:outline-none"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                </select>
                <button
                    onClick={() => { setSearch(""); setDeptFilter(""); }}
                    className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 font-semibold rounded-xl transition-all"
                >
                    🧹 Clear
                </button>
            </div>

            {/* Roster Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Faculty Roster</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Name / Designation</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-6 text-center text-slate-550 italic">Loading faculty accounts directory...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-6 text-center text-slate-550 italic">No registered faculty found matching search parameters.</td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u._id} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="py-3 px-4 font-mono text-slate-350">{u.employeeId || "—"}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-200">{u.name}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">{u.designation}</div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-400">{u.email}</td>
                                        <td className="py-3 px-4 text-slate-350">{u.department || u.departmentId?.name || "—"}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold ${
                                                u.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-455 border border-rose-500/20"
                                            }`}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {u.role !== "HOD" && u.status === "ACTIVE" && (
                                                    <button
                                                        onClick={() => handleAssignHOD(u)}
                                                        className="px-2.5 py-1 bg-indigo-650/10 hover:bg-indigo-650/20 border border-indigo-500/20 text-indigo-400 font-bold rounded-lg transition-all"
                                                    >
                                                        👑 Assign HOD
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenEditModal(u)}
                                                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-355 hover:text-slate-200 font-bold rounded-lg transition-all"
                                                >
                                                    ⚙️ Edit
                                                </button>
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
                                                <button
                                                    onClick={() => handleDeleteUser(u)}
                                                    className="px-2.5 py-1 bg-rose-650/10 hover:bg-rose-650/20 border border-rose-500/20 text-rose-400 font-bold rounded-lg transition-all"
                                                >
                                                    🗑️ Delete
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

            {/* Modal Dialog */}
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
                                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
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
                                        className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                        placeholder="vivek@college.edu"
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
                                        className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                        placeholder="e.g. CS-FAC-01"
                                        value={form.employeeId}
                                        onChange={(e) => setForm(prev => ({ ...prev, employeeId: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                        placeholder="e.g. +91 99999 00003"
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
                                        className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                        placeholder="Assistant Professor"
                                        value={form.designation}
                                        onChange={(e) => setForm(prev => ({ ...prev, designation: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Department *</label>
                                    <select
                                        className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-400 focus:outline-none"
                                        value={form.departmentId}
                                        onChange={(e) => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                                    >
                                        {departments.map(d => (
                                            <option key={d._id} value={d._id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Joining Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                        value={form.joiningDate}
                                        onChange={(e) => setForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Status</label>
                                    <select
                                        className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-400 focus:outline-none"
                                        value={form.status}
                                        onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
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
