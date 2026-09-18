import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function HODDashboard({ currentUser, onSelectFaculty }) {
    const [deptStats, setDeptStats] = useState({
        totalFaculty: 0,
        averagePerformance: 0,
        pendingApprovals: 0,
        averageFeedback: 4.0,
        totalPublications: 0,
        totalWorkshops: 0,
        totalActivities: 0,
        pendingTasks: 0,
        kpiAchievement: 0
    });
    const [facultyList, setFacultyList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError("");
            
            // 1. Load department performance and faculty list
            const performanceData = await api.get(`/performance/department/${currentUser.departmentId}`);
            const faculties = performanceData.faculties || [];
            setFacultyList(faculties);
            
            // 2. Load approvals count to count pending approvals for department
            const approvalData = await api.get("/approvals");
            const pendingCount = (approvalData.approvals || []).filter(a => a.status === "SUBMITTED" && a.currentLevel === "HOD").length;
            
            // 3. Load tasks to count pending tasks in department
            const taskData = await api.get("/tasks");
            const pendingTasksCount = (taskData.tasks || []).filter(t => t.status !== "completed").length;

            // 4. Load workshops count in department
            const workshopData = await api.get("/workshops");
            
            // 5. Load publications (papers) in department
            const paperData = await api.get("/papers");

            // 6. Load activities in department
            const activityData = await api.get("/activities");

            // 7. Load KPI progress to calculate kpiAchievement
            const kpiData = await api.get("/kpis");
            const kpis = kpiData.kpis || [];
            let kpiProgressSum = 0;
            kpis.forEach(k => {
                const pct = k.targetValue > 0 ? (k.achievedValue / k.targetValue) * 100 : 0;
                kpiProgressSum += Math.min(pct, 100);
            });
            const kpiAch = kpis.length > 0 ? Math.round(kpiProgressSum / kpis.length) : 0;

            // Compile stats
            const totalFac = faculties.length;
            const avgPerf = performanceData.averageScore || 0;
            
            // Calculate average student feedback stars from facultyList
            let feedbackSum = 0;
            let feedbackCount = 0;
            faculties.forEach(f => {
                const stars = f.breakdown?.["Student Feedback"]?.averageStars;
                if (stars !== undefined && stars !== null) {
                    feedbackSum += stars;
                    feedbackCount++;
                }
            });
            const avgFeedback = feedbackCount > 0 ? Number((feedbackSum / feedbackCount).toFixed(1)) : 4.0;

            setDeptStats({
                totalFaculty: totalFac,
                averagePerformance: avgPerf,
                pendingApprovals: pendingCount,
                averageFeedback: avgFeedback, 
                totalPublications: (paperData.papers || []).length,
                totalWorkshops: (workshopData.workshops || []).length,
                totalActivities: (activityData.activities || []).length,
                pendingTasks: pendingTasksCount,
                kpiAchievement: kpiAch
            });
        } catch (err) {
            console.error("HOD dashboard fetch error:", err);
            setError(err.message || "Failed to retrieve department metrics ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser.departmentId) {
            loadDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-slate-400 text-xs italic">Loading HOD Department data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in text-xs">
            {/* Header briefing */}
            <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Department Management Dashboard</h2>
                    <p className="text-slate-400 mt-1">Monitor and manage your department</p>
                    <div className="mt-3.5 flex flex-col gap-1 text-[11px] text-slate-350">
                        <div>Department: <strong className="text-indigo-400">{currentUser.department}</strong></div>
                        <div>HOD: <strong className="text-slate-200">{currentUser.name}</strong></div>
                    </div>
                </div>
                <button 
                    onClick={loadDashboardData}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white font-semibold rounded-xl transition-all shadow-md"
                >
                    🔄 Refresh Department Stats
                </button>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl">
                    {error}
                </div>
            )}

            {/* Metrics Dashboard Scorecard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Total Faculty */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total Faculty</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-slate-100">{deptStats.totalFaculty}</span>
                        <span className="text-slate-400">Headcount</span>
                    </div>
                </div>

                {/* 2. Active Faculty */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Active Faculty</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-indigo-400">
                            {facultyList.filter(f => f.overallScore > 0).length}
                        </span>
                        <span className="text-slate-400">Members</span>
                    </div>
                </div>

                {/* 3. Pending Approvals */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pending Approvals</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-3xl font-extrabold ${deptStats.pendingApprovals > 0 ? "text-rose-455" : "text-slate-100"}`}>
                            {deptStats.pendingApprovals}
                        </span>
                        <span className="text-slate-400">HOD Reviews</span>
                    </div>
                </div>

                {/* 4. Avg Performance */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Avg Performance</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-emerald-400">{deptStats.averagePerformance}%</span>
                        <span className="text-slate-400">Appraisal</span>
                    </div>
                </div>

                {/* 5. Student Feedback Rating */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Student Feedback</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-teal-400">{deptStats.averageFeedback} ⭐</span>
                        <span className="text-slate-400">Rating</span>
                    </div>
                </div>

                {/* 6. Pending Tasks */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pending Tasks</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-amber-400">{deptStats.pendingTasks}</span>
                        <span className="text-slate-400">Assigned</span>
                    </div>
                </div>

                {/* 7. Research Activities */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Research Activities</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-sky-400">{deptStats.totalPublications}</span>
                        <span className="text-slate-400">Papers</span>
                    </div>
                </div>

                {/* 8. Workshops / FDPs */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Workshops & FDPs</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-violet-400">{deptStats.totalWorkshops}</span>
                        <span className="text-slate-400">Arranged</span>
                    </div>
                </div>
            </div>

            {/* Department Faculty Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Department Faculty Scoreboard</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                                <th className="py-3 px-4">Faculty Name</th>
                                <th className="py-3 px-4">Teaching Score</th>
                                <th className="py-3 px-4">Research Score</th>
                                <th className="py-3 px-4">Student Survey</th>
                                <th className="py-3 px-4">Workshops Score</th>
                                <th className="py-3 px-4 text-center">Appraisal Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {facultyList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-6 text-center text-slate-500 italic">No faculty members assigned to your department.</td>
                                </tr>
                            ) : (
                                facultyList.map((f) => (
                                    <tr key={f.facultyId} className="hover:bg-slate-900/40 transition-colors group">
                                        <td className="py-3.5 px-4">
                                            <button
                                                type="button"
                                                onClick={() => onSelectFaculty && onSelectFaculty({ _id: f.facultyId, name: f.name })}
                                                className="font-bold text-slate-200 hover:text-indigo-300 text-left transition flex items-center gap-1.5 cursor-pointer group-hover:underline"
                                                title={`View academic profile of ${f.name}`}
                                            >
                                                <span>{f.name}</span>
                                                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                            </button>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-300">{f.breakdown?.["Teaching"]?.score || 0}</span>
                                                <span className="text-[10px] text-slate-500">({f.breakdown?.["Teaching"]?.rawProgress || 0}%)</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-300">{f.breakdown?.["Research"]?.score || 0}</span>
                                                <span className="text-[10px] text-slate-500">({f.breakdown?.["Research"]?.count || 0} Papers)</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-300">{f.breakdown?.["Student Feedback"]?.score || 0}</span>
                                                <span className="text-[10px] text-slate-500">({f.breakdown?.["Student Feedback"]?.averageStars || 4.0} ★)</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-300">{f.breakdown?.["Professional Development"]?.score || 0}</span>
                                                <span className="text-[10px] text-slate-500">({f.breakdown?.["Professional Development"]?.count || 0} Event)</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold rounded-lg border border-emerald-500/20 text-xs">
                                                {f.overallScore} / 100
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default HODDashboard;
