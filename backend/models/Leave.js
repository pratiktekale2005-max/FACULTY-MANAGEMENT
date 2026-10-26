const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    facultyName: { type: String, default: "" },
    department: { type: String, default: "" },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    subject: { type: String, default: "Leave Application" },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    leaveType: { type: String, default: "Casual Leave" },
    reason: { type: String, default: "" },
    attachment: { type: String, default: "" }, // Base64 data URL or file reference
    attachmentName: { type: String, default: "" },
    status: { 
        type: String, 
        enum: ["PENDING", "HOD_APPROVED", "APPROVED", "REJECTED", "CANCELLED"], 
        default: "PENDING" 
    },
    currentLevel: {
        type: String,
        enum: ["HOD", "PRINCIPAL", "COMPLETED"],
        default: "HOD"
    },
    hodStatus: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
    },
    hodRemarks: { type: String, default: "" },
    hodActionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    hodActionByName: { type: String, default: "" },
    hodApprovedAt: { type: Date, default: null },
    principalStatus: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
    },
    principalRemarks: { type: String, default: "" },
    principalActionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    principalActionByName: { type: String, default: "" },
    principalApprovedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

leaveSchema.index({ organizationId: 1, userId: 1 });
leaveSchema.index({ organizationId: 1, department: 1, currentLevel: 1 });

module.exports = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);
