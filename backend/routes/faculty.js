const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Workshop = require("../models/Workshop");
const Paper = require("../models/Paper");
const Certification = require("../models/Certification");
const Activity = require("../models/Activity");
const Subject = require("../models/Subject");
const Feedback = require("../models/Feedback");
const { authenticateUser } = require("./authMiddleware");

// ================= GET FACULTY DIRECTORY =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role } = req.user;
        const orgId = req.user.organizationId;

        const { role: filterRole } = req.query;

        if (role === "Principal") {
            // Principal sees all members (Faculty, HOD, Principal/Administration) across all departments
            const query = { organizationId: orgId };
            if (filterRole && filterRole !== "ALL" && filterRole !== "All") {
                query.role = filterRole;
            }
            const faculties = await User.find(query).populate("departmentId").sort({ role: 1, name: 1 });
            res.json({ faculties });
        } else if (role === "HOD") {
            // HOD sees department members in organization (including HOD and department faculty)
            const deptId = req.user.departmentId;
            const query = { organizationId: orgId, departmentId: deptId };
            if (filterRole && filterRole !== "ALL") {
                query.role = filterRole;
            }
            const faculties = await User.find(query).populate("departmentId").sort({ role: 1, name: 1 });
            res.json({ faculties });
        } else {
            // Faculty sees department members in organization
            const deptId = req.user.departmentId;
            const query = { organizationId: orgId };
            if (deptId) {
                query.departmentId = deptId;
            } else {
                query._id = req.user._id;
            }
            if (filterRole && filterRole !== "ALL" && filterRole !== "All") {
                query.role = filterRole;
            }
            const faculties = await User.find(query).populate("departmentId").sort({ role: 1, name: 1 });
            res.json({ faculties });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch faculty list ❌" });
    }
});

