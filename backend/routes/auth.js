const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
const OtpRequest = require("../models/OtpRequest");
const AuditLog = require("../models/AuditLog");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

// ================= DYNAMIC BRANDING LOOKUP =================
router.get("/branding-by-email", async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.json({ defaultBranding: true });
    }

    try {
        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail }).populate("organizationId");
        if (user && user.organizationId) {
            return res.json({
                name: user.organizationId.name,
                shortName: user.organizationId.shortName,
                logo: user.organizationId.logo,
                primaryColor: user.organizationId.settings?.branding?.primaryColor || "#4F46E5",
                secondaryColor: user.organizationId.settings?.branding?.secondaryColor || "#06B6D4",
                motto: user.organizationId.settings?.branding?.motto || "",
                footer: user.organizationId.settings?.branding?.footer || "",
                restrictDomain: user.organizationId.settings?.restrictDomain || false,
                allowedDomain: user.organizationId.settings?.allowedDomain || ""
            });
        }

        // Domain-only check fallback
        const emailDomain = cleanEmail.split("@")[1];
        if (emailDomain) {
            const org = await Organization.findOne({
                "settings.allowedDomain": emailDomain,
                "settings.restrictDomain": true
            });
            if (org) {
                return res.json({
                    name: org.name,
                    shortName: org.shortName,
                    logo: org.logo,
                    primaryColor: org.settings?.branding?.primaryColor || "#4F46E5",
                    secondaryColor: org.settings?.branding?.secondaryColor || "#06B6D4",
                    motto: org.settings?.branding?.motto || "",
                    footer: org.settings?.branding?.footer || "",
                    restrictDomain: org.settings?.restrictDomain || false,
                    allowedDomain: org.settings?.allowedDomain || ""
                });
            }
        }

        res.json({ defaultBranding: true });
    } catch (err) {
        console.error(err);
        res.json({ defaultBranding: true });
    }
});

// ================= EMAIL + PASSWORD LOGIN =================
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required ❌" });
    }

    try {
        const emailKey = email.trim().toLowerCase();

        // Find user by email and explicitly select the hashed password field
        const user = await User.findOne({ email: emailKey })
            .select("+password")
            .populate("departmentId", "name code")
            .populate("organizationId");

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password ❌" });
        }

        if (user.status === "INACTIVE") {
            user.status = "ACTIVE";
            await user.save();
        }

        // Validate institutional domain restriction if enabled
        if (user.organizationId && user.organizationId.settings?.restrictDomain) {
            const allowedDomain = user.organizationId.settings.allowedDomain;
            if (allowedDomain && !emailKey.endsWith(`@${allowedDomain}`)) {
                return res.status(403).json({ 
                    error: `Access Denied: Logins restricted to institutional domain @${allowedDomain} ❌` 
                });
            }
        }

        // Check if user has a password set
        if (!user.password) {
            return res.status(401).json({ 
                error: "Invalid email or password. Please contact the institution administrator to set your initial password. ❌" 
            });
        }

        // Compare entered password against stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password ❌" });
        }

        // Generate signed JWT Tokens
        const accessToken = jwt.sign(
            { id: user._id, role: user.role, organizationId: user.organizationId?._id },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { id: user._id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Record Audit Log
        const log = new AuditLog({
            organizationId: user.organizationId?._id || null,
            userId: user._id,
            action: "USER_LOGIN",
            description: `${user.name} (${user.role}) logged in successfully via password authentication.`
        });
        await log.save();

        res.json({
            message: "Login successful ✅",
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                fullName: user.name,
                email: user.email,
                role: user.role,
                department: user.departmentId ? user.departmentId.name : user.department,
                departmentId: user.departmentId ? user.departmentId._id : null,
                organizationId: user.organizationId ? user.organizationId._id : null,
                designation: user.designation
            }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ error: "Internal server error during login ❌" });
    }
});

// ================= JWT REFRESH TOKEN =================
router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required ❌" });
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "Invalid refresh token ❌" });
        }
        if (user.status === "INACTIVE") {
            user.status = "ACTIVE";
            await user.save();
        }

        const newAccessToken = jwt.sign(
            { id: user._id, role: user.role, organizationId: user.organizationId },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        console.error("Refresh token error:", err.message);
        res.status(401).json({ error: "Invalid or expired refresh token ❌" });
    }
});

module.exports = router;