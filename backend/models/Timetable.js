const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    facultyName: { type: String, default: "" },
    date: { type: String, default: "" }, // e.g. "2026-10-21" for exams or dated sessions
    dayOfWeek: { 
        type: String, 
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], 
        required: true 
    },
    startTime: { type: String, required: true }, // e.g. "09:00 AM"
    endTime: { type: String, required: true },   // e.g. "10:00 AM"
    department: { type: String, required: true },
    year: { type: String, required: true },       // e.g. "TE (TY)", "SE", "BE"
    division: { type: String, required: true },   // e.g. "A", "B"
    subjectName: { type: String, required: true }, // Subject or Exam Name
    subjectCode: { type: String, default: "" },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    activityType: { 
        type: String, 
        enum: [
            "Regular Lecture", 
            "Practical", 
            "Tutorial", 
            "Unit Test", 
            "Internal Examination", 
            "Final / End-Semester Examination", 
            "Other Academic Activity"
        ], 
        default: "Regular Lecture" 
    },
    lectureType: { type: String, default: "Theory" }, // backwards compatibility
    roomOrLab: { type: String, required: true },  // e.g. "Classroom LH-301", "Lab 204"
    status: { 
        type: String, 
        enum: ["Scheduled", "Ongoing", "Completed", "Cancelled"], 
        default: "Scheduled" 
    },
    academicYear: { type: String, default: "2026-2027" }
}, {
    timestamps: true
});

timetableSchema.index({ organizationId: 1, facultyId: 1, dayOfWeek: 1, startTime: 1 });
timetableSchema.index({ organizationId: 1, department: 1, activityType: 1 });

module.exports = mongoose.models.Timetable || mongoose.model("Timetable", timetableSchema);

