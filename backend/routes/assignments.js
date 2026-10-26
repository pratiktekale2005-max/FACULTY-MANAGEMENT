const express = require("express");
const router = express.Router();
const Assignment = require("../models/Assignment");
const User = require("../models/User");
const Subject = require("../models/Subject");
const { authenticateUser } = require("./authMiddleware");

// ================= GET ASSIGNMENTS =================
// GET /api/assignments
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = {};

        // Retrieve subjects in this organization first
        const subjectIds = await Subject.find({ organizationId }).distinct("_id");
        query.subjectId = { $in: subjectIds };

        // Role-based scoping
        if (role === "HOD") {
            const memberIds = await User.find({ organizationId, departmentId: req.user.departmentId }).distinct("_id");
            query.facultyId = { $in: memberIds };
        } else if (role === "Faculty") {
            query.facultyId = req.user._id;
        }

        // Filters
        if (req.query.subjectId) {
            query.subjectId = req.query.subjectId;
        }
        if (req.query.divisionId) {
            query.divisionId = req.query.divisionId;
        }
        if (req.query.status && req.query.status !== "All") {
            query.status = req.query.status;
        }

        // Search
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, "i");
            query.$or = [
                { title: searchRegex },
                { description: searchRegex }
            ];
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Assignment.countDocuments(query);
        const assignments = await Assignment.find(query)
            .populate("facultyId", "name email department designation")
            .populate("subjectId", "subjectName subjectCode")
            .sort({ deadlineDate: 1 }) // nearest deadline first
            .skip(skip)
            .limit(limit);

        res.json({
            assignments,
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch assignments ❌" });
    }
});

// ================= GET SINGLE ASSIGNMENT =================
// GET /api/assignments/:id
router.get("/:id", authenticateUser, async (req, res) => {
    try {
        const ass = await Assignment.findById(req.params.id)
            .populate("facultyId", "name email department")
            .populate("subjectId", "subjectName subjectCode");
        if (!ass) {
            return res.status(404).json({ error: "Assignment not found ❌" });
        }
        res.json({ assignment: ass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch assignment details ❌" });
    }
});

// ================= POST CREATE ASSIGNMENT =================
// POST /api/assignments
router.post("/", authenticateUser, async (req, res) => {
    if (req.user.role !== "Faculty") {
        return res.status(403).json({ error: "Access Denied: Only faculty can manage assignments ❌" });
    }
    const { 
        subjectId, 
        divisionId, 
        title, 
        description, 
        givenDate, 
        deadlineDate, 
        marks, 
        file,
        status
    } = req.body;

    if (!subjectId || !title || !givenDate || !deadlineDate) {
        return res.status(400).json({ error: "Required fields are missing: Subject, Title, Given Date, and Deadline Date are required ❌" });
    }

    if (new Date(deadlineDate) < new Date(givenDate)) {
        return res.status(400).json({ error: "Invalid due date: Due date cannot be earlier than created / given date ❌" });
    }

    try {
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ error: "Linked subject not found ❌" });
        }

        const newAss = new Assignment({
            facultyId: req.user._id,
            subjectId,
            divisionId: divisionId || "",
            title,
            description: description || "",
            givenDate,
            deadlineDate,
            marks: Number(marks) || 100,
            file: file || "",
            status: status || "Draft"
        });

        await newAss.save();
        res.json({ message: "Assignment created successfully! ✅", assignment: newAss });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save assignment ❌" });
    }
});

// ================= PUT EDIT ASSIGNMENT =================
// PUT /api/assignments/:id
router.put("/:id", authenticateUser, async (req, res) => {
    if (req.user.role !== "Faculty") {
        return res.status(403).json({ error: "Access Denied: Only faculty can manage assignments ❌" });
    }
    const { 
        subjectId, 
        divisionId, 
        title, 
        description, 
        givenDate, 
        deadlineDate, 
        marks, 
        file,
        status
    } = req.body;

    try {
        const ass = await Assignment.findById(req.params.id);
        if (!ass) {
            return res.status(404).json({ error: "Assignment not found ❌" });
        }

        // Access check
        if (req.user.role === "Faculty" && String(ass.facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: cannot edit another faculty's assignment ❌" });
        }

        const finalGivenDate = givenDate || ass.givenDate;
        const finalDeadlineDate = deadlineDate || ass.deadlineDate;
        if (finalGivenDate && finalDeadlineDate && new Date(finalDeadlineDate) < new Date(finalGivenDate)) {
            return res.status(400).json({ error: "Invalid due date: Due date cannot be earlier than created / given date ❌" });
        }

        if (subjectId) ass.subjectId = subjectId;
        if (divisionId !== undefined) ass.divisionId = divisionId;
        if (title) ass.title = title;
        if (description !== undefined) ass.description = description;
        if (givenDate) ass.givenDate = givenDate;
        if (deadlineDate) ass.deadlineDate = deadlineDate;
        if (marks !== undefined) ass.marks = Number(marks);
        if (file !== undefined) ass.file = file;
        if (status) ass.status = status;

        await ass.save();
        res.json({ message: "Assignment updated successfully! ✅", assignment: ass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update assignment ❌" });
    }
});

// ================= DELETE ASSIGNMENT =================
// DELETE /api/assignments/:id
router.delete("/:id", authenticateUser, async (req, res) => {
    if (req.user.role !== "Faculty") {
        return res.status(403).json({ error: "Access Denied: Only faculty can manage assignments ❌" });
    }
    try {
        const ass = await Assignment.findById(req.params.id);
        if (!ass) {
            return res.status(404).json({ error: "Assignment not found ❌" });
        }

        // Access check
        if (req.user.role === "Faculty" && String(ass.facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: cannot delete another faculty's assignment ❌" });
        }

        await Assignment.findByIdAndDelete(req.params.id);
        res.json({ message: "Assignment deleted successfully ✅" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete assignment ❌" });
    }
});

module.exports = router;
