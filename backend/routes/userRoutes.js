const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Department = require("../models/Department");
const AuditLog = require("../models/AuditLog");
const { requireRole } = require("./authMiddleware");
const { sendWelcomeEmail } = require("../services/emailService");

// Helper function to check if department already has an active HOD
async function validateHodAssignment(departmentId, excludeUserId = null) {
    if (!departmentId) return false;
    const query = {
        role: "HOD",
        departmentId,
        status: "ACTIVE"
    };
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }
    const existingHod = await User.findOne(query);
    return !!existingHod;
}

// ================= GET ALL USERS (PRINCIPAL & HOD) =================
router.get("/", requireRole(["Principal", "HOD"]), async (req, res) => {
    try {
        const { search, role, departmentId } = req.query;
        const query = { organizationId: req.user.organizationId };

        if (search && search.trim()) {
            const cleanSearch = search.trim();
            query.$or = [
                { name: { $regex: cleanSearch, $options: "i" } },
                { email: { $regex: cleanSearch, $options: "i" } },
                { employeeId: { $regex: cleanSearch, $options: "i" } }
            ];
        }

        // Only filter by role if specifically requested and not 'All'
        if (role && role !== "All" && role !== "all" && role !== "ALL" && role.trim() !== "") {
            query.role = role.trim();
        }

        // Only filter by department if specifically requested and not 'All'
        if (departmentId && departmentId !== "All" && departmentId !== "all" && departmentId !== "ALL" && departmentId.trim() !== "") {
            query.departmentId = departmentId.trim();
        }

        const users = await User.find(query)
            .populate("departmentId", "name code")
            .sort({ createdAt: -1 });

        res.json({ users });
    } catch (err) {
        console.error("Fetch users error:", err);
        res.status(500).json({ error: "Failed to load user accounts database ❌" });
    }
});

// ================= POST CREATE USER (PRINCIPAL ONLY) =================
router.post("/", requireRole(["Principal"]), async (req, res) => {
    const { name, email, employeeId, phone, designation, role, departmentId, status, joiningDate } = req.body;

    if (!name || !email || !role || !designation || !departmentId) {
        return res.status(400).json({ error: "Missing required profile attributes ❌" });
    }

    try {
        const emailKey = email.trim().toLowerCase();

        // 1. Email uniqueness check
        const existingEmail = await User.findOne({ email: emailKey });
        if (existingEmail) {
            return res.status(400).json({ error: "A user profile with this email address is already registered ❌" });
        }

        // 2. Employee ID uniqueness check (if provided)
        if (employeeId) {
            const existingId = await User.findOne({ organizationId: req.user.organizationId, employeeId: employeeId.trim() });
            if (existingId) {
                return res.status(400).json({ error: "Employee ID is already assigned to another staff member in your institution ❌" });
            }
        }

        // 3. Department validation
        const dept = await Department.findOne({ _id: departmentId, organizationId: req.user.organizationId });
        if (!dept) {
            return res.status(404).json({ error: "Assigned institutional department not found ❌" });
        }

        // 4. HOD Assignment logic: demote previous HOD if any
        if (role === "HOD") {
            if (status !== "ACTIVE") {
                return res.status(400).json({ error: "Cannot assign an inactive user as HOD. HODs must be ACTIVE. ❌" });
            }

            // Find existing active HOD for this department and demote to Faculty
            const existingHod = await User.findOne({
                role: "HOD",
                departmentId,
                status: "ACTIVE",
                organizationId: req.user.organizationId
            });
            if (existingHod) {
                existingHod.role = "Faculty";
                await existingHod.save();
            }
        }

        // 5. Create user
        const newUser = new User({
            organizationId: req.user.organizationId,
            name,
            email: emailKey,
            employeeId: employeeId ? employeeId.trim() : undefined,
            phone: phone || "",
            designation,
            role,
            department: dept.name,
            departmentId,
            status: status || "ACTIVE",
            joiningDate: joiningDate || "",
            createdBy: req.user._id
        });

        await newUser.save();

        // Update HOD reference in Department model if applicable
        if (role === "HOD" && status === "ACTIVE") {
            dept.hodId = newUser._id;
            await dept.save();
        }

        // Audit Log
        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "CREATE_USER",
            description: `Principal created account for ${name} (${role}) in department ${dept.name}.`
        });
        await log.save();

        // Dispatch Welcome Email asynchronously
        sendWelcomeEmail(
            newUser.email,
            newUser.name,
            newUser.role,
            dept.name,
            req.user.name
        ).catch(err => console.error("Async welcome email fail:", err));

        res.json({ message: "User account created successfully! ✅", user: newUser });
    } catch (err) {
        console.error("Create user error:", err);
        res.status(500).json({ error: "Failed to register user account ❌" });
    }
});

