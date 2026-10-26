const express = require("express");
const router = express.Router();
const { authenticateUser, requireRole } = require("./authMiddleware");
const OfficialLetter = require("../models/OfficialLetter");
const LetterRegister = require("../models/LetterRegister");
const Workshop = require("../models/Workshop");
const User = require("../models/User");
const {
    generateOfficialLetterPdf,
    generateWorkshopSummaryPdf,
    MASTER_LETTERHEAD
} = require("../services/letterPdfService");
const { sendOfficialLetterEmail } = require("../services/emailService");

// ================= 1. TEMPLATES ENDPOINT =================
router.get("/templates", authenticateUser, async (req, res) => {
    try {
        const userRole = req.user.role;
        const availableTemplates = [];

        // All authorized members (Faculty, HOD, Principal) have access to guest communication letters
        availableTemplates.push(
            {
                id: "invitation",
                title: "Workshop & Guest Speaker Invitation Letter",
                category: "Guest Relations & Academic Sessions",
                description: "Official invitation for Resource Persons, Guest Lecturers, Trainers, and Chief Guests."
            },
            {
                id: "thanking",
                title: "Official Thanking & Appreciation Letter",
                category: "Gratitude & Academic Relations",
                description: "Formal letter of gratitude and appreciation post-event/workshop delivery."
            },
            {
                id: "official_comm",
                title: "Official Institutional Communication",
                category: "Official Affairs",
                description: "Institutional notices, nominations, and formal academic communications."
            }
        );

        // HOD & Principal get Faculty Appointment Letters
        if (userRole === "Principal" || userRole === "HOD") {
            availableTemplates.push({
                id: "faculty_appointment",
                title: "Faculty Appointment Letter",
                category: "Human Resources",
                description: "Substantive faculty appointment order with terms of service, probation, and scale."
            });
        }

        // Only Principal gets HOD Appointment Letter
        if (userRole === "Principal") {
            availableTemplates.push({
                id: "hod_appointment",
                title: "HOD Appointment Letter",
                category: "Administration",
                description: "Administrative appointment order for Department Leadership."
            });
        }

        res.json({
            role: userRole,
            templates: availableTemplates
        });
    } catch (err) {
        console.error("Fetch letter templates error:", err);
        res.status(500).json({ error: "Failed to load letter templates ❌" });
    }
});

// ================= 2. GET OFFICIAL LETTERS (WITH AUDIT TRAIL) =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, _id: userId, department } = req.user;
        let query = {};

        // Role-based visibility
        if (role === "Faculty") {
            // Faculty can view official guest communications they created
            query["sender.userId"] = userId;
        }

        if (role === "Principal" || role === "Admin") {
            // Principal can view all letters across the institution
            if (req.query.department) {
                query["sender.department"] = req.query.department;
            }
        } else if (role === "HOD") {
            // HOD can view all letters within their department
            query["sender.department"] = department;
        }

        if (req.query.letterType) {
            query.letterType = req.query.letterType;
        }

        const letters = await OfficialLetter.find(query)
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ success: true, letters });
    } catch (err) {
        console.error("Fetch official letters error:", err);
        res.status(500).json({ error: "Failed to fetch official letters ❌" });
    }
});

