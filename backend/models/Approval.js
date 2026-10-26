const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    entityType: { 
        type: String, 
        enum: ["WORKSHOP", "PUBLICATION", "ACTIVITY", "LEAVE", "REQUEST"], 
        required: true 
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Points to Workshop, Paper, Activity, or Leave
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    departmentName: { type: String, default: "" },
    status: { 
        type: String, 
        enum: ["DRAFT", "PENDING", "SUBMITTED", "HOD_APPROVED", "APPROVED", "REJECTED", "RETURNED"], 
        default: "SUBMITTED" 
    },
    currentLevel: { 
        type: String, 
        enum: ["HOD", "PRINCIPAL", "COMPLETED"], 
        default: "HOD" 
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedByName: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedByName: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    remarks: { type: String, default: "" },
    comments: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        senderName: { type: String, required: true },
        text: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    history: [{
        status: { type: String, required: true },
        actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        actionByName: { type: String, required: true },
        comment: { type: String, default: "" },
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

approvalSchema.index({ organizationId: 1, currentLevel: 1, status: 1 });
approvalSchema.index({ organizationId: 1, submittedBy: 1 });
approvalSchema.index({ organizationId: 1, departmentName: 1 });

module.exports = mongoose.models.Approval || mongoose.model("Approval", approvalSchema);
