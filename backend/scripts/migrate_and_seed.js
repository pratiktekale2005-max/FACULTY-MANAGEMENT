const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require("mongoose");
const Subject = require("../models/Subject");
const User = require("../models/User");
const Timetable = require("../models/Timetable");
const AttendanceRecord = require("../models/AttendanceRecord");
const AssignmentMarks = require("../models/AssignmentMarks");

const sampleAddresses = [
    "Sector 29, Nigdi Pradhikaran, Akurdi, Pune - 411044",
    "Plot 14, Shubham Heights, Kothrud, Pune - 411038",
    "Dutta Mandir Road, Wakad, Pune - 411057",
    "A-402, Rohan Tarang, Baner, Pune - 411045",
    "Near DY Patil Campus, Akurdi, Pune - 411044",
    "Pimple Saudagar, PCMC, Pune - 411027",
    "Ravet, Near Kiwale Bridge, Pune - 412101",
    "Thergaon, Chinchwad, Pune - 411033",
    "Pashan Link Road, Pune - 411008",
    "Hinjawadi Phase 1, Megapolis Circle, Pune - 411057"
];

function inferYearFromSubject(subject) {
    const code = (subject.subjectCode || "").toUpperCase();
    const sem = (subject.semester || "").toUpperCase();
    if (code.includes("-4") || sem.includes("VII") || sem.includes("VIII") || sem.includes("7") || sem.includes("8")) {
        return "BE (Final Year)";
    }
    if (code.includes("-3") || sem.includes("V") || sem.includes("VI") || sem.includes("5") || sem.includes("6")) {
        return "TE (TY)";
    }
    return "SE (SY)";
}