// ================= PUT UPDATE USER (PRINCIPAL ONLY) =================
router.put("/:id", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    const { name, email, employeeId, phone, designation, role, departmentId, status, joiningDate } = req.body;

    try {
        const user = await User.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!user) {
            return res.status(404).json({ error: "User profile not found in your institution ❌" });
        }

        const emailKey = email ? email.trim().toLowerCase() : user.email;

        // Verify email uniqueness
        if (emailKey !== user.email) {
            const existingEmail = await User.findOne({ email: emailKey });
            if (existingEmail) {
                return res.status(400).json({ error: "This email address is already assigned to another profile ❌" });
            }
        }

        // Verify Employee ID uniqueness
        if (employeeId && employeeId.trim() !== user.employeeId) {
            const existingId = await User.findOne({ organizationId: req.user.organizationId, employeeId: employeeId.trim() });
            if (existingId) {
                return res.status(400).json({ error: "Employee ID is already assigned to another staff member in your institution ❌" });
            }
        }

        // If department changes
        let dept = null;
        if (departmentId && String(departmentId) !== String(user.departmentId)) {
            dept = await Department.findOne({ _id: departmentId, organizationId: req.user.organizationId });
            if (!dept) {
                return res.status(404).json({ error: "Selected department does not exist in your institution ❌" });
            }
        }

        const finalRole = role || user.role;
        const finalStatus = status || user.status;
        const finalDeptId = departmentId || user.departmentId;

        // Verify HOD Assignment logic: demote previous HOD if any
        if (finalRole === "HOD") {
            if (finalStatus !== "ACTIVE") {
                return res.status(400).json({ error: "Cannot assign an inactive user as HOD. HODs must be ACTIVE. ❌" });
            }

            // Find existing active HOD for this department (different from current user) and demote
            const existingHod = await User.findOne({
                role: "HOD",
                departmentId: finalDeptId,
                status: "ACTIVE",
                _id: { $ne: user._id },
                organizationId: req.user.organizationId
            });
            if (existingHod) {
                existingHod.role = "Faculty";
                await existingHod.save();
            }
        }

        // Apply edits
        if (name) user.name = name;
        if (email) user.email = emailKey;
        if (employeeId) user.employeeId = employeeId.trim();
        if (phone !== undefined) user.phone = phone;
        if (designation) user.designation = designation;
        if (role) user.role = role;
        if (joiningDate !== undefined) user.joiningDate = joiningDate;

        if (dept) {
            user.department = dept.name;
            user.departmentId = dept._id;
        }

        // If HOD changes to active HOD, clean up old department's reference and set new one
        const oldRole = user.role;
        const oldStatus = user.status;

        user.status = finalStatus;

        await user.save();

        // Update HOD mappings in Department model
        // If they were HOD, but their department has changed or they are no longer HOD or are inactive
        if (oldRole === "HOD" && (finalRole !== "HOD" || finalStatus !== "ACTIVE" || String(finalDeptId) !== String(user.departmentId))) {
            // Remove as HOD from old department
            await Department.updateOne({ hodId: user._id, organizationId: req.user.organizationId }, { $unset: { hodId: "" } });
        }
        if (finalRole === "HOD" && finalStatus === "ACTIVE") {
            await Department.updateOne({ _id: finalDeptId, organizationId: req.user.organizationId }, { hodId: user._id });
        }

        // Audit Log
        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "EDIT_USER",
            description: `Principal edited user account ${user.name} (${user.role}).`
        });
        await log.save();

        res.json({ message: "User account edited successfully! ✅", user });
    } catch (err) {
        console.error("Update user error:", err);
        res.status(500).json({ error: "Failed to update user profile ❌" });
    }
});

// ================= PUT TOGGLE STATUS (PRINCIPAL ONLY) =================
router.put("/:id/status", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE | INACTIVE

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value ❌" });
    }

    try {
        const user = await User.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!user) {
            return res.status(404).json({ error: "User account not found in your institution ❌" });
        }

        // Demote existing HOD if activating HOD user
        if (user.role === "HOD" && status === "ACTIVE") {
            const existingHod = await User.findOne({
                role: "HOD",
                departmentId: user.departmentId,
                status: "ACTIVE",
                _id: { $ne: user._id },
                organizationId: req.user.organizationId
            });
            if (existingHod) {
                existingHod.role = "Faculty";
                await existingHod.save();
            }
        }

        user.status = status;
        await user.save();

        // Update hodId mapping on Department model
        if (user.role === "HOD") {
            if (status === "ACTIVE") {
                await Department.updateOne({ _id: user.departmentId, organizationId: req.user.organizationId }, { hodId: user._id });
            } else {
                await Department.updateOne({ _id: user.departmentId, organizationId: req.user.organizationId, hodId: user._id }, { $unset: { hodId: "" } });
            }
        }

        // Audit Log
        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: `${status}_USER`,
            description: `Principal toggled account status of ${user.name} to ${status}.`
        });
        await log.save();

        res.json({ message: `User status successfully toggled to ${status}! ✅`, user });
    } catch (err) {
        console.error("Toggle user status error:", err);
        res.status(500).json({ error: "Failed to toggle user status ❌" });
    }
});

