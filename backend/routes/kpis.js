const express = require("express");
const router = express.Router();
const KPI = require("../models/KPI");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { authenticateUser, requireRole } = require("./authMiddleware");

// ================= GET KPIs =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        let query = { organizationId: req.user.organizationId };
        if (req.user.role === "Principal") {
            // Principal sees all KPIs, or filters by facultyId/departmentId
            if (req.query.facultyId) query.facultyId = req.query.facultyId;
            if (req.query.departmentId) query.departmentId = req.query.departmentId;
        } else if (req.user.role === "HOD") {
            // HOD sees department KPIs
            query.departmentId = req.user.departmentId;
            if (req.query.facultyId) query.facultyId = req.query.facultyId;
        } else {
            // Faculty only sees their own KPIs
            query.facultyId = req.user._id;
        }

        const kpis = await KPI.find(query)
            .populate("facultyId", "name email department designation")
            .populate("departmentId", "name code");
            
        res.json({ kpis });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch KPIs ❌" });
    }
});

// ================= POST ASSIGN KPI (PRINCIPAL & HOD ONLY) =================
router.post("/", requireRole(["Principal", "HOD"]), async (req, res) => {
    const { facultyId, academicYear, semester, category, name, targetValue, unit } = req.body;

    if (!facultyId || !academicYear || !semester || !category || !name || !targetValue) {
        return res.status(400).json({ error: "Required fields are missing ❌" });
    }

    try {
        const targetFaculty = await User.findOne({ _id: facultyId, organizationId: req.user.organizationId });
        if (!targetFaculty) {
            return res.status(404).json({ error: "Target faculty member not found in your organization ❌" });
        }

        // HOD check: Can only assign to their own department faculties
        if (req.user.role === "HOD" && String(targetFaculty.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: You can only assign targets to your department faculty ❌" });
        }

        const newKpi = new KPI({
            organizationId: req.user.organizationId,
            facultyId,
            departmentId: targetFaculty.departmentId || req.user.departmentId,
            academicYear,
            semester,
            category,
            name,
            targetValue: Number(targetValue),
            unit: unit || "Count",
            createdBy: req.user._id
        });

        await newKpi.save();

        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "CREATE_KPI",
            entityType: "KPI",
            entityId: newKpi._id,
            description: `${req.user.name} (${req.user.role}) allocated KPI target "${name}" to ${targetFaculty.name}.`
        });
        await log.save();

        res.json({ message: "KPI Target allocated successfully ✅", kpi: newKpi });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to allocate KPI target ❌" });
    }
});

// ================= PUT UPDATE KPI =================
router.put("/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { targetValue, achievedValue, name, category } = req.body;

    try {
        const kpi = await KPI.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!kpi) {
            return res.status(404).json({ error: "KPI record not found in your organization ❌" });
        }

        // Authorization checks
        if (req.user.role === "Faculty") {
            // Faculty can only update achievedValue (e.g. self-reporting progress)
            if (String(kpi.facultyId) !== String(req.user._id)) {
                return res.status(403).json({ error: "Forbidden: Access denied ❌" });
            }
            if (targetValue !== undefined || name !== undefined || category !== undefined) {
                return res.status(403).json({ error: "Forbidden: Faculty cannot modify target configurations ❌" });
            }
            if (achievedValue !== undefined) kpi.achievedValue = Number(achievedValue);
        } else if (req.user.role === "HOD") {
            // HOD can update targets in their department
            if (String(kpi.departmentId) !== String(req.user.departmentId)) {
                return res.status(403).json({ error: "Forbidden: Access denied to other departments ❌" });
            }
            if (targetValue !== undefined) kpi.targetValue = Number(targetValue);
            if (achievedValue !== undefined) kpi.achievedValue = Number(achievedValue);
            if (name) kpi.name = name;
            if (category) kpi.category = category;
        } else {
            // Principal can update anything
            if (targetValue !== undefined) kpi.targetValue = Number(targetValue);
            if (achievedValue !== undefined) kpi.achievedValue = Number(achievedValue);
            if (name) kpi.name = name;
            if (category) kpi.category = category;
        }

        await kpi.save();

        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "UPDATE_KPI",
            entityType: "KPI",
            entityId: kpi._id,
            description: `${req.user.name} (${req.user.role}) updated KPI progress or value for target "${kpi.name}".`
        });
        await log.save();

        res.json({ message: "KPI Target updated successfully ✅", kpi });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update KPI ❌" });
    }
});

// ================= DELETE KPI (PRINCIPAL & HOD ONLY) =================
router.delete("/:id", requireRole(["Principal", "HOD"]), async (req, res) => {
    const { id } = req.params;

    try {
        const kpi = await KPI.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!kpi) {
            return res.status(404).json({ error: "KPI target not found in your organization ❌" });
        }

        if (req.user.role === "HOD" && String(kpi.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: Access denied to other departments ❌" });
        }

        await KPI.findOneAndDelete({ _id: id, organizationId: req.user.organizationId });

        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: "DELETE_KPI",
            entityType: "KPI",
            entityId: kpi._id,
            description: `${req.user.name} (${req.user.role}) deleted KPI target "${kpi.name}".`
        });
        await log.save();

        res.json({ message: "KPI Target deleted successfully ✅" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete KPI ❌" });
    }
});

module.exports = router;

