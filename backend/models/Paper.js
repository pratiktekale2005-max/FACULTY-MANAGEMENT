const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    authors: { type: String, default: "" }, // All authors
    coAuthors: { type: String, default: "" }, // Legacy / co-authors
    journal: { type: String, default: "" }, // Journal name
    conferenceName: { type: String, default: "" }, // Conference name (if applicable)
    publicationType: { type: String, default: "Journal Article" }, // Journal Article, Conference Proceeding, Book Chapter, etc.
    publisher: { type: String, default: "" },
    issnIsbn: { type: String, default: "" },
    doi: { type: String, default: "" },
    date: { type: String, required: true }, // Publication Date
    publicationDate: { type: String, default: "" },
    volume: { type: String, default: "" },
    issue: { type: String, default: "" },
    pageNumbers: { type: String, default: "" },
    indexing: { type: String, default: "Scopus" }, // Scopus, SCI, Web of Science, UGC CARE, etc.
    impactFactor: { type: String, default: "" },
    citationCount: { type: Number, default: 0 },
    abstract: { type: String, default: "" },
    description: { type: String, default: "" },
    researchArea: { type: String, default: "" },
    publicationStatus: { 
        type: String, 
        enum: ["Published", "Accepted", "Under Review", "pending", "verified", "rejected", "returned"], 
        default: "Published" 
    },
    fileBase64: { type: String, default: "" }, // Supporting Document Upload (PDF)
    certificateBase64: { type: String, default: "" }, // Certificate / Proof Upload (optional)
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { 
        type: String, 
        enum: ["pending", "verified", "rejected", "returned", "Published", "Accepted", "Under Review"], 
        default: "pending" 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Paper || mongoose.model("Paper", paperSchema);

