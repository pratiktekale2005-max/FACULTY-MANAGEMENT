const mongoose = require("mongoose");

// Load Mongoose models
const User = require("./models/User");
const Paper = require("./models/Paper");
const Workshop = require("./models/Workshop");

const MONGO_URI = "mongodb://127.0.0.1:27017/crm";

async function run() {
    try {
        console.log(`Connecting to database: ${MONGO_URI}... 🔌`);
        await mongoose.connect(MONGO_URI);
        console.log("Connected successfully! Checking documents:\n");

        // 1. Fetch Users
        const users = await User.find({}, { name: 1, email: 1, role: 1, performanceScore: 1 });
        console.log("=== 👥 USERS ===");
        if (users.length === 0) {
            console.log("No users found.");
        } else {
            console.table(users.map(u => ({
                id: u._id.toString(),
                name: u.name,
                email: u.email,
                role: u.role,
                performanceScore: `${u.performanceScore}%`
            })));
        }
        console.log("\n");

        // 2. Fetch Papers
        const papers = await Paper.find().populate("submittedBy", "name");
        console.log("=== 📝 RESEARCH PAPERS ===");
        if (papers.length === 0) {
            console.log("No research papers logged.");
        } else {
            console.table(papers.map(p => ({
                id: p._id.toString(),
                title: p.title,
                journal: p.journal,
                date: p.date,
                submittedBy: p.submittedBy?.name || "Unknown"
            })));
        }
        console.log("\n");

        // 3. Fetch Workshops
        const workshops = await Workshop.find().populate("submittedBy", "name");
        console.log("=== 🎤 WORKSHOPS ===");
        if (workshops.length === 0) {
            console.log("No workshops logged.");
        } else {
            console.table(workshops.map(w => ({
                id: w._id.toString(),
                title: w.title,
                type: w.workshopType,
                date: w.date,
                status: w.status,
                submittedBy: w.submittedBy?.name || "Unknown"
            })));
        }

    } catch (err) {
        console.error("Database check failed:", err);
    } finally {
        await mongoose.connection.close();
        console.log("\nDisconnected from database.");
        process.exit(0);
    }
}

run();
