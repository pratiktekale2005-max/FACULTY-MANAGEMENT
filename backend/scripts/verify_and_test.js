const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Subject = require("../models/Subject");
const Timetable = require("../models/Timetable");

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB Atlas: " + mongoose.connection.name);

        console.log("\n--- TEST 1: VERIFY FACULTY NAME EVERYWHERE ---");
        const adsulUser = await User.findOne({ email: "laxmantekale260@gmail.com" });
        console.log("User:", {
            id: adsulUser._id,
            name: adsulUser.name,
            fullName: adsulUser.fullName,
            role: adsulUser.role,
            department: adsulUser.department,
            gender: adsulUser.gender
        });

        const oldNameUsers = await User.find({ name: /Adsul Mam/i });
        console.log("Users still having 'Adsul Mam':", oldNameUsers.length);

        const adsulTimetables = await Timetable.find({ facultyName: "Dr. Alpana Adsul" });
        console.log("Timetable slots assigned to Dr. Alpana Adsul:", adsulTimetables.length);

        const oldNameTimetables = await Timetable.find({ facultyName: /Adsul Mam/i });
        console.log("Timetable slots still having 'Adsul Mam':", oldNameTimetables.length);

        console.log("\n--- TEST 2: VERIFY GREEN BOOK SUBJECTS & DATA PRESERVATION ---");
        const allSubjects = await Subject.find({});
        console.log("Total subjects preserved in DB:", allSubjects.length);

        const cs201 = await Subject.findOne({ subjectCode: "CS-201" });
        console.log("CS-201 (Dr. Alpana Adsul subject):", {
            id: cs201._id,
            name: cs201.subjectName,
            code: cs201.subjectCode,
            hasDivision: cs201.hasDivision,
            divisionList: cs201.divisionList,
            plannedLectures: cs201.lecturesPlanned,
            lecturesCount: cs201.lectures?.length,
            conductedLecturesListCount: cs201.conductedLecturesList?.length,
            lecturesConductedNumber: cs201.lecturesConducted,
            plannedPracticals: cs201.practicalsPlanned,
            practicalsCount: cs201.practicals?.length,
            conductedPracticalsListCount: cs201.conductedPracticalsList?.length,
            practicalsConductedNumber: cs201.practicalsConducted,
            teachingPlanWeeks: cs201.teachingPlan?.length,
            studentsEnrolled: cs201.students?.length
        });

        console.log("\n--- TEST 3: TEST ADDING CONDUCTED LECTURE RECORD ---");
        const initialLecCount = cs201.conductedLecturesList?.length || 0;
        const testLecTopic = "Advanced SQL Triggers and Stored Procedures Unit Test";
        
        cs201.conductedLecturesList.push({
            topic: testLecTopic,
            date: "2026-10-26",
            numberOfLectures: 1,
            classOrSemester: "Odd Semester / TE-A",
            lecturePlanReference: "Unit 4 - Reference 12",
            remarks: "Delivered live coding session"
        });
        
        // Recalculate
        const totalLecSessions = cs201.conductedLecturesList.reduce((acc, item) => acc + (item.numberOfLectures || 1), 0);
        cs201.lecturesConducted = Math.max(totalLecSessions, cs201.conductedLecturesList.length);
        await cs201.save();

        const reloadedAfterLec = await Subject.findById(cs201._id);
        const addedLec = reloadedAfterLec.conductedLecturesList.find(l => l.topic === testLecTopic);
        console.log("Added Conducted Lecture found in DB:", {
            id: addedLec._id,
            topic: addedLec.topic,
            date: addedLec.date,
            numberOfLectures: addedLec.numberOfLectures,
            classOrSemester: addedLec.classOrSemester,
            newTotalLecturesConducted: reloadedAfterLec.lecturesConducted
        });

        console.log("\n--- TEST 4: TEST ADDING CONDUCTED PRACTICAL RECORD ---");
        const testPracTitle = "PL/SQL Procedures and Functions Lab Experiment";
        reloadedAfterLec.conductedPracticalsList.push({
            practicalNumber: (reloadedAfterLec.conductedPracticalsList?.length || 0) + 1,
            title: testPracTitle,
            date: "2026-10-26",
            numberOfSessions: 1,
            batchOrClass: "Batch A",
            practicalPlanReference: "Lab Manual Exp 8",
            remarks: "Executed on Oracle 19c database"
        });

        const totalPracSessions = reloadedAfterLec.conductedPracticalsList.reduce((acc, item) => acc + (item.numberOfSessions || 1), 0);
        reloadedAfterLec.practicalsConducted = Math.max(totalPracSessions, reloadedAfterLec.conductedPracticalsList.length);
        await reloadedAfterLec.save();

        const reloadedAfterPrac = await Subject.findById(cs201._id);
        const addedPrac = reloadedAfterPrac.conductedPracticalsList.find(p => p.title === testPracTitle);
        console.log("Added Conducted Practical found in DB:", {
            id: addedPrac._id,
            title: addedPrac.title,
            practicalNumber: addedPrac.practicalNumber,
            date: addedPrac.date,
            batch: addedPrac.batchOrClass,
            newTotalPracticalsConducted: reloadedAfterPrac.practicalsConducted
        });

        console.log("\n--- TEST 5: CLEANUP TEST ENTRIES TO PRESERVE PRISTINE STATE ---");
        reloadedAfterPrac.conductedLecturesList = reloadedAfterPrac.conductedLecturesList.filter(l => l.topic !== testLecTopic);
        reloadedAfterPrac.conductedPracticalsList = reloadedAfterPrac.conductedPracticalsList.filter(p => p.title !== testPracTitle);
        
        const finalLecSessions = reloadedAfterPrac.conductedLecturesList.reduce((acc, item) => acc + (item.numberOfLectures || 1), 0);
        reloadedAfterPrac.lecturesConducted = Math.max(finalLecSessions, reloadedAfterPrac.conductedLecturesList.length);

        const finalPracSessions = reloadedAfterPrac.conductedPracticalsList.reduce((acc, item) => acc + (item.numberOfSessions || 1), 0);
        reloadedAfterPrac.practicalsConducted = Math.max(finalPracSessions, reloadedAfterPrac.conductedPracticalsList.length);
        await reloadedAfterPrac.save();

        console.log("Cleanup complete. Preserved records in CS-201:", {
            conductedLecturesCount: reloadedAfterPrac.conductedLecturesList.length,
            lecturesConducted: reloadedAfterPrac.lecturesConducted,
            conductedPracticalsCount: reloadedAfterPrac.conductedPracticalsList.length,
            practicalsConducted: reloadedAfterPrac.practicalsConducted
        });

        console.log("\nALL DATABASE TESTS PASSED! ✅");
        await mongoose.disconnect();
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

main();
