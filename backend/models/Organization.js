const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: String, required: true }
});

const brandingSchema = new mongoose.Schema({
    primaryColor: { type: String, default: "#4F46E5" },
    secondaryColor: { type: String, default: "#06B6D4" },
    favicon: { type: String, default: "" },
    motto: { type: String, default: "" },
    footer: { type: String, default: "" }
});

const settingsSchema = new mongoose.Schema({
    restrictDomain: { type: Boolean, default: false },
    allowedDomain: { type: String, default: "" },
    branding: { type: brandingSchema, default: () => ({}) },
    academicYear: { type: String, default: "2026-2027" },
    semesterSystem: { type: String, default: "Semester" },
    collegeTiming: { type: String, default: "09:00 AM - 05:00 PM" },
    academicCalendar: { type: String, default: "" },
    workingDays: { type: Number, default: 5 },
    instituteHolidays: [holidaySchema],
    maxLeave: { type: Number, default: 12 }
});

const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    website: { type: String, default: "" },
    logo: { type: String, default: "" }, // base64 or URL
    vision: { type: String, default: "" },
    mission: { type: String, default: "" },
    visionSource: { type: String, default: "text" }, // "text", "pdf", "image"
    missionSource: { type: String, default: "text" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    settings: { type: settingsSchema, default: () => ({}) },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Organization || mongoose.model("Organization", organizationSchema);
