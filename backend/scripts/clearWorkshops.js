const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const Workshop = require("../models/Workshop");

async function clearWorkshops() {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm";
        console.log("Connecting to:", uri);
        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        const countBefore = await Workshop.countDocuments({});
        console.log(`Current workshops count in DB: ${countBefore}`);

        const result = await Workshop.deleteMany({});
        console.log(`Deleted workshops: ${result.deletedCount}`);

        const countAfter = await Workshop.countDocuments({});
        console.log(`Workshops count after deletion: ${countAfter}`);

        await mongoose.disconnect();
        console.log("Completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error clearing workshops:", err);
        process.exit(1);
    }
}

clearWorkshops();
