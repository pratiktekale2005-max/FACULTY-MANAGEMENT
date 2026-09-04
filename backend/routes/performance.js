const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Subject = require("../models/Subject");
const Paper = require("../models/Paper");
const Feedback = require("../models/Feedback");
const Workshop = require("../models/Workshop");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const Approval = require("../models/Approval");
const PerformanceCriteria = require("../models/PerformanceCriteria");
const { authenticateUser, requireRole } = require("./authMiddleware");

// Helper function to calculate a faculty's score card
async function calculateFacultyScore(facultyId) {
    const user = await User.findById(facultyId);
    const orgId = user ? user.organizationId : null;

    // 1. Fetch criteria weights for this specific organization
    const criteriaList = orgId 
        ? await PerformanceCriteria.find({ organizationId: orgId, isActive: true })
        : await PerformanceCriteria.find({ isActive: true });

    const weights = {};
    criteriaList.forEach(c => {
        weights[c.category] = c.weight;
    });

    const defaultWeights = {
        "Teaching": 30,
        "Research": 25,
        "Student Feedback": 15,
        "Professional Development": 10,
        "Administrative Work": 10,
        "Other Activities": 10
    };

    const activeWeights = { ...defaultWeights, ...weights };

    // 2. Compute Teaching Score (Green Book syllabus progress)
    const subjects = await Subject.find({ userId: facultyId });
    let teachingScoreRaw = 100; // Default if no subjects assigned
    if (subjects.length > 0) {
        let totalPct = 0;
        subjects.forEach(sub => {
            const planned = sub.lecturesPlanned || 40;
            const conducted = sub.lecturesConducted || 0;
            const pct = Math.min((conducted / planned) * 100, 100);
            totalPct += pct;
        });
        teachingScoreRaw = totalPct / subjects.length;
    }

    // 3. Compute Research Score (Publications count - only approved)
    const approvedPaperIds = await Approval.find({
        organizationId: orgId,
        entityType: "PUBLICATION",
        submittedBy: facultyId,
        status: "APPROVED"
    }).distinct("entityId");

    const approvedPapersCount = await Paper.countDocuments({ _id: { $in: approvedPaperIds } });
    const researchScoreRaw = Math.min(approvedPapersCount * 25, 100);

    // 4. Compute Student Feedback Score (Survey rating averages)
    const feedbacks = await Feedback.find({ userId: facultyId });
    let feedbackScoreRaw = 80; // Default equivalent to 4/5 stars if no feedback
    if (feedbacks.length > 0) {
        const sum = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
        feedbackScoreRaw = (sum / feedbacks.length) * 20; // Scale 1-5 rating to 0-100
    }

    // 5. Compute Professional Development Score (Workshops organized/attended - only approved)
    const approvedWorkshopIds = await Approval.find({
        organizationId: orgId,
        entityType: "WORKSHOP",
        submittedBy: facultyId,
        status: "APPROVED"
    }).distinct("entityId");

    const approvedWorkshopsCount = await Workshop.countDocuments({ _id: { $in: approvedWorkshopIds } });
    const devScoreRaw = Math.min(approvedWorkshopsCount * 50, 100);

    // 6. Compute Administrative Work (Tasks progress)
    const tasks = await Task.find({ assignedTo: facultyId });
    let adminScoreRaw = 100; // Default if no tasks assigned
    if (tasks.length > 0) {
        const completed = tasks.filter(t => t.status === "completed").length;
        adminScoreRaw = (completed / tasks.length) * 100;
    }

    // 7. Compute Other Activities Score (Other portfolio activities - only approved)
    const approvedActivityIds = await Approval.find({
        organizationId: orgId,
        entityType: "ACTIVITY",
        submittedBy: facultyId,
        status: "APPROVED"
    }).distinct("entityId");

    const approvedActivitiesCount = await Activity.countDocuments({ _id: { $in: approvedActivityIds } });
    const otherScoreRaw = Math.min(approvedActivitiesCount * 33.4, 100);

    // 8. Compile weighted contributions
    const teachingContribution = (teachingScoreRaw * (activeWeights["Teaching"] / 100));
    const researchContribution = (researchScoreRaw * (activeWeights["Research"] / 100));
    const feedbackContribution = (feedbackScoreRaw * (activeWeights["Student Feedback"] / 100));
    const devContribution = (devScoreRaw * (activeWeights["Professional Development"] / 100));
    const adminContribution = (adminScoreRaw * (activeWeights["Administrative Work"] / 100));
    const otherContribution = (otherScoreRaw * (activeWeights["Other Activities"] / 100));

    const overallScore = Math.round(
        teachingContribution +
        researchContribution +
        feedbackContribution +
        devContribution +
        adminContribution +
        otherContribution
    );

    return {
        overallScore,
        breakdown: {
            "Teaching": {
                score: Math.round(teachingContribution),
                rawProgress: Math.round(teachingScoreRaw),
                weight: activeWeights["Teaching"]
            },
            "Research": {
                score: Math.round(researchContribution),
                rawProgress: Math.round(researchScoreRaw),
                weight: activeWeights["Research"],
                count: approvedPapersCount
            },
            "Student Feedback": {
                score: Math.round(feedbackContribution),
                rawProgress: Math.round(feedbackScoreRaw),
                weight: activeWeights["Student Feedback"],
                averageStars: feedbacks.length > 0 ? Number((feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length).toFixed(2)) : 4.0
            },
            "Professional Development": {
                score: Math.round(devContribution),
                rawProgress: Math.round(devScoreRaw),
                weight: activeWeights["Professional Development"],
                count: approvedWorkshopsCount
            },
            "Administrative Work": {
                score: Math.round(adminContribution),
                rawProgress: Math.round(adminScoreRaw),
                weight: activeWeights["Administrative Work"]
            },
            "Other Activities": {
                score: Math.round(otherContribution),
                rawProgress: Math.round(otherScoreRaw),
                weight: activeWeights["Other Activities"],
                count: approvedActivitiesCount
            }
        }
    };
}

