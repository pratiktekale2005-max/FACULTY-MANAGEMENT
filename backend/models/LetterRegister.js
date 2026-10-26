const mongoose = require("mongoose");

const letterRegisterSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null
    },
    registerTitle: {
        type: String,
        required: true,
        trim: true
    },
    registerNumber: {
        type: String,
        required: true,
        trim: true
    },
    letterType: {
        type: String,
        required: true,
        enum: [
            "Inward",
            "Outward",
            "University Circular",
            "Government Order",
            "Institutional Notice",
            "Official Memo",
            "Faculty Appointment",
            "HOD Appointment",
            "MOU & Agreement",
            "General Communication",
            "Other"
        ],
        default: "Inward"
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    senderOrRecipient: {
        type: String,
        required: true,
        trim: true
    },
    entryType: {
        type: String,
        enum: ["Inward", "Outward", "Internal"],
        default: "Inward"
    },
    letterDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    receivedOrDispatchDate: {
        type: Date,
        default: Date.now
    },
    department: {
        type: String,
        trim: true,
        default: "General Administration"
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    attachment: {
        type: String, // Base64 data URL or document URL
        default: ""
    },
    attachmentName: {
        type: String,
        default: ""
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    createdByName: {
        type: String,
        default: ""
    },
    createdByRole: {
        type: String,
        default: ""
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedByName: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Index registerNumber for search and unique lookup
letterRegisterSchema.index({ registerNumber: 1 });
letterRegisterSchema.index({ department: 1, entryType: 1 });

module.exports = mongoose.model("LetterRegister", letterRegisterSchema);
