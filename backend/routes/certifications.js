const express = require("express");
const router = express.Router();
const Certification = require("../models/Certification");
const User = require("../models/User");
const { authenticateUser } = require("./authMiddleware");

// ================= GET CERTIFICATIONS =================
// GET /api/certifications
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = {};

        // Role-based scoping
        if (role === "Faculty") {
            query.facultyId = req.user._id;
        } else if (role === "HOD") {
            const memberIds = await User.find({ departmentId: req.user.departmentId }).distinct("_id");
            query.facultyId = { $in: memberIds };
        } else {
            // Principal / Admin
            if (organizationId) {
                const memberIds = await User.find({ organizationId }).distinct("_id");
                query.facultyId = { $in: memberIds };
            }
        }

        // Support target faculty filtering (Principal and HOD only)
        const filterUserId = req.query.targetUserId || req.query.userId;
        if (filterUserId && filterUserId !== "all" && role !== "Faculty") {
            const mongoose = require("mongoose");
            if (mongoose.Types.ObjectId.isValid(filterUserId)) {
                const targetUser = await User.findById(filterUserId);
                if (targetUser) {
                    if (role === "HOD" && String(targetUser.departmentId) !== String(req.user.departmentId)) {
                        return res.status(403).json({ error: "Access denied: target user belongs to another department ❌" });
                    }
                    query.facultyId = targetUser._id;
                }
            }
        }

        // Filtering by Type
        const typeFilter = req.query.certificateType || req.query.type;
        if (typeFilter && typeFilter !== "All" && typeFilter !== "all") {
            query.certificateType = typeFilter;
        }

        // Filtering by Status
        if (req.query.status && req.query.status !== "All" && req.query.status !== "all") {
            query.status = req.query.status;
        }

        // Filtering by Academic Year
        if (req.query.academicYear && req.query.academicYear !== "All" && req.query.academicYear !== "all") {
            query.academicYear = req.query.academicYear;
        }

        // Search in title, issuedBy, description, skills
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, "i");
            query.$or = [
                { title: searchRegex },
                { issuedBy: searchRegex },
                { description: searchRegex },
                { skills: searchRegex },
                { certificateNumber: searchRegex }
            ];
        }

        // Date range filtering
        if (req.query.startDate && req.query.endDate) {
            query.issueDate = { $gte: req.query.startDate, $lte: req.query.endDate };
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        // Sorting by Date
        let sortOption = { issueDate: -1, createdAt: -1 };
        if (req.query.sortBy === "issueDateAsc" || req.query.sortBy === "asc") {
            sortOption = { issueDate: 1, createdAt: 1 };
        }

        const total = await Certification.countDocuments(query);
        const certifications = await Certification.find(query)
            .populate("facultyId", "name email department designation")
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        res.json({
            certifications,
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error("Fetch certifications error:", err);
        res.status(500).json({ error: "Failed to fetch certifications ❌" });
    }
});

// ================= GET SINGLE CERTIFICATION =================
// GET /api/certifications/:id
router.get("/:id", authenticateUser, async (req, res) => {
    try {
        const cert = await Certification.findById(req.params.id).populate("facultyId", "name email department designation");
        if (!cert) {
            return res.status(404).json({ error: "Certification not found ❌" });
        }
        res.json({ certification: cert });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch certification details ❌" });
    }
});

