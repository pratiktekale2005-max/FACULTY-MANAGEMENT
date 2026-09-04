const mongoose = require("mongoose");
const User = require("./models/User");
const Department = require("./models/Department");

async function check() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/crm");
        
        console.log("=== DEPARTMENTS ===");
        const depts = await Department.find();
        console.table(depts.map(d => ({
            id: d._id.toString(),
            name: d.name,
            code: d.code
        })));

        console.log("=== USERS ===");
        const users = await User.find();
        console.table(users.map(u => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            department: u.department,
            departmentId: u.departmentId ? u.departmentId.toString() : "null"
        })));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

check();
