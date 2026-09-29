const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");

async function findInLogs() {
    await mongoose.connect(process.env.MONGO_URI);
    const ids = ['6a92acbf94890ae9e44cf0cd', '6a9675a4df8170e0ecfca415', '6ab7776b85b81f2e095193c9'];
    for (const id of ids) {
        const found = await mongoose.connection.db.collection('auditlogs').find({
            $or: [
                { entityId: new mongoose.Types.ObjectId(id) },
                { description: new RegExp(id, 'i') }
            ]
        }).toArray();
        console.log('ID ' + id + ' in auditlogs:', found.length);
        if (found.length) console.log(JSON.stringify(found, null, 2));
    }

    // Also search audit logs for any log that mentions workshop
    const allWorkshopLogs = await mongoose.connection.db.collection('auditlogs').find({
        description: /workshop/i
    }).toArray();
    console.log('All logs with workshop:', allWorkshopLogs.length);
    allWorkshopLogs.forEach(l => console.log(l.description));

    // Check notifications collection
    const notifs = await mongoose.connection.db.collection('notifications').find({}).toArray();
    console.log('Notifications count:', notifs.length);
    notifs.forEach(n => console.log(n.title, '|', n.message, '|', n.userId));

    process.exit(0);
}
findInLogs().catch(e => { console.error(e); process.exit(1); });
