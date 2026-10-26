const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject");
const AttendanceRecord = require("../models/AttendanceRecord");
const { authenticateUser } = require("./authMiddleware");

// GET /api/attendance/options
// Return faculty's assigned classes, years, divisions, and subjects
router.get("/options", authenticateUser, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const facultyId = req.user._id;

        let subjects = await Subject.find({ organizationId, userId: facultyId }).lean();
        if (subjects.length === 0 && ["HOD", "Admin", "Principal"].includes(req.user.role)) {
            subjects = await Subject.find({ organizationId }).lean();
        }

        const options = [];

        for (const subj of subjects) {
            const dept = subj.department || req.user.department || "General Engineering";
            const sem = subj.semester || "";

            let year = subj.students?.[0]?.year || "SE (SY)";
            if (sem.includes("VII") || sem.includes("VIII") || sem.includes("7") || sem.includes("8") || (subj.subjectCode && subj.subjectCode.includes("-4"))) {
                year = "BE (Final Year)";
            } else if (sem.includes("V") || sem.includes("VI") || sem.includes("5") || sem.includes("6") || (subj.subjectCode && subj.subjectCode.includes("-3"))) {
                year = "TE (TY)";
            } else if (sem.includes("III") || sem.includes("IV") || sem.includes("3") || sem.includes("4") || (subj.subjectCode && subj.subjectCode.includes("-2"))) {
                year = "SE (SY)";
            } else if (sem.includes("I") || sem.includes("II") || sem.includes("1") || sem.includes("2") || (subj.subjectCode && subj.subjectCode.includes("-1"))) {
                year = "FE (FY)";
            }

            const divisions = (subj.divisionList && subj.divisionList.length > 0)
                ? subj.divisionList
                : [...new Set((subj.students || []).map(s => s.division).filter(Boolean))];

            if (divisions.length === 0) divisions.push("A");

            for (const div of divisions) {
                options.push({
                    subjectId: subj._id,
                    subjectName: subj.subjectName,
                    subjectCode: subj.subjectCode || "COURSE",
                    department: dept,
                    year,
                    division: div,
                    label: `${dept} • ${year} • Div ${div} • ${subj.subjectName} (${subj.subjectCode || "COURSE"})`
                });
            }
        }

        res.json({ success: true, options });
    } catch (err) {
        console.error("Attendance options error:", err);
        res.status(500).json({ error: "Failed to fetch attendance options ❌" });
    }
});

// GET /api/attendance/sheet
// Loads enrolled students for (subjectId, division, date) and saved attendance status if any
router.get("/sheet", authenticateUser, async (req, res) => {
    try {
        const { subjectId, division, date } = req.query;

        if (!subjectId || !division || !date) {
            return res.status(400).json({ error: "subjectId, division, and date are required ❌" });
        }

        const organizationId = req.user.organizationId;
        const subject = await Subject.findOne({ _id: subjectId, organizationId });

        if (!subject) {
            return res.status(404).json({ error: "Assigned course subject not found ❌" });
        }

        // Authorization check: faculty must own subject unless HOD/Principal
        if (req.user.role === "Faculty" && String(subject.userId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: You are not assigned to this course subject ❌" });
        }

        // Filter students in division
        const studentsInDiv = (subject.students || []).filter(s => {
            if (s.division) return s.division.toUpperCase() === division.toUpperCase();
            return division === "A";
        }).sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true }));

        // Check if attendance was already saved for this date
        const savedRecord = await AttendanceRecord.findOne({
            organizationId,
            subjectId,
            division,
            date
        }).lean();

        // Also query historical sessions to compute cumulative attendance percentage per student
        const pastRecords = await AttendanceRecord.find({
            organizationId,
            subjectId,
            division
        }).lean();

        const studentStats = {};
        for (const pr of pastRecords) {
            for (const entry of (pr.entries || [])) {
                const sId = String(entry.studentId);
                if (!studentStats[sId]) {
                    studentStats[sId] = { total: 0, present: 0 };
                }
                studentStats[sId].total++;
                if (entry.status === "PRESENT") {
                    studentStats[sId].present++;
                }
            }
        }

        // Map students with their status on this date and cumulative %
        const studentList = studentsInDiv.map(s => {
            let currentStatus = "PRESENT"; // default
            if (savedRecord && savedRecord.entries) {
                const found = savedRecord.entries.find(e => String(e.studentId) === String(s._id));
                if (found) currentStatus = found.status;
            } else if (s.attendance && s.attendance.length > 0) {
                const legacy = s.attendance.find(a => a.date === date);
                if (legacy) currentStatus = legacy.status;
            }

            const stats = studentStats[String(s._id)] || { total: 0, present: 0 };
            const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100;

            return {
                studentId: s._id,
                rollNo: s.rollNo,
                prnNumber: s.prnNumber || "",
                name: s.name,
                email: s.email || "",
                gender: s.gender || "Male",
                status: currentStatus,
                totalRecordedClasses: stats.total,
                totalPresent: stats.present,
                attendancePercentage: percentage
            };
        });

        res.json({
            success: true,
            isSaved: !!savedRecord,
            savedRecordId: savedRecord ? savedRecord._id : null,
            date,
            totalStudents: studentList.length,
            students: studentList,
            subjectName: subject.subjectName,
            subjectCode: subject.subjectCode
        });
    } catch (err) {
        console.error("Fetch attendance sheet error:", err);
        res.status(500).json({ error: "Failed to load attendance roster ❌" });
    }
});

