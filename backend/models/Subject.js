const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    plannedDate: { type: String, required: true },
    conductedDate: { type: String, default: "" },
    conductedTopic: { type: String, default: "" },
    status: { type: String, enum: ["planned", "completed", "pending"], default: "pending" },
    lectureDeliveryStatus: { type: String, enum: ["COMPLETED", "INCOMPLETE", "NOT MARKED"], default: "INCOMPLETE" }
});

const practicalSchema = new mongoose.Schema({
    batch: { type: String, required: true },
    plannedDate: { type: String, required: true },
    conductedDate: { type: String, default: "" },
    conductedTopic: { type: String, default: "" },
    status: { type: String, enum: ["planned", "completed", "pending"], default: "pending" }
});

const teachingPlanItemSchema = new mongoose.Schema({
    week: { type: Number, required: true },
    topic: { type: String, required: true },
    plannedDate: { type: String, required: true },
    conductedDate: { type: String, default: "" },
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["planned", "completed", "pending"], default: "pending" }
});

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ["Notes", "PPT", "PDF", "Video", "Link"], required: true },
    url: { type: String, required: true }, // base64 file or link
    division: { type: String, required: true }
});

const divisionTeachingPlanSchema = new mongoose.Schema({
    division: { type: String, required: true },
    week: { type: Number, required: true },
    topic: { type: String, required: true },
    plannedDate: { type: String, required: true },
    conductedDate: { type: String, default: "" },
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["planned", "completed", "pending"], default: "pending" },
    unitsCovered: { type: String, default: "" },
    hoursCompleted: { type: Number, default: 0 },
    remainingHours: { type: Number, default: 0 },
    lessonPlan: { type: String, default: "" }
});

const studentSchema = new mongoose.Schema({
    rollNo: { type: String, required: true },
    name: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
    mobileNumber: { type: String, default: "" },
    prnNumber: { type: String, default: "" },
    skills: { type: String, default: "" },
    division: { type: String, default: "" }, // Assigned division A, B, etc.
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    internalMarks: {
        cia: { type: Number, default: 0 },
        mse: { type: Number, default: 0 },
        ese: { type: Number, default: 0 },
        practical: { type: Number, default: 0 }
    },
    assignmentMarks: {
        a1: { type: Number, default: null },
        a2: { type: Number, default: null },
        a3: { type: Number, default: null },
        a4: { type: Number, default: null },
        a5: { type: Number, default: null },
        total: { type: Number, default: 0 }
    },
    attendance: [{
        date: { type: String }, // YYYY-MM-DD
        status: { type: String, enum: ["PRESENT", "ABSENT", "ON_LEAVE"], default: "PRESENT" }
    }],
    customFields: { type: Map, of: String, default: {} },
    year: { type: String, default: "" },
    department: { type: String, default: "" },
    addedBy: { type: String, default: "" },
    addedByRole: { type: String, default: "" }
});

const subjectSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjectName: { type: String, required: true },
    subjectCode: { type: String, required: true },
    department: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: String, required: true },
    lecturesPlanned: { type: Number, default: 40 },
    lecturesConducted: { type: Number, default: 0 },
    practicalCode: { type: String, default: "" },
    practicalsPlanned: { type: Number, default: 0 },
    practicalsConducted: { type: Number, default: 0 },
    lectures: [lectureSchema],
    practicals: [practicalSchema],
    teachingPlan: [teachingPlanItemSchema],
    students: [studentSchema],
    hasDivision: { type: Boolean, default: false },
    numberOfDivisions: { type: Number, default: 0 },
    divisionList: { type: [String], default: [] },
    divisionTeachingPlans: [divisionTeachingPlanSchema],
    divisionResources: [resourceSchema],
    courseObjectives: { type: [String], default: [] },
    courseOutcomes: { type: [String], default: [] },
    coPoMapping: { type: Map, of: String, default: {} },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
