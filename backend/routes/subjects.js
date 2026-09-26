const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject");
const User = require("../models/User");
const { authenticateUser } = require("./authMiddleware");

// ================= GET SUBJECTS =================
// GET /api/subjects
router.get("/", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId } = req.user;
        let query = { organizationId };

        if (role === "HOD") {
            const memberIds = await User.find({ organizationId, departmentId: req.user.departmentId }).distinct("_id");
            query.userId = { $in: memberIds };
        } else if (role === "Faculty") {
            query.userId = req.user._id;
        }

        const filterUserId = req.query.targetUserId || req.query.userId;
        if (filterUserId && filterUserId !== "all" && role !== "Faculty") {
            const mongoose = require("mongoose");
            if (mongoose.Types.ObjectId.isValid(filterUserId)) {
                const targetUser = await User.findOne({ _id: filterUserId, organizationId });
                if (targetUser) {
                    if (role === "HOD" && String(targetUser.departmentId) !== String(req.user.departmentId)) {
                        return res.status(403).json({ error: "Access denied: target user belongs to another department ❌" });
                    }
                    query.userId = targetUser._id;
                }
            }
        }

        const subjects = await Subject.find(query).populate("userId", "name email department designation");
        res.json({ subjects });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch subjects ❌" });
    }
});

// ================= GET DEPARTMENT STUDENTS (FACULTY + HOD COMBINED) =================
// GET /api/subjects/department-students
router.get("/department-students", authenticateUser, async (req, res) => {
    try {
        const { role, organizationId, department, departmentId } = req.user;
        let query = { organizationId };

        if (role === "Faculty" || role === "HOD") {
            // Find all users (Faculty + HOD) in this department
            let deptUserIds = [];
            if (departmentId) {
                deptUserIds = await User.find({ organizationId, departmentId }).distinct("_id");
            }
            if (!deptUserIds.length && department) {
                deptUserIds = await User.find({ organizationId, department }).distinct("_id");
            }
            if (!deptUserIds.length) {
                deptUserIds = [req.user._id];
            }

            // Also search by department text in Subject
            query.$or = [
                { userId: { $in: deptUserIds } },
                { department: department || req.user.department }
            ];
        } else if (role === "Principal" || role === "Admin") {
            // Principal can view across all departments, or filter by specific department
            if (req.query.department) {
                query.department = req.query.department;
            }
        }

        const subjects = await Subject.find(query).populate("userId", "name email role department designation");

        // Combine and deduplicate students across all matched subjects
        const studentMap = new Map();

        for (const subj of subjects) {
            const addedByName = subj.userId ? `${subj.userId.name} (${subj.userId.role || 'Faculty'})` : "Faculty";
            const addedByRole = subj.userId?.role || "Faculty";
            const deptName = subj.department || department || "General";

            for (const st of (subj.students || [])) {
                // Unique key: PRN or rollNo (case-insensitive) + department
                const key = (st.prnNumber && st.prnNumber.trim()) 
                    ? st.prnNumber.trim().toUpperCase() 
                    : `${st.rollNo.trim().toUpperCase()}_${deptName.toUpperCase()}`;

                if (!studentMap.has(key)) {
                    studentMap.set(key, {
                        _id: st._id,
                        rollNo: st.rollNo,
                        name: st.name,
                        gender: st.gender || "Male",
                        department: st.department || deptName,
                        year: st.year || subj.academicYear || "SE",
                        division: st.division || "-",
                        mobileNumber: st.mobileNumber || "",
                        prnNumber: st.prnNumber || "",
                        skills: st.skills || "",
                        addedBy: st.addedBy || addedByName,
                        addedByRole: st.addedByRole || addedByRole,
                        subjectId: subj._id,
                        subjectName: subj.subjectName,
                        subjectCode: subj.subjectCode,
                        allSubjects: [{ id: subj._id, name: subj.subjectName, code: subj.subjectCode }]
                    });
                } else {
                    // Already in map - append subject to list
                    const existing = studentMap.get(key);
                    if (!existing.allSubjects.some(s => String(s.id) === String(subj._id))) {
                        existing.allSubjects.push({ id: subj._id, name: subj.subjectName, code: subj.subjectCode });
                    }
                    if ((!existing.division || existing.division === "-") && st.division) {
                        existing.division = st.division;
                    }
                    if (!existing.gender && st.gender) {
                        existing.gender = st.gender;
                    }
                }
            }
        }

        const studentsList = Array.from(studentMap.values()).sort((a, b) => {
            return (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true });
        });

        // Return subjects list for filtering dropdown
        const availableSubjects = subjects.map(s => ({
            _id: s._id,
            subjectName: s.subjectName,
            subjectCode: s.subjectCode,
            department: s.department,
            academicYear: s.academicYear,
            ownerName: s.userId?.name || "Faculty",
            ownerRole: s.userId?.role || "Faculty"
        }));

        res.json({
            success: true,
            totalStudents: studentsList.length,
            students: studentsList,
            subjects: availableSubjects
        });
    } catch (err) {
        console.error("Get department students error:", err);
        res.status(500).json({ error: "Failed to fetch department students ❌" });
    }
});

