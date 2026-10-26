const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject");
const { authenticateUser } = require("./authMiddleware");

// GET /api/classes/my-classes
// Returns classes assigned to the logged-in faculty with student counts and unique total
router.get("/my-classes", authenticateUser, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const facultyId = req.user._id;

        // Query subjects assigned to this faculty
        const subjects = await Subject.find({ organizationId, userId: facultyId }).lean();

        if (!subjects || subjects.length === 0) {
            return res.json({
                success: true,
                totalClasses: 0,
                totalUniqueStudents: 0,
                classes: []
            });
        }

        // Group by Class: (Department, Year, Division)
        // Key format: `${department}__${year}__${division}`
        const classMap = new Map();
        const globalUniqueStudents = new Set();

        for (const subj of subjects) {
            const dept = subj.department || req.user.department || "General Engineering";
            const sem = subj.semester || "";
            const academicYear = subj.academicYear || "2026-2027";

            // Infer Year of Study from semester or students or subject code
            let yearOfStudy = "SE";
            if (sem.includes("VII") || sem.includes("VIII") || sem.includes("7") || sem.includes("8") || (subj.subjectCode && subj.subjectCode.includes("-4"))) {
                yearOfStudy = "BE (Final Year)";
            } else if (sem.includes("V") || sem.includes("VI") || sem.includes("5") || sem.includes("6") || (subj.subjectCode && subj.subjectCode.includes("-3"))) {
                yearOfStudy = "TY";
            } else if (sem.includes("III") || sem.includes("IV") || sem.includes("3") || sem.includes("4") || (subj.subjectCode && subj.subjectCode.includes("-2"))) {
                yearOfStudy = "SY";
            } else if (sem.includes("I") || sem.includes("II") || sem.includes("1") || sem.includes("2") || (subj.subjectCode && subj.subjectCode.includes("-1"))) {
                yearOfStudy = "FY";
            }

            // Determine divisions from subject divisionList or student divisions
            const divisions = (subj.divisionList && subj.divisionList.length > 0)
                ? subj.divisionList
                : [...new Set((subj.students || []).map(s => s.division).filter(Boolean))];

            if (divisions.length === 0) {
                divisions.push("A");
            }

            for (const div of divisions) {
                // Filter students enrolled in this division
                const divStudents = (subj.students || []).filter(s => {
                    if (s.division) return s.division.toUpperCase() === div.toUpperCase();
                    return div === "A";
                });

                // Check student year override if any
                const firstStudentYear = divStudents[0]?.year;
                const effectiveYear = firstStudentYear || yearOfStudy;

                const classKey = `${dept}__${effectiveYear}__${div}`;

                if (!classMap.has(classKey)) {
                    classMap.set(classKey, {
                        classId: Buffer.from(classKey).toString("base64url"),
                        department: dept,
                        year: effectiveYear,
                        division: div,
                        className: `${effectiveYear} ${dept.split(" ")[0]} – Division ${div}`,
                        assignedSubjects: [],
                        studentMap: new Map() // rollNo / prn -> student
                    });
                }

                const classItem = classMap.get(classKey);

                // Add subject if not already in list
                if (!classItem.assignedSubjects.some(s => String(s._id) === String(subj._id))) {
                    classItem.assignedSubjects.push({
                        _id: subj._id,
                        subjectName: subj.subjectName,
                        subjectCode: subj.subjectCode,
                        academicYear: subj.academicYear,
                        semester: subj.semester
                    });
                }

                // Add students into class-level studentMap to deduplicate students in same class
                for (const st of divStudents) {
                    const studentKey = (st.prnNumber && st.prnNumber.trim()) 
                        ? st.prnNumber.trim().toUpperCase() 
                        : (st.rollNo || "").trim().toUpperCase();

                    if (studentKey) {
                        globalUniqueStudents.add(studentKey);
                        if (!classItem.studentMap.has(studentKey)) {
                            classItem.studentMap.set(studentKey, {
                                _id: st._id,
                                rollNo: st.rollNo,
                                prnNumber: st.prnNumber || "",
                                name: st.name,
                                email: st.email || "",
                                mobileNumber: st.mobileNumber || "",
                                address: st.address || "",
                                department: st.department || dept,
                                year: st.year || effectiveYear,
                                division: st.division || div,
                                gender: st.gender || "Male",
                                skills: st.skills || "",
                                subjectId: subj._id,
                                subjectName: subj.subjectName
                            });
                        }
                    }
                }
            }
        }

        // Format final classes array
        const classes = Array.from(classMap.values()).map(c => {
            const studentsList = Array.from(c.studentMap.values()).sort((a, b) => 
                (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true })
            );

            return {
                classId: c.classId,
                department: c.department,
                year: c.year,
                division: c.division,
                className: c.className,
                assignedSubjects: c.assignedSubjects,
                studentsCount: studentsList.length,
                students: studentsList
            };
        });

        res.json({
            success: true,
            totalClasses: classes.length,
            totalUniqueStudents: globalUniqueStudents.size,
            classes
        });
    } catch (err) {
        console.error("My Classes fetch error:", err);
        res.status(500).json({ error: "Failed to fetch assigned classes ❌" });
    }
});

module.exports = router;
