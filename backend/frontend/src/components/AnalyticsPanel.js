import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function AnalyticsPanel({ currentUser, setCurrentTab, onSelectDepartment, refreshTrigger }) {
    const [stats, setStats] = useState({
        totalSubjects: 0,
        lecPlanned: 0,
        lecConducted: 0,
        totalWorkshops: 0,
        totalSeminars: 0,
        totalPapers: 0,
        totalFaculty: 0,
        phdFaculty: 0,
        aidsFacultyCount: 0,
        aimlFacultyCount: 0,
        csFacultyCount: 0,
        departmentCount: 0,
        departmentList: ""
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

                // 4. Fetch faculties & departments (Principal / General)
                let totalFaculty = 0;
                let phdFaculty = 0;
                let aidsFacultyCount = 0;
                let aimlFacultyCount = 0;
                let csFacultyCount = 0;
                let departmentCount = 0;
                let departmentList = "";

                // Fetch departments
                try {
                    const deptData = await api.get("/departments");
                    const depts = deptData.departments || [];
                    const academicDepts = depts.filter(d => d.code !== "ADM" && d.name?.toLowerCase() !== "administration");
                    departmentCount = academicDepts.length;
                    departmentList = academicDepts.map(d => d.code || d.name).join(" • ");
                } catch (deptErr) {
                    console.error("Failed to load departments:", deptErr);
                }

                // Fetch faculty & PhD count for Principal
                if (currentUser.role === "Principal") {
                    try {
                        const userData = await api.get("/users");
                        const users = userData.users || [];
                        const facultyUsers = users.filter(u => u.role === "Faculty" || u.role === "HOD");
                        totalFaculty = facultyUsers.length;

                        facultyUsers.forEach(u => {
                            const uDeptName = (u.department || u.departmentId?.name || "").toLowerCase();
                            const uDeptCode = (u.departmentId?.code || "").toLowerCase();

                            if (
                                uDeptCode === "aids" || 
                                uDeptCode === "aid" || 
                                uDeptName.includes("data science") || 
                                uDeptName === "aids" || 
                                uDeptName === "aid" ||
                                uDeptName.includes("artificial intelligence & data science") ||
                                uDeptName.includes("artificial intelligence and data science")
                            ) {
                                aidsFacultyCount++;
                            } else if (
                                uDeptCode === "aiml" || 
                                uDeptName.includes("machine learning") || 
                                uDeptName === "aiml" ||
                                uDeptName.includes("artificial intelligence & machine learning") ||
                                uDeptName.includes("artificial intelligence and machine learning")
                            ) {
                                aimlFacultyCount++;
                            } else if (
                                uDeptCode === "cs" || 
                                uDeptCode === "cse" || 
                                uDeptName.includes("computer science") || 
                                uDeptName === "cs" || 
                                uDeptName === "cse"
                            ) {
                                csFacultyCount++;
                            }
                        });

                        const phdUsers = facultyUsers.filter(u => {
                            const qual = (u.qualification || "").toLowerCase();
                            const desig = (u.designation || "").toLowerCase();
                            const name = (u.name || "").toLowerCase();
                            return (
                                qual.includes("ph.d") || 
                                qual.includes("phd") || 
                                qual.includes("doctorate") || 
                                desig.includes("dr.") || 
                                name.startsWith("dr.")
                            );
                        });
                        phdFaculty = phdUsers.length;
                    } catch (userErr) {
                        console.error("Failed to load faculty users:", userErr);
                    }
                }

                // Compile stats
                const totalSubjects = subjects.length;
                let lecPlanned = 0;
                let lecConducted = 0;
                subjects.forEach(s => {
                    lecPlanned += s.lecturesPlanned || 0;
                    lecConducted += s.lecturesConducted || 0;
                });

                const totalWorkshopsCount = workshops.filter(w => !(w.workshopType && w.workshopType.toLowerCase().includes("seminar")) && !(w.title && w.title.toLowerCase().includes("seminar"))).length;
                const totalSeminars = workshops.filter(w => (w.workshopType && w.workshopType.toLowerCase().includes("seminar")) || (w.title && w.title.toLowerCase().includes("seminar"))).length;
                const totalPapers = papers.length;

                setStats({
                    totalSubjects,
                    lecPlanned,
                    lecConducted,
                    totalWorkshops: totalWorkshopsCount,
                    totalSeminars,
                    totalPapers,
                    totalFaculty,
                    phdFaculty,
                    aidsFacultyCount,
                    aimlFacultyCount,
                    csFacultyCount,
                    departmentCount,
                    departmentList
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
            <div className="bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-blue-900/40 border border-indigo-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider mb-2">Welcome Back, {currentUser.name}!</h2>
                <p className="text-xs text-slate-350 leading-relaxed max-w-2xl">
                    {currentUser.role === "Principal" 
                        ? "You are logged into the Steering Board portal. Audit faculty teaching schedules, review workshop compliance, and inspect department performance." 
                        : "Track your active subjects handbooks, manage laboratory plans, log research papers and generate performance reports."
                    }
                </p>
            </div>

            {/* ================= METRICS SCOREBOARD GRIDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5">
                
                {/* Principal Only: 3 Separate Clickable Department Cards */}
                {currentUser.role === "Principal" && (
                    <>
                        {/* 1. AIDS Department Card */}
                        <div 
                            onClick={() => onSelectDepartment && onSelectDepartment("AIDS", "Artificial Intelligence & Data Science")}
                            className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500 p-5 rounded-2xl shadow-sm space-y-2 cursor-pointer transition-all hover:bg-slate-900/90 group"
                            title="Click to view AIDS faculty list"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 group-hover:text-indigo-400 uppercase tracking-wider block transition-colors">
                                    AIDS
                                </span>
                                <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1">
                                    View Faculty <span>↗</span>
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                    {stats.aidsFacultyCount}
                                </span>
                                <span className="text-xs text-indigo-400 font-semibold">Total Faculty</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate pt-2 border-t border-slate-850">
                                Artificial Intelligence & Data Science
                            </p>
                        </div>

                        {/* 2. AIML Department Card */}
                        <div 
                            onClick={() => onSelectDepartment && onSelectDepartment("AIML", "Artificial Intelligence & Machine Learning")}
                            className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500 p-5 rounded-2xl shadow-sm space-y-2 cursor-pointer transition-all hover:bg-slate-900/90 group"
                            title="Click to view AIML faculty list"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 group-hover:text-indigo-400 uppercase tracking-wider block transition-colors">
                                    AIML
                                </span>
                                <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1">
                                    View Faculty <span>↗</span>
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                    {stats.aimlFacultyCount}
                                </span>
                                <span className="text-xs text-indigo-400 font-semibold">Total Faculty</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate pt-2 border-t border-slate-850">
                                Artificial Intelligence & Machine Learning
                            </p>
                        </div>

                        {/* 3. CS Department Card */}
                        <div 
                            onClick={() => onSelectDepartment && onSelectDepartment("CS", "Computer Science & Engineering")}
                            className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500 p-5 rounded-2xl shadow-sm space-y-2 cursor-pointer transition-all hover:bg-slate-900/90 group"
                            title="Click to view CS faculty list"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 group-hover:text-indigo-400 uppercase tracking-wider block transition-colors">
                                    CS
                                </span>
                                <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1">
                                    View Faculty <span>↗</span>
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                    {stats.csFacultyCount}
                                </span>
                                <span className="text-xs text-indigo-400 font-semibold">Total Faculty</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate pt-2 border-t border-slate-850">
                                Computer Science & Engineering
                            </p>
                        </div>
                    </>
                )}

                {/* Principal Only: Total Faculty & PhD Faculty Summary Cards */}
                {currentUser.role === "Principal" && (
                    <>
                        <div 
                            onClick={() => setCurrentTab && setCurrentTab("faculty-mgmt")}
                            className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                            title="Click to view All Faculty"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institution Faculty</span>
                                <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">All Members ↗</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">{stats.totalFaculty}</span>
                                <span className="text-xs text-indigo-400 font-semibold">Total Members</span>
                            </div>
                        </div>

                        <div 
                            onClick={() => setCurrentTab && setCurrentTab("faculty-mgmt")}
                            className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                            title="Click to view PhD Faculty"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PhD Faculty</span>
                                <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 font-medium">Doctorates ↗</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-emerald-400 group-hover:text-emerald-300 transition-colors">{stats.phdFaculty}</span>
                                <span className="text-xs text-slate-400">Doctorate Holders</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Registered Subjects (Green Book) */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("greenbook")}
                    className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                    title="Click to view Green Book Subjects"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects Handled</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">Green Book ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">{stats.totalSubjects}</span>
                        <span className="text-xs text-slate-400">Green Book</span>
                    </div>
                </div>

                {/* Overall syllabus progress */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("greenbook")}
                    className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                    title="Click to view Syllabus Status"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syllabus Conducted</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">Schedules ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">{syllabusPercent}%</span>
                        <span className="text-xs text-slate-400">({stats.lecConducted} / {stats.lecPlanned} classes)</span>
                    </div>
                </div>

                {/* Logged Workshops & Seminars */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("workshops")}
                    className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                    title="Click to view Workshops & Seminars"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workshops & Seminars</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">Events ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">{stats.totalWorkshops}</span>
                        <span className="text-xs text-slate-400">Events Logged</span>
                    </div>
                </div>

                {/* Research Papers publications */}
                <div 
                    onClick={() => setCurrentTab && setCurrentTab("papers")}
                    className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                    title="Click to view Research Publications"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Research Papers</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">Publications ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">{stats.totalPapers}</span>
                        <span className="text-xs text-slate-400">Papers Published</span>
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
                            <p className="text-xs text-slate-500 italic py-4 text-center">No subjects registered to generate progress comparison.</p>
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

                {/* Right Column: Recent Publications & Quick Actions */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-5">
                    
                    {/* Recent Publications */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Recent Publications</h4>
                        <div className="space-y-2">
                            {recentPapers.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic py-2 text-center">No outstanding papers logged.</p>
                            ) : (
                                recentPapers.map(p => (
                                    <div 
                                        key={p._id} 
                                        onClick={() => setCurrentTab && setCurrentTab("papers")}
                                        className="p-3 bg-slate-950 border border-slate-850 hover:border-indigo-500/60 rounded-xl flex items-center justify-between gap-3 text-[11px] cursor-pointer transition"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-200 truncate">{p.title}</p>
                                            <p className="text-[9px] text-slate-500 mt-0.5 truncate">Journal: {p.journal}</p>
                                        </div>
                                        <span className="text-[8px] font-bold text-indigo-400 shrink-0 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                                            {p.date ? p.date.split("-")[0] : "2026"}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick navigation Shortcuts */}
                    <div className="space-y-2 pt-2 border-t border-slate-850">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Quick Actions</h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setCurrentTab("workshops")}
                                className="p-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-center text-[10px] font-bold transition-all text-indigo-300 hover:text-indigo-200 col-span-2 shadow-sm"
                            >
                                ➕ Create Event / Seminar
                            </button>

                            <button
                                onClick={() => setCurrentTab("greenbook")}
                                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-slate-300 hover:text-white"
                            >
                                📖 Green Book
                            </button>

                            <button
                                onClick={() => setCurrentTab("papers")}
                                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-slate-300 hover:text-white"
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
