const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");
const { authenticateUser, requireRole } = require("./authMiddleware");

const { sendTaskAssignmentEmail } = require("../services/emailService");
const { createAndDispatchNotification } = require("../services/realtimeNotifications");

// ================= GET ALL TASKS =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let tasks;

        if (role === "Principal") {
            // Principal sees all tasks in organization
            tasks = await Task.find({ organizationId })
                .populate("assignedTo", "name email department designation")
                .populate("assignedBy", "name email role")
                .sort({ createdAt: -1 });
        } else if (role === "HOD") {
            // HOD sees tasks in their department or assigned to/by department members
            const memberIds = await User.find({ 
                organizationId, 
                $or: [
                    { departmentId: req.user.departmentId },
                    { department: req.user.department },
                    { _id: req.user._id }
                ]
            }).distinct("_id");

            tasks = await Task.find({ 
                organizationId, 
                $or: [
                    { assignedTo: { $in: memberIds } },
                    { department: req.user.department },
                    { assignedBy: req.user._id }
                ]
            }).populate("assignedTo", "name email department designation")
              .populate("assignedBy", "name email role")
              .sort({ createdAt: -1 });
        } else {
            // Faculty only sees their assigned tasks
            tasks = await Task.find({ 
                organizationId, 
                assignedTo: req.user._id 
            }).populate("assignedTo", "name email department designation")
              .populate("assignedBy", "name email role")
              .sort({ createdAt: -1 });
        }
        res.json({ tasks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch tasks ❌" });
    }
});

// ================= POST CREATE TASK =================
router.post("/", requireRole(["Principal", "HOD"]), async (req, res) => {
    const taskDeadline = req.body.deadline || req.body.dueDate;
    const { 
        title, 
        description, 
        assignedTo, 
        priority = "Medium", 
        department, 
        attachment = "", 
        attachmentName = "",
        status = "pending"
    } = req.body;

    if (!title || !assignedTo || !taskDeadline) {
        return res.status(400).json({ error: "Task Title, Assigned Faculty, and Due Date are required ❌" });
    }

    try {
        const targetFaculty = await User.findOne({ _id: assignedTo, organizationId: req.user.organizationId });
        if (!targetFaculty) {
            return res.status(404).json({ error: "Target faculty member not found in your organization ❌" });
        }

        // HOD boundary check: only assign within their department unless principal
        if (req.user.role === "HOD") {
            const sameDept = (req.user.departmentId && targetFaculty.departmentId && String(targetFaculty.departmentId) === String(req.user.departmentId)) ||
                             (req.user.department && targetFaculty.department && req.user.department.toLowerCase() === targetFaculty.department.toLowerCase());
            if (!sameDept) {
                return res.status(403).json({ error: "Forbidden: HOD can only assign tasks to their department members ❌" });
            }
        }

        const taskDept = department || targetFaculty.department || req.user.department || "";

        const newTask = new Task({
            organizationId: req.user.organizationId,
            title: title.trim(),
            description: description ? description.trim() : "",
            assignedTo,
            department: taskDept,
            assignedDate: new Date(),
            deadline: taskDeadline, // Due Date
            priority: priority ? (priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()) : "Medium",
            status: ["pending", "in_progress", "completed", "in-progress"].includes(status) ? status : "pending",
            assignedBy: req.user._id,
            assignedByName: req.user.name,
            assignedByRole: req.user.role,
            attachment,
            attachmentName,
            comments: []
        });

        await newTask.save();

        // 1. Real-Time In-App Notification via SSE
        try {
            await createAndDispatchNotification({
                organizationId: req.user.organizationId,
                userId: assignedTo,
                title: "New Task Assigned 📋",
                message: `HOD ${req.user.name} assigned you: "${title}". Due: ${taskDeadline} (Priority: ${newTask.priority}).`,
                type: "deadline"
            });
        } catch (notifErr) {
            console.error("Failed to create task notification:", notifErr);
        }

        // 2. Real-Time Task Assignment Email to faculty's registered email
        let emailDispatched = false;
        let emailError = null;
        if (targetFaculty.email) {
            try {
                const mailRes = await sendTaskAssignmentEmail({
                    facultyEmail: targetFaculty.email,
                    facultyName: targetFaculty.name,
                    taskTitle: title.trim(),
                    description: description || "",
                    dueDate: taskDeadline,
                    priority: newTask.priority,
                    assignedByName: req.user.name,
                    assignedByRole: req.user.role,
                    department: taskDept,
                    crmUrl: "http://localhost:3000"
                });
                emailDispatched = mailRes.success;
                if (!mailRes.success) {
                    emailError = mailRes.error;
                }
            } catch (mailErr) {
                console.error("Task assignment email dispatch error:", mailErr);
                emailError = mailErr.message;
            }
        }

        const populatedTask = await Task.findById(newTask._id)
            .populate("assignedTo", "name email department designation")
            .populate("assignedBy", "name email role");

        res.json({ 
            message: "Task assigned and delivered successfully! 📋✅", 
            task: populatedTask,
            emailDispatched,
            emailError
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to allocate task ❌" });
    }
});

// ================= PUT UPDATE TASK =================
router.put("/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { status, comment } = req.body;

    try {
        const task = await Task.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!task) {
            return res.status(404).json({ error: "Task not found ❌" });
        }

        const targetFaculty = await User.findOne({ _id: task.assignedTo, organizationId: req.user.organizationId });

        // Security check
        if (req.user.role === "Faculty" && String(task.assignedTo) !== String(req.user._id)) {
            return res.status(403).json({ error: "Forbidden: You cannot modify other faculty tasks ❌" });
        }
        if (req.user.role === "HOD" && targetFaculty && String(targetFaculty.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: Access denied to other departments ❌" });
        }

        if (status) {
            const mappedStatus = status === "in-progress" ? "in-progress" : status;
            if (!["pending", "in-progress", "completed"].includes(mappedStatus)) {
                return res.status(400).json({ error: "Invalid status value ❌" });
            }
            task.status = mappedStatus;
        }

        if (comment) {
            task.comments.push({
                sender: req.user.name,
                text: comment,
                createdAt: new Date()
            });
        }

        await task.save();

        // If updated by faculty, notify HOD in real time
        if (req.user.role === "Faculty") {
            try {
                const { notifyDepartmentHOD } = require("../services/realtimeNotifications");
                await notifyDepartmentHOD(req.user.organizationId, req.user.departmentId, {
                    title: "Task Progress Update 📋",
                    message: `${req.user.name} updated task "${task.title}" status to "${task.status}".`,
                    type: "info"
                });
            } catch (notifErr) {
                console.error("Failed to notify HOD of task update:", notifErr);
            }
        }

        res.json({ message: "Task updated successfully ✅", task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update task ❌" });
    }
});

// ================= DELETE TASK =================
router.delete("/:id", requireRole(["Principal", "HOD"]), async (req, res) => {
    const { id } = req.params;

    try {
        const task = await Task.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!task) {
            return res.status(404).json({ error: "Task not found ❌" });
        }

        const targetFaculty = await User.findOne({ _id: task.assignedTo, organizationId: req.user.organizationId });
        if (req.user.role === "HOD" && targetFaculty && String(targetFaculty.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: You cannot delete other departments' tasks ❌" });
        }

        await Task.findOneAndDelete({ _id: id, organizationId: req.user.organizationId });
        res.json({ message: "Task deleted successfully ✅" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete task ❌" });
    }
});

module.exports = router;