const express = require("express");
const router = express.Router();
const Approval = require("../models/Approval");
const Workshop = require("../models/Workshop");
const Paper = require("../models/Paper");
const Activity = require("../models/Activity");
const Leave = require("../models/Leave");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { authenticateUser, requireRole } = require("./authMiddleware");
const {
    sendApprovalDecisionToFaculty,
    sendLeaveForwardedToPrincipal,
    sendPrincipalDecisionToHOD
} = require("../services/emailService");

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
            } else if (app.entityType === "LEAVE") {
                details = await Leave.findById(app.entityId);
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
            // Principal sees everything across the institution
        } else if (req.user.role === "HOD") {
            // HOD sees department level approvals
            const hodDept = req.user.department;
            const hodDeptId = req.user.departmentId;
            const conditions = [];
            if (hodDeptId) conditions.push({ departmentId: hodDeptId });
            if (hodDept) conditions.push({ departmentName: hodDept });

            const deptUsers = await User.find({ organizationId: req.user.organizationId, department: hodDept }).select("_id").lean();
            if (deptUsers.length > 0) {
                conditions.push({ submittedBy: { $in: deptUsers.map(u => u._id) } });
            }
            if (conditions.length > 0) {
                query.$or = conditions;
            }
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
        // Prevent already-finalized requests from being approved or rejected again (Requirement 6)
        if (approval.currentLevel === "COMPLETED" || ["APPROVED", "REJECTED"].includes(approval.status)) {
            return res.status(400).json({ error: "This request has already been finalized and cannot be reviewed again ❌" });
        }

        if (req.user.role === "HOD") {
            const submitter = await User.findById(approval.submittedBy);
            const deptMatch = (approval.departmentId && String(approval.departmentId) === String(req.user.departmentId)) ||
                              (approval.departmentName && req.user.department && approval.departmentName.toLowerCase() === req.user.department.toLowerCase()) ||
                              (submitter && submitter.department && req.user.department && submitter.department.toLowerCase() === req.user.department.toLowerCase());
            if (!deptMatch) {
                return res.status(403).json({ error: "Forbidden: You cannot review other departments' approvals ❌" });
            }
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
        } else if (approval.entityType === "LEAVE") {
            const leaveUpdate = {
                status: nextStatus === "APPROVED" ? "APPROVED" : nextStatus === "REJECTED" ? "REJECTED" : nextStatus === "RETURNED" ? "REJECTED" : "HOD_APPROVED",
                currentLevel: nextLevel,
                updatedAt: new Date()
            };
            if (req.user.role === "HOD") {
                leaveUpdate.hodStatus = action === "approve" ? "APPROVED" : "REJECTED";
                leaveUpdate.hodRemarks = comment || (action === "approve" ? "Recommended by HOD" : "Rejected by HOD");
                leaveUpdate.hodActionBy = req.user._id;
                leaveUpdate.hodActionByName = req.user.name;
                if (action === "approve") leaveUpdate.hodApprovedAt = new Date();
            } else if (req.user.role === "Principal") {
                leaveUpdate.principalStatus = action === "approve" ? "APPROVED" : "REJECTED";
                leaveUpdate.principalRemarks = comment || (action === "approve" ? "Approved by Principal" : "Rejected by Principal");
                leaveUpdate.principalActionBy = req.user._id;
                leaveUpdate.principalActionByName = req.user.name;
                if (action === "approve") leaveUpdate.principalApprovedAt = new Date();
            }
            await Leave.findByIdAndUpdate(approval.entityId, leaveUpdate);
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
        // Real-Time Notifications for all involved parties
        try {
            const { createAndDispatchNotification, notifyPrincipals, notifyDepartmentHOD } = require("../services/realtimeNotifications");

            // 1. Notify the submitting faculty member in real time
            await createAndDispatchNotification({
                organizationId: req.user.organizationId,
                userId: approval.submittedBy,
                title: "Submission Status Updated",
                message: `Your ${approval.entityType.toLowerCase()} submission has been set to "${nextStatus.replace(/_/g, ' ')}" by ${req.user.name} (${req.user.role}).`,
                type: "approval"
            });

            // 2. If status is forwarded to Principal (HOD_APPROVED), alert Principal(s) immediately
            if (nextStatus === "HOD_APPROVED") {
                await notifyPrincipals(req.user.organizationId, {
                    title: "Pending Principal Review",
                    message: `${approval.entityType} request from ${approval.submittedByName || "Faculty"} was endorsed by HOD ${req.user.name} and awaits your decision.`,
                    type: "approval"
                });
            }

            // 3. If action was taken by Principal, also keep HOD informed
            if (req.user.role === "Principal" && approval.departmentId) {
                await notifyDepartmentHOD(req.user.organizationId, approval.departmentId, {
                    title: "Principal Decision Update",
                    message: `Principal ${req.user.name} decided "${nextStatus.replace(/_/g, ' ')}" on ${approval.entityType.toLowerCase()} submission by ${approval.submittedByName || "Faculty"}.`,
                    type: "approval"
                });
            }

            // 4. Dispatch Decision Emails (Requirements 4, 5, 6)
            try {
                const submitter = await User.findById(approval.submittedBy);
                const refNo = `APP-${approval._id.toString().slice(-6).toUpperCase()}`;

                if (req.user.role === "HOD") {
                    if (action === "approve") {
                        if (nextStatus === "HOD_APPROVED") {
                            // Forwarded to Principal - email Principal
                            const principalUser = await User.findOne({ role: "Principal" });
                            if (principalUser && principalUser.email) {
                                sendLeaveForwardedToPrincipal({
                                    principalEmail: principalUser.email,
                                    principalName: principalUser.name,
                                    facultyName: submitter?.name || "Faculty Member",
                                    department: submitter?.department || approval.departmentName || "",
                                    leaveType: `${approval.entityType} Request`,
                                    subject: `${approval.entityType} Approval Request`,
                                    hodName: req.user.name,
                                    hodRemarks: comment || "Recommended by HOD"
                                }).catch(e => console.error("Async forwarded email to Principal error:", e));
                            }

                            // Email Faculty (Endorsed by HOD, pending Principal)
                            if (submitter && submitter.email) {
                                sendApprovalDecisionToFaculty({
                                    facultyEmail: submitter.email,
                                    facultyName: submitter.name,
                                    requestType: approval.entityType,
                                    refNo,
                                    status: "HOD_APPROVED",
                                    approverName: req.user.name,
                                    approverRole: "HOD",
                                    remarks: comment || "Recommended for Principal approval"
                                }).catch(e => console.error("Async decision email to faculty error:", e));
                            }
                        } else {
                            // Finally Approved at HOD Level
                            if (submitter && submitter.email) {
                                sendApprovalDecisionToFaculty({
                                    facultyEmail: submitter.email,
                                    facultyName: submitter.name,
                                    requestType: approval.entityType,
                                    refNo,
                                    status: "APPROVED",
                                    approverName: req.user.name,
                                    approverRole: "HOD",
                                    remarks: comment || "Approved by HOD"
                                }).catch(e => console.error("Async approval email to faculty error:", e));
                            }
                        }
                    } else {
                        // HOD Rejected or Returned
                        if (submitter && submitter.email) {
                            sendApprovalDecisionToFaculty({
                                facultyEmail: submitter.email,
                                facultyName: submitter.name,
                                requestType: approval.entityType,
                                refNo,
                                status: nextStatus,
                                approverName: req.user.name,
                                approverRole: "HOD",
                                remarks: comment || `${action.toUpperCase()} by HOD`
                            }).catch(e => console.error("Async reject email to faculty error:", e));
                        }
                    }
                } else if (req.user.role === "Principal") {
                    // Principal Approved or Rejected
                    if (submitter && submitter.email) {
                        sendApprovalDecisionToFaculty({
                            facultyEmail: submitter.email,
                            facultyName: submitter.name,
                            requestType: approval.entityType,
                            refNo,
                            status: nextStatus,
                            approverName: req.user.name,
                            approverRole: "Principal",
                            remarks: comment || (action === "approve" ? "Sanctioned by Principal" : `${action.toUpperCase()} by Principal`)
                        }).catch(e => console.error("Async decision email to faculty error:", e));
                    }

                    // Intimate HOD
                    const hodUser = await User.findOne({
                        role: "HOD",
                        $or: [
                            { department: submitter?.department },
                            { departmentId: approval.departmentId }
                        ]
                    });
                    if (hodUser && hodUser.email) {
                        sendPrincipalDecisionToHOD({
                            hodEmail: hodUser.email,
                            hodName: hodUser.name,
                            facultyName: submitter?.name || "Faculty Member",
                            requestType: approval.entityType,
                            status: nextStatus,
                            principalName: req.user.name,
                            remarks: comment || "",
                            refNo
                        }).catch(e => console.error("Async HOD decision intimation error:", e));
                    }
                }
            } catch (emailDispatchErr) {
                console.error("Failed to dispatch approval decision emails:", emailDispatchErr);
            }
        } catch (notifErr) {
            console.error("Failed to dispatch real-time approval notifications:", notifErr);
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
