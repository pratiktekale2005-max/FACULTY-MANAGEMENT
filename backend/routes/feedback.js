const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");
const Subject = require("../models/Subject");
const User = require("../models/User");
const { authenticateUser } = require("./authMiddleware");

// ================= GET FEEDBACK SCORES SUMMARY =================
// GET /api/feedback/summary?userId=xxx
router.get("/summary", authenticateUser, async (req, res) => {
    const requester = req.user;
    let targetUserId = req.query.userId || req.query.facultyId;

    // Strict boundary: Faculty can ONLY access their own feedback
    if (requester.role === "Faculty") {
        targetUserId = requester._id;
    }

    if (!targetUserId) {
        return res.status(400).json({ error: "User ID is required ❌" });
    }

    try {
        // Enforce role permission boundaries & tenant isolation
        const targetUser = await User.findOne({ _id: targetUserId, organizationId: requester.organizationId });
        if (!targetUser) {
            return res.status(404).json({ error: "Target user not found in your organization ❌" });
        }

        if (requester.role === "Faculty" && String(targetUserId) !== String(requester._id)) {
            return res.status(403).json({ error: "Forbidden: You cannot inspect other faculty feedback scores ❌" });
        }

        if (requester.role === "HOD" && String(targetUser.departmentId) !== String(requester.departmentId)) {
            return res.status(403).json({ error: "Forbidden: Faculty belongs to another department ❌" });
        }

        // Fetch all feedbacks strictly belonging to this target faculty
        const feedbacks = await Feedback.find({
            organizationId: requester.organizationId,
            $or: [{ facultyId: targetUserId }, { userId: targetUserId }]
        })
        .populate("subjectId", "subjectName subjectCode department academicYear semester")
        .sort({ submittedAt: -1 });

        // Overall statistics
        let overallTotalRatings = 0;
        let overallSumRatings = 0;
        const overallBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const allComments = [];

        // Group by subject (or general)
        const grouped = {};
        feedbacks.forEach(f => {
            overallTotalRatings += 1;
            overallSumRatings += f.rating;
            if (f.rating >= 1 && f.rating <= 5) {
                overallBreakdown[f.rating] += 1;
            }

            const commentItem = {
                text: f.comments,
                rating: f.rating,
                rollNo: f.rollNo || "Anonymous",
                studentName: f.studentName || "",
                submittedAt: f.submittedAt,
                department: f.department || (f.subjectId?.department || ""),
                academicYear: f.academicYear || (f.subjectId?.academicYear || ""),
                semester: f.semester || (f.subjectId?.semester || "")
            };
            allComments.push(commentItem);

            let subKey = "general";
            let subName = "General Faculty & Teaching Survey";
            let subCode = "GENERAL";
            let dept = f.department || "";
            let ay = f.academicYear || "";
            let sem = f.semester || "";

            if (f.subjectId && f.subjectId._id) {
                subKey = f.subjectId._id.toString();
                subName = f.subjectId.subjectName || subName;
                subCode = f.subjectId.subjectCode || subCode;
                dept = f.subjectId.department || dept;
                ay = f.subjectId.academicYear || ay;
                sem = f.subjectId.semester || sem;
            }

            if (!grouped[subKey]) {
                grouped[subKey] = {
                    subjectId: subKey,
                    subjectName: subName,
                    subjectCode: subCode,
                    department: dept,
                    academicYear: ay,
                    semester: sem,
                    totalRatings: 0,
                    sumRatings: 0,
                    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    comments: []
                };
            }

            grouped[subKey].totalRatings += 1;
            grouped[subKey].sumRatings += f.rating;
            if (f.rating >= 1 && f.rating <= 5) {
                grouped[subKey].breakdown[f.rating] += 1;
            }
            if (f.comments) {
                grouped[subKey].comments.push(commentItem);
            }
        });

        // Also fetch faculty's allocated subjects to show 0-rating subjects if any
        const facultySubjects = await Subject.find({
            userId: targetUserId,
            organizationId: requester.organizationId
        });

        facultySubjects.forEach(s => {
            const sid = s._id.toString();
            if (!grouped[sid]) {
                grouped[sid] = {
                    subjectId: sid,
                    subjectName: s.subjectName,
                    subjectCode: s.subjectCode,
                    department: s.department,
                    academicYear: s.academicYear,
                    semester: s.semester,
                    totalRatings: 0,
                    sumRatings: 0,
                    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    comments: []
                };
            }
        });

        // Format as list
        const summary = Object.keys(grouped).map(key => {
            const g = grouped[key];
            return {
                subjectId: key,
                subjectName: g.subjectName,
                subjectCode: g.subjectCode,
                department: g.department,
                academicYear: g.academicYear,
                semester: g.semester,
                totalRatings: g.totalRatings,
                averageRating: g.totalRatings > 0 ? Number((g.sumRatings / g.totalRatings).toFixed(2)) : 0,
                breakdown: g.breakdown,
                comments: g.comments.slice(0, 15)
            };
        });

        const overallAverageRating = overallTotalRatings > 0
            ? Number((overallSumRatings / overallTotalRatings).toFixed(2))
            : 0;

        res.json({
            faculty: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                department: targetUser.department,
                designation: targetUser.designation
            },
            overall: {
                totalRatings: overallTotalRatings,
                averageRating: overallAverageRating,
                breakdown: overallBreakdown,
                recentComments: allComments.slice(0, 15)
            },
            summary
        });
    } catch (err) {
        console.error("Feedback summary compilation error:", err);
        res.status(500).json({ error: "Failed to compile feedback stats ❌" });
    }
});

