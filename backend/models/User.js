const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    role: { type: String, enum: ["Principal", "HOD", "Faculty"], default: "Faculty" },
    department: { type: String, default: "Computer Science" },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designation: { type: String, default: "Assistant Professor" },
    phone: { type: String, default: "" },
    joiningDate: { type: String, default: "" },
    resumePath: { type: String, default: "" },
    photoPath: { type: String, default: "" },
    experience: { type: String, default: "" },
    skills: { type: String, default: "" },
    achievements: { type: String, default: "" },
    qualification: { type: String, default: "" },
    researchInterests: { type: String, default: "" },
    performanceScore: { type: Number, default: 70 },
    subjectsHandled: [String],
    employeeId: { type: String, sparse: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    password: { type: String, select: false, default: null },
    emailSettings: {
        configured: { type: Boolean, default: false },
        service: { type: String, default: "gmail" },
        email: { type: String, default: "" },
        appPassword: { type: String, select: false, default: null },
        host: { type: String, default: "" },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        verifiedAt: { type: Date, default: null }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now }
});

// Compound unique index for employeeId within the same organization
userSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true, sparse: true });

userSchema.virtual("fullName")
    .get(function() { return this.name; })
    .set(function(val) { this.name = val; });

userSchema.set("toJSON", { 
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.password;
        if (ret.emailSettings) {
            delete ret.emailSettings.appPassword;
        }
        return ret;
    }
});
userSchema.set("toObject", { 
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.password;
        if (ret.emailSettings) {
            delete ret.emailSettings.appPassword;
        }
        return ret;
    }
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);

