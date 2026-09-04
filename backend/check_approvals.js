const mongoose = require("mongoose");
const User = require("./models/User");
const Department = require("./models/Department");
const Approval = require("./models/Approval");

async function check() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/crm");
        const apps = await Approval.find().populate("submittedBy", "name email").populate("departmentId", "name code");
        console.log("=== APPROVALS IN DB ===");
        console.table(apps.map(a => ({
            id: a._id.toString(),
            entityType: a.entityType,
            entityId: a.entityId ? a.entityId.toString() : "none",
            submittedBy: a.submittedBy ? a.submittedBy.name : "none",
            department: a.departmentId ? a.departmentId.code : "none",
            status: a.status,
            currentLevel: a.currentLevel
        })));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

check();
