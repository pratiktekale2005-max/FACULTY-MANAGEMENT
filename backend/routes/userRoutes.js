const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const AuditLog = require("../models/AuditLog");
const Organization = require("../models/Organization");
const { requireRole } = require("./authMiddleware");
const { sendWelcomeEmail, sendPasswordCredentialsEmail } = require("../services/emailService");

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

// ================= GET ALL USERS (PRINCIPAL, HOD & FACULTY) =================
router.get("/", requireRole(["Principal", "HOD", "Faculty"]), async (req, res) => {
    try {
        const { search, role, departmentId } = req.query;
        const query = { organizationId: req.user.organizationId };

        // 1. Role-based Department Isolation:
        // HOD can ONLY view faculties from their own department and NEVER the Principal.
        // Principal and Faculty can view their institution members.
        if (req.user.role === "HOD") {
            query.role = { $ne: "Principal" };

            if (req.user.departmentId && req.user.department) {
                query.$or = [
                    { departmentId: req.user.departmentId },
                    { department: req.user.department }
                ];
            } else if (req.user.departmentId) {
                query.departmentId = req.user.departmentId;
            } else if (req.user.department) {
                query.department = req.user.department;
            }
        } else {
            // Principal/Faculty can optionally filter by department
            if (departmentId && departmentId !== "All" && departmentId !== "all" && departmentId !== "ALL" && departmentId.trim() !== "") {
                query.departmentId = departmentId.trim();
            }
        }

        // 2. Search query filter (name, email, employeeId)
        if (search && search.trim()) {
            const cleanSearch = search.trim();
            const searchClause = [
                { name: { $regex: cleanSearch, $options: "i" } },
                { email: { $regex: cleanSearch, $options: "i" } },
                { employeeId: { $regex: cleanSearch, $options: "i" } }
            ];

            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchClause }
                ];
                delete query.$or;
            } else {
                query.$or = searchClause;
            }
        }

        // 3. Only filter by role if specifically requested and not 'All'
        if (role && role !== "All" && role !== "all" && role !== "ALL" && role.trim() !== "") {
            if (req.user.role === "HOD") {
                if (role.trim() !== "Principal") {
                    query.role = role.trim();
                }
            } else {
                query.role = role.trim();
            }
        }

        const users = await User.find(query)
            .populate("departmentId", "name code")
            .sort({ createdAt: -1 });

        // Calculate dynamic student metrics per faculty from Subject records
        const userIds = users.map(u => u._id);
        const subjects = await Subject.find({
            organizationId: req.user.organizationId,
            userId: { $in: userIds }
        }, "userId students").lean();

        const userStudentsMap = {};
        subjects.forEach(sub => {
            const uId = String(sub.userId);
            if (!userStudentsMap[uId]) {
                userStudentsMap[uId] = new Map();
            }
            (sub.students || []).forEach(st => {
                const key = st.prnNumber || st.rollNo || String(st._id);
                if (!userStudentsMap[uId].has(key)) {
                    userStudentsMap[uId].set(key, st);
                }
            });
        });

        const usersWithStats = users.map(u => {
            const uObj = u.toJSON ? u.toJSON() : u.toObject();
            const studentList = userStudentsMap[String(u._id)] ? Array.from(userStudentsMap[String(u._id)].values()) : [];
            let maleCount = 0;
            let femaleCount = 0;
            studentList.forEach(st => {
                const g = (st.gender || "").toLowerCase();
                if (g === "female" || g === "f") {
                    femaleCount++;
                } else {
                    maleCount++;
                }
            });
            uObj.studentStats = {
                total: studentList.length,
                male: maleCount,
                female: femaleCount
            };
            return uObj;
        });

        res.json({ users: usersWithStats });
    } catch (err) {
        console.error("Fetch users error:", err);
        res.status(500).json({ error: "Failed to load user accounts database ❌" });
    }
});

