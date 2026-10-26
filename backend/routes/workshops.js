const express = require("express");
const router = express.Router();
const Workshop = require("../models/Workshop");
const User = require("../models/User");
const Approval = require("../models/Approval");
const Organization = require("../models/Organization");
const Department = require("../models/Department");
const OfficialLetter = require("../models/OfficialLetter");
const { sendInvitationEmail, sendThankingEmail, sendWorkshopApprovalEmail, sendOfficialLetterEmail, sendWorkshopRequestToHOD } = require("../services/emailService");
const { generateLetterPdf, generateRemunerationPdf, generateWorkshopSummaryPdf } = require("../services/letterPdfService");
const { authenticateUser, requireRole } = require("./authMiddleware");

// ================= GET WORKSHOPS =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = { organizationId };

        if (role === "HOD") {
            const memberIds = await User.find({
                organizationId,
                $or: [
                    { departmentId: req.user.departmentId },
                    { department: req.user.department },
                    { _id: req.user._id }
                ]
            }).distinct("_id");
            query.$or = [
                { submittedBy: { $in: memberIds } },
                { department: req.user.department }
            ];
        } else if (role === "Faculty") {
            query.$or = [
                { submittedBy: req.user._id },
                { department: req.user.department }
            ];
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
        const formatted = workshops.map(w => {
            const doc = w.toObject();
            if (!doc.guests || doc.guests.length === 0) {
                if (doc.speakerName) {
                    doc.guests = [{
                        _id: doc._id,
                        name: doc.speakerName,
                        designation: doc.guestDesignation || doc.speakerBio || "",
                        organization: doc.guestOrganization || doc.speakerOrganization || "",
                        email: doc.guestEmail || "",
                        contact: doc.speakerContact || "",
                        invitationStatus: doc.invitationSentAt ? "Sent" : "Pending",
                        invitationSentAt: doc.invitationSentAt || null,
                        thankingStatus: doc.thankingSentAt ? "Sent" : "Pending",
                        thankingSentAt: doc.thankingSentAt || null
                    }];
                } else {
                    doc.guests = [];
                }
            }
            return doc;
        });
        res.json({ workshops: formatted });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch workshops ❌" });
    }
});

// ================= GET SINGLE WORKSHOP =================
router.get("/:id", authenticateUser, async (req, res) => {
    try {
        const workshop = await Workshop.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
            .populate("submittedBy", "name email department designation");
        if (!workshop) {
            return res.status(404).json({ error: "Event record not found ❌" });
        }
        const doc = workshop.toObject();
        if (!doc.guests || doc.guests.length === 0) {
            if (doc.speakerName) {
                doc.guests = [{
                    _id: doc._id,
                    name: doc.speakerName,
                    designation: doc.guestDesignation || doc.speakerBio || "",
                    organization: doc.guestOrganization || doc.speakerOrganization || "",
                    email: doc.guestEmail || "",
                    contact: doc.speakerContact || "",
                    invitationStatus: doc.invitationSentAt ? "Sent" : "Pending",
                    invitationSentAt: doc.invitationSentAt || null,
                    thankingStatus: doc.thankingSentAt ? "Sent" : "Pending",
                    thankingSentAt: doc.thankingSentAt || null
                }];
            } else {
                doc.guests = [];
            }
        }
        res.json({ workshop: doc });
    } catch (err) {
        console.error("Fetch single workshop error:", err);
        res.status(500).json({ error: "Failed to fetch event details ❌" });
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

        // Real-Time Notification for HOD
        try {
            const { notifyDepartmentHOD } = require("../services/realtimeNotifications");
            await notifyDepartmentHOD(req.user.organizationId, req.user.departmentId, {
                title: "New Workshop Submitted",
                message: `${req.user.name} submitted a new workshop for review: "${title}"`,
                type: "approval",
                category: "Workshop",
                senderName: req.user.name,
                senderRole: req.user.role,
                targetTab: "events"
            });
        } catch (notifErr) {
            console.error("Failed to create HOD notification:", notifErr);
        }

        // Look up Department HOD to send email notification (Requirement 4)
        try {
            const hodUser = await User.findOne({
                role: "HOD",
                $or: [
                    { department: req.user.department },
                    { departmentId: req.user.departmentId }
                ]
            });

            if (hodUser && hodUser.email) {
                sendWorkshopRequestToHOD({
                    hodEmail: hodUser.email,
                    hodName: hodUser.name,
                    facultyName: req.user.name || "Faculty Member",
                    department: req.user.department || "",
                    workshopTitle: title,
                    workshopType: workshopType || "Workshop",
                    date: date ? new Date(date).toLocaleDateString() : "",
                    time: time || "",
                    venue: venue || "",
                    speakerName: speakerName || "",
                    description: description || ""
                }).catch(e => console.error("Async workshop email error to HOD:", e));
            }
        } catch (emailLookupErr) {
            console.error("Failed to route workshop email to HOD:", emailLookupErr);
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

// ================= UPLOAD EVENT PHOTOS =================
router.post("/:id/photos", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { photosBase64 } = req.body;

    if (!photosBase64 || !Array.isArray(photosBase64) || photosBase64.length === 0) {
        return res.status(400).json({ error: "Please select at least one valid image to upload ❌" });
    }

    // Validate image format and size (<5MB each)
    const validPhotos = [];
    for (const photo of photosBase64) {
        if (typeof photo !== "string" || !photo.startsWith("data:image/")) {
            return res.status(400).json({ error: "Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP ❌" });
        }
        const sizeInBytes = Math.round((photo.length * 3) / 4);
        if (sizeInBytes > 5 * 1024 * 1024) {
            return res.status(400).json({ error: "Image file size exceeds 5MB limit. Please compress before uploading ❌" });
        }
        validPhotos.push(photo);
    }

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Event record not found ❌" });
        }

        if (req.user.role === "Faculty" && String(workshop.submittedBy) !== String(req.user._id) && workshop.department !== req.user.department) {
            return res.status(403).json({ error: "Access denied: Unauthorized to upload photos for this event ❌" });
        }

        if (!Array.isArray(workshop.photos)) {
            workshop.photos = [];
        }

        workshop.photos.push(...validPhotos);
        await workshop.save();

        res.json({ 
            message: `${validPhotos.length} photo${validPhotos.length > 1 ? "s" : ""} uploaded successfully! 📸✅`, 
            workshop, 
            photos: workshop.photos 
        });
    } catch (err) {
        console.error("Upload event photos error:", err);
        res.status(500).json({ error: "Failed to upload event photos ❌" });
    }
});

// ================= DELETE EVENT PHOTO =================
router.delete("/:id/photos/:photoIndex", authenticateUser, async (req, res) => {
    const { id, photoIndex } = req.params;
    const index = parseInt(photoIndex, 10);

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Event record not found ❌" });
        }

        if (req.user.role === "Faculty" && String(workshop.submittedBy) !== String(req.user._id) && workshop.department !== req.user.department) {
            return res.status(403).json({ error: "Access denied: Unauthorized to delete photos for this event ❌" });
        }

        if (!Array.isArray(workshop.photos) || isNaN(index) || index < 0 || index >= workshop.photos.length) {
            return res.status(400).json({ error: "Invalid photo index ❌" });
        }

        workshop.photos.splice(index, 1);
        await workshop.save();

        res.json({ message: "Photo deleted successfully! 🗑️✅", workshop, photos: workshop.photos });
    } catch (err) {
        console.error("Delete photo error:", err);
        res.status(500).json({ error: "Failed to delete photo ❌" });
    }
});

