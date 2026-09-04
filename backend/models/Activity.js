const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activityName: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["Academic", "Technical", "Cultural"], default: "Academic" },
    documentPath: { type: String, default: "" },
    status: { type: String, enum: ["pending", "verified", "rejected", "returned"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Activity || mongoose.model("Activity", activitySchema);
