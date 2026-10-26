import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function MyClassesPanel({ currentUser, onNavigateTab }) {
    const [loading, setLoading] = useState(false);
    const [classesData, setClassesData] = useState({
        totalClasses: 0,
        totalUniqueStudents: 0,
        classes: []
    });
    const [selectedClass, setSelectedClass] = useState(null); // When viewing student roster
    const [studentSearch, setStudentSearch] = useState("");

    const loadMyClasses = async () => {
        setLoading(true);
        try {
            const data = await api.get("/classes/my-classes");
            if (data && data.success) {
                setClassesData({
                    totalClasses: data.totalClasses || 0,
                    totalUniqueStudents: data.totalUniqueStudents || 0,
                    classes: data.classes || []
                });
            }
        } catch (err) {
            console.error("Failed to load assigned classes:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMyClasses();
    }, [currentUser]);

    // Filter students inside selected class
    const filteredClassStudents = selectedClass
        ? (selectedClass.students || []).filter(s => {
            const q = studentSearch.toLowerCase().trim();
            if (!q) return true;
            return (
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
                (s.prnNumber && s.prnNumber.toLowerCase().includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.mobileNumber && s.mobileNumber.toLowerCase().includes(q))
            );
        })
        : [];

    const exportClassRoster = (cls) => {
        if (!cls || !cls.students || cls.students.length === 0) return;
        let csv = "Roll No,PRN No,Name,Email,Phone No,Address,Department,Year of Study,Division,Gender\n";
        cls.students.forEach(s => {
            csv += `"${s.rollNo || ""}","${s.prnNumber || ""}","${s.name || ""}","${s.email || ""}","${s.mobileNumber || ""}","${(s.address || "").replace(/"/g, '""')}","${cls.department}","${cls.year}","${cls.division}","${s.gender || "Male"}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Class_Roster_${cls.year}_${cls.division}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>🏫 My Classes &amp; Student Management</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Class-wise academic tracking for {currentUser.name} &bull; {currentUser.department}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadMyClasses}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
                        title="Refresh Classes"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Classes</span>
                        <span className="text-base">🏫</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-indigo-400">{classesData.totalClasses}</span>
                        <span className="text-xs text-slate-400">Assigned Classes</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Active teaching cohorts</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
                        <span className="text-base">🏢</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-slate-200 truncate">{currentUser.department || "Engineering"}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Academic affiliation</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</span>
                        <span className="text-base">⚡</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                        <button
                            onClick={() => onNavigateTab && onNavigateTab("attendance")}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                        >
                            Attendance 📋
                        </button>
                        <button
                            onClick={() => onNavigateTab && onNavigateTab("assignment-marks")}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                        >
                            Assignment 📝
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Direct cohort logging</p>
                </div>
            </div>

            {/* Class Cards Grid */}
            {loading ? (
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 italic">
                    Loading your assigned classes from database... ⏳
                </div>
            ) : classesData.classes.length === 0 ? (
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                    <span className="text-4xl">📚</span>
                    <h3 className="text-base font-bold text-slate-200">No Classes Assigned</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                        There are currently no classes assigned to your faculty account in the database. Please contact your Head of Department (HOD) or Academic Administrator to assign course subjects and class divisions.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Assigned Classes ({classesData.classes.length})
                        </h3>
                        <span className="text-xs text-slate-500">
                            Showing only classes authorized for your login
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {classesData.classes.map(c => (
                            <div
                                key={c.classId}
                                className="bg-[#101622] border border-slate-800 hover:border-indigo-500/60 p-5 rounded-2xl space-y-4 transition-all shadow-sm group flex flex-col justify-between"
                            >
                                <div className="space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                Division {c.division}
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-100 mt-2 group-hover:text-indigo-300 transition-colors">
                                                {c.className}
                                            </h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-slate-100">
                                                {c.studentsCount}
                                            </span>
                                            <span className="text-[10px] text-slate-500 block uppercase">Students</span>
                                        </div>
                                    </div>

                                    <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-850">
                                        <p><strong className="text-slate-300">Department:</strong> {c.department}</p>
                                        <p><strong className="text-slate-300">Year of Study:</strong> {c.year}</p>
                                    </div>

                                    {/* Assigned Subjects */}
                                    <div className="space-y-1.5 pt-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Subjects:</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {c.assignedSubjects.map(sub => (
                                                <span key={sub._id} className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded font-mono">
                                                    {sub.subjectCode} - {sub.subjectName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions on Class Card */}
                                <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => { setSelectedClass(c); setStudentSearch(""); }}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                                    >
                                        <span>👥 View Students ({c.studentsCount})</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CLASS STUDENTS ROSTER MODAL (When Faculty clicks "View Students") */}
            {selectedClass && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">👥</span>
                                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                        {selectedClass.className} &bull; Enrolled Students
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    Department: {selectedClass.department} &bull; Year: {selectedClass.year} &bull; Division: {selectedClass.division} &bull; <strong className="text-indigo-400">{selectedClass.studentsCount} Students</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={() => exportClassRoster(selectedClass)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
                                >
                                    📥 Export CSV
                                </button>
                                <button
                                    onClick={() => setSelectedClass(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex items-center justify-between gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500"
                                    placeholder="Search student by name, roll no, PRN, email, or mobile..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                />
                                <span className="absolute left-3 top-2 text-slate-500 text-xs">🔍</span>
                            </div>
                            <span className="text-[11px] text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0 font-medium">
                                Showing <strong className="text-slate-200">{filteredClassStudents.length}</strong> of {selectedClass.studentsCount}
                            </span>
                        </div>

                        {/* Students Table */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="overflow-x-auto border border-slate-850 rounded-xl">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/90">
                                            <th className="py-2.5 px-3 whitespace-nowrap">Roll No.</th>
                                            <th className="py-2.5 px-3 whitespace-nowrap">PRN No.</th>
                                            <th className="py-2.5 px-3 whitespace-nowrap">Student Name</th>
                                            <th className="py-2.5 px-3 whitespace-nowrap">Email</th>
                                            <th className="py-2.5 px-3 whitespace-nowrap">Phone No.</th>
                                            <th className="py-2.5 px-3 whitespace-nowrap">Address</th>
                                            <th className="py-2.5 px-3 whitespace-nowrap">Gender</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850/50 text-slate-300">
                                        {filteredClassStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                                                    No students match the search criteria in this class.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredClassStudents.map(s => (
                                                <tr key={s._id || s.prnNumber} className="hover:bg-slate-900/40 transition-colors">
                                                    <td className="py-2.5 px-3 font-semibold text-indigo-300 font-mono whitespace-nowrap">
                                                        {s.rollNo}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                                                        {s.prnNumber || "-"}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-bold text-slate-100 whitespace-nowrap">
                                                        {s.name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                                                        {s.email || "-"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                                                        {s.mobileNumber || "-"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={s.address}>
                                                        {s.address || "-"}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                                                        {s.gender || "Male"}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Enrolled in {selectedClass.className}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedClass(null)}
                                    className="px-4 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyClassesPanel;