// ================= ADD GUEST TO EVENT =================
router.post("/:id/guests", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { name, designation, organization, email, contact } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Guest name is required ❌" });
    }

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Event record not found ❌" });
        }

        if (req.user.role === "Faculty" && String(workshop.submittedBy) !== String(req.user._id) && workshop.department !== req.user.department) {
            return res.status(403).json({ error: "Access denied: You are not authorized to manage guests for this event ❌" });
        }

        if (!Array.isArray(workshop.guests)) {
            workshop.guests = [];
        }

        const newGuest = {
            name: name.trim(),
            designation: designation || "",
            organization: organization || "",
            email: email ? email.trim().toLowerCase() : "",
            contact: contact ? contact.trim() : "",
            invitationStatus: "Pending",
            invitationSentAt: null,
            thankingStatus: "Pending",
            thankingSentAt: null
        };

        workshop.guests.push(newGuest);

        // Sync primary speaker if first guest
        if (workshop.guests.length === 1 || !workshop.speakerName) {
            workshop.speakerName = newGuest.name;
            workshop.guestDesignation = newGuest.designation;
            workshop.guestOrganization = newGuest.organization;
            workshop.guestEmail = newGuest.email;
            workshop.speakerContact = newGuest.contact;
        }

        await workshop.save();
        res.status(201).json({ 
            message: "Guest added successfully! 👤✅", 
            workshop, 
            guest: workshop.guests[workshop.guests.length - 1] 
        });
    } catch (err) {
        console.error("Add guest error:", err);
        res.status(500).json({ error: "Failed to add guest ❌" });
    }
});

// ================= EDIT GUEST DETAILS =================
router.put("/:id/guests/:guestId", authenticateUser, async (req, res) => {
    const { id, guestId } = req.params;
    const { name, designation, organization, email, contact, invitationStatus, thankingStatus } = req.body;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Event record not found ❌" });
        }

        if (req.user.role === "Faculty" && String(workshop.submittedBy) !== String(req.user._id) && workshop.department !== req.user.department) {
            return res.status(403).json({ error: "Access denied: You are not authorized to manage guests for this event ❌" });
        }

        if (!Array.isArray(workshop.guests)) {
            workshop.guests = [];
        }

        let guest = workshop.guests.id(guestId);
        if (!guest && String(workshop._id) === String(guestId)) {
            // First time editing synthesized primary guest: insert as real guest
            workshop.guests.push({
                name: name ? name.trim() : workshop.speakerName,
                designation: designation !== undefined ? designation : workshop.guestDesignation,
                organization: organization !== undefined ? organization : workshop.guestOrganization,
                email: email !== undefined ? email.trim().toLowerCase() : workshop.guestEmail,
                contact: contact !== undefined ? contact.trim() : workshop.speakerContact,
                invitationStatus: invitationStatus || (workshop.invitationSentAt ? "Sent" : "Pending"),
                thankingStatus: thankingStatus || (workshop.thankingSentAt ? "Sent" : "Pending")
            });
            guest = workshop.guests[workshop.guests.length - 1];
        } else if (!guest) {
            return res.status(404).json({ error: "Guest not found in event ❌" });
        }

        if (name) guest.name = name.trim();
        if (designation !== undefined) guest.designation = designation;
        if (organization !== undefined) guest.organization = organization;
        if (email !== undefined) guest.email = email.trim().toLowerCase();
        if (contact !== undefined) guest.contact = contact.trim();
        if (invitationStatus) guest.invitationStatus = invitationStatus;
        if (thankingStatus) guest.thankingStatus = thankingStatus;

        // If primary guest, sync to top-level workshop fields
        if (workshop.guests.length > 0 && String(workshop.guests[0]._id) === String(guest._id)) {
            workshop.speakerName = guest.name;
            workshop.guestDesignation = guest.designation;
            workshop.guestOrganization = guest.organization;
            workshop.guestEmail = guest.email;
            workshop.speakerContact = guest.contact;
        }

        await workshop.save();
        res.json({ message: "Guest details updated successfully! ✅", workshop, guest });
    } catch (err) {
        console.error("Update guest error:", err);
        res.status(500).json({ error: "Failed to update guest ❌" });
    }
});

