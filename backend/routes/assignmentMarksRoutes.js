const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject");
const AssignmentMarks = require("../models/AssignmentMarks");
const { authenticateUser } = require("./authMiddleware");

// GET /api/assignment-marks
// Returns 5 assignment marks & evaluation dates for each student in the selected subject & division
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { subjectId, division } = req.query;

        if (!subjectId || !division) {
            return res.status(400).json({ error: "subjectId and division are required parameters ❌" });
        }

        const organizationId = req.user.organizationId;
        const subject = await Subject.findOne({ _id: subjectId, organizationId });

        if (!subject) {
            return res.status(404).json({ error: "Course subject not found ❌" });
        }

        if (req.user.role === "Faculty" && String(subject.userId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: You are not assigned to manage marks for this subject ❌" });
        }

        // Filter students in division
        const studentsInDiv = (subject.students || []).filter(s => {
            if (s.division) return s.division.toUpperCase() === division.toUpperCase();
            return division === "A";
        }).sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true }));

        // Load existing saved marks from AssignmentMarks collection
        const savedMarks = await AssignmentMarks.find({
            organizationId,
            subjectId,
            division
        }).lean();

        const marksMap = new Map();
        let configuredMaxMarks = 10; // Institutional standard maximum: 10 marks per assignment (Total /50)

        savedMarks.forEach(m => {
            marksMap.set(String(m.studentId), m);
            if (m.maxMarks) configuredMaxMarks = Math.min(m.maxMarks, 10);
        });

        let fullyGradedCount = 0;
        let pendingMarksCount = 0;
        const normalizeTo10 = (v) => {
            if (v === null || v === undefined || v === "") return null;
            const n = Number(v);
            if (isNaN(n)) return null;
            if (n > 10) return Math.min(10, Math.round((n / 25) * 10 * 10) / 10);
            return n;
        };

        const resultList = studentsInDiv.map(s => {
            const saved = marksMap.get(String(s._id));

            const rawA1 = (saved && saved.assignment1 !== undefined && saved.assignment1 !== null) ? saved.assignment1 : (s.assignmentMarks?.a1 ?? null);
            const a1 = normalizeTo10(rawA1);
            const a1Date = (saved && saved.assignment1Date) ? saved.assignment1Date : (s.assignmentMarks?.a1Date ?? "");

            const rawA2 = (saved && saved.assignment2 !== undefined && saved.assignment2 !== null) ? saved.assignment2 : (s.assignmentMarks?.a2 ?? null);
            const a2 = normalizeTo10(rawA2);
            const a2Date = (saved && saved.assignment2Date) ? saved.assignment2Date : (s.assignmentMarks?.a2Date ?? "");

            const rawA3 = (saved && saved.assignment3 !== undefined && saved.assignment3 !== null) ? saved.assignment3 : (s.assignmentMarks?.a3 ?? null);
            const a3 = normalizeTo10(rawA3);
            const a3Date = (saved && saved.assignment3Date) ? saved.assignment3Date : (s.assignmentMarks?.a3Date ?? "");

            const rawA4 = (saved && saved.assignment4 !== undefined && saved.assignment4 !== null) ? saved.assignment4 : (s.assignmentMarks?.a4 ?? null);
            const a4 = normalizeTo10(rawA4);
            const a4Date = (saved && saved.assignment4Date) ? saved.assignment4Date : (s.assignmentMarks?.a4Date ?? "");

            const rawA5 = (saved && saved.assignment5 !== undefined && saved.assignment5 !== null) ? saved.assignment5 : (s.assignmentMarks?.a5 ?? null);
            const a5 = normalizeTo10(rawA5);
            const a5Date = (saved && saved.assignment5Date) ? saved.assignment5Date : (s.assignmentMarks?.a5Date ?? "");

            // An assignment is evaluated if it is not null and not empty
            const entered = [a1, a2, a3, a4, a5].filter(v => v !== null && v !== undefined && v !== "");
            const evaluatedCount = entered.length;
            const isFullyGraded = evaluatedCount === 5;
            
            // Total is calculated out of 50 when all 5 entered. If incomplete, sum entered marks but flag as incomplete
            const rawSum = entered.reduce((sum, val) => sum + (Number(val) || 0), 0);
            const total = isFullyGraded ? Math.round(rawSum * 10) / 10 : null;
            const enteredSum = Math.round(rawSum * 10) / 10;

            if (isFullyGraded) fullyGradedCount++;
            else pendingMarksCount++;

            return {
                studentId: s._id,
                rollNo: s.rollNo,
                studentName: s.name,
                prnNumber: s.prnNumber || "",
                assignment1: a1,
                assignment1Date: a1Date,
                assignment2: a2,
                assignment2Date: a2Date,
                assignment3: a3,
                assignment3Date: a3Date,
                assignment4: a4,
                assignment4Date: a4Date,
                assignment5: a5,
                assignment5Date: a5Date,
                total,
                enteredSum,
                evaluatedCount,
                isFullyGraded
            };
        });

        res.json({
            success: true,
            subjectName: subject.subjectName,
            subjectCode: subject.subjectCode,
            department: subject.department,
            academicYear: subject.academicYear || "2026-2027",
            division,
            maxMarks: 10,
            totalStudents: resultList.length,
            fullyGradedCount,
            pendingMarksCount,
            students: resultList
        });
    } catch (err) {
        console.error("Fetch assignment marks error:", err);
        res.status(500).json({ error: "Failed to load assignment marks ❌" });
    }
});

