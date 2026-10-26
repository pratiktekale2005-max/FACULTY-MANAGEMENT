import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../services/api";

const ACTIVITY_TYPES = [
    "Regular Lecture",
    "Practical",
    "Tutorial",
    "Unit Test",
    "Internal Examination",
    "Final / End-Semester Examination",
    "Other Academic Activity"
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:15 AM", "11:30 AM", "12:00 PM", "12:15 PM", "12:30 PM",
    "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:15 PM",
    "03:30 PM", "04:00 PM", "04:15 PM", "04:30 PM", "05:00 PM", "05:30 PM"
];

function TimetablePanel({ currentUser }) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDayFilter, setSelectedDayFilter] = useState("all");
    const [selectedActivityFilter, setSelectedActivityFilter] = useState("all");
    const [viewMode, setViewMode] = useState("all"); // "all", "today", "exams", "image"

    // Notifications
    const [msg, setMsg] = useState("");
    const [errMsg, setErrMsg] = useState("");

    // Entry Form state (Add or Edit) - positioned near top of timetable content
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState(null); // null = add, string = edit
    const [submitting, setSubmitting] = useState(false);
    const formRef = useRef(null);

    // Timetable Image State (Requirement 8)
    const [timetableImage, setTimetableImage] = useState(null);
    const [showUploadImageModal, setShowUploadImageModal] = useState(false);
    const [imageFilePreview, setImageFilePreview] = useState("");
    const [imageTitle, setImageTitle] = useState("Master Department Timetable");
    const [imageSemester, setImageSemester] = useState("Even Semester");
    const [imageAcademicYear, setImageAcademicYear] = useState("2026-2027");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [enlargedImage, setEnlargedImage] = useState(null);

    const initialFormState = {
        date: new Date().toISOString().split("T")[0],
        dayOfWeek: "Monday",
        startTime: "09:00 AM",
        endTime: "10:00 AM",
        department: currentUser.department || "Computer Science & Engineering",
        year: "TE (TY)",
        division: "A",
        subjectName: "",
        subjectCode: "",
        activityType: "Regular Lecture",
        roomOrLab: "Classroom LH-301",
        status: "Scheduled"
    };

    const [form, setForm] = useState(initialFormState);

    // Get current day name
    const todayIndex = new Date().getDay();
    const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayName = daysList[todayIndex];

    const loadTimetable = async () => {
        setLoading(true);
        try {
            const data = await api.get("/timetable");
            if (data && data.slots) {
                setSlots(data.slots);
            }
        } catch (err) {
            console.error("Failed to load timetable:", err);
            setErrMsg("Failed to load timetable schedule ❌");
        } finally {
            setLoading(false);
        }
    };

    // Load Master Timetable Image (Requirement 8)
    const loadTimetableImage = async () => {
        try {
            const data = await api.get("/timetable/image");
            if (data && data.image) {
                setTimetableImage(data.image);
            } else {
                setTimetableImage(null);
            }
        } catch (err) {
            console.error("Failed to load timetable image:", err);
        }
    };

    useEffect(() => {
        loadTimetable();
        loadTimetableImage();
    }, [currentUser]);

    // Handle date change in form: auto-set Day of Week
    const handleDateChange = (dateVal) => {
        if (!dateVal) {
            setForm(prev => ({ ...prev, date: "" }));
            return;
        }
        const d = new Date(dateVal);
        const dayName = daysList[d.getDay()];
        setForm(prev => ({
            ...prev,
            date: dateVal,
            dayOfWeek: dayName || prev.dayOfWeek
        }));
    };

    // Open Add Form (Smoothly positioned at top of content per Req 7)
    const handleOpenAdd = () => {
        setEditingSlotId(null);
        setForm({
            ...initialFormState,
            date: new Date().toISOString().split("T")[0],
            dayOfWeek: currentDayName === "Sunday" ? "Monday" : currentDayName,
            department: currentUser.department || "Computer Science & Engineering"
        });
        setErrMsg("");
        setMsg("");
        setShowEntryForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
    };

    // Open Edit Form (Smoothly positioned at top of content per Req 7)
    const handleOpenEdit = (slot) => {
        setEditingSlotId(slot._id);
        setForm({
            date: slot.date || "",
            dayOfWeek: slot.dayOfWeek || "Monday",
            startTime: slot.startTime || "09:00 AM",
            endTime: slot.endTime || "10:00 AM",
            department: slot.department || currentUser.department || "",
            year: slot.year || "TE (TY)",
            division: slot.division || "A",
            subjectName: slot.subjectName || "",
            subjectCode: slot.subjectCode || "",
            activityType: slot.activityType || "Regular Lecture",
            roomOrLab: slot.roomOrLab || "LH-301",
            status: slot.status || "Scheduled"
        });
        setErrMsg("");
        setMsg("");
        setShowEntryForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
    };

    // Submit Add or Edit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subjectName.trim() || !form.roomOrLab.trim()) {
            setErrMsg("Subject / Exam Name and Classroom / Laboratory are required! ❌");
            return;
        }

        setSubmitting(true);
        setErrMsg("");
        setMsg("");

        try {
            if (editingSlotId) {
                // Update
                const res = await api.put(`/timetable/${editingSlotId}`, form);
                setMsg(res.message || "Timetable entry updated successfully! ✅");
            } else {
                // Create
                const res = await api.post("/timetable", form);
                setMsg(res.message || "Timetable entry created successfully! ✅");
            }

            setShowEntryForm(false);
            await loadTimetable();
            setTimeout(() => setMsg(""), 5000);
        } catch (err) {
            console.error("Save timetable error:", err);
            setErrMsg(err.response?.data?.error || err.message || "Failed to save timetable entry ❌");
        } finally {
            setSubmitting(false);
        }
    };

    // Delete Slot
    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}" from the timetable? 🗑️`)) return;
        try {
            await api.delete(`/timetable/${id}`);
            setMsg("Timetable entry deleted successfully ✅");
            loadTimetable();
            setTimeout(() => setMsg(""), 4000);
        } catch (err) {
            setErrMsg(err.response?.data?.error || "Failed to delete entry ❌");
        }
    };

    // Handle Timetable Image File Selection
    const handleImageFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSizeBytes = 5 * 1024 * 1024;
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

        if (!validTypes.includes(file.type.toLowerCase())) {
            alert(`"${file.name}" is not a supported format. Please upload JPG, JPEG, PNG, or WEBP.`);
            return;
        }
        if (file.size > maxSizeBytes) {
            alert(`"${file.name}" exceeds the 5MB size limit.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Save / Upload Timetable Image
    const handleSaveTimetableImage = async (e) => {
        e.preventDefault();
        if (!imageFilePreview) {
            alert("Please select a timetable image first! ❌");
            return;
        }

        setUploadingImage(true);
        try {
            const res = await api.post("/timetable/image", {
                imageBase64: imageFilePreview,
                title: imageTitle.trim() || "Master Department Timetable",
                department: currentUser.department || "Computer Science & Engineering",
                academicYear: imageAcademicYear,
                semester: imageSemester
            });
            setMsg(res.message || "Timetable image saved successfully! 🖼️✅");
            setShowUploadImageModal(false);
            setImageFilePreview("");
            await loadTimetableImage();
            setTimeout(() => setMsg(""), 5000);
        } catch (err) {
            console.error("Upload timetable image error:", err);
            alert(err.response?.data?.error || err.message || "Failed to upload timetable image ❌");
        } finally {
            setUploadingImage(false);
        }
    };

    // Delete Timetable Image
    const handleDeleteTimetableImage = async () => {
        if (!timetableImage) return;
        if (!window.confirm("Are you sure you want to delete the uploaded timetable image? 🗑️")) return;

        try {
            await api.delete(`/timetable/image/${timetableImage._id}`);
            setMsg("Timetable image deleted successfully! 🗑️✅");
            setTimetableImage(null);
            setTimeout(() => setMsg(""), 4000);
        } catch (err) {
            console.error("Delete image error:", err);
            alert(err.response?.data?.error || err.message || "Failed to delete timetable image ❌");
        }
    };

    // Filtered slots
    const filteredSlots = useMemo(() => {
        return slots.filter(s => {
            // View Mode
            if (viewMode === "today") {
                if (s.dayOfWeek.toLowerCase() !== currentDayName.toLowerCase()) return false;
            } else if (viewMode === "exams") {
                const isExam = ["Unit Test", "Internal Examination", "Final / End-Semester Examination"].includes(s.activityType);
                if (!isExam) return false;
            }

            // Day filter
            if (selectedDayFilter !== "all" && s.dayOfWeek !== selectedDayFilter) {
                return false;
            }

            // Activity filter
            if (selectedActivityFilter !== "all" && s.activityType !== selectedActivityFilter) {
                return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matches = 
                    (s.subjectName && s.subjectName.toLowerCase().includes(q)) ||
                    (s.subjectCode && s.subjectCode.toLowerCase().includes(q)) ||
                    (s.roomOrLab && s.roomOrLab.toLowerCase().includes(q)) ||
                    (s.department && s.department.toLowerCase().includes(q)) ||
                    (s.activityType && s.activityType.toLowerCase().includes(q)) ||
                    (s.division && s.division.toLowerCase().includes(q));
                if (!matches) return false;
            }

            return true;
        });
    }, [slots, viewMode, selectedDayFilter, selectedActivityFilter, searchQuery, currentDayName]);

    // Summary KPIs
    const stats = useMemo(() => {
        const total = slots.length;
        const exams = slots.filter(s => ["Unit Test", "Internal Examination", "Final / End-Semester Examination"].includes(s.activityType)).length;
        const lectures = slots.filter(s => s.activityType === "Regular Lecture").length;
        const todayCount = slots.filter(s => s.dayOfWeek.toLowerCase() === currentDayName.toLowerCase()).length;
        return { total, exams, lectures, todayCount };
    }, [slots, currentDayName]);

    // Activity badge helper
    const getActivityBadge = (type) => {
        switch (type) {
            case "Regular Lecture":
                return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
            case "Practical":
                return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
            case "Tutorial":
                return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            case "Unit Test":
                return "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold";
            case "Internal Examination":
                return "bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold";
            case "Final / End-Semester Examination":
                return "bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold";
            default:
                return "bg-slate-800 text-slate-300 border border-slate-700";
        }
    };

    // Status badge helper
    const getStatusBadge = (status) => {
        switch (status) {
            case "Scheduled":
                return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
            case "Ongoing":
                return "bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse";
            case "Completed":
                return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            case "Cancelled":
                return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
            default:
                return "bg-slate-800 text-slate-400";
        }
    };

    return (
        <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
            {/* Header section with Add Timetable Entry & Upload Image buttons */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📅</span> Faculty Timetable &amp; Examination Schedule
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Weekly teaching schedules, practical labs, unit tests, and master timetable charts in one unified portal.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Requirement 7: Clearly visible Add Timetable Entry button */}
                    <button
                        onClick={handleOpenAdd}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                        <span>➕</span> Add Timetable Entry
                    </button>

                    {/* Requirement 8: Upload Timetable Image button */}
                    <button
                        onClick={() => {
                            setImageFilePreview(timetableImage?.imageUrl || "");
                            setImageTitle(timetableImage?.title || "Master Department Timetable");
                            setImageSemester(timetableImage?.semester || "Even Semester");
                            setImageAcademicYear(timetableImage?.academicYear || "2026-2027");
                            setShowUploadImageModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                    >
                        <span>📷</span> {timetableImage ? "Replace Timetable Image" : "Upload Timetable Image"}
                    </button>

                    <button
                        onClick={() => {
                            loadTimetable();
                            loadTimetableImage();
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="Refresh Schedule"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Success & Error alerts */}
            {msg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center justify-between animate-fade-in">
                    <span>{msg}</span>
                    <button onClick={() => setMsg("")} className="font-bold cursor-pointer">✕</button>
                </div>
            )}
            {errMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between animate-fade-in">
                    <span>{errMsg}</span>
                    <button onClick={() => setErrMsg("")} className="font-bold cursor-pointer">✕</button>
                </div>
            )}

            {/* ================= REQUIREMENT 7: ADD / EDIT TIMETABLE ENTRY FORM POSITIONED PROMINENTLY NEAR THE TOP ================= */}
            {showEntryForm && (
                <div 
                    ref={formRef}
                    id="timetable-entry-form-container"
                    className="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-up"
                >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-sm font-bold">
                                {editingSlotId ? "✏️" : "➕"}
                            </span>
                            <div>
                                <h3 className="text-base font-bold text-white">
                                    {editingSlotId ? "Edit Timetable Entry" : "Create New Timetable Entry"}
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Configure academic slot details, assigned room, and class timing.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowEntryForm(false)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                            ✕ Close
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                        {/* Activity Type Selector */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Activity Type *
                            </label>
                            <select
                                value={form.activityType}
                                onChange={(e) => setForm(prev => ({ ...prev, activityType: e.target.value }))}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                            >
                                {ACTIVITY_TYPES.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subject / Exam Name & Code */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Subject / Exam Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Data Structures & Algorithms or Unit Test 1"
                                    value={form.subjectName}
                                    onChange={(e) => setForm(prev => ({ ...prev, subjectName: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Subject Code
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. CS-301"
                                    value={form.subjectCode}
                                    onChange={(e) => setForm(prev => ({ ...prev, subjectCode: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                                />
                            </div>
                        </div>

                        {/* Date & Day of Week */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Date (For Exam / Dated Session)
                                </label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Day of the Week *
                                </label>
                                <select
                                    value={form.dayOfWeek}
                                    onChange={(e) => setForm(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                >
                                    {DAYS_OF_WEEK.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Start Time & End Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Start Time *
                                </label>
                                <select
                                    value={form.startTime}
                                    onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                                >
                                    {TIME_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    End Time *
                                </label>
                                <select
                                    value={form.endTime}
                                    onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                                >
                                    {TIME_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Department, Year of Study, Division */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Department *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.department}
                                    onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Year of Study *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. TE (TY) or SE"
                                    value={form.year}
                                    onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Division *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. A"
                                    value={form.division}
                                    onChange={(e) => setForm(prev => ({ ...prev, division: e.target.value.toUpperCase() }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Classroom / Laboratory & Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Classroom / Laboratory *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Classroom LH-301, Lab 204"
                                    value={form.roomOrLab}
                                    onChange={(e) => setForm(prev => ({ ...prev, roomOrLab: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Status *
                                </label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Ongoing">Ongoing</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        {/* Action buttons positioned right here without scrolling */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowEntryForm(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                                {submitting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        <span>Saving Slot...</span>
                                    </>
                                ) : (
                                    <span>{editingSlotId ? "💾 Save Changes" : "➕ Create Entry"}</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Schedules</p>
                    <p className="text-2xl font-bold text-slate-100 mt-1">{stats.total}</p>
                    <span className="text-[10px] text-slate-500">Lectures + Exams</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Regular Lectures</p>
                    <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.lectures}</p>
                    <span className="text-[10px] text-slate-500">Weekly teaching slots</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Unit Tests &amp; Exams</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{stats.exams}</p>
                    <span className="text-[10px] text-slate-500">Scheduled examinations</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Today's Sessions</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.todayCount}</p>
                    <span className="text-[10px] text-slate-500">{currentDayName} schedule</span>
                </div>
            </div>

            {/* ================= REQUIREMENT 8: MASTER TIMETABLE IMAGE SECTION ================= */}
            {timetableImage && (
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-lg">🖼️</span>
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>{timetableImage.title || "Master Timetable Chart"}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        {timetableImage.semester || "Current Sem"} • {timetableImage.academicYear || "2026-2027"}
                                    </span>
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Uploaded by <span className="text-slate-200 font-semibold">{timetableImage.uploadedByName || "Faculty"}</span> on {timetableImage.uploadedAt ? new Date(timetableImage.uploadedAt).toLocaleDateString() : "recently"}.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setEnlargedImage(timetableImage.imageUrl)}
                                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                            >
                                <span>🔍</span> View Full Chart
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setImageFilePreview(timetableImage.imageUrl);
                                    setImageTitle(timetableImage.title);
                                    setImageSemester(timetableImage.semester);
                                    setImageAcademicYear(timetableImage.academicYear);
                                    setShowUploadImageModal(true);
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                            >
                                <span>🔄</span> Replace
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteTimetableImage}
                                className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
                                title="Delete Chart Image"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>

                    <div 
                        onClick={() => setEnlargedImage(timetableImage.imageUrl)}
                        className="relative group rounded-xl overflow-hidden border border-slate-800 cursor-pointer max-h-64 bg-slate-950 flex items-center justify-center"
                    >
                        <img 
                            src={timetableImage.imageUrl} 
                            alt="Master Timetable Chart"
                            className="max-h-64 w-auto object-contain transition duration-300 group-hover:scale-[1.01]" 
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <span className="px-4 py-2 bg-slate-900/90 text-white rounded-xl text-xs font-bold border border-slate-700 shadow-xl flex items-center gap-2">
                                <span>🔍 Click to View Full Size</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls Bar: Search, Filters & View Mode */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* View mode toggle */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                        <button
                            onClick={() => setViewMode("all")}
                            className={`px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                                viewMode === "all" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            📅 All Schedule
                        </button>
                        <button
                            onClick={() => setViewMode("today")}
                            className={`px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                                viewMode === "today" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            ⚡ Today ({currentDayName})
                        </button>
                        <button
                            onClick={() => setViewMode("exams")}
                            className={`px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                                viewMode === "exams" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            📝 Unit Tests &amp; Exams
                        </button>
                    </div>

                    {/* Search and Dropdown filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-60">
                            <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                            <input
                                type="text"
                                placeholder="Search subject, room, exam..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        {/* Day filter */}
                        <select
                            value={selectedDayFilter}
                            onChange={(e) => setSelectedDayFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Days</option>
                            {DAYS_OF_WEEK.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>

                        {/* Activity Type filter */}
                        <select
                            value={selectedActivityFilter}
                            onChange={(e) => setSelectedActivityFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Activity Types</option>
                            {ACTIVITY_TYPES.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table: Exact 12 columns */}
                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Loading timetable records...
                    </div>
                ) : filteredSlots.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        No timetable entries match your filter. Click <strong className="text-indigo-400">"Add Timetable Entry"</strong> above to schedule a new lecture or examination.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-3.5 whitespace-nowrap">1. Date</th>
                                    <th className="py-3 px-3.5 whitespace-nowrap">2. Day</th>
                                    <th className="py-3 px-3 whitespace-nowrap">3. Start Time</th>
                                    <th className="py-3 px-3 whitespace-nowrap">4. End Time</th>
                                    <th className="py-3 px-3.5 whitespace-nowrap">5. Department</th>
                                    <th className="py-3 px-3 whitespace-nowrap">6. Year of Study</th>
                                    <th className="py-3 px-3 text-center whitespace-nowrap">7. Division</th>
                                    <th className="py-3 px-4 min-w-[200px]">8. Subject / Exam Name</th>
                                    <th className="py-3 px-3.5 whitespace-nowrap">9. Activity Type</th>
                                    <th className="py-3 px-3.5 whitespace-nowrap">10. Classroom / Laboratory</th>
                                    <th className="py-3 px-3 text-center whitespace-nowrap">11. Status</th>
                                    <th className="py-3 px-3 text-center whitespace-nowrap">12. Edit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredSlots.map((slot) => {
                                    const isExam = ["Unit Test", "Internal Examination", "Final / End-Semester Examination"].includes(slot.activityType);

                                    return (
                                        <tr 
                                            key={slot._id} 
                                            className={`transition hover:bg-slate-850/50 ${
                                                isExam ? "bg-amber-950/10" : ""
                                            }`}
                                        >
                                            {/* 1. Date */}
                                            <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                                                {slot.date ? slot.date : "Weekly"}
                                            </td>

                                            {/* 2. Day */}
                                            <td className="py-3 px-3.5 font-medium text-slate-200 whitespace-nowrap">
                                                {slot.dayOfWeek}
                                            </td>

                                            {/* 3. Start Time */}
                                            <td className="py-3 px-3 font-mono font-semibold text-indigo-400 whitespace-nowrap">
                                                {slot.startTime}
                                            </td>

                                            {/* 4. End Time */}
                                            <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                                                {slot.endTime}
                                            </td>

                                            {/* 5. Department */}
                                            <td className="py-3 px-3.5 text-slate-300 max-w-[140px] truncate" title={slot.department}>
                                                {slot.department}
                                            </td>

                                            {/* 6. Year of Study */}
                                            <td className="py-3 px-3 font-medium text-slate-300 whitespace-nowrap">
                                                {slot.year}
                                            </td>

                                            {/* 7. Division */}
                                            <td className="py-3 px-3 text-center font-bold text-slate-200">
                                                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                                                    Div {slot.division}
                                                </span>
                                            </td>

                                            {/* 8. Subject / Exam Name */}
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                                    {isExam && <span>📝</span>}
                                                    <span>{slot.subjectName}</span>
                                                </div>
                                                {slot.subjectCode && (
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        Code: {slot.subjectCode}
                                                    </span>
                                                )}
                                            </td>

                                            {/* 9. Activity Type */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium ${getActivityBadge(slot.activityType)}`}>
                                                    {slot.activityType || "Regular Lecture"}
                                                </span>
                                            </td>

                                            {/* 10. Classroom / Laboratory */}
                                            <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                                                🏛️ {slot.roomOrLab}
                                            </td>

                                            {/* 11. Status */}
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(slot.status)}`}>
                                                    {slot.status || "Scheduled"}
                                                </span>
                                            </td>

                                            {/* 12. Edit action button */}
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(slot)}
                                                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                                                        title="Edit Timetable Entry"
                                                    >
                                                        <span>✏️</span> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(slot._id, slot.subjectName)}
                                                        className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                                                        title="Delete Entry"
                                                    >
                                                        🗑️
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
            </div>

            {/* ================= REQUIREMENT 8: UPLOAD / REPLACE TIMETABLE IMAGE MODAL ================= */}
            {showUploadImageModal && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>📷</span> {timetableImage ? "Replace Master Timetable Image" : "Upload Master Timetable Image"}
                            </h3>
                            <button 
                                onClick={() => setShowUploadImageModal(false)} 
                                className="text-slate-400 hover:text-white cursor-pointer font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveTimetableImage} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Timetable Title / Label *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={imageTitle}
                                    onChange={(e) => setImageTitle(e.target.value)}
                                    placeholder="e.g. Master Timetable - CSE Even Sem 2026-2027"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                        Academic Year
                                    </label>
                                    <input
                                        type="text"
                                        value={imageAcademicYear}
                                        onChange={(e) => setImageAcademicYear(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                        Semester Term
                                    </label>
                                    <input
                                        type="text"
                                        value={imageSemester}
                                        onChange={(e) => setImageSemester(e.target.value)}
                                        placeholder="Even Semester"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Select Timetable Image File (JPG, PNG, WEBP, max 5MB) *
                                </label>
                                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 bg-slate-950/60 text-center">
                                    <input
                                        type="file"
                                        id="timetableImageFileInput"
                                        accept="image/jpeg,image/png,image/webp,image/jpg"
                                        className="hidden"
                                        onChange={handleImageFileChange}
                                    />
                                    <label htmlFor="timetableImageFileInput" className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold flex flex-col items-center justify-center gap-1">
                                        <span className="text-2xl">🖼️</span>
                                        <span>Click to Choose Timetable Image</span>
                                        <span className="text-slate-500 text-[10px]">Supports clear JPG, PNG, WEBP up to 5MB</span>
                                    </label>
                                </div>
                            </div>

                            {/* Image Preview */}
                            {imageFilePreview && (
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Preview Before Saving:
                                    </span>
                                    <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-56 bg-slate-950 flex items-center justify-center">
                                        <img 
                                            src={imageFilePreview} 
                                            alt="Timetable Preview" 
                                            className="max-h-56 w-auto object-contain" 
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadImageModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingImage || !imageFilePreview}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                                >
                                    {uploadingImage ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                            <span>Saving to Database...</span>
                                        </>
                                    ) : (
                                        <span>💾 Persist Timetable Image</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= LIGHTBOX FOR ENLARGED TIMETABLE IMAGE ================= */}
            {enlargedImage && (
                <div 
                    className="fixed inset-0 bg-black/95 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setEnlargedImage(null)}
                >
                    <div className="relative max-w-6xl max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                            <span className="text-white font-bold text-sm">
                                🖼️ {timetableImage?.title || "Master Timetable Chart"}
                            </span>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={enlargedImage} 
                                    download="Master_Timetable.png" 
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                                >
                                    📥 Download
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setEnlargedImage(null)}
                                    className="text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>
                        <img
                            src={enlargedImage}
                            alt="Full Timetable Chart"
                            className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-slate-700"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default TimetablePanel;
