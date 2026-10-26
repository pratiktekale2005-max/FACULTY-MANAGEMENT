const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    sender: { type: String, required: true }, // e.g. "Principal" or User name
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: String, default: "" },
    assignedDate: { type: Date, default: Date.now },
    deadline: { type: String, required: true }, // Due date
    priority: {
        type: String,
        default: "Medium"
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "in-progress"],
        default: "pending"
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedByName: { type: String, default: "" },
    assignedByRole: { type: String, default: "" },
    attachment: { type: String, default: "" },
    attachmentName: { type: String, default: "" },
    comments: [commentSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

taskSchema.index({ organizationId: 1, assignedTo: 1 });
taskSchema.index({ organizationId: 1, department: 1 });

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);