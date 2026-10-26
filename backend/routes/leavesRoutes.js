const express = require("express");
const router = express.Router();
const Leave = require("../models/Leave");
const Approval = require("../models/Approval");
const User = require("../models/User");
const { authenticateUser } = require("./authMiddleware");
const {
    sendLeaveRequestToHOD,
    sendLeaveForwardedToPrincipal,
    sendApprovalDecisionToFaculty,
    sendPrincipalDecisionToHOD
} = require("../services/emailService");

// GET /api/leaves/my-leaves
// Fetch leaves for logged in faculty member
router.get("/my-leaves", authenticateUser, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const userId = req.user._id;

        const leaves = await Leave.find({ organizationId, userId }).sort({ createdAt: -1 }).lean();

        // Calculate leave counts
        const approvedDays = leaves
            .filter(l => l.status === "APPROVED")
            .reduce((sum, l) => {
                const s = new Date(l.startDate);
                const e = new Date(l.endDate);
                const diffTime = Math.abs(e - s);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                return sum + (isNaN(diffDays) ? 1 : diffDays);
            }, 0);

        const totalQuota = req.user.organizationId?.settings?.maxLeave || 12;
        const remaining = Math.max(0, totalQuota - approvedDays);

        res.json({
            success: true,
            totalQuota,
            used: approvedDays,
            remaining,
            leaves
        });
    } catch (err) {
        console.error("Fetch leaves error:", err);
        res.status(500).json({ error: "Failed to load leave records ❌" });
    }
});

// GET /api/leaves/department-leaves
// Fetch pending and processed leaves for HOD and Principal
router.get("/department-leaves", authenticateUser, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const query = { organizationId };

        if (req.user.role === "HOD") {
            // HOD reviews their department
            const hodDept = req.user.department;
            const hodDeptId = req.user.departmentId;
            const conditions = [];
            if (hodDept) conditions.push({ department: hodDept });
            if (hodDeptId) conditions.push({ departmentId: hodDeptId });

            const deptFaculty = await User.find({ organizationId, department: hodDept }).select("_id").lean();
            if (deptFaculty.length > 0) {
                conditions.push({ userId: { $in: deptFaculty.map(u => u._id) } });
            }
            if (conditions.length > 0) {
                query.$or = conditions;
            }
        } else if (req.user.role !== "Principal") {
            // Faculty can only view their own
            query.userId = req.user._id;
        }

        const leaves = await Leave.find(query)
            .populate("userId", "name email department designation")
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            total: leaves.length,
            leaves
        });
    } catch (err) {
        console.error("Fetch department leaves error:", err);
        res.status(500).json({ error: "Failed to load department leave requests ❌" });
    }
});

