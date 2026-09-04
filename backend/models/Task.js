const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    sender: { type: String, required: true }, // e.g. "Principal" or User name
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deadline: { type: String, required: true },
    status: {
        type: String,
        enum: ["pending", "in_progress", "completed"],
        default: "pending"
    },
    comments: [commentSchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);