// ================= GET SINGLE FACULTY SCOREBREAKDOWN =================
router.get("/:facultyId", authenticateUser, async (req, res) => {
    const { facultyId } = req.params;

    try {
        const faculty = await User.findOne({ _id: facultyId, organizationId: req.user.organizationId });
        if (!faculty) {
            return res.status(404).json({ error: "Faculty not found in your organization ❌" });
        }

        // Department lock check: Faculty can only see themselves. HOD can only see department members.
        if (req.user.role === "Faculty" && String(facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Forbidden: You cannot inspect other faculty details ❌" });
        }
        if (req.user.role === "HOD" && String(faculty.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: Faculty belongs to another department ❌" });
        }

        const scoreCard = await calculateFacultyScore(facultyId);

        // Sync with performanceScore field in User model
        if (faculty.performanceScore !== scoreCard.overallScore) {
            faculty.performanceScore = scoreCard.overallScore;
            await faculty.save();
        }

        res.json({ facultyName: faculty.name, ...scoreCard });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to compile performance scores ❌" });
    }
});

// ================= GET DEPARTMENT PERFORMANCE AVERAGES (HOD & PRINCIPAL ONLY) =================
router.get("/department/:departmentId", requireRole(["Principal", "HOD"]), async (req, res) => {
    const { departmentId } = req.params;

    if (req.user.role === "HOD" && String(departmentId) !== String(req.user.departmentId)) {
        return res.status(403).json({ error: "Forbidden: Department access restricted ❌" });
    }

    try {
        const faculties = await User.find({ departmentId, organizationId: req.user.organizationId, role: "Faculty" });
        if (faculties.length === 0) {
            return res.json({ averageScore: 0, breakdowns: [] });
        }

        let sumOverall = 0;
        const list = [];
        for (const fac of faculties) {
            const card = await calculateFacultyScore(fac._id);
            sumOverall += card.overallScore;
            list.push({
                facultyId: fac._id,
                name: fac.name,
                overallScore: card.overallScore,
                breakdown: card.breakdown
            });
        }

        res.json({
            averageScore: Math.round(sumOverall / faculties.length),
            faculties: list
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch department statistics ❌" });
    }
});

// ================= GET CONFIG CRITERIA WEIGHTS (PRINCIPAL & HOD ONLY) =================
router.get("/criteria/config", requireRole(["Principal", "HOD"]), async (req, res) => {
    try {
        const criteria = await PerformanceCriteria.find({ organizationId: req.user.organizationId });
        res.json({ criteria });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch appraisal configurations ❌" });
    }
});

// ================= UPDATE CONFIG CRITERIA WEIGHTS (PRINCIPAL ONLY) =================
router.put("/criteria/config", requireRole(["Principal"]), async (req, res) => {
    const { criteriaList } = req.body; // Array of { category, weight }

    if (!criteriaList || !Array.isArray(criteriaList)) {
        return res.status(400).json({ error: "Invalid criteria configuration payload ❌" });
    }

    // Verify sum of weights adds up to 100%
    const totalWeight = criteriaList.reduce((acc, curr) => acc + Number(curr.weight), 0);
    if (totalWeight !== 100) {
        return res.status(400).json({ error: `Total criteria configuration weight must equal 100% (currently ${totalWeight}%) ❌` });
    }

    try {
        for (const item of criteriaList) {
            await PerformanceCriteria.findOneAndUpdate(
                { organizationId: req.user.organizationId, category: item.category },
                { weight: Number(item.weight), updatedAt: new Date() },
                { upsert: true }
            );
        }
        res.json({ message: "Performance criteria appraisal weights updated successfully ✅" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update appraisal weights ❌" });
    }
});

module.exports = router;