// POST /api/leaves/apply
// Faculty applies for leave - creates Leave and Approval record for sequential workflow
router.post("/apply", authenticateUser, async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            leaveType = "Casual Leave", 
            reason = "", 
            subject = "Academic Leave Application", 
            attachment = "", 
            attachmentName = "" 
        } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start date and end date are required ❌" });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ error: "Start date cannot be after end date ❌" });
        }

        const newLeave = new Leave({
            organizationId: req.user.organizationId,
            userId: req.user._id,
            facultyName: req.user.name || "Faculty Member",
            department: req.user.department || "",
            departmentId: req.user.departmentId || null,
            subject: subject.trim() || `${leaveType} Request`,
            startDate,
            endDate,
            leaveType,
            reason: reason.trim(),
            attachment,
            attachmentName,
            status: "PENDING",
            currentLevel: "HOD",
            hodStatus: "PENDING",
            principalStatus: "PENDING"
        });

        await newLeave.save();

        // Create matching Approval record for institutional approval queue
        try {
            const approval = new Approval({
                organizationId: req.user.organizationId,
                entityType: "LEAVE",
                entityId: newLeave._id,
                submittedBy: req.user._id,
                departmentId: req.user.departmentId || null,
                departmentName: req.user.department || "",
                status: "SUBMITTED",
                currentLevel: "HOD",
                comments: [],
                history: [{
                    status: "SUBMITTED",
                    actionBy: req.user._id,
                    actionByName: req.user.name || "Faculty Member",
                    comment: reason || "Leave application submitted",
                    date: new Date()
                }]
            });
            await approval.save();

            // Notify Department HOD in real time via SSE
            const { notifyDepartmentHOD } = require("../services/realtimeNotifications");
            await notifyDepartmentHOD({
                organizationId: req.user.organizationId,
                departmentId: req.user.departmentId,
                departmentName: req.user.department,
                title: "New Leave Application",
                message: `${req.user.name} submitted a ${leaveType} application (${startDate} to ${endDate}). Pending your HOD approval.`
            }).catch(e => console.error("Async leave notification error:", e));

            // Look up Department HOD to send email notification
            try {
                const hodUser = await User.findOne({
                    role: "HOD",
                    $or: [
                        { department: req.user.department },
                        { departmentId: req.user.departmentId }
                    ]
                });

                if (hodUser && hodUser.email) {
                    const diffDays = Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
                    sendLeaveRequestToHOD({
                        hodEmail: hodUser.email,
                        hodName: hodUser.name,
                        facultyName: req.user.name || "Faculty Member",
                        department: req.user.department || "",
                        leaveType,
                        subject: subject || `${leaveType} Application`,
                        startDate: new Date(startDate).toLocaleDateString(),
                        endDate: new Date(endDate).toLocaleDateString(),
                        daysCount: diffDays,
                        reason: reason || "",
                        hasAttachment: Boolean(attachment)
                    }).catch(e => console.error("Async leave email error to HOD:", e));
                }
            } catch (emailLookupErr) {
                console.error("Failed to route leave email to HOD:", emailLookupErr);
            }
        } catch (appErr) {
            console.error("Failed to link approval record for leave:", appErr);
        }

        res.status(201).json({ message: "Leave application submitted successfully! 🏖️", leave: newLeave });
    } catch (err) {
        console.error("Apply leave error:", err);
        res.status(500).json({ error: "Failed to submit leave application ❌" });
    }
});

