const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticateUser } = require("./authMiddleware");

// ================= GET FACULTY DIRECTORY =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role } = req.user;
        const orgId = req.user.organizationId;

        if (role === "Principal") {
            // Principal sees all faculties in organization
            const faculties = await User.find({ organizationId: orgId, role: "Faculty" });
            res.json({ faculties });
        } else if (role === "HOD") {
            // HOD sees department members in organization
            const deptId = req.user.departmentId;
            const faculties = await User.find({ organizationId: orgId, departmentId: deptId, role: "Faculty" });
            res.json({ faculties });
        } else {
            // Faculty only sees their own profile
            const faculties = await User.find({ _id: req.user._id, organizationId: orgId });
            res.json({ faculties });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch faculty list ❌" });
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
        const faculty = await User.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!faculty) {
            return res.status(404).json({ error: "Faculty not found ❌" });
        }

        // HOD isolation check
        if (role === "HOD") {
            if (String(faculty.departmentId) !== String(req.user.departmentId)) {
                return res.status(403).json({ error: "Forbidden: Faculty belongs to another department ❌" });
            }
        }
        res.json({ faculty });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error ❌" });
    }
});

// ================= UPDATE FACULTY PROFILE =================
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
        photoBase64, 
        resumeBase64 
    } = req.body;

    // Access check: Faculty can only update themselves. Principal can update anyone in the org.
    if (role !== "Principal" && String(req.user._id) !== String(id)) {
        return res.status(403).json({ error: "Forbidden: Access denied ❌" });
    }

    try {
        const user = await User.findOne({ _id: id, organizationId: req.user.organizationId });
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
        if (photoBase64 !== undefined) user.photoPath = photoBase64;
        if (resumeBase64 !== undefined) user.resumePath = resumeBase64;

        await user.save();
        res.json({ message: "Profile updated successfully ✅", faculty: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update profile ❌" });
    }
});

module.exports = router;

