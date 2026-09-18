const express = require("express");
const router = express.Router();
const Workshop = require("../models/Workshop");
const User = require("../models/User");
const Approval = require("../models/Approval");
const { sendInvitationEmail, sendThankingEmail } = require("../services/emailService");
const { authenticateUser, requireRole } = require("./authMiddleware");

// ================= GET WORKSHOPS =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = { organizationId };

        if (role === "HOD") {
            const memberIds = await User.find({ organizationId, departmentId: req.user.departmentId }).distinct("_id");
            query.submittedBy = { $in: memberIds };
        } else if (role === "Faculty") {
            query.submittedBy = req.user._id;
        }

        const filterUserId = req.query.targetUserId || req.query.userId;
        if (filterUserId && filterUserId !== "all" && role !== "Faculty") {
            const mongoose = require("mongoose");
            if (mongoose.Types.ObjectId.isValid(filterUserId)) {
                const targetUser = await User.findOne({ _id: filterUserId, organizationId });
                if (targetUser) {
                    if (role === "HOD" && String(targetUser.departmentId) !== String(req.user.departmentId)) {
                        return res.status(403).json({ error: "Access denied: target user belongs to another department ❌" });
                    }
                    query.submittedBy = targetUser._id;
                }
            }
        }

        const workshops = await Workshop.find(query).populate("submittedBy", "name email department designation");
        res.json({ workshops });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch workshops ❌" });
    }
});

// ================= POST CREATE WORKSHOP =================
router.post("/", authenticateUser, async (req, res) => {
    const { 
        title, 
        description, 
        date, 
        time, 
        speakerName, 
        speakerBio, 
        speakerOrganization, 
        speakerContact, 
        workshopType,
        speakerResumeBase64, // Base64 CV string
        photosBase64 // Array of Base64 strings
    } = req.body;

    const requiredFields = { title, description, date, time, speakerName };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
            const formattedKey = key === "speakerName" ? "Speaker name" : key.charAt(0).toUpperCase() + key.slice(1);
            return res.status(400).json({ error: `${formattedKey} is required ❌` });
        }
    }

    try {
        const newWorkshop = new Workshop({
            organizationId: req.user.organizationId,
            title,
            description,
            date,
            time,
            venue: req.body.venue || "",
            eventType: req.body.eventType || "organized",
            speakerName,
            speakerBio: speakerBio || "",
            speakerOrganization: speakerOrganization || "",
            speakerContact: speakerContact || "",
            guestDesignation: req.body.guestDesignation || "",
            guestOrganization: req.body.guestOrganization || "",
            guestEmail: req.body.guestEmail || "",
            workshopType: workshopType || "Arranged by Self",
            speakerResumePath: speakerResumeBase64 || "", // Holds base64 data URL
            photos: photosBase64 || [], // Array of base64 data URLs
            videos: req.body.videosBase64 || [], // Array of base64 video URLs
            scannedInvitation: req.body.scannedInvitation || "",
            scannedThankingLetter: req.body.scannedThankingLetter || "",
            studentAttendance: [],
            feedbacks: [],
            status: "pending",
            submittedBy: req.user._id,
            department: req.user.department
        });

        await newWorkshop.save();

        const newApproval = new Approval({
            organizationId: req.user.organizationId,
            entityType: "WORKSHOP",
            entityId: newWorkshop._id,
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
                    title: "New Workshop Submitted",
                    message: `${req.user.name} submitted a new workshop for approval: ${title}`,
                    type: "approval"
                });
                await notif.save();
            }
        } catch (notifErr) {
            console.error("Failed to create HOD notification:", notifErr);
        }

        res.json({ message: "Workshop logged successfully for validation ✅", workshop: newWorkshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to log workshop ❌" });
    }
});

