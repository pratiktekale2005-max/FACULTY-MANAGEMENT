const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require("mongoose");
const AssignmentMarks = require("../models/AssignmentMarks");
const Subject = require("../models/Subject");

function scaleTo10(val) {
    if (val === null || val === undefined || val === "") return null;
    const num = Number(val);
    if (isNaN(num)) return null;
    if (num > 10) {
        // Scaled from 25 to 10
        return Math.min(10, Math.round((num / 25) * 10 * 10) / 10);
    }
    return num;
}

async function run() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected ✅");

    // 1. Update AssignmentMarks collection
    const allMarks = await AssignmentMarks.find({});
    console.log(`Checking ${allMarks.length} records in AssignmentMarks...`);
    let updatedMarksCount = 0;

    for (const doc of allMarks) {
        let changed = false;
        ['assignment1', 'assignment2', 'assignment3', 'assignment4', 'assignment5'].forEach(key => {
            if (doc[key] !== null && doc[key] !== undefined && doc[key] > 10) {
                doc[key] = scaleTo10(doc[key]);
                changed = true;
            }
        });
        if (doc.maxMarks !== 10) {
            doc.maxMarks = 10;
            changed = true;
        }
        if (changed) {
            // Recompute total
            const vals = [doc.assignment1, doc.assignment2, doc.assignment3, doc.assignment4, doc.assignment5]
                .filter(v => v !== null && v !== undefined);
            doc.total = vals.reduce((a, b) => a + Number(b), 0);
            await doc.save();
            updatedMarksCount++;
        }
    }
    console.log(`Updated ${updatedMarksCount} AssignmentMarks records to scale /10.`);

    // 2. Update embedded marks in Subject.students
    const subjects = await Subject.find({});
    let updatedSubjCount = 0;

    for (const subj of subjects) {
        let subjChanged = false;
        (subj.students || []).forEach(st => {
            if (st.assignmentMarks) {
                ['a1', 'a2', 'a3', 'a4', 'a5'].forEach(k => {
                    if (st.assignmentMarks[k] !== null && st.assignmentMarks[k] !== undefined && st.assignmentMarks[k] > 10) {
                        st.assignmentMarks[k] = scaleTo10(st.assignmentMarks[k]);
                        subjChanged = true;
                    }
                });
            }
        });
        if (subjChanged) {
            await subj.save();
            updatedSubjCount++;
        }
    }
    console.log(`Updated embedded marks in ${updatedSubjCount} subjects.`);
    console.log("Migration finished successfully! ✅");
    process.exit(0);
}

run().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
