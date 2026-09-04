const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    email: { type: String, default: "" },
    description: { type: String, default: "" },
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdAt: { type: Date, default: Date.now }
});

// Compound unique index for code within the same organization
departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });

module.exports = mongoose.models.Department || mongoose.model("Department", departmentSchema);

