const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    divisionId: { type: String, default: "" }, // Optional/Required depending on whether subject has divisions
    title: { type: String, required: true },
    description: { type: String, default: "" },
    givenDate: { type: String, required: true }, // YYYY-MM-DD
    deadlineDate: { type: String, required: true }, // YYYY-MM-DD
    marks: { type: Number, default: 100 },
    file: { type: String, default: "" }, // Base64 file string of PDF
    status: { type: String, enum: ["Draft", "Published", "Closed"], default: "Draft" }
}, {
    timestamps: true
});

module.exports = mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);
