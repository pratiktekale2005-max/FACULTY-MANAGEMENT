const Notification = require("../models/Notification");
const User = require("../models/User");
const Department = require("../models/Department");

// Active SSE client connections: Map<userIdString, Set<res>>
const clients = new Map();
// Client metadata: Map<userIdString, { role, organizationId, departmentId }>
const userMeta = new Map();

/**
 * Register an incoming SSE connection
 */
function registerClient(userId, res, metadata = {}) {
    const uid = String(userId);
    if (!clients.has(uid)) {
        clients.set(uid, new Set());
    }
    clients.get(uid).add(res);
    userMeta.set(uid, metadata);

    // Initial connection ack event
    res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "Real-time notifications stream active" })}\n\n`);

    // Clean up when client disconnects
    res.on("close", () => {
        unregisterClient(uid, res);
    });
}

/**
 * Unregister a disconnected SSE client
 */
function unregisterClient(userId, res) {
    const uid = String(userId);
    if (clients.has(uid)) {
        const clientSet = clients.get(uid);
        clientSet.delete(res);
        if (clientSet.size === 0) {
            clients.delete(uid);
            userMeta.delete(uid);
        }
    }
}

/**
 * Push an SSE payload to all active connections for a given user
 */
function sendRealtimeNotification(userId, notification) {
    const uid = String(userId);
    if (!clients.has(uid)) return false;

    const payload = JSON.stringify({
        type: "NOTIFICATION",
        notification
    });

    const clientSet = clients.get(uid);
    clientSet.forEach(res => {
        try {
            res.write(`data: ${payload}\n\n`);
        } catch (err) {
            console.error(`Error sending SSE to user ${uid}:`, err);
        }
    });
    return true;
}

/**
 * Save notification in database AND push immediately via real-time stream
 */
async function createAndDispatchNotification({ userId, organizationId, title, message, type = "info" }) {
    try {
        if (!userId || !organizationId || !title || !message) {
            console.warn("⚠️ createAndDispatchNotification missing required parameters");
            return null;
        }

        const notif = new Notification({
            userId,
            organizationId,
            title,
            message,
            type: ["info", "warning", "deadline", "approval"].includes(type) ? type : "info",
            isRead: false,
            createdAt: new Date()
        });

        await notif.save();

        // Push in real time
        sendRealtimeNotification(userId, notif);

        return notif;
    } catch (err) {
        console.error("❌ Failed to create and dispatch notification:", err);
        return null;
    }
}

/**
 * Find HOD of a department and send them a notification in real-time
 */
async function notifyDepartmentHOD(organizationId, departmentId, { title, message, type = "approval" }) {
    try {
        let hodUserId = null;

        if (departmentId) {
            // First check Department document for hodId
            const dept = await Department.findById(departmentId);
            if (dept && dept.hodId) {
                hodUserId = dept.hodId;
            } else {
                // Look for user with HOD role in this department
                const hodUser = await User.findOne({
                    role: "HOD",
                    departmentId,
                    organizationId
                });
                if (hodUser) {
                    hodUserId = hodUser._id;
                }
            }
        }

        // Fallback: If no departmentId given or not found, find any HOD in the organization
        if (!hodUserId) {
            const fallbackHod = await User.findOne({
                role: "HOD",
                organizationId
            });
            if (fallbackHod) {
                hodUserId = fallbackHod._id;
            }
        }

        if (hodUserId) {
            return await createAndDispatchNotification({
                userId: hodUserId,
                organizationId,
                title,
                message,
                type
            });
        } else {
            console.warn(`⚠️ No HOD found for organization ${organizationId} and department ${departmentId}`);
        }
    } catch (err) {
        console.error("❌ Error notifying HOD:", err);
    }
    return null;
}

/**
 * Notify all Principals in the organization in real-time
 */
async function notifyPrincipals(organizationId, { title, message, type = "approval" }) {
    try {
        const principals = await User.find({
            role: "Principal",
            organizationId
        });

        const promises = principals.map(p => 
            createAndDispatchNotification({
                userId: p._id,
                organizationId,
                title,
                message,
                type
            })
        );

        return await Promise.all(promises);
    } catch (err) {
        console.error("❌ Error notifying Principals:", err);
        return [];
    }
}

// Global 20-second keep-alive ping for all connected SSE clients
setInterval(() => {
    clients.forEach((clientSet) => {
        clientSet.forEach(res => {
            try {
                res.write(": keepalive\n\n");
            } catch (e) {
                // Connection closed
            }
        });
    });
}, 20000);

module.exports = {
    registerClient,
    unregisterClient,
    sendRealtimeNotification,
    createAndDispatchNotification,
    notifyDepartmentHOD,
    notifyPrincipals
};
