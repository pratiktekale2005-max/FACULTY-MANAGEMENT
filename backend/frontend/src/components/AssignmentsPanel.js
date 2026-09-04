import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function AssignmentsPanel({ currentUser }) {
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter, Search, Sorting
    const [search, setSearch] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [page, setPage] = useState(1);
    const limit = 6;

    // Form Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingAss, setEditingAss] = useState(null);
    const [form, setForm] = useState({
        title: "",
        subjectId: "",
        divisionId: "", // Division A, B... or ""
        academicYear: "2026-2027",
        semester: "1st Semester",
        givenDate: "",
        deadlineDate: "",
        marks: 20,
        description: "",
        file: "", // base64 string
        status: "Draft"
    });

    const [selectedSubjectObj, setSelectedSubjectObj] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Subjects
            const subData = await api.get("/subjects");
            setSubjects(subData.subjects || []);

            // Load Assignments
            const assData = await api.get("/assignments");
            setAssignments(assData.assignments || []);
        } catch (err) {
            console.error("Failed to load assignments panel data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Monitor selected subject to populate division options dynamically
    useEffect(() => {
        if (form.subjectId) {
            const matched = subjects.find(s => s._id === form.subjectId);
            setSelectedSubjectObj(matched || null);
            if (matched && matched.hasDivision && matched.divisionList?.length > 0) {
                setForm(prev => ({ ...prev, divisionId: matched.divisionList[0] }));
            } else {
                setForm(prev => ({ ...prev, divisionId: "" }));
            }
        } else {
            setSelectedSubjectObj(null);
            setForm(prev => ({ ...prev, divisionId: "" }));
        }
    }, [form.subjectId, subjects]);

    // File handler converting PDF to Base64
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            alert("Only PDF documents are supported for assignment files! ❌");
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            alert("Assignment instructions PDF limit is 8MB ❌");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, file: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    // Save Action (Create / Update)
    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title || !form.subjectId || !form.academicYear || !form.semester || !form.givenDate || !form.deadlineDate) {
            alert("Please fill all required fields (*) ❌");
            return;
        }

        try {
            if (editingAss) {
                await api.put(`/assignments/${editingAss._id}`, form);
                alert("Assignment sheet details saved! ✅");
            } else {
                await api.post("/assignments", form);
                alert("Assignment posted successfully! ✅");
            }
            setShowModal(false);
            setEditingAss(null);
            resetForm();
            loadData();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save assignment sheet.");
        }
    };

    // Reset Form fields
    const resetForm = () => {
        setForm({
            title: "",
            subjectId: subjects.length > 0 ? subjects[0]._id : "",
            divisionId: "",
            academicYear: "2026-2027",
            semester: "1st Semester",
            givenDate: new Date().toISOString().split("T")[0],
            deadlineDate: "",
            marks: 20,
            description: "",
            file: "",
            status: "Draft"
        });
    };

    // Edit Trigger
    const handleEdit = (ass) => {
        setEditingAss(ass);
        setForm({
            title: ass.title || "",
            subjectId: ass.subjectId?._id || ass.subjectId || "",
            divisionId: ass.divisionId || "",
            academicYear: ass.academicYear || "",
            semester: ass.semester || "",
            givenDate: ass.givenDate ? ass.givenDate.split("T")[0] : "",
            deadlineDate: ass.deadlineDate ? ass.deadlineDate.split("T")[0] : "",
            marks: ass.marks || 20,
            description: ass.description || "",
            file: ass.file || "",
            status: ass.status || "Draft"
        });
        setShowModal(true);
    };

    // Direct Publish Trigger
    const handlePublishDirectly = async (ass) => {
        try {
            await api.put(`/assignments/${ass._id}`, { ...ass, status: "Published" });
            alert("Assignment published directly to roster! 📢");
            loadData();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to publish assignment.");
        }
    };

    // Delete Action
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this assignment? 🗑️")) return;
        try {
            await api.delete(`/assignments/${id}`);
            alert("Assignment sheet deleted. ✅");
            loadData();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to delete assignment.");
        }
    };

    // File Download Action
    const handleDownload = (ass) => {
        if (!ass.file) {
            alert("No instruction file sheet attached.");
            return;
        }
        const link = document.createElement("a");
        link.href = ass.file;
        link.download = `${ass.title.replace(/\s+/g, "_")}_Instructions.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filters and Search logic
    const filteredAss = assignments.filter(a => {
        const query = search.toLowerCase();
        const matchesSearch = a.title.toLowerCase().includes(query) || (a.description && a.description.toLowerCase().includes(query));
        const matchedSubId = a.subjectId?._id || a.subjectId;
        const matchesSub = filterSubject ? matchedSubId === filterSubject : true;
        const matchesStatus = filterStatus ? a.status === filterStatus : true;
        return matchesSearch && matchesSub && matchesStatus;
    });

    const totalPages = Math.ceil(filteredAss.length / limit);
    const paginatedAss = filteredAss.slice((page - 1) * limit, page * limit);

    return (
        <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl text-xs text-slate-205">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-850 pb-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-105 uppercase tracking-wider">Subject Coursework Assignments</h2>
                    <p className="text-[10px] text-slate-400 mt-1">Publish home assignments, schedule deadlines, attach manuals, and review submission sheets</p>
                </div>

                {currentUser.role === "Faculty" && (
                    <button
                        onClick={() => { resetForm(); setEditingAss(null); setShowModal(true); }}
                        className="px-4.5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md"
                    >
                        ＋ Create Assignment
                    </button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row items-center gap-3.5 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                <input
                    type="text"
                    placeholder="Search by assignment title..."
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />

                <select
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-350 focus:outline-none w-52"
                    value={filterSubject}
                    onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
                >
                    <option value="">All Subjects (Filter)</option>
                    {subjects.map(s => (
                        <option key={s._id} value={s._id}>{s.subjectName} ({s.subjectCode})</option>
                    ))}
                </select>

                <select
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-350 focus:outline-none w-36"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                >
                    <option value="">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>

            {/* Grid display */}
            {loading ? (
                <p className="text-center italic text-slate-500 py-10">Fetching coursework sheets...</p>
            ) : paginatedAss.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic bg-slate-950/10 border border-slate-850 rounded-2xl">
                    No assignments are currently posted for matches.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedAss.map(ass => {
                        const matchedSub = subjects.find(s => s._id === (ass.subjectId?._id || ass.subjectId));
                        return (
                            <div 
                                key={ass._id}
                                className="bg-slate-950/25 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/25 transition-all relative group hover:-translate-y-0.5 shadow"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] uppercase tracking-wider font-semibold">
                                            {matchedSub ? matchedSub.subjectCode : "Coursework"} {ass.divisionId ? `(Div ${ass.divisionId})` : ""}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold ${ass.status === "Published" ? "bg-emerald-500/10 text-emerald-400" : ass.status === "Closed" ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-400"}`}>
                                            {ass.status}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-slate-100 line-clamp-1">{ass.title}</h3>
                                        <p className="text-[10px] text-slate-450 mt-1 font-semibold">{matchedSub?.subjectName || "Subject Details"}</p>
                                    </div>

                                    {ass.description && (
                                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{ass.description}</p>
                                    )}

                                    <div className="space-y-1 text-[9px] border-t border-slate-900/60 pt-2 text-slate-500 font-mono">
                                        <p>Max Marks: <strong className="text-indigo-400 font-bold">{ass.marks} pts</strong></p>
                                        <p>Given Date: {ass.givenDate ? ass.givenDate.split("T")[0] : "-"}</p>
                                        <p className="text-rose-400 font-bold">Deadline Date: {ass.deadlineDate ? ass.deadlineDate.split("T")[0] : "-"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-900/60 text-[10px] font-bold">
                                    {ass.file && (
                                        <button
                                            onClick={() => handleDownload(ass)}
                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-indigo-450 rounded-lg border border-slate-800 transition-all font-bold"
                                        >
                                            📥 PDF Manual
                                        </button>
                                    )}
                                    {currentUser.role === "Faculty" && ass.status === "Draft" && (
                                        <button
                                            onClick={() => handlePublishDirectly(ass)}
                                            className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg transition-all"
                                        >
                                            Publish
                                        </button>
                                    )}
                                    {currentUser.role === "Faculty" && (
                                        <button
                                            onClick={() => handleEdit(ass)}
                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-350 rounded-lg border border-slate-800 transition-all ml-auto"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    {currentUser.role === "Faculty" && (
                                        <button
                                            onClick={() => handleDelete(ass._id)}
                                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded disabled:opacity-40"
                    >
                        Prev
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Add / Edit Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-[#101622] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                        <div>
                            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">{editingAss ? "Modify Assignment Details" : "Create Subject Assignment"}</h3>
                            <p className="text-[10px] text-slate-450 mt-0.5">Define subject milestones, set marks limits, and upload instructions sheets</p>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-200">
                            
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-450 uppercase">Assignment Title *</label>
                                <input
                                    type="text"
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Target Subject *</label>
                                <select
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                    value={form.subjectId}
                                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id}>{s.subjectName} ({s.subjectCode})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase font-semibold">Division Assignment</label>
                                {selectedSubjectObj && selectedSubjectObj.hasDivision ? (
                                    <select
                                        className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                                        value={form.divisionId}
                                        onChange={(e) => setForm({ ...form, divisionId: e.target.value })}
                                    >
                                        {selectedSubjectObj.divisionList.map(div => (
                                            <option key={div} value={div}>Division {div}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-400"
                                        value="No Divisions"
                                        disabled
                                    />
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Academic Year *</label>
                                <input
                                    type="text"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2 text-slate-200"
                                    value={form.academicYear}
                                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Semester *</label>
                                <input
                                    type="text"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2 text-slate-202"
                                    value={form.semester}
                                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Given Date *</label>
                                <input
                                    type="date"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2 text-slate-250 focus:outline-none"
                                    value={form.givenDate}
                                    onChange={(e) => setForm({ ...form, givenDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Deadline Date *</label>
                                <input
                                    type="date"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2 text-slate-250 focus:outline-none"
                                    value={form.deadlineDate}
                                    onChange={(e) => setForm({ ...form, deadlineDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Maximum Marks *</label>
                                <input
                                    type="number"
                                    className="bg-slate-955 border border-slate-855 rounded-xl px-3 py-2 text-slate-200"
                                    value={form.marks}
                                    onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Status *</label>
                                <select
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-202 focus:outline-none"
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    required
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Published">Published</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Detailed Instructions Description</label>
                                <textarea
                                    rows={2.5}
                                    placeholder="Enter details of assignment tasks..."
                                    className="bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 text-xs"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2 border-t border-slate-850 pt-3">
                                <label className="text-[9px] font-bold text-slate-455 uppercase">Attach Assignment Sheet PDF</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        id="ass-pdf-upload"
                                        onChange={handleFileUpload}
                                    />
                                    <label
                                        htmlFor="ass-pdf-upload"
                                        className="cursor-pointer bg-slate-900 border border-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-center"
                                    >
                                        Choose PDF Manual
                                    </label>
                                    {form.file && (
                                        <span className="text-[10px] text-indigo-400 font-semibold font-mono truncate max-w-sm">Assignment PDF document loaded!</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-slate-850">
                                <button type="button" onClick={resetForm} className="text-slate-450 hover:text-slate-350 mr-auto">Reset Form</button>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-250">Cancel</button>
                                <button type="submit" className="px-5 py-2 font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl">
                                    {editingAss ? "Update Details" : "Publish Assignment"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AssignmentsPanel;
