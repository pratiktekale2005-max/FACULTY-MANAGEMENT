const mongoose = require("mongoose");

const otpRequestSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.OtpRequest || mongoose.model("OtpRequest", otpRequestSchema);
