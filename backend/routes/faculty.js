const express = require("express");
const router = express.Router();
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
            // Faculty only sees their own profile
            const faculties = await User.find({ _id: req.user._id, organizationId: orgId }).populate("departmentId");
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

        // HOD isolation check
        if (role === "HOD") {
            const facultyDeptId = faculty.departmentId?._id || faculty.departmentId;
            if (String(facultyDeptId) !== String(req.user.departmentId)) {
                return res.status(403).json({ error: "Forbidden: Faculty belongs to another department ❌" });
            }
        }

        // Fetch associated activities from collections
        const [workshops, papers, certifications, activities, subjects, feedbacks] = await Promise.all([
            Workshop.find({ submittedBy: id }).sort({ date: -1, createdAt: -1 }),
            Paper.find({ submittedBy: id }).sort({ date: -1, createdAt: -1 }),
            Certification.find({ facultyId: id }).sort({ issueDate: -1, createdAt: -1 }),
            Activity.find({ userId: id }).sort({ date: -1, createdAt: -1 }),
            Subject.find({ userId: id }).sort({ createdAt: -1 }),
            Feedback.find({ facultyId: id }).sort({ submittedAt: -1 })
        ]);

        // Calculate activity statistics
        const workshopItems = workshops.filter(w => !(w.workshopType && w.workshopType.toLowerCase().includes("seminar")) && !(w.title && w.title.toLowerCase().includes("seminar")));
        const seminarItems = workshops.filter(w => (w.workshopType && w.workshopType.toLowerCase().includes("seminar")) || (w.title && w.title.toLowerCase().includes("seminar")));

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

        // HOD isolation check
        if (role === "HOD") {
            const facultyDeptId = faculty.departmentId?._id || faculty.departmentId;
            if (String(facultyDeptId) !== String(req.user.departmentId)) {
                return res.status(403).json({ error: "Forbidden: Faculty belongs to another department ❌" });
            }
        }
        res.json({ faculty });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error ❌" });
    }
});

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
        if (designation !== undefined) user.designation = designation;
        if (department !== undefined) user.department = department;
        if (employeeId !== undefined) user.employeeId = employeeId;
        if (joiningDate !== undefined) user.joiningDate = joiningDate;
        if (photoBase64 !== undefined) user.photoPath = photoBase64;
        if (resumeBase64 !== undefined) user.resumePath = resumeBase64;

        await user.save();
        res.json({ message: "Profile details updated successfully ✅", faculty: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Failed to update profile ❌" });
    }
});

module.exports = router;

