import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import DivisionManagementCard from "./DivisionManagementCard";

function GreenBookPanel({ currentUser, refreshTrigger, onRefresh, onSelectFaculty, navKey }) {
    const [subjects, setSubjects] = useState([]);
    const [faculties, setFaculties] = useState([]);
    
    // Principal dropdown filters
    const [selectedFacultyId, setSelectedFacultyId] = useState("all");
    const [loading, setLoading] = useState(false);
    
    // Detail views states
    const [activeSubject, setActiveSubject] = useState(null);
    const [detailTab, setDetailTab] = useState("lectures"); // lectures, practicals, plan, students

    // Direct navigation reset when clicking sidebar Green Book (Requirement 11)
    useEffect(() => {
        if (navKey !== undefined && navKey !== null) {
            setActiveSubject(null);
            setSelectedDivision(null);
            setShowAddForm(false);
            setShowCsvImporter(false);
        }
    }, [navKey]);
    
    // Add subject form toggle and inputs
    const [showAddForm, setShowAddForm] = useState(false);
    const [subjectForm, setSubjectForm] = useState({
        subjectName: "",
        subjectCode: "",
        department: currentUser.department,
        academicYear: "2025-2026",
        semester: "Odd Semester",
        lecturesPlanned: "40",
        practicalCode: "",
        practicalsPlanned: "0",
        lectureTopicsText: "",
        hasDivision: "No",
        numberOfDivisions: "2"
    });

    // Bulk students CSV string
    const [csvInput, setCsvInput] = useState("");
    const [showCsvImporter, setShowCsvImporter] = useState(false);

    // Selected student attributes editor
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAttr, setStudentAttr] = useState({
        mobileNumber: "",
        prnNumber: "",
        skills: "",
        customKey: "",
        customValue: "",
        customFields: {}
    });

    const [selectedDivision, setSelectedDivision] = useState(null);

    const [teachingPlanEditable, setTeachingPlanEditable] = useState([]);
    const [lecturesPlanEditable, setLecturesPlanEditable] = useState([]);
    const [planSubTab, setPlanSubTab] = useState("weekly"); // weekly | lectures
    const [viewMode, setViewMode] = useState("list"); // list | calendar

    const loadSubjects = async () => {
        const targetUser = currentUser.role === "Principal" ? (selectedFacultyId || "all") : currentUser.id;
        try {
            const data = await api.get("/subjects", { targetUserId: targetUser });
            setSubjects(data.subjects || []);
            if (activeSubject) {
                const updated = (data.subjects || []).find(s => s._id === activeSubject._id);
                if (updated) {
                    setActiveSubject(updated);
                }
            }
        } catch (err) {
            console.error("Failed to load subjects:", err);
        }
    };

    const loadFaculties = async () => {
        if (currentUser.role !== "Principal") return;
        try {
            const data = await api.get("/faculty");
            setFaculties(data.faculties || []);
            if (data.faculties.length > 0 && selectedFacultyId === "") {
                setSelectedFacultyId("all");
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadSubjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFacultyId, refreshTrigger]);

    useEffect(() => {
        loadFaculties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    useEffect(() => {
        if (activeSubject) {
            setTeachingPlanEditable(activeSubject.teachingPlan || []);
            setLecturesPlanEditable(activeSubject.lectures || []);
        }
    }, [activeSubject]);

    const handleSaveFullLecturesPlan = async () => {
        try {
            await api.put(`/subjects/${activeSubject._id}/lectures-full`, { lectures: lecturesPlanEditable });
            alert("Lectures syllabus plan saved successfully! ✅");
            loadSubjects();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save lectures plan.");
        }
    };

    const handleLecturePlanChange = (index, field, value) => {
        const copy = [...lecturesPlanEditable];
        copy[index] = { ...copy[index], [field]: value };
        setLecturesPlanEditable(copy);
    };



    const handleSaveFullTeachingPlan = async () => {
        try {
            await api.put(`/subjects/${activeSubject._id}/teaching-plan-full`, { teachingPlan: teachingPlanEditable });
            alert("Teaching plan updated successfully! ✅");
            loadSubjects();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save teaching plan.");
        }
    };

    const handleWeekChange = (index, field, value) => {
        const copy = [...teachingPlanEditable];
        copy[index] = { ...copy[index], [field]: value };
        setTeachingPlanEditable(copy);
    };

    const handleAddWeek = () => {
        const nextWeek = teachingPlanEditable.length + 1;
        setTeachingPlanEditable(prev => [
            ...prev,
            {
                week: nextWeek,
                topic: `Week ${nextWeek} Syllabus Target`,
                plannedDate: new Date().toISOString().split("T")[0],
                conductedDate: "",
                remarks: "",
                status: "pending"
            }
        ]);
    };

    const handleDeleteWeek = () => {
        if (teachingPlanEditable.length === 0) return;
        setTeachingPlanEditable(prev => prev.slice(0, -1));
    };

    // Handle create subject
    const handleCreateSubject = async (e) => {
        e.preventDefault();

        if (currentUser.role === "Principal" && (!selectedFacultyId || selectedFacultyId === "all")) {
            alert("Please select a specific faculty member to assign this subject to! ❌");
            return;
        }

        setLoading(true);

        const lectureTopics = subjectForm.lectureTopicsText
            ? subjectForm.lectureTopicsText.split("\n").filter(line => line.trim() !== "")
            : [];

        const payload = {
            userId: currentUser.id,
            role: currentUser.role,
            assignedFacultyId: currentUser.role === "Principal" ? selectedFacultyId : currentUser.id,
            ...subjectForm,
            lectureTopics
        };

        try {
            await api.post("/subjects", payload);
            alert("New subject registered in Green Book! ✅");
            setShowAddForm(false);
            setSubjectForm({
                subjectName: "",
                subjectCode: "",
                department: currentUser.department,
                academicYear: "2025-2026",
                semester: "Odd Semester",
                lecturesPlanned: "40",
                practicalCode: "",
                practicalsPlanned: "0",
                lectureTopicsText: ""
            });
            loadSubjects();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to register subject.");
        } finally {
            setLoading(false);
        }
    };



    // Update Lecture Delivery Status (YES / NO)
    const handleLectureDeliveryStatus = async (lectureId, deliveryStatus) => {
        try {
            // Optimistic local state update
            if (activeSubject && activeSubject.lectures) {
                const updatedLectures = activeSubject.lectures.map(l => {
                    if (String(l._id) === String(lectureId)) {
                        return {
                            ...l,
                            lectureDeliveryStatus: deliveryStatus,
                            status: deliveryStatus === "COMPLETED" ? "completed" : "pending",
                            conductedDate: deliveryStatus === "COMPLETED" ? (l.conductedDate || new Date().toISOString().split("T")[0]) : ""
                        };
                    }
                    return l;
                });
                setActiveSubject({
                    ...activeSubject,
                    lectures: updatedLectures,
                    lecturesConducted: updatedLectures.filter(l => l.lectureDeliveryStatus === "COMPLETED" || l.status === "completed").length
                });
            }

            // Persist to backend database
            await api.put(`/subjects/${activeSubject._id}/lectures/${lectureId}/delivery-status`, {
                lectureDeliveryStatus: deliveryStatus
            });

            // Reload subject data to ensure full sync
            loadSubjects();
        } catch (err) {
            console.error("Failed to update lecture delivery status:", err);
            alert(err.message || "Failed to update lecture delivery status ❌");
        }
    };

    // Toggle Practical completion
    const togglePracticalConduct = async (itemId, currentStatus) => {
        if (currentUser.role === "Principal") return;
        
        const nextStatus = currentStatus === "completed" ? "pending" : "completed";
        const conductedDate = nextStatus === "completed" ? new Date().toISOString().split("T")[0] : "";

        let conductedTopic = "";
        if (nextStatus === "completed") {
            const input = document.getElementById(`topic-input-${itemId}`);
            conductedTopic = input ? input.value : "";
        }

        try {
            await api.put(`/subjects/${activeSubject._id}/conduct-class`, {
                itemId,
                type: "practical",
                conductedDate,
                conductedTopic,
                status: nextStatus
            });
            loadSubjects();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to update practical status.");
        }
    };



    // Parse pasted CSV students list
    const handleCsvImport = async () => {
        if (!csvInput.trim()) return;

        const lines = csvInput.trim().split("\n");
        const list = [];
        let formatError = false;

        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(",");
            if (parts.length >= 4) {
                const roll = parts[0].trim();
                const name = parts[1].trim();
                const mob = parts[2].trim();
                const prn = parts[3].trim();
                
                if (!/^\d{10}$/.test(mob)) {
                    alert(`Invalid mobile number format: ${mob} for ${name} (must be 10 digits numeric) ❌`);
                    return;
                }
                
                list.push({
                    rollNo: roll,
                    name: name,
                    mobileNumber: mob,
                    prnNumber: prn
                });
            } else {
                formatError = true;
            }
        }

        if (formatError && list.length === 0) {
            alert("Format error. Please use: rollNo,name,mobileNumber,prnNumber (comma separated, one per line) ❌");
            return;
        }

        try {
            await api.put(`/subjects/${activeSubject._id}/import-students`, { studentsList: list });
            alert(`Successfully enrolled ${list.length} students! ✅`);
            setCsvInput("");
            setShowCsvImporter(false);
            loadSubjects();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to enroll students.");
        }
    };

    // Open Student Modal Editor
    const openStudentEditor = (s) => {
        setSelectedStudent(s);
        setStudentAttr({
            mobileNumber: s.mobileNumber || "",
            prnNumber: s.prnNumber || "",
            skills: s.skills || "",
            customKey: "",
            customValue: "",
            customFields: s.customFields ? (s.customFields instanceof Map ? Object.fromEntries(s.customFields) : s.customFields) : {}
        });
    };

    // Add Custom Attribute Field Key-Value
    const addCustomField = () => {
        if (!studentAttr.customKey || !studentAttr.customValue) return;
        setStudentAttr(prev => ({
            ...prev,
            customFields: {
                ...prev.customFields,
                [prev.customKey.trim()]: prev.customValue.trim()
            },
            customKey: "",
            customValue: ""
        }));
    };

    // Save Student Attributes
    const handleSaveStudentAttributes = async () => {
        if (!/^\d{10}$/.test(studentAttr.mobileNumber)) {
            alert("Mobile number must be exactly 10 digits and numeric! ❌");
            return;
        }
        try {
            await api.put(`/subjects/${activeSubject._id}/students/${selectedStudent._id}`, {
                mobileNumber: studentAttr.mobileNumber,
                prnNumber: studentAttr.prnNumber,
                skills: studentAttr.skills,
                customFields: studentAttr.customFields
            });
            alert("Student parameters updated successfully! ✅");
            setSelectedStudent(null);
            loadSubjects();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to update attributes.");
        }
    };

    return (
        <div className="space-y-6">
            
            {/* ================= HEADER CONTROL BAR ================= */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-auto">
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Green Book Academic Management</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {currentUser.role === "Principal" ? "Steer and track academic progress metrics." : "Add subjects, checklist syllabus milestones, and enroll student lists."}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {/* Principal Faculty Dropdown */}
                    {currentUser.role === "Principal" && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Faculty:</span>
                            <select
                                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none"
                                value={selectedFacultyId}
                                onChange={(e) => { setSelectedFacultyId(e.target.value); setActiveSubject(null); }}
                            >
                                <option value="all">All Faculty Members</option>
                                {faculties.map(f => (
                                    <option key={f._id} value={f._id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!activeSubject && (
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all"
                        >
                            {showAddForm ? "Close Form" : currentUser.role === "Principal" ? "Assign Subject" : "Add Subject"}
                        </button>
                    )}
                </div>
            </div>

            {/* ================= INJECT: ADD SUBJECT FORM ================= */}
            {showAddForm && !activeSubject && (
                <form onSubmit={handleCreateSubject} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {currentUser.role === "Principal" ? "Assign New Teaching Subject to Selected Faculty" : "Add Your Custom Handled Subject"}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Subject Name</label>
                            <input
                                type="text"
                                required
                                value={subjectForm.subjectName}
                                onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
                                placeholder="e.g. Database Management"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Subject Code</label>
                            <input
                                type="text"
                                required
                                value={subjectForm.subjectCode}
                                onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })}
                                placeholder="e.g. CS-301"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
                            <input
                                type="text"
                                required
                                value={subjectForm.department}
                                onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lectures Planned</label>
                            <input
                                type="number"
                                required
                                value={subjectForm.lecturesPlanned}
                                onChange={(e) => setSubjectForm({ ...subjectForm, lecturesPlanned: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Semester</label>
                            <select
                                value={subjectForm.semester}
                                onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
                                className="bg-slate-950 text-xs text-slate-200 rounded-xl"
                            >
                                <option value="Odd Semester">Odd Semester</option>
                                <option value="Even Semester">Even Semester</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Academic Year</label>
                            <input
                                type="text"
                                required
                                value={subjectForm.academicYear}
                                onChange={(e) => setSubjectForm({ ...subjectForm, academicYear: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Practical Batch Code (Optional)</label>
                            <input
                                type="text"
                                value={subjectForm.practicalCode}
                                onChange={(e) => setSubjectForm({ ...subjectForm, practicalCode: e.target.value })}
                                placeholder="e.g. CS-301-P"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Practicals Planned</label>
                            <input
                                type="number"
                                value={subjectForm.practicalsPlanned}
                                onChange={(e) => setSubjectForm({ ...subjectForm, practicalsPlanned: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Has Divisions?</label>
                            <select
                                className="bg-slate-950 text-xs text-slate-200 rounded-xl"
                                value={subjectForm.hasDivision}
                                onChange={(e) => setSubjectForm({ ...subjectForm, hasDivision: e.target.value })}
                            >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                        </div>

                        {subjectForm.hasDivision === "Yes" && (
                            <div className="flex flex-col gap-1.5 animate-fade-in">
                                <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Number of Divisions</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="5"
                                    className="bg-slate-950 text-xs text-slate-200 rounded-xl"
                                    value={subjectForm.numberOfDivisions}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, numberOfDivisions: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plan of Lectures (Optional - One Topic per Line)</label>
                        <textarea
                            rows={4}
                            value={subjectForm.lectureTopicsText}
                            onChange={(e) => setSubjectForm({ ...subjectForm, lectureTopicsText: e.target.value })}
                            placeholder="e.g.&#10;Introduction to Database Management&#10;Relational Model and Constraints&#10;SQL Queries (DDL, DML)&#10;Normalization (1NF, 2NF, 3NF)"
                            className="w-full text-xs bg-slate-955 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-indigo-500 text-slate-200"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-xs text-slate-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl disabled:opacity-50"
                        >
                            {loading ? "Registering..." : "Confirm Subject Addition"}
                        </button>
                    </div>
                </form>
            )}

            {/* ================= SUBJECTS LIST CARDS GRID ================= */}
            {!activeSubject && (
                subjects.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 italic text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                        No active subjects found in the Green Book.
                    </div>
                ) : currentUser.role === "Principal" ? (
                    // Group subjects by Faculty Name!
                    (() => {
                        const grouped = {};
                        subjects.forEach(sub => {
                            const facName = sub.userId?.name || "Unassigned Faculty";
                            if (!grouped[facName]) grouped[facName] = { faculty: sub.userId, list: [] };
                            grouped[facName].list.push(sub);
                        });

                        return (
                            <div className="space-y-8">
                                {Object.keys(grouped).map(facName => (
                                    <div key={facName} className="space-y-4">
                                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                                <span>👤</span>
                                                <span>Faculty:</span>
                                                {grouped[facName].faculty ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onSelectFaculty && onSelectFaculty(grouped[facName].faculty)}
                                                        className="text-white hover:text-indigo-300 font-bold underline cursor-pointer"
                                                        title="Click to view full academic profile"
                                                    >
                                                        {facName} ↗
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">{facName}</span>
                                                )}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {grouped[facName].list.map(sub => {
                                                const lecProgress = sub.lecturesPlanned > 0 ? Math.round((sub.lecturesConducted / sub.lecturesPlanned) * 100) : 0;
                                                const pracProgress = sub.practicalsPlanned > 0 ? Math.round((sub.practicalsConducted / sub.practicalsPlanned) * 100) : 0;
                                                return (
                                                    <div 
                                                        key={sub._id} 
                                                        onClick={() => { setActiveSubject(sub); setSelectedDivision(null); setDetailTab("lectures"); }}
                                                        className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-md hover:border-indigo-500/40 transition-all cursor-pointer relative overflow-hidden group hover:-translate-y-0.5"
                                                    >
                                                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider inline-block mb-3">
                                                            {sub.semester} &bull; {sub.academicYear} {sub.hasDivision && <span className="text-emerald-400 ml-1">(Divisions A-{sub.divisionList[sub.divisionList.length - 1]})</span>}
                                                        </span>
                                                        
                                                        <h3 className="text-xs font-bold text-slate-200 leading-snug group-hover:text-indigo-400 transition-colors">{sub.subjectName}</h3>
                                                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold tracking-wider">Code: {sub.subjectCode} &bull; Dept: {sub.department}</p>
                                                        
                                                        {/* Progress Metrics */}
                                                        <div className="mt-5 space-y-3 text-[10px]">
                                                            <div>
                                                                <div className="flex justify-between font-medium text-slate-400 mb-1">
                                                                    <span>Lectures Progress</span>
                                                                    <span className="font-semibold text-slate-200">{sub.lecturesConducted} / {sub.lecturesPlanned} ({lecProgress}%)</span>
                                                                </div>
                                                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                                                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${lecProgress}%` }}></div>
                                                                </div>
                                                            </div>

                                                            {sub.practicalsPlanned > 0 && (
                                                                <div>
                                                                    <div className="flex justify-between font-medium text-slate-400 mb-1">
                                                                        <span>Practicals Progress</span>
                                                                        <span className="font-semibold text-slate-200">{sub.practicalsConducted} / {sub.practicalsPlanned} ({pracProgress}%)</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                                                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pracProgress}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map(sub => {
                            const lecProgress = sub.lecturesPlanned > 0 ? Math.round((sub.lecturesConducted / sub.lecturesPlanned) * 100) : 0;
                            const pracProgress = sub.practicalsPlanned > 0 ? Math.round((sub.practicalsConducted / sub.practicalsPlanned) * 100) : 0;
                            return (
                                <div 
                                    key={sub._id} 
                                    onClick={() => { setActiveSubject(sub); setDetailTab("lectures"); }}
                                    className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-md hover:border-indigo-500/40 transition-all cursor-pointer relative overflow-hidden group hover:-translate-y-0.5"
                                >
                                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider inline-block mb-3">
                                        {sub.semester} &bull; {sub.academicYear}
                                    </span>
                                    
                                    <h3 className="text-xs font-bold text-slate-200 leading-snug group-hover:text-indigo-400 transition-colors">{sub.subjectName}</h3>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold tracking-wider">Code: {sub.subjectCode} &bull; Dept: {sub.department}</p>
                                    
                                    {/* Progress Metrics */}
                                    <div className="mt-5 space-y-3 text-[10px]">
                                        <div>
                                            <div className="flex justify-between font-medium text-slate-400 mb-1">
                                                <span>Lectures Progress</span>
                                                <span className="font-semibold text-slate-200">{sub.lecturesConducted} / {sub.lecturesPlanned} ({lecProgress}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${lecProgress}%` }}></div>
                                            </div>
                                        </div>

                                        {sub.practicalsPlanned > 0 && (
                                            <div>
                                                <div className="flex justify-between font-medium text-slate-400 mb-1">
                                                    <span>Practicals Progress</span>
                                                    <span className="font-semibold text-slate-200">{sub.practicalsConducted} / {sub.practicalsPlanned} ({pracProgress}%)</span>
                                                </div>
                                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pracProgress}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ================= DETAILED GREEN BOOK INSPECTOR PANEL ================= */}
            {activeSubject && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                    
                    {/* Header bar */}
                    <div className="bg-slate-950/40 p-5 border-b border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            {/* Requirement 11: Breadcrumbs Navigation */}
                            <nav className="flex items-center gap-1.5 text-xs mb-2.5 text-slate-400 font-medium flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveSubject(null);
                                        setSelectedDivision(null);
                                    }}
                                    className="hover:text-indigo-300 text-indigo-400 font-semibold cursor-pointer flex items-center gap-1 transition"
                                >
                                    <span>📖 Green Book</span>
                                </button>
                                <span className="text-slate-600">/</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedDivision) setSelectedDivision(null);
                                    }}
                                    className={`${selectedDivision ? "text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold" : "text-white font-bold cursor-default"}`}
                                >
                                    {activeSubject.subjectName} ({activeSubject.subjectCode})
                                </button>
                                {selectedDivision && (
                                    <>
                                        <span className="text-slate-600">/</span>
                                        <span className="text-white font-bold">Division {selectedDivision}</span>
                                    </>
                                )}
                                {!activeSubject.hasDivision && (
                                    <>
                                        <span className="text-slate-600">/</span>
                                        <span className="text-indigo-300 uppercase text-[10px] bg-indigo-600/20 px-2 py-0.5 rounded font-bold">
                                            {detailTab}
                                        </span>
                                    </>
                                )}
                            </nav>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveSubject(null);
                                        setSelectedDivision(null);
                                    }}
                                    className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded-md transition cursor-pointer font-medium"
                                    title="Return directly to Green Book Main Page"
                                >
                                    ← Back to Main Page
                                </button>
                                <h3 className="text-sm font-bold text-slate-200">{activeSubject.subjectName} ({activeSubject.subjectCode})</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold mt-1">Semester: {activeSubject.semester} &bull; Academic Year: {activeSubject.academicYear}</p>
                        </div>

                        {/* Tracker Sub-Tabs */}
                        {!activeSubject.hasDivision && (
                            <div className="flex flex-wrap gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl">
                                {["lectures", "practicals", "plan", "students"].map(tab => {
                                    if (tab === "practicals" && activeSubject.practicalsPlanned === 0) return null;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setDetailTab(tab)}
                                            className={`px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${detailTab === tab ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                                        >
                                            {tab}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        {activeSubject.hasDivision ? (
                            selectedDivision ? (
                                <DivisionManagementCard
                                    subject={activeSubject}
                                    divisionId={selectedDivision}
                                    currentUser={currentUser}
                                    onRefresh={loadSubjects}
                                />
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Division Management Sections</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                        {activeSubject.divisionList.map(div => {
                                            const divStuds = (activeSubject.students || []).filter(st => st.division === div);
                                            return (
                                                <div 
                                                    key={div}
                                                    onClick={() => setSelectedDivision(div)}
                                                    className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl cursor-pointer hover:border-indigo-500/40 transition-all flex flex-col justify-between group hover:-translate-y-0.5"
                                                >
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">Division {div}</h4>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mt-1">Section Profile</span>
                                                        <p className="text-[10px] text-slate-400 mt-4 font-semibold">Students Enlisted: {divStuds.length}</p>
                                                    </div>
                                                    <button className="mt-6 w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-[10px] rounded-lg transition-colors">
                                                        Inspect Section {div}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        ) : (
                            <>
                                {/* 1. LECTURES SUBTAB */}
                                {detailTab === "lectures" && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Planned vs Conducted Lectures Logs</h4>
                                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider">
                                        Conducted: {activeSubject.lecturesConducted} / {activeSubject.lecturesPlanned}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(activeSubject.lectures || []).map((lec, idx) => {
                                        const isCompleted = lec.lectureDeliveryStatus === "COMPLETED" || (!lec.lectureDeliveryStatus && lec.status === "completed");
                                        const isExplicitIncomplete = lec.lectureDeliveryStatus === "INCOMPLETE";
                                        const currentDeliveryStatus = isCompleted 
                                            ? "COMPLETED" 
                                            : isExplicitIncomplete 
                                                ? "INCOMPLETE" 
                                                : "INCOMPLETE / NOT MARKED";

                                        return (
                                            <div 
                                                key={lec._id}
                                                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                                                    isCompleted 
                                                        ? "bg-slate-950/20 border-emerald-500/30 shadow-sm shadow-emerald-500/5" 
                                                        : "bg-slate-950/40 border-slate-850"
                                                }`}
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                                        <span className="font-bold text-slate-300">Lecture {idx + 1}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                            isCompleted 
                                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                        }`}>
                                                            {isCompleted ? "COMPLETED" : "PLANNED"}
                                                        </span>
                                                    </div>

                                                    <div className="text-[10px] text-slate-400">
                                                        <span className="font-bold text-slate-500">Subject:</span> {activeSubject.subjectName}
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-500 block">Topic:</span>
                                                        <span className="text-xs font-bold text-slate-100 leading-snug">
                                                            {isCompleted && lec.conductedTopic ? lec.conductedTopic : lec.topic}
                                                        </span>
                                                    </div>

                                                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                                                        <span><strong className="text-slate-500">Date:</strong> {lec.plannedDate}</span>
                                                        {lec.conductedDate && (
                                                            <span className="text-emerald-400 font-semibold text-[9px]">Delivered: {lec.conductedDate}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Did you deliver this lecture? Section (YES / NO) */}
                                                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                                                    <p className="text-[11px] font-bold text-slate-200">
                                                        Did you deliver this lecture?
                                                    </p>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLectureDeliveryStatus(lec._id, "COMPLETED")}
                                                            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                                                isCompleted
                                                                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400"
                                                                    : "bg-slate-900 text-slate-400 border-slate-750 hover:bg-slate-800 hover:text-slate-200"
                                                            }`}
                                                        >
                                                            <span>{isCompleted ? "✓" : ""}</span>
                                                            <span>YES</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLectureDeliveryStatus(lec._id, "INCOMPLETE")}
                                                            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                                                isExplicitIncomplete
                                                                    ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30 ring-1 ring-rose-400"
                                                                    : "bg-slate-900 text-slate-400 border-slate-750 hover:bg-slate-800 hover:text-slate-200"
                                                            }`}
                                                        >
                                                            <span>{isExplicitIncomplete ? "✕" : ""}</span>
                                                            <span>NO</span>
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-850/40">
                                                        <span className="text-slate-400 font-semibold text-[10px]">Status:</span>
                                                        <span className={`font-black uppercase tracking-wider text-[11px] px-2 py-0.5 rounded ${
                                                            isCompleted 
                                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                                                : isExplicitIncomplete
                                                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                                    : "bg-slate-800/80 text-slate-400 border border-slate-700/60"
                                                        }`}>
                                                            {currentDeliveryStatus}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. PRACTICALS SUBTAB */}
                        {detailTab === "practicals" && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lab Practicals Schedule Grid</h4>
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                                        Conducted: {activeSubject.practicalsConducted} / {activeSubject.practicalsPlanned}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(activeSubject.practicals || []).map((prac, idx) => (
                                        <div 
                                            key={prac._id}
                                            className={`p-4 rounded-xl border flex flex-col justify-between ${prac.status === "completed" ? "bg-slate-950/20 border-emerald-500/20" : "bg-slate-950/40 border-slate-850"}`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                    <span>Experiment {idx + 1}</span>
                                                    <span className={`px-2 py-0.5 rounded ${prac.status === "completed" ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                                        {prac.status}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-200 leading-snug">
                                                    {prac.status === "completed" && prac.conductedTopic ? prac.conductedTopic : `Batch ${prac.batch} Lab Experiment`}
                                                </span>
                                                {prac.status === "completed" && (
                                                    <p className="text-[9px] text-slate-500 mt-1">Scheduled Batch: {prac.batch}</p>
                                                )}
                                                <p className="text-[9px] text-slate-500 mt-2">Planned: {prac.plannedDate}</p>
                                                {prac.conductedDate && (
                                                    <p className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                                                        Conducted: {prac.conductedDate}
                                                    </p>
                                                )}
                                                {currentUser.role === "Faculty" && prac.status !== "completed" && (
                                                    <input
                                                        type="text"
                                                        id={`topic-input-${prac._id}`}
                                                        placeholder="Which topic did you conduct?"
                                                        className="w-full text-[10px] bg-slate-900 border border-slate-800 rounded px-2 py-1.5 mt-2 focus:outline-none focus:border-indigo-500 text-slate-200"
                                                    />
                                                )}
                                            </div>

                                            {currentUser.role === "Faculty" && (
                                                <button
                                                    onClick={() => togglePracticalConduct(prac._id, prac.status)}
                                                    className={`mt-4 w-full py-1.5 text-[10px] font-semibold rounded-lg transition-all border ${prac.status === "completed" ? "bg-rose-500/10 text-rose-450 border-rose-500/20 hover:bg-rose-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"}`}
                                                >
                                                    {prac.status === "completed" ? "Mark Uncompleted" : "Log Conducted Lab"}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* 3. TEACHING PLAN SUBTAB */}
                        {detailTab === "plan" && (
                            <div className="space-y-6 text-xs text-slate-300">
                                {/* Navigation Sub-toggles */}
                                <div className="flex border-b border-slate-805/60">
                                    <button
                                        type="button"
                                        onClick={() => setPlanSubTab("weekly")}
                                        className={`px-4 py-2 text-[10px] font-bold uppercase transition-all border-b-2 ${planSubTab === "weekly" ? "border-indigo-500 text-indigo-400 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                                    >
                                        📅 Weekly Syllabus Plan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPlanSubTab("lectures")}
                                        className={`px-4 py-2 text-[10px] font-bold uppercase transition-all border-b-2 ${planSubTab === "lectures" ? "border-indigo-500 text-indigo-400 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                                    >
                                        📖 Lecture Topics Setup
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
                                    {planSubTab === "weekly" ? (
                                        <>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Syllabus Planner Targets</h4>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Toggle modes and configure topic dates milestones</p>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
                                                    className="px-3.5 py-1.5 font-bold uppercase rounded-lg border border-slate-800 bg-slate-950 text-indigo-400 text-[10px]"
                                                >
                                                    {viewMode === "list" ? "📅 Calendar View" : "📋 List View"}
                                                </button>

                                                {currentUser.role === "Faculty" && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={handleAddWeek}
                                                            className="px-3.5 py-1.5 font-bold uppercase rounded-lg border border-slate-800 bg-slate-950 text-emerald-400 text-[10px]"
                                                        >
                                                            + Add Week
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleDeleteWeek}
                                                            className="px-3.5 py-1.5 font-bold uppercase rounded-lg border border-slate-800 bg-slate-950 text-rose-400 text-[10px]"
                                                        >
                                                            - Delete Week
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveFullTeachingPlan}
                                                            className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow text-[10px]"
                                                        >
                                                            Save Planner
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lecture-wise Planned Topics</h4>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Specify real syllabus topics and scheduled dates for all lectures</p>
                                            </div>
                                            
                                            <div>
                                                {currentUser.role === "Faculty" && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveFullLecturesPlan}
                                                        className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow text-[10px]"
                                                    >
                                                        Save Lectures Plan
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {planSubTab === "weekly" ? (
                                    viewMode === "list" ? (
                                        <div className="overflow-x-auto border border-slate-855 rounded-xl">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                                <thead>
                                                    <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase bg-slate-950/20">
                                                        <th className="py-2.5 px-3 w-16 text-center">Week</th>
                                                        <th className="py-2.5 px-3">Syllabus Topic Targets</th>
                                                        <th className="py-2.5 px-3 w-28">Planned Date</th>
                                                        <th className="py-2.5 px-3 w-28">Conducted Date</th>
                                                        <th className="py-2.5 px-3">Remarks</th>
                                                        <th className="py-2.5 px-3 w-28 text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-850/40">
                                                    {teachingPlanEditable.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="py-6 text-center italic text-slate-500">No planner weeks defined.</td>
                                                        </tr>
                                                    ) : (
                                                        teachingPlanEditable.map((weekItem, index) => (
                                                            <tr key={index} className="hover:bg-slate-800/10 transition-colors">
                                                                <td className="py-2 px-3 text-center font-bold text-indigo-400">W{weekItem.week}</td>
                                                                <td className="py-2 px-2">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                                                                        value={weekItem.topic}
                                                                        onChange={(e) => handleWeekChange(index, "topic", e.target.value)}
                                                                        disabled={currentUser.role !== "Faculty"}
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <input
                                                                        type="date"
                                                                        className="w-full bg-slate-900 border border-slate-855 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none"
                                                                        value={weekItem.plannedDate ? weekItem.plannedDate.split("T")[0] : ""}
                                                                        onChange={(e) => handleWeekChange(index, "plannedDate", e.target.value)}
                                                                        disabled={currentUser.role !== "Faculty"}
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <input
                                                                        type="date"
                                                                        className="w-full bg-slate-900 border border-slate-855 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none"
                                                                        value={weekItem.conductedDate ? weekItem.conductedDate.split("T")[0] : ""}
                                                                        onChange={(e) => handleWeekChange(index, "conductedDate", e.target.value)}
                                                                        disabled={currentUser.role !== "Faculty"}
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-slate-900 border border-slate-855 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                                                                        placeholder="e.g. Conducted extra class"
                                                                        value={weekItem.remarks || ""}
                                                                        onChange={(e) => handleWeekChange(index, "remarks", e.target.value)}
                                                                        disabled={currentUser.role !== "Faculty"}
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-3 text-right">
                                                                    <select
                                                                        className="text-xs text-slate-255 bg-slate-900 border border-slate-855 rounded px-2 py-1 focus:outline-none"
                                                                        value={weekItem.status}
                                                                        onChange={(e) => handleWeekChange(index, "status", e.target.value)}
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
                                    ) : (
                                        <div className="bg-slate-950/20 border border-slate-855 p-5 rounded-2xl">
                                            <div className="mb-4">
                                                <strong className="text-xs text-slate-200">Academic Calendar View</strong>
                                                <p className="text-[10px] text-slate-500">Days showing scheduled weeks outline benchmarks</p>
                                            </div>
                                            <div className="grid grid-cols-7 gap-2.5 text-center">
                                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                                    <span key={day} className="text-[10px] font-bold text-slate-500 uppercase">{day}</span>
                                                ))}
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                                                    const matches = teachingPlanEditable.filter(tp => {
                                                        if (!tp.plannedDate) return false;
                                                        const dateDay = new Date(tp.plannedDate).getDate();
                                                        return dateDay === day;
                                                    });
                                                    return (
                                                        <div key={day} className={`p-2 rounded-xl border flex flex-col justify-between items-center min-h-[55px] ${matches.length > 0 ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400" : "bg-slate-950/20 border-slate-850 text-slate-400"}`}>
                                                            <span className="text-[10px] font-bold block">{day}</span>
                                                            {matches.map(m => (
                                                                <span key={m._id || m.week} className="text-[8px] truncate max-w-full font-semibold uppercase bg-indigo-650 text-white rounded px-1 mt-1">
                                                                    W{m.week}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    /* LECTURES PLANNER SUBTAB */
                                    <div className="overflow-x-auto border border-slate-855 rounded-xl">
                                        <table className="w-full text-left border-collapse text-[11px]">
                                            <thead>
                                                <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase bg-slate-950/20">
                                                    <th className="py-2.5 px-3 w-28 text-center">Lecture No.</th>
                                                    <th className="py-2.5 px-3">Planned Lecture Topic (from Syllabus)</th>
                                                    <th className="py-2.5 px-3 w-40">Planned Date</th>
                                                    <th className="py-2.5 px-3 w-40">Conducted Date</th>
                                                    <th className="py-2.5 px-3 w-28 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-850/40">
                                                {lecturesPlanEditable.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-6 center italic text-slate-500">No lectures registered. Add lectures first.</td>
                                                    </tr>
                                                ) : (
                                                    lecturesPlanEditable.map((lecItem, index) => (
                                                        <tr key={index} className="hover:bg-slate-800/10 transition-colors">
                                                            <td className="py-2 px-3 text-center font-bold text-indigo-400">Lecture {index + 1}</td>
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                                                                    placeholder="e.g. Database Normalization 1NF, 2NF..."
                                                                    value={lecItem.topic || ""}
                                                                    onChange={(e) => handleLecturePlanChange(index, "topic", e.target.value)}
                                                                    disabled={currentUser.role !== "Faculty" || lecItem.status === "completed"}
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    type="date"
                                                                    className="w-full bg-slate-900 border border-slate-855 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none"
                                                                    value={lecItem.plannedDate ? lecItem.plannedDate.split("T")[0] : ""}
                                                                    onChange={(e) => handleLecturePlanChange(index, "plannedDate", e.target.value)}
                                                                    disabled={currentUser.role !== "Faculty" || lecItem.status === "completed"}
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2 text-slate-450 font-mono text-center">
                                                                {lecItem.conductedDate || "-"}
                                                            </td>
                                                            <td className="py-2 px-3 text-right">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${lecItem.status === "completed" ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                                                    {lecItem.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}



                        {/* 4. STUDENTS SUBTAB */}
                        {detailTab === "students" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Students ({activeSubject.students?.length || 0})</h4>
                                    
                                    {currentUser.role === "Faculty" && (
                                        <button
                                            onClick={() => setShowCsvImporter(!showCsvImporter)}
                                            className="px-3.5 py-1.5 text-[10px] font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-lg transition-all"
                                        >
                                            {showCsvImporter ? "Close Importer" : "Bulk Import CSV"}
                                        </button>
                                    )}
                                </div>

                                {/* CSV Pasting Area */}
                                {showCsvImporter && currentUser.role === "Faculty" && (
                                    <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paste CSV Records</label>
                                        <textarea
                                            rows="4"
                                            className="w-full font-mono text-xs placeholder-slate-655"
                                            value={csvInput}
                                            onChange={(e) => setCsvInput(e.target.value)}
                                            placeholder={`rollNo,name\n2026CS01,Pratik Tekale\n2026CS02,Ramesh Sunder`}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setShowCsvImporter(false)}
                                                className="px-3 py-1.5 text-[10px] text-slate-400"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCsvImport}
                                                className="px-4 py-1.5 text-[10px] font-semibold text-white bg-emerald-650 hover:bg-emerald-600 rounded-lg shadow-lg"
                                            >
                                                Import CSV Roster
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Roster List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(activeSubject.students || []).map((student) => (
                                        <div key={student._id} className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-200">{student.name}</span>
                                                    <span className="text-[9px] font-mono text-slate-500">{student.rollNo}</span>
                                                </div>

                                                <div className="space-y-1 mt-3 text-[10px]">
                                                    <p className="text-slate-400"><strong className="text-slate-500">PRN Number:</strong> <span className="font-mono text-indigo-400 font-bold">{student.prnNumber}</span></p>
                                                    <p className="text-slate-400"><strong className="text-slate-500">Mobile Number:</strong> {student.mobileNumber || "Unset"}</p>
                                                    <p className="text-slate-400"><strong className="text-slate-500">Skills:</strong> {student.skills || "Unset"}</p>
                                                    
                                                    {student.customFields && Object.entries(student.customFields).map(([k, v]) => (
                                                        <p key={k} className="text-slate-450"><strong className="text-slate-500">{k}:</strong> {v}</p>
                                                    ))}
                                                </div>
                                            </div>

                                            {currentUser.role === "Faculty" && (
                                                <button
                                                    onClick={() => openStudentEditor(student)}
                                                    className="mt-4 w-full py-1 text-[10px] font-semibold bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/60"
                                                >
                                                    Edit Attributes
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                            </>
                        )
                    }
                    </div>
                </div>
            )}

            {/* ================= STUDENT ATTRIBUTES MODAL EDITOR ================= */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden animate-fade-in space-y-4">
                        <h4 className="text-xs font-bold text-slate-200">Custom Attributes: {selectedStudent.name}</h4>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PRN Number *</label>
                            <input
                                type="text"
                                value={studentAttr.prnNumber}
                                onChange={(e) => setStudentAttr({ ...studentAttr, prnNumber: e.target.value })}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                            <input
                                type="text"
                                value={studentAttr.mobileNumber}
                                onChange={(e) => setStudentAttr({ ...studentAttr, mobileNumber: e.target.value })}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Skills</label>
                            <input
                                type="text"
                                value={studentAttr.skills}
                                onChange={(e) => setStudentAttr({ ...studentAttr, skills: e.target.value })}
                                placeholder="JavaScript, CSS, DBMS"
                            />
                        </div>

                        {/* Add Custom Fields list */}
                        <div className="border-t border-slate-800/80 pt-4 mt-4 space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Add Custom Field</label>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={studentAttr.customKey}
                                    onChange={(e) => setStudentAttr({ ...studentAttr, customKey: e.target.value })}
                                    placeholder="Attribute Name"
                                    className="px-2.5 py-1.5"
                                />
                                <input
                                    type="text"
                                    value={studentAttr.customValue}
                                    onChange={(e) => setStudentAttr({ ...studentAttr, customValue: e.target.value })}
                                    placeholder="Value"
                                    className="px-2.5 py-1.5"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={addCustomField}
                                className="w-full py-1.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded"
                            >
                                + Add Field Key-Value
                            </button>

                            {/* Custom fields checklist rendering */}
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {Object.entries(studentAttr.customFields).map(([key, val]) => (
                                    <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-850 flex items-center gap-1.5 text-slate-350">
                                        <strong>{key}:</strong> {val}
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const copy = { ...studentAttr.customFields };
                                                delete copy[key];
                                                setStudentAttr({ ...studentAttr, customFields: copy });
                                            }}
                                            className="text-rose-400 font-bold"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                            <button
                                type="button"
                                onClick={() => setSelectedStudent(null)}
                                className="px-3.5 py-2 text-xs text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveStudentAttributes}
                                className="px-4.5 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl"
                            >
                                Save Attributes
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default GreenBookPanel;
