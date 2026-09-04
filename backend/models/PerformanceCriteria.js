const mongoose = require("mongoose");

const performanceCriteriaSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    category: { 
        type: String, 
        enum: ["Teaching", "Research", "Student Feedback", "Professional Development", "Administrative Work", "Other Activities"],
        required: true
    },
    weight: { type: Number, required: true }, // Weight percentage, e.g. 30 (for 30%)
    maxScore: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

// Compound unique index for category within the same organization
performanceCriteriaSchema.index({ organizationId: 1, category: 1 }, { unique: true });

module.exports = mongoose.models.PerformanceCriteria || mongoose.model("PerformanceCriteria", performanceCriteriaSchema);

