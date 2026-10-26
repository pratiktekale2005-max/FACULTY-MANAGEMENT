const express = require("express");
const router = express.Router();
const Timetable = require("../models/Timetable");
const TimetableImage = require("../models/TimetableImage");
const { authenticateUser } = require("./authMiddleware");

const dayOrder = {
    "Monday": 1,
    "Tuesday": 2,
    "Wednesday": 3,
    "Thursday": 4,
    "Friday": 5,
    "Saturday": 6,
    "Sunday": 7
};

// Helper: parse standard time strings ("09:00 AM", "14:30", etc.) to minutes from midnight
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes("PM");
    const isAM = clean.includes("AM");
    const parts = clean.replace(/AM|PM/g, "").trim().split(":");
    let hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

// GET /api/timetable
// Fetch timetable for logged-in faculty or specified filter, including departmental exams
router.get("/", authenticateUser, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        let facultyId = req.user._id;

        // If Principal or HOD and specifies target faculty
        if ((req.user.role === "Principal" || req.user.role === "HOD") && req.query.facultyId) {
            facultyId = req.query.facultyId;
        }

        // Query: faculty's own entries OR department examinations / shared activities
        const query = {
            organizationId,
            $or: [
                { facultyId },
                {
                    department: req.user.department,
                    activityType: {
                        $in: ["Unit Test", "Internal Examination", "Final / End-Semester Examination", "Other Academic Activity"]
                    }
                }
            ]
        };

        if (req.query.day && req.query.day !== "all") {
            query.dayOfWeek = req.query.day;
        }

        if (req.query.activityType && req.query.activityType !== "all") {
            query.activityType = req.query.activityType;
        }

        if (req.query.today === "true") {
            const todayIndex = new Date().getDay();
            const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDay = daysList[todayIndex];
            query.dayOfWeek = currentDay;
        }

        const slots = await Timetable.find(query).lean();

        // Sort by date (if exam with date) or by day of week then start time
        slots.sort((a, b) => {
            if (a.date && b.date && a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            const dayDiff = (dayOrder[a.dayOfWeek] || 99) - (dayOrder[b.dayOfWeek] || 99);
            if (dayDiff !== 0) return dayDiff;
            return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
        });

        res.json({
            success: true,
            totalSlots: slots.length,
            slots
        });
    } catch (err) {
        console.error("Fetch timetable error:", err);
        res.status(500).json({ error: "Failed to fetch timetable schedule ❌" });
    }
});

// POST /api/timetable
// Create new timetable entry with validation
router.post("/", authenticateUser, async (req, res) => {
    const { 
        date, 
        dayOfWeek, 
        startTime, 
        endTime, 
        department, 
        year, 
        division, 
        subjectName, 
        subjectCode, 
        subjectId, 
        roomOrLab, 
        activityType, 
        lectureType,
        status,
        academicYear
    } = req.body;

    if (!startTime || !endTime || !department || !year || !division || !subjectName || !roomOrLab) {
        return res.status(400).json({ error: "Please fill all required timetable parameters (Timing, Subject, Class, Room) ❌" });
    }

    // Determine day of week from date if provided
    let calculatedDay = dayOfWeek;
    if (date && !calculatedDay) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        calculatedDay = days[new Date(date).getDay()];
    }
    if (!calculatedDay) calculatedDay = "Monday";

    // Validate start time < end time
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (startMin >= endMin) {
        return res.status(400).json({ error: "Invalid time range: Start time must be before End time ❌" });
    }

    try {
        const organizationId = req.user.organizationId;
        let facultyId = req.user._id;
        let facultyName = req.user.name || "Faculty";

        if ((req.user.role === "Principal" || req.user.role === "HOD") && req.body.facultyId) {
            facultyId = req.body.facultyId;
            facultyName = req.body.facultyName || facultyName;
        }

        // Conflict check: Check if same faculty is already booked in that slot
        const duplicateFaculty = await Timetable.findOne({
            organizationId,
            facultyId,
            dayOfWeek: calculatedDay,
            startTime,
            status: { $ne: "Cancelled" }
        });

        if (duplicateFaculty) {
            return res.status(400).json({ 
                error: `Schedule conflict: You already have a session (${duplicateFaculty.subjectName}) on ${calculatedDay} at ${startTime} ❌` 
            });
        }

        // Conflict check: Check if same room is booked for another active session
        const duplicateRoom = await Timetable.findOne({
            organizationId,
            dayOfWeek: calculatedDay,
            startTime,
            roomOrLab: roomOrLab.trim(),
            status: { $ne: "Cancelled" }
        });

        if (duplicateRoom) {
            return res.status(400).json({
                error: `Room conflict: ${roomOrLab} is already occupied on ${calculatedDay} at ${startTime} by ${duplicateRoom.subjectName} (${duplicateRoom.facultyName}) ❌`
            });
        }

        const resolvedActivityType = activityType || (lectureType === "Practical" ? "Practical" : lectureType === "Tutorial" ? "Tutorial" : "Regular Lecture");

        const newSlot = new Timetable({
            organizationId,
            facultyId,
            facultyName,
            date: date || "",
            dayOfWeek: calculatedDay,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            department: department.trim(),
            year: year.trim(),
            division: division.trim().toUpperCase(),
            subjectName: subjectName.trim(),
            subjectCode: (subjectCode || "").trim(),
            subjectId: subjectId || null,
            roomOrLab: roomOrLab.trim(),
            activityType: resolvedActivityType,
            lectureType: resolvedActivityType === "Practical" ? "Practical" : resolvedActivityType === "Tutorial" ? "Tutorial" : "Theory",
            status: status || "Scheduled",
            academicYear: academicYear || "2026-2027"
        });

        await newSlot.save();
        res.status(201).json({ message: "Timetable entry created successfully ✅", slot: newSlot });
    } catch (err) {
        console.error("Create timetable error:", err);
        res.status(500).json({ error: "Failed to create timetable entry ❌" });
    }
});