// ================= REMOVE GUEST FROM EVENT =================
router.delete("/:id/guests/:guestId", authenticateUser, async (req, res) => {
    const { id, guestId } = req.params;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Event record not found ❌" });
        }

        if (req.user.role === "Faculty" && String(workshop.submittedBy) !== String(req.user._id) && workshop.department !== req.user.department) {
            return res.status(403).json({ error: "Access denied: You are not authorized to manage guests for this event ❌" });
        }

        const initialCount = (workshop.guests || []).length;
        workshop.guests = (workshop.guests || []).filter(g => String(g._id) !== String(guestId));

        if (workshop.guests.length === initialCount && String(workshop._id) === String(guestId)) {
            // Clearing the only synthesized guest
            workshop.speakerName = "Guest Speaker";
            workshop.guestEmail = "";
        } else if (workshop.guests.length > 0) {
            workshop.speakerName = workshop.guests[0].name;
            workshop.guestDesignation = workshop.guests[0].designation;
            workshop.guestOrganization = workshop.guests[0].organization;
            workshop.guestEmail = workshop.guests[0].email;
            workshop.speakerContact = workshop.guests[0].contact;
        }

        await workshop.save();
        res.json({ message: "Guest removed successfully! 🗑️✅", workshop });
    } catch (err) {
        console.error("Remove guest error:", err);
        res.status(500).json({ error: "Failed to remove guest ❌" });
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

// ================= APPROVE/REJECT WORKSHOP (HOD ONLY) =================
router.put("/:id/status", requireRole(["HOD"]), async (req, res) => {
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

        // HOD permission check: only approve within their department
        if (req.user.role === "HOD") {
            if (req.user.department && workshop.department && req.user.department !== workshop.department) {
                return res.status(403).json({ error: "Access denied: You can only approve workshops in your own department ❌" });
            }
        }

        workshop.status = status;
        if (status === "verified") {
            workshop.approvedBy = req.user._id;
            workshop.approvedByName = req.user.name;
            workshop.approvedAt = new Date();
        }
        await workshop.save();

        // Sync with unified Approval record
        const approvalStatus = status === "verified" ? (req.user.role === "HOD" ? "HOD_APPROVED" : "APPROVED") : "REJECTED";
        const approval = await Approval.findOne({ entityId: id, entityType: "WORKSHOP", organizationId: req.user.organizationId });
        if (approval) {
            approval.status = approvalStatus;
            approval.currentLevel = req.user.role === "HOD" ? "PRINCIPAL" : "COMPLETED";
            approval.updatedAt = new Date();
            approval.history.push({
                status: approvalStatus,
                actionBy: req.user._id,
                actionByName: req.user.name,
                comment: `Status set directly to ${status} by ${req.user.name} (${req.user.role})`,
                date: new Date()
            });
            await approval.save();
        }

        // Increment performance score of faculty member slightly on approval
        if (status === "verified") {
            await User.findByIdAndUpdate(workshop.submittedBy, {
                $inc: { performanceScore: 5 }
            });

            // Automatically send approval email to the faculty member
            try {
                const faculty = await User.findById(workshop.submittedBy);
                const org = await Organization.findById(req.user.organizationId);
                if (faculty && faculty.email) {
                    sendWorkshopApprovalEmail({
                        facultyEmail: faculty.email,
                        facultyName: faculty.name,
                        workshopTitle: workshop.title,
                        workshopDate: workshop.date,
                        time: workshop.time,
                        venue: workshop.venue,
                        speakerName: workshop.speakerName,
                        hodName: req.user.name,
                        departmentName: workshop.department,
                        approvalDate: new Date(),
                        institutionName: org?.name
                    }).catch(e => console.error("Async approval email error:", e));
                }
            } catch (emailErr) {
                console.error("Error dispatching workshop approval email:", emailErr);
            }
        }

        // Real-Time Notification to submitting faculty
        try {
            const { createAndDispatchNotification } = require("../services/realtimeNotifications");
            await createAndDispatchNotification({
                organizationId: req.user.organizationId,
                userId: workshop.submittedBy,
                title: status === "verified" ? "Workshop Approved ✅" : "Workshop Rejected ❌",
                message: `Your workshop "${workshop.title}" was ${status === "verified" ? "approved" : "rejected"} by HOD ${req.user.name}.`,
                type: status === "verified" ? "approval" : "warning",
                category: "Workshop",
                senderName: req.user.name,
                senderRole: req.user.role,
                targetTab: "events"
            });
        } catch (notifErr) {
            console.error("Failed to notify faculty of workshop decision:", notifErr);
        }

        const populatedWorkshop = await Workshop.findById(workshop._id).populate("submittedBy", "name email department designation");
        res.json({ message: `Workshop status set to ${status} successfully by ${req.user.name}! ✅`, workshop: populatedWorkshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update status ❌" });
    }
});

// ================= UPDATE REMUNERATION DETAILS =================
router.put("/:id/remuneration", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const {
        guestName,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        branchName,
        panNumber,
        contactNumber,
        lectureHours,
        ratePerHour,
        totalRemuneration,
        otherAmount,
        totalPayable,
        notes
    } = req.body;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        const hours = Number(lectureHours) || 0;
        const rate = Number(ratePerHour) || 0;
        const other = Number(otherAmount) || 0;
        const calculatedRemuneration = totalRemuneration !== undefined && totalRemuneration !== "" ? Number(totalRemuneration) : (hours * rate);
        const calculatedTotal = totalPayable !== undefined && totalPayable !== "" ? Number(totalPayable) : (calculatedRemuneration + other);

        workshop.remuneration = {
            guestName: guestName || workshop.speakerName || "",
            accountHolderName: accountHolderName || guestName || workshop.speakerName || "",
            bankName: bankName || "",
            accountNumber: accountNumber || "",
            ifscCode: ifscCode ? ifscCode.toUpperCase().trim() : "",
            branchName: branchName || "",
            panNumber: panNumber ? panNumber.toUpperCase().trim() : "",
            contactNumber: contactNumber || workshop.speakerContact || "",
            lectureHours: hours,
            ratePerHour: rate,
            totalRemuneration: calculatedRemuneration,
            otherAmount: other,
            totalPayable: calculatedTotal,
            notes: notes || "",
            updatedAt: new Date()
        };

        await workshop.save();
        res.json({ message: "Remuneration details saved successfully! 💰✅", workshop });
    } catch (err) {
        console.error("Save remuneration error:", err);
        res.status(500).json({ error: "Failed to save remuneration details ❌" });
    }
});