// PUT /api/leaves/:id/review
// HOD or Principal processes a leave request with remarks
router.put("/:id/review", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, remarks } = req.body; // action: 'approve' | 'reject'

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ error: "Invalid review action code ❌" });
        }

        if (req.user.role !== "HOD" && req.user.role !== "Principal") {
            return res.status(403).json({ error: "Unauthorized: Only HOD and Principal can review leave applications ❌" });
        }

        const leave = await Leave.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!leave) {
            return res.status(404).json({ error: "Leave application not found ❌" });
        }

        const approval = await Approval.findOne({ entityType: "LEAVE", entityId: leave._id });

        if (req.user.role === "HOD") {
            if (leave.currentLevel !== "HOD" && leave.status !== "PENDING") {
                return res.status(400).json({ error: "This leave request has already been processed by HOD ❌" });
            }

            if (action === "approve") {
                leave.status = "HOD_APPROVED";
                leave.currentLevel = "PRINCIPAL";
                leave.hodStatus = "APPROVED";
                leave.hodRemarks = remarks || "Recommended for Principal approval";
                leave.hodActionBy = req.user._id;
                leave.hodActionByName = req.user.name;
                leave.hodApprovedAt = new Date();

                if (approval) {
                    approval.status = "HOD_APPROVED";
                    approval.currentLevel = "PRINCIPAL";
                    approval.history.push({
                        status: "HOD_APPROVED",
                        actionBy: req.user._id,
                        actionByName: req.user.name,
                        comment: remarks || "Recommended by HOD",
                        date: new Date()
                    });
                    await approval.save();
                }

                // Alert Principal
                const { notifyPrincipals } = require("../services/realtimeNotifications");
                await notifyPrincipals({
                    organizationId: req.user.organizationId,
                    title: "Leave Awaiting Principal Approval",
                    message: `${leave.facultyName} (${leave.department}) leave recommended by HOD ${req.user.name}. Pending your approval.`
                }).catch(e => console.error("Async leave notification error:", e));
            } else {
                leave.status = "REJECTED";
                leave.currentLevel = "COMPLETED";
                leave.hodStatus = "REJECTED";
                leave.hodRemarks = remarks || "Rejected by HOD";
                leave.hodActionBy = req.user._id;
                leave.hodActionByName = req.user.name;

                if (approval) {
                    approval.status = "REJECTED";
                    approval.currentLevel = "COMPLETED";
                    approval.history.push({
                        status: "REJECTED",
                        actionBy: req.user._id,
                        actionByName: req.user.name,
                        comment: remarks || "Rejected by HOD",
                        date: new Date()
                    });
                    await approval.save();
                }
            }
        } else if (req.user.role === "Principal") {
            if (action === "approve") {
                leave.status = "APPROVED";
                leave.currentLevel = "COMPLETED";
                leave.principalStatus = "APPROVED";
                leave.principalRemarks = remarks || "Approved by Principal";
                leave.principalActionBy = req.user._id;
                leave.principalActionByName = req.user.name;
                leave.principalApprovedAt = new Date();

                if (approval) {
                    approval.status = "APPROVED";
                    approval.currentLevel = "COMPLETED";
                    approval.history.push({
                        status: "APPROVED",
                        actionBy: req.user._id,
                        actionByName: req.user.name,
                        comment: remarks || "Approved by Principal",
                        date: new Date()
                    });
                    await approval.save();
                }
            } else {
                leave.status = "REJECTED";
                leave.currentLevel = "COMPLETED";
                leave.principalStatus = "REJECTED";
                leave.principalRemarks = remarks || "Rejected by Principal";
                leave.principalActionBy = req.user._id;
                leave.principalActionByName = req.user.name;

                if (approval) {
                    approval.status = "REJECTED";
                    approval.currentLevel = "COMPLETED";
                    approval.history.push({
                        status: "REJECTED",
                        actionBy: req.user._id,
                        actionByName: req.user.name,
                        comment: remarks || "Rejected by Principal",
                        date: new Date()
                    });
                    await approval.save();
                }
            }
        }

        leave.updatedAt = new Date();
        await leave.save();

        // Notify faculty in real time via SSE
        const { createAndDispatchNotification } = require("../services/realtimeNotifications");
        await createAndDispatchNotification({
            organizationId: req.user.organizationId,
            userId: leave.userId,
            title: "Leave Status Updated",
            message: `Your ${leave.leaveType} application status has been updated to "${leave.status.replace(/_/g, ' ')}" by ${req.user.name} (${req.user.role}).`,
            type: "approval",
            category: "Leave",
            senderName: req.user.name,
            senderRole: req.user.role,
            targetTab: "leave"
        }).catch(e => console.error("Async leave notification error:", e));

        // Dispatch decision emails (Requirements 4, 5, 6)
        try {
            const facultyUser = await User.findById(leave.userId);
            const refNo = `LEV-${leave._id.toString().slice(-6).toUpperCase()}`;
            const datesStr = `${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}`;

            if (req.user.role === "HOD") {
                if (action === "approve") {
                    // Forwarded to Principal - email Principal
                    const principalUser = await User.findOne({ role: "Principal" });
                    if (principalUser && principalUser.email) {
                        sendLeaveForwardedToPrincipal({
                            principalEmail: principalUser.email,
                            principalName: principalUser.name,
                            facultyName: leave.facultyName,
                            department: leave.department,
                            leaveType: leave.leaveType,
                            subject: leave.subject,
                            startDate: new Date(leave.startDate).toLocaleDateString(),
                            endDate: new Date(leave.endDate).toLocaleDateString(),
                            hodName: req.user.name,
                            hodRemarks: remarks || "Recommended by HOD"
                        }).catch(e => console.error("Async forwarded leave email error:", e));
                    }

                    // Email Faculty (Endorsed by HOD, in Principal queue)
                    if (facultyUser && facultyUser.email) {
                        sendApprovalDecisionToFaculty({
                            facultyEmail: facultyUser.email,
                            facultyName: facultyUser.name,
                            requestType: leave.leaveType,
                            refNo,
                            status: "HOD_APPROVED",
                            approverName: req.user.name,
                            approverRole: "HOD",
                            remarks: remarks || "Recommended for Principal approval",
                            dates: datesStr,
                            subject: leave.subject
                        }).catch(e => console.error("Async decision email error:", e));
                    }
                } else {
                    // HOD Rejected
                    if (facultyUser && facultyUser.email) {
                        sendApprovalDecisionToFaculty({
                            facultyEmail: facultyUser.email,
                            facultyName: facultyUser.name,
                            requestType: leave.leaveType,
                            refNo,
                            status: "REJECTED",
                            approverName: req.user.name,
                            approverRole: "HOD",
                            remarks: remarks || "Rejected by HOD",
                            dates: datesStr,
                            subject: leave.subject
                        }).catch(e => console.error("Async decision email error:", e));
                    }
                }
            } else if (req.user.role === "Principal") {
                const finalStatus = action === "approve" ? "APPROVED" : "REJECTED";
                // Final Decision Email to Faculty
                if (facultyUser && facultyUser.email) {
                    sendApprovalDecisionToFaculty({
                        facultyEmail: facultyUser.email,
                        facultyName: facultyUser.name,
                        requestType: leave.leaveType,
                        refNo,
                        status: finalStatus,
                        approverName: req.user.name,
                        approverRole: "Principal",
                        remarks: remarks || (action === "approve" ? "Sanctioned by Principal" : "Rejected by Principal"),
                        dates: datesStr,
                        subject: leave.subject
                    }).catch(e => console.error("Async decision email error:", e));
                }

                // Intimation to HOD
                const hodUser = await User.findOne({
                    role: "HOD",
                    $or: [
                        { department: leave.department },
                        { _id: leave.hodActionBy }
                    ]
                });
                if (hodUser && hodUser.email) {
                    sendPrincipalDecisionToHOD({
                        hodEmail: hodUser.email,
                        hodName: hodUser.name,
                        facultyName: leave.facultyName,
                        requestType: leave.leaveType,
                        status: finalStatus,
                        principalName: req.user.name,
                        remarks: remarks || "",
                        refNo
                    }).catch(e => console.error("Async HOD decision intimation error:", e));
                }
            }
        } catch (emailErr) {
            console.error("Failed to dispatch leave review decision emails:", emailErr);
        }

        res.json({
            success: true,
            message: `Leave application successfully ${action}d! ✅`,
            leave
        });
    } catch (err) {
        console.error("Review leave error:", err);
        res.status(500).json({ error: "Failed to review leave application ❌" });
    }
});

