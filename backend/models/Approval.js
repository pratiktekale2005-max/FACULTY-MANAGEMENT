const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    entityType: { type: String, enum: ["WORKSHOP", "PUBLICATION", "ACTIVITY"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Points to Workshop, Paper, or Activity
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    status: { 
        type: String, 
        enum: ["DRAFT", "SUBMITTED", "HOD_APPROVED", "APPROVED", "REJECTED", "RETURNED"], 
        default: "SUBMITTED" 
    },
    currentLevel: { 
        type: String, 
        enum: ["HOD", "PRINCIPAL", "COMPLETED"], 
        default: "HOD" 
    },
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

module.exports = mongoose.models.Approval || mongoose.model("Approval", approvalSchema);