// ================= GENERATE REMUNERATION REPORT PDF =================
router.post("/:id/generate-remuneration-pdf", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { remunerationData } = req.body;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId })
            .populate("submittedBy", "name email department designation");
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        const org = await Organization.findById(req.user.organizationId);
        const hodUser = await User.findOne({
            organizationId: req.user.organizationId,
            role: "HOD",
            $or: [
                { departmentId: req.user.departmentId },
                { department: workshop.department }
            ]
        });
        const principalUser = await User.findOne({
            organizationId: req.user.organizationId,
            role: "Principal"
        });

        const rem = remunerationData || workshop.remuneration || {};

        const payload = {
            institutionName: org?.name || "EduCRM Academic Institution of Technology",
            institutionAddress: org?.address || "Campus Educational Complex",
            institutionMotto: org?.settings?.branding?.motto || "Excellence in Academic Research & Innovation",
            departmentName: workshop.department || "Academic Department",
            voucherNo: `REM/${new Date().getFullYear()}/${workshop._id.toString().slice(-4).toUpperCase()}`,
            reportDate: new Date().toISOString().split("T")[0],
            
            guestName: rem.guestName || workshop.speakerName || "Guest Resource Person",
            guestDesignation: workshop.guestDesignation || workshop.speakerBio || "Guest Expert",
            guestOrg: workshop.guestOrganization || workshop.speakerOrganization || "Tech Enterprise / University",
            eventTitle: workshop.title || "Academic Workshop Session",
            eventDate: workshop.date ? new Date(workshop.date).toISOString().split("T")[0] : "",
            lectureDetails: workshop.description ? workshop.description.slice(0, 100) : "Guest Lecture & Hands-on Session",
            lectureHours: rem.lectureHours || 3,
            ratePerHour: rem.ratePerHour || 2000,
            totalRemuneration: rem.totalRemuneration || ((rem.lectureHours || 3) * (rem.ratePerHour || 2000)),
            otherAmount: rem.otherAmount || 0,
            totalPayable: rem.totalPayable || (rem.totalRemuneration || 6000),
            
            accountHolderName: rem.accountHolderName || rem.guestName || workshop.speakerName || "",
            bankName: rem.bankName || "—",
            accountNumber: rem.accountNumber || "—",
            ifscCode: rem.ifscCode || "—",
            branchName: rem.branchName || "—",
            panNumber: rem.panNumber || "—",
            contactNumber: rem.contactNumber || workshop.speakerContact || "",
            
            organizerName: workshop.submittedBy ? workshop.submittedBy.name : req.user.name,
            hodName: hodUser ? hodUser.name : (workshop.approvedByName || "Head of Department"),
            principalName: principalUser ? principalUser.name : "Principal & Director"
        };

        const pdfBuffer = await generateRemunerationPdf(payload);
        const base64Str = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
        const filename = `Remuneration_Report_${(payload.guestName || "Speaker").replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`;

        res.json({
            success: true,
            pdfBase64: base64Str,
            filename
        });
    } catch (err) {
        console.error("Remuneration PDF generation failed:", err);
        res.status(500).json({ error: err.message || "Failed to generate remuneration report PDF ❌" });
    }
});

// ================= POST ASSESSMENT & RANKING =================
router.post("/:id/post-assessment", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { participantName, score, maxScore, comments, criteria, rating } = req.body;

    try {
        const workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!workshop) {
            return res.status(404).json({ error: "Workshop not found ❌" });
        }

        const assessmentScore = Number(score) || Number(rating) || 5;
        const max = Number(maxScore) || 5;

        const assessmentItem = {
            participantName: participantName || "Anonymous Participant",
            score: assessmentScore,
            maxScore: max,
            feedback: comments || "Session successfully evaluated",
            criteria: criteria || "General Content & Delivery",
            submittedAt: new Date()
        };

        if (!workshop.postAssessments) workshop.postAssessments = [];
        workshop.postAssessments.push(assessmentItem);
        
        // Also mirror into feedbacks for unified rating aggregation
        if (!workshop.feedbacks) workshop.feedbacks = [];
        workshop.feedbacks.push({
            name: participantName || "Anonymous Participant",
            rating: Math.min(5, Math.max(1, Math.round(assessmentScore))),
            comments: comments || criteria || "Post-Assessment evaluation",
            category: criteria || "Overall",
            postAssessmentScore: assessmentScore,
            submittedAt: new Date()
        });

        // Recalculate ranking score
        const avg = workshop.feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / (workshop.feedbacks.length || 1);
        workshop.ranking = {
            score: Number(avg.toFixed(1)),
            rank: avg >= 4.5 ? "Tier 1 - Exemplary" : (avg >= 3.5 ? "Tier 2 - Good" : "Tier 3 - Standard"),
            badge: avg >= 4.5 ? "Gold Ribbon" : (avg >= 3.5 ? "Silver Standard" : "Bronze")
        };

        await workshop.save();
        res.json({ message: "Post assessment & ranking evaluation saved successfully! ⭐✅", workshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to record post assessment ❌" });
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
    const { name, rating, comments, category, postAssessmentScore } = req.body;

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
            category: category || "Overall",
            postAssessmentScore: postAssessmentScore !== undefined ? Number(postAssessmentScore) : Number(rating),
            submittedAt: new Date()
        });

        // Recalculate ranking score
        const avg = workshop.feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / (workshop.feedbacks.length || 1);
        workshop.ranking = {
            score: Number(avg.toFixed(1)),
            rank: avg >= 4.5 ? "Tier 1 - Exemplary" : (avg >= 3.5 ? "Tier 2 - Good" : "Tier 3 - Standard"),
            badge: avg >= 4.5 ? "Gold Ribbon" : (avg >= 3.5 ? "Silver Standard" : "Bronze")
        };

        await workshop.save();
        res.json({ message: "Feedback and post assessment submitted successfully ✅", workshop });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit feedback ❌" });
    }
});

// ================= GENERATE LETTER PDF =================
router.post("/:id/generate-letter-pdf", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { letterData } = req.body;

    try {
        let workshop = null;
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(id)) {
            workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId }).populate("submittedBy", "name department email designation");
        }

        const sender = {
            userId: req.user._id,
            role: req.user.role,
            name: req.user.name || req.user.fullName || "Faculty Member",
            designation: req.user.designation || (req.user.role === "HOD" ? "Head of Department" : (req.user.role === "Principal" ? "Principal" : "Assistant Professor")),
            department: req.user.department || workshop?.department || "Computer Science & Engineering",
            email: req.user.email
        };

        const deptCode = (sender.department || "DEPT").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

        const payload = {
            institutionName: letterData?.institutionName || "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
            departmentName: sender.department,
            refNo: letterData?.refNo || `DYPCOEI/${deptCode}/${new Date().getFullYear()}/${(workshop?._id || "001").toString().slice(-4).toUpperCase()}`,
            letterDate: letterData?.letterDate || new Date().toISOString().split("T")[0],
            letterType: letterData?.letterType || "invitation",
            recipient: {
                name: letterData?.guestName || workshop?.speakerName || "Distinguished Expert",
                designation: letterData?.guestDesignation || workshop?.guestDesignation || workshop?.speakerBio || "Industry Consultant / Senior Professor",
                organization: letterData?.guestOrg || workshop?.guestOrganization || workshop?.speakerOrganization || "Tech Enterprise / University",
                address: letterData?.guestAddress || ""
            },
            eventDetails: {
                title: letterData?.eventTitle || workshop?.title || "Special Academic Session",
                date: letterData?.eventDate || (workshop?.date ? new Date(workshop.date).toISOString().split("T")[0] : ""),
                time: letterData?.eventTime || workshop?.time || "10:00 AM - 01:00 PM",
                venue: letterData?.eventVenue || workshop?.venue || "Campus Seminar Auditorium",
                mode: workshop?.workshopType || "Offline",
                department: sender.department
            },
            bodyText: letterData?.bodyText || "",
            sender,
            signatory: {
                name: sender.name,
                designation: sender.designation,
                department: sender.department,
                collegeName: "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION"
            },
            signatoryType: letterData?.signatoryType || "single"
        };

        const pdfBuffer = await generateLetterPdf(payload);
        const base64Str = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
        const typePrefix = payload.letterType === "invitation" ? "Invitation" : (payload.letterType === "thanking" ? "Appreciation" : "Official");
        const filename = `${typePrefix}_${(payload.eventDetails.title || "Letter").replace(/\s+/g, "_")}.pdf`;

        res.json({
            success: true,
            pdfBase64: base64Str,
            filename
        });
    } catch (err) {
        console.error("PDF generation failed:", err);
        res.status(500).json({ error: err.message || "Failed to generate letter PDF ❌" });
    }
});

