import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function ReportGeneratorPanel({ currentUser, refreshTrigger }) {
    const [faculties, setFaculties] = useState([]);
    const [selectedFacultyId, setSelectedFacultyId] = useState((currentUser.role === "Principal" || currentUser.role === "HOD") ? "" : (currentUser.id || currentUser._id));
    const [loading, setLoading] = useState(false);
    
    // Dossier data
    const [profile, setProfile] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [activities, setActivities] = useState([]);
    const [papers, setPapers] = useState([]);

    const loadFaculties = async () => {
        if (currentUser.role !== "Principal" && currentUser.role !== "HOD") return;
        try {
            const data = await api.get("/faculty");
            const members = data.faculties || [];
            setFaculties(members);
            if (members.length > 0 && !selectedFacultyId) {
                const selfMember = members.find(m => (m._id || m.id) === (currentUser._id || currentUser.id));
                setSelectedFacultyId(selfMember ? selfMember._id : members[0]._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadFaculties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const compileReport = async () => {
        if (!selectedFacultyId) return;
        setLoading(true);

        try {
            // 1. Fetch Profile
            const profData = await api.get(`/faculty/${selectedFacultyId}`);
            setProfile(profData.faculty || null);

            // 2. Fetch Subjects
            const subData = await api.get("/subjects", { targetUserId: selectedFacultyId });
            setSubjects(subData.subjects || []);

            // 3. Fetch Workshops
            const workData = await api.get("/workshops", { targetUserId: selectedFacultyId });
            setWorkshops(workData.workshops || []);

            // 4. Fetch Activities
            const actData = await api.get("/activities", { targetUserId: selectedFacultyId });
            setActivities(actData.activities || []);

            // 5. Fetch Papers
            const paperData = await api.get("/papers", { targetUserId: selectedFacultyId });
            setPapers(paperData.papers || []);

        } catch (err) {
            console.error("Compilation error:", err);
            alert("Failed to load reports 🔌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedFacultyId) {
            compileReport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFacultyId, refreshTrigger]);

    const handleExportCSV = () => {
        if (!profile) return;
        
        let csv = "data:text/csv;charset=utf-8,";
        csv += "--- FACULTY DOSSIER REPORT SUMMARY ---\n";
        csv += `Member Name,${profile.name}\n`;
        csv += `Designation,${profile.designation}\n`;
        csv += `Department,${profile.department || "General"}\n`;
        csv += `Email,${profile.email}\n`;
        csv += `Phone,${profile.phone || ""}\n`;
        csv += `Performance Score,${profile.performanceScore || 0}%\n\n`;

        csv += "--- SUBJECTS SYLLABUS TRACKER ---\n";
        csv += "Subject Name,Subject Code,Semester,Lectures Planned,Lectures Conducted,Completion Rate\n";
        subjects.forEach(s => {
            const progress = s.lecturesPlanned > 0 ? Math.round((s.lecturesConducted / s.lecturesPlanned) * 100) : 0;
            csv += `"${s.subjectName}","${s.subjectCode}","${s.semester}",${s.lecturesPlanned},${s.lecturesConducted},${progress}%\n`;
        });
        csv += "\n";

        csv += "--- RESEARCH PUBLICATIONS ---\n";
        csv += "Title,Journal,Date,DOI,Co-authors\n";
        papers.forEach(p => {
            csv += `"${p.title}","${p.journal}","${p.date}","${p.doi || ""}","${p.coAuthors || ""}"\n`;
        });
        csv += "\n";

        csv += "--- WORKSHOPS & SEMINARS ---\n";
        csv += "Title,Speaker,Type,Date,Status\n";
        workshops.forEach(w => {
            csv += `"${w.title}","${w.speakerName}","${w.workshopType}","${w.date}","${w.status}"\n`;
        });
        csv += "\n";

        csv += "--- OTHER PORTFOLIOS ---\n";
        csv += "Activity Name,Category,Date\n";
        activities.forEach(act => {
            csv += `"${act.activityName}","${act.category}","${act.date}"\n`;
        });

        const encodedUri = encodeURI(csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Dossier_${profile.name.replace(/\s+/g, '_')}_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            
            {/* ================= HEADER CONTROL BAR ================= */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Academic Profile Report Generator</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Compile comprehensive dossiers for any faculty member, department HOD, or Principal / Administration.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                        <select
                            className="bg-slate-950 border border-slate-800 hover:border-indigo-500 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 font-medium transition cursor-pointer min-w-[280px]"
                            value={selectedFacultyId}
                            onChange={(e) => setSelectedFacultyId(e.target.value)}
                        >
                            <option value="">-- Choose Member / Faculty --</option>
                            
                            {/* Principal & Administration Group */}
                            {faculties.some(f => f.role === "Principal") && (
                                <optgroup label="🏛️ Principal & Administration">
                                    {faculties.filter(f => f.role === "Principal").map(f => (
                                        <option key={f._id} value={f._id}>
                                            {f.name} (Principal &bull; {f.department || "Administration"})
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {/* HODs Group */}
                            {faculties.some(f => f.role === "HOD") && (
                                <optgroup label="👨‍💼 Department Heads (HODs)">
                                    {faculties.filter(f => f.role === "HOD").map(f => (
                                        <option key={f._id} value={f._id}>
                                            {f.name} (HOD &bull; {f.department || f.departmentId?.name || "Dept"})
                                        </option>
                                    ))}
                                </optgroup>
                            )}

                            {/* Faculty Group */}
                            <optgroup label="👨‍🏫 Academic Faculty">
                                {faculties.filter(f => f.role !== "Principal" && f.role !== "HOD").map(f => (
                                    <option key={f._id} value={f._id}>
                                        {f.name} ({f.department || f.departmentId?.name || "General"})
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    )}

                    {profile && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportCSV}
                                className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all"
                            >
                                📥 Export Dossier CSV
                            </button>
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl shadow-lg transition-all"
                            >
                                🖨️ Print Dossier Report
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= INJECT PRINT STYLES ================= */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                        font-family: Arial, sans-serif !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .printable-dossier {
                        background: white !important;
                        color: black !important;
                        padding: 20px !important;
                        border: none !important;
                        box-shadow: none !important;
                        font-size: 11pt !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .printable-dossier * {
                        color: black !important;
                    }
                    .border-print {
                        border: 1px solid #ddd !important;
                    }
                    .table-print th, .table-print td {
                        border: 1px solid #ddd !important;
                        padding: 8px !important;
                    }
                }
            `}} />

            {/* ================= COMPILING DOSSIER REPORT SHEET ================= */}
            {loading && (
                <div className="text-center py-12 text-slate-500 italic text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                    Compiling academic portfolio logs...
                </div>
            )}

            {!loading && profile && (
                <div className="printable-dossier bg-slate-900/60 border border-slate-800 p-8 rounded-2xl shadow-xl max-w-4xl mx-auto space-y-8">
                    
                    {/* Dossier Title Header */}
                    <div className="border-b-2 border-indigo-500/40 pb-5 flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">EduCRM Steering Dossier</h1>
                            <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">Faculty Academic Performance Report</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 font-mono">
                            <p>Generated: {new Date().toLocaleDateString()}</p>
                            <p>Status: CERTIFIED SUMMARY</p>
                        </div>
                    </div>

                    {/* Section 1: Biographical Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                        {/* Avatar thumbnail */}
                        <div className="text-center md:text-left flex justify-center md:block">
                            <div className="w-28 h-28 rounded-xl overflow-hidden border border-slate-850 bg-slate-950 flex items-center justify-center shadow">
                                {profile.photoPath ? (
                                    <img src={profile.photoPath} alt={profile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl">👨‍🏫</span>
                                )}
                            </div>
                        </div>

                        {/* Profiles info */}
                        <div className="md:col-span-3 space-y-2 text-xs">
                            <h2 className="text-base font-bold text-slate-100">{profile.name}</h2>
                            <p className="text-indigo-400 font-bold">{profile.designation} &bull; Dept: {profile.department}</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400 pt-2">
                                <p><strong>Email Address:</strong> {profile.email}</p>
                                <p><strong>Contact phone:</strong> {profile.phone || "Unset"}</p>
                                <p><strong>Joining Date:</strong> {profile.joiningDate || "Unconfigured"}</p>
                                <p><strong>Performance Index Score:</strong> <strong className="text-indigo-300">{profile.performanceScore}%</strong></p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Qualifications About bio */}
                    <div className="space-y-2 text-xs border-t border-slate-850 pt-5">
                        <h3 className="font-bold text-slate-350 uppercase tracking-wider text-[10px]">Academic Qualifications & Experience</h3>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/20 p-3 rounded-xl border border-slate-850">
                            {profile.experience || "No experience summary detailed."}
                        </p>
                    </div>

                    {/* Section 3: Handling subjects in Green Book */}
                    <div className="space-y-3 border-t border-slate-850 pt-5 text-xs">
                        <h3 className="font-bold text-slate-350 uppercase tracking-wider text-[10px]">Green Book (Teaching Syllabus Completion Index)</h3>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left table-print text-[11px] text-slate-300">
                                <thead>
                                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                                        <th className="py-2 px-3">Subject Name</th>
                                        <th className="py-2 px-3">Subject Code</th>
                                        <th className="py-2 px-3">Semester</th>
                                        <th className="py-2 px-3">Lectures Planned</th>
                                        <th className="py-2 px-3">Lectures Conducted</th>
                                        <th className="py-2 px-3">Completion Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-slate-500 italic">
                                                {profile.role === "Principal" 
                                                    ? "🏛️ Institutional Governance & Leadership — No classroom teaching subjects assigned."
                                                    : "No Green Book subjects handbooks registered."}
                                            </td>
                                        </tr>
                                    ) : (
                                        subjects.map(s => {
                                            const progress = s.lecturesPlanned > 0 ? Math.round((s.lecturesConducted / s.lecturesPlanned) * 100) : 0;
                                            return (
                                                <tr key={s._id} className="border-b border-slate-850">
                                                    <td className="py-2.5 px-3 font-semibold text-slate-200">{s.subjectName}</td>
                                                    <td className="py-2.5 px-3 font-mono">{s.subjectCode}</td>
                                                    <td className="py-2.5 px-3">{s.semester}</td>
                                                    <td className="py-2.5 px-3">{s.lecturesPlanned}</td>
                                                    <td className="py-2.5 px-3">{s.lecturesConducted}</td>
                                                    <td className="py-2.5 px-3 font-bold text-indigo-400">{progress}%</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 4: Research Papers list */}
                    <div className="space-y-3 border-t border-slate-850 pt-5 text-xs">
                        <h3 className="font-bold text-slate-350 uppercase tracking-wider text-[10px]">Research Publications (Journals/Conferences)</h3>
                        
                        <div className="space-y-3">
                            {papers.length === 0 ? (
                                <p className="text-slate-500 italic text-[11px]">No peer-reviewed papers logged.</p>
                            ) : (
                                papers.map(p => (
                                    <div key={p._id} className="p-3 bg-slate-950/20 border border-slate-850/60 rounded-xl">
                                        <p className="font-bold text-slate-200">{p.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Journal: <strong className="text-indigo-400 font-semibold">{p.journal}</strong> &bull; Date: {p.date} {p.doi && `&bull; DOI: ${p.doi}`}
                                        </p>
                                        {p.coAuthors && <p className="text-[10px] text-slate-400 mt-0.5">Co-authors: {p.coAuthors}</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Section 5: Workshops logged */}
                    <div className="space-y-3 border-t border-slate-850 pt-5 text-xs">
                        <h3 className="font-bold text-slate-350 uppercase tracking-wider text-[10px]">Workshops & Seminars Compliance</h3>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left table-print text-[11px] text-slate-300">
                                <thead>
                                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                                        <th className="py-2 px-3">Title / Theme</th>
                                        <th className="py-2 px-3">Guest Speaker</th>
                                        <th className="py-2 px-3">Category</th>
                                        <th className="py-2 px-3">Execution Date</th>
                                        <th className="py-2 px-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workshops.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 text-slate-500 italic">No workshops or seminars logged.</td>
                                        </tr>
                                    ) : (
                                        workshops.map(w => (
                                            <tr key={w._id} className="border-b border-slate-850">
                                                <td className="py-2 px-3 font-semibold text-slate-200">{w.title}</td>
                                                <td className="py-2 px-3">{w.speakerName}</td>
                                                <td className="py-2 px-3">{w.workshopType}</td>
                                                <td className="py-2 px-3">{w.date}</td>
                                                <td className="py-2 px-3 font-semibold text-indigo-400">{w.status}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 6: Other Activities logged */}
                    {activities.length > 0 && (
                        <div className="space-y-3 border-t border-slate-850 pt-5 text-xs">
                            <h3 className="font-bold text-slate-350 uppercase tracking-wider text-[10px]">Other Academic, Cultural & Technical Portfolios</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {activities.map(act => (
                                    <div key={act._id} className="p-3 bg-slate-950/20 border border-slate-850/60 rounded-xl flex items-center justify-between text-[11px]">
                                        <div>
                                            <span className="font-bold text-slate-200">{act.activityName}</span>
                                            <p className="text-[9px] text-slate-500 mt-0.5">Date: {act.date} &bull; Portfolio: {act.category}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}

        </div>
    );
}

export default ReportGeneratorPanel;