// ================= POST ADD SUBJECT =================
router.post("/", authenticateUser, async (req, res) => {
    const { subjectName, subjectCode, department, academicYear, semester, lecturesPlanned, practicalCode, practicalsPlanned, hasDivision, numberOfDivisions } = req.body;

    if (!subjectName || !subjectCode || !department || !academicYear || !semester) {
        return res.status(400).json({ error: "Required fields are missing ❌" });
    }

    try {
        let facultyId = req.user._id;
        if (req.user.role === "Principal" && req.body.assignedFacultyId) {
            // Principal assigning to another faculty
            facultyId = req.body.assignedFacultyId;
            const mongoose = require("mongoose");
            if (facultyId === "all" || !mongoose.Types.ObjectId.isValid(facultyId)) {
                return res.status(400).json({ error: "Invalid assigned faculty ID ❌" });
            }
            const targetFaculty = await User.findOne({ _id: facultyId, organizationId: req.user.organizationId });
            if (!targetFaculty) {
                return res.status(404).json({ error: "Assigned faculty member not found in your organization ❌" });
            }
        }

        const isDiv = hasDivision === "Yes" || hasDivision === true;
        const numDiv = isDiv ? (Number(numberOfDivisions) || 2) : 0;
        const divisionList = [];
        if (isDiv && numDiv > 0) {
            for (let i = 0; i < numDiv; i++) {
                divisionList.push(String.fromCharCode(65 + i)); // A, B, C, D, E
            }
        }

        const newSubject = new Subject({
            organizationId: req.user.organizationId,
            userId: facultyId,
            subjectName,
            subjectCode,
            department,
            academicYear,
            semester,
            lecturesPlanned: Number(lecturesPlanned) || 40,
            lecturesConducted: 0,
            practicalCode: practicalCode || "",
            practicalsPlanned: Number(practicalsPlanned) || 0,
            practicalsConducted: 0,
            lectures: [],
            practicals: [],
            teachingPlan: [],
            students: [],
            hasDivision: isDiv,
            numberOfDivisions: numDiv,
            divisionList,
            divisionTeachingPlans: [],
            divisionResources: []
        });

        // Initialize default empty lectures plan and teaching plan items
        const topics = req.body.lectureTopics || [];
        for (let i = 1; i <= (Number(lecturesPlanned) || 40); i++) {
            const topicName = (topics[i - 1] && topics[i - 1].trim())
                ? topics[i - 1].trim()
                : `Lecture ${i} Syllabus Outline`;

            newSubject.lectures.push({
                topic: topicName,
                plannedDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                conductedDate: "",
                conductedTopic: "",
                status: "pending"
            });
        }

        if (Number(practicalsPlanned) > 0) {
            for (let i = 1; i <= Number(practicalsPlanned); i++) {
                newSubject.practicals.push({
                    batch: `Batch A${i}`,
                    plannedDate: new Date(Date.now() + i * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    conductedDate: "",
                    status: "pending"
                });
            }
        }

        // Default 15-week teaching plan
        for (let i = 1; i <= 15; i++) {
            newSubject.teachingPlan.push({
                week: i,
                topic: `Week ${i} Syllabus Target`,
                plannedDate: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                status: "pending"
            });
        }

        // Initialize default 15-week weekly plan for each division
        if (isDiv) {
            divisionList.forEach(div => {
                for (let i = 1; i <= 15; i++) {
                    newSubject.divisionTeachingPlans.push({
                        division: div,
                        week: i,
                        topic: `Week ${i} Syllabus Target`,
                        plannedDate: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                        status: "pending",
                        unitsCovered: "",
                        hoursCompleted: 0,
                        remainingHours: 0,
                        lessonPlan: ""
                    });
                }
            });
        }

        await newSubject.save();

        // Add to User's subjectsHandled list
        await User.findByIdAndUpdate(facultyId, {
            $addToSet: { subjectsHandled: subjectName }
        });

        res.json({ message: "Subject registered in Green Book ✅", subject: newSubject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create subject ❌" });
    }
});

// ================= CONDUCT LECTURE / PRACTICAL =================
// PUT /api/subjects/:id/conduct-class
router.put("/:id/conduct-class", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { itemId, type, conductedDate, conductedTopic, status } = req.body; // type: 'lecture' | 'practical'

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        if (type === "lecture") {
            const index = subject.lectures.findIndex(l => l._id.toString() === itemId);
            if (index !== -1) {
                subject.lectures[index].conductedDate = conductedDate;
                subject.lectures[index].conductedTopic = conductedTopic || "";
                subject.lectures[index].status = status;
                
                if (req.body.lectureDeliveryStatus) {
                    subject.lectures[index].lectureDeliveryStatus = req.body.lectureDeliveryStatus;
                } else {
                    subject.lectures[index].lectureDeliveryStatus = status === "completed" ? "COMPLETED" : "INCOMPLETE";
                }
                
                // Recalculate conducted count
                subject.lecturesConducted = subject.lectures.filter(l => l.lectureDeliveryStatus === "COMPLETED" || l.status === "completed").length;
            }
        } else if (type === "practical") {
            const index = subject.practicals.findIndex(p => p._id.toString() === itemId);
            if (index !== -1) {
                subject.practicals[index].conductedDate = conductedDate;
                subject.practicals[index].conductedTopic = conductedTopic || "";
                subject.practicals[index].status = status;

                // Recalculate conducted count
                subject.practicalsConducted = subject.practicals.filter(p => p.status === "completed").length;
            }
        }

        await subject.save();
        res.json({ message: "Teaching status updated ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update lecture logs ❌" });
    }
});

// ================= UPDATE LECTURE DELIVERY STATUS (YES / NO) =================
// PUT /api/subjects/:id/lectures/:lectureId/delivery-status
router.put("/:id/lectures/:lectureId/delivery-status", authenticateUser, async (req, res) => {
    const { id, lectureId } = req.params;
    const { lectureDeliveryStatus } = req.body; // "COMPLETED" | "INCOMPLETE"

    if (!lectureDeliveryStatus || !["COMPLETED", "INCOMPLETE"].includes(lectureDeliveryStatus)) {
        return res.status(400).json({ error: "Invalid lecture delivery status. Must be COMPLETED or INCOMPLETE. ❌" });
    }

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        const index = subject.lectures.findIndex(l => l._id.toString() === lectureId);
        if (index === -1) {
            return res.status(404).json({ error: "Lecture not found in subject ❌" });
        }

        subject.lectures[index].lectureDeliveryStatus = lectureDeliveryStatus;
        subject.lectures[index].status = lectureDeliveryStatus === "COMPLETED" ? "completed" : "pending";

        if (lectureDeliveryStatus === "COMPLETED") {
            if (!subject.lectures[index].conductedDate) {
                subject.lectures[index].conductedDate = new Date().toISOString().split("T")[0];
            }
            if (!subject.lectures[index].conductedTopic) {
                subject.lectures[index].conductedTopic = subject.lectures[index].topic;
            }
        } else {
            subject.lectures[index].conductedDate = "";
        }

        subject.lecturesConducted = subject.lectures.filter(l => l.lectureDeliveryStatus === "COMPLETED" || l.status === "completed").length;
        await subject.save();

        res.json({
            message: `Lecture delivery status marked as ${lectureDeliveryStatus} ✅`,
            lecture: subject.lectures[index],
            lecturesConducted: subject.lecturesConducted,
            subject
        });
    } catch (err) {
        console.error("Update lecture delivery status error:", err);
        res.status(500).json({ error: "Failed to update lecture delivery status ❌" });
    }
});

