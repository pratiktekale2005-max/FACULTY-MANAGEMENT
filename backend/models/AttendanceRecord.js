const mongoose = require("mongoose");

const attendanceEntrySchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rollNo: { type: String, required: true },
    prnNumber: { type: String, default: "" },
    name: { type: String, required: true },
    status: { type: String, enum: ["PRESENT", "ABSENT", "ON_LEAVE"], default: "PRESENT" }
});

const attendanceRecordSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    division: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    entries: [attendanceEntrySchema],
    totalStudents: { type: Number, default: 0 },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    leaveCount: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Prevent duplicate attendance records for the same student/class, subject, and date
attendanceRecordSchema.index(
    { organizationId: 1, subjectId: 1, division: 1, date: 1 },
    { unique: true }
);

module.exports = mongoose.models.AttendanceRecord || mongoose.model("AttendanceRecord", attendanceRecordSchema);
