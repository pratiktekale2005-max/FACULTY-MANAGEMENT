const mongoose = require("mongoose");

const officialLetterSchema = new mongoose.Schema({
    refNo: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization"
    },
    workshopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workshop"
    },
    letterType: {
        type: String,
        enum: ["invitation", "thanking", "offer", "appointment", "official_comm"],
        default: "invitation",
        required: true
    },
    letterCategory: {
        type: String,
        default: "Academic & Guest Relations"
    },
    subject: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    recipient: {
        name: { type: String, required: true },
        designation: { type: String, default: "" },
        organization: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        address: { type: String, default: "" }
    },
    eventDetails: {
        title: { type: String, default: "" },
        date: { type: String, default: "" },
        time: { type: String, default: "" },
        venue: { type: String, default: "" },
        mode: { type: String, default: "Offline" },
        department: { type: String, default: "" },
        lectureHours: { type: Number, default: 0 },
        remunerationRate: { type: Number, default: 0 },
        totalRemuneration: { type: Number, default: 0 },
        terms: { type: String, default: "" }
    },
    bodyText: {
        type: String,
        default: ""
    },
    // Sender (strictly based on the authenticated user who initiated the letter)
    sender: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        designation: { type: String, required: true },
        department: { type: String, default: "" },
        role: { type: String, enum: ["Faculty", "HOD", "Principal", "Admin", "SuperAdmin"], required: true },
        email: { type: String, default: "" }
    },
    // Signatory layout for the formal signature block
    signatory: {
        name: { type: String, required: true },
        designation: { type: String, required: true },
        department: { type: String, default: "" },
        collegeName: { type: String, default: "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION" }
    },
    approval: {
        required: { type: Boolean, default: false },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approvedByName: { type: String, default: "" },
        approvedByRole: { type: String, default: "" },
        approvedAt: { type: Date },
        comments: { type: String, default: "" }
    },
    status: {
        type: String,
        enum: ["draft", "pending_approval", "approved", "issued", "sent"],
        default: "approved"
    },
    sentStatus: {
        type: String,
        enum: ["not_sent", "sent", "failed"],
        default: "not_sent"
    },
    sentAt: {
        type: Date
    },
    pdfBase64: {
        type: String,
        default: ""
    },
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.OfficialLetter || mongoose.model("OfficialLetter", officialLetterSchema);