// ================= UPDATE TEACHING PLAN =================
// PUT /api/subjects/:id/teaching-plan
router.put("/:id/teaching-plan", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { weekId, status, topic } = req.body;

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        const index = subject.teachingPlan.findIndex(tp => tp._id.toString() === weekId);
        if (index !== -1) {
            if (status) subject.teachingPlan[index].status = status;
            if (topic) subject.teachingPlan[index].topic = topic;
        }

        await subject.save();
        res.json({ message: "Teaching plan updated ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update plan status ❌" });
    }
});

// ================= BULK IMPORT STUDENTS (CSV PARSER) =================
// PUT /api/subjects/:id/import-students
router.put("/:id/import-students", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { studentsList } = req.body; // Array of { rollNo, name, mobileNumber, prnNumber, division }

    if (!studentsList || !Array.isArray(studentsList)) {
        return res.status(400).json({ error: "Invalid student list format ❌" });
    }

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        // Validate and Add students while checking duplicates and format
        for (const s of studentsList) {
            if (s.rollNo && s.name && s.mobileNumber && s.prnNumber) {
                // Validate 10-digit mobile number
                const mobRegex = /^\d{10}$/;
                if (!mobRegex.test(s.mobileNumber)) {
                    return res.status(400).json({ error: `Mobile number "${s.mobileNumber}" for student "${s.name}" is invalid. Must be exactly 10 digits and numeric. ❌` });
                }

                // Check duplicate roll number or PRN in current subject roster
                const existsRoll = subject.students.some(st => st.rollNo.toLowerCase() === s.rollNo.toLowerCase());
                const existsPrnSelf = subject.students.some(st => st.prnNumber === s.prnNumber);

                if (existsRoll) {
                    continue; // Skip already enrolled rollNo
                }
                if (existsPrnSelf) {
                    return res.status(400).json({ error: `PRN Number "${s.prnNumber}" is duplicated in this subject's roster. ❌` });
                }

                // Check unique PRN across all subjects globally
                const globalExists = await Subject.findOne({ "students.prnNumber": s.prnNumber });
                if (globalExists) {
                    return res.status(400).json({ error: `PRN Number "${s.prnNumber}" is already assigned to a student in another course roster! ❌` });
                }

                subject.students.push({
                    rollNo: s.rollNo,
                    name: s.name,
                    gender: s.gender || "Male",
                    mobileNumber: s.mobileNumber,
                    prnNumber: s.prnNumber,
                    division: s.division || "",
                    skills: s.skills || "",
                    year: s.year || subject.academicYear || "SE",
                    department: subject.department || req.user.department,
                    addedBy: `${req.user.name || req.user.fullName || 'Faculty'} (${req.user.role})`,
                    addedByRole: req.user.role,
                    customFields: {}
                });
            } else {
                return res.status(400).json({ error: "Enrolled student records must include Roll No, Name, Mobile Number, and PRN Number! ❌" });
            }
        }

        await subject.save();
        res.json({ message: "Students enrolled successfully ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to import rosters ❌" });
    }
});

