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
        departmentList: "",
        totalMyClasses: 0,
        totalMyStudents: 0
    });
    
    const [recentPapers, setRecentPapers] = useState([]);
    const [chartData, setChartData] = useState([]); // Array of { name, percent }
    const [departmentCards, setDepartmentCards] = useState([]);
    const [facultyBreakdown, setFacultyBreakdown] = useState({ teaching: 0, admin: 0, total: 0 });

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

                // Fetch departments and compile dynamic department cards
                let cards = [];
                let teachingCount = 0;
                let adminCount = 0;

                try {
                    const [deptRes, userRes] = await Promise.all([
                        api.get("/departments").catch(() => ({ departments: [] })),
                        api.get("/users").catch(() => ({ users: [] }))
                    ]);
                    const depts = deptRes.departments || [];
                    const users = userRes.users || [];
                    
                    const academicDepts = depts.filter(d => d.code !== "ADM" && d.name?.toLowerCase() !== "administration");
                    departmentCount = academicDepts.length;
                    departmentList = academicDepts.map(d => d.code || d.name).join(" • ");

                    // Primary standard departments in requested order: AIDS, CS, AIML, Administration
                    const standardDepts = [
                        { code: "AIDS", name: "Artificial Intelligence & Data Science", isAcademic: true },
                        { code: "CS", name: "Computer Science & Engineering", isAcademic: true },
                        { code: "AIML", name: "Artificial Intelligence & Machine Learning", isAcademic: true },
                        { code: "ADM", name: "Administration", isAcademic: false }
                    ];

                    const allDeptMap = new Map();
                    standardDepts.forEach(d => allDeptMap.set(d.code.toUpperCase(), { ...d }));

                    // Add other institution departments from database
                    depts.forEach(d => {
                        const code = (d.code || "DEPT").toUpperCase();
                        const isAdm = code === "ADM" || d.name?.toLowerCase().includes("admin");
                        if (!allDeptMap.has(code)) {
                            allDeptMap.set(code, {
                                code,
                                name: d.name,
                                isAcademic: !isAdm,
                                id: d._id
                            });
                        } else {
                            const existing = allDeptMap.get(code);
                            existing.id = d._id;
                            if (d.name) existing.name = d.name;
                        }
                    });

                    // Count members per department
                    allDeptMap.forEach((deptObj, key) => {
                        const matchedUsers = users.filter(u => {
                            const uDeptName = (u.department || u.departmentId?.name || "").toLowerCase();
                            const uDeptCode = (u.departmentId?.code || "").toLowerCase();

                            if (key === "ADM") {
                                return u.role === "Principal" || uDeptCode === "adm" || uDeptName.includes("admin");
                            }
                            if (u.role !== "Faculty" && u.role !== "HOD") return false;

                            if (key === "AIDS") {
                                return (
                                    uDeptCode === "aids" || uDeptCode === "aid" || uDeptCode === "ai" || uDeptCode === "322" ||
                                    uDeptName.includes("data science") || uDeptName === "aids" || uDeptName === "aid" ||
                                    uDeptName.includes("artificial intelligence & data science") ||
                                    uDeptName.includes("artificial intelligence and data science")
                                );
                            }
                            if (key === "AIML") {
                                return (
                                    uDeptCode === "aiml" || uDeptName.includes("machine learning") || uDeptName === "aiml" ||
                                    uDeptName.includes("artificial intelligence & machine learning") ||
                                    uDeptName.includes("artificial intelligence and machine learning")
                                );
                            }
                            if (key === "CS") {
                                return (
                                    uDeptCode === "cs" || uDeptCode === "cse" || uDeptCode === "321" ||
                                    uDeptName.includes("computer science") || uDeptName === "cs" || uDeptName === "cse"
                                );
                            }
                            return (
                                (uDeptCode && uDeptCode === deptObj.code.toLowerCase()) ||
                                (uDeptName && (uDeptName.includes(deptObj.code.toLowerCase()) || (deptObj.name && deptObj.name.toLowerCase().includes(uDeptName))))
                            );
                        });

                        const hods = matchedUsers.filter(u => u.role === "HOD").length;
                        const facultyOnly = matchedUsers.filter(u => u.role === "Faculty").length;
                        const principals = matchedUsers.filter(u => u.role === "Principal").length;

                        if (deptObj.isAcademic) {
                            teachingCount += matchedUsers.filter(u => u.role === "Faculty" || u.role === "HOD").length;
                        } else {
                            adminCount += matchedUsers.length;
                        }

                        cards.push({
                            ...deptObj,
                            count: matchedUsers.length,
                            hodCount: hods,
                            facultyCount: facultyOnly,
                            principalCount: principals
                        });
                    });

                    // Overall teaching staff count
                    totalFaculty = users.filter(u => u.role === "Faculty" || u.role === "HOD").length;

                    // PhD doctorates count
                    const phdUsers = users.filter(u => {
                        if (u.role !== "Faculty" && u.role !== "HOD" && u.role !== "Principal") return false;
                        const qual = (u.qualification || "").toLowerCase();
                        const desig = (u.designation || "").toLowerCase();
                        const name = (u.name || "").toLowerCase();
                        return (
                            qual.includes("ph.d") || qual.includes("phd") || qual.includes("doctorate") ||
                            desig.includes("dr.") || name.startsWith("dr.")
                        );
                    });
                    phdFaculty = phdUsers.length;

                    setDepartmentCards(cards);
                    setFacultyBreakdown({ teaching: teachingCount, admin: adminCount, total: totalFaculty });

                } catch (err) {
                    console.error("Failed to load departments and users:", err);
                }

                // Compile stats
                const totalSubjects = subjects.length;
                let lecPlanned = 0;
                let lecConducted = 0;
                subjects.forEach(s => {
                    lecPlanned += s.lecturesPlanned || 0;
                    lecConducted += s.lecturesConducted || 0;
                });

                const totalEventsCount = workshops.length;
                const totalWorkshopsOnly = workshops.filter(w => !(w.workshopType && w.workshopType.toLowerCase().includes("seminar")) && !(w.title && w.title.toLowerCase().includes("seminar"))).length;
                const totalSeminars = workshops.filter(w => (w.workshopType && w.workshopType.toLowerCase().includes("seminar")) || (w.title && w.title.toLowerCase().includes("seminar"))).length;
                const totalPapers = papers.length;

                let totalMyClasses = 0;
                let totalMyStudents = 0;
                if (currentUser.role === "Faculty") {
                    try {
                        const classRes = await api.get("/classes/my-classes");
                        totalMyClasses = classRes.totalClasses || 0;
                        totalMyStudents = classRes.totalUniqueStudents || 0;
                    } catch (e) {
                        console.error("Classes load error:", e);
                    }
                }

                setStats({
                    totalSubjects,
                    lecPlanned,
                    lecConducted,
                    totalWorkshops: totalEventsCount,
                    totalWorkshopsOnly,
                    totalSeminars,
                    totalPapers,
                    totalFaculty,
                    phdFaculty,
                    aidsFacultyCount,
                    aimlFacultyCount,
                    csFacultyCount,
                    departmentCount,
                    departmentList,
                    totalMyClasses,
                    totalMyStudents
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
            <div className="space-y-4">
                {currentUser.role === "Principal" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Institution Departments & Faculty</h3>
                                <p className="text-[11px] text-slate-500">Department-wise faculty allocation across all departments registered under the institution</p>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {departmentCards.length} Registered Departments
                            </span>
                        </div>

                        {/* All Departments Cards (AIDS, CS, AIML, Administration, and others) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {departmentCards.map((dept) => (
                                <div 
                                    key={dept.code}
                                    onClick={() => onSelectDepartment && onSelectDepartment(dept.code, dept.name)}
                                    className={`border p-4 rounded-2xl shadow-sm space-y-2.5 cursor-pointer transition-all hover:scale-[1.01] group ${
                                        dept.code === "ADM" 
                                            ? "bg-slate-900/40 border-slate-800 hover:border-purple-500 hover:bg-slate-900/80" 
                                            : "bg-slate-900/60 border-slate-800 hover:border-indigo-500 hover:bg-slate-900/90"
                                    }`}
                                    title={`Click to inspect faculty in ${dept.name}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-black uppercase tracking-wider block transition-colors ${
                                            dept.code === "ADM" 
                                                ? "text-purple-400 group-hover:text-purple-300" 
                                                : "text-indigo-400 group-hover:text-indigo-300"
                                        }`}>
                                            {dept.code}
                                        </span>
                                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1">
                                            View Staff <span>↗</span>
                                        </span>
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                            {dept.count}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">
                                            {dept.code === "ADM" ? "Leadership / Staff" : "Faculty Members"}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[10px]">
                                        <p className="text-slate-400 truncate max-w-[150px]" title={dept.name}>
                                            {dept.name}
                                        </p>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            dept.code === "ADM" 
                                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                                                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                        }`}>
                                            {dept.code === "ADM" ? "Admin" : `${dept.hodCount} HOD • ${dept.facultyCount} Fac`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Institution Summary Scoreboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5 pt-2">
                    
                    {/* Principal Only: Transparent Faculty Summary Cards */}
                    {currentUser.role === "Principal" && (
                        <>
                            {/* Academic Teaching Faculty Card */}
                            <div 
                                onClick={() => setCurrentTab && setCurrentTab("faculty-mgmt")}
                                className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                                title="Click to view Teaching Faculty"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teaching Faculty</span>
                                    <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">Academic Depts ↗</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-extrabold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                        {facultyBreakdown.teaching}
                                    </span>
                                    <span className="text-xs text-slate-400">Teaching Members</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 truncate">
                                    Across AIDS, CS & academic departments
                                </p>
                            </div>

                            {/* Total Institution Staff & Leadership Card */}
                            <div 
                                onClick={() => setCurrentTab && setCurrentTab("faculty-mgmt")}
                                className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                                title="Click to view All Institution Staff"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">All Staff & Faculty</span>
                                    <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">All Members ↗</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                        {stats.totalFaculty}
                                    </span>
                                    <span className="text-xs text-indigo-400 font-semibold">Total Registered</span>
                                </div>
                                <p className="text-[10px] text-indigo-400/80 mt-2 truncate">
                                    {facultyBreakdown.teaching} Teaching &bull; {facultyBreakdown.admin} Administration & Governance
                                </p>
                            </div>

                            {/* PhD Faculty Card */}
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
                                <p className="text-[10px] text-slate-500 mt-2 truncate">
                                    Research doctorate accredited faculty
                                </p>
                            </div>
                        </>
                    )}

                {/* Faculty Specific: Direct Timetable Schedule Shortcut */}
                {currentUser.role === "Faculty" && (
                    <div 
                        onClick={() => setCurrentTab && setCurrentTab("timetable")}
                        className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                        title="Click to navigate directly to Timetable"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Timetable</span>
                            <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">Timetable ↗</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-indigo-400 group-hover:text-indigo-300 transition-colors">📅</span>
                            <span className="text-xs text-slate-300 font-semibold">Weekly Schedule</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 truncate">
                            Lectures, practicals, tutorials &amp; examinations
                        </p>
                    </div>
                )}

                {/* Faculty Specific: Direct Assignment Marks Evaluation Shortcut */}
                {currentUser.role === "Faculty" && (
                    <div 
                        onClick={() => setCurrentTab && setCurrentTab("assignments")}
                        className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                        title="Click to navigate directly to Coursework Assignments & Evaluations"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Continuous Assignments</span>
                            <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 font-medium">Assignments ↗</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-emerald-400 group-hover:text-emerald-300 transition-colors">📝</span>
                            <span className="text-xs text-slate-300 font-semibold">5 Assignments /10</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 truncate">
                            Roll numbers, evaluation dates &amp; Total /50
                        </p>
                    </div>
                )}

                {/* Faculty Specific: Leave Management Shortcut */}
                {currentUser.role === "Faculty" && (
                    <div 
                        onClick={() => setCurrentTab && setCurrentTab("leave")}
                        className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                        title="Click to manage faculty leaves"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leave Management</span>
                            <span className="text-[10px] text-slate-500 group-hover:text-amber-400 font-medium">Leaves ↗</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-amber-400 group-hover:text-amber-300 transition-colors">🏖️</span>
                            <span className="text-xs text-slate-300 font-semibold">Apply &amp; Edit Leaves</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 truncate">
                            Casual, duty, medical &amp; earned leave balances
                        </p>
                    </div>
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
                    onClick={() => setCurrentTab && setCurrentTab("events")}
                    className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
                    title="Click to view Events"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workshops & Seminars</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-medium">Events ↗</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">{stats.totalWorkshops}</span>
                        <span className="text-xs text-slate-400">Events</span>
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
            </div>

            {/* ================= CHARTS AND TASKS ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Columns: Syllabus Completion Bar Chart */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Syllabus Progress</h3>
                    
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
                        
                        {currentUser?.role === "Faculty" ? (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("timetable")}
                                    className="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-center text-[10px] font-bold transition-all text-indigo-300 hover:text-indigo-200 col-span-2 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>📅</span> View Timetable Schedule
                                </button>
                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("assignments")}
                                    className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>📝</span> Assignments
                                </button>
                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("submissions")}
                                    className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>📤</span> Submissions
                                </button>
                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("certifications")}
                                    className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>📜</span> Certifications
                                </button>
                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("leave")}
                                    className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-amber-300/80 hover:text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>🏖️</span> Leave Portal
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("events")}
                                    className="p-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-center text-[10px] font-bold transition-all text-indigo-300 hover:text-indigo-200 col-span-2 shadow-sm cursor-pointer"
                                >
                                    ➕ Create Event / Seminar
                                </button>

                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("greenbook")}
                                    className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-slate-300 hover:text-white cursor-pointer"
                                >
                                    📖 Green Book
                                </button>

                                <button
                                    onClick={() => setCurrentTab && setCurrentTab("papers")}
                                    className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-center text-[10px] font-bold transition-all text-slate-300 hover:text-white cursor-pointer"
                                >
                                    📝 Publications
                                </button>
                            </div>
                        )}
                    </div>

                </div>

            </div>

        </div>
    );
}

export default AnalyticsPanel;
