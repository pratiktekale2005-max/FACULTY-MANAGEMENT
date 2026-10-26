const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await mongoose.connection.collection("users").find({}).toArray();
        console.log("=== USERS COUNT:", users.length);
        users.forEach(u => {
            console.log(JSON.stringify({ id: u._id, name: u.name, fullName: u.fullName, email: u.email, role: u.role, dept: u.department, deptId: u.departmentId, designation: u.designation }));
        });

        const subjects = await mongoose.connection.collection("subjects").find({}).toArray();
        console.log("=== SUBJECTS COUNT:", subjects.length);
        subjects.forEach(s => {
            console.log(JSON.stringify({
                id: s._id,
                subjectName: s.subjectName,
                subjectCode: s.subjectCode,
                userId: s.userId,
                dept: s.department,
                lecturesPlanned: s.lecturesPlanned,
                lecturesConducted: s.lecturesConducted,
                practicalsPlanned: s.practicalsPlanned,
                practicalsConducted: s.practicalsConducted,
                lecturesCount: (s.lectures || []).length,
                practicalsCount: (s.practicals || []).length,
                teachingPlanCount: (s.teachingPlan || []).length,
                divisionTeachingPlansCount: (s.divisionTeachingPlans || []).length,
                studentsCount: (s.students || []).length
            }));
        });

        // Check if there are any other collections related to Green Book or Timetable
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("=== COLLECTIONS:", collections.map(c => c.name));

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