// ================= UPDATE WORKSHOP =================
router.put("/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { 
        title, 
        description, 
        date, 
        time, 
        venue,
        speakerName, 
        speakerBio, 
        speakerOrganization, 
        speakerContact, 
        guestDesignation,
        guestOrganization,
        workshopType,
        speakerResumeBase64, // Base64 CV string (if uploaded new)
        photosBase64, // Array of Base64 strings (if uploaded new)
        videosBase64 // Array of Base64 strings (if uploaded new)
    } = req.body;

    const requiredFields = { title, description, date, time, speakerName };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
            const formattedKey = key === "speakerName" ? "Speaker name" : key.charAt(0).toUpperCase() + key.slice(1);
            return res.status(400).json({ error: `${formattedKey} is required ❌` });
        }
    }

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        // Authorization check: only the owner can edit
        if (req.user.role === "Faculty" && String(workshop.submittedBy) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: You can only edit your own workshops ❌" });
        }

        workshop.title = title;
        workshop.description = description;
        workshop.date = date;
        workshop.time = time;
        workshop.venue = venue || "";
        workshop.speakerName = speakerName;
        workshop.speakerBio = speakerBio || "";
        workshop.speakerOrganization = speakerOrganization || "";
        workshop.speakerContact = speakerContact || "";
        workshop.guestDesignation = guestDesignation || "";
        workshop.guestOrganization = guestOrganization || "";
        if (req.body.guestEmail !== undefined) workshop.guestEmail = req.body.guestEmail;
        if (req.body.scannedInvitation !== undefined) workshop.scannedInvitation = req.body.scannedInvitation;
        if (req.body.scannedThankingLetter !== undefined) workshop.scannedThankingLetter = req.body.scannedThankingLetter;
        workshop.workshopType = workshopType || "Arranged by Self";
        workshop.status = "pending"; // Reset status on edit

        if (speakerResumeBase64) {
            workshop.speakerResumePath = speakerResumeBase64;
        }
        if (photosBase64 && photosBase64.length > 0) {
            workshop.photos = photosBase64;
        }
        if (videosBase64 && videosBase64.length > 0) {
            workshop.videos = videosBase64;
        }

        await workshop.save();

        // Reset approval record
        const approval = await Approval.findOne({ entityId: id, entityType: "WORKSHOP" });
        if (approval) {
            approval.status = "SUBMITTED";
            approval.currentLevel = "HOD";
            approval.updatedAt = new Date();
            approval.history.push({
                status: "SUBMITTED",
                actionBy: req.user._id,
                actionByName: req.user.name,
                comment: "Workshop details edited by submitter",
                date: new Date()
            });
            await approval.save();
        }

        res.json({ message: "Workshop updated successfully ✅", workshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update workshop ❌" });
    }
});

// ================= DELETE WORKSHOP =================
router.delete("/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        // Authorization check: only the owner can delete
        if (req.user.role === "Faculty" && String(workshop.submittedBy) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: You can only delete your own workshops ❌" });
        }

        await Workshop.deleteOne({ _id: id });
        await Approval.deleteOne({ entityId: id, entityType: "WORKSHOP" });

        res.json({ message: "Workshop deleted successfully ✅" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete workshop ❌" });
    }
});

// ================= APPROVE/REJECT WORKSHOP (PRINCIPAL ONLY) =================
router.put("/:id/status", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // status: 'verified' | 'rejected'

    if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status code ❌" });
    }

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        workshop.status = status;
        await workshop.save();

        // Sync with the unified Approval record
        const approvalStatus = status === "verified" ? "APPROVED" : "REJECTED";
        const approval = await Approval.findOne({ entityId: id, entityType: "WORKSHOP", organizationId: req.user.organizationId });
        if (approval) {
            approval.status = approvalStatus;
            approval.currentLevel = "COMPLETED";
            approval.updatedAt = new Date();
            approval.history.push({
                status: approvalStatus,
                actionBy: req.user._id,
                actionByName: req.user.name,
                comment: `Status set directly to ${status} by Principal`,
                date: new Date()
            });
            await approval.save();
        }

        // Increment performance score of faculty member slightly on approval
        if (status === "verified") {
            await User.findByIdAndUpdate(workshop.submittedBy, {
                $inc: { performanceScore: 5 }
            });
        }

        res.json({ message: `Workshop status set to ${status} successfully ✅`, workshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update status ❌" });
    }
});

// ================= UPDATE STUDENT ATTENDANCE =================
router.put("/:id/attendance", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { studentAttendance } = req.body; // Array of student roll numbers

    if (!studentAttendance || !Array.isArray(studentAttendance)) {
        return res.status(400).json({ error: "Invalid student attendance list ❌" });
    }

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        workshop.studentAttendance = studentAttendance;
        await workshop.save();
        res.json({ message: "Student attendance sheet updated ✅", workshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save attendance ❌" });
    }
});

