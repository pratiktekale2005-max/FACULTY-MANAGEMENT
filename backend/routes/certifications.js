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
        let query = { organizationId };

        // Role-based scoping
        if (role === "HOD") {
            const memberIds = await User.find({ organizationId, departmentId: req.user.departmentId }).distinct("_id");
            query.facultyId = { $in: memberIds };
        } else if (role === "Faculty") {
            query.facultyId = req.user._id;
        }

        // Support target faculty filtering (Principal and HOD only)
        const filterUserId = req.query.targetUserId || req.query.userId;
        if (filterUserId && filterUserId !== "all" && role !== "Faculty") {
            const mongoose = require("mongoose");
            if (mongoose.Types.ObjectId.isValid(filterUserId)) {
                const targetUser = await User.findOne({ _id: filterUserId, organizationId });
                if (targetUser) {
                    if (role === "HOD" && String(targetUser.departmentId) !== String(req.user.departmentId)) {
                        return res.status(403).json({ error: "Access denied: target user belongs to another department ❌" });
                    }
                    query.facultyId = targetUser._id;
                }
            }
        }

        // Filtering
        if (req.query.certificateType && req.query.certificateType !== "All") {
            query.certificateType = req.query.certificateType;
        }
        if (req.query.status && req.query.status !== "All") {
            query.status = req.query.status;
        }

        // Search
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, "i");
            query.$or = [
                { title: searchRegex },
                { issuedBy: searchRegex },
                { description: searchRegex }
            ];
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Sorting by Date
        let sortOption = { issueDate: -1 }; // default sorting: Newest Issue Date first
        if (req.query.sortBy === "issueDateAsc") {
            sortOption = { issueDate: 1 };
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
        console.error(err);
        res.status(500).json({ error: "Failed to fetch certifications ❌" });
    }
});

// ================= GET SINGLE CERTIFICATION =================
// GET /api/certifications/:id
router.get("/:id", authenticateUser, async (req, res) => {
    try {
        const cert = await Certification.findById(req.params.id).populate("facultyId", "name email department");
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
    if (req.user.role !== "Faculty") {
        return res.status(403).json({ error: "Access Denied: Only faculty can manage certifications ❌" });
    }
    const { 
        title, 
        issuedBy, 
        certificateType, 
        description, 
        issueDate, 
        expiryDate, 
        certificateNumber, 
        credentialId, 
        verificationUrl, 
        certificateFile 
    } = req.body;

    // Required fields validation
    if (!title || !issuedBy || !certificateType || !issueDate) {
        return res.status(400).json({ error: "Required fields are missing: Title, Issued By, Type, and Issue Date are required ❌" });
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
            facultyId: req.user._id,
            title,
            issuedBy,
            certificateType,
            description: description || "",
            issueDate,
            expiryDate: expiryDate || "",
            certificateNumber: certificateNumber || "",
            credentialId: credentialId || "",
            verificationUrl: verificationUrl || "",
            certificateFile: certificateFile || "",
            status
        });

        await newCert.save();
        res.json({ message: "Certification added successfully! ✅", certification: newCert });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save certification ❌" });
    }
});

// ================= PUT EDIT CERTIFICATION =================
// PUT /api/certifications/:id
router.put("/:id", authenticateUser, async (req, res) => {
    if (req.user.role !== "Faculty") {
        return res.status(403).json({ error: "Access Denied: Only faculty can manage certifications ❌" });
    }
    const { 
        title, 
        issuedBy, 
        certificateType, 
        description, 
        issueDate, 
        expiryDate, 
        certificateNumber, 
        credentialId, 
        verificationUrl, 
        certificateFile 
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
        if (certificateType) cert.certificateType = certificateType;
        if (description !== undefined) cert.description = description;
        if (issueDate) cert.issueDate = issueDate;
        if (expiryDate !== undefined) cert.expiryDate = expiryDate;
        if (certificateNumber !== undefined) cert.certificateNumber = certificateNumber;
        if (credentialId !== undefined) cert.credentialId = credentialId;
        if (verificationUrl !== undefined) cert.verificationUrl = verificationUrl;
        if (certificateFile !== undefined) cert.certificateFile = certificateFile;

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
        console.error(err);
        res.status(500).json({ error: "Failed to update certification ❌" });
    }
});

// ================= DELETE CERTIFICATION =================
// DELETE /api/certifications/:id
router.delete("/:id", authenticateUser, async (req, res) => {
    if (req.user.role !== "Faculty") {
        return res.status(403).json({ error: "Access Denied: Only faculty can manage certifications ❌" });
    }
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
        console.error(err);
        res.status(500).json({ error: "Failed to delete certification ❌" });
    }
});

module.exports = router;
