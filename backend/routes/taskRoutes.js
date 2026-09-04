const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");
const { authenticateUser, requireRole } = require("./authMiddleware");

// ================= GET ALL TASKS =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let tasks;

        if (role === "Principal") {
            // Principal sees all tasks in organization
            tasks = await Task.find({ organizationId })
                .populate("assignedTo", "name email department designation");
        } else if (role === "HOD") {
            // HOD sees tasks assigned to department members in organization
            const memberIds = await User.find({ 
                organizationId, 
                departmentId: req.user.departmentId 
            }).distinct("_id");

            tasks = await Task.find({ 
                organizationId, 
                assignedTo: { $in: memberIds } 
            }).populate("assignedTo", "name email department designation");
        } else {
            // Faculty only sees their assigned tasks
            tasks = await Task.find({ 
                organizationId, 
                assignedTo: req.user._id 
            }).populate("assignedTo", "name email department designation");
        }
        res.json({ tasks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch tasks ❌" });
    }
});

// ================= POST CREATE TASK =================
router.post("/", requireRole(["Principal", "HOD"]), async (req, res) => {
    const { title, description, assignedTo, deadline } = req.body;

    if (!title || !assignedTo || !deadline) {
        return res.status(400).json({ error: "Required fields are missing ❌" });
    }

    try {
        const targetFaculty = await User.findOne({ _id: assignedTo, organizationId: req.user.organizationId });
        if (!targetFaculty) {
            return res.status(404).json({ error: "Target faculty member not found in your organization ❌" });
        }

        // HOD boundary isolation check
        if (req.user.role === "HOD" && String(targetFaculty.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: HOD cannot assign tasks to other department members ❌" });
        }

        const newTask = new Task({
            organizationId: req.user.organizationId,
            title,
            description,
            assignedTo,
            deadline,
            status: "pending",
            comments: []
        });

        await newTask.save();

        // Create Notification for the assigned faculty member
        try {
            const Notification = require("../models/Notification");
            const notif = new Notification({
                organizationId: req.user.organizationId,
                userId: assignedTo,
                title: "New Task Assigned",
                message: `You have been assigned a new task: "${title}". Deadline: ${deadline}.`,
                type: "deadline"
            });
            await notif.save();
        } catch (notifErr) {
            console.error("Failed to create task notification:", notifErr);
        }

        res.json({ message: "Task assigned successfully ✅", task: newTask });
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