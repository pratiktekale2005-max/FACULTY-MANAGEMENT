const express = require("express");
const router = express.Router();
const Paper = require("../models/Paper");
const User = require("../models/User");
const Approval = require("../models/Approval");
const { authenticateUser } = require("./authMiddleware");

// ================= GET PAPERS =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = { organizationId };

        const { scope, targetUserId, userId } = req.query;
        const requestedTargetId = targetUserId || userId;

        if (role === "Principal") {
            if (scope === "self" || (requestedTargetId && requestedTargetId.toString() === req.user._id.toString())) {
                // Return strictly Principal's own self research publications
                query.submittedBy = req.user._id;
            } else if (requestedTargetId && requestedTargetId !== "all") {
                query.submittedBy = requestedTargetId;
            } else {
                // Institutional overview: Show faculty & departmental submissions (exclude Principal self papers)
                query.submittedBy = { $ne: req.user._id };
            }
        } else if (role === "HOD") {
            if (scope === "self" || (requestedTargetId && requestedTargetId.toString() === req.user._id.toString())) {
                query.submittedBy = req.user._id;
            } else if (requestedTargetId && requestedTargetId !== "all") {
                query.submittedBy = requestedTargetId;
            } else {
                const memberIds = await User.find({ organizationId, departmentId: req.user.departmentId }).distinct("_id");
                query.submittedBy = { $in: memberIds };
            }
        } else if (role === "Faculty") {
            // Faculty strictly sees only their own papers
            query.submittedBy = req.user._id;
        }

        const papers = await Paper.find(query)
            .populate("submittedBy", "name email department designation")
            .sort({ createdAt: -1 });

        res.json({ papers });
    } catch (err) {
        console.error("Fetch papers error:", err);
        res.status(500).json({ error: "Failed to fetch papers ❌" });
    }
});

// ================= POST CREATE PAPER =================
router.post("/", authenticateUser, async (req, res) => {
    const { 
        title, 
        authors,
        coAuthors,
        journal, 
        conferenceName,
        publicationType,
        publisher,
        issnIsbn,
        doi, 
        date, 
        publicationDate,
        volume,
        issue,
        pageNumbers,
        indexing,
        impactFactor,
        citationCount,
        abstract,
        description, 
        researchArea,
        publicationStatus,
        fileBase64,
        certificateBase64
    } = req.body;

    const finalDate = date || publicationDate || new Date().toISOString().split("T")[0];
    const finalDesc = description || abstract || "Research publication";

    if (!title || (!journal && !conferenceName)) {
        return res.status(400).json({ error: "Paper title and Journal/Conference name are required ❌" });
    }

    try {
        const isPrincipal = req.user.role === "Principal";
        const pubStatus = publicationStatus || "Published";

        const newPaper = new Paper({
            organizationId: req.user.organizationId,
            title,
            authors: authors || req.user.name || "",
            coAuthors: coAuthors || "",
            journal: journal || conferenceName || "Academic Journal",
            conferenceName: conferenceName || "",
            publicationType: publicationType || "Journal Article",
            publisher: publisher || "",
            issnIsbn: issnIsbn || "",
            doi: doi || "",
            date: finalDate,
            publicationDate: finalDate,
            volume: volume || "",
            issue: issue || "",
            pageNumbers: pageNumbers || "",
            indexing: indexing || "Scopus",
            impactFactor: impactFactor || "",
            citationCount: Number(citationCount) || 0,
            abstract: abstract || "",
            description: finalDesc,
            researchArea: researchArea || "",
            publicationStatus: pubStatus,
            fileBase64: fileBase64 || "",
            certificateBase64: certificateBase64 || "",
            submittedBy: req.user._id,
            status: isPrincipal ? "verified" : "pending"
        });

        await newPaper.save();

        // For Principal, publications are auto-verified and do NOT require HOD approval
        if (!isPrincipal) {
            const newApproval = new Approval({
                organizationId: req.user.organizationId,
                entityType: "PUBLICATION",
                entityId: newPaper._id,
                submittedBy: req.user._id,
                departmentId: req.user.departmentId || null,
                status: "SUBMITTED",
                currentLevel: "HOD"
            });
            await newApproval.save();

            // Create HOD notification
            try {
                const Department = require("../models/Department");
                const Notification = require("../models/Notification");
                const dept = await Department.findById(req.user.departmentId);
                if (dept && dept.hodId) {
                    const notif = new Notification({
                        organizationId: req.user.organizationId,
                        userId: dept.hodId,
                        title: "New Publication Submitted",
                        message: `${req.user.name} submitted a new research paper for approval: ${title}`,
                        type: "approval"
                    });
                    await notif.save();
                }
            } catch (notifErr) {
                console.error("Failed to create HOD notification:", notifErr);
            }
        }

        res.json({ 
            message: isPrincipal 
                ? "Research paper successfully published in your profile! ✅" 
                : "Research paper successfully logged in portfolio! ✅", 
            paper: newPaper 
        });
    } catch (err) {
        console.error("Create paper error:", err);
        res.status(500).json({ error: "Failed to log publication ❌" });
    }
});

// ================= PUT UPDATE PAPER =================
router.put("/:id", authenticateUser, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ error: "Research paper not found ❌" });
        }

        // Only author or Principal can edit
        const isAuthor = paper.submittedBy.toString() === req.user._id.toString();
        const isPrincipal = req.user.role === "Principal";
        if (!isAuthor && !isPrincipal) {
            return res.status(403).json({ error: "Unauthorized to edit this paper ❌" });
        }

        const updateData = { ...req.body };
        if (updateData.publicationDate && !updateData.date) {
            updateData.date = updateData.publicationDate;
        }
        if (updateData.abstract && !updateData.description) {
            updateData.description = updateData.abstract;
        }

        // Prevent changing submitter or organization
        delete updateData.submittedBy;
        delete updateData.organizationId;

        const updated = await Paper.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ message: "Research paper updated successfully! ✅", paper: updated });
    } catch (err) {
        console.error("Update paper error:", err);
        res.status(500).json({ error: "Failed to update research paper ❌" });
    }
});

// ================= DELETE PAPER =================
router.delete("/:id", authenticateUser, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) {
            return res.status(404).json({ error: "Research paper not found ❌" });
        }

        const isAuthor = paper.submittedBy.toString() === req.user._id.toString();
        const isPrincipal = req.user.role === "Principal";
        if (!isAuthor && !isPrincipal) {
            return res.status(403).json({ error: "Unauthorized to delete this paper ❌" });
        }

        await Paper.findByIdAndDelete(req.params.id);
        await Approval.deleteMany({ entityId: req.params.id });

        res.json({ message: "Research paper deleted successfully! 🗑️" });
    } catch (err) {
        console.error("Delete paper error:", err);
        res.status(500).json({ error: "Failed to delete research paper ❌" });
    }
});

module.exports = router;


