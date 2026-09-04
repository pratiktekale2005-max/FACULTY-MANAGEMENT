const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    type: { type: String, default: "Faculty Performance" },
    format: { type: String, enum: ["PDF", "EXCEL", "CSV"], default: "PDF" },
    metadata: { type: Map, of: String, default: {} },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Report || mongoose.model("Report", reportSchema);