// ================= GENERATE WORKSHOP SUMMARY / REPORT PDF =================
router.post("/:id/generate-summary-report-pdf", authenticateUser, async (req, res) => {
    const { id } = req.params;

    try {
        const workshop = await Workshop.findById(id).populate("submittedBy", "name fullName department designation email");
        if (!workshop) {
            return res.status(404).json({ error: "Workshop record not found ❌" });
        }

        // Fetch Principal details dynamically
        const principalUser = await User.findOne({ role: "Principal" }).select("name fullName");
        const principalName = principalUser ? (principalUser.name || principalUser.fullName) : "Dr. Suresh Mali";

        // Fetch HOD details dynamically
        let hodName = workshop.approvedByName || "Dr. Alpana Adsul";
        if (!workshop.approvedByName && workshop.department) {
            const hodUser = await User.findOne({ role: "HOD", department: workshop.department }).select("name fullName");
            if (hodUser) hodName = hodUser.name || hodUser.fullName;
        }

        const facultyCoordinator = workshop.submittedBy ? (workshop.submittedBy.name || workshop.submittedBy.fullName) : (req.user.name || "Mr. Swami Panjala");

        const pdfBuffer = await generateWorkshopSummaryPdf({
            title: workshop.title,
            department: workshop.department || "Computer Science & Engineering",
            organizer: `Department of ${workshop.department || "CSE"}, DYPCOEI`,
            date: workshop.date,
            time: workshop.time || "11:00 AM – 01:00 PM",
            mode: "Offline",
            venue: workshop.venue || "Seminar Hall / Room No. 206, DYPCOEI",
            typeOfActivity: workshop.workshopType || "Technical Workshop & Student Skill Development",
            speakerName: workshop.speakerName || "Distinguished Resource Person",
            speakerDesignation: workshop.guestDesignation || workshop.speakerBio || "Senior Technical Specialist",
            speakerOrganization: workshop.speakerOrganization || workshop.guestOrganization || "Industry Enterprise",
            facultyCoordinator,
            hodName,
            principalName,
            description: workshop.description || "",
            photos: workshop.photos || [],
            objectives: [
                `To provide hands-on exposure and practical competencies in "${workshop.title}".`,
                "To promote innovation, critical inquiry, and technical competencies among attendees.",
                "To provide an interactive platform for direct engagement with industry experts.",
                "To understand real-world industrial application architectures and best practices.",
                "To align student learning outcomes with contemporary technological demands."
            ],
            outcomes: [
                "Acquired practical conceptual understanding and hands-on exposure.",
                "Gained clarity on modern tools, design patterns, and engineering workflows.",
                "Demonstrated active participant engagement through Q&A and practical challenges.",
                "Identified project and career advancement avenues in the subject domain."
            ],
            postAssessment: workshop.ranking ? {
                averageScore: workshop.ranking.averageScore || "4.8",
                totalResponses: (workshop.postAssessments && workshop.postAssessments.length) ? workshop.postAssessments.length : "45+"
            } : null
        });

        const filename = `Activity_Report_${workshop.title.replace(/\s+/g, "_")}.pdf`;
        res.json({
            success: true,
            pdfBase64: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
            filename
        });
    } catch (err) {
        console.error("Summary report PDF generation failed:", err);
        res.status(500).json({ error: err.message || "Failed to generate official workshop summary report ❌" });
    }
});

