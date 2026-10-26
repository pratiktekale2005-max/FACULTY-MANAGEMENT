const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const subjects = await mongoose.connection.collection("subjects").find({}).toArray();
        console.log(`Processing ${subjects.length} subjects...`);

        let updatedCount = 0;

        for (const s of subjects) {
            let needsUpdate = false;
            let conductedLectures = s.conductedLecturesList || [];
            let conductedPracticals = s.conductedPracticalsList || [];

            // If conductedLecturesList is empty, seed from completed planned lectures if any
            if (conductedLectures.length === 0 && (s.lectures || []).length > 0) {
                const completedLecs = s.lectures.filter(l => l.lectureDeliveryStatus === "COMPLETED" || l.status === "completed");
                if (completedLecs.length > 0) {
                    completedLecs.forEach((l, idx) => {
                        conductedLectures.push({
                            _id: new mongoose.Types.ObjectId(),
                            topic: l.conductedTopic || l.topic || `Lecture ${idx + 1}`,
                            date: l.conductedDate || l.plannedDate || new Date().toISOString().split("T")[0],
                            numberOfLectures: 1,
                            classOrSemester: s.semester || "",
                            lecturePlanReference: `Planned Lecture: ${l.topic}`,
                            remarks: l.conductedTopic ? "Conducted syllabus topic" : "Delivered",
                            conductedBy: s.userId,
                            conductedByName: "Faculty Member",
                            createdAt: new Date()
                        });
                    });
                    needsUpdate = true;
                }
            }

            // If conductedPracticalsList is empty, seed from completed planned practicals if any
            if (conductedPracticals.length === 0 && (s.practicals || []).length > 0) {
                const completedPracs = s.practicals.filter(p => p.status === "completed");
                if (completedPracs.length > 0) {
                    completedPracs.forEach((p, idx) => {
                        conductedPracticals.push({
                            _id: new mongoose.Types.ObjectId(),
                            practicalNumber: `Exp ${idx + 1}`,
                            title: p.conductedTopic || `${p.batch} Lab Session`,
                            date: p.conductedDate || p.plannedDate || new Date().toISOString().split("T")[0],
                            numberOfSessions: 1,
                            batchOrClass: p.batch || "",
                            practicalPlanReference: `Batch ${p.batch}`,
                            remarks: "Conducted lab session",
                            conductedBy: s.userId,
                            conductedByName: "Faculty Member",
                            createdAt: new Date()
                        });
                    });
                    needsUpdate = true;
                }
            }

            // Calculate actual total conducted counts
            const totalLecturesConducted = Math.max(
                conductedLectures.reduce((sum, cl) => sum + (Number(cl.numberOfLectures) || 1), 0),
                (s.lectures || []).filter(l => l.lectureDeliveryStatus === "COMPLETED" || l.status === "completed").length
            );

            const totalPracticalsConducted = Math.max(
                conductedPracticals.reduce((sum, cp) => sum + (Number(cp.numberOfSessions) || 1), 0),
                (s.practicals || []).filter(p => p.status === "completed").length
            );

            if (s.lecturesConducted !== totalLecturesConducted || s.practicalsConducted !== totalPracticalsConducted || needsUpdate) {
                await mongoose.connection.collection("subjects").updateOne(
                    { _id: s._id },
                    {
                        $set: {
                            conductedLecturesList: conductedLectures,
                            conductedPracticalsList: conductedPracticals,
                            lecturesConducted: totalLecturesConducted,
                            practicalsConducted: totalPracticalsConducted
                        }
                    }
                );
                updatedCount++;
                console.log(`Updated subject "${s.subjectName}": ${totalLecturesConducted} lectures conducted, ${totalPracticalsConducted} practicals conducted.`);
            }
        }

        console.log(`Synchronization complete! ${updatedCount} subjects updated.`);
        await mongoose.disconnect();
    } catch (err) {
        console.error("Sync error:", err);
    }
}

run();
