const express = require("express");
const router = express.Router();
const Approval = require("../models/Approval");
const Workshop = require("../models/Workshop");
const Paper = require("../models/Paper");
const Activity = require("../models/Activity");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { authenticateUser, requireRole } = require("./authMiddleware");

// Helper to populate target entities
async function populateEntityDetails(approvals) {
    const result = [];
    for (const app of approvals) {
        let details = null;
        try {
            if (app.entityType === "WORKSHOP") {
                details = await Workshop.findById(app.entityId);
            } else if (app.entityType === "PUBLICATION") {
                details = await Paper.findById(app.entityId);
            } else if (app.entityType === "ACTIVITY") {
                details = await Activity.findById(app.entityId);
            }
        } catch (e) {
            console.error("Failed to populate approval details:", e);
        }
        const appObj = app.toObject();
        appObj.entityDetails = details;
        result.push(appObj);
    }
    return result;
}

// ================= GET APPROVALS =================
router.get("/", authenticateUser, async (req, res) => {
    try {
        let query = { organizationId: req.user.organizationId };
        if (req.user.role === "Principal") {
            // Principal sees everything
        } else if (req.user.role === "HOD") {
            // HOD sees department level approvals
            query.departmentId = req.user.departmentId;
        } else {
            // Faculty sees own approvals
            query.submittedBy = req.user._id;
        }

        const approvals = await Approval.find(query)
            .populate("submittedBy", "name email department designation")
            .populate("departmentId", "name code")
            .sort({ updatedAt: -1 });

        const populated = await populateEntityDetails(approvals);
        res.json({ approvals: populated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch approvals queue ❌" });
    }
});

// ================= POST SUBMIT APPROVAL (INTERNAL HELPER ROUTE OR ON LOGGING) =================
// Note: When faculty submits a new activity, we trigger creating the approval record directly in that controller.
// But we can also expose an endpoint to trigger submission if needed.

// ================= POST TRANSITION APPROVAL =================
router.post("/:id/transition", requireRole(["Principal", "HOD"]), async (req, res) => {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'approve' | 'reject' | 'return'

    if (!["approve", "reject", "return"].includes(action)) {
        return res.status(400).json({ error: "Invalid action transition code ❌" });
    }

    if (action !== "approve" && !comment) {
        return res.status(400).json({ error: "A comment is required for returns and rejections ❌" });
    }

    try {
        const approval = await Approval.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!approval) {
            return res.status(404).json({ error: "Approval request not found in your organization ❌" });
        }

        // Check HOD access constraints
        if (req.user.role === "HOD" && String(approval.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: You cannot review other departments' approvals ❌" });
        }

        // Restrict Principal from Workshop Approvals (Requirement #1)
        if (req.user.role === "Principal" && approval.entityType === "WORKSHOP") {
            return res.status(403).json({ error: "Access Denied: Principal does not have workshop approval authorization ❌" });
        }

        const prevStatus = approval.status;
        let nextStatus = approval.status;
        let nextLevel = approval.currentLevel;

        if (req.user.role === "HOD") {
            if (approval.currentLevel !== "HOD") {
                return res.status(400).json({ error: "This request is already pending Principal review ❌" });
            }

            if (action === "approve") {
                nextStatus = "HOD_APPROVED";
                nextLevel = "PRINCIPAL";
            } else if (action === "reject") {
                nextStatus = "REJECTED";
                nextLevel = "COMPLETED";
            } else if (action === "return") {
                nextStatus = "RETURNED";
                nextLevel = "COMPLETED";
            }
        } else if (req.user.role === "Principal") {
            if (action === "approve") {
                nextStatus = "APPROVED";
                nextLevel = "COMPLETED";
            } else if (action === "reject") {
                nextStatus = "REJECTED";
                nextLevel = "COMPLETED";
            } else if (action === "return") {
                nextStatus = "RETURNED";
                nextLevel = "COMPLETED";
            }
        }

        // Apply changes
        approval.status = nextStatus;
        approval.currentLevel = nextLevel;
        approval.updatedAt = new Date();

        if (comment) {
            approval.comments.push({
                sender: req.user._id,
                senderName: req.user.name,
                text: comment,
                date: new Date()
            });
        }

        approval.history.push({
            status: nextStatus,
            actionBy: req.user._id,
            actionByName: req.user.name,
            comment: comment || "Approved",
            date: new Date()
        });

        await approval.save();

        // Sync with target entities (Workshop, Paper, Activity)
        let mappedStatus = "pending";
        if (nextStatus === "APPROVED") mappedStatus = "verified";
        else if (nextStatus === "REJECTED") mappedStatus = "rejected";
        else if (nextStatus === "RETURNED") mappedStatus = "returned";
        else if (nextStatus === "HOD_APPROVED") mappedStatus = "pending"; // Still pending Principal

        if (approval.entityType === "WORKSHOP") {
            const updateFields = { status: mappedStatus };
            if (action === "approve") {
                updateFields.approvedBy = req.user._id;
                updateFields.approvedByName = req.user.name;
                updateFields.approvedAt = new Date();
            }
            const updatedWorkshop = await Workshop.findByIdAndUpdate(approval.entityId, updateFields, { new: true });

            if (action === "approve" && updatedWorkshop) {
                try {
                    const faculty = await User.findById(approval.submittedBy);
                    const Organization = require("../models/Organization");
                    const { sendWorkshopApprovalEmail } = require("../services/emailService");
                    const org = await Organization.findById(req.user.organizationId);
                    if (faculty && faculty.email) {
                        sendWorkshopApprovalEmail({
                            facultyEmail: faculty.email,
                            facultyName: faculty.name,
                            workshopTitle: updatedWorkshop.title,
                            workshopDate: updatedWorkshop.date,
                            time: updatedWorkshop.time,
                            venue: updatedWorkshop.venue,
                            speakerName: updatedWorkshop.speakerName,
                            hodName: req.user.name,
                            departmentName: updatedWorkshop.department,
                            approvalDate: new Date(),
                            institutionName: org?.name
                        }).catch(e => console.error("Async approval email error:", e));
                    }
                } catch (emailErr) {
                    console.error("Error dispatching workshop approval email:", emailErr);
                }
            }
        } else if (approval.entityType === "PUBLICATION") {
            await Paper.findByIdAndUpdate(approval.entityId, { status: mappedStatus });
        } else if (approval.entityType === "ACTIVITY") {
            await Activity.findByIdAndUpdate(approval.entityId, { status: mappedStatus });
        }

        // Audit Logging
        const log = new AuditLog({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            action: `${action.toUpperCase()}_APPROVAL`,
            entityType: approval.entityType,
            entityId: approval.entityId,
            description: `${req.user.name} (${req.user.role}) transitioned approval status from ${prevStatus} to ${nextStatus}.`,
            metadata: { comment: comment || "" }
        });
        // Create Notification for submitting faculty
        try {
            const Notification = require("../models/Notification");
            const notif = new Notification({
                organizationId: req.user.organizationId,
                userId: approval.submittedBy,
                title: "Submission Status Updated",
                message: `Your ${approval.entityType.toLowerCase()} submission has been set to "${nextStatus.replace('_', ' ')}" by ${req.user.name}.`,
                type: "approval"
            });
            await notif.save();
        } catch (notifErr) {
            console.error("Failed to create faculty notification:", notifErr);
        }

        res.json({ message: `Successfully transitioned request state to: ${nextStatus} ✅`, approval });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to transition approval state ❌" });
    }
});

// ================= GET APPROVAL TIMELINE HISTORY =================
router.get("/:id/history", authenticateUser, async (req, res) => {
    const { id } = req.params;

    try {
        const approval = await Approval.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!approval) {
            return res.status(404).json({ error: "Approval request not found in your organization ❌" });
        }

        if (req.user.role === "Faculty" && String(approval.submittedBy) !== String(req.user._id)) {
            return res.status(403).json({ error: "Forbidden: Access denied ❌" });
        }
        if (req.user.role === "HOD" && String(approval.departmentId) !== String(req.user.departmentId)) {
            return res.status(403).json({ error: "Forbidden: Access denied to other departments ❌" });
        }

        res.json({ history: approval.history, comments: approval.comments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch timeline history ❌" });
    }
});

module.exports = router;
