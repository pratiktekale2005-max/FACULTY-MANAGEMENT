import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function DivisionManagementCard({ subject, divisionId, currentUser, onRefresh }) {
    const [activeTab, setActiveTab] = useState("students"); // students, teachingPlan, attendance, assignments, marks, resources, analytics
    const [loading, setLoading] = useState(false);

    // Division Specific Data Scoping
    const divisionStudents = (subject.students || []).filter(s => s.division === divisionId);
    
    // Scoped Assignments
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentMarks, setAssignmentMarks] = useState({}); // studentId -> marks

    // Scoped Teaching Plan
    const [teachingPlan, setTeachingPlan] = useState([]);

    // Attendance Date Selector
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
    const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> PRESENT | ABSENT

    // Resource Form State
    const [resources, setResources] = useState([]);
    const [resourceForm, setResourceForm] = useState({ title: "", type: "Notes", url: "" });

    // Load assignments and resources
    const loadDivisionData = async () => {
        try {
            // Load Assignments
            const assData = await api.get("/assignments", { subjectId: subject._id, divisionId });
            setAssignments(assData.assignments || []);

            // Set division resources
            const resList = (subject.divisionResources || []).filter(r => r.division === divisionId);
            setResources(resList);

            // Set division teaching plan
            const planList = (subject.divisionTeachingPlans || [])
                .filter(tp => tp.division === divisionId)
                .sort((a, b) => a.week - b.week);
            setTeachingPlan(planList);

            // Initialize attendance map for default date
            initializeAttendance(planList);
        } catch (err) {
            console.error("Failed to load division parameters:", err);
        }
    };

    const initializeAttendance = (plan) => {
        const map = {};
        divisionStudents.forEach(s => {
            // Check if student has attendance record for this date
            const record = (s.attendance || []).find(a => a.date === attendanceDate);
            map[s._id] = record ? record.status : "PRESENT";
        });
        setAttendanceMap(map);
    };

    useEffect(() => {
        loadDivisionData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subject, divisionId, attendanceDate]);

    // Save Teaching Plan Changes
    const handleSaveTeachingPlan = async () => {
        setLoading(true);
        try {
            await api.put(`/subjects/${subject._id}/divisions/${divisionId}/teaching-plan`, {
                teachingPlan
            });
            alert(`Syllabus planner targets for Division ${divisionId} saved! ✅`);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save teaching plan");
        } finally {
            setLoading(false);
        }
    };

    const handlePlanChange = (index, field, value) => {
        const copy = [...teachingPlan];
        copy[index] = { ...copy[index], [field]: value };
        setTeachingPlan(copy);
    };

    // Save Attendance
    const handleSaveAttendance = async () => {
        setLoading(true);
        const attendanceList = Object.keys(attendanceMap).map(sid => ({
            studentId: sid,
            status: attendanceMap[sid]
        }));

        try {
            await api.put(`/subjects/${subject._id}/divisions/${divisionId}/attendance`, {
                date: attendanceDate,
                attendanceList
            });
            alert(`Attendance sheet for Division ${divisionId} logged successfully! ✅`);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to log attendance");
        } finally {
            setLoading(false);
        }
    };

    // Save Student Marks (Internal Exams)
    const handleSaveStudentMarks = async (studentId, marks) => {
        try {
            await api.put(`/subjects/${subject._id}/divisions/${divisionId}/students/${studentId}/marks`, marks);
            alert("Student grades updated! ✅");
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to update grades");
        }
    };

    // Add Resource File/Link
    const handleAddResource = async (e) => {
        e.preventDefault();
        if (!resourceForm.title || !resourceForm.url) return;

        try {
            await api.put(`/subjects/${subject._id}/divisions/${divisionId}/resources`, {
                action: "add",
                ...resourceForm
            });
            alert("Syllabus resource shared! ✅");
            setResourceForm({ title: "", type: "Notes", url: "" });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to share resource");
        }
    };

    // Delete Resource
    const handleDeleteResource = async (resId) => {
        if (!window.confirm("Are you sure you want to delete this resource? 🗑️")) return;
        try {
            await api.put(`/subjects/${subject._id}/divisions/${divisionId}/resources`, {
                action: "delete",
                resourceId: resId
            });
            alert("Resource removed! ✅");
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to remove resource");
        }
    };

    // Export CSV Roster
    const exportRosterCSV = () => {
        if (divisionStudents.length === 0) return;
        let csv = "PRN Number,Roll No,Name,Mobile Number,Skills\n";
        divisionStudents.forEach(s => {
            csv += `"${s.prnNumber || ""}","${s.rollNo}","${s.name}","${s.mobileNumber || ""}","${s.skills || ""}"\n`;
        });
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Roster_Subject_${subject.subjectCode}_Div_${divisionId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate Attendance Metrics
    const getStudentAttendanceStats = (student) => {
        const records = student.attendance || [];
        if (records.length === 0) return { present: 0, absent: 0, percentage: 100 };
        const present = records.filter(r => r.status === "PRESENT").length;
        const absent = records.filter(r => r.status === "ABSENT").length;
        const percentage = Math.round((present / records.length) * 100);
        return { present, absent, percentage };
    };

    const getDivisionAverageAttendance = () => {
        if (divisionStudents.length === 0) return 0;
        let totalPct = 0;
        let count = 0;
        divisionStudents.forEach(s => {
            if (s.attendance && s.attendance.length > 0) {
                totalPct += getStudentAttendanceStats(s).percentage;
                count++;
            }
        });
        return count > 0 ? Math.round(totalPct / count) : 100;
    };

    const getSyllabusProgress = () => {
        if (teachingPlan.length === 0) return 0;
        const completed = teachingPlan.filter(tp => tp.status === "completed").length;
        return Math.round((completed / teachingPlan.length) * 100);
    };

    return (
        <div className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
            {/* Top Tab Bar Navigation */}
            <div className="bg-slate-950/40 px-5 py-3 border-b border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Division {divisionId} Card Details</h3>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">Scoped for {subject.subjectName} ({subject.subjectCode})</p>
                </div>

                <div className="flex flex-wrap gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl">
                    {[
                        { id: "students", label: "👥 Student List" },
                        { id: "teachingPlan", label: "📅 Plan" },
                        { id: "attendance", label: "⏰ Attendance" },
                        { id: "assignments", label: "📚 Assignments" },
                        { id: "marks", label: "📈 Marks" },
                        { id: "resources", label: "🔗 Resources" },
                        { id: "analytics", label: "📊 Analytics" }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Inner Dashboard Tabs */}
            <div className="p-5 text-slate-200 min-h-[300px]">
                
                {/* 1. STUDENT LIST TAB */}
                {activeTab === "students" && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Division Enlisted Students</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Assigned count: {divisionStudents.length} student records</p>
                            </div>
                            <button
                                type="button"
                                onClick={exportRosterCSV}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold text-slate-200 rounded-lg transition-all"
                            >
                                📥 Export Division CSV
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-slate-850 rounded-xl">
                            <table className="w-full text-left text-[11px]">
                                <thead>
                                    <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                                        <th className="py-2.5 px-3">PRN Number</th>
                                        <th className="py-2.5 px-3">Roll No</th>
                                        <th className="py-2.5 px-3">Student Name</th>
                                        <th className="py-2.5 px-3">Mobile Number</th>
                                        <th className="py-2.5 px-3">Skills</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850/40 text-slate-350">
                                    {divisionStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-500 italic">No students assigned to Division {divisionId}. Use Student Details tab to assign divisions.</td>
                                        </tr>
                                    ) : (
                                        divisionStudents.map(s => (
                                            <tr key={s._id} className="hover:bg-slate-800/10 transition-colors">
                                                <td className="py-2 px-3 font-mono font-bold text-indigo-400">{s.prnNumber}</td>
                                                <td className="py-2 px-3 font-medium text-slate-400">{s.rollNo}</td>
                                                <td className="py-2 px-3 font-semibold text-slate-200">{s.name}</td>
                                                <td className="py-2 px-3">{s.mobileNumber}</td>
                                                <td className="py-2 px-3 text-[10px] text-slate-450">{s.skills || "-"}</td>
                                                <td className="py-2 px-3 text-right">
                                                    <select
                                                        value={s.division}
                                                        onChange={async (e) => {
                                                            try {
                                                                await api.put(`/subjects/${subject._id}/students/${s._id}`, { division: e.target.value });
                                                                if (onRefresh) onRefresh();
                                                            } catch (err) {
                                                                alert(err.message || "Failed to update division");
                                                            }
                                                        }}
                                                        className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                                                    >
                                                        <option value="">No Div</option>
                                                        {subject.divisionList.map(d => (
                                                            <option key={d} value={d}>Div {d}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. TEACHING PLAN TAB */}
                {activeTab === "teachingPlan" && (
                    <div className="space-y-4 text-[11px]">
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Lesson Plan & Coverage Index</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Syllabus completed count: {teachingPlan.filter(tp => tp.status === "completed").length} / {teachingPlan.length} weeks</p>
                            </div>
                            {currentUser.role === "Faculty" && (
                                <button
                                    type="button"
                                    onClick={handleSaveTeachingPlan}
                                    className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg shadow text-[10px] uppercase"
                                    disabled={loading}
                                >
                                    {loading ? "Saving..." : "Save Planner"}
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto border border-slate-850 rounded-xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase bg-slate-950/20">
                                        <th className="py-2 px-3 w-12 text-center font-bold">Week</th>
                                        <th className="py-2 px-2 w-48">Topic Target</th>
                                        <th className="py-2 px-2 w-32">Lesson Plan Outline</th>
                                        <th className="py-2 px-2 w-28">Units Covered</th>
                                        <th className="py-2 px-2 w-16 text-center">Hours</th>
                                        <th className="py-2 px-2 w-16 text-center">Rem.</th>
                                        <th className="py-2 px-2 w-28">Planned Date</th>
                                        <th className="py-2 px-2 w-28">Conducted</th>
                                        <th className="py-2 px-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teachingPlan.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-6 text-center italic text-slate-550">No teaching plan details initialized. Add divisions count on subject registry.</td>
                                        </tr>
                                    ) : (
                                        teachingPlan.map((weekItem, idx) => (
                                            <tr key={weekItem._id || idx} className="hover:bg-slate-800/10 border-b border-slate-850/30">
                                                <td className="py-2 px-3 text-center font-bold text-indigo-400">W{weekItem.week}</td>
                                                <td className="py-2 px-1">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
                                                        value={weekItem.topic}
                                                        onChange={(e) => handlePlanChange(idx, "topic", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    />
                                                </td>
                                                <td className="py-2 px-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Notes/PPT references"
                                                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none text-[10px]"
                                                        value={weekItem.lessonPlan || ""}
                                                        onChange={(e) => handlePlanChange(idx, "lessonPlan", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    />
                                                </td>
                                                <td className="py-2 px-1">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Unit I"
                                                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none text-[10px]"
                                                        value={weekItem.unitsCovered || ""}
                                                        onChange={(e) => handlePlanChange(idx, "unitsCovered", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    />
                                                </td>
                                                <td className="py-2 px-1">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-1.5 py-1 text-slate-200 focus:outline-none text-center text-[10px]"
                                                        value={weekItem.hoursCompleted || 0}
                                                        onChange={(e) => handlePlanChange(idx, "hoursCompleted", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    />
                                                </td>
                                                <td className="py-2 px-1">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-1.5 py-1 text-slate-200 focus:outline-none text-center text-[10px]"
                                                        value={weekItem.remainingHours || 0}
                                                        onChange={(e) => handlePlanChange(idx, "remainingHours", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    />
                                                </td>
                                                <td className="py-2 px-1">
                                                    <input
                                                        type="date"
                                                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-1.5 py-1 text-slate-200 focus:outline-none text-[10px]"
                                                        value={weekItem.plannedDate ? weekItem.plannedDate.split("T")[0] : ""}
                                                        onChange={(e) => handlePlanChange(idx, "plannedDate", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    />
                                                </td>
                                                <td className="py-2 px-1">
                                                    <input
                                                        type="date"
                                                        className="w-full bg-slate-900/60 border border-slate-800 rounded px-1.5 py-1 text-slate-200 focus:outline-none text-[10px]"
                                                        value={weekItem.conductedDate ? weekItem.conductedDate.split("T")[0] : ""}
                                                        onChange={(e) => handlePlanChange(idx, "conductedDate", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-right">
                                                    <select
                                                        className="text-[10px] text-slate-300 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 focus:outline-none"
                                                        value={weekItem.status}
                                                        onChange={(e) => handlePlanChange(idx, "status", e.target.value)}
                                                        disabled={currentUser.role !== "Faculty"}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="planned">Planned</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. ATTENDANCE TAB */}
                {activeTab === "attendance" && (
                    <div className="space-y-4 text-[11px]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-3 gap-3">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log Division Attendance Sheet</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Average Attendance: <span className="font-bold text-indigo-400">{getDivisionAverageAttendance()}%</span></p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 border border-slate-850 rounded-xl">
                                    <span className="text-[10px] text-slate-550 uppercase font-bold">Select Date:</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-0 outline-none text-slate-200 text-xs focus:ring-0 p-0 cursor-pointer"
                                        value={attendanceDate}
                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                    />
                                </div>
                                {currentUser.role === "Faculty" && (
                                    <button
                                        type="button"
                                        onClick={handleSaveAttendance}
                                        className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg shadow text-[10px] uppercase"
                                    >
                                        Save Attendance
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-855 rounded-xl">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase bg-slate-950/20">
                                        <th className="py-2.5 px-3">PRN Number</th>
                                        <th className="py-2.5 px-3">Roll No</th>
                                        <th className="py-2.5 px-3">Student Name</th>
                                        <th className="py-2.5 px-3 text-center">Recorded (Present / Total)</th>
                                        <th className="py-2.5 px-3 text-center">Attendance %</th>
                                        <th className="py-2.5 px-3 text-right">Status on {attendanceDate}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850/40 text-slate-350">
                                    {divisionStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-550 italic">No students assigned to division.</td>
                                        </tr>
                                    ) : (
                                        divisionStudents.map(s => {
                                            const stats = getStudentAttendanceStats(s);
                                            const status = attendanceMap[s._id] || "PRESENT";
                                            return (
                                                <tr key={s._id} className="hover:bg-slate-800/10">
                                                    <td className="py-2 px-3 font-mono font-bold text-slate-400">{s.prnNumber}</td>
                                                    <td className="py-2 px-3 font-semibold">{s.rollNo}</td>
                                                    <td className="py-2 px-3 font-medium text-slate-200">{s.name}</td>
                                                    <td className="py-2 px-3 text-center">{stats.present} / {s.attendance?.length || 0} classes</td>
                                                    <td className="py-2 px-3 text-center font-bold text-indigo-400">{stats.percentage}%</td>
                                                    <td className="py-2 px-3 text-right">
                                                        <select
                                                            value={status}
                                                            onChange={(e) => setAttendanceMap({ ...attendanceMap, [s._id]: e.target.value })}
                                                            className={`text-[10px] border rounded px-2 py-0.5 font-bold focus:outline-none bg-slate-900 ${status === "PRESENT" ? "text-emerald-400 border-emerald-500/20" : "text-rose-400 border-rose-500/20"}`}
                                                            disabled={currentUser.role !== "Faculty"}
                                                        >
                                                            <option value="PRESENT">Present</option>
                                                            <option value="ABSENT">Absent</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. ASSIGNMENTS TAB */}
                {activeTab === "assignments" && (
                    <div className="space-y-4 text-[11px]">
                        <div className="border-b border-slate-800/60 pb-3 flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignment Distribution & History</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Total assignments created for Div {divisionId}: {assignments.length}</p>
                            </div>
                            {selectedAssignment && (
                                <button
                                    type="button"
                                    onClick={() => { setSelectedAssignment(null); setAssignmentMarks({}); }}
                                    className="px-3 py-1 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded-lg hover:bg-slate-850"
                                >
                                    ← Back to Grid
                                </button>
                            )}
                        </div>

                        {!selectedAssignment ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assignments.length === 0 ? (
                                    <div className="col-span-2 text-center py-8 text-slate-550 italic bg-slate-950/20 border border-slate-850 rounded-2xl">
                                        No assignments have been assigned to Division {divisionId} yet. Go to Assignments menu to create one.
                                    </div>
                                ) : (
                                    assignments.map(ass => (
                                        <div 
                                            key={ass._id}
                                            onClick={() => setSelectedAssignment(ass)}
                                            className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl space-y-3 cursor-pointer hover:border-indigo-500/30 transition-all hover:-translate-y-0.5"
                                        >
                                            <div className="flex justify-between items-center text-[9px] uppercase font-bold tracking-wider">
                                                <span className="text-slate-500">Marks: {ass.marks}</span>
                                                <span className={`px-2 py-0.5 rounded ${ass.status === "Published" ? "bg-emerald-500/10 text-emerald-400" : ass.status === "Closed" ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-400"}`}>
                                                    {ass.status}
                                                </span>
                                            </div>

                                            <div>
                                                <h5 className="font-bold text-slate-200 text-xs truncate">{ass.title}</h5>
                                                <p className="text-[10px] text-slate-450 mt-1 line-clamp-2">{ass.description}</p>
                                            </div>

                                            <div className="border-t border-slate-900/60 pt-2 flex justify-between text-[9px] text-slate-500 font-mono">
                                                <span>Given: {ass.givenDate}</span>
                                                <span className="text-indigo-400 font-semibold">Deadline: {ass.deadlineDate}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            // Grading Matrix for Selected Assignment
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl space-y-2">
                                    <h5 className="font-bold text-slate-200 text-xs">{selectedAssignment.title}</h5>
                                    <p className="text-[10px] text-slate-400">{selectedAssignment.description}</p>
                                    <div className="flex gap-4 text-[9px] font-mono text-slate-500 pt-1">
                                        <span>Max Marks: {selectedAssignment.marks}</span>
                                        <span>Deadline: {selectedAssignment.deadlineDate}</span>
                                        {selectedAssignment.file && (
                                            <a 
                                                href={selectedAssignment.file} 
                                                download={`${selectedAssignment.title.replace(/\s+/g, "_")}_instructions.pdf`}
                                                className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                                            >
                                                Download Assignment Instructions PDF
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-slate-850 rounded-xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase bg-slate-950/20">
                                                <th className="py-2.5 px-3">PRN Number</th>
                                                <th className="py-2.5 px-3">Roll No</th>
                                                <th className="py-2.5 px-3">Student Name</th>
                                                <th className="py-2.5 px-3 text-right w-36">Grades / Marks Obtained</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-850/40 text-slate-350">
                                            {divisionStudents.map(s => {
                                                // Check if customMarks map contains marks or mock
                                                const currentMark = assignmentMarks[s._id] !== undefined ? assignmentMarks[s._id] : (s.customFields?.get ? s.customFields.get(`assignment_${selectedAssignment._id}`) : s.customFields?.[`assignment_${selectedAssignment._id}`] || "");
                                                return (
                                                    <tr key={s._id} className="hover:bg-slate-800/10">
                                                        <td className="py-2 px-3 font-mono text-slate-400">{s.prnNumber}</td>
                                                        <td className="py-2 px-3">{s.rollNo}</td>
                                                        <td className="py-2 px-3 font-medium text-slate-200">{s.name}</td>
                                                        <td className="py-2 px-3 text-right">
                                                            <div className="flex items-center justify-end gap-2 text-xs">
                                                                <input
                                                                    type="number"
                                                                    max={selectedAssignment.marks}
                                                                    min={0}
                                                                    className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-center text-slate-200 focus:outline-none"
                                                                    value={currentMark}
                                                                    onChange={(e) => setAssignmentMarks({ ...assignmentMarks, [s._id]: e.target.value })}
                                                                    disabled={currentUser.role !== "Faculty"}
                                                                />
                                                                <span className="text-[10px] text-slate-500">/ {selectedAssignment.marks}</span>
                                                                {currentUser.role === "Faculty" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            try {
                                                                                const updatedFields = { 
                                                                                    ...s.customFields, 
                                                                                    [`assignment_${selectedAssignment._id}`]: assignmentMarks[s._id] || currentMark
                                                                                };
                                                                                await api.put(`/subjects/${subject._id}/students/${s._id}`, { customFields: updatedFields });
                                                                                alert("Marks updated successfully! ✅");
                                                                                if (onRefresh) onRefresh();
                                                                            } catch (e) {
                                                                                alert("Failed to save grade");
                                                                            }
                                                                        }}
                                                                        className="px-2 py-0.5 text-[9px] bg-slate-800 hover:bg-indigo-650 hover:text-white rounded border border-slate-700 transition-colors"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. INTERNAL MARKS TAB */}
                {activeTab === "marks" && (
                    <div className="space-y-4 text-[11px]">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Internal Marks & Grades ledger</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Edit and update Continuous Internal Assessment (CIA), Mid Semester Exam (MSE), End Semester Exam (ESE), and Lab Practicals.</p>
                        </div>

                        <div className="overflow-x-auto border border-slate-855 rounded-xl">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase bg-slate-950/20">
                                        <th className="py-2.5 px-3">PRN Number</th>
                                        <th className="py-2.5 px-3">Roll No</th>
                                        <th className="py-2.5 px-3">Student Name</th>
                                        <th className="py-2.5 px-2 text-center w-20">CIA (Max 20)</th>
                                        <th className="py-2.5 px-2 text-center w-20">MSE (Max 30)</th>
                                        <th className="py-2.5 px-2 text-center w-20">ESE (Max 50)</th>
                                        <th className="py-2.5 px-2 text-center w-20">Practical (Max 25)</th>
                                        <th className="py-2.5 px-3 text-right">Grades Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850/40 text-slate-350">
                                    {divisionStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-550 italic">No students assigned.</td>
                                        </tr>
                                    ) : (
                                        divisionStudents.map(s => {
                                            const marks = s.internalMarks || { cia: 0, mse: 0, ese: 0, practical: 0 };
                                            return (
                                                <tr key={s._id} className="hover:bg-slate-800/10">
                                                    <td className="py-2 px-3 font-mono text-slate-400">{s.prnNumber}</td>
                                                    <td className="py-2 px-3">{s.rollNo}</td>
                                                    <td className="py-2 px-3 font-medium text-slate-200">{s.name}</td>
                                                    <td className="py-2 px-1 text-center">
                                                        <input
                                                            type="number"
                                                            id={`cia-${s._id}`}
                                                            defaultValue={marks.cia}
                                                            className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 focus:outline-none text-[10px]"
                                                            disabled={currentUser.role !== "Faculty"}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-1 text-center">
                                                        <input
                                                            type="number"
                                                            id={`mse-${s._id}`}
                                                            defaultValue={marks.mse}
                                                            className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 focus:outline-none text-[10px]"
                                                            disabled={currentUser.role !== "Faculty"}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-1 text-center">
                                                        <input
                                                            type="number"
                                                            id={`ese-${s._id}`}
                                                            defaultValue={marks.ese}
                                                            className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 focus:outline-none text-[10px]"
                                                            disabled={currentUser.role !== "Faculty"}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-1 text-center">
                                                        <input
                                                            type="number"
                                                            id={`prac-${s._id}`}
                                                            defaultValue={marks.practical}
                                                            className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 focus:outline-none text-[10px]"
                                                            disabled={currentUser.role !== "Faculty"}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        {currentUser.role === "Faculty" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const ciaVal = document.getElementById(`cia-${s._id}`).value;
                                                                    const mseVal = document.getElementById(`mse-${s._id}`).value;
                                                                    const eseVal = document.getElementById(`ese-${s._id}`).value;
                                                                    const pracVal = document.getElementById(`prac-${s._id}`).value;
                                                                    handleSaveStudentMarks(s._id, {
                                                                        cia: ciaVal,
                                                                        mse: mseVal,
                                                                        ese: eseVal,
                                                                        practical: pracVal
                                                                    });
                                                                }}
                                                                className="px-3 py-1 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded shadow text-[9px] uppercase"
                                                            >
                                                                Save
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 6. RESOURCES TAB */}
                {activeTab === "resources" && (
                    <div className="space-y-6 text-[11px]">
                        {currentUser.role === "Faculty" && (
                            <form onSubmit={handleAddResource} className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl space-y-4">
                                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Share Teaching Resource to Division {divisionId}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Resource Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Unit 1 Notes PDF"
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                            value={resourceForm.title}
                                            onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Material Type</label>
                                        <select
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                            value={resourceForm.type}
                                            onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                                        >
                                            <option value="Notes">Notes Document</option>
                                            <option value="PPT">PowerPoint Slide (PPT)</option>
                                            <option value="PDF">PDF Reference</option>
                                            <option value="Video">Video Link</option>
                                            <option value="Link">External Reference Link</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">File URL or Base64 String</label>
                                        <input
                                            type="text"
                                            placeholder="https://drive.google.com/... or Base64"
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                            value={resourceForm.url}
                                            onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl shadow uppercase text-[10px]"
                                    >
                                        Share Material
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shared Teaching Materials Repository</h4>
                            {resources.length === 0 ? (
                                <p className="italic text-slate-550 py-4 text-center border border-slate-850 bg-slate-950/20 rounded-xl">No resources shared yet for this division.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {resources.map(res => (
                                        <div key={res._id} className="p-3 bg-slate-950/20 border border-slate-850 rounded-xl flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className="font-bold text-slate-250 block truncate">{res.title}</span>
                                                <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider">Type: <span className="text-indigo-400 font-bold">{res.type}</span></p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <a
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1 text-[9px] bg-slate-800 border border-slate-700 text-slate-300 rounded font-semibold hover:bg-slate-750"
                                                >
                                                    🔗 Open
                                                </a>
                                                {currentUser.role === "Faculty" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteResource(res._id)}
                                                        className="px-2.5 py-1 text-[9px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/10 rounded font-semibold transition-all"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 7. PROGRESS ANALYTICS TAB */}
                {activeTab === "analytics" && (
                    <div className="space-y-6 text-xs text-slate-300">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Division Progress & Performance Scorecard</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Syllabus milestones, grading distributions, and compliance indices.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            
                            {/* Metric 1 */}
                            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col justify-between items-center text-center space-y-4">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider block">Syllabus Completion</span>
                                    <span className="text-2xl font-extrabold text-slate-100 block mt-1">{getSyllabusProgress()}%</span>
                                </div>
                                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                                    <div className="bg-indigo-650 h-full rounded-full transition-all duration-300" style={{ width: `${getSyllabusProgress()}%` }}></div>
                                </div>
                                <p className="text-[9px] text-slate-500">Based on completed weekly lesson plan targets.</p>
                            </div>

                            {/* Metric 2 */}
                            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col justify-between items-center text-center space-y-4">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider block">Roster Avg Attendance</span>
                                    <span className="text-2xl font-extrabold text-slate-100 block mt-1">{getDivisionAverageAttendance()}%</span>
                                </div>
                                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${getDivisionAverageAttendance()}%` }}></div>
                                </div>
                                <p className="text-[9px] text-slate-500">Scored across all recorded attendance days.</p>
                            </div>

                            {/* Metric 3 */}
                            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col justify-between items-center text-center space-y-4">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider block">Assignments Logged</span>
                                    <span className="text-2xl font-extrabold text-slate-100 block mt-1">{assignments.length}</span>
                                </div>
                                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5 flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase">
                                    {assignments.length > 0 ? "Active Distribution" : "No active items"}
                                </div>
                                <p className="text-[9px] text-slate-500">Class tasks distributed for evaluation.</p>
                            </div>

                        </div>

                        {/* Student Performance Matrix Indicator */}
                        <div className="p-5 bg-slate-950/30 border border-slate-850 rounded-2xl space-y-3">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2">Student Index Scorecard Distributions</h5>
                            
                            <div className="space-y-3 max-h-56 overflow-y-auto">
                                {divisionStudents.length === 0 ? (
                                    <p className="text-slate-550 italic text-[10px]">No student records found.</p>
                                ) : (
                                    divisionStudents.map(s => {
                                        const marks = s.internalMarks || { cia: 0, mse: 0, ese: 0, practical: 0 };
                                        const totalMarks = marks.cia + marks.mse + marks.ese + (marks.practical || 0);
                                        const pct = Math.min(Math.round((totalMarks / 125) * 100), 100);
                                        
                                        return (
                                            <div key={s._id} className="flex items-center justify-between gap-4 text-[10px]">
                                                <div className="w-1/3 truncate">
                                                    <span className="font-semibold text-slate-200">{s.name}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono block mt-0.5">{s.rollNo}</span>
                                                </div>
                                                <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-indigo-500" : pct >= 35 ? "bg-amber-500" : "bg-rose-500"}`} 
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="w-24 text-right font-bold text-slate-350">
                                                    <span>{totalMarks} / 125 pts ({pct}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

export default DivisionManagementCard;
