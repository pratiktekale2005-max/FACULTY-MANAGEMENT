import React, { useState, useEffect } from "react";
import ReportGeneratorPanel from "./ReportGeneratorPanel";
import PrincipalResearchPapers from "./PrincipalResearchPapers";
import { api } from "../services/api";

function ProfilePanel({ currentUser, roleFilter, refreshTrigger, onRefresh }) {
    const [faculties, setFaculties] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Principal specific navigation state: "papers" | "overview" | "directory"
    const [principalSubTab, setPrincipalSubTab] = useState("papers");
    const [principalPapers, setPrincipalPapers] = useState([]);
    
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [selectedPapers, setSelectedPapers] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [performanceCard, setPerformanceCard] = useState(null);

    // Form inputs states
    const [form, setForm] = useState({
        name: "",
        phone: "",
        experience: "",
        skills: "",
        achievements: "",
        photoBase64: "",
        resumeBase64: ""
    });

    const activeProfile = roleFilter === "Faculty" ? faculties[0] : selectedFaculty;

    const loadFaculties = async () => {
        try {
            const data = await api.get("/faculty");
            setFaculties(data.faculties || []);
            
            // If in Faculty view, automatically load the user's own profile details
            if (roleFilter === "Faculty" && data.faculties.length > 0) {
                const myProfile = data.faculties[0];
                setForm({
                    name: myProfile.name || "",
                    phone: myProfile.phone || "",
                    experience: myProfile.experience || "",
                    skills: myProfile.skills || "",
                    achievements: myProfile.achievements || "",
                    photoBase64: myProfile.photoPath || "",
                    resumeBase64: myProfile.resumePath || ""
                });
            }
        } catch (err) {
            console.error("Failed to load profiles:", err);
        }
    };

    // Load Principal's own research papers count and recent publications for summary
    const loadPrincipalPapers = async () => {
        if (currentUser.role === "Principal") {
            try {
                const data = await api.get("/papers", { scope: "self" });
                setPrincipalPapers(data.papers || []);
            } catch (err) {
                console.error("Failed to load Principal papers summary:", err);
            }
        }
    };

    useEffect(() => {
        loadFaculties();
        loadPrincipalPapers();
        setSelectedFaculty(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, refreshTrigger]);

    useEffect(() => {
        const fetchPerformance = async () => {
            if (activeProfile && activeProfile._id) {
                try {
                    const card = await api.get(`/performance/${activeProfile._id}`);
                    setPerformanceCard(card);
                } catch (e) {
                    console.error("Failed to load performance scorecard:", e);
                }
            }
        };
        fetchPerformance();
    }, [activeProfile, faculties]);

    // Inspect detailed portfolio (Principal only)
    const handleInspectFaculty = async (fac) => {
        setSelectedFaculty(fac);
        try {
            // Load their Green Book subjects
            const subData = await api.get("/subjects", { userId: fac._id, role: "Faculty" });
            setSelectedSubjects(subData.subjects || []);

            // Load their papers
            const paperData = await api.get("/papers", { userId: fac._id, role: "Faculty" });
            setSelectedPapers(paperData.papers || []);
        } catch (err) {
            console.error("Failed to load faculty details:", err);
        }
    };

    // Convert file to base64
    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({
                ...prev,
                [field]: reader.result
            }));
        };
        reader.readAsDataURL(file);
    };

    // Handle profile update
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put("/faculty/profile", form);
            alert("Profile details updated successfully! ✅");
            setIsEditing(false);
            loadFaculties();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to update profile ❌");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* ================= PRINCIPAL PROFILE SUB-NAVIGATION TABS ================= */}
            {currentUser.role === "Principal" && (
                <div className="bg-[#101622] border border-slate-800 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setPrincipalSubTab("papers"); setSelectedFaculty(null); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                principalSubTab === "papers" && !selectedFaculty
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            }`}
                        >
                            <span>📝 My Research Papers</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 font-black">
                                {principalPapers.length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setPrincipalSubTab("overview"); setSelectedFaculty(null); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                principalSubTab === "overview" && !selectedFaculty
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            }`}
                        >
                            <span>👤 Principal Profile Overview</span>
                        </button>

                        <button
                            onClick={() => { setPrincipalSubTab("directory"); setSelectedFaculty(null); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                principalSubTab === "directory" || selectedFaculty
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            }`}
                        >
                            <span>👥 Faculty Directory Inspection</span>
                        </button>
                    </div>

                    <div className="px-3 text-[11px] text-slate-400 hidden sm:block">
                        Logged in as: <strong className="text-slate-200">{currentUser.fullName || currentUser.name}</strong> (Principal)
                    </div>
                </div>
            )}

            {/* ================= PRINCIPAL VIEW: SELF RESEARCH PAPERS ================= */}
            {currentUser.role === "Principal" && principalSubTab === "papers" && !selectedFaculty && (
                <PrincipalResearchPapers currentUser={currentUser} />
            )}

            {/* ================= PRINCIPAL VIEW: PROFILE OVERVIEW ================= */}
            {currentUser.role === "Principal" && principalSubTab === "overview" && !selectedFaculty && (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-6">
                        <div className="w-28 h-28 rounded-2xl bg-indigo-600/10 border-2 border-indigo-500/30 flex items-center justify-center text-5xl shrink-0 shadow-md">
                            🏛️
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-1.5">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <h2 className="text-xl font-black text-slate-100">{currentUser.fullName || currentUser.name}</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    Head of Institution
                                </span>
                            </div>
                            <p className="text-xs text-indigo-400 font-semibold">Principal & Director of Academic Affairs</p>
                            <p className="text-xs text-slate-400 max-w-xl">
                                Directing institutional excellence, curriculum delivery, academic accreditations, and research scholarship portfolios.
                            </p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-slate-400">
                                <span>📧 {currentUser.email}</span>
                                <span>🏢 Directorate of Academic Administration</span>
                            </div>
                        </div>
                    </div>

                    {/* Principal Research Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl space-y-1 shadow-md">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Self Research Publications</span>
                            <div className="text-2xl font-black text-slate-100">{principalPapers.length}</div>
                            <span className="text-[10px] text-indigo-400 font-medium">Logged in personal research portfolio</span>
                        </div>

                        <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl space-y-1 shadow-md">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Scopus / SCI Indexed</span>
                            <div className="text-2xl font-black text-slate-100">
                                {principalPapers.filter(p => (p.indexing || "").toLowerCase().includes("scopus") || (p.indexing || "").toLowerCase().includes("sci")).length}
                            </div>
                            <span className="text-[10px] text-emerald-400 font-medium">Peer-reviewed international standard</span>
                        </div>

                        <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl space-y-1 shadow-md">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Faculty Members Overseen</span>
                            <div className="text-2xl font-black text-slate-100">{faculties.length}</div>
                            <span className="text-[10px] text-purple-400 font-medium">Across all academic departments</span>
                        </div>
                    </div>

                    {/* Recent Self Publications Showcase */}
                    <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Recent Research Publications</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Your most recently registered papers and conference publications</p>
                            </div>
                            <button
                                onClick={() => setPrincipalSubTab("papers")}
                                className="px-3.5 py-1.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl text-xs font-semibold transition-all"
                            >
                                Manage All Research Papers →
                            </button>
                        </div>

                        {principalPapers.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 italic">
                                No research publications logged yet. Click "Manage All Research Papers" to add your papers.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {principalPapers.slice(0, 3).map(paper => (
                                    <div key={paper._id} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    {paper.publicationType || "Journal Article"}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {paper.indexing || "Scopus"}
                                                </span>
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-200 leading-snug">{paper.title}</h4>
                                            <p className="text-[11px] text-slate-400">{paper.journal || paper.conferenceName} &bull; {paper.publicationDate || paper.date}</p>
                                        </div>
                                        <button
                                            onClick={() => setPrincipalSubTab("papers")}
                                            className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium shrink-0"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= PRINCIPAL & HOD: FACULTY DIRECTORY VIEW ================= */}
            {((currentUser.role === "Principal" && principalSubTab === "directory") || (currentUser.role === "HOD" && roleFilter === "HOD")) && !selectedFaculty && (
                <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Faculty Directory Roster</h2>
                    <p className="text-xs text-slate-400 mb-6">Inspect academic credentials, teaching progress, and NAAC steering metrics of all registered members.</p>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-slate-300">
                            <thead>
                                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider text-left">
                                    <th className="py-3 px-4">Faculty Name</th>
                                    <th className="py-3 px-4">Designation</th>
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4">Performance Index</th>
                                    <th className="py-3 px-4 text-center">Portfolio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faculties.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-slate-500 italic">
                                            {roleFilter === "HOD" ? "No faculty members assigned to your department." : "No faculty accounts found."}
                                        </td>
                                    </tr>
                                ) : (
                                    faculties.map((f) => (
                                        <tr key={f._id} className="border-b border-slate-850 hover:bg-slate-850/40 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-200 flex items-center gap-2.5">
                                                {f.photoPath ? (
                                                    <img src={f.photoPath} alt={f.name} className="w-8 h-8 rounded-full object-cover border border-slate-800" />
                                                ) : (
                                                    <span className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm">👨‍🏫</span>
                                                )}
                                                {f.name}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-350">{f.designation}</td>
                                            <td className="py-3.5 px-4">
                                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                                    {f.department}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-200">{f.performanceScore}%</span>
                                                    <div className="w-16 bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="bg-indigo-650 h-full rounded-full" 
                                                            style={{ width: `${f.performanceScore}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleInspectFaculty(f)}
                                                    className="px-3.5 py-1.5 text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all"
                                                >
                                                    Inspect Portfolio
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================= INSPECT MODE / EDIT MODE WRAPPER ================= */}
            {activeProfile && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left Column: Avatar & contact details */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-lg text-center space-y-4 flex flex-col items-center">
                        {(roleFilter === "Principal" || roleFilter === "HOD") && (
                            <div className="flex flex-col items-stretch gap-2.5 w-full">
                                <button
                                    onClick={() => setSelectedFaculty(null)}
                                    className="self-start text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                                >
                                    ← Back to Directory
                                </button>
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="w-full py-2.5 text-[10px] font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-md"
                                >
                                    🖨️ Generate Summary Report
                                </button>
                            </div>
                        )}

                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-indigo-500/40 bg-slate-950 flex items-center justify-center shadow-lg">
                            {activeProfile.photoPath ? (
                                <img src={activeProfile.photoPath} alt={activeProfile.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">👨‍🏫</span>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-200">{activeProfile.name}</h3>
                            <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">{activeProfile.designation}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold mt-2 uppercase tracking-wide">
                                {activeProfile.department}
                            </span>
                        </div>

                        <div className="w-full border-t border-slate-800/60 pt-4 text-left space-y-2.5 text-xs">
                            <p className="text-slate-400 flex items-center gap-2">
                                <span className="text-slate-500">📧</span> {activeProfile.email}
                            </p>
                            <p className="text-slate-400 flex items-center gap-2">
                                <span className="text-slate-500">📞</span> {activeProfile.phone || <span className="italic text-slate-600">No contact number</span>}
                            </p>
                            <p className="text-slate-400 flex items-center gap-2">
                                <span className="text-slate-500">📅</span> Joining: {activeProfile.joiningDate || <span className="italic text-slate-600">Unconfigured</span>}
                            </p>
                        </div>

                        {activeProfile.resumePath && (
                            <a
                                href={activeProfile.resumePath}
                                download={`${activeProfile.name.replace(/\s+/g, "_")}_CV.pdf`}
                                className="w-full text-center py-2.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl transition-all block mt-4"
                            >
                                📥 Download Curriculum Vitae
                            </a>
                        )}

                        {roleFilter === "Faculty" && (
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="w-full py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl transition-all"
                            >
                                {isEditing ? "Close Editor" : "Modify Bio details"}
                            </button>
                        )}
                    </div>

                    {/* Right Column: Bio profile, handle portfolios (Green Book & Tasks if Principal) */}
                    <div className="lg:col-span-2 space-y-6">
                        {!isEditing ? (
                            <>
                                {/* Detailed Biography info */}
                                <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Academic Biography & Experience</h4>
                                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                                        {activeProfile.experience || "No previous teaching credentials logged."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Subjects Specialties</h4>
                                        <p className="text-xs text-slate-350 leading-relaxed">
                                            {activeProfile.skills || "No specific subjects specialized."}
                                        </p>
                                    </div>

                                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Accreditation Achievements</h4>
                                        <p className="text-xs text-slate-355 leading-relaxed">
                                            {activeProfile.achievements || "No external academic honors logged."}
                                        </p>
                                    </div>
                                </div>

                                {/* Configurable Appraisal Scorecard Panel */}
                                {performanceCard && (
                                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center justify-between">
                                            <span>Performance appraisal Scorecard</span>
                                            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20 text-xs">
                                                {performanceCard.overallScore} / 100
                                            </span>
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {Object.keys(performanceCard.breakdown || {}).map(catName => {
                                                const cat = performanceCard.breakdown[catName];
                                                return (
                                                    <div key={catName} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
                                                        <div className="flex items-center justify-between font-bold text-[10px] text-slate-300">
                                                            <span>{catName}</span>
                                                            <span className="text-indigo-400">{cat.score} / {cat.weight} pts</span>
                                                        </div>
                                                        <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                                            <div 
                                                                className="bg-indigo-600 h-full rounded-full" 
                                                                style={{ width: `${cat.rawProgress}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                                                            <span>Progress: {cat.rawProgress}%</span>
                                                            {cat.count !== undefined && <span>Count: {cat.count}</span>}
                                                            {cat.averageStars !== undefined && <span>Avg Rating: {cat.averageStars} ★</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* PRINCIPAL & HOD DETAILED PORTFOLIO INSPECTION */}
                                {(roleFilter === "Principal" || roleFilter === "HOD") && (
                                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">
                                            Green Book Progress Checklist
                                        </h4>
                                        
                                        <div className="space-y-4">
                                            {selectedSubjects.length === 0 ? (
                                                <p className="text-xs text-slate-500 italic py-2">No active subjects registered in Green Book.</p>
                                            ) : (
                                                selectedSubjects.map(sub => {
                                                    const lecPercent = sub.lecturesPlanned > 0 ? Math.round((sub.lecturesConducted / sub.lecturesPlanned) * 100) : 0;
                                                    return (
                                                        <div key={sub._id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
                                                            <div>
                                                                <span className="text-xs font-bold text-slate-200">{sub.subjectName}</span>
                                                                <div className="text-[10px] text-slate-400 mt-1">Code: {sub.subjectCode} &bull; Sem: {sub.semester}</div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-4 text-right">
                                                                <div>
                                                                    <span className="text-xs font-bold text-indigo-400">{lecPercent}%</span>
                                                                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Syllabus</p>
                                                                </div>
                                                                <div className="w-20 bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                                                    <div className="bg-indigo-600 h-full" style={{ width: `${lecPercent}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2 pt-2">
                                            Research Publications & Papers
                                        </h4>

                                        <div className="space-y-3">
                                            {selectedPapers.length === 0 ? (
                                                <p className="text-xs text-slate-500 italic py-2">No papers published.</p>
                                            ) : (
                                                selectedPapers.map(p => (
                                                    <div key={p._id} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs flex justify-between items-center gap-2">
                                                        <div>
                                                            <span className="font-semibold text-slate-200">{p.title}</span>
                                                            <p className="text-[9px] text-slate-500 mt-0.5">Journal: {p.journal} &bull; Date: {p.date}</p>
                                                        </div>
                                                        {p.fileBase64 && (
                                                            <a 
                                                                href={p.fileBase64} 
                                                                download={`${p.title.replace(/\s+/g, "_")}_preprint.pdf`}
                                                                className="text-indigo-400 hover:text-indigo-300 font-bold underline shrink-0 text-[10px]"
                                                            >
                                                                Preprint
                                                            </a>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            // EDIT PROFILE FORM (Faculty only)
                            <form onSubmit={handleUpdateProfile} className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                                <h4 className="text-xs font-bold text-slate-200">Edit Personal Profile Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</label>
                                        <input
                                            type="text"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Profile Photo (Image File)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="w-full text-xs text-slate-450 border border-slate-800 rounded-xl p-1 bg-slate-950"
                                            onChange={(e) => handleFileChange(e, "photoBase64")}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Curriculum Vitae (PDF)</label>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="w-full text-xs text-slate-450 border border-slate-800 rounded-xl p-1 bg-slate-950"
                                            onChange={(e) => handleFileChange(e, "resumeBase64")}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Qualifications & Teaching Experience</label>
                                        <textarea
                                            rows="3"
                                            value={form.experience}
                                            onChange={(e) => setForm({ ...form, experience: e.target.value })}
                                            placeholder="Outline degrees, institutions, research and designations..."
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Key Specializations / Handled Subjects</label>
                                        <input
                                            type="text"
                                            value={form.skills}
                                            onChange={(e) => setForm({ ...form, skills: e.target.value })}
                                            placeholder="DBMS, Machine Learning, Power Grids"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">NAAC Steering Awards</label>
                                        <input
                                            type="text"
                                            value={form.achievements}
                                            onChange={(e) => setForm({ ...form, achievements: e.target.value })}
                                            placeholder="e.g. Published IEEE Paper 2024"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg"
                                    >
                                        {loading ? "Saving..." : "Save Profile Details"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                </div>
            )}

            {/* ================= REPORT OVERLAY MODAL ================= */}
            {showReportModal && selectedFaculty && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-4xl w-full relative shadow-2xl overflow-y-auto max-h-[90vh] print:max-h-full print:bg-white print:border-0 print:p-0">
                        <button 
                            onClick={() => setShowReportModal(false)}
                            className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-slate-200 print:hidden"
                        >
                            ✕ Close Preview
                        </button>
                        <div className="pt-4">
                            <ReportGeneratorPanel 
                                currentUser={{ id: selectedFaculty._id, role: "Faculty", department: selectedFaculty.department }} 
                                refreshTrigger={refreshTrigger}
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default ProfilePanel;