async function runMigration() {
    console.log("Connecting to MongoDB for Migration & Seed...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected ✅");

    // 1. Update all Subject students with email, address, department, year, division
    const subjects = await Subject.find({});
    console.log(`Processing ${subjects.length} subjects for student schema enrichment...`);

    for (const subj of subjects) {
        let changed = false;
        const inferredYear = inferYearFromSubject(subj);
        const deptName = subj.department || "Engineering";

        subj.students.forEach((st, idx) => {
            if (!st.department) {
                st.department = deptName;
                changed = true;
            }
            if (!st.year) {
                st.year = inferredYear;
                changed = true;
            }
            if (!st.division) {
                st.division = (st.rollNo && st.rollNo.toUpperCase().startsWith("B")) ? "B" : "A";
                changed = true;
            }
            if (!st.email) {
                const cleanName = (st.name || `student${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, "");
                const cleanRoll = (st.rollNo || `${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, "");
                st.email = `${cleanRoll}.${cleanName}@dypcoei.edu.in`;
                changed = true;
            }
            if (!st.address) {
                st.address = sampleAddresses[idx % sampleAddresses.length];
                changed = true;
            }
            if (!st.prnNumber) {
                const cleanRoll = (st.rollNo || `${idx + 1}`).replace(/\D/g, "") || `${idx + 101}`;
                st.prnNumber = `PRN2026${cleanRoll.padStart(4, "0")}`;
                changed = true;
            }
            if (!st.mobileNumber) {
                st.mobileNumber = `9822${String(100000 + idx).slice(0, 6)}`;
                changed = true;
            }
            if (!st.gender) {
                st.gender = idx % 3 === 1 ? "Female" : "Male";
                changed = true;
            }
        });

        if (changed) {
            await subj.save();
            console.log(`Updated subject students: ${subj.subjectName} (${subj.students.length} students)`);
        }
    }

    // 2. Seed Timetable schedules for faculty
    console.log("Seeding weekly timetable schedules...");
    const faculties = await User.find({ role: { $in: ["Faculty", "HOD"] } });

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timeSlots = [
        { start: "09:00 AM", end: "10:00 AM" },
        { start: "10:00 AM", end: "11:00 AM" },
        { start: "11:15 AM", end: "12:15 PM" },
        { start: "01:00 PM", end: "02:00 PM" },
        { start: "02:00 PM", end: "03:00 PM" },
        { start: "03:15 PM", end: "04:15 PM" }
    ];

    for (const fac of faculties) {
        const facSubjects = await Subject.find({ userId: fac._id });
        if (facSubjects.length === 0) continue;

        // Check if faculty already has timetable entries
        const existingCount = await Timetable.countDocuments({ facultyId: fac._id });
        if (existingCount > 0) {
            console.log(`Timetable already exists for ${fac.name} (${existingCount} slots). Skipping.`);
            continue;
        }

        console.log(`Creating weekly timetable for ${fac.name} (${facSubjects.length} subjects)...`);
        let slotIdx = 0;

        for (const subj of facSubjects) {
            const divs = (subj.divisionList && subj.divisionList.length) ? subj.divisionList : ["A"];
            const yearStr = inferYearFromSubject(subj);

            for (const div of divs) {
                // Schedule 3 theory lectures, 1 practical, 1 tutorial across the week
                const schedulePlan = [
                    { day: days[slotIdx % 5], slot: timeSlots[0], type: "Theory", room: "LH-301" },
                    { day: days[(slotIdx + 1) % 5], slot: timeSlots[1], type: "Theory", room: "LH-301" },
                    { day: days[(slotIdx + 2) % 5], slot: timeSlots[2], type: "Practical", room: `${subj.department.split(" ")[0]} Lab 2` },
                    { day: days[(slotIdx + 3) % 5], slot: timeSlots[3], type: "Theory", room: "LH-302" },
                    { day: days[(slotIdx + 4) % 5], slot: timeSlots[4], type: "Tutorial", room: "Tutorial Room 104" }
                ];

                for (const item of schedulePlan) {
                    await Timetable.create({
                        organizationId: fac.organizationId,
                        facultyId: fac._id,
                        facultyName: fac.name,
                        dayOfWeek: item.day,
                        startTime: item.slot.start,
                        endTime: item.slot.end,
                        department: subj.department,
                        year: yearStr,
                        division: div,
                        subjectName: subj.subjectName,
                        subjectCode: subj.subjectCode,
                        subjectId: subj._id,
                        roomOrLab: item.room,
                        lectureType: item.type,
                        academicYear: subj.academicYear || "2026-2027"
                    });
                }
                slotIdx++;
            }
        }
    }

    // 3. Seed Assignment Marks (Exactly 5 assignments) for each subject's students
    console.log("Seeding Assignment Marks (5 assignments per student)...");
    for (const subj of subjects) {
        if (!subj.students || subj.students.length === 0) continue;
        const yearStr = inferYearFromSubject(subj);

        for (const st of subj.students) {
            const div = st.division || "A";
            const existing = await AssignmentMarks.findOne({
                organizationId: subj.organizationId,
                subjectId: subj._id,
                studentId: st._id
            });

            if (!existing) {
                // Generate realistic marks out of max 25:
                // Assignment 1: 18-24
                // Assignment 2: 17-25
                // Assignment 3: 19-24
                // Assignment 4: entered for some, null for others (so user can test pending assignments)
                // Assignment 5: null (pending)
                const rollNum = parseInt((st.rollNo || "").replace(/\D/g, "")) || 1;
                const a1 = 18 + (rollNum % 7);
                const a2 = 17 + ((rollNum + 2) % 8);
                const a3 = 19 + ((rollNum + 4) % 6);
                const a4 = rollNum % 2 === 0 ? 20 + (rollNum % 5) : null; // alternate filled/empty
                const a5 = null; // empty to test pending
                const total = (a1 || 0) + (a2 || 0) + (a3 || 0) + (a4 || 0) + (a5 || 0);

                await AssignmentMarks.create({
                    organizationId: subj.organizationId,
                    facultyId: subj.userId,
                    subjectId: subj._id,
                    studentId: st._id,
                    rollNo: st.rollNo,
                    studentName: st.name,
                    department: subj.department,
                    year: yearStr,
                    division: div,
                    academicYear: subj.academicYear || "2026-2027",
                    maxMarks: 25,
                    assignment1: a1,
                    assignment2: a2,
                    assignment3: a3,
                    assignment4: a4,
                    assignment5: a5,
                    total: total
                });

                // Also update on student embedded object
                st.assignmentMarks = {
                    a1, a2, a3, a4, a5, total
                };
            }
        }
        await subj.save();
    }

    // 4. Seed Attendance Records for subjects with students
    console.log("Seeding Attendance Records for past dates...");
    const recentDates = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"];

    for (const subj of subjects) {
        if (!subj.students || subj.students.length === 0) continue;
        const divs = [...new Set(subj.students.map(s => s.division).filter(Boolean))];
        const yearStr = inferYearFromSubject(subj);

        for (const div of divs) {
            const divStudents = subj.students.filter(s => s.division === div);

            for (const d of recentDates) {
                const existing = await AttendanceRecord.findOne({
                    organizationId: subj.organizationId,
                    subjectId: subj._id,
                    division: div,
                    date: d
                });

                if (!existing) {
                    const entries = divStudents.map((s, idx) => {
                        let status = "PRESENT";
                        if (idx % 11 === 0) status = "ABSENT";
                        else if (idx % 17 === 0) status = "ON_LEAVE";
                        return {
                            studentId: s._id,
                            rollNo: s.rollNo,
                            prnNumber: s.prnNumber || "",
                            name: s.name,
                            status
                        };
                    });

                    const presentCount = entries.filter(e => e.status === "PRESENT").length;
                    const absentCount = entries.filter(e => e.status === "ABSENT").length;
                    const leaveCount = entries.filter(e => e.status === "ON_LEAVE").length;

                    await AttendanceRecord.create({
                        organizationId: subj.organizationId,
                        facultyId: subj.userId,
                        subjectId: subj._id,
                        department: subj.department,
                        year: yearStr,
                        division: div,
                        date: d,
                        entries,
                        totalStudents: entries.length,
                        presentCount,
                        absentCount,
                        leaveCount
                    });
                }
            }
        }
    }

    console.log("All migrations and seeding completed successfully! 🎉");
    process.exit(0);
}

runMigration().catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
});
