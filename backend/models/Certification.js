const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    issuedBy: { type: String, required: true },
    certificateType: { 
        type: String, 
        required: true,
        enum: [
            "Training", "Workshop", "FDP", "STTP", "Certification Course", 
            "NPTEL", "Coursera", "Udemy", "Internship", "Seminar", 
            "Conference", "Webinar", "Industrial Training", 
            "Value Added Course", "Skill Development Program", "Other"
        ]
    },
    description: { type: String, default: "" },
    skills: { type: String, default: "" },
    academicYear: { type: String, default: "" },
    issueDate: { type: String, required: true }, // YYYY-MM-DD
    expiryDate: { type: String, default: "" }, // Optional
    certificateNumber: { type: String, default: "" }, // Optional
    credentialId: { type: String, default: "" }, // Optional
    verificationUrl: { type: String, default: "" }, // Optional
    certificateFile: { type: String, default: "" }, // Base64 representation of PDF/Image
    status: { type: String, enum: ["Active", "Expired"], default: "Active" }
}, {
    timestamps: true
});

module.exports = mongoose.models.Certification || mongoose.model("Certification", certificationSchema);
