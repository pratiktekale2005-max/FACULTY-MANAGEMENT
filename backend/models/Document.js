const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, default: "" },
    filePath: { type: String, default: "" },
    category: { type: String, default: "General" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Document || mongoose.model("Document", documentSchema);
