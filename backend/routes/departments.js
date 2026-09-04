const express = require("express");
const router = express.Router();
const Department = require("../models/Department");
const User = require("../models/User");
const { requireRole } = require("./authMiddleware");

// ================= GET ALL DEPARTMENTS =================
router.get("/", requireRole(["Principal", "HOD", "Faculty"]), async (req, res) => {
    try {
        const departments = await Department.find({ organizationId: req.user.organizationId }).populate("hodId", "name email");
        res.json({ departments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch departments ❌" });
    }
});

// ================= CREATE DEPARTMENT (PRINCIPAL ONLY) =================
router.post("/", requireRole(["Principal"]), async (req, res) => {
    const { name, code, hodId } = req.body;
    if (!name || !code) {
        return res.status(400).json({ error: "Name and code are required ❌" });
    }

    try {
        const existing = await Department.findOne({ organizationId: req.user.organizationId, code });
        if (existing) {
            return res.status(400).json({ error: `Department with code ${code} already exists in your institution ❌` });
        }

        const newDept = new Department({ organizationId: req.user.organizationId, name, code, hodId: hodId || null });
        await newDept.save();

        // If HOD is assigned, update user role to HOD
        if (hodId) {
            await User.findByIdAndUpdate(hodId, { 
                role: "HOD",
                departmentId: newDept._id,
                department: name
            });
        }

        res.json({ message: "Department created successfully ✅", department: newDept });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create department ❌" });
    }
});

// ================= UPDATE DEPARTMENT (PRINCIPAL ONLY) =================
router.put("/:id", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    const { name, code, hodId, status } = req.body;

    try {
        const dept = await Department.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!dept) {
            return res.status(404).json({ error: "Department not found in your organization ❌" });
        }

        if (name) dept.name = name;
        if (code) dept.code = code;
        if (status) dept.status = status;
        
        // Handle changing/assigning HOD
        if (hodId !== undefined) {
            if (hodId) {
                // Prevent assigning inactive user or user from another organization as HOD
                const targetUser = await User.findOne({ _id: hodId, organizationId: req.user.organizationId });
                if (!targetUser) {
                    return res.status(404).json({ error: "Selected user not found in your organization ❌" });
                }
                if (targetUser.status !== "ACTIVE") {
                    return res.status(400).json({ error: "Cannot assign an inactive user as HOD. HODs must be ACTIVE. ❌" });
                }

                // If department already has another HOD, demote them to Faculty
                if (dept.hodId && String(dept.hodId) !== String(hodId)) {
                    await User.updateOne(
                        { _id: dept.hodId, organizationId: req.user.organizationId },
                        { $set: { role: "Faculty" } }
                    );
                }

                // Also find any other active HOD for this department (defense-in-depth)
                await User.updateMany(
                    { departmentId: dept._id, role: "HOD", _id: { $ne: hodId }, organizationId: req.user.organizationId },
                    { $set: { role: "Faculty" } }
                );

                // If the target user was HOD of another department, clear that department's hodId
                await Department.updateMany(
                    { hodId: targetUser._id, organizationId: req.user.organizationId },
                    { $unset: { hodId: "" } }
                );

                // Appoint target user as new HOD and update department name/ID
                targetUser.role = "HOD";
                targetUser.departmentId = dept._id;
                targetUser.department = dept.name;
                await targetUser.save();

                dept.hodId = targetUser._id;
            } else {
                // If setting HOD to null/empty, demote existing HOD if any
                if (dept.hodId) {
                    await User.updateOne(
                        { _id: dept.hodId, organizationId: req.user.organizationId },
                        { $set: { role: "Faculty" } }
                    );
                }
                dept.hodId = null;
            }
        }

        await dept.save();
        res.json({ message: "Department updated successfully ✅", department: dept });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update department ❌" });
    }
});

// ================= DELETE DEPARTMENT (PRINCIPAL ONLY) =================
router.delete("/:id", requireRole(["Principal"]), async (req, res) => {
    const { id } = req.params;
    try {
        const dept = await Department.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!dept) {
            return res.status(404).json({ error: "Department not found ❌" });
        }

        // Check if any users are currently assigned to this department
        // We exclude the principal themselves, although typically they belong to 'Administration' (ADM)
        const usersInDept = await User.countDocuments({ departmentId: id });
        if (usersInDept > 0) {
            return res.status(400).json({ error: `Cannot delete department: ${usersInDept} staff member(s) are currently assigned to it. ❌` });
        }

        await Department.deleteOne({ _id: id });
        res.json({ message: "Department deleted successfully ✅" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete department ❌" });
    }
});

module.exports = router;