// ================= POST ADD CERTIFICATION =================
// POST /api/certifications
router.post("/", authenticateUser, async (req, res) => {
    if (req.user.role !== "Faculty" && req.user.role !== "Principal" && req.user.role !== "HOD") {
        return res.status(403).json({ error: "Access Denied: Unauthorized to manage certifications ❌" });
    }
    const { 
        title, 
        issuedBy, 
        certificateType, 
        type,
        description, 
        skills,
        academicYear,
        issueDate, 
        expiryDate, 
        certificateNumber, 
        credentialId, 
        verificationUrl, 
        certificateFile,
        file 
    } = req.body;

    const resolvedType = certificateType || type || "Training";
    const resolvedFile = certificateFile || file || "";

    // Required fields validation
    if (!title || !issuedBy || !issueDate) {
        return res.status(400).json({ error: "Required fields are missing: Title, Issued By, and Issue Date are required ❌" });
    }

    try {
        // Automatically determine status
        let status = "Active";
        if (expiryDate) {
            const todayStr = new Date().toISOString().split("T")[0];
            if (expiryDate < todayStr) {
                status = "Expired";
            }
        }

        const newCert = new Certification({
            organizationId: req.user.organizationId,
            facultyId: req.user._id,
            title,
            issuedBy,
            certificateType: resolvedType,
            description: description || "",
            skills: skills || "",
            academicYear: academicYear || "2026-2027",
            issueDate,
            expiryDate: expiryDate || "",
            certificateNumber: certificateNumber || credentialId || "",
            credentialId: credentialId || certificateNumber || "",
            verificationUrl: verificationUrl || "",
            certificateFile: resolvedFile,
            status
        });

        await newCert.save();
        res.json({ message: "Certification added successfully! ✅", certification: newCert });
    } catch (err) {
        console.error("Save certification error:", err);
        res.status(500).json({ error: "Failed to save certification ❌" });
    }
});

// ================= PUT EDIT CERTIFICATION =================
// PUT /api/certifications/:id
router.put("/:id", authenticateUser, async (req, res) => {
    const { 
        title, 
        issuedBy, 
        certificateType, 
        type,
        description, 
        skills,
        academicYear,
        issueDate, 
        expiryDate, 
        certificateNumber, 
        credentialId, 
        verificationUrl, 
        certificateFile,
        file 
    } = req.body;

    try {
        const cert = await Certification.findById(req.params.id);
        if (!cert) {
            return res.status(404).json({ error: "Certification not found ❌" });
        }

        // Access check
        if (req.user.role === "Faculty" && String(cert.facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: cannot edit another faculty's certificate ❌" });
        }

        if (title) cert.title = title;
        if (issuedBy) cert.issuedBy = issuedBy;
        if (certificateType || type) cert.certificateType = certificateType || type;
        if (description !== undefined) cert.description = description;
        if (skills !== undefined) cert.skills = skills;
        if (academicYear !== undefined) cert.academicYear = academicYear;
        if (issueDate) cert.issueDate = issueDate;
        if (expiryDate !== undefined) cert.expiryDate = expiryDate;
        if (certificateNumber !== undefined) cert.certificateNumber = certificateNumber;
        if (credentialId !== undefined) cert.credentialId = credentialId;
        if (verificationUrl !== undefined) cert.verificationUrl = verificationUrl;
        if (certificateFile !== undefined || file !== undefined) cert.certificateFile = certificateFile || file || "";

        // Re-evaluate status
        if (cert.expiryDate) {
            const todayStr = new Date().toISOString().split("T")[0];
            cert.status = cert.expiryDate < todayStr ? "Expired" : "Active";
        } else {
            cert.status = "Active";
        }

        await cert.save();
        res.json({ message: "Certification updated successfully! ✅", certification: cert });
    } catch (err) {
        console.error("Update certification error:", err);
        res.status(500).json({ error: "Failed to update certification ❌" });
    }
});

// ================= DELETE CERTIFICATION =================
// DELETE /api/certifications/:id
router.delete("/:id", authenticateUser, async (req, res) => {
    try {
        const cert = await Certification.findById(req.params.id);
        if (!cert) {
            return res.status(404).json({ error: "Certification not found ❌" });
        }

        // Access check
        if (req.user.role === "Faculty" && String(cert.facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: cannot delete another faculty's certificate ❌" });
        }

        await Certification.findByIdAndDelete(req.params.id);
        res.json({ message: "Certification deleted successfully ✅" });
    } catch (err) {
        console.error("Delete certification error:", err);
        res.status(500).json({ error: "Failed to delete certification ❌" });
    }
});

module.exports = router;
