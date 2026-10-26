const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    title: { type: String, required: true },
    submissionType: { 
        type: String, 
        required: true,
        enum: [
            "Course File",
            "Syllabus Coverage / Compliance Report",
            "Laboratory Manual",
            "Continuous Internal Evaluation (CIE) Summary",
            "Research Grant Proposal",
            "Examination Duty & Invigilation Report",
            "Academic Audit Report",
            "Event / Workshop Proposal",
            "Administrative & Committee Report",
            "Leave Handover Documentation",
            "Other Academic Submission"
        ],
        default: "Course File"
    },
    academicYear: { type: String, default: "2026-2027" },
    submissionDate: { type: String, required: true },
    documentFile: { type: String, default: "" }, // Base64 or URL
    fileName: { type: String, default: "" },
    status: { 
        type: String, 
        enum: ["Draft", "Submitted", "Under Review", "Approved", "Rejected"], 
        default: "Submitted" 
    },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewerName: { type: String, default: "" },
    reviewerRole: { type: String, default: "" },
    reviewerRemarks: { type: String, default: "" },
    description: { type: String, default: "" }
}, {
    timestamps: true
});

submissionSchema.index({ organizationId: 1, facultyId: 1, academicYear: 1 });
submissionSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