// PUT /api/timetable/:id
// Edit existing timetable entry
router.put("/:id", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organizationId;
        const slot = await Timetable.findOne({ _id: id, organizationId });

        if (!slot) {
            return res.status(404).json({ error: "Timetable entry not found ❌" });
        }

        // Authorization: owner or Admin/HOD
        if (req.user.role === "Faculty" && String(slot.facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Unauthorized to edit this timetable entry ❌" });
        }

        const {
            date,
            dayOfWeek,
            startTime,
            endTime,
            department,
            year,
            division,
            subjectName,
            subjectCode,
            roomOrLab,
            activityType,
            status
        } = req.body;

        const updatedStartTime = startTime !== undefined ? startTime.trim() : slot.startTime;
        const updatedEndTime = endTime !== undefined ? endTime.trim() : slot.endTime;

        if (parseTimeToMinutes(updatedStartTime) >= parseTimeToMinutes(updatedEndTime)) {
            return res.status(400).json({ error: "Invalid time range: Start time must be before End time ❌" });
        }

        let updatedDay = dayOfWeek !== undefined ? dayOfWeek : slot.dayOfWeek;
        if (date && !dayOfWeek) {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            updatedDay = days[new Date(date).getDay()];
        }

        // Conflict check excluding current slot
        if (updatedStartTime !== slot.startTime || updatedDay !== slot.dayOfWeek) {
            const duplicate = await Timetable.findOne({
                _id: { $ne: id },
                organizationId,
                facultyId: slot.facultyId,
                dayOfWeek: updatedDay,
                startTime: updatedStartTime,
                status: { $ne: "Cancelled" }
            });

            if (duplicate) {
                return res.status(400).json({
                    error: `Schedule conflict: Another session (${duplicate.subjectName}) exists on ${updatedDay} at ${updatedStartTime} ❌`
                });
            }
        }

        if (date !== undefined) slot.date = date;
        if (dayOfWeek !== undefined || updatedDay) slot.dayOfWeek = updatedDay;
        if (startTime !== undefined) slot.startTime = updatedStartTime;
        if (endTime !== undefined) slot.endTime = updatedEndTime;
        if (department !== undefined) slot.department = department.trim();
        if (year !== undefined) slot.year = year.trim();
        if (division !== undefined) slot.division = division.trim().toUpperCase();
        if (subjectName !== undefined) slot.subjectName = subjectName.trim();
        if (subjectCode !== undefined) slot.subjectCode = subjectCode.trim();
        if (roomOrLab !== undefined) slot.roomOrLab = roomOrLab.trim();
        if (activityType !== undefined) {
            slot.activityType = activityType;
            slot.lectureType = activityType === "Practical" ? "Practical" : activityType === "Tutorial" ? "Tutorial" : "Theory";
        }
        if (status !== undefined) slot.status = status;

        await slot.save();
        res.json({ message: "Timetable entry updated successfully ✅", slot });
    } catch (err) {
        console.error("Update timetable error:", err);
        res.status(500).json({ error: "Failed to update timetable entry ❌" });
    }
});

// DELETE /api/timetable/:id
// Delete timetable entry
router.delete("/:id", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organizationId;
        const slot = await Timetable.findOne({ _id: id, organizationId });

        if (!slot) {
            return res.status(404).json({ error: "Timetable entry not found ❌" });
        }

        if (req.user.role === "Faculty" && String(slot.facultyId) !== String(req.user._id)) {
            return res.status(403).json({ error: "Unauthorized to delete this timetable entry ❌" });
        }

        await Timetable.findByIdAndDelete(id);
        res.json({ message: "Timetable entry deleted successfully ✅" });
    } catch (err) {
        console.error("Delete timetable error:", err);
        res.status(500).json({ error: "Failed to delete timetable entry ❌" });
    }
});