// ================= SEND INVITATION EMAIL =================
router.post("/:id/send-invitation", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { 
        guestId,
        guestEmail, 
        recipientEmail,
        guestName,
        customHtml, 
        customMessage, 
        attachmentBase64, 
        attachGeneratedPdf = true, 
        letterData 
    } = req.body;

    try {
        let workshop = null;
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(id)) {
            workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId }).populate("submittedBy", "name department email");
        }
        if (!workshop) {
            workshop = new Workshop({
                organizationId: req.user.organizationId,
                title: letterData?.eventTitle || "Academic Workshop / Guest Lecture",
                description: `Official Academic Event: ${letterData?.eventTitle || "Workshop Lecture"}`,
                date: letterData?.eventDate || new Date(),
                time: letterData?.eventTime || "10:00 AM - 01:00 PM",
                venue: letterData?.eventVenue || "Campus Auditorium",
                speakerName: letterData?.guestName || guestName || "Distinguished Expert",
                speakerBio: letterData?.guestDesignation || "",
                speakerOrganization: letterData?.guestOrg || "",
                guestDesignation: letterData?.guestDesignation || "",
                guestOrganization: letterData?.guestOrg || "",
                guestEmail: recipientEmail || guestEmail || "",
                workshopType: "Arranged by Self",
                status: req.user.role === "Principal" ? "verified" : "pending",
                submittedBy: req.user._id,
                department: req.user.department
            });
            await workshop.save();
        }

        const emailToSend = recipientEmail || guestEmail || workshop.guestEmail;
        if (!emailToSend) {
            return res.status(400).json({ error: "Recipient email is required to send invitation ❌" });
        }

        // Identify target guest if guests array exists
        let targetGuest = null;
        if (workshop.guests && Array.isArray(workshop.guests)) {
            if (guestId) {
                targetGuest = workshop.guests.id ? workshop.guests.id(guestId) : workshop.guests.find(g => g._id?.toString() === guestId.toString());
            }
            if (!targetGuest && emailToSend) {
                targetGuest = workshop.guests.find(g => g.email && g.email.toLowerCase() === emailToSend.toLowerCase());
            }
        }

        const resolvedGuestName = targetGuest?.name || guestName || letterData?.guestName || workshop.speakerName || "Distinguished Expert";
        const resolvedGuestDesignation = targetGuest?.designation || letterData?.guestDesignation || workshop.guestDesignation || workshop.speakerBio || "Industry Consultant / Senior Professor";
        const resolvedGuestOrg = targetGuest?.organization || letterData?.guestOrg || workshop.guestOrganization || workshop.speakerOrganization || "Tech Enterprise / University";

        let finalAttachment = attachmentBase64;

        // Auto-generate official letter PDF if requested or if no physical scan was attached
        if (attachGeneratedPdf || !finalAttachment) {
            try {
                const pdfPayload = {
                    institutionName: letterData?.institutionName || "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
                    departmentName: letterData?.departmentName || workshop.department || req.user.department || "Department of Computer Science & Engineering",
                    refNo: letterData?.refNo || `EDU/${(workshop.department || "DEPT").toUpperCase()}/${new Date().getFullYear()}/${(workshop._id || "001").toString().slice(-4).toUpperCase()}`,
                    letterDate: letterData?.letterDate || new Date().toISOString().split("T")[0],
                    letterType: "invitation",
                    guestName: resolvedGuestName,
                    guestDesignation: resolvedGuestDesignation,
                    guestOrg: resolvedGuestOrg,
                    eventTitle: letterData?.eventTitle || workshop.title || "Special Academic Session",
                    eventDate: letterData?.eventDate || (workshop.date ? new Date(workshop.date).toISOString().split("T")[0] : ""),
                    eventTime: letterData?.eventTime || workshop.time || "10:00 AM - 01:00 PM",
                    eventVenue: letterData?.eventVenue || workshop.venue || "Campus Seminar Auditorium",
                    bodyText: letterData?.bodyText || "",
                    organizerName: letterData?.organizerName || (workshop.submittedBy ? workshop.submittedBy.name : req.user.name),
                    principalName: letterData?.principalName || "Dr. Suresh Mali"
                };
                const pdfBuffer = await generateLetterPdf(pdfPayload);
                finalAttachment = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
                workshop.scannedInvitation = finalAttachment;
            } catch (pdfErr) {
                console.error("PDF auto-generation warning:", pdfErr);
            }
        }

        if (!req.user || !req.user.email) {
            return res.status(401).json({ error: "Authenticated faculty email is required to dispatch invitation ❌" });
        }

        // Fetch full faculty record with emailSettings.appPassword
        const authenticatedFaculty = await User.findById(req.user._id).select("+emailSettings.appPassword");
        if (!authenticatedFaculty) {
            return res.status(401).json({ error: "Authenticated faculty profile not found ❌" });
        }

        const facultySenderEmail = authenticatedFaculty.email;
        const facultySenderName = authenticatedFaculty.name || authenticatedFaculty.fullName || (workshop.submittedBy ? workshop.submittedBy.name : "Faculty Coordinator");

        // Send Email
        const result = await sendInvitationEmail({
            guestEmail: emailToSend,
            guestName: resolvedGuestName,
            eventTitle: workshop.title,
            eventType: workshop.workshopType && workshop.workshopType.toLowerCase().includes("seminar") ? "Seminar" : "Workshop",
            date: workshop.date ? new Date(workshop.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "",
            time: workshop.time || "",
            venue: workshop.venue || "Campus Hall",
            organizerName: facultySenderName,
            deptName: workshop.department || req.user.department,
            institutionName: letterData?.institutionName || "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
            customHtml: customHtml || undefined,
            customMessage: customMessage || undefined,
            attachmentBase64: finalAttachment || workshop.scannedInvitation || undefined,
            senderEmail: facultySenderEmail,
            facultyUser: authenticatedFaculty
        });

        workshop.guestEmail = emailToSend;
        workshop.invitationSentAt = new Date();
        if (targetGuest) {
            targetGuest.invitationStatus = "Sent";
            targetGuest.invitationSentAt = new Date();
        }
        await workshop.save();

        res.json({
            message: `Official invitation message and letter (PDF format) dispatched to ${emailToSend} successfully 📧📄✅`,
            workshop,
            hasPdfAttachment: Boolean(finalAttachment),
            senderEmail: facultySenderEmail,
            authenticatedAs: result.authenticatedAs,
            mode: result.mode,
            result
        });
    } catch (err) {
        console.error(err);
        if (err.code === "FACULTY_EMAIL_NOT_CONFIGURED") {
            return res.status(400).json({
                error: err.message,
                code: "FACULTY_EMAIL_NOT_CONFIGURED",
                facultyEmail: req.user?.email
            });
        }
        res.status(500).json({ error: err.message || "Failed to dispatch invitation email ❌" });
    }
});

