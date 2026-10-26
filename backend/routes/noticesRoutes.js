const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { authenticateUser } = require("./authMiddleware");

// GET /api/notices
router.get("/", authenticateUser, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const notices = await Notification.find({
            organizationId,
            $or: [
                { userId: req.user._id },
                { type: { $in: ["info", "warning", "deadline"] } }
            ]
        }).sort({ createdAt: -1 }).limit(30).lean();

        res.json({ success: true, notices });
    } catch (err) {
        console.error("Fetch notices error:", err);
        res.status(500).json({ error: "Failed to fetch notices ❌" });
    }
});

module.exports = router;
