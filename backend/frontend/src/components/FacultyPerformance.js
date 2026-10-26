import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function FacultyPerformance({ currentUser }) {
    const [faculties, setFaculties] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadPerformanceData = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await api.get(`/performance/department/${currentUser.departmentId}`);
            setFaculties(data.faculties || []);
        } catch (err) {
            console.error(err);
            setError("Failed to retrieve performance metrics ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser.departmentId) {
            loadPerformanceData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Faculty Performance Appraisal</h2>
                    <p className="text-slate-400 mt-1">Review live performance indexes, student survey scores, and criteria breakdowns</p>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Scoreboard List */}
                <div className="lg:col-span-2 bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Faculty Scorecard Roster</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    <th className="py-3 px-4">Faculty Member</th>
                                    <th className="py-3 px-4 text-center">Overall Index</th>
                                    <th className="py-3 px-4 text-center">Teaching</th>
                                    <th className="py-3 px-4 text-center">Research</th>
                                    <th className="py-3 px-4 text-center">Feedback</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {loading ? (
                                    [1, 2, 3, 4].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-32"></div></td>
                                            <td className="py-3.5 px-4 text-center"><div className="h-6 bg-slate-800 rounded-lg w-16 mx-auto"></div></td>
                                            <td className="py-3.5 px-4 text-center"><div className="h-4 bg-slate-800 rounded w-10 mx-auto"></div></td>
                                            <td className="py-3.5 px-4 text-center"><div className="h-4 bg-slate-800 rounded w-10 mx-auto"></div></td>
                                            <td className="py-3.5 px-4 text-center"><div className="h-4 bg-slate-800 rounded w-10 mx-auto"></div></td>
                                            <td className="py-3.5 px-4 text-center"><div className="h-6 bg-slate-800 rounded-lg w-20 mx-auto"></div></td>
                                        </tr>
                                    ))
                                ) : faculties.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-slate-500 italic">No faculty members assigned to your department.</td>
                                    </tr>
                                ) : (
                                    faculties.map((f) => (
                                        <tr key={f.facultyId} className="hover:bg-slate-900/40 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-200">{f.name}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold rounded-lg">
                                                    {f.overallScore}%
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center text-slate-350">{f.breakdown?.["Teaching"]?.score || 0}</td>
                                            <td className="py-3.5 px-4 text-center text-slate-350">{f.breakdown?.["Research"]?.score || 0}</td>
                                            <td className="py-3.5 px-4 text-center text-slate-350">{f.breakdown?.["Student Feedback"]?.score || 0}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => setSelectedFaculty(f)}
                                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                                                >
                                                    Inspect Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Inspect Column (Right) */}
                <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg min-h-[300px]">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2 mb-4">Detailed Appraisal</h3>
                    
                    {!selectedFaculty ? (
                        <p className="text-slate-550 italic py-12 text-center">Select a faculty member from the roster to inspect itemized appraisal contributions.</p>
                    ) : (
                        <div className="space-y-5 animate-fade-in">
                            <div>
                                <h4 className="font-bold text-slate-200 text-sm">{selectedFaculty.name}</h4>
                                <span className="inline-block px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold rounded-lg text-xs mt-2">
                                    Overall Performance Index: {selectedFaculty.overallScore}%
                                </span>
                            </div>

                            <div className="space-y-3.5 border-t border-slate-850 pt-4">
                                {Object.keys(selectedFaculty.breakdown || {}).map(catName => {
                                    const cat = selectedFaculty.breakdown[catName];
                                    return (
                                        <div key={catName} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between font-bold text-[10px] text-slate-300">
                                                <span>{catName}</span>
                                                <span className="text-indigo-400">{cat.score} / {cat.weight} pts</span>
                                            </div>
                                            <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-indigo-650 h-full rounded-full" 
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
                </div>
            </div>
        </div>
    );
}

export default FacultyPerformance;