// ================= POST CREATE USER (PRINCIPAL ONLY) =================
router.post("/", requireRole(["Principal"]), async (req, res) => {
    const { name, email, password, employeeId, phone, designation, role, departmentId, status, joiningDate } = req.body;

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

        // 5. Create user with hashed password
        const initialPassword = (password && typeof password === "string" && password.trim()) ? password.trim() : "Password@123";
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        const newUser = new User({
            organizationId: req.user.organizationId,
            name,
            email: emailKey,
            password: hashedPassword,
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

        // Fetch organization details for branding in email
        const org = await Organization.findById(req.user.organizationId);

        // Dispatch Credentials Email (Username & Setted Password)
        sendPasswordCredentialsEmail({
            userEmail: newUser.email,
            userName: newUser.name,
            userRole: newUser.role,
            deptName: dept.name,
            password: initialPassword,
            isReset: false,
            actorName: req.user.name,
            institutionName: org?.name
        }).catch(err => console.error("Async user creation password email fail:", err));

        res.json({ message: `User account created successfully! Credentials sent to ${newUser.email} 📧✅`, user: newUser });
    } catch (err) {
        console.error("Create user error:", err);
        res.status(500).json({ error: "Failed to register user account ❌" });
    }
});

// ================= PUT UPDATE USER (PRINCIPAL ONLY) =================
router.put("/:id", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    const { name, email, employeeId, phone, designation, role, departmentId, status, joiningDate, password } = req.body;

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
            // Find existing active HOD for this department (different from current user) and demote
            const existingHod = await User.findOne({
                role: "HOD",
                departmentId: finalDeptId,
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

        // Ensure user status is ACTIVE
        user.status = "ACTIVE";

        // If a new password is provided during edit, hash and dispatch credentials email
        if (password && typeof password === "string" && password.trim().length >= 6) {
            const rawPassword = password.trim();
            user.password = await bcrypt.hash(rawPassword, 10);

            const org = await Organization.findById(req.user.organizationId);
            sendPasswordCredentialsEmail({
                userEmail: user.email,
                userName: user.name,
                userRole: user.role,
                deptName: dept ? dept.name : (user.department || ""),
                password: rawPassword,
                isReset: true,
                actorName: req.user.name,
                institutionName: org?.name
            }).catch(err => console.error("Async edit user password email fail:", err));
        }

        const oldRole = user.role;

        await user.save();

        // Update HOD mappings in Department model
        // If they were HOD, but their department has changed or they are no longer HOD
        if (oldRole === "HOD" && (finalRole !== "HOD" || String(finalDeptId) !== String(user.departmentId))) {
            // Remove as HOD from old department
            await Department.updateOne({ hodId: user._id, organizationId: req.user.organizationId }, { $unset: { hodId: "" } });
        }
        if (finalRole === "HOD") {
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

// ================= PUT ASSIGN DESIGNATION & ROLE (PRINCIPAL ONLY) =================
router.put("/:id/designation", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    const { designation, role, departmentId } = req.body;

    if (!designation || typeof designation !== "string" || !designation.trim()) {
        return res.status(400).json({ error: "A valid designation is required ❌" });
    }

    try {
        const user = await User.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!user) {
            return res.status(404).json({ error: "Faculty / user profile not found in your institution ❌" });
        }

        const oldDesignation = user.designation;
        const oldRole = user.role;
        const desigTrim = designation.trim();

        // Determine target role:
        // If explicitly provided ("HOD" or "Faculty"), use it.
        // Otherwise, infer from designation if it contains HOD keywords.
        let targetRole = role;
        if (!targetRole || (targetRole !== "HOD" && targetRole !== "Faculty")) {
            const lowerDesig = desigTrim.toLowerCase();
            if (lowerDesig.includes("hod") || lowerDesig.includes("head of the department") || lowerDesig.includes("head of department")) {
                targetRole = "HOD";
            } else {
                targetRole = user.role || "Faculty";
            }
        }

        // Handle optional department update/linking if departmentId is provided
        if (departmentId && String(departmentId) !== String(user.departmentId)) {
            const dept = await Department.findOne({ _id: departmentId, organizationId: req.user.organizationId });
            if (dept) {
                user.departmentId = dept._id;
                user.department = dept.name;
            }
        }

        // If departmentId is missing but user has department string name, resolve departmentId
        if (!user.departmentId && user.department) {
            const foundDept = await Department.findOne({
                name: { $regex: new RegExp(`^${user.department.trim()}$`, "i") },
                organizationId: req.user.organizationId
            });
            if (foundDept) {
                user.departmentId = foundDept._id;
                user.department = foundDept.name;
            }
        }

        const targetDeptId = user.departmentId;

        // Apply Role transitions
        if (targetRole === "HOD") {
            // 1. Demote any other HOD in this department to Faculty
            if (targetDeptId) {
                const existingHods = await User.find({
                    role: "HOD",
                    departmentId: targetDeptId,
                    _id: { $ne: user._id },
                    organizationId: req.user.organizationId
                });

                for (const prevHod of existingHods) {
                    prevHod.role = "Faculty";
                    if (prevHod.designation === "Professor & HOD" || prevHod.designation === "Head of the Department") {
                        prevHod.designation = "Professor";
                    }
                    await prevHod.save();
                }

                // 2. Clear any other department where this user was HOD
                await Department.updateMany(
                    { hodId: user._id, organizationId: req.user.organizationId, _id: { $ne: targetDeptId } },
                    { $unset: { hodId: "" } }
                );

                // 3. Link this department's hodId to this user
                await Department.updateOne(
                    { _id: targetDeptId, organizationId: req.user.organizationId },
                    { $set: { hodId: user._id } }
                );
            }

            user.role = "HOD";
            user.status = "ACTIVE";
        } else if (targetRole === "Faculty") {
            // If user was previously HOD, clear them from Department hodId
            if (oldRole === "HOD") {
                await Department.updateMany(
                    { hodId: user._id, organizationId: req.user.organizationId },
                    { $unset: { hodId: "" } }
                );
            }
            user.role = "Faculty";
        }

        user.designation = desigTrim;
        await user.save();

        // Audit Log
        const isPromotionToHod = targetRole === "HOD" && oldRole !== "HOD";
        const isDemotionFromHod = targetRole === "Faculty" && oldRole === "HOD";
        const actionType = isPromotionToHod ? "ASSIGN_HOD" : (isDemotionFromHod ? "DEMOTE_HOD" : "ASSIGN_DESIGNATION");

        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: actionType,
            description: `Principal updated ${user.name}: Role '${oldRole}' ➔ '${user.role}', Designation '${oldDesignation || "None"}' ➔ '${user.designation}' (${user.department || "No Department"}).`
        });
        await log.save();

        const populatedUser = await User.findById(user._id).populate("departmentId", "name code");

        let responseMsg = `Designation successfully updated to '${user.designation}' for ${user.name}! ✅`;
        if (isPromotionToHod) {
            responseMsg = `Successfully assigned ${user.name} as Head of the Department (HOD) of ${user.department || "Department"} with designation '${user.designation}'! 👑✅`;
        } else if (isDemotionFromHod) {
            responseMsg = `${user.name} reassigned as Faculty with designation '${user.designation}'. ✅`;
        }

        res.json({ 
            message: responseMsg, 
            user: populatedUser 
        });
    } catch (err) {
        console.error("Assign designation error:", err);
        res.status(500).json({ error: "Failed to update faculty designation and role ❌" });
    }
});

// ================= PUT ASSIGN / CHANGE PASSWORD (PRINCIPAL ONLY) =================
router.put("/:id/password", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== "string" || password.trim().length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long ❌" });
    }

    try {
        const user = await User.findOne({ _id: id, organizationId: req.user.organizationId }).populate("departmentId", "name code");
        if (!user) {
            return res.status(404).json({ error: "User profile not found in your institution ❌" });
        }

        const rawPassword = password.trim();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Audit Log
        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "CHANGE_PASSWORD",
            description: `Principal updated login credentials for ${user.name} (${user.role}). Password credentials dispatched to ${user.email}.`
        });
        await log.save();

        // Fetch organization details for branding
        const org = await Organization.findById(req.user.organizationId);

        // Dispatch credentials email with username (email) and newly setted password
        sendPasswordCredentialsEmail({
            userEmail: user.email,
            userName: user.name,
            userRole: user.role,
            deptName: user.departmentId?.name || user.department,
            password: rawPassword,
            isReset: true,
            actorName: req.user.name,
            institutionName: org?.name
        }).catch(err => console.error("Async change password email fail:", err));

        res.json({ message: `Password successfully updated for ${user.name}! Credentials dispatched to ${user.email} 📧✅` });
    } catch (err) {
        console.error("Assign password error:", err);
        res.status(500).json({ error: "Failed to update user password ❌" });
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

            const rowPassword = (u.password && typeof u.password === "string" && u.password.trim()) ? u.password.trim() : "Password@123";
            const rowHashedPassword = await bcrypt.hash(rowPassword, 10);

            const newUser = new User({
                organizationId: req.user.organizationId,
                name,
                email: emailKey,
                password: rowHashedPassword,
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

            // Dispatch credentials email asynchronously
            const org = await Organization.findById(req.user.organizationId);
            sendPasswordCredentialsEmail({
                userEmail: newUser.email,
                userName: newUser.name,
                userRole: newUser.role,
                deptName: dept.name,
                password: rowPassword,
                isReset: false,
                actorName: req.user.name,
                institutionName: org?.name
            }).catch(err => console.error("Async welcome credentials fail (bulk):", err));
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

        // If the user was HOD, clean up corresponding department references
        if (user.role === "HOD") {
            await Department.updateMany({ hodId: user._id }, { $unset: { hodId: "" } });
        }

        // Clean up any subject allocations and tasks assigned to this faculty member
        await Subject.deleteMany({ userId: id });

        await User.deleteOne({ _id: id });

        // Audit Log
        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "DELETE_USER",
            description: `Principal deleted account for ${user.name} (${user.role} - ${user.department || "General"}). Reason: Resignation or Institutional Removal.`
        });
        await log.save();

        res.json({ message: `Faculty account for '${user.name}' has been successfully deleted! ✅` });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ error: "Failed to delete user account ❌" });
    }
});

module.exports = router;