// POST /api/attendance/sheet
// Save or update attendance records (Present, Absent, On Leave) with duplicate prevention
router.post("/sheet", authenticateUser, async (req, res) => {
    try {
        const { subjectId, division, date, entries } = req.body;

        if (!subjectId || !division || !date || !Array.isArray(entries)) {
            return res.status(400).json({ error: "Missing required attendance parameters ❌" });
        }

        const organizationId = req.user.organizationId;
        const facultyId = req.user._id;

        const subject = await Subject.findOne({ _id: subjectId, organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Course subject not found ❌" });
        }

        if (req.user.role === "Faculty" && String(subject.userId) !== String(facultyId)) {
            return res.status(403).json({ error: "Access denied: Unauthorized to log attendance for this course ❌" });
        }

        const validEntries = entries.map(e => ({
            studentId: e.studentId,
            rollNo: e.rollNo || "",
            prnNumber: e.prnNumber || "",
            name: e.name || "Student",
            status: ["PRESENT", "ABSENT", "ON_LEAVE"].includes(e.status) ? e.status : "PRESENT"
        }));

        const presentCount = validEntries.filter(e => e.status === "PRESENT").length;
        const absentCount = validEntries.filter(e => e.status === "ABSENT").length;
        const leaveCount = validEntries.filter(e => e.status === "ON_LEAVE").length;

        // Upsert AttendanceRecord to guarantee uniqueness on (organizationId, subjectId, division, date)
        const record = await AttendanceRecord.findOneAndUpdate(
            { organizationId, subjectId, division, date },
            {
                organizationId,
                facultyId,
                subjectId,
                department: subject.department,
                year: subject.academicYear || "SE",
                division,
                date,
                entries: validEntries,
                totalStudents: validEntries.length,
                presentCount,
                absentCount,
                leaveCount
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Also update Subject.students[].attendance for full backwards compatibility
        validEntries.forEach(item => {
            const st = subject.students.find(s => String(s._id) === String(item.studentId));
            if (st) {
                if (!st.attendance) st.attendance = [];
                st.attendance = st.attendance.filter(a => a.date !== date);
                st.attendance.push({ date, status: item.status });
            }
        });
        await subject.save();

        res.json({
            message: `Attendance for ${date} (Division ${division}) saved successfully! ✅`,
            record
        });
    } catch (err) {
        console.error("Save attendance error:", err);
        res.status(500).json({ error: "Failed to save attendance records ❌" });
    }
});

// GET /api/attendance/history
// Returns past recorded attendance sessions and statistics
router.get("/history", authenticateUser, async (req, res) => {
    try {
        const { subjectId, division } = req.query;

        if (!subjectId || !division) {
            return res.status(400).json({ error: "subjectId and division are required ❌" });
        }

        const organizationId = req.user.organizationId;
        const records = await AttendanceRecord.find({
            organizationId,
            subjectId,
            division
        }).sort({ date: -1 }).lean();

        // Calculate aggregates
        let totalSessions = records.length;
        let totalPresent = 0;
        let totalPossible = 0;

        records.forEach(r => {
            totalPresent += r.presentCount || 0;
            totalPossible += r.totalStudents || 0;
        });

        const overallPercentage = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 100;

        res.json({
            success: true,
            totalSessions,
            overallPercentage,
            history: records
        });
    } catch (err) {
        console.error("Fetch attendance history error:", err);
        res.status(500).json({ error: "Failed to fetch attendance history ❌" });
    }
});

module.exports = router;