// ================= SEND THANKING EMAIL =================
router.post("/:id/send-thanking", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { 
        guestId,
        guestEmail, 
        recipientEmail,
        guestName,
        customHtml, 
        customMessage, 
        attachmentBase64, 
        attachGeneratedPdf = true, 
        letterData 
    } = req.body;

    try {
        let workshop = null;
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(id)) {
            workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId }).populate("submittedBy", "name department email");
        }
        if (!workshop) {
            workshop = new Workshop({
                organizationId: req.user.organizationId,
                title: letterData?.eventTitle || "Academic Workshop / Guest Lecture",
                description: `Official Academic Event: ${letterData?.eventTitle || "Workshop Lecture"}`,
                date: letterData?.eventDate || new Date(),
                time: letterData?.eventTime || "10:00 AM - 01:00 PM",
                venue: letterData?.eventVenue || "Campus Auditorium",
                speakerName: letterData?.guestName || guestName || "Distinguished Expert",
                speakerBio: letterData?.guestDesignation || "",
                speakerOrganization: letterData?.guestOrg || "",
                guestDesignation: letterData?.guestDesignation || "",
                guestOrganization: letterData?.guestOrg || "",
                guestEmail: recipientEmail || guestEmail || "",
                workshopType: "Arranged by Self",
                status: req.user.role === "Principal" ? "verified" : "pending",
                submittedBy: req.user._id,
                department: req.user.department
            });
            await workshop.save();
        }

        const emailToSend = recipientEmail || guestEmail || workshop.guestEmail;
        if (!emailToSend) {
            return res.status(400).json({ error: "Recipient email is required to send thanking letter ❌" });
        }

        // Identify target guest if guests array exists
        let targetGuest = null;
        if (workshop.guests && Array.isArray(workshop.guests)) {
            if (guestId) {
                targetGuest = workshop.guests.id ? workshop.guests.id(guestId) : workshop.guests.find(g => g._id?.toString() === guestId.toString());
            }
            if (!targetGuest && emailToSend) {
                targetGuest = workshop.guests.find(g => g.email && g.email.toLowerCase() === emailToSend.toLowerCase());
            }
        }

        const resolvedGuestName = targetGuest?.name || guestName || letterData?.guestName || workshop.speakerName || "Distinguished Expert";
        const resolvedGuestDesignation = targetGuest?.designation || letterData?.guestDesignation || workshop.guestDesignation || workshop.speakerBio || "Industry Consultant / Senior Professor";
        const resolvedGuestOrg = targetGuest?.organization || letterData?.guestOrg || workshop.guestOrganization || workshop.speakerOrganization || "Tech Enterprise / University";

        let finalAttachment = attachmentBase64;

        // Auto-generate official letter PDF if requested or if no physical scan was attached
        if (attachGeneratedPdf || !finalAttachment) {
            try {
                const pdfPayload = {
                    institutionName: letterData?.institutionName || "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
                    departmentName: letterData?.departmentName || workshop.department || req.user.department || "Department of Computer Science & Engineering",
                    refNo: letterData?.refNo || `EDU/${(workshop.department || "DEPT").toUpperCase()}/${new Date().getFullYear()}/${(workshop._id || "001").toString().slice(-4).toUpperCase()}`,
                    letterDate: letterData?.letterDate || new Date().toISOString().split("T")[0],
                    letterType: "thanking",
                    guestName: resolvedGuestName,
                    guestDesignation: resolvedGuestDesignation,
                    guestOrg: resolvedGuestOrg,
                    eventTitle: letterData?.eventTitle || workshop.title || "Special Academic Session",
                    eventDate: letterData?.eventDate || (workshop.date ? new Date(workshop.date).toISOString().split("T")[0] : ""),
                    bodyText: letterData?.bodyText || "",
                    organizerName: letterData?.organizerName || (workshop.submittedBy ? workshop.submittedBy.name : req.user.name),
                    principalName: letterData?.principalName || "Dr. Suresh Mali"
                };
                const pdfBuffer = await generateLetterPdf(pdfPayload);
                finalAttachment = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
                workshop.scannedThankingLetter = finalAttachment;
            } catch (pdfErr) {
                console.error("PDF auto-generation warning:", pdfErr);
            }
        }

        if (!req.user || !req.user.email) {
            return res.status(401).json({ error: "Authenticated faculty email is required to dispatch thanking letter ❌" });
        }

        // Fetch full faculty record with emailSettings.appPassword
        const authenticatedFaculty = await User.findById(req.user._id).select("+emailSettings.appPassword");
        if (!authenticatedFaculty) {
            return res.status(401).json({ error: "Authenticated faculty profile not found ❌" });
        }

        const facultySenderEmail = authenticatedFaculty.email;
        const facultySenderName = authenticatedFaculty.name || authenticatedFaculty.fullName || (workshop.submittedBy ? workshop.submittedBy.name : "Faculty Coordinator");

        // Send Email using faculty's authenticated credentials
        const result = await sendThankingEmail({
            guestEmail: emailToSend,
            guestName: resolvedGuestName,
            eventTitle: workshop.title,
            eventType: workshop.workshopType && workshop.workshopType.toLowerCase().includes("seminar") ? "Seminar" : "Workshop",
            date: workshop.date ? new Date(workshop.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "",
            organizerName: facultySenderName,
            deptName: workshop.department || req.user.department,
            institutionName: letterData?.institutionName || "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
            customHtml: customHtml || undefined,
            customMessage: customMessage || undefined,
            attachmentBase64: finalAttachment || workshop.scannedThankingLetter || undefined,
            senderEmail: facultySenderEmail,
            facultyUser: authenticatedFaculty
        });

        workshop.guestEmail = emailToSend;
        workshop.thankingSentAt = new Date();
        if (targetGuest) {
            targetGuest.thankingStatus = "Sent";
            targetGuest.thankingSentAt = new Date();
        }
        await workshop.save();

        res.json({
            message: `Official thanking message and appreciation letter (PDF format) dispatched to ${emailToSend} successfully 📧📄✅`,
            workshop,
            hasPdfAttachment: Boolean(finalAttachment),
            senderEmail: facultySenderEmail,
            authenticatedAs: result.authenticatedAs,
            mode: result.mode,
            result
        });
    } catch (err) {
        console.error(err);
        if (err.code === "FACULTY_EMAIL_NOT_CONFIGURED") {
            return res.status(400).json({
                error: err.message,
                code: "FACULTY_EMAIL_NOT_CONFIGURED",
                facultyEmail: req.user?.email
            });
        }
        res.status(500).json({ error: err.message || "Failed to dispatch thanking email ❌" });
    }
});

