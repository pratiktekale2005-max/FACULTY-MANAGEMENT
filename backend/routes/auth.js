const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
const OtpRequest = require("../models/OtpRequest");
const AuditLog = require("../models/AuditLog");
const { sendOtpEmail } = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

// Generate 6-digit OTP code string
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP string using SHA-256
function hashOtp(otp) {
    return crypto.createHash("sha256").update(otp).digest("hex");
}

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

// ================= SEND OTP =================
router.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email address is required ❌" });
    }

    try {
        const emailKey = email.trim().toLowerCase();

        console.log("======================================");
        console.log("[LOGIN DEBUG] Email received:", email);
        console.log("[LOGIN DEBUG] Email normalized:", emailKey);
        console.log("[LOGIN DEBUG] DB:", User.db.name);
        console.log("[LOGIN DEBUG] Collection:", User.collection.name);

        // 1. Verify user exists and check if active
        const user = await User.findOne({ email: emailKey }).populate("organizationId");



        console.log("[LOGIN DEBUG] User found:", user ? user.email : "NOT FOUND");
        console.log("======================================");

        if (!user) {
            return res.status(404).json({
                error: "Email address is not registered in system ❌"
            });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({
                error: "Your account is currently inactive. Please contact the institution administrator."
            });
        }
        // 2. Validate email domain restriction if enabled on organization
        if (user.organizationId && user.organizationId.settings?.restrictDomain) {
            const allowedDomain = user.organizationId.settings.allowedDomain;
            if (allowedDomain && !emailKey.endsWith(`@${allowedDomain}`)) {
                return res.status(403).json({ error: `Access Denied: Logins restricted to institutional domain @${allowedDomain} ❌` });
            }
        }

        // 3. Rate-limiting check: At most one OTP request every 30 seconds
        const lastRequest = await OtpRequest.findOne({ email: emailKey }).sort({ createdAt: -1 });
        if (lastRequest && (Date.now() - new Date(lastRequest.createdAt).getTime() < 30 * 1000)) {
            return res.status(429).json({ error: "Please wait 30 seconds before requesting another code ⏱️" });
        }

        // 4. Generate and hash OTP
        const otpCode = generateOTP();
        const hashed = hashOtp(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

        // Save OtpRequest record
        const requestDoc = new OtpRequest({
            email: emailKey,
            otpHash: hashed,
            expiresAt,
            attempts: 0,
            used: false
        });
        await requestDoc.save();

        // Print to node console for developer sandbox review
        console.log(`\n======================================================`);
        console.log(`[OTP LOGIN SERVICE] Generated code for: ${emailKey}`);
        console.log(`🔑 SECURE OTP: ${otpCode} (Valid for 5 minutes)`);
        console.log(`======================================================\n`);

        // 5. Send actual email through abstraction service
        let emailDispatched = false;
        try {
            emailDispatched = await sendOtpEmail(emailKey, user.name, otpCode);
        } catch (emailErr) {
            console.error("Email sending failed:", emailErr);
        }

        res.json({
            message: "Verification OTP code sent successfully ✅",
            emailDispatched,
            devOtp: (!emailDispatched || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) ? otpCode : undefined
        });

    } catch (error) {
        console.log("SEND OTP ERROR:", error);
        res.status(500).json({ error: "Internal server error ❌" });
    }
});

// ================= VERIFY OTP =================
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP code are required ❌" });
    }

    try {
        const emailKey = email.trim().toLowerCase();
        const incomingOtp = otp.trim();

        // Find the latest active non-used and non-expired OTP record
        const activeOtp = await OtpRequest.findOne({
            email: emailKey,
            used: false,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!activeOtp) {
            return res.status(400).json({ error: "OTP expired, invalid, or already verified ❌" });
        }

        // Limit verification attempts to 3
        if (activeOtp.attempts >= 3) {
            return res.status(429).json({ error: "Too many incorrect attempts. Please request a new security code ❌" });
        }

        // Increment attempts count
        activeOtp.attempts += 1;

        // Hash incoming and verify
        const hashedIncoming = hashOtp(incomingOtp);
        if (activeOtp.otpHash === hashedIncoming) {
            activeOtp.used = true;
            await activeOtp.save();

            // Load user profile
            const user = await User.findOne({ email: emailKey })
                .populate("departmentId", "name code")
                .populate("organizationId");
            if (!user) {
                return res.status(404).json({ error: "User profile record not found ❌" });
            }

            if (user.status === "INACTIVE") {
                return res.status(403).json({ error: "Your account is currently inactive. Please contact the institution administrator." });
            }

            // Generate JWT Tokens
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

            const log = new AuditLog({
                organizationId: user.organizationId?._id || null,
                userId: user._id,
                action: "USER_LOGIN",
                description: `${user.name} (${user.role}) logged in successfully via OTP.`
            });
            await log.save();

            return res.json({
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
        } else {
            await activeOtp.save();
            return res.status(400).json({ error: `Invalid OTP code. ${3 - activeOtp.attempts} attempts remaining ❌` });
        }
    } catch (error) {
        console.log("VERIFY OTP ERROR:", error);
        res.status(500).json({ error: "Internal server error ❌" });
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
        if (!user || user.status === "INACTIVE") {
            return res.status(401).json({ error: "Invalid refresh token or inactive account ❌" });
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