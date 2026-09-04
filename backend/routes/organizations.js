const express = require("express");
const router = express.Router();
const Organization = require("../models/Organization");
const User = require("../models/User");
const Department = require("../models/Department");
const PerformanceCriteria = require("../models/PerformanceCriteria");
const OtpRequest = require("../models/OtpRequest");
const AuditLog = require("../models/AuditLog");
const { authenticateUser, requireRole } = require("./authMiddleware");
const crypto = require("crypto");
const { sendOtpEmail } = require("../services/emailService");

// Generate 6-digit OTP code string
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP string using SHA-256
function hashOtp(otp) {
    return crypto.createHash("sha256").update(otp).digest("hex");
}

// ================= PUBLIC ONBOARDING ENDPOINT =================
router.post("/onboard", async (req, res) => {
    const { 
        collegeName, 
        collegeCode, 
        principalName, 
        principalEmail, 
        phone, 
        address, 
        website, 
        logo 
    } = req.body;

    if (!collegeName || !collegeCode || !principalName || !principalEmail) {
        return res.status(400).json({ error: "Missing required onboarding fields ❌" });
    }

    try {
        const cleanCode = collegeCode.trim().toUpperCase();
        const cleanEmail = principalEmail.trim().toLowerCase();

        // 1. Check if organization already exists
        const existingOrg = await Organization.findOne({ code: cleanCode });
        if (existingOrg) {
            return res.status(400).json({ error: `An institution with code "${cleanCode}" is already onboarded ❌` });
        }

        // 2. Check if principal user email already registered
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.status(400).json({ error: "Email address is already registered in the system ❌" });
        }

        // 3. Create Organization
        const org = new Organization({
            name: collegeName.trim(),
            shortName: collegeName.trim().split(" ").map(w => w[0]).join("").toUpperCase() || cleanCode,
            code: cleanCode,
            email: cleanEmail,
            phone: phone || "",
            address: address || "",
            website: website || "",
            logo: logo || "",
            status: "ACTIVE",
            settings: {
                restrictDomain: false,
                allowedDomain: cleanEmail.split("@")[1] || "",
                branding: {
                    primaryColor: "#4F46E5",
                    secondaryColor: "#06B6D4",
                    favicon: "",
                    motto: "Knowledge is Power",
                    footer: `© ${new Date().getFullYear()} ${collegeName.trim()}. All rights reserved.`
                },
                academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                semesterSystem: "Semester",
                collegeTiming: "09:00 AM - 05:00 PM",
                workingDays: 5,
                maxLeave: 12
            }
        });
        await org.save();

        // 4. Create default Administration department for organization
        const adminDept = new Department({
            organizationId: org._id,
            name: "Administration",
            code: "ADM",
            email: cleanEmail,
            description: "Institutional Administrative Offices",
            status: "active"
        });
        await adminDept.save();

        // 5. Create Principal user
        const principal = new User({
            organizationId: org._id,
            name: principalName.trim(),
            email: cleanEmail,
            role: "Principal",
            department: "Administration",
            departmentId: adminDept._id,
            designation: "Principal & Administrator",
            phone: phone || "",
            joiningDate: new Date().toISOString().split("T")[0],
            status: "ACTIVE",
            employeeId: `${cleanCode}-PRIN-01`
        });
        await principal.save();

        // 6. Set HOD for Admin department
        adminDept.hodId = principal._id;
        await adminDept.save();

        // 7. Seed Performance weights for new college
        const defaultCriteria = [
            { organizationId: org._id, category: "Teaching", weight: 30, maxScore: 100, isActive: true },
            { organizationId: org._id, category: "Research", weight: 25, maxScore: 100, isActive: true },
            { organizationId: org._id, category: "Student Feedback", weight: 15, maxScore: 100, isActive: true },
            { organizationId: org._id, category: "Professional Development", weight: 10, maxScore: 100, isActive: true },
            { organizationId: org._id, category: "Administrative Work", weight: 10, maxScore: 100, isActive: true },
            { organizationId: org._id, category: "Other Activities", weight: 10, maxScore: 100, isActive: true }
        ];
        await PerformanceCriteria.insertMany(defaultCriteria);

        // 8. Generate and send first login OTP
        const otpCode = generateOTP();
        const hashed = hashOtp(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const requestDoc = new OtpRequest({
            email: cleanEmail,
            otpHash: hashed,
            expiresAt,
            attempts: 0,
            used: false
        });
        await requestDoc.save();

        // Console logger
        console.log(`\n======================================================`);
        console.log(`[ONBOARDING SERVICE] Generated Principal OTP for: ${cleanEmail}`);
        console.log(`🔑 SECURE OTP: ${otpCode}`);
        console.log(`======================================================\n`);

        let emailDispatched = false;
        try {
            await sendOtpEmail(cleanEmail, principal.name, otpCode);
            emailDispatched = true;
        } catch (emailErr) {
            console.error("Welcome email failed:", emailErr);
        }

        // Audit logging
        const log = new AuditLog({
            organizationId: org._id,
            userId: principal._id,
            action: "ONBOARD_ORGANIZATION",
            description: `Onboarded institution "${collegeName}" and created Principal account.`
        });
        await log.save();

        res.json({ 
            message: "Institution onboarded successfully! Welcome email sent ✅", 
            email: cleanEmail,
            devOtp: (!emailDispatched || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) ? otpCode : undefined
        });

    } catch (err) {
        console.error("Onboarding error:", err);
        res.status(500).json({ error: "Failed to onboard institution ❌" });
    }
});

