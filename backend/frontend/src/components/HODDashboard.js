import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function HODDashboard({ currentUser, onSelectFaculty, setCurrentTab }) {
    const [deptStats, setDeptStats] = useState({
        totalFaculty: 0,
        averagePerformance: 0,
        pendingApprovals: 0,
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
            
            // Parallelize all department metrics requests concurrently
            const [
                performanceData,
                approvalData,
                taskData,
                workshopData,
                paperData,
                activityData,
                kpiData
            ] = await Promise.all([
                api.get(`/performance/department/${currentUser.departmentId}`).catch(() => ({ faculties: [], averageScore: 0 })),
                api.get("/approvals").catch(() => ({ approvals: [] })),
                api.get("/tasks").catch(() => ({ tasks: [] })),
                api.get("/workshops").catch(() => ({ workshops: [] })),
                api.get("/papers").catch(() => ({ papers: [] })),
                api.get("/activities").catch(() => ({ activities: [] })),
                api.get("/kpis").catch(() => ({ kpis: [] }))
            ]);

            const faculties = performanceData.faculties || [];
            setFacultyList(faculties);
            
            const pendingCount = (approvalData.approvals || []).filter(a => (a.status === "SUBMITTED" || a.status === "PENDING") && a.currentLevel === "HOD").length;
            const pendingTasksCount = (taskData.tasks || []).filter(t => t.status !== "completed").length;

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
            
            setDeptStats({
                totalFaculty: totalFac,
                averagePerformance: avgPerf,
                pendingApprovals: pendingCount,
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

    return (
        <div className="space-y-6 animate-fade-in text-xs">
            {/* Header briefing */}
            <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Department Management Dashboard</h2>
                        {loading && (
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full animate-pulse border border-indigo-500/20">
                                ⚡ Syncing
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 mt-1">Monitor and manage your department metrics. Click any card to navigate directly to its section.</p>
                    <div className="mt-3.5 flex flex-col gap-1 text-[11px] text-slate-350">
                        <div>Department: <strong className="text-indigo-400">{currentUser.department}</strong></div>
                        <div>HOD: <strong className="text-slate-200">{currentUser.name}</strong></div>
                    </div>
                </div>
                <button 
                    onClick={loadDashboardData}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white font-semibold rounded-xl transition-all shadow-md cursor-pointer"
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
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("faculty")}
                    className="bg-[#101622] border border-slate-800 hover:border-indigo-500/80 hover:bg-slate-900/60 p-5 rounded-2xl shadow-md cursor-pointer transition-all group"
                    title="Click to view Faculty Directory"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Faculty</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold">Directory ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">{deptStats.totalFaculty}</span>
                        <span className="text-slate-400">Headcount</span>
                    </div>
                </div>

                {/* 2. Active Faculty */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("faculty")}
                    className="bg-[#101622] border border-slate-800 hover:border-indigo-500/80 hover:bg-slate-900/60 p-5 rounded-2xl shadow-md cursor-pointer transition-all group"
                    title="Click to view Active Faculty Members"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Active Faculty</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold">Members ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                            {facultyList.filter(f => f.overallScore > 0).length}
                        </span>
                        <span className="text-slate-400">Members</span>
                    </div>
                </div>

                {/* 3. Pending Approvals */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("approvals")}
                    className="bg-[#101622] border border-slate-800 hover:border-rose-500/80 hover:bg-slate-900/60 p-5 rounded-2xl shadow-md cursor-pointer transition-all group"
                    title="Click to review Pending Approvals"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Pending Approvals</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-rose-400 font-semibold">Review ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-3xl font-extrabold ${deptStats.pendingApprovals > 0 ? "text-rose-400" : "text-slate-100"}`}>
                            {deptStats.pendingApprovals}
                        </span>
                        <span className="text-slate-400">HOD Reviews</span>
                    </div>
                </div>

                {/* 4. Avg Performance */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("reports")}
                    className="bg-[#101622] border border-slate-800 hover:border-emerald-500/80 hover:bg-slate-900/60 p-5 rounded-2xl shadow-md cursor-pointer transition-all group"
                    title="Click to view Department Reports"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Performance</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 font-semibold">Reports ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-emerald-400 group-hover:text-emerald-300 transition-colors">{deptStats.averagePerformance}%</span>
                        <span className="text-slate-400">Appraisal</span>
                    </div>
                </div>


                {/* 6. Pending Tasks */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("tasks")}
                    className="bg-[#101622] border border-slate-800 hover:border-amber-500/80 hover:bg-slate-900/60 p-5 rounded-2xl shadow-md cursor-pointer transition-all group"
                    title="Click to manage Department Tasks"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Pending Tasks</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-amber-400 font-semibold">Tasks ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-amber-400 group-hover:text-amber-300 transition-colors">{deptStats.pendingTasks}</span>
                        <span className="text-slate-400">Assigned</span>
                    </div>
                </div>

                {/* 7. Research Activities */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("papers")}
                    className="bg-[#101622] border border-slate-800 hover:border-sky-500/80 hover:bg-slate-900/60 p-5 rounded-2xl shadow-md cursor-pointer transition-all group"
                    title="Click to view Research Publications"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Research Activities</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-sky-400 font-semibold">Papers ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-sky-400 group-hover:text-sky-300 transition-colors">{deptStats.totalPublications}</span>
                        <span className="text-slate-400">Papers</span>
                    </div>
                </div>

                {/* 8. Events & Workshops */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("events")}
                    className="bg-[#101622] border border-slate-800 hover:border-violet-500/80 hover:bg-slate-900/60 p-5 rounded-2xl shadow-md cursor-pointer transition-all group"
                    title="Click to view Academic Events & Workshops"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Events &amp; Workshops</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-violet-400 font-semibold">Events ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-extrabold text-violet-400 group-hover:text-violet-300 transition-colors">{deptStats.totalWorkshops}</span>
                        <span className="text-slate-400">Arranged</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HODDashboard;
