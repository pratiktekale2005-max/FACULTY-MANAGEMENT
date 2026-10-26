import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "../services/api";

function AttendancePanel({ currentUser }) {
    // 1. Course & Class Options from backend
    const [options, setOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    // 2. Top-level Required Controls
    const [selectedClassKey, setSelectedClassKey] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);

    // 3. Attendance Entry State
    const [students, setStudents] = useState([]);
    const [loadingSheet, setLoadingSheet] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isSavedSession, setIsSavedSession] = useState(false);
    const [isSheetLoaded, setIsSheetLoaded] = useState(false);
    const [alertMsg, setAlertMsg] = useState(null); // { type: "success" | "error", text: "..." }

    // 4. View Mode: "entry" (Add / Record Attendance) vs "history" (Attendance History)
    const [activeSection, setActiveSection] = useState("entry"); // "entry" | "history"

    // 5. Attendance History State & Filters
    const [historyRecords, setHistoryRecords] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFilterDate, setHistoryFilterDate] = useState("");
    const [historyFilterRoll, setHistoryFilterRoll] = useState("");

    // Load faculty options from backend
    const loadOptions = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const data = await api.get("/attendance/options");
            if (data && data.options && data.options.length > 0) {
                setOptions(data.options);

                // Group by Class (Department + Year + Division)
                const first = data.options[0];
                const key = `${first.department}__${first.year}__${first.division}`;
                setSelectedClassKey(key);
                setSelectedSubjectId(String(first.subjectId));
            } else {
                setOptions([]);
            }
        } catch (err) {
            console.error("Failed to load attendance options:", err);
            setAlertMsg({ type: "error", text: "Failed to load assigned classes ❌" });
        } finally {
            setLoadingOptions(false);
        }
    }, []);

    useEffect(() => {
        loadOptions();
    }, [loadOptions]);

    // Unique Classes: (Department + Year + Division)
    const availableClasses = useMemo(() => {
        const map = new Map();
        options.forEach(opt => {
            const key = `${opt.department}__${opt.year}__${opt.division}`;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    department: opt.department,
                    year: opt.year,
                    division: opt.division,
                    label: `${opt.department} • ${opt.year} • Div ${opt.division}`
                });
            }
        });
        return Array.from(map.values());
    }, [options]);

    // Active selected class object
    const currentClass = useMemo(() => {
        return availableClasses.find(c => c.key === selectedClassKey) || availableClasses[0] || null;
    }, [availableClasses, selectedClassKey]);

    // Subjects available for the selected class
    const availableSubjects = useMemo(() => {
        if (!currentClass) return [];
        return options.filter(opt =>
            opt.department === currentClass.department &&
            opt.year === currentClass.year &&
            opt.division === currentClass.division
        );
    }, [options, currentClass]);

    // Keep selectedSubjectId aligned when class changes
    useEffect(() => {
        if (availableSubjects.length > 0) {
            const exists = availableSubjects.some(s => String(s.subjectId) === String(selectedSubjectId));
            if (!exists) {
                setSelectedSubjectId(String(availableSubjects[0].subjectId));
            }
        }
    }, [availableSubjects, selectedSubjectId]);

    const activeSubject = useMemo(() => {
        return availableSubjects.find(s => String(s.subjectId) === String(selectedSubjectId)) || availableSubjects[0] || null;
    }, [availableSubjects, selectedSubjectId]);

    // LOAD ATTENDANCE SHEET: Triggered when "Add Attendance" is clicked
    const handleAddAttendanceClick = useCallback(async () => {
        if (!selectedSubjectId || !currentClass || !attendanceDate) {
            setAlertMsg({ type: "error", text: "Please select Class, Subject, and Attendance Date ❌" });
            return;
        }

        setLoadingSheet(true);
        setAlertMsg(null);
        setActiveSection("entry");

        try {
            const res = await api.get("/attendance/sheet", {
                subjectId: selectedSubjectId,
                division: currentClass.division,
                date: attendanceDate
            });

            if (res && res.students) {
                setStudents(res.students.map(s => ({
                    studentId: s.studentId,
                    rollNo: s.rollNo,
                    name: s.name,
                    status: s.status || "PRESENT"
                })));
                setIsSavedSession(Boolean(res.isSaved));
                setIsSheetLoaded(true);
                setAlertMsg({
                    type: "success",
                    text: res.isSaved 
                        ? `Loaded saved attendance for ${attendanceDate} (Edit mode enabled).`
                        : `Loaded ${res.students.length} enrolled students for ${attendanceDate}. Ready to mark attendance.`
                });
            } else {
                setStudents([]);
                setIsSheetLoaded(true);
            }
        } catch (err) {
            console.error("Failed to load attendance sheet:", err);
            setAlertMsg({
                type: "error",
                text: err.response?.data?.error || err.message || "Failed to load student roster ❌"
            });
        } finally {
            setLoadingSheet(false);
        }
    }, [selectedSubjectId, currentClass, attendanceDate]);

    // LOAD ATTENDANCE HISTORY
    const loadHistory = useCallback(async () => {
        if (!selectedSubjectId || !currentClass) return;
        setLoadingHistory(true);
        try {
            const res = await api.get("/attendance/history", {
                subjectId: selectedSubjectId,
                division: currentClass.division
            });

            if (res && res.history) {
                // Flatten into individual student history records per Section 5 specification:
                // Roll Number | Student Name | Date | Subject | Status
                const flatRows = [];
                res.history.forEach(session => {
                    (session.entries || []).forEach(entry => {
                        flatRows.push({
                            id: `${session._id}_${entry.studentId}`,
                            rollNo: entry.rollNo || "-",
                            studentName: entry.name || "Student",
                            date: session.date,
                            subjectName: activeSubject?.subjectName || "Subject",
                            division: currentClass.division,
                            status: entry.status || "PRESENT"
                        });
                    });
                });
                setHistoryRecords(flatRows);
            }
        } catch (err) {
            console.error("Failed to load attendance history:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [selectedSubjectId, currentClass, activeSubject]);

    // Load history when switching to history tab
    useEffect(() => {
        if (activeSection === "history" && selectedSubjectId && currentClass) {
            loadHistory();
        }
    }, [activeSection, selectedSubjectId, currentClass, loadHistory]);

    // Toggle Individual Student Status (Present / Absent / On Leave)
    const handleStatusToggle = (studentId, nextStatus) => {
        setStudents(prev => prev.map(s => {
            if (String(s.studentId) === String(studentId)) {
                return { ...s, status: nextStatus };
            }
            return s;
        }));
    };

    // Bulk Quick Mark
    const handleMarkAll = (status) => {
        setStudents(prev => prev.map(s => ({ ...s, status })));
    };

    // SAVE ATTENDANCE TO DATABASE
    const handleSaveAttendance = async () => {
        if (!selectedSubjectId || !currentClass || !attendanceDate) {
            setAlertMsg({ type: "error", text: "Please complete class and date selection ❌" });
            return;
        }

        if (students.length === 0) {
            setAlertMsg({ type: "error", text: "No enrolled students found to save attendance ❌" });
            return;
        }

        setSaving(true);
        setAlertMsg(null);

        const payload = {
            subjectId: selectedSubjectId,
            division: currentClass.division,
            date: attendanceDate,
            entries: students.map(s => ({
                studentId: s.studentId,
                rollNo: s.rollNo,
                name: s.name,
                status: s.status || "PRESENT"
            }))
        };

        try {
            const res = await api.post("/attendance/sheet", payload);
            setAlertMsg({
                type: "success",
                text: res.message || `Attendance for ${attendanceDate} saved successfully! ✅`
            });
            setIsSavedSession(true);
            if (activeSection === "history") {
                loadHistory();
            }
        } catch (err) {
            console.error("Save attendance error:", err);
            setAlertMsg({
                type: "error",
                text: err.response?.data?.error || err.message || "Failed to save attendance ❌"
            });
        } finally {
            setSaving(false);
        }
    };

    // Filtered History Rows
    const filteredHistory = useMemo(() => {
        return historyRecords.filter(r => {
            if (historyFilterDate && r.date !== historyFilterDate) return false;
            if (historyFilterRoll.trim()) {
                const q = historyFilterRoll.toLowerCase();
                const matchRoll = r.rollNo && r.rollNo.toLowerCase().includes(q);
                const matchName = r.studentName && r.studentName.toLowerCase().includes(q);
                if (!matchRoll && !matchName) return false;
            }
            return true;
        });
    }, [historyRecords, historyFilterDate, historyFilterRoll]);

    const presentCount = students.filter(s => s.status === "PRESENT").length;
    const absentCount = students.filter(s => s.status === "ABSENT").length;
    const leaveCount = students.filter(s => s.status === "ON_LEAVE").length;

    return (
        <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
            {/* Header / Section Switcher */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>✅</span> Attendance Management
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Select class and subject to record daily attendance or review historical logs &bull; {currentUser?.name}
                    </p>
                </div>

                {/* Section Toggle */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveSection("entry")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                            activeSection === "entry"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        ✏️ Mark Attendance
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveSection("history");
                            loadHistory();
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                            activeSection === "history"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        📊 Attendance History
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {alertMsg && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md ${
                    alertMsg.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                    <div className="flex items-center gap-2">
                        <span>{alertMsg.type === "success" ? "✅" : "⚠️"}</span>
                        <span>{alertMsg.text}</span>
                    </div>
                    <button onClick={() => setAlertMsg(null)} className="opacity-75 hover:opacity-100 text-sm ml-4">✕</button>
                </div>
            )}

            {/* TOP CONTROLS (Requirement 5: Class/Year/Division, Assigned Subject, Attendance Date, Add Attendance button) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs items-end">
                    {/* 1. Class / Year / Division */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            1. Class / Year / Division * {loadingOptions && <span className="text-slate-500 font-normal lowercase">(loading...)</span>}
                        </label>
                        <select
                            value={selectedClassKey}
                            onChange={(e) => setSelectedClassKey(e.target.value)}
                            disabled={loadingOptions}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                        >
                            {availableClasses.map(c => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Assigned Subject */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            2. Assigned Subject *
                        </label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            disabled={loadingOptions}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                        >
                            {availableSubjects.map(s => (
                                <option key={s.subjectId} value={s.subjectId}>
                                    {s.subjectName} ({s.subjectCode})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Attendance Date */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            3. Attendance Date *
                        </label>
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            disabled={loadingOptions}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                        />
                    </div>

                    {/* 4. Single Add Attendance Button */}
                    <div>
                        <button
                            type="button"
                            onClick={handleAddAttendanceClick}
                            disabled={loadingSheet || availableClasses.length === 0}
                            className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {loadingSheet ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    <span>Loading Students...</span>
                                </>
                            ) : (
                                <>
                                    <span>➕</span>
                                    <span>Add Attendance</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* SECTION 1: ATTENDANCE ENTRY (MINIMAL TABLE: Roll No. | Student Name | Status) */}
            {activeSection === "entry" && isSheetLoaded && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    {/* Page-level context banner instead of repeating on every row */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Active Class Context</span>
                            <div className="font-medium text-slate-200">
                                <strong className="text-indigo-300">{currentClass?.department} ({currentClass?.year})</strong>
                                {" • "}
                                <span>Division {currentClass?.division}</span>
                                {" • "}
                                <strong className="text-slate-100">{activeSubject?.subjectName}</strong>
                                {" • "}
                                <span className="font-mono text-slate-400">📅 {attendanceDate}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isSavedSession ? (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                                    ✓ Saved Record (Edit Mode)
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
                                    New Session
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Bulk Actions & Counters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 text-[11px]">Enrolled: <strong>{students.length}</strong></span>
                            <span className="text-emerald-400 text-[11px]">Present: <strong>{presentCount}</strong></span>
                            <span className="text-rose-400 text-[11px]">Absent: <strong>{absentCount}</strong></span>
                            {leaveCount > 0 && <span className="text-amber-400 text-[11px]">On Leave: <strong>{leaveCount}</strong></span>}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleMarkAll("PRESENT")}
                                className="px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition cursor-pointer"
                            >
                                All Present
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMarkAll("ABSENT")}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition cursor-pointer"
                            >
                                All Absent
                            </button>
                            <button
                                type="button"
                                disabled={saving || students.length === 0}
                                onClick={handleSaveAttendance}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                            >
                                {saving ? "Saving..." : isSavedSession ? "Update Attendance ✅" : "Save Attendance 💾"}
                            </button>
                        </div>
                    </div>

                    {/* Minimal Entry Table: Roll No. | Student Name | Status (Requirement 5) */}
                    {students.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                            No students enrolled in this class cohort.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-2.5 px-4 w-28 whitespace-nowrap">Roll No.</th>
                                        <th className="py-2.5 px-4 min-w-[200px]">Student Name</th>
                                        <th className="py-2.5 px-4 text-right whitespace-nowrap w-44">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-300">
                                    {students.map((s) => {
                                        return (
                                            <tr key={s.studentId} className="hover:bg-slate-850/40 transition">
                                                {/* Roll No */}
                                                <td className="py-2.5 px-4 font-mono font-bold text-indigo-300">
                                                    {s.rollNo}
                                                </td>

                                                {/* Student Name */}
                                                <td className="py-2.5 px-4 font-semibold text-slate-100">
                                                    {s.name}
                                                </td>

                                                {/* Status (Present / Absent / On Leave) */}
                                                <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusToggle(s.studentId, "PRESENT")}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                s.status === "PRESENT"
                                                                    ? "bg-emerald-600 text-white shadow-sm font-black"
                                                                    : "text-slate-400 hover:text-emerald-300"
                                                            }`}
                                                        >
                                                            Present
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusToggle(s.studentId, "ABSENT")}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                s.status === "ABSENT"
                                                                    ? "bg-rose-600 text-white shadow-sm font-black"
                                                                    : "text-slate-400 hover:text-rose-300"
                                                            }`}
                                                        >
                                                            Absent
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusToggle(s.studentId, "ON_LEAVE")}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                s.status === "ON_LEAVE"
                                                                    ? "bg-amber-600 text-white shadow-sm font-black"
                                                                    : "text-slate-500 hover:text-amber-300"
                                                            }`}
                                                            title="Mark student On Leave"
                                                        >
                                                            Leave
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Save Attendance Button at Bottom */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                            Confirm that attendance has been evaluated for all enrolled students.
                        </span>
                        <button
                            type="button"
                            disabled={saving || students.length === 0}
                            onClick={handleSaveAttendance}
                            className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                        >
                            <span>💾</span>
                            <span>{saving ? "Saving..." : isSavedSession ? "Update Attendance Records" : "Save Attendance"}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* SECTION 2: ATTENDANCE HISTORY (Requirement 5: Separate section with Roll No, Student Name, Date, Subject, Status + simple filters) */}
            {activeSection === "history" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100">
                                Attendance History &amp; Logs &bull; {currentClass?.department} (Div {currentClass?.division})
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Search individual student attendance records across recorded sessions.
                            </p>
                        </div>

                        <span className="text-[11px] text-slate-500">
                            {filteredHistory.length} record{filteredHistory.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {/* Simple Filters: Date and Roll Number (Requirement 5) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Filter by Session Date:
                            </label>
                            <input
                                type="date"
                                value={historyFilterDate}
                                onChange={(e) => setHistoryFilterDate(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Filter by Roll No / Student Name:
                            </label>
                            <input
                                type="text"
                                placeholder="Search Roll No or Student Name..."
                                value={historyFilterRoll}
                                onChange={(e) => setHistoryFilterRoll(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* History Table: Roll Number | Student Name | Date | Subject | Status */}
                    {loadingHistory ? (
                        <div className="p-12 text-center text-slate-500 text-xs">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            Loading attendance records...
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                            No attendance history records match your filter for this class.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                                        <th className="py-2.5 px-3 whitespace-nowrap">Roll Number</th>
                                        <th className="py-2.5 px-3 min-w-[160px]">Student Name</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                                        <th className="py-2.5 px-3 min-w-[160px]">Subject</th>
                                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-300">
                                    {filteredHistory.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-850/40 transition">
                                            {/* Roll Number */}
                                            <td className="py-2 px-3 font-mono font-bold text-indigo-300">
                                                {row.rollNo}
                                            </td>

                                            {/* Student Name */}
                                            <td className="py-2 px-3 font-semibold text-slate-200">
                                                {row.studentName}
                                            </td>

                                            {/* Date */}
                                            <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                                                {row.date}
                                            </td>

                                            {/* Subject */}
                                            <td className="py-2 px-3 text-slate-300">
                                                {row.subjectName}
                                            </td>

                                            {/* Status */}
                                            <td className="py-2 px-3 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    row.status === "PRESENT"
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : row.status === "ABSENT"
                                                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                }`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AttendancePanel;
