import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function FacultySubjectsPanel({ currentUser, onNavigate }) {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const loadSubjects = async () => {
        setLoading(true);
        try {
            const data = await api.get("/subjects");
            setSubjects(data.subjects || []);
        } catch (err) {
            console.error("Failed to load faculty subjects:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSubjects();
    }, []);

    const filtered = subjects.filter(s => 
        (s.subjectName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subjectCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.department || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📚</span> Assigned Subjects Portfolio
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Courses, theory subjects, and practical laboratories assigned to your faculty profile.
                    </p>
                </div>

                <div className="relative w-full sm:w-72">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search subject code or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Subjects Grid */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Loading assigned courses...
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                    <span className="text-3xl block mb-2">📚</span>
                    <p className="font-semibold text-slate-200">No subjects currently assigned.</p>
                    <p className="text-slate-500 mt-1">Contact your Head of Department or Admin for course allocations.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(subj => {
                        const studentCount = (subj.students || []).length;
                        const divisions = subj.divisionList && subj.divisionList.length > 0 ? subj.divisionList : ["A"];
                        const progress = subj.syllabusProgress || 65;

                        return (
                            <div key={subj._id} className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold font-mono tracking-wider">
                                            {subj.subjectCode || "CRS"}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                                            {subj.academicYear || "2026-2027"}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-100 mt-3 line-clamp-1">
                                        {subj.subjectName}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {subj.department} &bull; {subj.yearOfStudy || "Engineering"}
                                    </p>

                                    {/* Divisions & Enrolled Stats */}
                                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-left">
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Divisions</span>
                                            <div className="flex items-center gap-1 mt-1">
                                                {divisions.map(d => (
                                                    <span key={d} className="px-2 py-0.5 bg-slate-950 border border-slate-850 rounded text-[10px] font-semibold text-slate-300">
                                                        Div {d}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Students</span>
                                            <span className="text-xs font-bold text-emerald-400 mt-1 inline-block">
                                                {studentCount} Enrolled
                                            </span>
                                        </div>
                                    </div>

                                    {/* Syllabus Coverage progress */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                            <span>Syllabus Coverage</span>
                                            <span className="font-bold text-indigo-400">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick action buttons */}
                                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                                    <button
                                        onClick={() => onNavigate && onNavigate("attendance")}
                                        className="flex-1 py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] font-semibold transition text-center cursor-pointer border border-slate-800"
                                    >
                                        ✅ Attendance
                                    </button>
                                    <button
                                        onClick={() => onNavigate && onNavigate("assignment-marks")}
                                        className="flex-1 py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-semibold transition text-center cursor-pointer"
                                    >
                                        📝 Assignment
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default FacultySubjectsPanel;
