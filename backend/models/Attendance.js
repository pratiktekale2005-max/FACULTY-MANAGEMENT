const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ["PRESENT", "ABSENT", "LATE"], default: "PRESENT" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
