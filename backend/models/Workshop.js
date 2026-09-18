const mongoose = require("mongoose");

const workshopSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    venue: { type: String, default: "" },
    eventType: { type: String, enum: ["organized", "attended"], default: "organized" },
    speakerName: { type: String, required: true },
    speakerBio: { type: String, default: "" },
    speakerOrganization: { type: String, default: "" },
    speakerContact: { type: String, default: "" },
    guestEmail: { type: String, default: "" },
    guestDesignation: { type: String, default: "" },
    guestOrganization: { type: String, default: "" },
    workshopType: { 
        type: String, 
        default: "Workshop" 
    },
    speakerResumePath: { type: String, default: "" },
    scannedInvitation: { type: String, default: "" }, // Base64 document / image
    scannedThankingLetter: { type: String, default: "" }, // Base64 document / image
    invitationSentAt: { type: Date, default: null },
    thankingSentAt: { type: Date, default: null },
    photos: [String],
    videos: [String],
    studentAttendance: [String],
    feedbacks: [{
        name: { type: String, default: "" },
        rating: { type: Number, default: 5 },
        comments: { type: String, default: "" },
        submittedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Workshop || mongoose.model("Workshop", workshopSchema);
