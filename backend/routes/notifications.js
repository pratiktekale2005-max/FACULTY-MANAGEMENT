const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { registerClient } = require("../services/realtimeNotifications");
const { authenticateUser } = require("./authMiddleware");

// ================= REAL-TIME SSE STREAM =================
router.get("/stream", authenticateUser, (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    });

    // Tell client to reconnect after 3 seconds if disconnected
    res.write("retry: 3000\n\n");

    registerClient(req.user._id, res, {
        role: req.user.role,
        organizationId: req.user.organizationId,
        departmentId: req.user.departmentId
    });
});

// ================= GET MY NOTIFICATIONS =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const list = await Notification.find({ 
            userId: req.user._id,
            organizationId: req.user.organizationId
        }).sort({ createdAt: -1 }).limit(50);
        res.json({ notifications: list });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch notifications ❌" });
    }
});

// ================= PUT MARK NOTIFICATION AS READ =================
router.put("/:id/read", authenticateUser, async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id, organizationId: req.user.organizationId },
            { isRead: true },
            { new: true }
        );
        if (!notif) {
            return res.status(404).json({ error: "Notification not found ❌" });
        }
        res.json({ message: "Notification marked as read ✅", notification: notif });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update notification status ❌" });
    }
});

// ================= PUT MARK ALL AS READ =================
router.put("/read-all", authenticateUser, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, organizationId: req.user.organizationId, isRead: false },
            { isRead: true }
        );
        res.json({ message: "All notifications marked as read ✅" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update notifications ❌" });
    }
});

module.exports = router;
