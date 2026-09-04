const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm";

async function run() {
    console.log("Connecting to MongoDB:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected! Checking indexes...");

    const db = mongoose.connection.db;

    try {
        console.log("Dropping index departments.code_1...");
        await db.collection("departments").dropIndex("code_1");
        console.log("Dropped departments.code_1 successfully!");
    } catch (e) {
        console.log("Note: departments.code_1 index not found or already dropped.");
    }

    try {
        console.log("Dropping index users.employeeId_1...");
        await db.collection("users").dropIndex("employeeId_1");
        console.log("Dropped users.employeeId_1 successfully!");
    } catch (e) {
        console.log("Note: users.employeeId_1 index not found or already dropped.");
    }

    try {
        console.log("Dropping index performancecriterias.category_1...");
        await db.collection("performancecriterias").dropIndex("category_1");
        console.log("Dropped performancecriterias.category_1 successfully!");
    } catch (e) {
        console.log("Note: performancecriterias.category_1 index not found or already dropped.");
    }

    try {
        console.log("Clearing performancecriterias collection to heal duplicate categories...");
        await db.collection("performancecriterias").deleteMany({});
        console.log("Performancecriterias collection cleared successfully!");
    } catch (e) {
        console.error("Failed to clear performancecriterias:", e);
    }

    console.log("Database index cleanup complete! Closing connection.");
    await mongoose.disconnect();
}

run().catch(console.error);
