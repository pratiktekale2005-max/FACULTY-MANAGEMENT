const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const tts = await mongoose.connection.collection("timetables").find({}).toArray();
    const matched = tts.filter(t => JSON.stringify(t).includes("Adsul") || JSON.stringify(t).includes("adsul"));
    console.log("Matched timetables:", matched.length);
    matched.forEach(t => console.log(JSON.stringify(t, null, 2)));
    await mongoose.disconnect();
}

run();
