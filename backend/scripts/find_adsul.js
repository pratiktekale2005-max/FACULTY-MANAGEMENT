const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
        const cName = col.name;
        const docs = await mongoose.connection.collection(cName).find({}).toArray();
        let matchCount = 0;
        let matches = [];
        docs.forEach(doc => {
            const str = JSON.stringify(doc);
            if (str.includes("Adsul") || str.includes("adsul")) {
                matchCount++;
                matches.push({ id: doc._id, name: doc.name || doc.fullName || doc.title || doc.subjectName });
            }
        });
        if (matchCount > 0) {
            console.log(`Collection "${cName}": ${matchCount} matching documents.`, matches.slice(0, 5));
        }
    }
    await mongoose.disconnect();
}

run();