// ================= GET SINGLE FACULTY FULL PORTFOLIO WITH ACTIVITIES =================
router.get("/:id/full-profile", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { role } = req.user;

    // Role-based access checks: Faculty can only see themselves. Principal/HOD can see members.
    if (role !== "Principal" && role !== "HOD" && String(req.user._id) !== String(id)) {
        return res.status(403).json({ error: "Forbidden: You do not have permissions to view other profiles ❌" });
    }

    try {
        const faculty = await User.findOne({ _id: id, organizationId: req.user.organizationId }).populate("departmentId");
        if (!faculty) {
            return res.status(404).json({ error: "Faculty not found ❌" });
        }

        // HOD isolation check: Check both departmentId and department name
        if (role === "HOD") {
            const facultyDeptId = faculty.departmentId?._id || faculty.departmentId;
            const hodDeptId = req.user.departmentId?._id || req.user.departmentId;
            const sameDeptId = facultyDeptId && hodDeptId && String(facultyDeptId) === String(hodDeptId);
            const sameDeptName = faculty.department && req.user.department && faculty.department.trim().toLowerCase() === req.user.department.trim().toLowerCase();
            const isSelf = String(faculty._id) === String(req.user._id);
            if (!sameDeptId && !sameDeptName && !isSelf) {
                return res.status(403).json({ error: "Forbidden: Faculty belongs to another department ❌" });
            }
        }

        const userObjId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        const idMatches = [userObjId];
        if (typeof id === "string" && !idMatches.includes(id)) {
            idMatches.push(id);
        }

        const orgFilter = req.user.organizationId ? {
            $or: [
                { organizationId: req.user.organizationId },
                { organizationId: { $exists: false } },
                { organizationId: null }
            ]
        } : {};

        // Fetch associated activities from collections with robust field matching
        const [workshops, papers, certifications, activities, subjects, feedbacks] = await Promise.all([
            Workshop.find({
                ...orgFilter,
                $or: [
                    { submittedBy: { $in: idMatches } },
                    { userId: { $in: idMatches } },
                    { facultyId: { $in: idMatches } },
                    ...(faculty.email ? [{ "coordinators.email": faculty.email }] : [])
                ]
            }).sort({ date: -1, createdAt: -1 }),
            Paper.find({
                ...orgFilter,
                $or: [
                    { submittedBy: { $in: idMatches } },
                    { userId: { $in: idMatches } },
                    { facultyId: { $in: idMatches } },
                    ...(faculty.email ? [{ authorEmail: faculty.email }] : [])
                ]
            }).sort({ date: -1, createdAt: -1 }),
            Certification.find({
                ...orgFilter,
                $or: [
                    { facultyId: { $in: idMatches } },
                    { userId: { $in: idMatches } },
                    { submittedBy: { $in: idMatches } }
                ]
            }).sort({ issueDate: -1, createdAt: -1 }),
            Activity.find({
                ...orgFilter,
                $or: [
                    { userId: { $in: idMatches } },
                    { submittedBy: { $in: idMatches } },
                    { facultyId: { $in: idMatches } }
                ]
            }).sort({ date: -1, createdAt: -1 }),
            Subject.find({
                ...orgFilter,
                $or: [
                    { userId: { $in: idMatches } },
                    { facultyId: { $in: idMatches } }
                ]
            }).sort({ createdAt: -1 }),
            Feedback.find({
                ...orgFilter,
                $or: [
                    { facultyId: { $in: idMatches } },
                    { userId: { $in: idMatches } }
                ]
            }).sort({ submittedAt: -1 })
        ]);

        // Calculate activity statistics and classify workshops vs seminars
        const isSeminar = (w) => {
            const str = `${w.title || ""} ${w.workshopType || ""} ${w.category || ""} ${w.eventType || ""}`.toLowerCase();
            return str.includes("seminar") || str.includes("guest lecture") || str.includes("webinar");
        };
        const seminarItems = workshops.filter(isSeminar);
        const workshopItems = workshops.filter(w => !isSeminar(w));

        const workshopsOrganized = workshops.filter(w => w.eventType === "organized" || w.workshopType === "Arranged by Self").length;
        const workshopsAttended = workshops.filter(w => w.eventType === "attended" || w.workshopType === "Attended" || w.workshopType === "External").length;
        const fdps = certifications.filter(c => {
            const t = (c.certificateType || "").toLowerCase();
            return t === "fdp" || t === "sttp" || t.includes("fdp") || t.includes("faculty development");
        }).length;

        // Count unique students across subjects
        const studentSet = new Set();
        subjects.forEach(s => {
            if (Array.isArray(s.students)) {
                s.students.forEach(st => {
                    const identifier = (st.rollNumber || st.name || st._id)?.toString().trim().toLowerCase();
                    if (identifier) studentSet.add(identifier);
                });
            }
        });

        const activityCounts = {
            totalWorkshops: workshopItems.length,
            totalSeminars: seminarItems.length,
            allWorkshopsTotal: workshops.length,
            workshopsOrganized,
            workshopsAttended,
            totalPapers: papers.length,
            publishedPapers: papers.filter(p => p.publicationStatus === "Published" || p.status === "verified").length,
            totalCertifications: certifications.length,
            fdpCount: fdps,
            totalActivities: activities.length,
            totalSubjects: subjects.length,
            totalStudents: studentSet.size,
            totalFeedbacks: feedbacks.length
        };

        res.json({
            faculty,
            activities: {
                workshops: workshopItems,
                seminars: seminarItems,
                allWorkshopsAndSeminars: workshops,
                papers,
                certifications,
                otherActivities: activities,
                subjects,
                feedbacks
            },
            activityCounts
        });
    } catch (err) {
        console.error("Full profile fetch error:", err);
        res.status(500).json({ error: "Server error fetching faculty profile ❌" });
    }
});

const { verifyFacultyCredentials } = require("../services/emailService");
// ================= GET CURRENT USER PROFILE =================
router.get("/me", authenticateUser, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.user._id, organizationId: req.user.organizationId }).populate("departmentId");
        if (!user) {
            return res.status(404).json({ error: "User profile not found ❌" });
        }
        res.json({ faculty: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching personal profile ❌" });
    }
});

