const mongoose = require("mongoose");

const assignmentMarksSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rollNo: { type: String, required: true },
    studentName: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    division: { type: String, required: true },
    academicYear: { type: String, default: "2026-2027" },
    maxMarks: { type: Number, default: 10 },
    assignment1: { type: Number, default: null },
    assignment1Date: { type: String, default: "" }, // Evaluation Date e.g. "2026-10-15"
    assignment2: { type: Number, default: null },
    assignment2Date: { type: String, default: "" },
    assignment3: { type: Number, default: null },
    assignment3Date: { type: String, default: "" },
    assignment4: { type: Number, default: null },
    assignment4Date: { type: String, default: "" },
    assignment5: { type: Number, default: null },
    assignment5Date: { type: String, default: "" },
    total: { type: Number, default: 0 }
}, {
    timestamps: true
});

assignmentMarksSchema.index({ organizationId: 1, subjectId: 1, studentId: 1 }, { unique: true });
assignmentMarksSchema.index({ organizationId: 1, subjectId: 1, division: 1 });

module.exports = mongoose.models.AssignmentMarks || mongoose.model("AssignmentMarks", assignmentMarksSchema);
