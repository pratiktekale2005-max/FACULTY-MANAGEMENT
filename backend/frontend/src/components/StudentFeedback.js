import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function StudentFeedback({ currentUser }) {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [feedbackData, setFeedbackData] = useState({
        overall: { totalRatings: 0, averageRating: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, recentComments: [] },
        summary: [],
        faculty: null
    });

    // Submission form inputs
    const [submitForm, setSubmitForm] = useState({
        subjectId: "",
        facultyId: currentUser?.id || currentUser?._id || "",
        rating: 5,
        comments: "",
        rollNo: "",
        studentName: ""
    });

    const loadSubjectsAndSummary = async () => {
        try {
            const facultyId = currentUser.id || currentUser._id;
            
            // Load subjects allocated to this faculty
            const subData = await api.get("/subjects");
            const userSubjects = subData.subjects || [];
            setSubjects(userSubjects);
            if (userSubjects.length > 0 && !submitForm.subjectId) {
                setSubmitForm(prev => ({ ...prev, subjectId: userSubjects[0]._id, facultyId }));
            }

            // Load feedback summary aggregates strictly for this faculty
            const sumData = await api.get("/feedback/summary", { userId: facultyId });
            setFeedbackData({
                overall: sumData.overall || { totalRatings: 0, averageRating: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, recentComments: [] },
                summary: sumData.summary || [],
                faculty: sumData.faculty || null
            });
        } catch (err) {
            console.error("Failed to load feedback evaluations:", err);
        }
    };

    useEffect(() => {
        loadSubjectsAndSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Handle feedback submit
    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...submitForm,
                facultyId: currentUser.id || currentUser._id
            };
            await api.post("/feedback", payload);
            alert("Course feedback survey submitted successfully! ✅");
            setSubmitForm(prev => ({
                ...prev,
                comments: "",
                rollNo: "",
                studentName: ""
            }));
            await loadSubjectsAndSummary();
        } catch (err) {
            alert(err.message || "Failed to submit course feedback.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate maximum rating count for graph scale normalization
    const getGraphMaxVal = (breakdown) => {
        if (!breakdown) return 10;
        const vals = Object.values(breakdown);
        const max = Math.max(...vals);
        return max === 0 ? 10 : max;
    };

    const overall = feedbackData.overall;
    const summaryList = feedbackData.summary;

    return (
        <div className="space-y-6">
            {/* Header & Faculty Profile Badge */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Faculty Survey Feedback & Evaluations</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Displaying student evaluation scores, feedback ratings, and course observations strictly for:{" "}
                        <strong className="text-indigo-400 font-semibold">{currentUser.fullName || currentUser.name}</strong> ({currentUser.department || "Academic Faculty"})
                    </p>
                </div>
                <button
                    onClick={loadSubjectsAndSummary}
                    className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                    🔄 Refresh Feedback
                </button>
            </div>

            {/* Overall Scorecard Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl shrink-0">
                        ⭐
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Overall Average Rating</span>
                        <div className="text-2xl font-black text-slate-100 mt-0.5">
                            {overall.averageRating > 0 ? `${overall.averageRating} / 5.0` : "No Ratings Yet"}
                        </div>
                        <span className="text-[10px] text-amber-400 font-semibold">
                            {overall.averageRating >= 4 ? "Excellent Teaching Score" : overall.averageRating >= 3 ? "Good Performance" : "Awaiting Evaluations"}
                        </span>
                    </div>
                </div>

                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl shrink-0">
                        📋
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Submissions</span>
                        <div className="text-2xl font-black text-slate-100 mt-0.5">{overall.totalRatings}</div>
                        <span className="text-[10px] text-slate-400">Verified student reviews logged</span>
                    </div>
                </div>

                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
                        📚
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Allocated Subjects</span>
                        <div className="text-2xl font-black text-slate-100 mt-0.5">{subjects.length}</div>
                        <span className="text-[10px] text-slate-400">Active teaching courses</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Submit Feedback Form Panel (left) */}
                <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Enlist Student Evaluation</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Submit course reviews directly into this faculty's portfolio</p>
                    </div>

                    <form onSubmit={handleSubmitFeedback} className="space-y-3.5 text-xs text-slate-300">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Subject</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                value={submitForm.subjectId}
                                onChange={(e) => setSubmitForm(prev => ({ ...prev, subjectId: e.target.value }))}
                            >
                                <option value="">General Teaching Survey (No specific subject)</option>
                                {subjects.map(s => (
                                    <option key={s._id} value={s._id}>{s.subjectName} ({s.subjectCode}) &bull; {s.semester}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Evaluation Score Rating</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                value={submitForm.rating}
                                onChange={(e) => setSubmitForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                            >
                                <option value={5}>⭐ ⭐ ⭐ ⭐ ⭐ (5/5 Excellent)</option>
                                <option value={4}>⭐ ⭐ ⭐ ⭐ (4/5 Very Good)</option>
                                <option value={3}>⭐ ⭐ ⭐ (3/5 Good)</option>
                                <option value={2}>⭐ ⭐ (2/5 Average)</option>
                                <option value={1}>⭐ (1/5 Needs Improvement)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Student Roll No</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    placeholder="Optional"
                                    value={submitForm.rollNo}
                                    onChange={(e) => setSubmitForm(prev => ({ ...prev, rollNo: e.target.value }))}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Student Name</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    placeholder="Anonymous"
                                    value={submitForm.studentName}
                                    onChange={(e) => setSubmitForm(prev => ({ ...prev, studentName: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Comments / Observations</label>
                            <textarea
                                rows={3}
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 resize-none"
                                placeholder="Detail teaching clarity, syllabus pacing, student engagement..."
                                value={submitForm.comments}
                                onChange={(e) => setSubmitForm(prev => ({ ...prev, comments: e.target.value }))}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full px-4 py-2.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md"
                            disabled={loading}
                        >
                            {loading ? "Submitting..." : "Submit Survey Evaluation"}
                        </button>
                    </form>
                </div>

                {/* Dashboard Analytics View (right) */}
                <div className="lg:col-span-2 space-y-6">
                    {summaryList.length === 0 ? (
                        <div className="bg-[#101622] border border-slate-800 p-8 rounded-2xl text-center space-y-2">
                            <span className="text-3xl block">📝</span>
                            <h4 className="text-xs font-bold text-slate-300">No Course Evaluations Logged Yet</h4>
                            <p className="text-slate-500 text-xs">
                                Student feedback submissions linked to your courses will appear here in real-time.
                            </p>
                        </div>
                    ) : (
                        summaryList.map(sum => {
                            const maxVal = getGraphMaxVal(sum.breakdown);
                            return (
                                <div key={sum.subjectId} className="bg-[#101622] border border-slate-800 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 gap-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-200 leading-snug">{sum.subjectName} ({sum.subjectCode})</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                {sum.department && (
                                                    <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-medium">
                                                        Dept: {sum.department}
                                                    </span>
                                                )}
                                                {sum.academicYear && (
                                                    <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-medium">
                                                        AY: {sum.academicYear} {sum.semester ? `(${sum.semester})` : ""}
                                                    </span>
                                                )}
                                                <span className="text-[9px] text-slate-500 font-medium">
                                                    {sum.totalRatings} {sum.totalRatings === 1 ? "review" : "reviews"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl px-3.5 py-1.5 text-center shrink-0">
                                            <span className="text-sm font-black block">⭐ {sum.averageRating}</span>
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Average</span>
                                        </div>
                                    </div>

                                    {/* Evaluation Statistics and SVG Chart */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div className="space-y-3">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Ratings Spread</span>
                                            
                                            {/* Pure Responsive SVG bar chart */}
                                            <svg viewBox="0 0 300 130" className="w-full h-32 text-[10px]">
                                                {/* Grid lines */}
                                                <line x1="30" y1="10" x2="280" y2="10" stroke="#1e293b" strokeWidth="1" />
                                                <line x1="30" y1="35" x2="280" y2="35" stroke="#1e293b" strokeWidth="1" />
                                                <line x1="30" y1="60" x2="280" y2="60" stroke="#1e293b" strokeWidth="1" />
                                                <line x1="30" y1="85" x2="280" y2="85" stroke="#1e293b" strokeWidth="1" />
                                                <line x1="30" y1="110" x2="280" y2="110" stroke="#1e293b" strokeWidth="1.5" />

                                                {/* Bar charts (1 to 5 Stars) */}
                                                {Object.keys(sum.breakdown).map((star, idx) => {
                                                    const count = sum.breakdown[star] || 0;
                                                    const barWidth = Math.max(2, Math.round((count / maxVal) * 230));
                                                    const yPos = 100 - idx * 22;

                                                    return (
                                                        <g key={star}>
                                                            <text x="5" y={yPos + 8} fill="#94a3b8" className="font-semibold">{star} ★</text>
                                                            <rect
                                                                x="30"
                                                                y={yPos}
                                                                width={barWidth}
                                                                height="10"
                                                                rx="3"
                                                                fill={idx === 4 ? "#6366f1" : idx === 3 ? "#4f46e5" : idx === 2 ? "#3b82f6" : "#f59e0b"}
                                                            />
                                                            <text x={30 + barWidth + 6} y={yPos + 8} fill="#64748b" className="font-bold text-[9px]">{count}</text>
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                        </div>

                                        {/* Feedbacks reviews text list */}
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Student Observations</span>
                                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                                {sum.comments.length === 0 ? (
                                                    <p className="text-[10px] text-slate-500 italic py-2">No comments logged yet for this subject.</p>
                                                ) : (
                                                    sum.comments.map((c, cIdx) => (
                                                        <div key={cIdx} className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl text-[10px] space-y-1">
                                                            <div className="flex items-center justify-between text-slate-400">
                                                                <span className="font-bold text-amber-400">⭐ {c.rating}/5</span>
                                                                <span className="text-[8px] text-slate-500">{new Date(c.submittedAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-slate-200 italic font-medium leading-relaxed">"{c.text}"</p>
                                                            <div className="flex items-center justify-between text-[8px] text-slate-500 pt-0.5">
                                                                <span>{c.studentName ? `By ${c.studentName}` : "Anonymous Student"}</span>
                                                                {c.rollNo && c.rollNo !== "Anonymous" && <span>Roll: {c.rollNo}</span>}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default StudentFeedback;

