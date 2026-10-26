const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const User = require("../models/User");
const { authenticateUser } = require("./authMiddleware");

// ================= GET SUBMISSIONS =================
// GET /api/submissions
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = {};

        if (role === "Faculty") {
            query.facultyId = req.user._id;
        } else if (role === "HOD") {
            const memberIds = await User.find({ departmentId: req.user.departmentId }).distinct("_id");
            query.facultyId = { $in: memberIds };
        } else {
            // Principal / Admin
            if (organizationId) {
                query.organizationId = organizationId;
            }
        }

        // Support target faculty filtering (for Principal & HOD inspection)
        const filterUserId = req.query.targetUserId || req.query.userId;
        if (filterUserId && filterUserId !== "all" && role !== "Faculty") {
            query.facultyId = filterUserId;
        }

        // Filter by submission status
        if (req.query.status && req.query.status !== "All" && req.query.status !== "all") {
            query.status = req.query.status;
        }

        // Filter by submission type
        if (req.query.submissionType && req.query.submissionType !== "All" && req.query.submissionType !== "all") {
            query.submissionType = req.query.submissionType;
        }

        // Filter by academic year
        if (req.query.academicYear && req.query.academicYear !== "All" && req.query.academicYear !== "all") {
            query.academicYear = req.query.academicYear;
        }

        // Search query
        if (req.query.search) {
            const sRegex = new RegExp(req.query.search, "i");
            query.$or = [
                { title: sRegex },
                { submissionType: sRegex },
                { description: sRegex },
                { reviewerRemarks: sRegex },
                { fileName: sRegex }
            ];
        }

        const submissions = await Submission.find(query)
            .populate("facultyId", "name email department designation")
            .populate("reviewerId", "name email role designation")
            .sort({ updatedAt: -1, createdAt: -1 });

        res.json({
            success: true,
            total: submissions.length,
            submissions
        });
    } catch (err) {
        console.error("Fetch submissions error:", err);
        res.status(500).json({ error: "Failed to load submissions ❌" });
    }
});

// ================= GET SINGLE SUBMISSION =================
// GET /api/submissions/:id
router.get("/:id", authenticateUser, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id)
            .populate("facultyId", "name email department designation")
            .populate("reviewerId", "name email role designation");

        if (!submission) {
            return res.status(404).json({ error: "Submission not found ❌" });
        }

        // Access check
        if (req.user.role === "Faculty" && String(submission.facultyId._id || submission.facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied ❌" });
        }

        res.json({ success: true, submission });
    } catch (err) {
        console.error("Fetch single submission error:", err);
        res.status(500).json({ error: "Failed to retrieve submission details ❌" });
    }
});

// ================= POST CREATE SUBMISSION =================
// POST /api/submissions
router.post("/", authenticateUser, async (req, res) => {
    try {
        const {
            title,
            submissionType,
            academicYear,
            submissionDate,
            documentFile,
            fileName,
            status,
            description
        } = req.body;

        if (!title || !submissionType) {
            return res.status(400).json({ error: "Submission title and submission type are required ❌" });
        }

        const resolvedStatus = status === "Draft" ? "Draft" : "Submitted";
        const finalDate = submissionDate || new Date().toISOString().split("T")[0];

        const newSubmission = new Submission({
            organizationId: req.user.organizationId,
            facultyId: req.user._id,
            departmentId: req.user.departmentId || null,
            title,
            submissionType,
            academicYear: academicYear || "2026-2027",
            submissionDate: finalDate,
            documentFile: documentFile || "",
            fileName: fileName || "Supporting_Document.pdf",
            status: resolvedStatus,
            description: description || ""
        });

        await newSubmission.save();

        // Notification for department HOD if submitted
        if (resolvedStatus === "Submitted") {
            try {
                const { notifyDepartmentHOD } = require("../services/realtimeNotifications");
                await notifyDepartmentHOD(req.user.organizationId, req.user.departmentId, {
                    title: "New Academic Submission",
                    message: `${req.user.name} submitted "${title}" (${submissionType}) for review.`,
                    type: "approval"
                });
            } catch (notifErr) {
                console.error("Notification trigger error:", notifErr);
            }
        }

        res.json({
            success: true,
            message: resolvedStatus === "Draft" ? "Submission draft saved successfully! 💾" : "Record submitted successfully for review! ✅",
            submission: newSubmission
        });
    } catch (err) {
        console.error("Create submission error:", err);
        res.status(500).json({ error: "Failed to create submission record ❌" });
    }
});

