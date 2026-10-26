const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const targetUserId = new mongoose.Types.ObjectId("6a90425c71206d38ae6325ec");

        // 1. Update user document
        const userRes = await mongoose.connection.collection("users").updateOne(
            { _id: targetUserId },
            { 
                $set: { 
                    name: "Dr. Alpana Adsul",
                    fullName: "Dr. Alpana Adsul",
                    gender: "Female"
                } 
            }
        );
        console.log("User updated:", userRes.modifiedCount);

        // Also check if any user has name "Adsul Mam"
        const anyUser = await mongoose.connection.collection("users").updateMany(
            { name: "Adsul Mam" },
            { $set: { name: "Dr. Alpana Adsul", fullName: "Dr. Alpana Adsul" } }
        );
        console.log("Other users with name 'Adsul Mam' updated:", anyUser.modifiedCount);

        // 2. Update Timetables
        const ttRes = await mongoose.connection.collection("timetables").updateMany(
            { $or: [{ facultyId: targetUserId }, { facultyName: "Adsul Mam" }] },
            { $set: { facultyName: "Dr. Alpana Adsul" } }
        );
        console.log("Timetables updated:", ttRes.modifiedCount);

        // 3. Update Tasks
        const taskRes = await mongoose.connection.collection("tasks").updateMany(
            { $or: [{ assignedTo: targetUserId }, { assignedToName: "Adsul Mam" }] },
            { $set: { assignedToName: "Dr. Alpana Adsul" } }
        );
        console.log("Tasks updated:", taskRes.modifiedCount);

        // 4. Update Workshops
        const wsRes = await mongoose.connection.collection("workshops").updateMany(
            { $or: [{ approvedByName: "Adsul Mam" }, { approvedByName: "Dr. Adsul Mam" }] },
            { $set: { approvedByName: "Dr. Alpana Adsul" } }
        );
        console.log("Workshops updated:", wsRes.modifiedCount);

        // 5. Update Approvals
        const appRes = await mongoose.connection.collection("approvals").updateMany(
            { $or: [{ "submittedBy.name": "Adsul Mam" }, { "submittedBy.name": "Dr. Adsul Mam" }] },
            { $set: { "submittedBy.name": "Dr. Alpana Adsul" } }
        );
        console.log("Approvals updated:", appRes.modifiedCount);

        console.log("Database update for Dr. Alpana Adsul completed successfully! ✅");
        await mongoose.disconnect();
    } catch (err) {
        console.error("Error updating faculty name:", err);
    }
}

run();
