const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const User = require("../models/User");
const Approval = require("../models/Approval");
const { authenticateUser } = require("./authMiddleware");

// ================= GET PORTFOLIO ACTIVITIES =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = { organizationId };

        if (role === "HOD") {
            const memberIds = await User.find({ organizationId, departmentId: req.user.departmentId }).distinct("_id");
            query.userId = { $in: memberIds };
        } else if (role === "Faculty") {
            query.userId = req.user._id;
        }

        const filterUserId = req.query.targetUserId || req.query.userId;
        if (filterUserId && filterUserId !== "all" && role !== "Faculty") {
            const mongoose = require("mongoose");
            if (mongoose.Types.ObjectId.isValid(filterUserId)) {
                const targetUser = await User.findOne({ _id: filterUserId, organizationId });
                if (targetUser) {
                    if (role === "HOD" && String(targetUser.departmentId) !== String(req.user.departmentId)) {
                        return res.status(403).json({ error: "Access denied: target user belongs to another department ❌" });
                    }
                    query.userId = targetUser._id;
                }
            }
        }

        if (req.query.category && req.query.category !== "All" && req.query.category !== "all") {
            query.category = req.query.category;
        }

        if (req.query.academicYear && req.query.academicYear !== "All" && req.query.academicYear !== "all") {
            query.academicYear = req.query.academicYear;
        }

        if (req.query.search) {
            const sRegex = new RegExp(req.query.search, "i");
            query.$or = [
                { activityName: sRegex },
                { description: sRegex },
                { organizer: sRegex },
                { facultyRole: sRegex },
                { participationDetails: sRegex }
            ];
        }

        const activities = await Activity.find(query)
            .populate("userId", "name email department designation")
            .sort({ date: -1, createdAt: -1 });

        res.json({ activities });
    } catch (err) {
        console.error("Fetch activities error:", err);
        res.status(500).json({ error: "Failed to fetch activities ❌" });
    }
});

// ================= POST CREATE ACTIVITY =================
router.post("/", authenticateUser, async (req, res) => {
    const { 
        activityName, 
        title,
        date, 
        startDate,
        endDate,
        organizer,
        facultyRole,
        academicYear,
        participationDetails,
        description, 
        category,
        documentBase64,
        documentPath
    } = req.body;

    const finalTitle = activityName || title;
    const finalDate = date || startDate || new Date().toISOString().split("T")[0];

    if (!finalTitle || !description) {
        return res.status(400).json({ error: "Activity title and description are required ❌" });
    }

    try {
        const newActivity = new Activity({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            activityName: finalTitle,
            date: finalDate,
            startDate: startDate || finalDate,
            endDate: endDate || finalDate,
            organizer: organizer || "",
            facultyRole: facultyRole || "Coordinator",
            academicYear: academicYear || "2026-2027",
            participationDetails: participationDetails || "",
            description,
            category: category || "Academic",
            documentPath: documentBase64 || documentPath || ""
        });

        await newActivity.save();

        const newApproval = new Approval({
            organizationId: req.user.organizationId,
            entityType: "ACTIVITY",
            entityId: newActivity._id,
            submittedBy: req.user._id,
            departmentId: req.user.departmentId || null,
            status: "SUBMITTED",
            currentLevel: "HOD"
        });
        await newApproval.save();

        // Real-Time Notification for HOD
        try {
            const { notifyDepartmentHOD } = require("../services/realtimeNotifications");
            await notifyDepartmentHOD(req.user.organizationId, req.user.departmentId, {
                title: "New Activity Submitted",
                message: `${req.user.name} submitted a new activity for approval: "${finalTitle}"`,
                type: "approval"
            });
        } catch (notifErr) {
            console.error("Failed to create HOD notification:", notifErr);
        }

        res.json({ message: "Activity logged in portfolio successfully ✅", activity: newActivity });
    } catch (err) {
        console.error("Create activity error:", err);
        res.status(500).json({ error: "Failed to log activity ❌" });
    }
});

// ================= PUT UPDATE ACTIVITY =================
router.put("/:id", authenticateUser, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) {
            return res.status(404).json({ error: "Activity not found ❌" });
        }

        const isOwner = String(activity.userId) === String(req.user._id);
        const isPrincipal = req.user.role === "Principal";
        if (!isOwner && !isPrincipal) {
            return res.status(403).json({ error: "Unauthorized: You can only edit your own activities ❌" });
        }

        const {
            activityName,
            title,
            date,
            startDate,
            endDate,
            organizer,
            facultyRole,
            academicYear,
            participationDetails,
            description,
            category,
            documentBase64,
            documentPath
        } = req.body;

        if (activityName || title) activity.activityName = activityName || title;
        if (date) activity.date = date;
        if (startDate !== undefined) activity.startDate = startDate;
        if (endDate !== undefined) activity.endDate = endDate;
        if (organizer !== undefined) activity.organizer = organizer;
        if (facultyRole !== undefined) activity.facultyRole = facultyRole;
        if (academicYear !== undefined) activity.academicYear = academicYear;
        if (participationDetails !== undefined) activity.participationDetails = participationDetails;
        if (description !== undefined) activity.description = description;
        if (category !== undefined) activity.category = category;
        if (documentBase64 !== undefined || documentPath !== undefined) {
            activity.documentPath = documentBase64 || documentPath || "";
        }

        await activity.save();
        res.json({ message: "Activity updated successfully! ✅", activity });
    } catch (err) {
        console.error("Update activity error:", err);
        res.status(500).json({ error: "Failed to update activity ❌" });
    }
});

// ================= DELETE ACTIVITY =================
router.delete("/:id", authenticateUser, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) {
            return res.status(404).json({ error: "Activity not found ❌" });
        }

        const isOwner = String(activity.userId) === String(req.user._id);
        const isPrincipal = req.user.role === "Principal";
        if (!isOwner && !isPrincipal) {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own activities ❌" });
        }

        await Activity.findByIdAndDelete(req.params.id);
        await Approval.deleteMany({ entityId: req.params.id });

        res.json({ message: "Activity deleted successfully! 🗑️" });
    } catch (err) {
        console.error("Delete activity error:", err);
        res.status(500).json({ error: "Failed to delete activity ❌" });
    }
});

module.exports = router;

