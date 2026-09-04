import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function WorkshopsPanel({ currentUser, refreshTrigger, onRefresh }) {
    const [workshops, setWorkshops] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState("All");

    // Enhanced Workshops states
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
            workshopType: "Arranged by Self",
            speakerResumeBase64: "",
            photosBase64: []
        });
        setEditingWorkshopId("");
    };

    const validateForm = () => {
        const required = [
            { key: "title", label: "Event Title" },
            { key: "description", label: "Workshop Description" },
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

    // Convert file to base64
    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit size to 2MB to prevent MongoDB ERR_OUT_OF_RANGE error
        if (file.size > 2 * 1024 * 1024) {
            alert(`File "${file.name}" is too large! Maximum allowed size is 2MB. ❌`);
            e.target.value = ""; // clear input selection
            setForm(prev => ({ ...prev, [field]: "" }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({
                ...prev,
                [field]: reader.result
            }));
        };
        reader.readAsDataURL(file);
    };

    // Convert multiple gallery photos
    const handleMultiplePhotosChange = (e) => {
        const files = Array.from(e.target.files);
        
        // Limit size of each image to 2MB
        for (const file of files) {
            if (file.size > 2 * 1024 * 1024) {
                alert(`Image "${file.name}" is too large! Maximum allowed size per image is 2MB. ❌`);
                e.target.value = ""; // clear input selection
                setForm(prev => ({ ...prev, photosBase64: [] }));
                return;
            }
        }

        const list = [];
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                list.push(reader.result);
                if (list.length === files.length) {
                    setForm(prev => ({
                        ...prev,
                        photosBase64: list
                    }));
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleEditClick = (w) => {
        setEditingWorkshopId(w._id);
        setForm({
            title: w.title || "",
            description: w.description || "",
            date: w.date || "",
            time: w.time || "",
            venue: w.venue || "",
            speakerName: w.speakerName || "",
            speakerBio: w.speakerBio || "",
            speakerOrganization: w.speakerOrganization || "",
            speakerContact: w.speakerContact || "",
            workshopType: w.workshopType || "Arranged by Self",
            speakerResumeBase64: "", // Do not load base64 unless user uploads new file
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

        // Client-side validation
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

    // Principal approvals handling
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

    const getCategoryColor = (type) => {
        switch (type) {
            case "Arranged by Self": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
            case "Attended": return "bg-emerald-500/10 text-emerald-455 border border-emerald-500/20";
            case "External": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
            default: return "bg-slate-800 text-slate-350 border border-slate-700/60";
        }
    };

    const filteredWorkshops = workshops.filter(w => {
        return filterCategory === "All" || w.workshopType === filterCategory;
    });

    return (
        <div className="space-y-6">
            
            {/* ================= HEADER PANEL ================= */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                        {currentUser.role === "Principal" ? "Workshop Approvals Steering" : "Workshops & Seminars Registry"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {currentUser.role === "Principal" ? "Verify and audit guest lectures, seminars, and external academic workshops." : "Log guest professionals, speaker organization details, upload resume profiles, and galleries."}
                    </p>
                </div>

                {currentUser.role === "Faculty" && (
                    <button
                        onClick={() => {
                            if (showAddForm) {
                                resetForm();
                            }
                            setShowAddForm(!showAddForm);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all"
                    >
                        {showAddForm ? "Close Form" : "Log Event"}
                    </button>
                )}
            </div>

            {/* ================= REGISTER EVENT FORM ================= */}
            {showAddForm && currentUser.role === "Faculty" && (
                <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {editingWorkshopId ? "Edit Workshop Details" : "Register Guest Lecture / Workshop"}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Event Title / Theme</label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. Advanced Machine Learning Workshop"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Event Category</label>
                            <select
                                value={form.workshopType}
                                onChange={(e) => setForm({ ...form, workshopType: e.target.value })}
                                className="bg-slate-950 text-xs text-slate-200 rounded-xl"
                            >
                                <option value="Arranged by Self">Arranged by Self</option>
                                <option value="Attended">Attended</option>
                                <option value="External">External</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Speaker Organization</label>
                            <input
                                type="text"
                                value={form.speakerOrganization}
                                onChange={(e) => setForm({ ...form, speakerOrganization: e.target.value })}
                                placeholder="Google DeepMind"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Speaker Contact info</label>
                            <input
                                type="text"
                                value={form.speakerContact}
                                onChange={(e) => setForm({ ...form, speakerContact: e.target.value })}
                                placeholder="+91 99999 88888, info@email.com"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Guest Professional Name</label>
                            <input
                                type="text"
                                required
                                value={form.speakerName}
                                onChange={(e) => setForm({ ...form, speakerName: e.target.value })}
                                placeholder="Dr. Vivek Mishra"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Guest Resume (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf"
                                className="w-full text-xs text-slate-450 border border-slate-800 rounded-xl p-1 bg-slate-950"
                                onChange={(e) => handleFileChange(e, "speakerResumeBase64")}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Event Date</label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Event Time / Duration</label>
                            <input
                                type="text"
                                required
                                value={form.time}
                                onChange={(e) => setForm({ ...form, time: e.target.value })}
                                placeholder="10:00 AM - 12:00 PM"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Event Venue / Mode</label>
                            <input
                                type="text"
                                value={form.venue}
                                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                placeholder="e.g. Seminar Hall / Online"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Upload Event Gallery Images (Multiple)</label>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="w-full text-xs text-slate-450 border border-slate-800 rounded-xl p-1 bg-slate-950"
                                onChange={handleMultiplePhotosChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Workshop Description / Objectives</label>
                            <textarea
                                rows="3"
                                required
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Describe the objectives, syllabus, topics, and outcomes of the workshop..."
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Speaker Credentials Bio</label>
                            <textarea
                                rows="3"
                                required
                                value={form.speakerBio}
                                onChange={(e) => setForm({ ...form, speakerBio: e.target.value })}
                                placeholder="Briefly highlight speaker achievements..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setShowAddForm(false);
                            }}
                            className="px-4 py-2 text-xs text-slate-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 rounded-xl shadow-lg"
                        >
                            {loading ? (editingWorkshopId ? "Saving..." : "Registering...") : (editingWorkshopId ? "Save Changes" : "Submit Event Verification")}
                        </button>
                    </div>
                </form>
            )}

            {/* ================= CATEGORY FILTERS ================= */}
            <div className="flex flex-wrap gap-1 bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                {["All", "Arranged by Self", "Attended", "External"].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${filterCategory === cat ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ================= WORKSHOPS FEED LIST GRID ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkshops.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500 italic text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                        No workshops found matching the selected filters.
                    </div>
                ) : (
                    filteredWorkshops.map(w => (
                        <div key={w._id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between hover:border-slate-700/60 transition-colors">
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider">
                                            {w.department}
                                        </span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getCategoryColor(w.workshopType)}`}>
                                            {w.workshopType}
                                        </span>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 uppercase ${
                                        w.status === "verified" 
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                            : w.status === "rejected" 
                                            ? "bg-rose-500/10 text-rose-455 border-rose-500/20" 
                                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    }`}>
                                        {w.status}
                                    </span>
                                </div>

                                <h4 className="text-xs font-bold text-slate-200 leading-snug mb-1.5">{w.title}</h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 mb-4">{w.description}</p>
                                
                                {w.venue && (
                                    <p className="text-[10px] text-indigo-400 font-semibold mb-3">
                                        📍 Venue/Mode: <span className="text-slate-350 font-normal">{w.venue}</span>
                                    </p>
                                )}

                                {/* Guest Speaker Details */}
                                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl mb-4 space-y-1 text-[10px]">
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-850 pb-1.5 mb-1.5">
                                        <span className="font-bold text-slate-500 uppercase tracking-wider">Guest Professional</span>
                                        {w.speakerResumePath && (
                                            <a 
                                                href={w.speakerResumePath} 
                                                download={`${w.speakerName.replace(/\s+/g, "_")}_CV.pdf`}
                                                className="text-indigo-400 hover:text-indigo-300 font-bold underline"
                                            >
                                                📥 CV Resume
                                            </a>
                                        )}
                                    </div>
                                    <p className="font-bold text-slate-300">{w.speakerName}</p>
                                    {w.speakerOrganization && <p className="text-indigo-300 font-medium">Org: {w.speakerOrganization}</p>}
                                    {w.speakerContact && <p className="text-slate-500">Contact: {w.speakerContact}</p>}
                                    <p className="text-slate-400 pt-1 leading-relaxed border-t border-slate-850/60 mt-1">{w.speakerBio}</p>
                                </div>

                                {/* Gallery Images */}
                                {w.photos && w.photos.length > 0 && (
                                    <div className="mb-4">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Event Gallery</span>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {w.photos.slice(0, 3).map((photoUrl, idx) => (
                                                <div key={idx} className="relative aspect-video rounded overflow-hidden bg-slate-950 border border-slate-850">
                                                    <img src={photoUrl} alt="Workshop" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-850 pt-3 mt-4 flex items-center justify-between text-[10px]">
                                <span className="text-slate-500">Logged by: <strong className="text-slate-350">{w.submittedBy?.name || "Faculty Member"}</strong></span>
                                <span className="text-slate-500 font-medium">{w.date}</span>
                            </div>

                            {/* Edit / Delete actions for owner */}
                            {currentUser.role === "Faculty" && String(w.submittedBy?._id || w.submittedBy) === String(currentUser.id || currentUser._id) && (
                                <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-end gap-3 text-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => handleEditClick(w)}
                                        className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteClick(w._id)}
                                        className="font-bold text-rose-455 hover:text-rose-400 hover:underline"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            )}

                            {/* Enhanced options */}
                            <div className="mt-4 pt-3 border-t border-slate-850 flex flex-wrap gap-2 justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveAttendanceId(activeAttendanceId === w._id ? "" : w._id);
                                        setSelectedRolls(w.studentAttendance || []);
                                        setActiveFeedbackId("");
                                    }}
                                    className="text-[10px] font-bold text-indigo-400 hover:underline"
                                >
                                    👥 Attendance ({w.studentAttendance?.length || 0})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveFeedbackId(activeFeedbackId === w._id ? "" : w._id);
                                        setActiveAttendanceId("");
                                    }}
                                    className="text-[10px] font-bold text-emerald-455 hover:underline"
                                >
                                    ⭐ Reviews ({w.feedbacks?.length || 0})
                                </button>
                            </div>

                            {/* Attendance checklist dropdown panel */}
                            {activeAttendanceId === w._id && (
                                <div className="mt-3 bg-slate-950/45 p-3.5 rounded-xl border border-slate-850 space-y-3 w-full">
                                    <div>
                                        <strong className="text-[10px] text-slate-200">Track Event Attendees</strong>
                                        <p className="text-[9px] text-slate-500">Check students who attended this workshop</p>
                                    </div>
                                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                                        {studentsList.length === 0 ? (
                                            <span className="text-[9px] text-slate-500 italic block py-2">No students enrolled in subjects.</span>
                                        ) : (
                                            studentsList.map(s => {
                                                const checked = selectedRolls.includes(s.rollNo);
                                                return (
                                                    <label key={s.rollNo} className="flex items-center gap-2 text-[10px] text-slate-300 select-none cursor-pointer">
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
                                                            className="rounded bg-slate-900 border-slate-800 focus:ring-indigo-500"
                                                        />
                                                        <span className="font-semibold text-indigo-400 font-mono text-[9px]">{s.rollNo}</span>
                                                        <span className="truncate">{s.name}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="flex justify-end pt-1.5 border-t border-slate-850/60">
                                        <button
                                            type="button"
                                            onClick={() => handleSaveAttendance(w._id)}
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[9px]"
                                        >
                                            Save Attendance Sheet
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Workshop Reviews feedback submission and listing panel */}
                            {activeFeedbackId === w._id && (
                                <div className="mt-3 bg-slate-950/45 p-3.5 rounded-xl border border-slate-850 space-y-4 w-full">
                                    <div>
                                        <strong className="text-[10px] text-slate-200">Event Star Assessments</strong>
                                        <p className="text-[9px] text-slate-500">Collect ratings reviews from event attendees</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                className="bg-slate-900 border border-slate-855 rounded px-2 py-1 text-[9px] text-slate-200 w-full"
                                                placeholder="Name (Optional)"
                                                value={fbName}
                                                onChange={(e) => setFbName(e.target.value)}
                                            />
                                            <select
                                                className="bg-slate-900 border border-slate-855 rounded px-1.5 py-1 text-[9px] text-slate-250 w-full"
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
                                            className="w-full bg-slate-900 border border-slate-855 rounded px-2 py-1 text-[9px] text-slate-200 resize-none"
                                            placeholder="Write workshop assessment comments..."
                                            value={fbComments}
                                            onChange={(e) => setFbComments(e.target.value)}
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleAddWorkshopFeedback(w._id)}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px]"
                                            >
                                                Submit Assessment
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reviews list */}
                                    <div className="space-y-1.5 border-t border-slate-850/60 pt-2.5 max-h-24 overflow-y-auto pr-1">
                                        {(w.feedbacks || []).length === 0 ? (
                                            <span className="text-[9px] text-slate-500 italic block py-1.5 text-center">No stars reviews logged yet.</span>
                                        ) : (
                                            (w.feedbacks || []).map((fb, idx) => (
                                                <div key={idx} className="bg-slate-900/60 border border-slate-850 p-2 rounded text-[9px] text-slate-350">
                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                        <strong className="text-slate-200 font-bold">{fb.name || "Anonymous Student"}</strong>
                                                        <span className="text-amber-400">{"★".repeat(fb.rating)}</span>
                                                    </div>
                                                    <p className="italic">"{fb.comments}"</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Principal Actions */}
                            {currentUser.role === "Principal" && w.status === "pending" && (
                                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-850">
                                    <button
                                        onClick={() => handleApproveStatus(w._id, "verified")}
                                        className="py-1 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                    >
                                        Verify & Approve
                                    </button>
                                    <button
                                        onClick={() => handleApproveStatus(w._id, "rejected")}
                                        className="py-1 text-[10px] font-bold uppercase rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                                    >
                                        Reject Logs
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}

export default WorkshopsPanel;
