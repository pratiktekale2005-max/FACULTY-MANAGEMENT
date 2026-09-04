const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Faculty ID
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Faculty ID (kept in sync for backward compatibility)
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    department: { type: String, default: "" },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    academicYear: { type: String, default: "" },
    semester: { type: String, default: "" },
    rollNo: { type: String, default: "" }, // Student roll number (optional/anonymous)
    studentName: { type: String, default: "" },
    rating: { type: Number, required: true }, // 1 to 5 rating
    comments: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);

