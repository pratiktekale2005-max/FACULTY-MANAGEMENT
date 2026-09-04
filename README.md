# 🎓 Faculty Activity Management (CRM & Academic ERP)

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-emerald?logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-ISC-purple)

A unified academic governance and activity lifecycle platform built for higher education institutions, engineering colleges, and universities. Designed with a role-based access control (RBAC) architecture, the system provides automated faculty activity tracking, multi-tier approval workflows, weighted KPI performance calculations, formal institutional appointment letter generation, and student course evaluations.

---

## 🏛️ System Architecture

```text
                                  +-----------------------------+
                                  |   React 19 Dark UI Client   |
                                  | (Tailwind CSS, Glassmorphism)|
                                  +--------------+--------------+
                                                 |
                                     HTTPS / REST (JWT Bearer)
                                                 |
                                  +--------------v--------------+
                                  |     Express.js API Server   |
                                  |   (Port 5000 / Helmet/ CORS)|
                                  +--------------+--------------+
                                                 |
            +---------------------+--------------+--------------------+
            |                     |                                   |
+-----------v-----------+  +------v--------------------+  +-----------v-----------+
| Multi-Tier RBAC &     |  | Approval & Performance    |  | Letter Generator &   |
| Tenant Middleware     |  | Calculation Engine        |  | Nodemailer OTP Engine |
+-----------+-----------+  +------+--------------------+  +-----------+-----------+
            |                     |                                   |
            +---------------------+--------------+--------------------+
                                                 |
                                  +--------------v--------------+
                                  |   MongoDB (Mongoose Schemas)|
                                  |    20+ Structured Models    |
                                  +-----------------------------+
```

---

## ✨ Key Features

### 1. 🔐 Role-Based Access Control (RBAC) & Multi-Tenancy
- **Principal / Dean**: Institution-wide governance, cross-department analytics, institution profile & branding configuration, faculty recruitment orders, and full approval authority.
- **Head of Department (HOD)**: Department-isolated administration, faculty activity review/approval, department KPI targets, and departmental appointment letter issuance.
- **Faculty**: Academic activity submission (papers, workshops, certifications, tasks, green book), personal target progress tracker, and student feedback reviews.
- **Strict Data Isolation**: Tenant boundaries (`organizationId`) and department filters (`requireDepartmentIsolation`) ensure zero unauthorized cross-department data access.

### 2. 📝 Academic Activity Hub
- **Research Papers**: Title, journal/conference indexing (Scopus, Web of Science, UGC CARE), publication date, DOI, and citations.
- **Workshops & FDPs**: Event type, organizing body, duration, attendance proofs, and status tracking.
- **Certifications & Upskilling**: Professional certifications, issuing bodies, completion dates, and credential uploads.
- **Assignments & Tasks**: Task delegation from leadership with deadline alerts and tracking.
- **Green Book Logging**: Structured periodic instructional diary for academic audit readiness.

### 3. 🔄 Reusable Multi-Level Approval Engine
- Hierarchical submission: `Faculty` $\rightarrow$ `HOD Review` $\rightarrow$ `Principal Approval`.
- Timeline history tracking with timestamps, reviewer remarks, rejection rationale, and returned draft revisions.
- Real-time notification triggers upon approval or status modifications.

### 4. 📊 Weighted KPI & Performance Engine
- Quantitative evaluation metrics with configurable department targets per academic semester.
- Automatic status transitions: `NOT_STARTED`, `IN_PROGRESS`, `ACHIEVED`, `EXCEEDED`, `OVERDUE`.
- Real-time recalculation of faculty performance scores upon verified activity approvals.

### 5. ✉️ Official Institutional Letter Generator & Print-to-PDF
- Built-in document generator for formal institutional documentation:
  - **Invitation Letters** (Guest lectures, keynote speakers, workshops)
  - **Thank You Letters** (Post-event appreciation letters)
  - **Faculty Appointment Letters** (Formal employment orders, probationary terms, pay scale)
  - **HOD Appointment Letters** (Department leadership assignment orders)
- Dynamic auto-filling with registered faculty profile information.
- Dedicated print stylesheet optimized for standard **A4 portrait PDF exports**.

### 6. ⭐ Student Course Evaluation & Feedback
- Anonymous course and faculty instructional evaluations.
- Quantitative rating analytics and aggregated comment sentiments.

---

## 🗂️ Project Structure