// ================= GET CURRENT USER EMAIL SETTINGS =================
router.get("/me/email-settings", authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: "User not found ❌" });
        }

        const settings = user.emailSettings || {};
        res.json({
            configured: !!settings.configured,
            email: settings.email || user.email,
            service: settings.service || "gmail",
            host: settings.host || "",
            port: settings.port || 587,
            secure: !!settings.secure,
            verifiedAt: settings.verifiedAt || null
        });
    } catch (err) {
        console.error("Fetch email settings error:", err);
        res.status(500).json({ error: "Failed to load email settings ❌" });
    }
});

// ================= TEST EMAIL CREDENTIALS =================
router.post("/me/test-email-settings", authenticateUser, async (req, res) => {
    try {
        let { service, email, appPassword, host, port, secure } = req.body;

        // If appPassword is not provided in body, check if already stored in user record
        if (!appPassword) {
            const user = await User.findById(req.user._id).select("+emailSettings.appPassword");
            if (user?.emailSettings?.appPassword) {
                appPassword = user.emailSettings.appPassword;
                email = email || user.emailSettings.email || user.email;
                service = service || user.emailSettings.service || "gmail";
                host = host || user.emailSettings.host;
                port = port || user.emailSettings.port;
                secure = secure !== undefined ? secure : user.emailSettings.secure;
            }
        }

        if (!email || !appPassword) {
            return res.status(400).json({ 
                error: "Both email address and password/App Password are required to test connection." 
            });
        }

        const result = await verifyFacultyCredentials({
            service: service || "gmail",
            email: email.trim(),
            appPassword: appPassword.trim().replace(/\s+/g, ""),
            host: host ? host.trim() : undefined,
            port: port ? Number(port) : undefined,
            secure: Boolean(secure)
        });

        if (result.success) {
            res.json({ 
                success: true, 
                message: `Connection verified successfully! Authenticated as ${email.trim()}.` 
            });
        } else {
            res.status(400).json({ 
                error: result.error || "Failed to verify SMTP credentials. Please check your email and App Password." 
            });
        }
    } catch (err) {
        console.error("Test email settings error:", err);
        res.status(400).json({ 
            error: err.message || "Failed to verify email credentials ❌" 
        });
    }
});

