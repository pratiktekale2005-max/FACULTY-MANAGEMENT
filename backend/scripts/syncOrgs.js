const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB Atlas");

        const targetOrgId = new mongoose.Types.ObjectId('6a7df01c3d1dfb4bb99e05e1');
        const adminDeptId = new mongoose.Types.ObjectId('6a7df01c3d1dfb4bb99e05e4');

        const updateResult = await mongoose.connection.collection('users').updateOne(
            { email: 'pratiklaxmantekale@gmail.com' },
            { 
                $set: { 
                    organizationId: targetOrgId,
                    departmentId: adminDeptId,
                    department: 'Administration'
                } 
            }
        );
        console.log("Updated pratiklaxmantekale user:", updateResult);

        // Also ensure all workshops have organizationId set to targetOrgId
        const workshopUpdate = await mongoose.connection.collection('workshops').updateMany(
            {},
            { $set: { organizationId: targetOrgId } }
        );
        console.log("Updated workshops orgId:", workshopUpdate.modifiedCount);

        // List all users in targetOrgId
        const usersInOrg = await mongoose.connection.collection('users').find(
            { organizationId: targetOrgId },
            { projection: { name: 1, email: 1, role: 1, department: 1 } }
        ).toArray();

        console.log(`\nTotal Users in DYPCOEI (${targetOrgId}):`, usersInOrg.length);
        usersInOrg.forEach((u, idx) => {
            console.log(`  ${idx + 1}. [${u.role}] ${u.name} (${u.email}) - ${u.department}`);
        });

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
