const mongoose = require("mongoose");

const kpiSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    academicYear: { type: String, required: true },
    semester: { type: String, required: true },
    category: { type: String, required: true }, // Publications, Workshops, FDP, Research Projects
    name: { type: String, required: true },
    targetValue: { type: Number, required: true },
    achievedValue: { type: Number, default: 0 },
    unit: { type: String, default: "Count" },
    status: { 
        type: String, 
        enum: ["NOT_STARTED", "IN_PROGRESS", "ACHIEVED", "EXCEEDED", "OVERDUE"], 
        default: "NOT_STARTED" 
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-update status based on achievedValue vs targetValue before saving
kpiSchema.pre("save", function(next) {
    this.updatedAt = new Date();
    if (this.achievedValue === 0) {
        this.status = "NOT_STARTED";
    } else if (this.achievedValue >= this.targetValue) {
        this.status = this.achievedValue > this.targetValue ? "EXCEEDED" : "ACHIEVED";
    } else {
        this.status = "IN_PROGRESS";
    }
    next();
});

module.exports = mongoose.models.KPI || mongoose.model("KPI", kpiSchema);