// ================= UPDATE STUDENT ATTRIBUTES =================
// PUT /api/subjects/:id/students/:studentId
router.put("/:id/students/:studentId", authenticateUser, async (req, res) => {
    const { id, studentId } = req.params;
    const { mobileNumber, prnNumber, skills, division, customFields } = req.body;

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        const index = subject.students.findIndex(s => s._id.toString() === studentId);
        if (index !== -1) {
            if (mobileNumber !== undefined) {
                const mobRegex = /^\d{10}$/;
                if (!mobRegex.test(mobileNumber)) {
                    return res.status(400).json({ error: "Mobile number is invalid. Must be exactly 10 digits and numeric. ❌" });
                }
                subject.students[index].mobileNumber = mobileNumber;
            }

            if (prnNumber !== undefined && prnNumber !== subject.students[index].prnNumber) {
                // Ensure unique globally
                const globalExists = await Subject.findOne({ "students.prnNumber": prnNumber });
                if (globalExists) {
                    return res.status(400).json({ error: `PRN Number "${prnNumber}" already exists in another roster! ❌` });
                }
                subject.students[index].prnNumber = prnNumber;
            }

            if (skills !== undefined) subject.students[index].skills = skills;
            if (division !== undefined) subject.students[index].division = division;
            if (customFields !== undefined) {
                subject.students[index].customFields = customFields;
            }
        }

        await subject.save();
        res.json({ message: "Student parameters updated ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update attributes ❌" });
    }
});

