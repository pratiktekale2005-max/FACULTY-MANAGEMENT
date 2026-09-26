const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

// Resolves requester user from request token, query, or body and checks database authenticity
const authenticateUser = async (req, res, next) => {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ error: "Access Denied: Missing authentication token ❌" });
    }

    let userId = null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
    } catch (err) {
        console.error("JWT Verification failed:", err.message);
        return res.status(401).json({ error: "Access Denied: Invalid or expired access token ❌", code: "TOKEN_EXPIRED" });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ error: "Access Denied: Invalid user ID ❌" });
        }

        if (user.status === "INACTIVE") {
            user.status = "ACTIVE";
            await user.save();
        }

        // Attach authenticated user payload to request
        req.user = user;
        next();
    } catch (err) {
        console.error("RBAC auth error:", err);
        return res.status(500).json({ error: "Internal Authentication Failure ❌" });
    }
};

const requireRole = (allowedRoles) => {
    return [
        authenticateUser,
        (req, res, next) => {
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: `Forbidden: This resource requires one of the following roles: [${allowedRoles.join(", ")}] ❌` });
            }
            next();
        }
    ];
};

const requireDepartmentIsolation = () => {
    return [
        authenticateUser,
        async (req, res, next) => {
            // Principal has global bypass access
            if (req.user.role === "Principal") {
                return next();
            }

            // HOD is isolated to their departmentId
            if (req.user.role === "HOD") {
                const targetUserId = req.query.targetUserId || req.body.targetUserId || req.params.facultyId || req.body.assignedTo;
                if (targetUserId) {
                    const targetUser = await User.findById(targetUserId);
                    if (targetUser) {
                        if (String(targetUser.departmentId) !== String(req.user.departmentId)) {
                            return res.status(403).json({ error: "Forbidden: Department access isolation active ❌" });
                        }
                        if (String(targetUser.organizationId) !== String(req.user.organizationId)) {
                            return res.status(403).json({ error: "Forbidden: Tenant isolation mismatch ❌" });
                        }
                    }
                }
                return next();
            }

            // Faculty is isolated strictly to their own user ID
            const targetUserId = req.query.targetUserId || req.body.targetUserId || req.params.facultyId || req.query.userId || req.body.userId;
            if (targetUserId && String(targetUserId) !== String(req.user._id)) {
                return res.status(403).json({ error: "Forbidden: Access denied to other faculty records ❌" });
            }

            next();
        }
    ];
};

module.exports = {
    authenticateUser,
    requireRole,
    requireDepartmentIsolation
};

