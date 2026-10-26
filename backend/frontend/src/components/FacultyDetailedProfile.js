import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function FacultyDetailedProfile({ facultyId, facultyData, onBack, departmentName, currentUser, onRefresh }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [profile, setProfile] = useState(facultyData || null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activities, setActivities] = useState({
        workshops: [],
        papers: [],
        certifications: [],
        otherActivities: [],
        subjects: [],
        feedbacks: []
    });
    const [counts, setCounts] = useState({
        totalWorkshops: 0,
        workshopsOrganized: 0,
        workshopsAttended: 0,
        totalPapers: 0,
        publishedPapers: 0,
        totalCertifications: 0,
        fdpCount: 0,
        totalActivities: 0,
        totalSubjects: 0,
        totalStudents: 0,
        totalFeedbacks: 0
    });
    const [activeTab, setActiveTab] = useState("papers");

    // Password Reset Modal states (Principal Only)
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const targetId = facultyId || facultyData?._id;

    useEffect(() => {
        const fetchFullProfile = async () => {
            if (!targetId) return;
            try {
                setLoading(true);
                setError("");
                const data = await api.get(`/faculty/${targetId}/full-profile`);
                setProfile(data.faculty);
                setActivities(data.activities || {
                    workshops: [],
                    papers: [],
                    certifications: [],
                    otherActivities: [],
                    subjects: [],
                    feedbacks: []
                });
                setCounts(data.activityCounts || {});
            } catch (err) {
                console.error("Failed to load full faculty profile:", err);
                setError(err.message || "Failed to load faculty profile ❌");
            } finally {
                setLoading(false);
            }
        };

        fetchFullProfile();
    }, [targetId]);

    const handleConfirmDelete = async () => {
        if (!profile) return;
        try {
            setIsDeleting(true);
            await api.delete(`/users/${profile._id}`);
            alert(`Faculty account '${profile.name}' has been successfully deleted! ✅`);
            setShowDeleteModal(false);
            if (onRefresh) onRefresh();
            onBack();
        } catch (err) {
            console.error("Delete faculty error:", err);
            alert(err.message || "Failed to delete faculty account ❌");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        setPasswordError("");

        if (!passwordInput || passwordInput.length < 6) {
            setPasswordError("Password must be at least 6 characters long ❌");
            return;
        }

        if (passwordInput !== confirmPasswordInput) {
            setPasswordError("Passwords do not match. Please verify both fields ❌");
            return;
        }

        try {
            setIsSavingPassword(true);
            const res = await api.put(`/users/${profile._id}/password`, {
                password: passwordInput
            });
            alert(res.message || `Password successfully updated for ${profile.name}! Credentials dispatched to ${profile.email}. 📧✅`);
            setShowPasswordModal(false);
        } catch (err) {
            console.error("Assign password error:", err);
            setPasswordError(err.message || "Failed to update user password ❌");
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (loading && !profile) {
        return (
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 animate-fade-in">
                <div className="text-3xl animate-bounce">👤</div>
                <p className="text-xs font-semibold text-slate-300">Loading comprehensive faculty profile & activity records...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-8 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                        <span>← Back</span>
                    </button>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs">
                    {error || "Faculty profile not found."}
                </div>
            </div>
        );
    }

    const deptDisplayName = profile.department || profile.departmentId?.name || departmentName || "Academic Department";

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Top Navigation & Breadcrumb Bar */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:translate-y-0.5"
                    >
                        <span>← Back</span>
                    </button>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <span className="hover:text-slate-200 cursor-pointer" onClick={onBack}>Dashboard</span>
                        <span>/</span>
                        {departmentName && (
                            <>
                                <span className="hover:text-slate-200 cursor-pointer" onClick={onBack}>{departmentName} Department</span>
                                <span>/</span>
                            </>
                        )}
                        <span className="font-bold text-slate-100">{profile.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {profile.role || "Faculty Member"}
                    </span>
                    {currentUser?.role === "Principal" && (
                        <button
                            type="button"
                            onClick={() => {
                                setShowPasswordModal(true);
                                setPasswordInput("");
                                setConfirmPasswordInput("");
                                setPasswordError("");
                                setShowPasswordInModal(false);
                            }}
                            className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title={`Set or reset login password for ${profile.name}`}
                        >
                            <span>🔑</span>
                            <span>Reset Password</span>
                        </button>
                    )}
                    {currentUser?.role === "Principal" && String(profile._id) !== String(currentUser._id || currentUser.id) && (
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title={`Delete faculty account for ${profile.name}`}
                        >
                            <span>🗑️</span>
                            <span>Delete Faculty</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Hero Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Card: Basic Information */}
                <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl shadow-lg text-center space-y-4 flex flex-col items-center">
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-indigo-500/30 bg-slate-950 flex items-center justify-center shadow-lg">
                        {profile.photoPath ? (
                            <img src={profile.photoPath} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl">👨‍🏫</span>
                        )}
                    </div>

                    <div>
                        <h3 className="text-base font-bold text-slate-100 tracking-tight">{profile.name}</h3>
                        <p className="text-xs text-indigo-400 font-semibold mt-0.5">{profile.designation || "Faculty"}</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold mt-2 uppercase tracking-wide">
                            {deptDisplayName}
                        </span>
                    </div>

                    <div className="w-full border-t border-slate-800/80 pt-4 text-left space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-500 font-semibold">Employee ID:</span>
                            <span className="font-mono text-slate-300 font-bold">{profile.employeeId || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-500 font-semibold">Email Address:</span>
                            <span className="text-slate-300 truncate max-w-[180px]" title={profile.email}>{profile.email}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-500 font-semibold">Mobile Number:</span>
                            <span className="font-mono text-indigo-400 font-bold">{profile.phone || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-500 font-semibold">Qualification:</span>
                            <span className="text-slate-300 font-medium">{profile.qualification || "Postgraduate / PhD"}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-500 font-semibold">Joining Date:</span>
                            <span className="text-slate-400">{profile.joiningDate || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <span className="text-slate-500 font-semibold">Account Status:</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Active
                            </span>
                        </div>
                    </div>

                    {profile.resumePath && (
                        <a
                            href={profile.resumePath}
                            download={`${profile.name.replace(/\s+/g, "_")}_Resume.pdf`}
                            className="w-full text-center py-2.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl transition-all block mt-2"
                        >
                            📥 Download Curriculum Vitae
                        </a>
                    )}
                </div>

                {/* Right 2 Columns: Academic & Professional Information */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Biography & Experience */}
                    <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center justify-between">
                            <span>Academic Experience & Biography</span>
                            <span className="text-[10px] text-slate-500 font-normal">Background & Portfolio</span>
                        </h4>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line text-xs">
                            {profile.experience || "Dedicated faculty member contributing to institutional curriculum delivery, student mentorship, and academic excellence."}
                        </p>
                    </div>

                    {/* Research Interests & Specialized Skills */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-2">
                                🔬 Research Interests
                            </h4>
                            <p className="text-slate-400 leading-relaxed text-xs">
                                {profile.researchInterests || "Artificial Intelligence, Data Analytics, Computer Networks, Machine Learning, and Cloud Systems."}
                            </p>
                        </div>

                        <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-2">
                                🎯 Subjects & Skills Specialty
                            </h4>
                            <p className="text-slate-400 leading-relaxed text-xs">
                                {profile.skills || "Object-Oriented Programming, Database Systems, Web Technologies, and Deep Learning Architectures."}
                            </p>
                        </div>
                    </div>

                    {/* Achievements & Accreditation */}
                    <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-2">
                            🏆 Accreditations & Key Achievements
                        </h4>
                        <p className="text-slate-400 leading-relaxed text-xs">
                            {profile.achievements || "Authored peer-reviewed publications, actively mentored student engineering teams, and guided final-year capstone research initiatives."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Dynamic Activity Metrics Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div 
                    onClick={() => setActiveTab("papers")}
                    className={`bg-[#101622] border p-4 rounded-2xl cursor-pointer transition-all ${
                        activeTab === "papers" ? "border-indigo-500 shadow-md bg-indigo-950/20" : "border-slate-800 hover:border-slate-700"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Research Papers</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-extrabold text-slate-100">{counts.totalPapers || 0}</span>
                        <span className="text-[10px] text-indigo-400 font-semibold">({counts.publishedPapers || 0} Pub)</span>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab("workshops")}
                    className={`bg-[#101622] border p-4 rounded-2xl cursor-pointer transition-all ${
                        activeTab === "workshops" ? "border-indigo-500 shadow-md bg-indigo-950/20" : "border-slate-800 hover:border-slate-700"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Workshops</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-extrabold text-slate-100">{counts.totalWorkshops || activities.workshops?.length || 0}</span>
                        <span className="text-[10px] text-indigo-400 font-semibold">Events</span>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab("seminars")}
                    className={`bg-[#101622] border p-4 rounded-2xl cursor-pointer transition-all ${
                        activeTab === "seminars" ? "border-purple-500 shadow-md bg-purple-950/20" : "border-slate-800 hover:border-slate-700"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Seminars</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-extrabold text-purple-300">{counts.totalSeminars || activities.seminars?.length || 0}</span>
                        <span className="text-[10px] text-purple-400 font-semibold">Sessions</span>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab("certifications")}
                    className={`bg-[#101622] border p-4 rounded-2xl cursor-pointer transition-all ${
                        activeTab === "certifications" ? "border-indigo-500 shadow-md bg-indigo-950/20" : "border-slate-800 hover:border-slate-700"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Certifications & FDPs</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-extrabold text-slate-100">{counts.totalCertifications || 0}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">({counts.fdpCount || 0} FDP)</span>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab("subjects")}
                    className={`bg-[#101622] border p-4 rounded-2xl cursor-pointer transition-all ${
                        activeTab === "subjects" ? "border-indigo-500 shadow-md bg-indigo-950/20" : "border-slate-800 hover:border-slate-700"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subjects Handled</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-extrabold text-slate-100">{counts.totalSubjects || 0}</span>
                        <span className="text-[10px] text-indigo-400 font-semibold">({counts.totalStudents || 0} Stud)</span>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab("activities")}
                    className={`bg-[#101622] border p-4 rounded-2xl cursor-pointer transition-all ${
                        activeTab === "activities" ? "border-indigo-500 shadow-md bg-indigo-950/20" : "border-slate-800 hover:border-slate-700"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Other Activities</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-extrabold text-slate-100">{counts.totalActivities || 0}</span>
                        <span className="text-[10px] text-slate-400">Logged</span>
                    </div>
                </div>
            </div>

            {/* Interactive Activity Detail Tabs */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
                {/* Tab Navigation */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                    <button
                        onClick={() => setActiveTab("papers")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "papers"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                        <span>📝 Research Papers ({activities.papers?.length || 0})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("workshops")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "workshops"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                        <span>🛠️ Workshops ({activities.workshops?.length || 0})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("seminars")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "seminars"
                                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                        <span>🎙️ Seminars ({activities.seminars?.length || 0})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("certifications")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "certifications"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                        <span>🏅 Certifications & FDPs ({activities.certifications?.length || 0})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("subjects")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "subjects"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                        <span>📖 Subjects & Green Book ({activities.subjects?.length || 0})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("activities")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "activities"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                        <span>🎯 Academic Activities ({activities.otherActivities?.length || 0})</span>
                    </button>
                </div>

                {/* Tab Content Panels */}
                <div>
                    {/* ================= RESEARCH PAPERS TAB ================= */}
                    {activeTab === "papers" && (
                        <div className="space-y-3">
                            {activities.papers?.length === 0 ? (
                                <p className="text-slate-500 italic py-6 text-center">No research papers logged for this faculty member yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.papers.map(p => (
                                        <div key={p._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <h5 className="font-bold text-slate-100 text-xs">{p.title}</h5>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                    p.publicationStatus === "Published" || p.status === "verified"
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                }`}>
                                                    {p.publicationStatus || p.status || "Published"}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                                                <span>Journal: <strong className="text-slate-300">{p.journal || p.conferenceName || "—"}</strong></span>
                                                <span>Indexing: <strong className="text-indigo-400">{p.indexing || "Peer Reviewed"}</strong></span>
                                                <span>Date: <strong className="text-slate-300">{p.date || p.publicationDate || "—"}</strong></span>
                                                {p.doi && <span>DOI: <strong className="text-slate-300">{p.doi}</strong></span>}
                                            </div>
                                            {p.authors && (
                                                <p className="text-[10px] text-slate-500">Authors: {p.authors}</p>
                                            )}
                                            {p.abstract && (
                                                <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 line-clamp-2">
                                                    {p.abstract}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= WORKSHOPS TAB ================= */}
                    {activeTab === "workshops" && (
                        <div className="space-y-3">
                            {activities.workshops?.length === 0 ? (
                                <p className="text-slate-500 italic py-6 text-center">No workshops logged for this faculty member yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.workshops.map(w => (
                                        <div key={w._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <h5 className="font-bold text-slate-100 text-xs">{w.title}</h5>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{w.description}</p>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    {w.workshopType || w.eventType || "Workshop"}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-900">
                                                <span>Date: <strong className="text-slate-300">{w.date || "—"}</strong></span>
                                                <span>Venue: <strong className="text-slate-300">{w.venue || "Campus Auditorium"}</strong></span>
                                                <span>Speaker: <strong className="text-indigo-400">{w.speakerName || "—"}</strong> ({w.speakerOrganization || "Guest"})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= SEMINARS TAB ================= */}
                    {activeTab === "seminars" && (
                        <div className="space-y-3">
                            {activities.seminars?.length === 0 ? (
                                <p className="text-slate-500 italic py-6 text-center">No seminars or guest lectures logged for this faculty member yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.seminars.map(w => (
                                        <div key={w._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <h5 className="font-bold text-slate-100 text-xs">{w.title}</h5>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{w.description}</p>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                                    🎙️ Seminar / Guest Lecture
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-900">
                                                <span>Date: <strong className="text-slate-300">{w.date || "—"}</strong></span>
                                                <span>Venue: <strong className="text-slate-300">{w.venue || "Auditorium"}</strong></span>
                                                <span>Resource Person: <strong className="text-purple-300">{w.speakerName || "—"}</strong> ({w.speakerOrganization || "Guest"})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= CERTIFICATIONS & FDPS TAB ================= */}
                    {activeTab === "certifications" && (
                        <div className="space-y-3">
                            {activities.certifications?.length === 0 ? (
                                <p className="text-slate-500 italic py-6 text-center">No certifications or FDPs recorded for this faculty member yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.certifications.map(c => (
                                        <div key={c._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <h5 className="font-bold text-slate-100 text-xs">{c.title}</h5>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {c.certificateType || "Certification"}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                                                <span>Issued By: <strong className="text-slate-300">{c.issuedBy || "—"}</strong></span>
                                                <span>Issue Date: <strong className="text-slate-300">{c.issueDate || "—"}</strong></span>
                                                {c.credentialId && <span>Credential ID: <strong className="font-mono text-indigo-400">{c.credentialId}</strong></span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= SUBJECTS & GREEN BOOK TAB ================= */}
                    {activeTab === "subjects" && (
                        <div className="space-y-3">
                            {activities.subjects?.length === 0 ? (
                                <p className="text-slate-500 italic py-6 text-center">No academic subjects assigned to this faculty member yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.subjects.map(s => {
                                        const progress = s.lecturesPlanned > 0 ? Math.round((s.lecturesConducted / s.lecturesPlanned) * 100) : 0;
                                        return (
                                            <div key={s._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5 hover:border-slate-700 transition-colors">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <h5 className="font-bold text-slate-100 text-xs">{s.subjectName}</h5>
                                                        <span className="text-[10px] font-mono text-slate-500 uppercase">{s.subjectCode}</span>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                        {s.students?.length || 0} Students Enrolled
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-slate-400">
                                                        <span>Syllabus Coverage: {s.lecturesConducted || 0} / {s.lecturesPlanned || 0} Lectures</span>
                                                        <span className="font-bold text-slate-200">{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                                                        <div 
                                                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= ACADEMIC ACTIVITIES TAB ================= */}
                    {activeTab === "activities" && (
                        <div className="space-y-3">
                            {activities.otherActivities?.length === 0 ? (
                                <p className="text-slate-500 italic py-6 text-center">No other academic or co-curricular activities recorded yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.otherActivities.map(a => (
                                        <div key={a._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <h5 className="font-bold text-slate-100 text-xs">{a.activityName}</h5>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    {a.category || "Academic"}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">{a.description}</p>
                                            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                                                Date: <strong className="text-slate-300">{a.date}</strong> &bull; Status: <strong className="text-emerald-400">{a.status || "verified"}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Faculty Confirmation Modal (Principal Only) */}
            {showDeleteModal && profile && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                                <span className="text-base">⚠️</span> Confirm Faculty Deletion
                            </div>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="text-slate-500 hover:text-slate-300 text-base font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-2 text-slate-300">
                            <p className="font-semibold text-rose-300">
                                Are you sure you want to permanently delete this faculty profile?
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Use this option if this faculty member has <strong className="text-slate-200">resigned their position</strong> or was <strong className="text-slate-200">removed by institution administration</strong> for any reason. This action is permanent and will completely remove their account and credentials from the institutional roster.
                            </p>
                        </div>

                        <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 text-xs">{profile.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {profile.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{profile.email}</div>
                            <div className="text-[10px] text-slate-400">
                                Department: <span className="text-slate-200 font-semibold">{deptDisplayName}</span>
                            </div>
                            {profile.employeeId && (
                                <div className="text-[10px] text-slate-400">
                                    Employee ID: <span className="font-mono text-slate-200">{profile.employeeId}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end border-t border-slate-800 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
                            >
                                {isDeleting ? (
                                    <span>Deleting...</span>
                                ) : (
                                    <>
                                        <span>🗑️</span>
                                        <span>Yes, Delete Account</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Principal Password Reset Modal */}
            {showPasswordModal && profile && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span>🔑</span> Set Account Password
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Assign or reset login credentials for {profile.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="text-slate-500 hover:text-slate-300 text-base font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* User Profile Card */}
                        <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 text-[12px]">{profile.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {profile.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{profile.email}</div>
                            <div className="text-[10px] text-slate-500 pt-1">
                                Department: <strong className="text-slate-300">{deptDisplayName}</strong>
                            </div>
                        </div>

                        {/* Email Dispatch Notice */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-[11px] text-indigo-300 flex items-start gap-2">
                            <span className="text-base shrink-0">📧</span>
                            <span>
                                An automated email containing the <strong>Username ({profile.email})</strong> and new <strong>password</strong> will be immediately dispatched to the faculty member.
                            </span>
                        </div>

                        {passwordError && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-[11px]">
                                {passwordError}
                            </div>
                        )}

                        <form onSubmit={handleSavePassword} className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        New Password *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none"
                                    >
                                        {showPasswordInModal ? "🙈 Hide" : "👁️ Show"}
                                    </button>
                                </div>
                                <input
                                    type={showPasswordInModal ? "text" : "password"}
                                    required
                                    minLength={6}
                                    placeholder="Enter new password (min. 6 characters)"
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Confirm New Password *
                                </label>
                                <input
                                    type={showPasswordInModal ? "text" : "password"}
                                    required
                                    minLength={6}
                                    placeholder="Confirm new password"
                                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={confirmPasswordInput}
                                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 justify-end border-t border-slate-800 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    disabled={isSavingPassword}
                                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPassword}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                                >
                                    {isSavingPassword ? (
                                        <span>Saving & Dispatching Email...</span>
                                    ) : (
                                        <>
                                            <span>🔑</span>
                                            <span>Save & Email Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FacultyDetailedProfile;
