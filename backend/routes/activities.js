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

        const activities = await Activity.find(query).populate("userId", "name email department designation");
        res.json({ activities });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch activities ❌" });
    }
});

// ================= POST CREATE ACTIVITY =================
router.post("/", authenticateUser, async (req, res) => {
    const { 
        activityName, 
        date, 
        description, 
        category,
        documentBase64 // Base64 document string
    } = req.body;

    if (!activityName || !date || !description || !category) {
        return res.status(400).json({ error: "Required fields are missing ❌" });
    }

    try {
        const newActivity = new Activity({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            activityName,
            date,
            description,
            category,
            documentPath: documentBase64 || "" // Holds base64 data URL
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

        // Create HOD notification
        try {
            const Department = require("../models/Department");
            const Notification = require("../models/Notification");
            const dept = await Department.findById(req.user.departmentId);
            if (dept && dept.hodId) {
                const notif = new Notification({
                    organizationId: req.user.organizationId,
                    userId: dept.hodId,
                    title: "New Activity Submitted",
                    message: `${req.user.name} submitted a new activity for approval: ${activityName}`,
                    type: "approval"
                });
                await notif.save();
            }
        } catch (notifErr) {
            console.error("Failed to create HOD notification:", notifErr);
        }

        res.json({ message: "Activity logged in portfolio successfully ✅", activity: newActivity });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to log activity ❌" });
    }
});

module.exports = router;