```text
Faculty Activity Management/
├── backend/
│   ├── .env.example             # Template for environment variables
│   ├── check_approvals.js       # Diagnostic approval workflow utility
│   ├── check_compliance.js      # Programmatic multi-tenant compliance checker
│   ├── check_db.js              # Database connection & collection tester
│   ├── check_departments.js     # Department hierarchy verification script
│   ├── drop_old_indexes.js      # MongoDB index maintenance script
│   ├── package.json             # Backend dependencies and scripts
│   ├── server.js                # Express app entrypoint & middleware registry
│   │
│   ├── models/                  # 20+ Mongoose schemas
│   │   ├── Activity.js          ├── Document.js          ├── Paper.js
│   │   ├── Approval.js          ├── Feedback.js          ├── PerformanceCriteria.js
│   │   ├── Assignment.js        ├── KPI.js               ├── Report.js
│   │   ├── Attendance.js        ├── Leave.js             ├── Subject.js
│   │   ├── AuditLog.js          ├── Notification.js      ├── Task.js
│   │   ├── Certification.js     ├── Organization.js      ├── User.js
│   │   ├── Department.js        ├── OtpRequest.js        └── Workshop.js
│   │
│   ├── routes/                  # REST API endpoints & route handlers
│   │   ├── activities.js        ├── faculty.js           ├── papers.js
│   │   ├── approvals.js         ├── feedback.js          ├── performance.js
│   │   ├── assignments.js       ├── kpis.js              ├── subjects.js
│   │   ├── auditLogs.js         ├── letters.js           ├── taskRoutes.js
│   │   ├── auth.js              ├── notifications.js     ├── userRoutes.js
│   │   ├── authMiddleware.js    ├── organizations.js     └── workshops.js
│   │   ├── certifications.js    ├── otp.js
│   │   └── departments.js
│   │
│   ├── services/
│   │   └── emailService.js      # Nodemailer OTP email dispatch service
│   │
│   └── frontend/                # React single page application
│       ├── package.json
│       ├── public/
│       └── src/
│           ├── components/      # UI components & dashboard tabs
│           │   ├── ActivitiesPanel.js
│           │   ├── AnalyticsPanel.js
│           │   ├── ApprovalCenter.js
│           │   ├── DepartmentManagement.js
│           │   ├── FacultyManagement.js
│           │   ├── FacultyPerformance.js
│           │   ├── HODDashboard.js
│           │   ├── InvitationsLetters.js
│           │   ├── KPIManagement.js
│           │   ├── OrganizationSettings.js
│           │   ├── PapersPanel.js
│           │   ├── StudentFeedback.js
│           │   ├── UserManagement.js
│           │   └── ...
│           ├── pages/
│           │   ├── Dashboard.js
│           │   ├── Login.js
│           │   ├── Onboarding.js
│           │   └── VerifyOTP.js
│           ├── services/
│           │   └── api.js       # Central Axios client with token interceptor
│           └── index.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (v9 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas connection string)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/pratiktekale2005-max/FACULTY-MANAGEMENT.git
cd FACULTY-MANAGEMENT
```

---

### Step 2: Configure Environment Variables
Inside the `backend/` directory:
```bash
cd backend
cp .env.example .env
```
Edit `.env` with your preferred settings:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/crm
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_institution_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

### Step 3: Install Dependencies & Run Backend
```bash
# In the backend directory
npm install
npm run dev
```
The Express API will boot up on **`http://localhost:5000`**.

---

### Step 4: Install Dependencies & Run Frontend
In a new terminal window:
```bash
cd backend/frontend
npm install
npm start
```
The application will launch automatically in your browser at **`http://localhost:3000`**.

---

## 📡 Core API Endpoints

| Resource | Method | Endpoint | Access Level |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Public |
| **OTP** | `POST` | `/api/otp/send-otp` | Public |
| **OTP** | `POST` | `/api/otp/verify-otp` | Public |
| **Users** | `GET` | `/api/users` | Principal, HOD |
| **Users** | `POST` | `/api/users` | Principal |
| **Departments** | `GET`, `POST` | `/api/departments` | Principal |
| **Letters** | `GET` | `/api/letters/templates` | Principal, HOD |
| **KPIs** | `GET`, `POST` | `/api/kpis` | Authenticated |
| **Approvals** | `GET`, `POST` | `/api/approvals` | Authenticated |
| **Papers** | `GET`, `POST` | `/api/papers` | Authenticated |
| **Workshops** | `GET`, `POST` | `/api/workshops` | Authenticated |
| **Feedback** | `GET`, `POST` | `/api/feedback` | Authenticated |
| **Audit Logs**| `GET` | `/api/audit-logs` | Principal |

---

## 🛡️ Security & Hardening
- **Security Headers**: Powered by `helmet` to mitigate cross-site scripting (XSS) and clickjacking.
- **NoSQL Injection Sanitization**: All incoming payloads sanitized via `mongo-sanitize`.
- **API Rate Limiting**: Brute-force protection on authentication and OTP endpoints using `express-rate-limit`.
- **Stateless Tokens**: Protected via cryptographically signed JWTs with expiration controls.

---

## 📄 License
This project is open-source and licensed under the [ISC License](LICENSE).