// ================= POST BULK CREATE (PRINCIPAL ONLY) =================
router.post("/bulk-create", requireRole(["Principal"]), async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
        return res.status(400).json({ error: "Invalid payload: 'users' must be an array ❌" });
    }
    const saved = [];
    const errors = [];

    for (let i = 0; i < users.length; i++) {
        const u = users[i];
        const { name, email, employeeId, designation, role, departmentId, status } = u;
        if (!name || !email || !role || !designation || !departmentId) {
            errors.push(`Row ${i + 1}: Missing mandatory attributes (name, email, role, designation, departmentId)`);
            continue;
        }

        try {
            const emailKey = email.trim().toLowerCase();
            const existingEmail = await User.findOne({ email: emailKey });
            if (existingEmail) {
                errors.push(`Row ${i + 1}: Email ${email} is already registered ❌`);
                continue;
            }

            if (employeeId) {
                const existingId = await User.findOne({ organizationId: req.user.organizationId, employeeId: employeeId.trim() });
                if (existingId) {
                    errors.push(`Row ${i + 1}: Employee ID ${employeeId} is already assigned ❌`);
                    continue;
                }
            }

            const dept = await Department.findOne({ _id: departmentId, organizationId: req.user.organizationId });
            if (!dept) {
                errors.push(`Row ${i + 1}: Assigned department ID ${departmentId} not found ❌`);
                continue;
            }

            if (role === "HOD" && status === "ACTIVE") {
                const hasHod = await validateHodAssignment(departmentId);
                if (hasHod) {
                    errors.push(`Row ${i + 1}: Department '${dept.name}' already has an active HOD ❌`);
                    continue;
                }
            }

            const newUser = new User({
                organizationId: req.user.organizationId,
                name,
                email: emailKey,
                employeeId: employeeId ? employeeId.trim() : undefined,
                phone: u.phone,
                designation,
                role,
                departmentId,
                status: status || "ACTIVE",
                joiningDate: u.joiningDate || new Date()
            });

            await newUser.save();
            saved.push(newUser);

            // Audit log
            await AuditLog.create({
                organizationId: req.user.organizationId,
                userId: req.user._id,
                action: "CREATE_USER_BULK",
                description: `Bulk created user account ${emailKey}.`
            });

            // Dispatch welcome email asynchronously
            sendWelcomeEmail(
                newUser.email,
                newUser.name,
                newUser.role,
                dept.name,
                req.user.name
            ).catch(err => console.error("Async welcome email fail (bulk):", err));
        } catch (e) {
            errors.push(`Row ${i + 1}: DB Error - ${e.message}`);
        }
    }

    res.json({ message: `Successfully onboarded ${saved.length} users.`, errors });
});

// ================= POST BULK UPDATE STATUS (PRINCIPAL ONLY) =================
router.post("/bulk-update-status", requireRole(["Principal"]), async (req, res) => {
    const { userIds, status } = req.body;
    if (!Array.isArray(userIds) || !["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({ error: "Invalid status or userIds parameters ❌" });
    }
    try {
        const result = await User.updateMany(
            { _id: { $in: userIds }, organizationId: req.user.organizationId },
            { $set: { status } }
        );

        // Audit Log
        await AuditLog.create({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "BULK_UPDATE_STATUS",
            description: `Principal updated status to ${status} for ${userIds.length} accounts.`
        });

        res.json({ message: `Successfully updated ${result.modifiedCount} users status to ${status} ✅` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Bulk update status failed ❌" });
    }
});

// ================= DELETE USER (PRINCIPAL ONLY) =================
router.delete("/:id", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!user) {
            return res.status(404).json({ error: "User account not found in your institution ❌" });
        }

        if (String(user._id) === String(req.user._id)) {
            return res.status(400).json({ error: "You cannot delete your own Principal account ❌" });
        }

        // If the user was HOD, clean up corresponding department reference
        if (user.role === "HOD") {
            await Department.updateOne({ hodId: user._id }, { $unset: { hodId: "" } });
        }

        await User.deleteOne({ _id: id });

        // Audit Log
        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "DELETE_USER",
            description: `Principal deleted account for ${user.name} (${user.role}).`
        });
        await log.save();

        res.json({ message: "User account deleted successfully! ✅" });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ error: "Failed to delete user account ❌" });
    }
});

module.exports = router;