// POST /api/assignment-marks
// Save or update exactly 5 assignment marks (out of 10) & evaluation dates per student
router.post("/", authenticateUser, async (req, res) => {
    try {
        const { subjectId, division, maxMarks = 10, marks } = req.body;

        if (!subjectId || !division || !Array.isArray(marks)) {
            return res.status(400).json({ error: "Missing required parameters (subjectId, division, marks) ❌" });
        }

        const maxM = 10; // Strictly 10 marks per assignment
        const organizationId = req.user.organizationId;
        const facultyId = req.user._id;

        const subject = await Subject.findOne({ _id: subjectId, organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Course subject not found ❌" });
        }

        if (req.user.role === "Faculty" && String(subject.userId) !== String(facultyId)) {
            return res.status(403).json({ error: "Access denied: Unauthorized to record marks for this course ❌" });
        }

        // Validate all entries before saving
        for (const item of marks) {
            const checks = [
                { name: "Assignment 1", val: item.assignment1 },
                { name: "Assignment 2", val: item.assignment2 },
                { name: "Assignment 3", val: item.assignment3 },
                { name: "Assignment 4", val: item.assignment4 },
                { name: "Assignment 5", val: item.assignment5 }
            ];

            for (const c of checks) {
                if (c.val !== null && c.val !== undefined && c.val !== "") {
                    const num = Number(c.val);
                    if (isNaN(num)) {
                        return res.status(400).json({ 
                            error: `Invalid mark format for ${item.studentName || item.rollNo} (${c.name}): must be a valid number ❌` 
                        });
                    }
                    if (num < 0) {
                        return res.status(400).json({ 
                            error: `Invalid mark for ${item.studentName || item.rollNo} (${c.name}): marks cannot be negative ❌` 
                        });
                    }
                    if (num > maxM) {
                        return res.status(400).json({ 
                            error: `Invalid mark for ${item.studentName || item.rollNo} (${c.name}): ${num} exceeds configured maximum marks (${maxM}) ❌` 
                        });
                    }
                }
            }
        }

        // Batch upsert into AssignmentMarks collection
        for (const item of marks) {
            const parseVal = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

            const a1 = parseVal(item.assignment1);
            const a1Date = item.assignment1Date || "";

            const a2 = parseVal(item.assignment2);
            const a2Date = item.assignment2Date || "";

            const a3 = parseVal(item.assignment3);
            const a3Date = item.assignment3Date || "";

            const a4 = parseVal(item.assignment4);
            const a4Date = item.assignment4Date || "";

            const a5 = parseVal(item.assignment5);
            const a5Date = item.assignment5Date || "";

            const total = [a1, a2, a3, a4, a5]
                .filter(v => v !== null)
                .reduce((sum, v) => sum + v, 0);

            await AssignmentMarks.findOneAndUpdate(
                { organizationId, subjectId, studentId: item.studentId },
                {
                    organizationId,
                    facultyId,
                    subjectId,
                    studentId: item.studentId,
                    rollNo: item.rollNo,
                    studentName: item.studentName,
                    department: subject.department,
                    year: subject.academicYear || "SE",
                    division,
                    academicYear: subject.academicYear || "2026-2027",
                    maxMarks: maxM,
                    assignment1: a1,
                    assignment1Date: a1Date,
                    assignment2: a2,
                    assignment2Date: a2Date,
                    assignment3: a3,
                    assignment3Date: a3Date,
                    assignment4: a4,
                    assignment4Date: a4Date,
                    assignment5: a5,
                    assignment5Date: a5Date,
                    total
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Also synchronize with Subject.students for embedded querying
            const st = subject.students.find(s => String(s._id) === String(item.studentId));
            if (st) {
                st.assignmentMarks = {
                    a1, a1Date,
                    a2, a2Date,
                    a3, a3Date,
                    a4, a4Date,
                    a5, a5Date,
                    total
                };
            }
        }

        await subject.save();

        res.json({
            message: `Assignment records for ${marks.length} students saved successfully! ✅`,
            maxMarks: maxM
        });
    } catch (err) {
        console.error("Save assignment marks error:", err);
        res.status(500).json({ error: "Failed to save assignment marks ❌" });
    }
});

// POST /api/assignment-marks/import-csv
// Validates and imports CSV assignment marks for the selected class & subject
router.post("/import-csv", authenticateUser, async (req, res) => {
    try {
        const { subjectId, division, maxMarks = 10, rows, overwriteConfirmed = false } = req.body;

        if (!subjectId || !division || !Array.isArray(rows)) {
            return res.status(400).json({ error: "Missing required parameters (subjectId, division, rows) ❌" });
        }

        const maxM = 10; // Maximum mark per assignment is strictly 10
        const organizationId = req.user.organizationId;
        const facultyId = req.user._id;

        const subject = await Subject.findOne({ _id: subjectId, organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Course subject not found ❌" });
        }

        if (req.user.role === "Faculty" && String(subject.userId) !== String(facultyId)) {
            return res.status(403).json({ error: "Access denied: Unauthorized to import marks for this course ❌" });
        }

        // Filter enrolled students in division
        const studentsInDiv = (subject.students || []).filter(s => {
            if (s.division) return s.division.toUpperCase() === division.toUpperCase();
            return division === "A";
        });

        const studentByRoll = new Map();
        studentsInDiv.forEach(s => {
            if (s.rollNo) studentByRoll.set(s.rollNo.trim().toUpperCase(), s);
        });

        // Load existing saved marks
        const existingRecords = await AssignmentMarks.find({ organizationId, subjectId, division }).lean();
        const existingMap = new Map();
        existingRecords.forEach(r => existingMap.set(String(r.studentId), r));

        const errors = [];
        const validRows = [];
        const existingOverwriteList = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 1;
            const roll = (row.rollNo || "").toString().trim().toUpperCase();

            if (!roll) {
                errors.push({ row: rowNum, error: `Row ${rowNum}: Roll No is missing.` });
                continue;
            }

            const student = studentByRoll.get(roll);
            if (!student) {
                errors.push({ 
                    row: rowNum, 
                    error: `Row ${rowNum}: Roll No "${roll}" is not enrolled in ${subject.department} Division ${division}.` 
                });
                continue;
            }

            // Validate student name match warning (treat name as verification, not unique identifier)
            const inputName = (row.studentName || "").toString().trim().toLowerCase();
            const actualName = (student.name || "").toString().trim().toLowerCase();
            const nameMismatch = inputName && actualName && !actualName.includes(inputName) && !inputName.includes(actualName);

            // Validate assignment marks (1 to 5)
            const assignmentKeys = [
                { markKey: "assignment1", dateKey: "assignment1Date", label: "Assignment 1" },
                { markKey: "assignment2", dateKey: "assignment2Date", label: "Assignment 2" },
                { markKey: "assignment3", dateKey: "assignment3Date", label: "Assignment 3" },
                { markKey: "assignment4", dateKey: "assignment4Date", label: "Assignment 4" },
                { markKey: "assignment5", dateKey: "assignment5Date", label: "Assignment 5" },
            ];

            let rowHasError = false;
            const parsedMarks = {};

            for (const a of assignmentKeys) {
                const rawVal = row[a.markKey];
                const rawDate = row[a.dateKey];

                if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
                    const num = Number(rawVal);
                    if (isNaN(num)) {
                        errors.push({ row: rowNum, error: `Row ${rowNum} (${roll}): ${a.label} mark must be a valid number.` });
                        rowHasError = true;
                        break;
                    }
                    if (num < 0 || num > maxM) {
                        errors.push({ 
                            row: rowNum, 
                            error: `Row ${rowNum} (${roll}): ${a.label} mark (${num}) exceeds maximum allowed score (${maxM}) or is negative.` 
                        });
                        rowHasError = true;
                        break;
                    }
                    parsedMarks[a.markKey] = Math.round(num);
                } else {
                    parsedMarks[a.markKey] = null;
                }

                // Date validation
                if (rawDate && String(rawDate).trim() !== "") {
                    const dStr = String(rawDate).trim();
                    const d = new Date(dStr);
                    if (isNaN(d.getTime())) {
                        errors.push({ row: rowNum, error: `Row ${rowNum} (${roll}): ${a.label} date "${dStr}" is invalid.` });
                        rowHasError = true;
                        break;
                    }
                    parsedMarks[a.dateKey] = dStr.split("T")[0];
                } else {
                    parsedMarks[a.dateKey] = "";
                }
            }

            if (rowHasError) continue;

            // Check if existing marks exist for this student
            const existing = existingMap.get(String(student._id));
            const hasExistingMarks = existing && [existing.assignment1, existing.assignment2, existing.assignment3, existing.assignment4, existing.assignment5].some(v => v !== null && v !== undefined);

            if (hasExistingMarks) {
                existingOverwriteList.push({
                    rollNo: student.rollNo,
                    studentName: student.name,
                    existingTotal: existing.total || 0
                });
            }

            validRows.push({
                studentId: student._id,
                rollNo: student.rollNo,
                studentName: student.name,
                nameMismatchWarning: nameMismatch ? `CSV name "${row.studentName}" differs from registered name "${student.name}"` : null,
                hasExistingMarks,
                ...parsedMarks
            });
        }

        // Overwrite confirmation requirement
        if (!overwriteConfirmed && existingOverwriteList.length > 0) {
            return res.json({
                success: false,
                requireConfirmation: true,
                message: `Found ${existingOverwriteList.length} students with previously recorded marks. Confirmation is required before overwriting existing marks.`,
                existingCount: existingOverwriteList.length,
                existingList: existingOverwriteList,
                validRowsCount: validRows.length,
                errorsCount: errors.length,
                errors
            });
        }

        // Save valid rows
        for (const item of validRows) {
            const a1 = item.assignment1;
            const a2 = item.assignment2;
            const a3 = item.assignment3;
            const a4 = item.assignment4;
            const a5 = item.assignment5;

            const a1Date = item.assignment1Date || "";
            const a2Date = item.assignment2Date || "";
            const a3Date = item.assignment3Date || "";
            const a4Date = item.assignment4Date || "";
            const a5Date = item.assignment5Date || "";

            const total = [a1, a2, a3, a4, a5]
                .filter(v => v !== null)
                .reduce((sum, v) => sum + v, 0);

            await AssignmentMarks.findOneAndUpdate(
                { organizationId, subjectId, studentId: item.studentId },
                {
                    organizationId,
                    facultyId,
                    subjectId,
                    studentId: item.studentId,
                    rollNo: item.rollNo,
                    studentName: item.studentName,
                    department: subject.department,
                    year: subject.academicYear || "SE",
                    division,
                    academicYear: subject.academicYear || "2026-2027",
                    maxMarks: maxM,
                    assignment1: a1,
                    assignment1Date: a1Date,
                    assignment2: a2,
                    assignment2Date: a2Date,
                    assignment3: a3,
                    assignment3Date: a3Date,
                    assignment4: a4,
                    assignment4Date: a4Date,
                    assignment5: a5,
                    assignment5Date: a5Date,
                    total
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const st = subject.students.find(s => String(s._id) === String(item.studentId));
            if (st) {
                st.assignmentMarks = {
                    a1, a1Date,
                    a2, a2Date,
                    a3, a3Date,
                    a4, a4Date,
                    a5, a5Date,
                    total
                };
            }
        }

        await subject.save();

        res.json({
            success: true,
            message: `Successfully imported assignment records for ${validRows.length} students! ✅`,
            summary: {
                importedCount: validRows.length,
                errorsCount: errors.length,
                errors
            }
        });
    } catch (err) {
        console.error("Import CSV error:", err);
        res.status(500).json({ error: "Failed to import CSV assignment records ❌" });
    }
});

module.exports = router;
