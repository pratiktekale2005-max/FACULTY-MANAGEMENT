import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import WorkshopLetterModal from "./WorkshopLetterModal";

function WorkshopsPanel({ currentUser, refreshTrigger, onRefresh, onSelectFaculty }) {
    const [workshops, setWorkshops] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Letter modal state
    const [letterModalConfig, setLetterModalConfig] = useState({
        isOpen: false,
        workshop: null,
        initialType: "invitation",
        initialStep: "generate"
    });

    // Attendance & Feedback state
    const [activeAttendanceId, setActiveAttendanceId] = useState("");
    const [activeFeedbackId, setActiveFeedbackId] = useState("");
    const [studentsList, setStudentsList] = useState([]);
    const [selectedRolls, setSelectedRolls] = useState([]);
    const [fbName, setFbName] = useState("");
    const [fbRating, setFbRating] = useState(5);
    const [fbComments, setFbComments] = useState("");

    const [editingWorkshopId, setEditingWorkshopId] = useState("");
    
    // Form fields
    const [form, setForm] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        speakerName: "",
        speakerBio: "",
        speakerOrganization: "",
        speakerContact: "",
        guestDesignation: "",
        guestOrganization: "",
        guestEmail: "",
        workshopType: "Arranged by Self",
        speakerResumeBase64: "",
        photosBase64: []
    });

    const resetForm = () => {
        setForm({
            title: "",
            description: "",
            date: "",
            time: "",
            venue: "",
            speakerName: "",
            speakerBio: "",
            speakerOrganization: "",
            speakerContact: "",
            guestDesignation: "",
            guestOrganization: "",
            guestEmail: "",
            workshopType: "Arranged by Self",
            speakerResumeBase64: "",
            photosBase64: []
        });
        setEditingWorkshopId("");
    };

    const validateForm = () => {
        const required = [
            { key: "title", label: "Event Title" },
            { key: "description", label: "Workshop / Seminar Description" },
            { key: "date", label: "Event Date" },
            { key: "time", label: "Event Time / Duration" },
            { key: "speakerName", label: "Guest Professional Name" }
        ];
        for (const field of required) {
            const val = form[field.key];
            if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
                return `${field.label} is required. ❌`;
            }
        }
        return null;
    };

    const loadWorkshops = async () => {
        try {
            const data = await api.get("/workshops");
            setWorkshops(data.workshops || []);
        } catch (err) {
            console.error("Failed to load workshops:", err);
        }
    };

    const loadStudents = async () => {
        try {
            const data = await api.get("/subjects");
            const students = [];
            const rolls = new Set();
            (data.subjects || []).forEach(sub => {
                (sub.students || []).forEach(s => {
                    if (!rolls.has(s.rollNo)) {
                        rolls.add(s.rollNo);
                        students.push(s);
                    }
                });
            });
            setStudentsList(students);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadWorkshops();
        loadStudents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, refreshTrigger]);

    const handleSaveAttendance = async (workshopId) => {
        try {
            await api.put(`/workshops/${workshopId}/attendance`, { studentAttendance: selectedRolls });
            alert("Student attendance sheet logged successfully! ✅");
            setActiveAttendanceId("");
            loadWorkshops();
        } catch (err) {
            alert(err.message || "Failed to save attendance.");
            console.error(err);
        }
    };

    const handleAddWorkshopFeedback = async (workshopId) => {
        if (!fbComments.trim()) return;
        try {
            await api.put(`/workshops/${workshopId}/feedback`, {
                name: fbName,
                rating: fbRating,
                comments: fbComments
            });
            alert("Workshop rating assessment submitted successfully! ✅");
            setFbName("");
            setFbRating(5);
            setFbComments("");
            setActiveFeedbackId("");
            loadWorkshops();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to log feedback.");
        }
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert(`File "${file.name}" is too large! Maximum allowed size is 2MB. ❌`);
            e.target.value = "";
            setForm(prev => ({ ...prev, [field]: "" }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleMultiplePhotosChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        let totalSize = 0;
        for (const file of files) {
            totalSize += file.size;
        }

        if (totalSize > 4 * 1024 * 1024) {
            alert("Combined photos size is too large! Please upload smaller images (Max total 4MB). ❌");
            e.target.value = "";
            return;
        }

        const promises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then(base64Photos => {
            setForm(prev => ({ ...prev, photosBase64: base64Photos }));
        });
    };

    const handleEditClick = (w) => {
        setEditingWorkshopId(w._id);
        setForm({
            title: w.title || "",
            description: w.description || "",
            date: w.date ? new Date(w.date).toISOString().split("T")[0] : "",
            time: w.time || "",
            venue: w.venue || "",
            speakerName: w.speakerName || "",
            speakerBio: w.speakerBio || "",
            speakerOrganization: w.speakerOrganization || "",
            speakerContact: w.speakerContact || "",
            guestDesignation: w.guestDesignation || "",
            guestOrganization: w.guestOrganization || "",
            guestEmail: w.guestEmail || "",
            workshopType: w.workshopType || "Arranged by Self",
            speakerResumeBase64: "",
            photosBase64: []
        });
        setShowAddForm(true);
    };

    const handleDeleteClick = async (id) => {
        const confirmed = window.confirm("Are you sure you want to delete this workshop entry? 🗑️");
        if (!confirmed) return;

        try {
            await api.delete(`/workshops/${id}`);
            alert("Workshop deleted successfully! ✅");
            loadWorkshops();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to delete workshop ❌");
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const valError = validateForm();
        if (valError) {
            alert(valError);
            return;
        }

        setLoading(true);

        try {
            if (editingWorkshopId) {
                await api.put(`/workshops/${editingWorkshopId}`, form);
                alert("Workshop updated successfully! ✅");
            } else {
                await api.post("/workshops", form);
                alert("Workshop registered successfully! Waiting for Principal verification. ✅");
            }
            setShowAddForm(false);
            resetForm();
            loadWorkshops();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to save workshop ❌");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveStatus = async (id, nextStatus) => {
        try {
            await api.put(`/workshops/${id}/status`, {
                status: nextStatus
            });
            alert(`Workshop has been set to: ${nextStatus}! ✅`);
            loadWorkshops();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to update status.");
            console.error(err);
        }
    };

    const openLetterModal = (workshop, type, step) => {
        setLetterModalConfig({
            isOpen: true,
            workshop,
            initialType: type,
            initialStep: step
        });
    };

    const filteredWorkshops = workshops.filter(w => {
        const isSeminar = (w.workshopType && w.workshopType.toLowerCase().includes("seminar")) || (w.title && w.title.toLowerCase().includes("seminar"));
        
        let matchesCategory = true;
        if (filterCategory === "Workshops") {
            matchesCategory = !isSeminar;
        } else if (filterCategory === "Seminars") {
            matchesCategory = isSeminar;
        } else if (filterCategory === "Arranged by Self") {
            matchesCategory = w.workshopType === "Arranged by Self" || w.eventType === "organized";
        } else if (filterCategory === "Attended") {
            matchesCategory = w.workshopType === "Attended" || w.eventType === "attended";
        } else if (filterCategory === "External") {
            matchesCategory = w.workshopType === "External";
        }

        let matchesSearch = true;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            matchesSearch = 
                (w.title && w.title.toLowerCase().includes(q)) ||
                (w.speakerName && w.speakerName.toLowerCase().includes(q)) ||
                (w.speakerOrganization && w.speakerOrganization.toLowerCase().includes(q)) ||
                (w.department && w.department.toLowerCase().includes(q)) ||
                (w.submittedBy?.name && w.submittedBy.name.toLowerCase().includes(q));
        }

        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Letter Workflow Modal */}
            {letterModalConfig.isOpen && letterModalConfig.workshop && (
                <WorkshopLetterModal
                    workshop={letterModalConfig.workshop}
                    initialType={letterModalConfig.initialType}
                    initialStep={letterModalConfig.initialStep}
                    currentUser={currentUser}
                    onClose={() => setLetterModalConfig({ isOpen: false, workshop: null, initialType: "invitation", initialStep: "generate" })}
                    onUpdated={() => loadWorkshops()}
                />
            )}

            {/* ================= HEADER PANEL ================= */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>🎓 Workshops & Seminars Steering</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Manage academic workshops, guest lectures, invitation workflows, camera scan capture, and appreciation letters.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (showAddForm) {
                                resetForm();
                            }
                            setShowAddForm(!showAddForm);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md flex items-center space-x-1.5"
                    >
                        <span>{showAddForm ? "✖ Close Form" : "➕ Create Event / Seminar"}</span>
                    </button>
                </div>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {["All", "Workshops", "Seminars", "Arranged by Self", "Attended", "External"].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg border transition ${
                                filterCategory === cat
                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search title, speaker, organizer..."
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
                </div>
            </div>

            {/* ================= REGISTER EVENT FORM ================= */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>📝</span>
                            <span>{editingWorkshopId ? "Edit Event Details" : "Register New Workshop / Seminar"}</span>
                        </h3>
                        <span className="text-xs text-slate-400">All fields marked with * are required</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Title / Theme *</label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. Workshop on Cloud Architecture & Generative AI"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Category</label>
                            <select
                                value={form.workshopType}
                                onChange={(e) => setForm({ ...form, workshopType: e.target.value })}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="Arranged by Self">Workshop (Self Arranged)</option>
                                <option value="Seminar">Seminar / Guest Lecture</option>
                                <option value="Attended">Attended</option>
                                <option value="External">External Workshop</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Guest Professional Name *</label>
                            <input
                                type="text"
                                required
                                value={form.speakerName}
                                onChange={(e) => setForm({ ...form, speakerName: e.target.value })}
                                placeholder="Dr. Rajesh Kumar"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Guest Speaker Email</label>
                            <input
                                type="email"
                                value={form.guestEmail}
                                onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                                placeholder="speaker@institution.org"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Speaker Organization</label>
                            <input
                                type="text"
                                value={form.speakerOrganization}
                                onChange={(e) => setForm({ ...form, speakerOrganization: e.target.value })}
                                placeholder="e.g. Microsoft / IIT Bombay"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Speaker Contact info</label>
                            <input
                                type="text"
                                value={form.speakerContact}
                                onChange={(e) => setForm({ ...form, speakerContact: e.target.value })}
                                placeholder="+91 9876543210"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Date *</label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Time / Duration *</label>
                            <input
                                type="text"
                                required
                                value={form.time}
                                onChange={(e) => setForm({ ...form, time: e.target.value })}
                                placeholder="10:00 AM - 01:00 PM"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Event Venue / Mode</label>
                            <input
                                type="text"
                                value={form.venue}
                                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                placeholder="e.g. Seminar Hall / MS Teams"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Guest Resume (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf"
                                className="w-full text-xs text-slate-400 border border-slate-700 rounded-lg p-1.5 bg-slate-950"
                                onChange={(e) => handleFileChange(e, "speakerResumeBase64")}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Upload Event Gallery Images</label>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="w-full text-xs text-slate-400 border border-slate-700 rounded-lg p-1.5 bg-slate-950"
                                onChange={handleMultiplePhotosChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Workshop Description / Objectives *</label>
                            <textarea
                                rows="3"
                                required
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Describe the syllabus, topics covered, and student outcomes..."
                                className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Speaker Credentials / Bio</label>
                            <textarea
                                rows="2"
                                value={form.speakerBio}
                                onChange={(e) => setForm({ ...form, speakerBio: e.target.value })}
                                placeholder="Brief summary of speaker achievements and research background..."
                                className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(false);
                                resetForm();
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-md transition"
                        >
                            {loading ? "Saving..." : editingWorkshopId ? "Update Event" : "Register Event"}
                        </button>
                    </div>
                </form>
            )}

            {/* ================= WORKSHOPS / SEMINARS LISTING ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredWorkshops.length === 0 ? (
                    <div className="col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
                        <span className="text-3xl block mb-2">📂</span>
                        <p className="text-sm font-semibold">No workshops or seminars match the selected filters.</p>
                        <p className="text-xs text-slate-500 mt-1">Try switching categories or clearing search keywords.</p>
                    </div>
                ) : (
                    filteredWorkshops.map(w => {
                        const isSeminar = (w.workshopType && w.workshopType.toLowerCase().includes("seminar")) || (w.title && w.title.toLowerCase().includes("seminar"));
                        return (
                            <div 
                                key={w._id} 
                                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
                            >
                                <div>
                                    {/* Card Header & Status */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                isSeminar 
                                                    ? "bg-purple-950/80 text-purple-300 border-purple-700" 
                                                    : "bg-indigo-950/80 text-indigo-300 border-indigo-700"
                                            }`}>
                                                {isSeminar ? "🎙️ Seminar" : "🛠️ Workshop"}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                                {w.workshopType || "Event"}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                                            w.status === "verified" 
                                                ? "bg-emerald-950/80 text-emerald-400 border-emerald-700" 
                                                : w.status === "rejected" 
                                                ? "bg-rose-950/80 text-rose-400 border-rose-700" 
                                                : "bg-amber-950/80 text-amber-300 border-amber-700"
                                        }`}>
                                            {w.status}
                                        </span>
                                    </div>

                                    {/* Title & Description */}
                                    <h4 className="text-sm font-bold text-white leading-snug mb-1.5">{w.title}</h4>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{w.description}</p>
                                    
                                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-[11px] text-slate-400 mb-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                                        {w.date && <span>📅 <strong>{new Date(w.date).toLocaleDateString()}</strong></span>}
                                        {w.time && <span>⏰ {w.time}</span>}
                                        {w.venue && <span>📍 {w.venue}</span>}
                                    </div>

                                    {/* Speaker Profile Box */}
                                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl mb-4 space-y-1 text-xs">
                                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Speaker / Resource Person</span>
                                            {w.speakerResumePath && (
                                                <a 
                                                    href={w.speakerResumePath} 
                                                    download={`${(w.speakerName || "Speaker").replace(/\s+/g, "_")}_CV.pdf`}
                                                    className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] underline"
                                                >
                                                    📥 Resume CV
                                                </a>
                                            )}
                                        </div>
                                        <div className="font-bold text-slate-200">{w.speakerName}</div>
                                        {w.speakerOrganization && <div className="text-indigo-300 text-[11px]">{w.speakerOrganization}</div>}
                                        {w.guestEmail && <div className="text-slate-400 text-[11px]">✉️ {w.guestEmail}</div>}
                                        {w.speakerBio && <div className="text-slate-400 text-[11px] pt-1 italic">{w.speakerBio}</div>}
                                    </div>

                                    {/* ================= 4-STEP LETTER WORKFLOW PANELS ================= */}
                                    <div className="space-y-2.5 mb-4 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                                        {/* INVITATION LETTER WORKFLOW */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                                                    <span>✉️</span>
                                                    <span>Invitation Letter:</span>
                                                </span>
                                                {w.invitationSentAt ? (
                                                    <span className="text-[10px] text-emerald-400 font-medium">
                                                        ✓ Sent {new Date(w.invitationSentAt).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500">Not Dispatched</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-4 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "invitation", "generate")}
                                                    className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded text-[10px] font-semibold text-center transition"
                                                >
                                                    ✍️ 1. Generate
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "invitation", "view")}
                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-semibold text-center transition"
                                                >
                                                    👁️ 2. View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "invitation", "scan")}
                                                    className={`px-2 py-1 rounded text-[10px] font-semibold text-center transition border ${
                                                        w.scannedInvitation
                                                            ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                                                            : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                                                    }`}
                                                >
                                                    📷 3. Scan {w.scannedInvitation && "✓"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "invitation", "send")}
                                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold text-center shadow transition"
                                                >
                                                    🚀 4. Send
                                                </button>
                                            </div>
                                        </div>

                                        {/* THANKING / APPRECIATION LETTER WORKFLOW */}
                                        <div className="border-t border-slate-850 pt-2">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                    <span>🤝</span>
                                                    <span>Thanking Letter:</span>
                                                </span>
                                                {w.thankingSentAt ? (
                                                    <span className="text-[10px] text-emerald-400 font-medium">
                                                        ✓ Sent {new Date(w.thankingSentAt).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500">Not Dispatched</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-4 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "thanking", "generate")}
                                                    className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded text-[10px] font-semibold text-center transition"
                                                >
                                                    ✍️ 1. Generate
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "thanking", "view")}
                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-semibold text-center transition"
                                                >
                                                    👁️ 2. View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "thanking", "scan")}
                                                    className={`px-2 py-1 rounded text-[10px] font-semibold text-center transition border ${
                                                        w.scannedThankingLetter
                                                            ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                                                            : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                                                    }`}
                                                >
                                                    📷 3. Scan {w.scannedThankingLetter && "✓"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openLetterModal(w, "thanking", "send")}
                                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold text-center shadow transition"
                                                >
                                                    🚀 4. Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {/* Faculty Submitter link */}
                                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
                                        <div>
                                            Logged by:{" "}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (w.submittedBy && onSelectFaculty) {
                                                        onSelectFaculty(w.submittedBy);
                                                    }
                                                }}
                                                className="text-indigo-300 font-bold hover:underline"
                                            >
                                                {w.submittedBy?.name || "Faculty Member"}
                                            </button>
                                        </div>
                                        {w.department && <span className="text-[10px] text-slate-500 uppercase">{w.department}</span>}
                                    </div>

                                    {/* Actions / Edit / Delete */}
                                    {currentUser.role === "Faculty" && String(w.submittedBy?._id || w.submittedBy) === String(currentUser.id || currentUser._id) && (
                                        <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-end gap-3 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => handleEditClick(w)}
                                                className="font-semibold text-indigo-400 hover:text-indigo-300"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(w._id)}
                                                className="font-semibold text-rose-400 hover:text-rose-300"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    )}

                                    {/* Attendance and Reviews Toggle Buttons */}
                                    <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-xs">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveAttendanceId(activeAttendanceId === w._id ? "" : w._id);
                                                setSelectedRolls(w.studentAttendance || []);
                                                setActiveFeedbackId("");
                                            }}
                                            className="text-indigo-400 hover:text-indigo-300 font-semibold"
                                        >
                                            👥 Attendees ({w.studentAttendance?.length || 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveFeedbackId(activeFeedbackId === w._id ? "" : w._id);
                                                setActiveAttendanceId("");
                                            }}
                                            className="text-emerald-400 hover:text-emerald-300 font-semibold"
                                        >
                                            ⭐ Ratings ({w.feedbacks?.length || 0})
                                        </button>
                                    </div>

                                    {/* Attendance checklist panel */}
                                    {activeAttendanceId === w._id && (
                                        <div className="mt-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <strong className="text-xs text-white">Track Attendees</strong>
                                                <span className="text-[10px] text-slate-400">{selectedRolls.length} selected</span>
                                            </div>
                                            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                                                {studentsList.length === 0 ? (
                                                    <span className="text-xs text-slate-500 italic block py-2">No students enrolled in database.</span>
                                                ) : (
                                                    studentsList.map(s => {
                                                        const checked = selectedRolls.includes(s.rollNo);
                                                        return (
                                                            <label key={s.rollNo} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => {
                                                                        if (checked) {
                                                                            setSelectedRolls(prev => prev.filter(r => r !== s.rollNo));
                                                                        } else {
                                                                            setSelectedRolls(prev => [...prev, s.rollNo]);
                                                                        }
                                                                    }}
                                                                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="font-mono text-indigo-400 text-[11px]">{s.rollNo}</span>
                                                                <span className="truncate">{s.name}</span>
                                                            </label>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            <div className="flex justify-end pt-2 border-t border-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveAttendance(w._id)}
                                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                                                >
                                                    Save Attendance
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Workshop Reviews Feedback Panel */}
                                    {activeFeedbackId === w._id && (
                                        <div className="mt-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
                                            <strong className="text-xs text-white">Submit / View Participant Ratings</strong>
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                                                        placeholder="Attendee Name"
                                                        value={fbName}
                                                        onChange={(e) => setFbName(e.target.value)}
                                                    />
                                                    <select
                                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                        value={fbRating}
                                                        onChange={(e) => setFbRating(Number(e.target.value))}
                                                    >
                                                        <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                                                        <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                                                        <option value={3}>⭐⭐⭐ (3/5)</option>
                                                        <option value={2}>⭐⭐ (2/5)</option>
                                                        <option value={1}>⭐ (1/5)</option>
                                                    </select>
                                                </div>
                                                <textarea
                                                    rows="2"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                                                    placeholder="Write workshop assessment comments..."
                                                    value={fbComments}
                                                    onChange={(e) => setFbComments(e.target.value)}
                                                />
                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddWorkshopFeedback(w._id)}
                                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                                                    >
                                                        Post Assessment
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Reviews List */}
                                            <div className="space-y-1.5 border-t border-slate-800 pt-2 max-h-28 overflow-y-auto">
                                                {(w.feedbacks || []).length === 0 ? (
                                                    <span className="text-xs text-slate-500 italic block py-1 text-center">No reviews submitted yet.</span>
                                                ) : (
                                                    (w.feedbacks || []).map((fb, idx) => (
                                                        <div key={idx} className="bg-slate-900/60 border border-slate-850 p-2 rounded text-xs">
                                                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                                                                <strong className="text-slate-200">{fb.name || "Anonymous Participant"}</strong>
                                                                <span className="text-amber-400">{"★".repeat(fb.rating)}</span>
                                                            </div>
                                                            <p className="text-slate-400 italic text-[11px]">"{fb.comments}"</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Principal Approval Actions */}
                                    {currentUser.role === "Principal" && w.status === "pending" && (
                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800">
                                            <button
                                                onClick={() => handleApproveStatus(w._id, "verified")}
                                                className="py-1.5 text-xs font-bold rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/80 transition"
                                            >
                                                ✓ Verify & Approve
                                            </button>
                                            <button
                                                onClick={() => handleApproveStatus(w._id, "rejected")}
                                                className="py-1.5 text-xs font-bold rounded bg-rose-950/60 text-rose-300 border border-rose-700 hover:bg-rose-900/80 transition"
                                            >
                                                ✕ Reject Entry
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default WorkshopsPanel;
