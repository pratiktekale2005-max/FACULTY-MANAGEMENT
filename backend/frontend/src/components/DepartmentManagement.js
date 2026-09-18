import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function DepartmentManagement({ currentUser, onRefresh }) {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);

    // View Details state
    const [selectedDeptDetails, setSelectedDeptDetails] = useState(null);
    const [deptFaculty, setDeptFaculty] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleOpenDetails = async (dept) => {
        setSelectedDeptDetails(dept);
        setDeptFaculty([]);
        setLoadingDetails(true);
        try {
            const data = await api.get("/users", { departmentId: dept._id });
            setDeptFaculty(data.users || []);
        } catch (err) {
            console.error("Failed to load department faculty:", err);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Form fields state
    const [form, setForm] = useState({
        name: "",
        code: ""
    });

    const loadDepartments = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await api.get("/departments");
            setDepartments(data.departments || []);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load academic departments ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDepartments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenCreateModal = () => {
        setEditingDept(null);
        setForm({
            name: "",
            code: ""
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (dept) => {
        setEditingDept(dept);
        setForm({
            name: dept.name || "",
            code: dept.code || ""
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name || !form.code) {
            alert("Name and Department Code are required * ❌");
            return;
        }

        try {
            if (editingDept) {
                // Edit department
                await api.put(`/departments/${editingDept._id}`, form);
                setSuccess("Department successfully updated! ✅");
            } else {
                // Create department
                await api.post("/departments", form);
                setSuccess("New academic department registered! ✅");
            }
            setIsModalOpen(false);
            loadDepartments();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Department transaction failed ❌");
        }
    };

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header section */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Department Management</h2>
                    <p className="text-slate-400 mt-1">Configure institutional academic departments, track codes, and oversee leaders</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md"
                >
                    ➕ Register New Department
                </button>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 p-3.5 rounded-xl">
                    {success}
                </div>
            )}

            {/* Departments List Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Academic Departments</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-505 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Dept Code</th>
                                <th className="py-3 px-4">Department Name</th>
                                <th className="py-3 px-4">Head of Department (HOD)</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-slate-500 italic">Loading departments registry...</td>
                                </tr>
                            ) : departments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-slate-500 italic">No academic departments registered.</td>
                                </tr>
                            ) : (
                                departments.map(d => (
                                    <tr key={d._id} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-indigo-400">{d.code}</td>
                                        <td className="py-3 px-4 text-slate-200 font-semibold">{d.name}</td>
                                        <td className="py-3 px-4 text-slate-400">
                                            {d.hodId ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-300">{d.hodId.name}</span>
                                                    <span className="text-[10px] text-slate-500">{d.hodId.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-550 italic">No appointed HOD</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenDetails(d)}
                                                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-200 font-bold rounded-lg transition-all"
                                                >
                                                    👁️ Details
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEditModal(d)}
                                                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-200 font-bold rounded-lg transition-all"
                                                >
                                                    ⚙️ Edit
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

            {/* Create/Edit Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-955/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                {editingDept ? "Edit Department" : "Register New Department"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-500 hover:text-slate-400 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. Computer Science & Engineering"
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department Code (Unique) *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g. CSE"
                                    value={form.code}
                                    onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                />
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
                                    {editingDept ? "Save Updates" : "Create Department"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedDeptDetails && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                    Department Information Details
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Comprehensive registration parameters and assigned faculty roster</p>
                            </div>
                            <button
                                onClick={() => setSelectedDeptDetails(null)}
                                className="text-slate-500 hover:text-slate-400 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 bg-slate-950/60 p-4 border border-slate-850 rounded-xl">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Department Name</p>
                                <p className="text-xs text-slate-200 font-bold mt-1">{selectedDeptDetails.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Department Code</p>
                                <p className="text-xs font-mono text-indigo-400 font-bold mt-1">{selectedDeptDetails.code}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 tracking-wider font-bold">Appointed HOD</p>
                                <p className="text-xs text-slate-300 font-bold mt-1">
                                    {selectedDeptDetails.hodId ? selectedDeptDetails.hodId.name : "Vacant (No leader appointed)"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Faculty</h4>
                            <div className="border border-slate-850 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                                            <th className="py-2.5 px-3">Employee ID</th>
                                            <th className="py-2.5 px-3">Name</th>
                                            <th className="py-2.5 px-3">Email</th>
                                            <th className="py-2.5 px-3">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850/60">
                                        {loadingDetails ? (
                                            <tr>
                                                <td colSpan={4} className="py-4 text-center text-slate-550 italic">Fetching department roster...</td>
                                            </tr>
                                        ) : deptFaculty.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-4 text-center text-slate-550 italic">No faculty members registered in this department.</td>
                                            </tr>
                                        ) : (
                                            deptFaculty.map(f => (
                                                <tr key={f._id} className="hover:bg-slate-900/20 transition-colors">
                                                    <td className="py-2 px-3 font-mono text-slate-400">{f.employeeId || "—"}</td>
                                                    <td className="py-2 px-3 font-bold text-slate-200">{f.name}</td>
                                                    <td className="py-2 px-3 text-slate-400">{f.email}</td>
                                                    <td className="py-2 px-3 uppercase font-semibold text-indigo-400 text-[10px]">{f.role}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setSelectedDeptDetails(null)}
                                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 font-bold rounded-xl transition-all"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DepartmentManagement;

