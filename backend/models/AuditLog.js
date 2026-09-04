const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // e.g. LOGIN, APPROVE, REJECT, RETURN, CREATE_KPI, etc.
    entityType: { type: String, default: "" }, // e.g. WORKSHOP, PUBLICATION, KPI
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    description: { type: String, required: true },
    metadata: { type: Map, of: String, default: {} },
    ipAddress: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