// ================= UPDATE EMAIL SETTINGS =================
router.put("/me/email-settings", authenticateUser, async (req, res) => {
    try {
        const { configured, service = "gmail", email, appPassword, host, port, secure } = req.body;
        const user = await User.findById(req.user._id).select("+emailSettings.appPassword");

        if (!user) {
            return res.status(404).json({ error: "User not found ❌" });
        }

        // If disabling configuration
        if (configured === false) {
            user.emailSettings = {
                configured: false,
                service: "gmail",
                email: "",
                appPassword: "",
                host: "",
                port: 587,
                secure: false,
                verifiedAt: null
            };
            await user.save();
            return res.json({ 
                message: "Email sending credentials removed successfully ✅",
                emailSettings: { configured: false }
            });
        }

        const effectiveEmail = (email || user.emailSettings?.email || user.email || "").trim();
        const effectivePassword = (appPassword ? appPassword.trim().replace(/\s+/g, "") : user.emailSettings?.appPassword || "");

        if (!effectiveEmail || !effectivePassword) {
            return res.status(400).json({ 
                error: "Both college/work email and App Password are required to configure email sending." 
            });
        }

        // Verify credentials with SMTP before saving
        const verifyRes = await verifyFacultyCredentials({
            service,
            email: effectiveEmail,
            appPassword: effectivePassword,
            host: host ? host.trim() : undefined,
            port: port ? Number(port) : undefined,
            secure: Boolean(secure)
        });

        if (!verifyRes.success) {
            return res.status(400).json({ 
                error: `SMTP Authentication failed: ${verifyRes.error}. Please check your App Password and try again.` 
            });
        }

        user.emailSettings = {
            configured: true,
            service: service || "gmail",
            email: effectiveEmail,
            appPassword: effectivePassword,
            host: host ? host.trim() : "",
            port: port ? Number(port) : 587,
            secure: Boolean(secure),
            verifiedAt: new Date()
        };

        await user.save();

        res.json({
            message: `Email sending credentials configured and verified for ${effectiveEmail} ✅`,
            emailSettings: {
                configured: true,
                service: user.emailSettings.service,
                email: user.emailSettings.email,
                host: user.emailSettings.host,
                port: user.emailSettings.port,
                secure: user.emailSettings.secure,
                verifiedAt: user.emailSettings.verifiedAt
            }
        });
    } catch (err) {
        console.error("Save email settings error:", err);
        res.status(500).json({ error: err.message || "Failed to update email settings ❌" });
    }
});
// ================= GET SINGLE FACULTY PORTFOLIO =================
router.get("/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { role } = req.user;

    // Role-based access checks: Faculty can only see themselves. Principal/HOD can see members.
    if (role !== "Principal" && role !== "HOD" && String(req.user._id) !== String(id)) {
        return res.status(403).json({ error: "Forbidden: You do not have permissions to view other profiles ❌" });
    }

    try {
        const faculty = await User.findOne({ _id: id, organizationId: req.user.organizationId }).populate("departmentId");
        if (!faculty) {
            return res.status(404).json({ error: "Faculty not found ❌" });
        }

        // HOD isolation check: Check both departmentId and department name
        if (role === "HOD") {
            const facultyDeptId = faculty.departmentId?._id || faculty.departmentId;
            const hodDeptId = req.user.departmentId?._id || req.user.departmentId;
            const sameDeptId = facultyDeptId && hodDeptId && String(facultyDeptId) === String(hodDeptId);
            const sameDeptName = faculty.department && req.user.department && faculty.department.trim().toLowerCase() === req.user.department.trim().toLowerCase();
            const isSelf = String(faculty._id) === String(req.user._id);
            if (!sameDeptId && !sameDeptName && !isSelf) {
                return res.status(403).json({ error: "Forbidden: Faculty belongs to another department ❌" });
            }
        }
        res.json({ faculty });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error ❌" });
    }
});

// ================= UPDATE FACULTY / PERSONAL PROFILE =================
router.put("/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { role } = req.user;
    const { 
        name,
        phone, 
        experience, 
        skills, 
        achievements, 
        qualification,
        researchInterests,
        designation,
        department,
        employeeId,
        joiningDate,
        photoBase64, 
        resumeBase64 
    } = req.body;

    const targetId = (id === "profile" || id === "me") ? req.user._id : id;

    // Access check: Users can update themselves. Principal can update anyone in the org.
    if (role !== "Principal" && String(req.user._id) !== String(targetId)) {
        return res.status(403).json({ error: "Forbidden: Access denied ❌" });
    }

    try {
        const user = await User.findOne({ _id: targetId, organizationId: req.user.organizationId });
        if (!user) {
            return res.status(404).json({ error: "User profile not found ❌" });
        }

        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (experience !== undefined) user.experience = experience;
        if (skills !== undefined) user.skills = skills;
        if (achievements !== undefined) user.achievements = achievements;
        if (qualification !== undefined) user.qualification = qualification;
        if (researchInterests !== undefined) user.researchInterests = researchInterests;
        if (joiningDate !== undefined) user.joiningDate = joiningDate;
        if (photoBase64 !== undefined) user.photoPath = photoBase64;
        if (resumeBase64 !== undefined) user.resumePath = resumeBase64;

        // Protected fields: Only Principal can modify administrative fields
        if (role === "Principal") {
            if (designation !== undefined) user.designation = designation;
            if (department !== undefined) user.department = department;
            if (employeeId !== undefined) user.employeeId = employeeId;
        } else {
            // For faculty, allow updating title/designation if desired, but keep employeeId and department fixed
            if (designation !== undefined && user.role !== "Principal") user.designation = designation;
        }

        await user.save();
        res.json({ message: "Profile details updated successfully ✅", faculty: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Failed to update profile ❌" });
    }
});

module.exports = router;

