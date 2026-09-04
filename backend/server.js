require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

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

// Create app
const app = express();

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP to allow loading base64 images locally
app.use(cors());

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 minutes
    message: { error: "Too many requests from this IP, please try again later ⏱️" }
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

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm")
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

// ================= SERVER START =================
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} 🚀`);
});

// Check Email Configuration
console.log("EMAIL:", process.env.EMAIL_USER);
console.log("PASS:", process.env.EMAIL_PASS ? "Loaded ✅" : "Missing ❌");