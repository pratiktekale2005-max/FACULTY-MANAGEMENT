import React, { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";

const REPORT_TYPES = [
    { id: "comprehensive", label: "Comprehensive Faculty Dossier", icon: "📑", desc: "Complete academic portfolio including profile, teaching, publications, certifications, events, and submissions." },
    { id: "apar", label: "Annual Performance Appraisal (PBAS / APAR)", icon: "📊", desc: "Official self-appraisal summary for annual increments, CAS promotions, and performance index." },
    { id: "research", label: "Research & Publications Summary", icon: "🔬", desc: "Indexed journals (Scopus/WoS), conference papers, citations, preprints, and DOI links." },
    { id: "naac", label: "NAAC / NBA Accreditation Summary", icon: "🏛️", desc: "FDPs, STTPs, continuous evaluations, workshop organization, and institutional compliance." },
    { id: "teaching", label: "Teaching & Green Book Report", icon: "📖", desc: "Syllabus completion indices, course files, lecture conduction, and student assessments." }
];

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
    "All Academic Years",
    `${CURRENT_YEAR - 2}-${CURRENT_YEAR - 1}`,
    `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
    `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
    `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`
];

function ReportGeneratorPanel({ currentUser, refreshTrigger }) {
    const [faculties, setFaculties] = useState([]);
    const [selectedFacultyId, setSelectedFacultyId] = useState(currentUser.role === "Principal" || currentUser.role === "HOD" ? (currentUser._id || currentUser.id) : (currentUser._id || currentUser.id));
    const [loading, setLoading] = useState(false);
    
    // Configurations
    const [selectedReportType, setSelectedReportType] = useState("comprehensive");
    const [selectedAcademicYear, setSelectedAcademicYear] = useState("All Academic Years");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Live Dossier CRM Data
    const [profile, setProfile] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [activities, setActivities] = useState([]);
    const [papers, setPapers] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [submissions, setSubmissions] = useState([]);

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
            console.error("Failed to load faculty roster:", err);
        }
    };

    useEffect(() => {
        loadFaculties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const compileReport = async () => {
        const targetId = selectedFacultyId || (currentUser._id || currentUser.id);
        if (!targetId) return;

        setLoading(true);
        try {
            // 1. Profile
            let prof = null;
            try {
                const profData = await api.get(`/faculty/${targetId}`);
                prof = profData.faculty || null;
            } catch {
                prof = currentUser;
            }
            setProfile(prof || currentUser);

            // 2. Green Book / Subjects
            try {
                const subData = await api.get("/subjects", { targetUserId: targetId });
                setSubjects(subData.subjects || []);
            } catch {
                setSubjects([]);
            }

            // 3. Workshops & Events
            try {
                const workData = await api.get("/workshops", { targetUserId: targetId });
                setWorkshops(workData.workshops || []);
            } catch {
                setWorkshops([]);
            }

            // 4. Other Activities
            try {
                const actData = await api.get("/activities", { targetUserId: targetId });
                setActivities(actData.activities || []);
            } catch {
                setActivities([]);
            }

            // 5. Research Papers
            try {
                const paperData = await api.get("/papers", { targetUserId: targetId });
                setPapers(paperData.papers || []);
            } catch {
                setPapers([]);
            }

            // 6. Certifications
            try {
                const certData = await api.get("/certifications", { targetUserId: targetId });
                setCertifications(certData.certifications || []);
            } catch {
                setCertifications([]);
            }

            // 7. Submissions
            try {
                const submisData = await api.get("/submissions", { targetUserId: targetId });
                setSubmissions(submisData.submissions || []);
            } catch {
                setSubmissions([]);
            }

        } catch (err) {
            console.error("Compilation error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        compileReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFacultyId, refreshTrigger]);

    // Filter data by academic year & date range if selected
    const filteredData = useMemo(() => {
        const matchesDate = (itemDate) => {
            if (!itemDate) return true;
            const d = new Date(itemDate);
            if (startDate && d < new Date(startDate)) return false;
            if (endDate && d > new Date(endDate)) return false;
            return true;
        };

        const matchesYear = (itemYear) => {
            if (selectedAcademicYear === "All Academic Years") return true;
            return itemYear === selectedAcademicYear;
        };

        return {
            papers: papers.filter(p => matchesDate(p.date)),
            certifications: certifications.filter(c => matchesYear(c.academicYear) && matchesDate(c.issueDate)),
            workshops: workshops.filter(w => matchesDate(w.date)),
            activities: activities.filter(a => matchesYear(a.academicYear) && matchesDate(a.startDate || a.date)),
            submissions: submissions.filter(s => matchesYear(s.academicYear) && matchesDate(s.submissionDate)),
            subjects: subjects
        };
    }, [papers, certifications, workshops, activities, submissions, subjects, selectedAcademicYear, startDate, endDate]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        if (!profile) return;
        
        let csv = "data:text/csv;charset=utf-8,";
        csv += "========================================================\n";
        csv += `INSTITUTIONAL FACULTY DOSSIER REPORT: ${profile.name.toUpperCase()}\n`;
        csv += `Report Type: ${REPORT_TYPES.find(r => r.id === selectedReportType)?.label}\n`;
        csv += `Academic Year Filter: ${selectedAcademicYear}\n`;
        csv += `Generation Date: ${new Date().toLocaleString()}\n`;
        csv += "========================================================\n\n";

        csv += "--- FACULTY PROFILE SUMMARY ---\n";
        csv += `Full Name,${profile.name}\n`;
        csv += `Employee ID,${profile.employeeId || "N/A"}\n`;
        csv += `Official Email,${profile.email}\n`;
        csv += `Contact Phone,${profile.phone || "N/A"}\n`;
        csv += `Department,${profile.department || "General"}\n`;
        csv += `Designation,${profile.designation || "Assistant Professor"}\n`;
        csv += `Highest Qualification,${profile.qualification || "N/A"}\n`;
        csv += `Specialization,${profile.skills || "N/A"}\n\n`;

        // Certifications
        csv += "--- PROFESSIONAL CERTIFICATIONS & FDPS ---\n";
        csv += "Certificate Title,Issuing Organization,Type,Issue Date,Expiry Date,Credential ID,Verification URL\n";
        filteredData.certifications.forEach(c => {
            csv += `"${c.title}","${c.issuedBy}","${c.type || c.certificateType}","${c.issueDate ? c.issueDate.split("T")[0] : ""}","${c.expiryDate ? c.expiryDate.split("T")[0] : ""}","${c.credentialId || ""}","${c.verificationUrl || ""}"\n`;
        });
        csv += "\n";

        // Research Papers
        csv += "--- RESEARCH PAPERS & PUBLICATIONS ---\n";
        csv += "Paper Title,Journal / Conference,Publication Date,DOI,Indexing,Status,Co-authors\n";
        filteredData.papers.forEach(p => {
            csv += `"${p.title}","${p.journal || p.conferenceName}","${p.date ? p.date.split("T")[0] : ""}","${p.doi || ""}","${p.indexing || ""}","${p.publicationStatus || ""}","${p.coAuthors || ""}"\n`;
        });
        csv += "\n";

        // Workshops / Events
        csv += "--- EVENTS & WORKSHOPS ORGANIZED / ATTENDED ---\n";
        csv += "Event Title,Resource Speaker,Type,Date,Status\n";
        filteredData.workshops.forEach(w => {
            csv += `"${w.title}","${w.speakerName}","${w.workshopType}","${w.date ? w.date.split("T")[0] : ""}","${w.status}"\n`;
        });
        csv += "\n";

        // Other Activities
        csv += "--- OTHER ACTIVITIES & CONTRIBUTIONS ---\n";
        csv += "Activity Title,Category,Faculty Role,Date,Organizer\n";
        filteredData.activities.forEach(a => {
            csv += `"${a.activityName}","${a.category}","${a.facultyRole || ""}","${a.startDate || a.date || ""}","${a.organizer || ""}"\n`;
        });
        csv += "\n";

        // Submissions
        csv += "--- COMPLIANCE SUBMISSIONS ---\n";
        csv += "Submission Title,Type,Academic Year,Status,Reviewer Remarks\n";
        filteredData.submissions.forEach(s => {
            csv += `"${s.title}","${s.type}","${s.academicYear}","${s.status}","${s.reviewerRemarks || ""}"\n`;
        });

        const encodedUri = encodeURI(csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${profile.name.replace(/\s+/g, "_")}_${selectedReportType}_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isComprehensive = selectedReportType === "comprehensive";
    const isApar = selectedReportType === "apar";
    const isResearch = selectedReportType === "research";
    const isNaac = selectedReportType === "naac";
    const isTeaching = selectedReportType === "teaching";

    return (
        <div className="space-y-6 text-slate-100 pb-12 animate-fade-in text-xs">
            {/* Header / Config Bar (Hidden during print) */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 print:hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>📊</span> Institutional Faculty Report Generator
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Generate authentic academic performance dossiers, NAAC compliance portfolios, and APAR reviews from live CRM data.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={!profile || loading}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <span>📥</span>
                            <span>Export CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={!profile || loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                        >
                            <span>🖨️</span>
                            <span>Print / Save as PDF</span>
                        </button>
                    </div>
                </div>

                {/* Selectors Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-slate-800">
                    {/* Faculty Selector (Only for Principal / HOD) */}
                    {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Select Faculty Member
                            </label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                                value={selectedFacultyId}
                                onChange={(e) => setSelectedFacultyId(e.target.value)}
                            >
                                {faculties.map(f => (
                                    <option key={f._id} value={f._id}>
                                        {f.name} ({f.role} &bull; {f.department || "General"})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Report Type Selector */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Select Report Type *
                        </label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                            value={selectedReportType}
                            onChange={(e) => setSelectedReportType(e.target.value)}
                        >
                            {REPORT_TYPES.map(r => (
                                <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Academic Year Filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Academic Year Filter
                        </label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                            value={selectedAcademicYear}
                            onChange={(e) => setSelectedAcademicYear(e.target.value)}
                        >
                            {ACADEMIC_YEARS.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Start & End */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Date Range (Optional)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                placeholder="From"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-slate-300 focus:border-indigo-500 focus:outline-none"
                            />
                            <input
                                type="date"
                                placeholder="To"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-slate-300 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles Injection */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'Times New Roman', Times, serif, Arial !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .printable-sheet {
                        background: #ffffff !important;
                        color: #111827 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        font-size: 10pt !important;
                    }
                    .printable-sheet * {
                        color: #111827 !important;
                    }
                    .printable-sheet table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                    }
                    .printable-sheet th, .printable-sheet td {
                        border: 1px solid #cbd5e1 !important;
                        padding: 6px 8px !important;
                        font-size: 9pt !important;
                    }
                    .printable-sheet th {
                        background-color: #f1f5f9 !important;
                        font-weight: bold !important;
                    }
                    .print-signature-box {
                        display: flex !important;
                        justify-content: space-between !important;
                        margin-top: 40px !important;
                    }
                }
            `}} />

            {/* REPORT PREVIEW CANVAS */}
            {loading ? (
                <div className="p-16 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Gathering authenticated CRM records and compiling dossier...
                </div>
            ) : !profile ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
                    No faculty profile available to generate report.
                </div>
            ) : (
                <div className="printable-sheet bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-4xl mx-auto space-y-6">
                    {/* Institutional Header Banner */}
                    <div className="border-b-2 border-indigo-500/50 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                COLLEGE OF ENGINEERING &amp; TECHNOLOGY
                            </h1>
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">
                                {REPORT_TYPES.find(r => r.id === selectedReportType)?.label || "Faculty Academic Dossier"}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Academic Year: {selectedAcademicYear} {startDate && `(${startDate} to ${endDate || "Present"})`}
                            </p>
                        </div>
                        <div className="text-right text-[11px] text-slate-400 font-mono">
                            <p className="font-bold text-slate-200">Generated: {new Date().toLocaleDateString()}</p>
                            <p className="text-[10px] text-emerald-400">STATUS: AUTHENTICATED</p>
                            <p className="text-[10px] text-slate-500">Ref: EDU-{profile.employeeId || "CRM"}-{Date.now().toString().slice(-4)}</p>
                        </div>
                    </div>

                    {/* Section 1: Faculty Identification Summary */}
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center shrink-0">
                            {profile.photoPath ? (
                                <img src={profile.photoPath} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">👨‍🏫</span>
                            )}
                        </div>

                        <div className="flex-1 space-y-2 text-center sm:text-left">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {profile.role}
                                </span>
                            </div>

                            <p className="text-xs text-indigo-300 font-semibold">
                                {profile.designation || "Assistant Professor"} &bull; Department of {profile.department || "Engineering"}
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-300">
                                <p><span className="text-slate-500">Email:</span> {profile.email}</p>
                                <p><span className="text-slate-500">Phone:</span> {profile.phone || "—"}</p>
                                <p><span className="text-slate-500">Emp ID:</span> <span className="font-mono font-bold text-indigo-400">{profile.employeeId || "—"}</span></p>
                                <p><span className="text-slate-500">Qualification:</span> {profile.qualification || "—"}</p>
                                <p><span className="text-slate-500">Specialization:</span> {profile.skills || "—"}</p>
                                <p><span className="text-slate-500">Joining Date:</span> {profile.joiningDate || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Teaching & Green Book Syllabus Status (Comprehensive, APAR, Teaching) */}
                    {(isComprehensive || isApar || isTeaching) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                <span>📖</span> Teaching &amp; Continuous Assessment Records
                            </h3>

                            {filteredData.subjects.length === 0 ? (
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
                                    No classroom teaching or Green Book subjects assigned for this period.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-800">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase">
                                                <th className="py-2.5 px-3">Subject Name</th>
                                                <th className="py-2.5 px-3">Code</th>
                                                <th className="py-2.5 px-3">Semester</th>
                                                <th className="py-2.5 px-3 text-center">Planned</th>
                                                <th className="py-2.5 px-3 text-center">Conducted</th>
                                                <th className="py-2.5 px-3 text-center">Completion Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {filteredData.subjects.map(s => {
                                                const rate = s.lecturesPlanned > 0 ? Math.round((s.lecturesConducted / s.lecturesPlanned) * 100) : 0;
                                                return (
                                                    <tr key={s._id} className="hover:bg-slate-850/30">
                                                        <td className="py-2 px-3 font-semibold text-slate-200">{s.subjectName}</td>
                                                        <td className="py-2 px-3 font-mono text-slate-400">{s.subjectCode}</td>
                                                        <td className="py-2 px-3 text-slate-300">{s.semester}</td>
                                                        <td className="py-2 px-3 text-center font-mono">{s.lecturesPlanned}</td>
                                                        <td className="py-2 px-3 text-center font-mono">{s.lecturesConducted}</td>
                                                        <td className="py-2 px-3 text-center font-bold text-emerald-400">{rate}%</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 3: Professional Certifications & FDPs (Comprehensive, APAR, NAAC) */}
                    {(isComprehensive || isApar || isNaac) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                <span>📜</span> Professional Certifications, FDPs &amp; STTPs ({filteredData.certifications.length})
                            </h3>

                            {filteredData.certifications.length === 0 ? (
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
                                    No professional certifications recorded for this period.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-800">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase">
                                                <th className="py-2.5 px-3">Certificate Title</th>
                                                <th className="py-2.5 px-3">Issuing Body</th>
                                                <th className="py-2.5 px-3">Type</th>
                                                <th className="py-2.5 px-3">Issue Date</th>
                                                <th className="py-2.5 px-3">Academic Year</th>
                                                <th className="py-2.5 px-3">Credential ID</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {filteredData.certifications.map(c => (
                                                <tr key={c._id} className="hover:bg-slate-850/30">
                                                    <td className="py-2 px-3 font-semibold text-slate-200">{c.title}</td>
                                                    <td className="py-2 px-3 text-slate-300">{c.issuedBy}</td>
                                                    <td className="py-2 px-3 text-indigo-400">{c.type || c.certificateType}</td>
                                                    <td className="py-2 px-3 font-mono text-slate-400">{c.issueDate ? c.issueDate.split("T")[0] : "—"}</td>
                                                    <td className="py-2 px-3 text-slate-300">{c.academicYear || "—"}</td>
                                                    <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{c.credentialId || c.certificateNumber || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 4: Research Papers & Scholarly Publications (Comprehensive, APAR, Research, NAAC) */}
                    {(isComprehensive || isApar || isResearch || isNaac) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                <span>📚</span> Research Publications &amp; Conference Papers ({filteredData.papers.length})
                            </h3>

                            {filteredData.papers.length === 0 ? (
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
                                    No peer-reviewed papers or publications logged for this period.
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {filteredData.papers.map(p => (
                                        <div key={p._id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-slate-100">{p.title}</span>
                                                <div className="flex items-center gap-1.5">
                                                    {p.indexing && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            {p.indexing}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-mono">{p.date ? p.date.split("T")[0] : ""}</span>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-indigo-300">
                                                {p.journal || p.conferenceName} &bull; Status: {p.publicationStatus || "Published"} {p.doi && `&bull; DOI: ${p.doi}`}
                                            </p>
                                            {p.coAuthors && (
                                                <p className="text-[10px] text-slate-400">Co-Authors: {p.coAuthors}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 5: Workshops, Seminars & Events (Comprehensive, APAR, NAAC) */}
                    {(isComprehensive || isApar || isNaac) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                <span>📅</span> Workshops, Seminars &amp; Events Organized / Attended ({filteredData.workshops.length})
                            </h3>

                            {filteredData.workshops.length === 0 ? (
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
                                    No workshops or events recorded for this period.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-800">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase">
                                                <th className="py-2.5 px-3">Event Theme / Title</th>
                                                <th className="py-2.5 px-3">Resource Person</th>
                                                <th className="py-2.5 px-3">Category</th>
                                                <th className="py-2.5 px-3">Date</th>
                                                <th className="py-2.5 px-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {filteredData.workshops.map(w => (
                                                <tr key={w._id} className="hover:bg-slate-850/30">
                                                    <td className="py-2 px-3 font-semibold text-slate-200">{w.title}</td>
                                                    <td className="py-2 px-3 text-slate-300">{w.speakerName || "—"}</td>
                                                    <td className="py-2 px-3 text-indigo-400">{w.workshopType}</td>
                                                    <td className="py-2 px-3 font-mono text-slate-400">{w.date ? w.date.split("T")[0] : "—"}</td>
                                                    <td className="py-2 px-3 font-semibold text-emerald-400">{w.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 6: Other Activities & Institutional Portfolios (Comprehensive, APAR, NAAC) */}
                    {(isComprehensive || isApar || isNaac) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                <span>🎖️</span> Other Faculty Activities &amp; Portfolios ({filteredData.activities.length})
                            </h3>

                            {filteredData.activities.length === 0 ? (
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
                                    No other academic or institutional activities recorded for this period.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filteredData.activities.map(a => (
                                        <div key={a._id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-slate-200">{a.activityName}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-indigo-400 border border-slate-800">
                                                    {a.category}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">
                                                Role: <strong className="text-slate-300">{a.facultyRole || "Participant"}</strong> &bull; Date: {a.startDate || a.date}
                                            </p>
                                            {a.organizer && <p className="text-[10px] text-slate-500">Organizer: {a.organizer}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 7: Academic Submissions (Comprehensive, APAR) */}
                    {(isComprehensive || isApar) && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                <span>📤</span> Compliance &amp; Academic Submissions ({filteredData.submissions.length})
                            </h3>

                            {filteredData.submissions.length === 0 ? (
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
                                    No compliance submissions registered for this period.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-800">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase">
                                                <th className="py-2.5 px-3">Title</th>
                                                <th className="py-2.5 px-3">Type</th>
                                                <th className="py-2.5 px-3">Academic Year</th>
                                                <th className="py-2.5 px-3">Date</th>
                                                <th className="py-2.5 px-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {filteredData.submissions.map(s => (
                                                <tr key={s._id} className="hover:bg-slate-850/30">
                                                    <td className="py-2 px-3 font-semibold text-slate-200">{s.title}</td>
                                                    <td className="py-2 px-3 text-indigo-400">{s.type}</td>
                                                    <td className="py-2 px-3 text-slate-300">{s.academicYear || "—"}</td>
                                                    <td className="py-2 px-3 font-mono text-slate-400">{s.submissionDate ? s.submissionDate.split("T")[0] : "—"}</td>
                                                    <td className="py-2 px-3 font-bold text-emerald-400">{s.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Institutional Sign-off Block (Visible in Print & Preview) */}
                    <div className="pt-8 border-t-2 border-slate-800 mt-8">
                        <div className="grid grid-cols-3 gap-8 text-center text-xs">
                            <div className="space-y-12">
                                <p className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Faculty Signature</p>
                                <div className="border-t border-slate-700/80 pt-1.5 text-slate-300 font-semibold">
                                    {profile.name}
                                </div>
                            </div>

                            <div className="space-y-12">
                                <p className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Head of Department (HOD)</p>
                                <div className="border-t border-slate-700/80 pt-1.5 text-slate-300 font-semibold">
                                    Department of {profile.department || "Engineering"}
                                </div>
                            </div>

                            <div className="space-y-12">
                                <p className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Principal / Dean Signature</p>
                                <div className="border-t border-slate-700/80 pt-1.5 text-slate-300 font-semibold">
                                    College Administration
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReportGeneratorPanel;
