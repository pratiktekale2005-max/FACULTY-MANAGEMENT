import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function TasksPanel({ currentUser }) {
    const [tasks, setTasks] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Create Task form state
    const [form, setForm] = useState({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        deadline: ""
    });

    const [isAssigning, setIsAssigning] = useState(false);

    const loadTasksAndFaculties = async () => {
        try {
            setLoading(true);
            setError("");

            // 1. Fetch Tasks
            const taskData = await api.get("/tasks");
            setTasks(taskData.tasks || []);

            // 2. Fetch faculties if HOD or Principal to assign tasks to
            if (currentUser.role === "Principal" || currentUser.role === "HOD") {
                const facData = await api.get("/faculty");
                setFaculties(facData.faculties || []);
                if (facData.faculties && facData.faculties.length > 0) {
                    setForm(prev => ({ ...prev, assignedTo: facData.faculties[0]._id }));
                }
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load tasks ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasksAndFaculties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!form.title || !form.assignedTo || !form.deadline) {
            alert("Title, Assigned Faculty, and Deadline are required ❌");
            return;
        }

        try {
            await api.post("/tasks", form);
            alert("Task assigned successfully! ✅");
            setIsAssigning(false);
            setForm(prev => ({ ...prev, title: "", description: "", deadline: "" }));
            loadTasksAndFaculties();
        } catch (err) {
            alert(err.message || "Failed to assign task ❌");
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/tasks/${id}`, { status });
            alert("Task status updated successfully! ✅");
            loadTasksAndFaculties();
        } catch (err) {
            alert(err.message || "Failed to update task status ❌");
        }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            await api.delete(`/tasks/${id}`);
            alert("Task deleted successfully! ✅");
            loadTasksAndFaculties();
        } catch (err) {
            alert(err.message || "Failed to delete task ❌");
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "high": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
            case "medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
            default: return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "completed": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            case "in-progress": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
            default: return "bg-slate-550/10 text-slate-400 border border-slate-500/20";
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <p className="text-slate-400 text-xs italic">Loading tasks queue...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header section */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Department Task Management</h2>
                    <p className="text-slate-400 mt-1">
                        {currentUser.role === "Principal" || currentUser.role === "HOD"
                            ? "Assign, monitor, and manage department tasks and administrative assignments"
                            : "Track and report progress on your assigned tasks"
                        }
                    </p>
                </div>
                
                {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                    <button
                        onClick={() => setIsAssigning(!isAssigning)}
                        className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white font-bold rounded-xl transition-all"
                    >
                        {isAssigning ? "✕ Close Form" : "➕ Assign Task"}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {/* Create Task Form */}
            {isAssigning && (
                <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl animate-fade-in space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Assign New Task</h3>
                    <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end text-xs text-slate-350">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Task Title</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-855 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="e.g. NAAC Criteria 3 Documentation"
                                value={form.title}
                                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Assigned Faculty</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none"
                                value={form.assignedTo}
                                onChange={(e) => setForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                                required
                            >
                                {faculties.map(f => (
                                    <option key={f._id} value={f._id}>{f.name} ({f.designation})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Priority</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-850 rounded-xl px-3 py-2.5 focus:outline-none"
                                value={form.priority}
                                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Deadline</label>
                            <input
                                type="date"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-855 rounded-xl px-3 py-2.5 focus:outline-none"
                                value={form.deadline}
                                onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Description</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-855 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="Describe task details..."
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <button
                                type="submit"
                                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10"
                            >
                                Assign Task
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Task Scoreboard Grid */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Department Tasks</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Task Details</th>
                                <th className="py-3 px-4">Assigned To</th>
                                <th className="py-3 px-4 text-center">Priority</th>
                                <th className="py-3 px-4">Deadline</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {tasks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">No tasks logged.</td>
                                </tr>
                            ) : (
                                tasks.map((t) => (
                                    <tr key={t._id} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-200">
                                            {t.title}
                                            <span className="text-[10px] text-slate-500 block font-normal mt-0.5">{t.description || "No description provided"}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-350">{t.assignedTo?.name || "Unassigned"}</td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-bold ${getPriorityColor(t.priority)}`}>
                                                {t.priority}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-400 font-medium">{new Date(t.deadline).toLocaleDateString()}</td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 border rounded-lg text-[9px] font-bold ${getStatusColor(t.status)}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Faculty actions: toggle status */}
                                                {currentUser.role === "Faculty" && t.status !== "completed" && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(t._id, t.status === "pending" ? "in-progress" : "completed")}
                                                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold rounded-lg transition-all"
                                                    >
                                                        {t.status === "pending" ? "⚙️ Start Work" : "✅ Complete"}
                                                    </button>
                                                )}

                                                {/* HOD/Principal actions: update or delete */}
                                                {(currentUser.role === "Principal" || currentUser.role === "HOD") && (
                                                    <>
                                                        {t.status !== "completed" && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(t._id, "completed")}
                                                                className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg transition-all"
                                                            >
                                                                ✅ Approve Complete
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteTask(t._id)}
                                                            className="p-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg transition-all"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default TasksPanel;