// ================= POST SUBMIT FEEDBACK =================
// POST /api/feedback
router.post("/", authenticateUser, async (req, res) => {
    const { subjectId, facultyId, rating, comments, rollNo, studentName, department, academicYear, semester } = req.body;

    if (!rating || !comments) {
        return res.status(400).json({ error: "Rating and comments are required ❌" });
    }

    try {
        let targetFacultyId = facultyId;
        let linkedSubject = null;
        let linkedDept = department || "";
        let linkedDeptId = null;
        let linkedAcademicYear = academicYear || "";
        let linkedSemester = semester || "";

        if (subjectId) {
            linkedSubject = await Subject.findOne({ _id: subjectId, organizationId: req.user.organizationId });
            if (!linkedSubject) {
                return res.status(404).json({ error: "Subject not found or access denied ❌" });
            }
            targetFacultyId = linkedSubject.userId;
            linkedDept = linkedSubject.department || linkedDept;
            linkedAcademicYear = linkedSubject.academicYear || linkedAcademicYear;
            linkedSemester = linkedSubject.semester || linkedSemester;
        }

        if (!targetFacultyId) {
            return res.status(400).json({ error: "Target faculty member could not be determined. Please specify a subject or faculty. ❌" });
        }

        const facultyUser = await User.findOne({ _id: targetFacultyId, organizationId: req.user.organizationId });
        if (!facultyUser) {
            return res.status(404).json({ error: "Target faculty member not found in your institution ❌" });
        }

        if (!linkedDept) {
            linkedDept = facultyUser.department || "";
        }
        linkedDeptId = facultyUser.departmentId || null;

        const newFeedback = new Feedback({
            organizationId: req.user.organizationId,
            facultyId: targetFacultyId,
            userId: targetFacultyId, // for backward compatibility
            subjectId: linkedSubject ? linkedSubject._id : null,
            department: linkedDept,
            departmentId: linkedDeptId,
            academicYear: linkedAcademicYear || "2026-2027",
            semester: linkedSemester || "Current",
            rollNo: (rollNo || "").trim() || "Anonymous",
            studentName: (studentName || "").trim(),
            rating: Math.min(5, Math.max(1, Number(rating) || 5)),
            comments: comments.trim()
        });

        await newFeedback.save();
        res.json({ message: "Student course feedback evaluation submitted successfully ✅", feedback: newFeedback });
    } catch (err) {
        console.error("Feedback submission error:", err);
        res.status(500).json({ error: "Failed to submit feedback evaluation ❌" });
    }
});

module.exports = router;