// ================= UPDATE CO-PO MAPPING & DETAILS =================
// PUT /api/subjects/:id/co-po
router.put("/:id/co-po", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { courseObjectives, courseOutcomes, coPoMapping } = req.body;

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        if (courseObjectives !== undefined) subject.courseObjectives = courseObjectives;
        if (courseOutcomes !== undefined) subject.courseOutcomes = courseOutcomes;
        if (coPoMapping !== undefined) subject.coPoMapping = coPoMapping;

        await subject.save();
        res.json({ message: "CO-PO Mapping and Objectives updated successfully ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update CO-PO mapping ❌" });
    }
});

// ================= UPDATE FULL TEACHING PLAN =================
// PUT /api/subjects/:id/teaching-plan-full
router.put("/:id/teaching-plan-full", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { teachingPlan } = req.body;

    if (!teachingPlan || !Array.isArray(teachingPlan)) {
        return res.status(400).json({ error: "Invalid teaching plan payload ❌" });
    }

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        subject.teachingPlan = teachingPlan;
        await subject.save();
        res.json({ message: "Teaching plan updated successfully ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update teaching plan ❌" });
    }
});

// ================= UPDATE FULL LECTURES PLAN =================
// PUT /api/subjects/:id/lectures-full
router.put("/:id/lectures-full", authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { lectures } = req.body;

    if (!lectures || !Array.isArray(lectures)) {
        return res.status(400).json({ error: "Invalid lectures payload ❌" });
    }

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        subject.lectures = lectures;
        await subject.save();
        res.json({ message: "Lectures syllabus plan saved successfully ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update lectures syllabus plan ❌" });
    }
});

// ================= DIVISION ATTENDANCE =================
router.put("/:id/divisions/:divisionId/attendance", authenticateUser, async (req, res) => {
    const { id, divisionId } = req.params;
    const { date, attendanceList } = req.body; // Array of { studentId, status: "PRESENT" | "ABSENT" }

    if (!date || !attendanceList || !Array.isArray(attendanceList)) {
        return res.status(400).json({ error: "Missing required attendance parameters (date, attendanceList) ❌" });
    }

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        attendanceList.forEach(item => {
            const student = subject.students.find(s => s._id.toString() === item.studentId && s.division === divisionId);
            if (student) {
                student.attendance = student.attendance.filter(a => a.date !== date);
                student.attendance.push({ date, status: item.status });
            }
        });

        await subject.save();
        res.json({ message: "Division attendance saved successfully! ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update division attendance ❌" });
    }
});

