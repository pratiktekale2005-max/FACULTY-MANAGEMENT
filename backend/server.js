require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
if (!process.env.RENDER && process.env.NODE_ENV !== "production") {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("mongo-sanitize");
const rateLimit = require("express-rate-limit");

// Import routes
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/auth");
const subjectsRoutes = require("./routes/subjects");
const workshopsRoutes = require("./routes/workshops");
const activitiesRoutes = require("./routes/activities");
const facultyRoutes = require("./routes/faculty");
const papersRoutes = require("./routes/papers");
const departmentsRoutes = require("./routes/departments");
const performanceRoutes = require("./routes/performance");
const kpisRoutes = require("./routes/kpis");
const approvalsRoutes = require("./routes/approvals");
const auditLogsRoutes = require("./routes/auditLogs");
const userRoutes = require("./routes/userRoutes");
const organizationsRoutes = require("./routes/organizations");
const notificationsRoutes = require("./routes/notifications");
const certificationsRoutes = require("./routes/certifications");
const assignmentsRoutes = require("./routes/assignments");
const lettersRoutes = require("./routes/letters");
const classesRoutes = require("./routes/classesRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const attendanceManagementRoutes = require("./routes/attendanceManagementRoutes");
const assignmentMarksRoutes = require("./routes/assignmentMarksRoutes");
const leavesRoutes = require("./routes/leavesRoutes");
const noticesRoutes = require("./routes/noticesRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

// Create app
const app = express();

// Trust reverse proxy for Render / Cloud deployments
app.set("trust proxy", 1);

// Security Middleware
app.use(helmet({ 
    contentSecurityPolicy: false, // Disable CSP to allow loading base64 images locally
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    frameguard: false // allow modal framing / embedding in application viewer
}));
app.use(cors());

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 minutes
    message: { error: "Too many requests from this IP, please try again later ⏱️" },
    validate: { xForwardedForHeader: false }
});
app.use("/api/", apiLimiter);

// Parse JSON and URL Encoded bodies
app.use(express.json({ limit: "50mb" })); // Increased limit to support base64 uploads
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Mongo Sanitization against NoSQL injection
app.use((req, res, next) => {
    req.body = mongoSanitize(req.body);
    req.query = mongoSanitize(req.query);
    req.params = mongoSanitize(req.params);
    next();
});

// Serve uploads directory statically if files are stored on disk
const path = require("path");
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static(uploadsDir));

// MongoDB Connection
let mongoUri = (process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm").trim();
if ((mongoUri.startsWith('"') && mongoUri.endsWith('"')) || (mongoUri.startsWith("'") && mongoUri.endsWith("'"))) {
    mongoUri = mongoUri.slice(1, -1).trim();
}
if (mongoUri.startsWith("MONGO_URI=")) {
    mongoUri = mongoUri.replace(/^MONGO_URI=/, "").trim();
}

const safeLogUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
console.log("Connecting to MongoDB:", safeLogUri);

mongoose.connect(mongoUri)
    .then(() => {
        console.log("MongoDB Connected ✅");
    })
    .catch((err) => console.log("DB Error:", err));

// ================= ROUTES =================

// Home Route
app.get("/", (req, res) => {
    res.send("CRM Backend Running 🚀");
});

// Status Route
app.get("/api/status", (req, res) => {
    res.json({
        status: "running"
    });
});

// ================= TASK ROUTES =================
app.use("/api/tasks", taskRoutes);

// ================= AUTH ROUTES =================
app.use("/api/auth", authRoutes);

// ================= GREEN BOOK / SUBJECTS ROUTES =================
app.use("/api/subjects", subjectsRoutes);

// ================= WORKSHOPS / SEMINARS ROUTES =================
app.use("/api/workshops", workshopsRoutes);

// ================= ACTIVITIES ROUTES =================
app.use("/api/activities", activitiesRoutes);

// ================= FACULTY DIRECTORY & PROFILES =================
app.use("/api/faculty", facultyRoutes);

// ================= RESEARCH PAPERS ROUTES =================
app.use("/api/papers", papersRoutes);

// ================= DEPARTMENTS ROUTES =================
app.use("/api/departments", departmentsRoutes);

// ================= PERFORMANCE ROUTES =================
app.use("/api/performance", performanceRoutes);

// ================= KPIs ROUTES =================
app.use("/api/kpis", kpisRoutes);

// ================= APPROVALS ROUTES =================
app.use("/api/approvals", approvalsRoutes);

// ================= AUDIT LOGS ROUTES =================
app.use("/api/audit-logs", auditLogsRoutes);

// ================= FEEDBACK ROUTES =================
app.use("/api/feedback", require("./routes/feedback"));

// ================= USER MANAGEMENT ROUTES =================
app.use("/api/users", userRoutes);

// ================= ORGANIZATION ROUTES =================
app.use("/api/organizations", organizationsRoutes);

// ================= NOTIFICATION ROUTES =================
app.use("/api/notifications", notificationsRoutes);

// ================= CERTIFICATIONS ROUTES =================
app.use("/api/certifications", certificationsRoutes);

// ================= ASSIGNMENTS ROUTES =================
app.use("/api/assignments", assignmentsRoutes);

// ================= OFFICIAL LETTERS ROUTES =================
app.use("/api/letters", lettersRoutes);

// ================= MY CLASSES ROUTES =================
app.use("/api/classes", classesRoutes);

// ================= TIMETABLE ROUTES =================
app.use("/api/timetable", timetableRoutes);

// ================= ATTENDANCE MANAGEMENT ROUTES =================
app.use("/api/attendance", attendanceManagementRoutes);

// ================= ASSIGNMENT MARKS ROUTES =================
app.use("/api/assignment-marks", assignmentMarksRoutes);

// ================= LEAVES MANAGEMENT ROUTES =================
app.use("/api/leaves", leavesRoutes);

// ================= NOTICES / ANNOUNCEMENTS ROUTES =================
app.use("/api/notices", noticesRoutes);

// ================= SUBMISSIONS ROUTES =================
app.use("/api/submissions", submissionRoutes);

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});

// Check Email Configuration
console.log("EMAIL:", process.env.EMAIL_USER);
console.log("PASS:", process.env.EMAIL_PASS ? "Loaded ✅" : "Missing ❌");