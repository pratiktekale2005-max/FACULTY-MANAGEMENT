const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    leaveType: { type: String, default: "Casual Leave" },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);