// ================= SEND OFFICIAL LETTER EMAIL =================
router.post("/:id/send-official", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { 
        guestEmail, 
        recipientEmail,
        customHtml, 
        customMessage, 
        attachmentBase64, 
        attachGeneratedPdf = true, 
        letterData 
    } = req.body;

    try {
        let workshop = null;
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(id)) {
            workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId }).populate("submittedBy", "name department email");
        }
        if (!workshop) {
            workshop = new Workshop({
                organizationId: req.user.organizationId,
                title: letterData?.eventTitle || "Official Academic Communication",
                description: `Official Academic Communication: ${letterData?.eventTitle || "Letter"}`,
                date: letterData?.eventDate || new Date(),
                time: letterData?.eventTime || "10:00 AM - 01:00 PM",
                venue: letterData?.eventVenue || "Campus Auditorium",
                speakerName: letterData?.guestName || "Recipient",
                speakerBio: letterData?.guestDesignation || "",
                speakerOrganization: letterData?.guestOrg || "",
                guestDesignation: letterData?.guestDesignation || "",
                guestOrganization: letterData?.guestOrg || "",
                guestEmail: recipientEmail || guestEmail || "",
                workshopType: "Official Communication",
                status: req.user.role === "Principal" ? "verified" : "pending",
                submittedBy: req.user._id,
                department: req.user.department
            });
            await workshop.save();
        }

        const emailToSend = recipientEmail || guestEmail || workshop.guestEmail;
        if (!emailToSend || !emailToSend.includes("@")) {
            return res.status(400).json({ error: "A valid recipient email address is required to dispatch official letter ❌" });
        }

        let finalAttachment = attachmentBase64;
        const deptCode = (req.user.department || "DEPT").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
        const refNo = letterData?.refNo || `DYPCOEI/${deptCode}/${new Date().getFullYear()}/${(workshop._id || "001").toString().slice(-4).toUpperCase()}`;
        const letterDate = letterData?.letterDate || new Date().toISOString().split("T")[0];

        const sender = {
            userId: req.user._id,
            role: req.user.role,
            name: req.user.name || req.user.fullName || "Faculty Member",
            designation: req.user.role === "Faculty" ? "Faculty" : (req.user.role === "HOD" ? "Vice Principal / CE - HOD" : (req.user.role === "Principal" ? "Principal" : req.user.designation)),
            department: req.user.department || "Computer Science & Engineering",
            email: req.user.email
        };

        // Auto-generate official letter PDF if requested or if no physical scan was attached
        if (attachGeneratedPdf || !finalAttachment) {
            try {
                const pdfPayload = {
                    institutionName: letterData?.institutionName || "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
                    departmentName: req.user.department || workshop.department || "Department of Computer Science & Engineering",
                    refNo,
                    letterDate,
                    letterType: "official",
                    guestName: letterData?.guestName || workshop.speakerName || "Distinguished Recipient",
                    guestDesignation: letterData?.guestDesignation || workshop.guestDesignation || "",
                    guestOrg: letterData?.guestOrg || workshop.guestOrganization || "",
                    eventTitle: letterData?.eventTitle || workshop.title || "Official Academic Matter",
                    eventDate: letterData?.eventDate || (workshop.date ? new Date(workshop.date).toISOString().split("T")[0] : letterDate),
                    eventTime: letterData?.eventTime || workshop.time || "10:00 AM - 01:00 PM",
                    eventVenue: letterData?.eventVenue || workshop.venue || "Campus Seminar Auditorium",
                    bodyText: letterData?.bodyText || customMessage || "",
                    sender,
                    signatoryType: letterData?.signatoryType || "single"
                };
                const pdfBuffer = await generateLetterPdf(pdfPayload);
                finalAttachment = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
                workshop.scannedOfficialLetter = finalAttachment;
            } catch (pdfErr) {
                console.error("PDF auto-generation warning:", pdfErr);
            }
        }

        // Send Email via sendOfficialLetterEmail
        const result = await sendOfficialLetterEmail({
            recipientEmail: emailToSend,
            recipientName: letterData?.guestName || workshop.speakerName || "Distinguished Recipient",
            subject: `Official Institutional Letter: ${letterData?.eventTitle || workshop.title || "Academic Communication"}`,
            letterType: "official",
            refNo,
            letterDate,
            bodyText: letterData?.bodyText || customMessage || "",
            eventDetails: {
                title: letterData?.eventTitle || workshop.title || "Academic Communication",
                date: letterData?.eventDate || letterDate,
                time: letterData?.eventTime || "",
                venue: letterData?.eventVenue || "",
                mode: workshop.workshopType || "Offline"
            },
            sender,
            attachmentBase64: finalAttachment || workshop.scannedOfficialLetter || undefined
        });

        workshop.guestEmail = emailToSend;
        workshop.officialLetterSentAt = new Date();
        await workshop.save();

        // Also record in OfficialLetter audit ledger
        try {
            const officialLetterDoc = new OfficialLetter({
                refNo,
                workshopId: workshop._id,
                letterType: "official_comm",
                letterCategory: "Official Institutional Letters",
                subject: `Official Letter: ${letterData?.eventTitle || workshop.title || "Communication"}`,
                date: new Date(),
                recipient: {
                    name: letterData?.guestName || workshop.speakerName || "Recipient",
                    designation: letterData?.guestDesignation || "",
                    organization: letterData?.guestOrg || "",
                    email: emailToSend
                },
                eventDetails: {
                    title: letterData?.eventTitle || workshop.title || "Academic Session",
                    date: letterData?.eventDate || letterDate,
                    venue: letterData?.eventVenue || "Campus"
                },
                bodyText: letterData?.bodyText || customMessage || "",
                sender,
                status: "approved",
                sentStatus: "sent",
                sentAt: new Date(),
                pdfBase64: finalAttachment
            });
            await officialLetterDoc.save();
        } catch (auditErr) {
            console.warn("Audit record warning in send-official:", auditErr.message);
        }

        res.json({
            message: `Official letter (PDF format) dispatched to ${emailToSend} successfully 📧📄✅`,
            workshop,
            hasPdfAttachment: Boolean(finalAttachment),
            result
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Failed to dispatch official letter ❌" });
    }
});

// ================= SCAN / UPLOAD LETTER =================
router.put("/:id/scan", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { type, scannedImageBase64 } = req.body; // type: 'invitation' | 'thanking' | 'official'

    if (!type || !["invitation", "thanking", "official"].includes(type)) {
        return res.status(400).json({ error: "Letter type ('invitation', 'thanking', or 'official') is required ❌" });
    }

    if (!scannedImageBase64) {
        return res.status(400).json({ error: "Scanned document data is required ❌" });
    }

    try {
        let workshop = null;
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(id)) {
            workshop = await Workshop.findOne({ _id: id, organizationId: req.user.organizationId });
        }
        if (!workshop) {
            workshop = new Workshop({
                organizationId: req.user.organizationId,
                title: "Academic Workshop / Guest Lecture",
                description: "Official Academic Event",
                date: new Date(),
                time: "10:00 AM - 01:00 PM",
                venue: "Campus Auditorium",
                speakerName: "Distinguished Expert",
                speakerBio: "",
                speakerOrganization: "",
                workshopType: "Arranged by Self",
                status: req.user.role === "Principal" ? "verified" : "pending",
                submittedBy: req.user._id,
                department: req.user.department
            });
            await workshop.save();
        }

        if (type === "invitation") {
            workshop.scannedInvitation = scannedImageBase64;
        } else if (type === "thanking") {
            workshop.scannedThankingLetter = scannedImageBase64;
        } else if (type === "official") {
            workshop.scannedOfficialLetter = scannedImageBase64;
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

