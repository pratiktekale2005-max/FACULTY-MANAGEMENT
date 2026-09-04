import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function AnalyticsPanel({ currentUser, setCurrentTab, refreshTrigger }) {
    const [stats, setStats] = useState({
        totalSubjects: 0,
        lecPlanned: 0,
        lecConducted: 0,
        totalWorkshops: 0,
        totalPapers: 0,
        totalFaculty: 0
    });
    
    const [recentPapers, setRecentPapers] = useState([]);
    const [chartData, setChartData] = useState([]); // Array of { name, percent }

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                // 1. Fetch subjects
                const subData = await api.get("/subjects");
                const subjects = subData.subjects || [];

                // 2. Fetch workshops
                const workData = await api.get("/workshops");
                const workshops = workData.workshops || [];

                // 3. Fetch papers
                const paperData = await api.get("/papers");
                const papers = paperData.papers || [];

                // 4. Fetch faculties count (Principal only)
                let faculties = [];
                if (currentUser.role === "Principal") {
                    const facData = await api.get("/faculty");
                    faculties = facData.faculties || [];
                }

                // Compile stats
                const totalSubjects = subjects.length;
                let lecPlanned = 0;
                let lecConducted = 0;
                subjects.forEach(s => {
                    lecPlanned += s.lecturesPlanned || 0;
                    lecConducted += s.lecturesConducted || 0;
                });

                const totalWorkshops = workshops.length;
                const totalPapers = papers.length;

                setStats({
                    totalSubjects,
                    lecPlanned,
                    lecConducted,
                    totalWorkshops,
                    totalPapers,
                    totalFaculty: faculties.length
                });

                // Compile chart data comparing subjects progress
                const charts = subjects.map(s => {
                    const progress = s.lecturesPlanned > 0 ? Math.round((s.lecturesConducted / s.lecturesPlanned) * 100) : 0;
                    return {
                        name: s.subjectName,
                        code: s.subjectCode,
                        percent: progress
                    };
                });
                setChartData(charts);

                // Set recent papers
                setRecentPapers(papers.slice(0, 3));

            } catch (err) {
                console.error("Failed to compile analytics:", err);
            }
        };

        loadAnalytics();
    }, [currentUser, refreshTrigger]);

    const syllabusPercent = stats.lecPlanned > 0 ? Math.round((stats.lecConducted / stats.lecPlanned) * 100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            
            {/* ================= HERO BRIEFING PANELS ================= */}
            <div className="bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-blue-900/40 border border-indigo-500/10 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Welcome Back, {currentUser.name}!</h2>
                <p className="text-xs text-slate-350 leading-relaxed max-w-2xl">
                    {currentUser.role === "Principal" 
                        ? "You are logged into the Steering Board portal. Audit faculty teaching schedules, review workshop compliance, and inspect research publications." 
                        : "Track your active subjects handbooks, manage laboratory plans, log research papers and generate performance reports."
                    }
                </p>
            </div>

            {/* ================= METRICS SCOREBOARD GRIDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                
                {/* Principal Only: Active Faculty count */}
                {currentUser.role === "Principal" && (
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Active Faculty</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-100">{stats.totalFaculty}</span>
                            <span className="text-xs text-indigo-400 font-semibold">Members</span>
                        </div>
                    </div>
                )}

                {/* Handled Subjects */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Active Subjects</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100">{stats.totalSubjects}</span>
                        <span className="text-xs text-slate-400">Green Book</span>
                    </div>
                </div>

                {/* Overall syllabus progress */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Syllabus Conducted</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100">{syllabusPercent}%</span>
                        <span className="text-xs text-slate-400">({stats.lecConducted} / {stats.lecPlanned} classes)</span>
                    </div>
                </div>

                {/* Logged Workshops */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Workshops & Seminars</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100">{stats.totalWorkshops}</span>
                        <span className="text-xs text-slate-400">Events</span>
                    </div>
                </div>

                {/* Research Papers publications */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Research Papers</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100">{stats.totalPapers}</span>
                        <span className="text-xs text-slate-400">Publications</span>
                    </div>
                </div>

            </div>

            {/* ================= CHARTS AND TASKS ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Columns: Syllabus Completion Comparison Bar Chart */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Syllabus Progress Comparison</h3>
                    
                    <div className="space-y-4 pt-2">
                        {chartData.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-4 text-center">No active subjects registered to generate progress comparison.</p>
                        ) : (
                            chartData.map(ch => (
                                <div key={ch.code} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-slate-300 truncate max-w-xs">{ch.name} <span className="text-[10px] text-slate-500">({ch.code})</span></span>
                                        <span className="text-indigo-400 font-bold">{ch.percent}%</span>
                                    </div>
                                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden relative">
                                        <div 
                                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${ch.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Recent Publications & shortcuts */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-5">
                    
                    {/* Recent Publications */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Recent Publications</h4>
                        <div className="space-y-2">
                            {recentPapers.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic py-2 text-center">No outstanding papers logged.</p>
                            ) : (
                                recentPapers.map(p => (
                                    <div key={p._id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-3 text-[11px]">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-200 truncate">{p.title}</p>
                                            <p className="text-[9px] text-slate-500 mt-0.5 truncate">Journal: {p.journal}</p>
                                        </div>
                                        <span className="text-[8px] font-bold text-indigo-400 shrink-0 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                                            {p.date.split("-")[0]}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick navigation Shortcuts */}
                    <div className="space-y-2 pt-2 border-t border-slate-850">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Quick Links</h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setCurrentTab("greenbook")}
                                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-indigo-400 hover:text-indigo-300"
                            >
                                📖 Green Book
                            </button>

                            <button
                                onClick={() => setCurrentTab("papers")}
                                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-indigo-400 hover:text-indigo-300"
                            >
                                📝 Publications
                            </button>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}

export default AnalyticsPanel;
