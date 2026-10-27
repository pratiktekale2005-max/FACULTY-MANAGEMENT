const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activityName: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: [
            "Academic", "Technical", "Cultural", "Co-curricular", 
            "Extracurricular", "Administrative", "Professional", 
            "Community Outreach", "Workshop / Seminar", "Other"
        ], 
        default: "Academic" 
    },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    organizer: { type: String, default: "" },
    facultyRole: { type: String, default: "Coordinator" },
    academicYear: { type: String, default: "2026-2027" },
    participationDetails: { type: String, default: "" },
    documentPath: { type: String, default: "" },
    documentBase64: { type: String, default: "" },
    certificateFile: { type: String, default: "" },
    certificate: { type: String, default: "" },
    attachments: [{ type: String }],
    photos: [{ type: String }],
    status: { type: String, enum: ["pending", "verified", "rejected", "returned"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Activity || mongoose.model("Activity", activitySchema);