// ================= GET MY ORG PROFILE =================
router.get("/my-org", authenticateUser, requireRole(["Principal", "HOD", "Faculty"]), async (req, res) => {
    try {
        const org = await Organization.findById(req.user.organizationId);
        if (!org) {
            return res.status(404).json({ error: "Organization profile not found ❌" });
        }
        res.json({ organization: org });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch organization settings ❌" });
    }
});

// ================= PUT UPDATE MY ORG SETTINGS =================
router.put("/my-org", authenticateUser, requireRole(["Principal"]), async (req, res) => {
    const { 
        name, 
        shortName,
        email, 
        phone, 
        address, 
        website, 
        logo,
        settings
    } = req.body;

    try {
        const org = await Organization.findById(req.user.organizationId);
        if (!org) {
            return res.status(404).json({ error: "Organization profile not found ❌" });
        }

        if (name) org.name = name.trim();
        if (shortName) org.shortName = shortName.trim();
        if (email) org.email = email.trim().toLowerCase();
        if (phone !== undefined) org.phone = phone;
        if (address !== undefined) org.address = address;
        if (website !== undefined) org.website = website;
        if (logo !== undefined) org.logo = logo;
        
        if (req.body.vision !== undefined) org.vision = req.body.vision;
        if (req.body.mission !== undefined) org.mission = req.body.mission;
        if (req.body.visionSource !== undefined) org.visionSource = req.body.visionSource;
        if (req.body.missionSource !== undefined) org.missionSource = req.body.missionSource;

        if (settings) {
            if (settings.restrictDomain !== undefined) org.settings.restrictDomain = settings.restrictDomain;
            if (settings.allowedDomain !== undefined) org.settings.allowedDomain = settings.allowedDomain.trim().toLowerCase();
            if (settings.academicYear !== undefined) org.settings.academicYear = settings.academicYear;
            if (settings.semesterSystem !== undefined) org.settings.semesterSystem = settings.semesterSystem;
            if (settings.collegeTiming !== undefined) org.settings.collegeTiming = settings.collegeTiming;
            if (settings.workingDays !== undefined) org.settings.workingDays = Number(settings.workingDays);
            if (settings.maxLeave !== undefined) org.settings.maxLeave = Number(settings.maxLeave);
            if (settings.academicCalendar !== undefined) org.settings.academicCalendar = settings.academicCalendar;
            if (settings.instituteHolidays !== undefined) org.settings.instituteHolidays = settings.instituteHolidays;

            if (settings.branding) {
                if (settings.branding.primaryColor) org.settings.branding.primaryColor = settings.branding.primaryColor;
                if (settings.branding.secondaryColor) org.settings.branding.secondaryColor = settings.branding.secondaryColor;
                if (settings.branding.favicon !== undefined) org.settings.branding.favicon = settings.branding.favicon;
                if (settings.branding.motto !== undefined) org.settings.branding.motto = settings.branding.motto;
                if (settings.branding.footer !== undefined) org.settings.branding.footer = settings.branding.footer;
            }
        }

        await org.save();

        const log = new AuditLog({
            organizationId: org._id,
            userId: req.user._id,
            action: "SETTINGS_CHANGE",
            description: `Principal updated settings for organization "${org.name}".`
        });
        await log.save();

        res.json({ message: "Organization settings updated successfully! ✅", organization: org });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update organization settings ❌" });
    }
});

// ================= EXTRACT TEXT FROM PDF =================
// POST /api/organizations/extract-pdf
router.post("/extract-pdf", authenticateUser, async (req, res) => {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
        return res.status(400).json({ error: "Missing PDF base64 file data ❌" });
    }

    try {
        const pdfParse = require("pdf-parse");
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");

        const data = await pdfParse(buffer);
        res.json({ text: data.text || "" });
    } catch (err) {
        console.error("PDF Parsing error:", err);
        // Fallback simulator text in case libraries have environment loader failure
        res.json({ 
            text: "Institute Vision:\nTo be a premier academic institution offering state-of-the-art engineering education and grooming future leaders.\n\nInstitute Mission:\nTo foster technical excellence, deliver practical industry experience, and encourage innovation in engineering research.",
            warning: "PDF parser library failed, returned fallback default text."
        });
    }
});

// ================= OCR FROM IMAGE =================
// POST /api/organizations/ocr-image
router.post("/ocr-image", authenticateUser, async (req, res) => {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
        return res.status(400).json({ error: "Missing Image base64 file data ❌" });
    }

    try {
        const Tesseract = require("tesseract.js");
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");

        const result = await Tesseract.recognize(buffer, "eng");
        res.json({ text: result.data.text || "" });
    } catch (err) {
        console.error("OCR Error:", err);
        // Fallback simulator text
        res.json({ 
            text: "Vision Statement:\nTo deliver holistic education and produce globally competent engineering graduates.\n\nMission Statement:\nTo nurture creativity, implement quality training procedures, and serve society through technological advancements.",
            warning: "OCR library failed, returned fallback default text."
        });
    }
});

module.exports = router;
