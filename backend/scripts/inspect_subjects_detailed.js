const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const subjects = await mongoose.connection.collection("subjects").find({}).toArray();
    console.log("Total subjects:", subjects.length);
    subjects.forEach((s, idx) => {
        console.log(`\n--- [${idx + 1}] ${s.subjectName} (${s.subjectCode}) ---`);
        console.log(`User: ${s.userId} | Dept: ${s.department} | Sem: ${s.semester} | Year: ${s.academicYear}`);
        console.log(`LecturesPlanned: ${s.lecturesPlanned} | LecturesConducted: ${s.lecturesConducted}`);
        console.log(`PracticalsPlanned: ${s.practicalsPlanned} | PracticalsConducted: ${s.practicalsConducted}`);
        console.log(`Lectures array length: ${(s.lectures || []).length}`);
        if ((s.lectures || []).length > 0) {
            console.log(`Sample lecture:`, JSON.stringify(s.lectures[0]));
            const completedLecs = s.lectures.filter(l => l.lectureDeliveryStatus === "COMPLETED" || l.status === "completed");
            console.log(`Completed lectures: ${completedLecs.length}`);
            if (completedLecs.length > 0) {
                console.log(`Completed sample:`, JSON.stringify(completedLecs[0]));
            }
        }
        console.log(`Practicals array length: ${(s.practicals || []).length}`);
        if ((s.practicals || []).length > 0) {
            console.log(`Sample practical:`, JSON.stringify(s.practicals[0]));
            const completedPracs = s.practicals.filter(p => p.status === "completed");
            console.log(`Completed practicals: ${completedPracs.length}`);
            if (completedPracs.length > 0) {
                console.log(`Completed practical sample:`, JSON.stringify(completedPracs[0]));
            }
        }
        console.log(`TeachingPlan array length: ${(s.teachingPlan || []).length}`);
        console.log(`HasDivision: ${s.hasDivision} | Divisions: ${s.numberOfDivisions}`);
    });
    await mongoose.disconnect();
}

run();