// ================= PUT UPDATE SUBMISSION =================
// PUT /api/submissions/:id
router.put("/:id", authenticateUser, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ error: "Submission record not found ❌" });
        }

        const isOwner = String(submission.facultyId) === String(req.user._id);
        const isPrincipal = req.user.role === "Principal";

        if (!isOwner && !isPrincipal) {
            return res.status(403).json({ error: "Unauthorized: You can only edit your own submissions ❌" });
        }

        // Submissions can be edited if they are in Draft, Submitted, or Rejected (resubmission)
        if (submission.status === "Approved" && !isPrincipal) {
            return res.status(400).json({ error: "Approved submissions are locked and cannot be edited ❌" });
        }

        const {
            title,
            submissionType,
            academicYear,
            submissionDate,
            documentFile,
            fileName,
            status,
            description
        } = req.body;

        if (title) submission.title = title;
        if (submissionType) submission.submissionType = submissionType;
        if (academicYear) submission.academicYear = academicYear;
        if (submissionDate) submission.submissionDate = submissionDate;
        if (documentFile !== undefined) submission.documentFile = documentFile;
        if (fileName !== undefined) submission.fileName = fileName;
        if (description !== undefined) submission.description = description;

        // Allow moving Draft -> Submitted or resubmitting Rejected -> Submitted
        if (status && ["Draft", "Submitted"].includes(status)) {
            submission.status = status;
        }

        await submission.save();

        res.json({
            success: true,
            message: "Submission updated successfully! ✅",
            submission
        });
    } catch (err) {
        console.error("Update submission error:", err);
        res.status(500).json({ error: "Failed to update submission ❌" });
    }
});

// ================= PUT REVIEW SUBMISSION (HOD / PRINCIPAL) =================
// PUT /api/submissions/:id/review
router.put("/:id/review", authenticateUser, async (req, res) => {
    if (req.user.role !== "Principal" && req.user.role !== "HOD") {
        return res.status(403).json({ error: "Access denied: Only HOD or Principal can review submissions ❌" });
    }

    try {
        const { status, remarks } = req.body;

        if (!["Under Review", "Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ error: "Invalid review status code ❌" });
        }

        if (status === "Rejected" && !remarks) {
            return res.status(400).json({ error: "Remarks are mandatory when rejecting or requesting correction ❌" });
        }

        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ error: "Submission not found ❌" });
        }

        submission.status = status;
        submission.reviewerId = req.user._id;
        submission.reviewerName = req.user.name;
        submission.reviewerRole = req.user.role;
        submission.reviewerRemarks = remarks || submission.reviewerRemarks;

        await submission.save();

        res.json({
            success: true,
            message: `Submission status marked as ${status}! ✅`,
            submission
        });
    } catch (err) {
        console.error("Review submission error:", err);
        res.status(500).json({ error: "Failed to submit review decision ❌" });
    }
});

// ================= DELETE SUBMISSION =================
// DELETE /api/submissions/:id
router.delete("/:id", authenticateUser, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ error: "Submission not found ❌" });
        }

        const isOwner = String(submission.facultyId) === String(req.user._id);
        const isPrincipal = req.user.role === "Principal";

        if (!isOwner && !isPrincipal) {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own submissions ❌" });
        }

        if (submission.status === "Approved" && !isPrincipal) {
            return res.status(400).json({ error: "Approved submissions cannot be deleted ❌" });
        }

        await Submission.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Submission deleted successfully! 🗑️" });
    } catch (err) {
        console.error("Delete submission error:", err);
        res.status(500).json({ error: "Failed to delete submission ❌" });
    }
});

module.exports = router;
