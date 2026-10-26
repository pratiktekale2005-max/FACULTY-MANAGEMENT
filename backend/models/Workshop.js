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
    guests: [{
        name: { type: String, required: true },
        designation: { type: String, default: "" },
        organization: { type: String, default: "" },
        email: { type: String, default: "" },
        contact: { type: String, default: "" },
        invitationStatus: { type: String, enum: ["Pending", "Sent", "Accepted", "Declined"], default: "Pending" },
        invitationSentAt: { type: Date, default: null },
        thankingStatus: { type: String, enum: ["Pending", "Sent"], default: "Pending" },
        thankingSentAt: { type: Date, default: null }
    }],
    coordinators: [{
        name: { type: String, default: "" },
        designation: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" }
    }],
    workshopType: { 
        type: String, 
        default: "Workshop" 
    },
    speakerResumePath: { type: String, default: "" },
    scannedInvitation: { type: String, default: "" }, // Base64 document / image
    scannedThankingLetter: { type: String, default: "" }, // Base64 document / image
    scannedOfficialLetter: { type: String, default: "" }, // Base64 document / image
    invitationSentAt: { type: Date, default: null },
    thankingSentAt: { type: Date, default: null },
    officialLetterSentAt: { type: Date, default: null },
    photos: [String],
    videos: [String],
    studentAttendance: [String],
    feedbacks: [{
        name: { type: String, default: "" },
        rating: { type: Number, default: 5 },
        comments: { type: String, default: "" },
        category: { type: String, default: "Overall" },
        postAssessmentScore: { type: Number, default: null },
        submittedAt: { type: Date, default: Date.now }
    }],
    postAssessments: [{
        participantName: { type: String, default: "" },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 10 },
        feedback: { type: String, default: "" },
        criteria: { type: String, default: "General" },
        submittedAt: { type: Date, default: Date.now }
    }],
    ranking: {
        score: { type: Number, default: 0 },
        rank: { type: String, default: "" },
        badge: { type: String, default: "" }
    },
    remuneration: {
        guestName: { type: String, default: "" },
        accountHolderName: { type: String, default: "" },
        bankName: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifscCode: { type: String, default: "" },
        branchName: { type: String, default: "" },
        panNumber: { type: String, default: "" },
        contactNumber: { type: String, default: "" },
        lectureHours: { type: Number, default: 0 },
        ratePerHour: { type: Number, default: 0 },
        totalRemuneration: { type: Number, default: 0 },
        otherAmount: { type: Number, default: 0 },
        totalPayable: { type: Number, default: 0 },
        notes: { type: String, default: "" },
        updatedAt: { type: Date, default: Date.now }
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedByName: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    status: { type: String, enum: ["pending", "verified", "rejected", "approved"], default: "pending" },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Workshop || mongoose.model("Workshop", workshopSchema);
