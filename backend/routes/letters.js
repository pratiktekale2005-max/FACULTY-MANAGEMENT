const express = require("express");
const router = express.Router();
const { authenticateUser, requireRole } = require("./authMiddleware");

// ================= OFFICIAL LETTERS TEMPLATES & ACCESS CONTROL =================
// Only Principal and HOD roles are permitted. Faculty and Students are strictly blocked.
router.get("/templates", authenticateUser, requireRole(["Principal", "HOD"]), async (req, res) => {
    try {
        const userRole = req.user.role;

        let availableTemplates = [];

        if (userRole === "Principal") {
            // Principal has complete access to all letter templates
            availableTemplates = [
                {
                    id: "invitation",
                    title: "Invitation Letter",
                    category: "Academic Events",
                    description: "Formal invitation for guest speakers, resource persons, and keynote experts"
                },
                {
                    id: "thank_you",
                    title: "Thank You Letter",
                    category: "Academic Events",
                    description: "Official letter of gratitude and appreciation following guest lectures and conferences"
                },
                {
                    id: "faculty_appointment",
                    title: "Faculty Appointment Letter",
                    category: "Human Resources",
                    description: "Substantive faculty appointment order with terms of service, probation, and scale"
                },
                {
                    id: "hod_appointment",
                    title: "HOD Appointment Letter",
                    category: "Administration",
                    description: "Administrative appointment notification order for Department Leadership"
                }
            ];
        } else if (userRole === "HOD") {
            // HOD has access specifically to appointment letters
            availableTemplates = [
                {
                    id: "faculty_appointment",
                    title: "Faculty Appointment Letter",
                    category: "Human Resources",
                    description: "Substantive faculty appointment order with terms of service, probation, and scale"
                },
                {
                    id: "hod_appointment",
                    title: "HOD Appointment Letter",
                    category: "Administration",
                    description: "Administrative appointment notification order for Department Leadership"
                }
            ];
        }

        res.json({
            role: userRole,
            templates: availableTemplates
        });
    } catch (err) {
        console.error("Fetch letter templates error:", err);
        res.status(500).json({ error: "Failed to load letter templates configuration ❌" });
    }
});

module.exports = router;