// ================= ADD WORKSHOP ASSESSMENT FEEDBACK =================
router.put("/:id/feedback", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { name, rating, comments } = req.body;

    if (!rating || !comments) {
        return res.status(400).json({ error: "Rating and comments are required ❌" });
    }

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        workshop.feedbacks.push({
            name: name || "Anonymous Student",
            rating: Number(rating) || 5,
            comments,
            submittedAt: new Date()
        });

        await workshop.save();
        res.json({ message: "Feedback submitted successfully ✅", workshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit feedback ❌" });
    }
});

// ================= SEND INVITATION EMAIL =================
router.post("/:id/send-invitation", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { guestEmail, customHtml, attachmentBase64 } = req.body;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId }).populate("submittedBy", "name department email");
        if (!workshop) {
            return res.status(404).json({ error: "Workshop / Seminar not found ❌" });
        }

        const emailToSend = guestEmail || workshop.guestEmail;
        if (!emailToSend) {
            return res.status(400).json({ error: "Guest email is required to send invitation ❌" });
        }

        // Send Email
        const result = await sendInvitationEmail({
            guestEmail: emailToSend,
            guestName: workshop.speakerName,
            eventTitle: workshop.title,
            eventType: workshop.workshopType && workshop.workshopType.toLowerCase().includes("seminar") ? "Seminar" : "Workshop",
            date: workshop.date ? new Date(workshop.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "",
            time: workshop.time || "",
            venue: workshop.venue || "Campus Hall",
            organizerName: workshop.submittedBy ? workshop.submittedBy.name : req.user.name,
            deptName: workshop.department || req.user.department,
            institutionName: "EduCRM Academic Portal",
            customHtml: customHtml || undefined,
            attachmentBase64: attachmentBase64 || workshop.scannedInvitation || undefined
        });

        workshop.guestEmail = emailToSend;
        workshop.invitationSentAt = new Date();
        if (attachmentBase64) {
            workshop.scannedInvitation = attachmentBase64;
        }
        await workshop.save();

        res.json({
            message: "Invitation letter dispatched to guest speaker successfully 📧✅",
            workshop,
            result
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Failed to dispatch invitation email ❌" });
    }
});

// ================= SEND THANKING EMAIL =================
router.post("/:id/send-thanking", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { guestEmail, customHtml, attachmentBase64 } = req.body;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId }).populate("submittedBy", "name department email");
        if (!workshop) {
            return res.status(404).json({ error: "Workshop / Seminar not found ❌" });
        }

        const emailToSend = guestEmail || workshop.guestEmail;
        if (!emailToSend) {
            return res.status(400).json({ error: "Guest email is required to send thanking letter ❌" });
        }

        // Send Email
        const result = await sendThankingEmail({
            guestEmail: emailToSend,
            guestName: workshop.speakerName,
            eventTitle: workshop.title,
            eventType: workshop.workshopType && workshop.workshopType.toLowerCase().includes("seminar") ? "Seminar" : "Workshop",
            date: workshop.date ? new Date(workshop.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "",
            organizerName: workshop.submittedBy ? workshop.submittedBy.name : req.user.name,
            deptName: workshop.department || req.user.department,
            institutionName: "EduCRM Academic Portal",
            customHtml: customHtml || undefined,
            attachmentBase64: attachmentBase64 || workshop.scannedThankingLetter || undefined
        });

        workshop.guestEmail = emailToSend;
        workshop.thankingSentAt = new Date();
        if (attachmentBase64) {
            workshop.scannedThankingLetter = attachmentBase64;
        }
        await workshop.save();

        res.json({
            message: "Thanking / appreciation letter dispatched to guest speaker successfully 📧✅",
            workshop,
            result
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Failed to dispatch thanking email ❌" });
    }
});

// ================= SCAN / UPLOAD LETTER =================
router.put("/:id/scan", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { type, scannedImageBase64 } = req.body; // type: 'invitation' | 'thanking'

    if (!type || !["invitation", "thanking"].includes(type)) {
        return res.status(400).json({ error: "Letter type ('invitation' or 'thanking') is required ❌" });
    }

    if (!scannedImageBase64) {
        return res.status(400).json({ error: "Scanned document data is required ❌" });
    }

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop / Seminar not found ❌" });
        }

        if (type === "invitation") {
            workshop.scannedInvitation = scannedImageBase64;
        } else {
            workshop.scannedThankingLetter = scannedImageBase64;
        }

        await workshop.save();
        res.json({
            message: `Scanned ${type} letter saved successfully ✅`,
            workshop
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save scanned letter ❌" });
    }
});

module.exports = router;

