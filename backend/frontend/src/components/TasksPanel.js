import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";

function TasksPanel({ currentUser }) {
    const [tasks, setTasks] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null); // Detail modal
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");

    // Form state
    const todayStr = new Date().toISOString().split("T")[0];
    const initialForm = {
        title: "",
        description: "",
        department: currentUser.department || "",
        assignedTo: "",
        assignedDate: todayStr,
        deadline: "",
        priority: "medium",
        status: "pending",
        attachment: "",
        attachmentName: ""
    };
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    const loadTasksAndFaculties = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setIsRefreshing(true);
            setError("");

            // Parallel fetch of tasks and faculties (if required for role)
            const needFaculties = currentUser.role === "Principal" || currentUser.role === "HOD";
            const [taskData, facData] = await Promise.all([
                api.get("/tasks"),
                needFaculties ? api.get("/faculty") : Promise.resolve(null)
            ]);

            setTasks(taskData?.tasks || []);

            if (needFaculties && facData) {
                const allFac = facData.faculties || [];
                // The backend /api/faculty already scopes by departmentId for HODs and returns all for Principal.
                // Exclude Principal accounts from task assignment targets.
                let filtered = allFac.filter(f => f.role !== "Principal");

                // If HOD, verify department match with flexible matching (ID, code, or name)
                if (currentUser.role === "HOD" && (currentUser.departmentId || currentUser.department)) {
                    const hodDeptId = String(currentUser.departmentId?._id || currentUser.departmentId || "");
                    const hodDeptStr = (currentUser.department || "").toLowerCase().trim();

                    const deptFiltered = filtered.filter(f => {
                        const fDeptId = String(f.departmentId?._id || f.departmentId || "");
                        if (hodDeptId && fDeptId && hodDeptId === fDeptId) return true;

                        const fDeptName = (f.department || f.departmentId?.name || "").toLowerCase().trim();
                        const fDeptCode = (f.departmentId?.code || "").toLowerCase().trim();

                        if (hodDeptStr && (
                            fDeptName === hodDeptStr || 
                            fDeptCode === hodDeptStr || 
                            fDeptName.includes(hodDeptStr) || 
                            hodDeptStr.includes(fDeptName)
                        )) return true;

                        return false;
                    });

                    // Only apply deptFiltered if it matched faculties, otherwise keep all returned members
                    if (deptFiltered.length > 0) {
                        filtered = deptFiltered;
                    }
                }

                // Safety fallback: if filter eliminated everyone, keep all non-Principal faculties
                if (filtered.length === 0 && allFac.length > 0) {
                    filtered = allFac.filter(f => f.role !== "Principal");
                }

                setFaculties(filtered);

                setForm(prev => {
                    if (!prev.assignedTo && filtered.length > 0) {
                        return { ...prev, assignedTo: filtered[0]._id };
                    }
                    return prev;
                });
            }
        } catch (err) {
            console.error("Failed to load tasks:", err);
            if (!isSilent) setError("Failed to load tasks ❌");
        } finally {
            if (!isSilent) setLoading(false);
            setIsRefreshing(false);
        }
    }, [currentUser]);

    // Initial load + Real-time fallback polling
    useEffect(() => {
        loadTasksAndFaculties(false);
        const interval = setInterval(() => {
            loadTasksAndFaculties(true);
        }, 15000);
        return () => clearInterval(interval);
    }, [loadTasksAndFaculties]);

    // Handle File Attachment
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit ❌");
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setForm(prev => ({
                ...prev,
                attachment: reader.result,
                attachmentName: file.name
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert("Task title is required ❌");
            return;
        }
        if (!form.assignedTo) {
            alert("Please select a faculty member ❌");
            return;
        }
        if (!form.deadline) {
            alert("Please specify a due date ❌");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                title: form.title.trim(),
                description: form.description.trim(),
                department: form.department || currentUser.department || "",
                assignedTo: form.assignedTo,
                assignedDate: form.assignedDate || todayStr,
                deadline: form.deadline,
                priority: form.priority,
                status: form.status || "pending",
                attachment: form.attachment,
                attachmentName: form.attachmentName
            };

            await api.post("/tasks", payload);
            setSuccessMsg("Task assigned successfully and notification/email dispatched! ✅");
            setTimeout(() => setSuccessMsg(""), 5000);
            setIsAssigning(false);
            setForm({
                ...initialForm,
                assignedTo: faculties.length > 0 ? faculties[0]._id : "",
                department: currentUser.department || ""
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
            loadTasksAndFaculties(false);
        } catch (err) {
            console.error("Task creation error:", err);
            alert(err.message || "Failed to assign task ❌");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await api.put(`/tasks/${id}`, { status: newStatus });
            setSuccessMsg(`Task status updated to ${newStatus} ✅`);
            setTimeout(() => setSuccessMsg(""), 4000);
            if (selectedTask && selectedTask._id === id) {
                setSelectedTask(prev => ({ ...prev, status: newStatus }));
            }
            loadTasksAndFaculties(true);
        } catch (err) {
            alert(err.message || "Failed to update task status ❌");
        }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            await api.delete(`/tasks/${id}`);
            setSuccessMsg("Task deleted successfully! ✅");
            setTimeout(() => setSuccessMsg(""), 4000);
            if (selectedTask && selectedTask._id === id) {
                setSelectedTask(null);
            }
            loadTasksAndFaculties(false);
        } catch (err) {
            alert(err.message || "Failed to delete task ❌");
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case "high": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
            case "medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
            default: return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "completed": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            case "in-progress": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
            default: return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
        }
    };

    // Filter tasks
    const filteredTasks = tasks.filter(t => {
        const matchesSearch = 
            (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.assignedTo?.name && t.assignedTo.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.assignedByName && t.assignedByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || t.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    return (
        <div className="space-y-6 text-xs animate-fade-in pb-12">
            {/* Header section */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                            {currentUser.role === "Faculty" ? "My Assigned Tasks" : "Department Task Management"}
                        </h2>
                        {isRefreshing && (
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full animate-pulse border border-indigo-500/20">
                                ⚡ Live Sync
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 mt-1">
                        {currentUser.role === "Principal" || currentUser.role === "HOD"
                            ? "Assign tasks to faculty members with real-time SSE delivery and instant email notifications"
                            : "View assigned departmental duties, instructions, deadlines, download attachments and update your progress"
                        }
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadTasksAndFaculties(false)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl transition-all"
                        title="Refresh Tasks"
                    >
                        🔄 Refresh
                    </button>
                    {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                        <button
                            onClick={() => {
                                const next = !isAssigning;
                                setIsAssigning(next);
                                if (next) {
                                    setTimeout(() => {
                                        document.getElementById("task-assignment-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }, 60);
                                }
                            }}
                            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                            {isAssigning ? "✕ Close Form" : "➕ Assign Task"}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl animate-fade-in flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-emerald-300">✕</button>
                </div>
            )}

            {/* Task Creation Form (HOD / Principal) */}
            {isAssigning && (currentUser.role === "Principal" || currentUser.role === "HOD") && (
                <div id="task-assignment-form-card" className="bg-[#101622] border border-slate-800 p-6 rounded-2xl animate-fade-in space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                            <span>📋 Assign New Faculty Task</span>
                            <span className="text-[9px] font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                Real-Time + Instant Email
                            </span>
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsAssigning(false)}
                            className="text-slate-400 hover:text-slate-200 text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-350">
                        {/* Task Title */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">
                                Task Title <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                placeholder="e.g. NAAC Criteria 3 Documentation & Evidence Collection"
                                value={form.title}
                                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>

                        {/* Department */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Department</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                placeholder="e.g. Computer Science"
                                value={form.department}
                                onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                            />
                        </div>

                        {/* Select Faculty Member */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center justify-between">
                                <span>Select Faculty Member <span className="text-rose-400">*</span></span>
                                <span className="text-[10px] text-indigo-400 font-semibold">
                                    {faculties.length} {faculties.length === 1 ? "member" : "members"} available
                                </span>
                            </label>
                            <select
                                className="w-full text-xs text-slate-100 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium"
                                value={form.assignedTo}
                                onChange={(e) => setForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                                required
                            >
                                <option value="" className="bg-slate-900 text-slate-400">-- Choose Faculty Member --</option>
                                {faculties.map(f => {
                                    const facName = f.fullName || f.name || "Faculty Member";
                                    const facDept = f.department || f.departmentId?.name || f.departmentId?.code || "Department";
                                    const facDesig = f.designation || f.role || "Faculty";
                                    return (
                                        <option 
                                            key={f._id} 
                                            value={f._id} 
                                            className="bg-slate-900 text-slate-100 py-1.5 font-medium"
                                        >
                                            👤 {facName} ({facDesig} • {facDept}) — {f.email}
                                        </option>
                                    );
                                })}
                            </select>
                            {faculties.length === 0 && (
                                <p className="text-[10px] text-amber-400 italic mt-0.5">
                                    ⚠️ No faculty members found for this department yet. Please verify faculty accounts in the Directory.
                                </p>
                            )}
                        </div>

                        {/* Priority */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Priority</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                value={form.priority}
                                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                            >
                                <option value="low">🟢 Low Priority</option>
                                <option value="medium">🟡 Medium Priority</option>
                                <option value="high">🔴 High Priority</option>
                            </select>
                        </div>

                        {/* Assigned Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Assigned Date</label>
                            <input
                                type="date"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                value={form.assignedDate}
                                onChange={(e) => setForm(prev => ({ ...prev, assignedDate: e.target.value }))}
                            />
                        </div>

                        {/* Due Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">
                                Due Date / Deadline <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="date"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                value={form.deadline}
                                onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                                required
                            />
                        </div>

                        {/* Initial Task Status */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Initial Task Status</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                value={form.status}
                                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="pending">⏳ Pending</option>
                                <option value="in-progress">⚙️ In Progress</option>
                                <option value="completed">✅ Completed</option>
                            </select>
                        </div>

                        {/* Task Description and Instructions */}
                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Task Description & Instructions</label>
                            <textarea
                                rows={3}
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                placeholder="Provide comprehensive details, guidelines, deliverables, and specific steps required for this task..."
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        {/* Attachment Upload */}
                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Attachment Document (PDF / Word / Image - max 5MB)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                {form.attachmentName && (
                                    <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                                        📎 {form.attachmentName}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm(prev => ({ ...prev, attachment: "", attachmentName: "" }));
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            className="text-rose-400 hover:text-rose-300 ml-1 text-xs"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="sm:col-span-3 flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAssigning(false)}
                                className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
                            >
                                {submitting ? "Assigning & Dispatching Email..." : "Assign Task & Send Email 🚀"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter and Search Bar */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="w-full md:w-72 relative">
                    <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        placeholder="Search tasks, faculty, dept..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">🔍</span>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Status:</label>
                        <select
                            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Priority:</label>
                        <select
                            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="all">All Priorities</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>

                    <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                        Showing {filteredTasks.length} of {tasks.length}
                    </span>
                </div>
            </div>

            {/* Task Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Task Details</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">
                                    {currentUser.role === "Faculty" ? "Assigned By" : "Assigned To"}
                                </th>
                                <th className="py-3 px-4 text-center">Priority</th>
                                <th className="py-3 px-4">Due Date</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                [1, 2, 3, 4].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-44 mb-1"></div><div className="h-3 bg-slate-800/60 rounded w-32"></div></td>
                                        <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                                        <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-28"></div></td>
                                        <td className="py-4 px-4 text-center"><div className="h-5 bg-slate-800 rounded-full w-16 mx-auto"></div></td>
                                        <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                                        <td className="py-4 px-4 text-center"><div className="h-5 bg-slate-800 rounded-full w-20 mx-auto"></div></td>
                                        <td className="py-4 px-4 text-center"><div className="h-7 bg-slate-800 rounded-lg w-16 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                                        No tasks found matching your filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((t) => {
                                    const isFacultyOwner = currentUser.role === "Faculty" && (
                                        (t.assignedTo?._id && t.assignedTo._id.toString() === currentUser._id?.toString()) ||
                                        (t.assignedTo === currentUser._id?.toString())
                                    );
                                    const canManage = currentUser.role === "Principal" || currentUser.role === "HOD";

                                    return (
                                        <tr key={t._id} className="hover:bg-slate-900/40 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="cursor-pointer hover:text-indigo-400" onClick={() => setSelectedTask(t)}>
                                                        {t.title}
                                                    </span>
                                                    {t.attachment && (
                                                        <span className="text-[10px] text-indigo-400" title="Has attachment">📎</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-500 block font-normal mt-0.5 line-clamp-1">
                                                    {t.description || "No description provided"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-400">
                                                {t.department || "General"}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-350">
                                                {currentUser.role === "Faculty" 
                                                    ? (t.assignedByName || t.assignedBy?.name || t.assignedBy?.fullName || "HOD")
                                                    : (t.assignedTo?.name || t.assignedTo?.fullName || "Unassigned")}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-bold capitalize ${getPriorityColor(t.priority)}`}>
                                                    {t.priority || "Medium"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-400 font-medium">
                                                {t.deadline ? new Date(t.deadline).toLocaleDateString() : "No deadline"}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-bold capitalize ${getStatusColor(t.status)}`}>
                                                    {t.status || "Pending"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* View Details Button */}
                                                    <button
                                                        onClick={() => setSelectedTask(t)}
                                                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        👁️ View
                                                    </button>

                                                    {/* Faculty actions: Quick Status Transition */}
                                                    {(currentUser.role === "Faculty" || isFacultyOwner) && (
                                                        <select
                                                            value={t.status}
                                                            onChange={(e) => handleStatusUpdate(t._id, e.target.value)}
                                                            className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-semibold rounded-lg px-2 py-1 focus:outline-none"
                                                        >
                                                            <option value="pending">⏳ Pending</option>
                                                            <option value="in-progress">⚙️ In Progress</option>
                                                            <option value="completed">✅ Completed</option>
                                                        </select>
                                                    )}

                                                    {/* HOD/Principal actions: Complete or Delete */}
                                                    {canManage && (
                                                        <>
                                                            {t.status !== "completed" && (
                                                                <button
                                                                    onClick={() => handleStatusUpdate(t._id, "completed")}
                                                                    className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg transition-all"
                                                                    title="Mark Completed"
                                                                >
                                                                    ✅
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteTask(t._id)}
                                                                className="p-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg transition-all"
                                                                title="Delete Task"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                    Task Details
                                </span>
                                <h3 className="text-sm font-bold text-slate-100 mt-1">{selectedTask.title}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-350">
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block">Department</span>
                                <span className="text-slate-200 font-semibold">{selectedTask.department || "General"}</span>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block">Priority</span>
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold capitalize mt-0.5 ${getPriorityColor(selectedTask.priority)}`}>
                                    {selectedTask.priority || "Medium"}
                                </span>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block">Assigned By</span>
                                <span className="text-slate-200 font-semibold">{selectedTask.assignedByName || selectedTask.assignedBy?.name || "HOD"}</span>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block">Assigned To</span>
                                <span className="text-slate-200 font-semibold">{selectedTask.assignedTo?.name || selectedTask.assignedTo?.fullName || "Unassigned"}</span>
                                {selectedTask.assignedTo?.email && (
                                    <span className="text-[10px] text-slate-400 block">{selectedTask.assignedTo.email}</span>
                                )}
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block">Assigned Date</span>
                                <span className="text-slate-200 font-semibold">
                                    {selectedTask.assignedDate ? new Date(selectedTask.assignedDate).toLocaleDateString() : (selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : "N/A")}
                                </span>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block">Due Date / Deadline</span>
                                <span className="text-rose-400 font-semibold">
                                    {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : "No deadline"}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Description & Instructions</span>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {selectedTask.description || "No specific instructions provided for this task."}
                            </p>
                        </div>

                        {/* Attachment */}
                        {selectedTask.attachment && (
                            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">📎</span>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">{selectedTask.attachmentName || "Attached Document"}</p>
                                        <p className="text-[9px] text-slate-500">Document available for download</p>
                                    </div>
                                </div>
                                <a
                                    href={selectedTask.attachment}
                                    download={selectedTask.attachmentName || "task-attachment"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-all shadow"
                                >
                                    📥 Download
                                </a>
                            </div>
                        )}

                        {/* Status Update Control */}
                        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase block">Current Progress</span>
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold capitalize mt-0.5 ${getStatusColor(selectedTask.status)}`}>
                                    {selectedTask.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-semibold">Change to:</span>
                                {["pending", "in-progress", "completed"].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => handleStatusUpdate(selectedTask._id, st)}
                                        disabled={selectedTask.status === st}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                                            selectedTask.status === st
                                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                                : "bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-700"
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TasksPanel;
