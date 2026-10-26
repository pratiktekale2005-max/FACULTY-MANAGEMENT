const mongoose = require("mongoose");

const timetableImageSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    department: { type: String, required: true },
    title: { type: String, default: "Master Department Timetable" },
    academicYear: { type: String, default: "2026-2027" },
    semester: { type: String, default: "Current Semester" },
    imageUrl: { type: String, required: true }, // Base64 data URL
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedByName: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

timetableImageSchema.index({ organizationId: 1, department: 1 });

module.exports = mongoose.models.TimetableImage || mongoose.model("TimetableImage", timetableImageSchema);