// ================= 3. PREVIEW OFFICIAL LETTER PDF =================
router.post("/preview-pdf", authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        const letterData = req.body;
        // Faculty can preview guest communications (invitation, thanking, official_comm)
        if (user.role === "Faculty" && ["faculty_appointment", "hod_appointment"].includes(letterData.letterType)) {
            return res.status(403).json({ error: "Access Denied: Faculty accounts cannot preview appointment letters ❌" });
        }

        // Strictly bind sender details to authenticated user (Prevent impersonation - Section 12)
        const sender = {
            userId: user._id,
            role: user.role,
            name: user.name || user.fullName || "Faculty Member",
            designation: user.role === "Faculty" ? "Faculty" : (user.role === "HOD" ? "Vice Principal / CE - HOD" : (user.role === "Principal" ? "Principal" : (user.designation || "Faculty"))),
            department: user.department || letterData.departmentName || "Computer Science & Engineering",
            email: user.email
        };

        const refNo = letterData.refNo || `DYPCOEI/${(sender.department || "DEPT").toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

        const pdfBuffer = await generateOfficialLetterPdf({
            ...letterData,
            refNo,
            sender
        });

        res.json({
            success: true,
            pdfBase64: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
            refNo
        });
    } catch (err) {
        console.error("Preview official letter error:", err);
        res.status(500).json({ error: err.message || "Failed to generate official letter preview ❌" });
    }
});

// ================= 4. GENERATE & SAVE OFFICIAL LETTER =================
router.post("/generate", authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        const {
            letterType = "invitation",
            subject = "",
            recipient = {},
            eventDetails = {},
            bodyText = "",
            workshopId = null,
            signatoryType = "single"
        } = req.body;

        // Faculty can generate guest communications (invitation, thanking, official_comm)
        if (user.role === "Faculty" && ["faculty_appointment", "hod_appointment"].includes(letterType)) {
            return res.status(403).json({ error: "Access Denied: Faculty accounts cannot generate appointment letters ❌" });
        }

        if (!recipient.name || !recipient.name.trim()) {
            return res.status(400).json({ error: "Recipient name is required ❌" });
        }

        // Strictly bind sender details to authenticated user (Section 2 & 12)
        const sender = {
            userId: user._id,
            role: user.role,
            name: user.name || user.fullName || "Faculty Member",
            designation: user.role === "Faculty" ? "Faculty" : (user.role === "HOD" ? "Vice Principal / CE - HOD" : (user.role === "Principal" ? "Principal" : (user.designation || "Faculty"))),
            department: user.department || eventDetails.department || "Computer Science & Engineering",
            email: user.email
        };

        // Formulate reference number
        const deptCode = (sender.department || "GEN").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
        const refNo = req.body.refNo || `DYPCOEI/${deptCode}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

        // Build signatory
        const signatory = {
            name: sender.name,
            designation: sender.designation,
            department: sender.department,
            collegeName: MASTER_LETTERHEAD.collegeName
        };

        // Generate official PDF with master letterhead
        const pdfBuffer = await generateOfficialLetterPdf({
            refNo,
            letterDate: req.body.letterDate || new Date().toISOString().split("T")[0],
            letterType,
            departmentName: sender.department,
            recipient,
            eventDetails,
            bodyText,
            sender,
            signatory,
            signatoryType
        });

        const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

        // Save official document to database (Audit trail - Section 11)
        const officialLetter = new OfficialLetter({
            refNo,
            workshopId: workshopId || null,
            letterType,
            letterCategory: "Guest Relations & Academic Sessions",
            subject: subject || `Official ${letterType.toUpperCase()} Letter`,
            date: new Date(),
            recipient,
            eventDetails,
            bodyText,
            sender,
            signatory,
            status: "approved",
            sentStatus: "not_sent",
            pdfBase64
        });

        await officialLetter.save();

        res.status(201).json({
            success: true,
            letter: officialLetter,
            pdfBase64,
            message: `Official ${letterType} letter created successfully ✅`
        });
    } catch (err) {
        console.error("Generate official letter error:", err);
        res.status(500).json({ error: err.message || "Failed to generate official letter ❌" });
    }
});

// ================= 5. SEND OFFICIAL LETTER BY EMAIL =================
router.post("/:id/send", authenticateUser, async (req, res) => {
    try {
        const letter = await OfficialLetter.findById(req.params.id);
        if (!letter) {
            return res.status(404).json({ error: "Official letter record not found ❌" });
        }

        // Verify permissions
        const user = req.user;
        const isCreator = String(letter.sender?.userId) === String(user._id);
        const isPrincipal = user.role === "Principal" || user.role === "Admin";
        const isDeptHOD = user.role === "HOD" && user.department === letter.sender?.department;
        const isAllowedFaculty = user.role === "Faculty" && isCreator && ["invitation", "thanking", "official_comm"].includes(letter.letterType);

        if (!isCreator && !isPrincipal && !isDeptHOD && !isAllowedFaculty) {
            return res.status(403).json({ error: "Unauthorized to dispatch this official letter ❌" });
        }

        const recipientEmail = req.body.recipientEmail || letter.recipient.email;
        if (!recipientEmail) {
            return res.status(400).json({ error: "Recipient email address is required to dispatch the letter ❌" });
        }

        // Regenerate or use existing PDF
        let pdfBase64 = letter.pdfBase64;
        if (!pdfBase64) {
            const buf = await generateOfficialLetterPdf({
                refNo: letter.refNo,
                letterDate: letter.date,
                letterType: letter.letterType,
                recipient: letter.recipient,
                eventDetails: letter.eventDetails,
                bodyText: letter.bodyText,
                sender: letter.sender,
                signatory: letter.signatory
            });
            pdfBase64 = `data:application/pdf;base64,${buf.toString("base64")}`;
            letter.pdfBase64 = pdfBase64;
        }

        // Dispatch email representing the initiating authority (Section 7)
        await sendOfficialLetterEmail({
            recipientEmail,
            recipientName: letter.recipient.name,
            subject: letter.subject,
            letterType: letter.letterType,
            refNo: letter.refNo,
            letterDate: letter.date,
            bodyText: letter.bodyText,
            eventDetails: letter.eventDetails,
            sender: letter.sender,
            attachmentBase64: pdfBase64
        });

        letter.sentStatus = "sent";
        letter.sentAt = new Date();
        letter.status = "sent";
        await letter.save();

        res.json({
            success: true,
            message: `Official letter successfully dispatched to ${recipientEmail} on behalf of ${letter.sender.name} 📧✅`
        });
    } catch (err) {
        console.error("Send official letter error:", err);
        res.status(500).json({ error: err.message || "Failed to dispatch official letter ❌" });
    }
});