// GET /api/timetable/image
// Retrieve the uploaded master timetable image for the department
router.get("/image", authenticateUser, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const department = req.query.department || req.user.department;
        
        const query = { organizationId };
        if (department) {
            query.department = department;
        }

        const image = await TimetableImage.findOne(query).sort({ updatedAt: -1 }).lean();
        res.json({ success: true, image: image || null });
    } catch (err) {
        console.error("Fetch timetable image error:", err);
        res.status(500).json({ error: "Failed to fetch timetable image ❌" });
    }
});

// POST /api/timetable/image
// Upload or replace timetable image or PDF document
router.post("/image", authenticateUser, async (req, res) => {
    try {
        const { 
            imageBase64, 
            fileBase64, 
            fileName, 
            fileSize, 
            title, 
            department, 
            academicYear, 
            semester,
            replace = true 
        } = req.body;

        const fileData = fileBase64 || imageBase64;
        if (!fileData) {
            return res.status(400).json({ error: "Timetable file data is required (Image or PDF) ❌" });
        }

        // Validate format (Base64 data URL for images or PDF)
        const match = fileData.match(/^data:(image\/(jpeg|jpg|png|webp)|application\/pdf);base64,/i);
        if (!match) {
            return res.status(400).json({ 
                error: "Invalid file format. Supported formats are JPG, JPEG, PNG, WEBP, and PDF documents ❌" 
            });
        }

        const mimeType = match[1].toLowerCase();
        const fileType = mimeType === "application/pdf" ? "pdf" : "image";

        // Validate size approx <= 10MB
        const approxSize = Math.round((fileData.length * 3) / 4);
        if (approxSize > 10 * 1024 * 1024) {
            return res.status(400).json({ error: "File exceeds the 10MB size limit ❌" });
        }

        const organizationId = req.user.organizationId;
        const targetDept = department || req.user.department || "General";
        const cleanTitle = title ? title.trim() : (fileType === "pdf" ? "Master Department Timetable (PDF)" : "Master Department Timetable");
        const defaultName = fileName ? fileName.trim() : (fileType === "pdf" ? "Timetable_Schedule.pdf" : "Timetable_Chart.png");
        const formattedSize = fileSize || `${(approxSize / (1024 * 1024)).toFixed(2)} MB`;

        // Check if an existing timetable document exists for this dept & organization to update/replace
        let existing = await TimetableImage.findOne({ organizationId, department: targetDept });
        if (existing && replace) {
            existing.imageUrl = fileData;
            existing.fileUrl = fileData;
            existing.fileType = fileType;
            existing.fileName = defaultName;
            existing.fileSize = formattedSize;
            existing.mimeType = mimeType;
            if (title) existing.title = cleanTitle;
            if (academicYear) existing.academicYear = academicYear;
            if (semester) existing.semester = semester;
            existing.uploadedBy = req.user._id;
            existing.uploadedByName = req.user.name || "Faculty Member";
            existing.uploadedAt = new Date();
            await existing.save();
            return res.json({ 
                success: true, 
                message: `Timetable ${fileType.toUpperCase()} updated successfully ✅`, 
                image: existing 
            });
        }

        const newDoc = new TimetableImage({
            organizationId,
            department: targetDept,
            title: cleanTitle,
            academicYear: academicYear || "2026-2027",
            semester: semester || "Current Semester",
            fileType,
            fileName: defaultName,
            fileSize: formattedSize,
            mimeType,
            imageUrl: fileData,
            fileUrl: fileData,
            uploadedBy: req.user._id,
            uploadedByName: req.user.name || "Faculty Member"
        });

        await newDoc.save();
        res.status(201).json({ 
            success: true, 
            message: `Timetable ${fileType.toUpperCase()} uploaded successfully ✅`, 
            image: newDoc 
        });
    } catch (err) {
        console.error("Upload timetable file error:", err);
        res.status(500).json({ error: "Failed to upload timetable file ❌" });
    }
});

// DELETE /api/timetable/image/:id
// Remove timetable image
router.delete("/image/:id", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organizationId;
        const image = await TimetableImage.findOne({ _id: id, organizationId });

        if (!image) {
            return res.status(404).json({ error: "Timetable image not found ❌" });
        }

        // Only uploader, HOD, or Principal can delete
        if (req.user.role === "Faculty" && String(image.uploadedBy) !== String(req.user._id)) {
            return res.status(403).json({ error: "Unauthorized to delete this timetable image ❌" });
        }

        await TimetableImage.findByIdAndDelete(id);
        res.json({ success: true, message: "Timetable image deleted successfully 🗑️✅" });
    } catch (err) {
        console.error("Delete timetable image error:", err);
        res.status(500).json({ error: "Failed to delete timetable image ❌" });
    }
});

module.exports = router;
