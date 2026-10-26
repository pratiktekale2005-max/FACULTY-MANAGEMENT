const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "info" }, // info, warning, deadline, approval, success, notice
    category: { type: String, default: "General" }, // Workshop, Task, Leave, Approval, Notice, Paper, System, General
    senderName: { type: String, default: "" },
    senderRole: { type: String, default: "" }, // Principal, HOD, Faculty, System
    targetTab: { type: String, default: "" }, // events, tasks, leave, approvals, invitations, papers, etc.
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