// ================= DIVISION INTERNAL MARKS =================
router.put("/:id/divisions/:divisionId/students/:studentId/marks", authenticateUser, async (req, res) => {
    const { id, divisionId, studentId } = req.params;
    const { cia, mse, ese, practical } = req.body;

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        const student = subject.students.find(s => s._id.toString() === studentId && s.division === divisionId);
        if (!student) {
            return res.status(404).json({ error: "Student not found in this division ❌" });
        }

        if (!student.internalMarks) {
            student.internalMarks = { cia: 0, mse: 0, ese: 0, practical: 0 };
        }

        if (cia !== undefined) student.internalMarks.cia = Number(cia) || 0;
        if (mse !== undefined) student.internalMarks.mse = Number(mse) || 0;
        if (ese !== undefined) student.internalMarks.ese = Number(ese) || 0;
        if (practical !== undefined) student.internalMarks.practical = Number(practical) || 0;

        await subject.save();
        res.json({ message: "Internal marks updated successfully! ✅", studentName: student.name, studentMarks: student.internalMarks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update marks ❌" });
    }
});

// ================= DIVISION RESOURCES =================
router.put("/:id/divisions/:divisionId/resources", authenticateUser, async (req, res) => {
    const { id, divisionId } = req.params;
    const { action, resourceId, title, type, url } = req.body;

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        if (action === "add") {
            if (!title || !type || !url) {
                return res.status(400).json({ error: "Missing resource parameters (title, type, url) ❌" });
            }
            subject.divisionResources.push({ title, type, url, division: divisionId });
        } else if (action === "delete") {
            if (!resourceId) {
                return res.status(400).json({ error: "Missing resourceId to delete ❌" });
            }
            subject.divisionResources = subject.divisionResources.filter(r => r._id.toString() !== resourceId);
        } else {
            return res.status(400).json({ error: "Invalid action parameters (add/delete) ❌" });
        }

        await subject.save();
        res.json({ message: "Division resources updated successfully! ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update division resources ❌" });
    }
});

// ================= DIVISION TEACHING PLAN =================
router.put("/:id/divisions/:divisionId/teaching-plan", authenticateUser, async (req, res) => {
    const { id, divisionId } = req.params;
    const { teachingPlan } = req.body; // Array of items with week, topic, plannedDate, conductedDate, remarks, status, unitsCovered, hoursCompleted, remainingHours, lessonPlan

    if (!teachingPlan || !Array.isArray(teachingPlan)) {
        return res.status(400).json({ error: "Invalid teaching plan format ❌" });
    }

    try {
        const subject = await Subject.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or access denied ❌" });
        }

        teachingPlan.forEach(item => {
            const index = subject.divisionTeachingPlans.findIndex(tp => tp.division === divisionId && tp.week === item.week);
            if (index !== -1) {
                if (item.topic !== undefined) subject.divisionTeachingPlans[index].topic = item.topic;
                if (item.plannedDate !== undefined) subject.divisionTeachingPlans[index].plannedDate = item.plannedDate;
                if (item.conductedDate !== undefined) subject.divisionTeachingPlans[index].conductedDate = item.conductedDate;
                if (item.remarks !== undefined) subject.divisionTeachingPlans[index].remarks = item.remarks;
                if (item.status !== undefined) subject.divisionTeachingPlans[index].status = item.status;
                if (item.unitsCovered !== undefined) subject.divisionTeachingPlans[index].unitsCovered = item.unitsCovered;
                if (item.hoursCompleted !== undefined) subject.divisionTeachingPlans[index].hoursCompleted = Number(item.hoursCompleted) || 0;
                if (item.remainingHours !== undefined) subject.divisionTeachingPlans[index].remainingHours = Number(item.remainingHours) || 0;
                if (item.lessonPlan !== undefined) subject.divisionTeachingPlans[index].lessonPlan = item.lessonPlan;
            } else {
                subject.divisionTeachingPlans.push({
                    division: divisionId,
                    week: item.week,
                    topic: item.topic || `Week ${item.week} Target`,
                    plannedDate: item.plannedDate || new Date().toISOString().split("T")[0],
                    conductedDate: item.conductedDate || "",
                    remarks: item.remarks || "",
                    status: item.status || "pending",
                    unitsCovered: item.unitsCovered || "",
                    hoursCompleted: Number(item.hoursCompleted) || 0,
                    remainingHours: Number(item.remainingHours) || 0,
                    lessonPlan: item.lessonPlan || ""
                });
            }
        });

        await subject.save();
        res.json({ message: "Division teaching plan saved successfully! ✅", subject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save division teaching plan ❌" });
    }
});

module.exports = router;