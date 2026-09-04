const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const { requireRole } = require("./authMiddleware");

// ================= GET AUDIT LOGS (PRINCIPAL ONLY) =================
router.get("/", requireRole(["Principal"]), async (req, res) => {
    try {
        const logs = await AuditLog.find({ organizationId: req.user.organizationId })
            .populate("userId", "name email role department")
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ logs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch audit logs ❌" });
    }
});

module.exports = router;