// ================= 6. GENERATE OFFICIAL WORKSHOP SUMMARY / REPORT PDF =================
router.post("/workshop-summary-pdf/:workshopId", authenticateUser, async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.workshopId).populate("submittedBy", "name fullName department designation email");
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

        const facultyCoordinator = workshop.submittedBy ? (workshop.submittedBy.name || workshop.submittedBy.fullName) : "Mr. Swami Panjala";

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
            speakerDesignation: workshop.guestDesignation || workshop.speakerBio || "Senior Industry Specialist",
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

        res.json({
            success: true,
            filename: `Activity_Report_${workshop.title.replace(/\s+/g, "_")}.pdf`,
            pdfBase64: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`
        });
    } catch (err) {
        console.error("Generate workshop summary PDF error:", err);
        res.status(500).json({ error: err.message || "Failed to generate official workshop summary report ❌" });
    }
});

// ================= OFFICIAL LETTERS REGISTER ENDPOINTS =================
router.get("/register", authenticateUser, async (req, res) => {
    try {
        const { role, department } = req.user;
        const { search, letterType, entryType, dept } = req.query;

        let query = {};

        // HOD can see registers in their department or general administration
        if (role === "HOD") {
            query.$or = [
                { department: department },
                { department: "General Administration" },
                { createdBy: req.user._id }
            ];
        }

        if (dept && dept !== "all") {
            query.department = dept;
        }

        if (letterType && letterType !== "all") {
            query.letterType = letterType;
        }

        if (entryType && entryType !== "all") {
            query.entryType = entryType;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            const searchConditions = [
                { registerTitle: regex },
                { registerNumber: regex },
                { subject: regex },
                { senderOrRecipient: regex },
                { description: regex },
                { createdByName: regex }
            ];
            if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: searchConditions }];
                delete query.$or;
            } else {
                query.$or = searchConditions;
            }
        }

        const registers = await LetterRegister.find(query)
            .sort({ createdAt: -1 })
            .limit(200);

        res.json({
            success: true,
            registers
        });
    } catch (err) {
        console.error("Fetch letter registers error:", err);
        res.status(500).json({ error: "Failed to load official letters register ❌" });
    }
});

router.post("/register", authenticateUser, async (req, res) => {
    try {
        const { role, _id: userId, name: userName, department: userDept } = req.user;
        if (role !== "Principal" && role !== "HOD" && role !== "Admin") {
            return res.status(403).json({ error: "Access Denied: Only HOD or Principal can maintain official letters register ❌" });
        }

        const {
            registerTitle,
            registerNumber,
            letterType,
            subject,
            senderOrRecipient,
            entryType,
            letterDate,
            receivedOrDispatchDate,
            department,
            description,
            attachment,
            attachmentName
        } = req.body;

        if (!registerTitle || !registerTitle.trim()) {
            return res.status(400).json({ error: "Register Title is required ❌" });
        }
        if (!registerNumber || !registerNumber.trim()) {
            return res.status(400).json({ error: "Register Number / Reference Number is required ❌" });
        }
        if (!subject || !subject.trim()) {
            return res.status(400).json({ error: "Subject is required ❌" });
        }
        if (!senderOrRecipient || !senderOrRecipient.trim()) {
            return res.status(400).json({ error: "Sender / Recipient is required ❌" });
        }

        const trimmedRegNum = registerNumber.trim();
        // Check uniqueness
        const existing = await LetterRegister.findOne({ registerNumber: trimmedRegNum });
        if (existing) {
            return res.status(400).json({ 
                error: `Duplicate Register Number: A record with register number "${trimmedRegNum}" already exists in the system ❌` 
            });
        }

        const targetDepartment = department && department.trim() 
            ? department.trim() 
            : (role === "HOD" ? userDept : "General Administration");

        const newEntry = new LetterRegister({
            registerTitle: registerTitle.trim(),
            registerNumber: trimmedRegNum,
            letterType: letterType || "Inward",
            subject: subject.trim(),
            senderOrRecipient: senderOrRecipient.trim(),
            entryType: entryType || "Inward",
            letterDate: letterDate ? new Date(letterDate) : new Date(),
            receivedOrDispatchDate: receivedOrDispatchDate ? new Date(receivedOrDispatchDate) : new Date(),
            department: targetDepartment,
            description: description ? description.trim() : "",
            attachment: attachment || "",
            attachmentName: attachmentName || "",
            createdBy: userId,
            createdByName: userName,
            createdByRole: role
        });

        await newEntry.save();

        res.status(201).json({
            success: true,
            message: "Official Letter Register entry saved successfully! ✅",
            register: newEntry
        });
    } catch (err) {
        console.error("Create letter register error:", err);
        res.status(500).json({ error: err.message || "Failed to create register entry ❌" });
    }
});

router.put("/register/:id", authenticateUser, async (req, res) => {
    try {
        const { role, _id: userId, name: userName, department: userDept } = req.user;
        if (role !== "Principal" && role !== "HOD" && role !== "Admin") {
            return res.status(403).json({ error: "Access Denied ❌" });
        }

        const entry = await LetterRegister.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: "Register entry not found ❌" });
        }

        // HOD permission check: only edit within department or if they created it
        if (role === "HOD" && entry.department !== userDept && entry.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Access Denied: You can only edit entries within your department ❌" });
        }

        const {
            registerTitle,
            registerNumber,
            letterType,
            subject,
            senderOrRecipient,
            entryType,
            letterDate,
            receivedOrDispatchDate,
            department,
            description,
            attachment,
            attachmentName
        } = req.body;

        if (registerNumber && registerNumber.trim() !== entry.registerNumber) {
            const trimmedRegNum = registerNumber.trim();
            const existing = await LetterRegister.findOne({ 
                registerNumber: trimmedRegNum,
                _id: { $ne: entry._id }
            });
            if (existing) {
                return res.status(400).json({ 
                    error: `Duplicate Register Number: A record with register number "${trimmedRegNum}" already exists ❌` 
                });
            }
            entry.registerNumber = trimmedRegNum;
        }

        if (registerTitle) entry.registerTitle = registerTitle.trim();
        if (letterType) entry.letterType = letterType;
        if (subject) entry.subject = subject.trim();
        if (senderOrRecipient) entry.senderOrRecipient = senderOrRecipient.trim();
        if (entryType) entry.entryType = entryType;
        if (letterDate) entry.letterDate = new Date(letterDate);
        if (receivedOrDispatchDate) entry.receivedOrDispatchDate = new Date(receivedOrDispatchDate);
        if (department) entry.department = department.trim();
        if (description !== undefined) entry.description = description.trim();
        if (attachment !== undefined) {
            entry.attachment = attachment;
            entry.attachmentName = attachmentName || "";
        }

        entry.updatedBy = userId;
        entry.updatedByName = userName;

        await entry.save();

        res.json({
            success: true,
            message: "Register entry updated successfully! ✅",
            register: entry
        });
    } catch (err) {
        console.error("Update letter register error:", err);
        res.status(500).json({ error: err.message || "Failed to update register entry ❌" });
    }
});

router.delete("/register/:id", authenticateUser, async (req, res) => {
    try {
        const { role, _id: userId, department: userDept } = req.user;
        if (role !== "Principal" && role !== "HOD" && role !== "Admin") {
            return res.status(403).json({ error: "Access Denied ❌" });
        }

        const entry = await LetterRegister.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: "Register entry not found ❌" });
        }

        if (role === "HOD" && entry.department !== userDept && entry.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Access Denied: You cannot delete entries from other departments ❌" });
        }

        await LetterRegister.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Register entry deleted successfully! ✅"
        });
    } catch (err) {
        console.error("Delete letter register error:", err);
        res.status(500).json({ error: err.message || "Failed to delete register entry ❌" });
    }
});

module.exports = router;
