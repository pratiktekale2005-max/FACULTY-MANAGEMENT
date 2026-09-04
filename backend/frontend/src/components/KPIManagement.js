import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function KPIManagement({ currentUser }) {
    const [kpis, setKpis] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // KPI Assignment form state
    const [form, setForm] = useState({
        facultyId: "",
        academicYear: "2026-2027",
        semester: "Odd",
        category: "Publications",
        name: "",
        targetValue: "",
        unit: "Count"
    });

    const [isAssigning, setIsAssigning] = useState(false);

    const loadKPIsAndFaculties = async () => {
        try {
            setLoading(true);
            setError("");
            
            // 1. Fetch KPIs
            const kpiData = await api.get("/kpis");
            setKpis(kpiData.kpis || []);

            // 2. Fetch faculties if Principal or HOD to populate assignment dropdown
            if (currentUser.role === "Principal" || currentUser.role === "HOD") {
                const facData = await api.get("/faculty");
                setFaculties(facData.faculties || []);
                if (facData.faculties && facData.faculties.length > 0) {
                    setForm(prev => ({ ...prev, facultyId: facData.faculties[0]._id }));
                }
            }
        } catch (err) {
            console.error(err);
            setError("Failed to retrieve KPI targets ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKPIsAndFaculties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const handleAssignKPI = async (e) => {
        e.preventDefault();
        if (!form.name || !form.targetValue || !form.facultyId) {
            alert("All fields are required ❌");
            return;
        }

        try {
            await api.post("/kpis", form);
            alert("KPI Target assigned successfully! ✅");
            setIsAssigning(false);
            setForm(prev => ({ ...prev, name: "", targetValue: "" }));
            loadKPIsAndFaculties();
        } catch (err) {
            alert(err.message || "Failed to assign target ❌");
        }
    };

    const handleUpdateAchieved = async (kpi) => {
        const val = prompt(`Update achieved progress for "${kpi.name}" (Current: ${kpi.achievedValue}/${kpi.targetValue}):`, kpi.achievedValue);
        if (val === null || val === "") return;

        try {
            await api.put(`/kpis/${kpi._id}`, { achievedValue: Number(val) });
            alert("Progress updated successfully! ✅");
            loadKPIsAndFaculties();
        } catch (err) {
            alert(err.message || "Failed to update progress ❌");
        }
    };

    const handleModifyTarget = async (kpi) => {
        const val = prompt(`Change target goal for "${kpi.name}" (Current Target: ${kpi.targetValue}):`, kpi.targetValue);
        if (val === null || val === "") return;

        try {
            await api.put(`/kpis/${kpi._id}`, { targetValue: Number(val) });
            alert("Target updated successfully! ✅");
            loadKPIsAndFaculties();
        } catch (err) {
            alert(err.message || "Failed to update target ❌");
        }
    };

    const handleDeleteKPI = async (id) => {
        if (!window.confirm("Are you sure you want to remove this KPI target?")) return;

        try {
            await api.delete(`/kpis/${id}`);
            alert("KPI target removed successfully! ✅");
            loadKPIsAndFaculties();
        } catch (err) {
            alert(err.message || "Failed to remove KPI ❌");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "ACHIEVED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "EXCEEDED": return "bg-teal-500/10 text-teal-400 border-teal-500/20";
            case "IN_PROGRESS": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
            case "OVERDUE": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <p className="text-slate-400 text-xs italic">Loading KPI metrics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header section */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">KPIs & Targets Steering</h2>
                    <p className="text-slate-450 mt-1">Configure academic objectives, monitor completion progress, and track department goals</p>
                </div>
                
                {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                    <button
                        onClick={() => setIsAssigning(!isAssigning)}
                        className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white font-bold rounded-xl transition-all"
                    >
                        {isAssigning ? "✕ Close Form" : "🎯 Assign New Goal"}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {/* Assignment form overlay (Principal & HOD only) */}
            {isAssigning && (
                <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl animate-fade-in space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Allocate target parameter</h3>
                    <form onSubmit={handleAssignKPI} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end text-xs text-slate-350">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Select Faculty Member</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none"
                                value={form.facultyId}
                                onChange={(e) => setForm(prev => ({ ...prev, facultyId: e.target.value }))}
                                required
                            >
                                {faculties.map(f => (
                                    <option key={f._id} value={f._id}>{f.name} ({f.designation})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Category</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none"
                                value={form.category}
                                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                            >
                                <option value="Publications">Publications</option>
                                <option value="Workshops">Workshops</option>
                                <option value="FDP">FDP</option>
                                <option value="Research Projects">Research Projects</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Goal/Target Metric Name</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-855 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="e.g. Scopus Journal Publications"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Target Goal Count</label>
                            <input
                                type="number"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-855 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="e.g. 3"
                                value={form.targetValue}
                                onChange={(e) => setForm(prev => ({ ...prev, targetValue: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Academic Year</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-855 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="2026-2027"
                                value={form.academicYear}
                                onChange={(e) => setForm(prev => ({ ...prev, academicYear: e.target.value }))}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Semester</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none"
                                value={form.semester}
                                onChange={(e) => setForm(prev => ({ ...prev, semester: e.target.value }))}
                            >
                                <option value="Odd">Odd</option>
                                <option value="Even">Even</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10"
                            >
                                Assign Target Goal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* KPI Listings Board */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">KPI Goal Progress Scoreboard</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Faculty Member</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Goal Description</th>
                                <th className="py-3 px-4">Target / Achieved</th>
                                <th className="py-3 px-4">Progress</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {kpis.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">No KPI targets active.</td>
                                </tr>
                            ) : (
                                kpis.map((k) => {
                                    const progressPct = k.targetValue > 0 ? Math.round((k.achievedValue / k.targetValue) * 100) : 0;
                                    return (
                                        <tr key={k._id} className="hover:bg-slate-900/40 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-200">
                                                {k.facultyId?.name}
                                                <span className="text-[10px] text-slate-550 block font-normal mt-0.5">{k.facultyId?.department}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-350">{k.category}</td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-semibold text-slate-250">{k.name}</span>
                                                <span className="text-[9px] text-slate-500 block mt-0.5">{k.academicYear} &bull; Sem: {k.semester}</span>
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-200">
                                                {k.achievedValue} / {k.targetValue} {k.unit || "Count"}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-indigo-400 w-8">{progressPct}%</span>
                                                    <div className="w-20 bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="bg-indigo-650 h-full rounded-full" 
                                                            style={{ width: `${Math.min(progressPct, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-bold ${getStatusColor(k.status)}`}>
                                                    {k.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Faculty can self-report achievedValue */}
                                                    <button
                                                        onClick={() => handleUpdateAchieved(k)}
                                                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-lg transition-all"
                                                        title="Update achieved value"
                                                    >
                                                        📊 Log Progress
                                                    </button>

                                                    {/* Principal/HOD can edit target or delete */}
                                                    {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                                                        <>
                                                            <button
                                                                onClick={() => handleModifyTarget(k)}
                                                                className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 font-semibold rounded-lg transition-all"
                                                                title="Modify target goal"
                                                            >
                                                                ⚙️ Edit Target
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteKPI(k._id)}
                                                                className="p-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-450 rounded-lg transition-all"
                                                                title="Delete KPI"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
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
        </div>
    );
}

export default KPIManagement;
