import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function HODManagement({ currentUser, onRefresh }) {
    const [departments, setDepartments] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Selected faculty mappings: deptId -> facultyId
    const [selections, setSelections] = useState({});

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            // Fetch departments
            const deptData = await api.get("/departments");
            setDepartments(deptData.departments || []);

            // Fetch all staff users (both HODs and Faculty to display candidates)
            const userData = await api.get("/users");
            setFaculties(userData.users || []);

            // Initialize dropdown selections with the current HOD of each department
            const initialSelections = {};
            (deptData.departments || []).forEach(d => {
                if (d.hodId) {
                    initialSelections[d._id] = d.hodId._id || d.hodId;
                }
            });
            setSelections(initialSelections);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load HOD administration records ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectChange = (deptId, facultyId) => {
        setSelections(prev => ({
            ...prev,
            [deptId]: facultyId
        }));
    };

    const handleAssignHOD = async (dept) => {
        setError("");
        setSuccess("");
        const selectedFacultyId = selections[dept._id];

        if (selectedFacultyId) {
            const faculty = faculties.find(f => f._id === selectedFacultyId);
            if (faculty && faculty.status !== "ACTIVE") {
                alert("Cannot assign an inactive user as HOD. HODs must be ACTIVE. ❌");
                return;
            }
        }

        const confirmed = window.confirm(
            `Assign Leader: Do you want to appoint/replace the Head of Department for '${dept.name}'?`
        );
        if (!confirmed) return;

        try {
            // Put request to departments endpoint
            await api.put(`/departments/${dept._id}`, { hodId: selectedFacultyId || null });
            setSuccess(`Head of Department successfully updated for '${dept.name}'! ✅`);
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "HOD assignment failed ❌");
        }
    };

    const handleRemoveHOD = async (dept) => {
        setError("");
        setSuccess("");

        const confirmed = window.confirm(
            `Remove Leader: Are you sure you want to remove the current Head of Department for '${dept.name}'?`
        );
        if (!confirmed) return;

        try {
            await api.put(`/departments/${dept._id}`, { hodId: null });
            setSuccess(`HOD removed for '${dept.name}'. Department leadership is vacant. ✅`);
            loadData();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "HOD removal failed ❌");
        }
    };

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header info */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">HOD Management</h2>
                    <p className="text-slate-400 mt-1">Appoint department leaders, replace existing HODs, and review academic leadership status</p>
                </div>
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

            {/* Department Grid / Cards */}
            {loading ? (
                <div className="text-center italic py-8 text-slate-500">Loading HOD assignments directory...</div>
            ) : departments.filter(d => d.code !== "ADM").length === 0 ? (
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6 text-center text-slate-550 italic">
                    No academic departments found. Please create departments first in the "Departments" module. 🏢
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {departments
                        .filter(d => d.code !== "ADM") // Hide Administration from academic HOD listing
                        .map(dept => {
                            // Filter faculty belonging to this specific department
                             const candidates = faculties.filter(
                                 f => f.role !== "Principal" && String(f.departmentId?._id || f.departmentId) === String(dept._id) && f.status === "ACTIVE"
                             );

                            const currentHOD = faculties.find(
                                f => f.role === "HOD" && String(f.departmentId?._id || f.departmentId) === String(dept._id)
                            );

                            return (
                                <div key={dept._id} className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        {/* Dept Title & Code Badge */}
                                        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{dept.name}</h3>
                                            <span className="font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px]">
                                                {dept.code}
                                            </span>
                                        </div>

                                        {/* Current HOD details */}
                                        <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Current Leader</p>
                                            {currentHOD ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200 text-xs">{currentHOD.name}</span>
                                                    <span className="text-slate-400 mt-0.5">{currentHOD.designation}</span>
                                                    <span className="text-[10px] text-slate-500 mt-0.5">{currentHOD.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-550 italic inline-block mt-0.5">Vacant — No appointed HOD</span>
                                            )}
                                        </div>

                                        {/* Appoint / Selection Section */}
                                        <div className="space-y-1.5 pt-2">
                                            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                                                Select Department Staff Member
                                            </label>
                                            <select
                                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
                                                value={selections[dept._id] || ""}
                                                onChange={(e) => handleSelectChange(dept._id, e.target.value)}
                                            >
                                                <option value="">-- Appoint Leader --</option>
                                                {candidates.map(c => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.name} ({c.designation})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-850">
                                        <button
                                            onClick={() => handleAssignHOD(dept)}
                                            disabled={!selections[dept._id]}
                                            className="flex-1 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md"
                                        >
                                            👑 {currentHOD ? "Replace HOD" : "Appoint HOD"}
                                        </button>
                                        {currentHOD && (
                                            <button
                                                onClick={() => handleRemoveHOD(dept)}
                                                className="px-3.5 py-2 bg-rose-650/10 border border-rose-500/20 hover:bg-rose-650/20 text-rose-400 font-bold rounded-xl transition-all"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}

export default HODManagement;