// PUT /api/leaves/:id
// Edit an eligible pending leave application
router.put("/:id", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, leaveType, reason, subject, attachment, attachmentName } = req.body;

        const leave = await Leave.findOne({ _id: id, organizationId: req.user.organizationId });
        if (!leave) {
            return res.status(404).json({ error: "Leave application not found ❌" });
        }

        // Authorization check: only owner can edit
        if (String(leave.userId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Access denied: Unauthorized to edit this leave application ❌" });
        }

        // Only allow edits to pending applications
        if (leave.status !== "PENDING") {
            return res.status(400).json({ 
                error: `Only pending applications can be edited. This leave application is already ${leave.status.toLowerCase()} ❌` 
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start date and end date are required ❌" });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ error: "Start date cannot be after end date ❌" });
        }

        leave.startDate = startDate;
        leave.endDate = endDate;
        if (leaveType) leave.leaveType = leaveType;
        if (reason !== undefined) leave.reason = reason;
        if (subject) leave.subject = subject;
        if (attachment) leave.attachment = attachment;
        if (attachmentName) leave.attachmentName = attachmentName;

        await leave.save();
        res.json({ success: true, message: "Leave application updated successfully! ✅", leave });
    } catch (err) {
        console.error("Update leave error:", err);
        res.status(500).json({ error: "Failed to update leave application ❌" });
    }
});

module.exports = router;
