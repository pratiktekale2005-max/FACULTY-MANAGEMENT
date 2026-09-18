const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const User = require('../models/User');

async function updateDepts() {
  await mongoose.connect(process.env.MONGO_URI);
  // Update any department with code AID to AIDS
  const aidDepts = await Department.find({
    $or: [
      { code: 'AID' },
      { code: 'aid' },
      { name: /Artificial Intelligence & Data Science/i },
      { name: 'AIDS' }
    ]
  });

  console.log('Found matching departments to normalize:', aidDepts.length);
  for (const d of aidDepts) {
    d.code = 'AIDS';
    if (!d.name.includes('AIDS') && !d.name.includes('Data Science')) {
      d.name = 'AIDS';
    }
    await d.save();
    console.log('Updated dept:', d._id, d.name, d.code);
  }

  // Update any faculty whose department string is 'AID' to 'AIDS'
  const aidUsers = await User.find({
    department: { $in: ['AID', 'aid', 'Aid'] }
  });
  console.log('Found users with department AID:', aidUsers.length);
  for (const u of aidUsers) {
    u.department = 'AIDS';
    await u.save();
    console.log('Updated user dept:', u.name, u.department);
  }

  const allDepts = await Department.find();
  console.log('Final department list in DB:');
  allDepts.forEach(d => console.log(d.code, '-', d.name));

  await mongoose.disconnect();
}

updateDepts().catch(console.error);
