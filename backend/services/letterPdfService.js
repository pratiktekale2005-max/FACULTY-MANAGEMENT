const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Master college letterhead constants from official institutional format
const MASTER_LETTERHEAD = {
    societyName: "Dr. D. Y. Patil Educational Federation’s",
    collegeName: "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
    affiliation: "(An Autonomous Institute Affiliated to SPPU)",
    address: "Survey No. 27/A/1/2C, Varale Campus, Near Talegaon Railway Station, Tal. Maval, Dist. Pune 410 507, Ph: 020 48522561, 565,566",
    contact: "Web Site: www.dypcoei.edu.in, Email: principal.dypcoei@dypatilef.com",
    collegeLogoPath: path.join(__dirname, "..", "assets", "college_logo.jpeg"),
    naacLogoPath: path.join(__dirname, "..", "assets", "naac_logo.jpeg")
};

/**
 * Draws the fixed official institutional master letterhead.
 * @param {PDFDocument} doc
 * @param {number} topY
 */
function drawFixedLetterhead(doc, topY = 40) {
    // 1. Left Logo (College / Federation Crest)
    if (fs.existsSync(MASTER_LETTERHEAD.collegeLogoPath)) {
        try {
            doc.image(MASTER_LETTERHEAD.collegeLogoPath, 45, topY, { width: 55, height: 50 });
        } catch (e) {
            console.warn("Could not render college logo:", e.message);
        }
    }

    // 2. Right Logo (NAAC Grade A Accredited Seal)
    if (fs.existsSync(MASTER_LETTERHEAD.naacLogoPath)) {
        try {
            doc.image(MASTER_LETTERHEAD.naacLogoPath, 495, topY, { width: 55, height: 50 });
        } catch (e) {
            console.warn("Could not render NAAC logo:", e.message);
        }
    }

    // 3. Center Institutional Information (Preserved exactly as official master format)
    doc.font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("#800000")
        .text(MASTER_LETTERHEAD.societyName, 105, topY, { align: "center", width: 385 });

    doc.font("Helvetica-Bold")
        .fontSize(11.5)
        .fillColor("#1e1b4b")
        .text(MASTER_LETTERHEAD.collegeName, 105, topY + 13, { align: "center", width: 385 });

    doc.font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#334155")
        .text(MASTER_LETTERHEAD.affiliation, 105, topY + 28, { align: "center", width: 385 });

    doc.font("Helvetica")
        .fontSize(7)
        .fillColor("#64748b")
        .text(MASTER_LETTERHEAD.address, 105, topY + 40, { align: "center", width: 385 });

    doc.font("Helvetica")
        .fontSize(7)
        .fillColor("#64748b")
        .text(MASTER_LETTERHEAD.contact, 105, topY + 50, { align: "center", width: 385 });

    // 4. Dividing Rule (Maroon + Navy Double Rule)
    const ruleY = topY + 65;
    doc.moveTo(45, ruleY).lineTo(550, ruleY).lineWidth(1.2).strokeColor("#800000").stroke();
    doc.moveTo(45, ruleY + 2.5).lineTo(550, ruleY + 2.5).lineWidth(0.5).strokeColor("#1e1b4b").stroke();

    // 5. Letter Pad Designation Information: Dr. Alpana Adsul & Dr. Suresh Mali
    doc.font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor("#1e1b4b")
        .text("Dr. Alpana Adsul", 45, ruleY + 5, { align: "left", width: 250 });
    doc.font("Helvetica")
        .fontSize(6.5)
        .fillColor("#64748b")
        .text("Vice Principal / CE - HOD", 45, ruleY + 14, { align: "left", width: 250 });

    doc.font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor("#1e1b4b")
        .text("Dr. Suresh Mali", 300, ruleY + 5, { align: "right", width: 250 });
    doc.font("Helvetica")
        .fontSize(6.5)
        .fillColor("#64748b")
        .text("Principal", 300, ruleY + 14, { align: "right", width: 250 });

    return ruleY + 26;
}

/**
 * Draws official institutional footer.
 * @param {PDFDocument} doc
 */
function drawOfficialFooter(doc) {
    const bottomY = 785;
    doc.moveTo(45, bottomY - 5).lineTo(550, bottomY - 5).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
    doc.font("Helvetica")
        .fontSize(7)
        .fillColor("#64748b")
        .text(
            `${MASTER_LETTERHEAD.collegeName} • Varale Campus, Talegaon, Pune • Official Institutional Document`,
            45,
            bottomY,
            { align: "center", width: 505 }
        );
}

/**
 * Generates an official academic letter in PDF format with fixed letterhead and dynamic sender.
 * @param {Object} letterData
 * @returns {Promise<Buffer>}
 */
function generateOfficialLetterPdf(letterData = {}) {
    return new Promise((resolve, reject) => {
        try {
            const {
                refNo = `DYPCOEI/OFFICIAL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
                letterDate = new Date().toISOString().split("T")[0],
                letterType = "invitation", // "invitation" | "thanking" | "offer" | "appointment" | "official_comm"
                departmentName = "Department of Computer Science & Engineering",
                recipient = {},
                eventDetails = {},
                bodyText = "",
                sender = {},
                signatory = {},
                signatoryType = "single" // "single" | "three_party"
            } = letterData;

            const guestName = recipient.name || letterData.guestName || "Distinguished Expert";
            const guestDesignation = recipient.designation || letterData.guestDesignation || "";
            const guestOrg = recipient.organization || letterData.guestOrg || "";
            const guestAddress = recipient.address || letterData.guestAddress || "";
            
            const eventTitle = eventDetails.title || letterData.eventTitle || "Academic Session / Workshop";
            const eventDate = eventDetails.date || letterData.eventDate || letterDate;
            const eventTime = eventDetails.time || letterData.eventTime || "10:00 AM - 01:00 PM";
            const eventVenue = eventDetails.venue || letterData.eventVenue || "Seminar Hall / Campus Auditorium";
            const eventMode = eventDetails.mode || letterData.eventMode || "Offline";
            const lectureHours = eventDetails.lectureHours || letterData.lectureHours || 0;
            const remunerationRate = eventDetails.remunerationRate || letterData.remunerationRate || 0;
            const totalRemuneration = eventDetails.totalRemuneration || letterData.totalRemuneration || 0;

            const senderRole = sender.role || "Faculty";
            const senderName = sender.name || (senderRole === "Principal" ? "Dr. Suresh Mali" : "Faculty Member");
            const senderDesignation = sender.designation || (senderRole === "HOD" ? "Head of Department" : (senderRole === "Principal" ? "Principal" : "Assistant Professor"));
            const senderDept = sender.department || departmentName;

            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 40, bottom: 45, left: 45, right: 45 },
                info: {
                    Title: `${letterType.toUpperCase()}_${(eventTitle || guestName).replace(/\s+/g, "_")}`,
                    Author: MASTER_LETTERHEAD.collegeName,
                    Subject: `Official ${letterType} letter`
                }
            });

            const buffers = [];
            doc.on("data", chunk => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", err => reject(err));

            // Outer subtle border
            doc.rect(38, 32, 519, 775).lineWidth(0.8).strokeColor("#cbd5e1").stroke();

            // Fixed Master Letterhead
            let currentY = drawFixedLetterhead(doc, 42);

            // Department Sub-Header if applicable
            if (senderDept) {
                doc.font("Helvetica-Bold")
                    .fontSize(9.5)
                    .fillColor("#1e1b4b")
                    .text(senderDept.toUpperCase().includes("DEPARTMENT") ? senderDept.toUpperCase() : `DEPARTMENT OF ${senderDept.toUpperCase()}`, 45, currentY, { align: "center", width: 505 });
                currentY += 16;
            } else {
                currentY += 4;
            }

            // Reference Number & Date Row
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#334155").text("Ref. No.: ", 45, currentY, { continued: true });
            doc.font("Helvetica").text(refNo);

            doc.font("Helvetica-Bold").text("Date: ", 420, currentY, { continued: true });
            doc.font("Helvetica").text(new Date(letterDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }));

            currentY += 22;

            // Recipient Details
            doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1e293b").text("To,", 45, currentY);
            currentY += 14;
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(guestName, 45, currentY);
            currentY += 13;
            if (guestDesignation) {
                doc.font("Helvetica").fontSize(9).fillColor("#334155").text(guestDesignation, 45, currentY);
                currentY += 13;
            }
            if (guestOrg) {
                doc.font("Helvetica").fontSize(9).fillColor("#334155").text(guestOrg, 45, currentY);
                currentY += 13;
            }
            if (guestAddress) {
                doc.font("Helvetica").fontSize(8.5).fillColor("#64748b").text(guestAddress, 45, currentY, { width: 350 });
                currentY += doc.heightOfString(guestAddress, { width: 350 }) + 3;
            }

            currentY += 8;

            // Subject Line Box
            let subjectText = "";
            if (letterType === "invitation") {
                subjectText = `SUBJECT: Cordial Invitation as Resource Person / Guest Speaker for "${eventTitle}"`;
            } else if (letterType === "thanking") {
                subjectText = `SUBJECT: Heartfelt Gratitude & Letter of Appreciation for Session on "${eventTitle}"`;
            } else if (letterType === "offer") {
                subjectText = `SUBJECT: Offer & Terms of Engagement for Academic Session / Workshop on "${eventTitle}"`;
            } else if (letterType === "appointment") {
                subjectText = `SUBJECT: Official Appointment & Engagement Order`;
            } else {
                subjectText = `SUBJECT: Official Communication regarding "${eventTitle}"`;
            }

            if (letterData.subject && letterData.subject.trim()) {
                subjectText = `SUBJECT: ${letterData.subject.replace(/^SUBJECT:\s*/i, "")}`;
            }

            doc.rect(45, currentY, 505, 24).fillAndStroke("#f8fafc", "#cbd5e1");
            doc.font("Helvetica-Bold")
                .fontSize(8.5)
                .fillColor("#800000")
                .text(subjectText, 52, currentY + 7, { width: 490, ellipsis: true });

            currentY += 34;

            // Salutation
            doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1e293b").text("Respected Sir / Madam,", 45, currentY);
            currentY += 16;

            // Letter Body Content
            let mainContent = bodyText.trim();
            if (!mainContent) {
                if (letterType === "invitation") {
                    mainContent = `On behalf of ${MASTER_LETTERHEAD.collegeName}, it gives us immense pleasure to cordially invite you as our distinguished Resource Person / Guest Speaker for the session on "${eventTitle}". Your eminent research expertise and profound professional experience will be invaluable to our students and faculty members. We would be privileged to host you on our campus.`;
                } else if (letterType === "thanking") {
                    mainContent = `On behalf of ${MASTER_LETTERHEAD.collegeName}, we express our deepest gratitude and sincere appreciation for delivering an inspiring and intellectually stimulating session on "${eventTitle}". Your valuable insights and interactive delivery received overwhelming appreciation from all attendees. We sincerely value your association with our institution and look forward to continued academic collaboration.`;
                } else if (letterType === "offer") {
                    mainContent = `We are pleased to offer you the engagement as Guest Speaker / Workshop Trainer for conducting the professional session on "${eventTitle}". The session is designed to provide practical technical exposure to our students and faculty members in line with industry standards.`;
                } else {
                    mainContent = `This is an official communication from ${MASTER_LETTERHEAD.collegeName} regarding the scheduled academic event "${eventTitle}".`;
                }
            }

            doc.font("Helvetica")
                .fontSize(9.5)
                .fillColor("#1e293b")
                .text(mainContent, 45, currentY, { width: 505, align: "justify", lineGap: 3 });

            currentY = doc.y + 12;

            // Session Details Table (For invitation or offer letters)
            if (letterType === "invitation" || letterType === "offer") {
                const tableH = letterType === "offer" && totalRemuneration > 0 ? 95 : 75;
                doc.rect(45, currentY, 505, tableH).fillAndStroke("#f1f5f9", "#cbd5e1");
                doc.font("Helvetica-Bold")
                    .fontSize(8.5)
                    .fillColor("#1e1b4b")
                    .text("Program Schedule & Session Logistics:", 55, currentY + 7);

                let tY = currentY + 22;
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("Event Theme:", 55, tY);
                doc.font("Helvetica").fontSize(8).fillColor("#0f172a").text(eventTitle, 145, tY, { width: 395, ellipsis: true });

                tY += 13;
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("Date & Time:", 55, tY);
                doc.font("Helvetica").fontSize(8).fillColor("#0f172a").text(`${eventDate} | ${eventTime}`, 145, tY);

                tY += 13;
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("Mode & Venue:", 55, tY);
                doc.font("Helvetica").fontSize(8).fillColor("#0f172a").text(`${eventMode} (${eventVenue})`, 145, tY);

                if (letterType === "offer" && (totalRemuneration > 0 || remunerationRate > 0)) {
                    tY += 13;
                    doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("Approved Honorarium:", 55, tY);
                    doc.font("Helvetica-Bold").fontSize(8).fillColor("#059669")
                        .text(`INR ${Number(totalRemuneration || (lectureHours * remunerationRate)).toLocaleString("en-IN")} (${lectureHours} Hours @ INR ${remunerationRate}/hr)`, 145, tY);
                }

                currentY += tableH + 12;
            }

            // Closing Line
            const closingText = letterType === "invitation"
                ? "We eagerly look forward to receiving your favorable confirmation. Please feel free to communicate with us for any coordination, travel, or presentation requirements."
                : (letterType === "thanking"
                    ? "Thank you once again for your valuable time and contribution to academic excellence."
                    : "Kindly confirm receipt of this official letter for our institutional records.");

            doc.font("Helvetica")
                .fontSize(9.5)
                .fillColor("#1e293b")
                .text(closingText, 45, currentY, { width: 505, align: "justify", lineGap: 3 });

            // Signatures Section (Section 8 of prompt)
            const sigY = 665;

            if (signatoryType === "three_party") {
                // Three-party official signature block (Coordinator, HOD, Principal)
                const colW = 150;

                // Faculty Coordinator
                doc.moveTo(45, sigY).lineTo(45 + colW, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
                doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text(senderRole === "Faculty" ? senderName : "Faculty Coordinator", 45, sigY + 5, { width: colW, align: "center" });
                doc.font("Helvetica").fontSize(7.5).fillColor("#4338ca").text("Faculty", 45, sigY + 16, { width: colW, align: "center" });
                doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(senderDept ? `Dept. of ${senderDept}` : "Academic Dept.", 45, sigY + 26, { width: colW, align: "center", ellipsis: true });

                // HOD / Vice Principal
                doc.moveTo(222, sigY).lineTo(222 + colW, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
                doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("Dr. Alpana Adsul", 222, sigY + 5, { width: colW, align: "center" });
                doc.font("Helvetica").fontSize(7.5).fillColor("#4338ca").text("Vice Principal / CE - HOD", 222, sigY + 16, { width: colW, align: "center" });
                doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(senderDept ? `Dept. of ${senderDept}` : "Academic Affairs", 222, sigY + 26, { width: colW, align: "center", ellipsis: true });

                // Principal
                doc.moveTo(395, sigY).lineTo(395 + colW, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
                doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("Dr. Suresh Mali", 395, sigY + 5, { width: colW, align: "center" });
                doc.font("Helvetica").fontSize(7.5).fillColor("#4338ca").text("Principal", 395, sigY + 16, { width: colW, align: "center" });
                doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(MASTER_LETTERHEAD.collegeName, 395, sigY + 26, { width: colW, align: "center", ellipsis: true });
            } else {
                // Role-based single authorized sender signature block (Section 8 of prompt)
                doc.font("Helvetica").fontSize(9.5).fillColor("#1e293b").text("Regards,", 350, sigY - 20);

                doc.moveTo(350, sigY + 25).lineTo(540, sigY + 25).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
                
                doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(senderName, 350, sigY + 30);
                
                if (senderRole === "HOD") {
                    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#4338ca").text("Vice Principal / CE - HOD", 350, sigY + 43);
                    doc.font("Helvetica").fontSize(8).fillColor("#475569").text(`Department of ${senderDept}`, 350, sigY + 54);
                    doc.font("Helvetica").fontSize(7.5).fillColor("#64748b").text(MASTER_LETTERHEAD.collegeName, 350, sigY + 65, { width: 195 });
                } else if (senderRole === "Principal") {
                    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#4338ca").text("Principal", 350, sigY + 43);
                    doc.font("Helvetica").fontSize(7.5).fillColor("#64748b").text(MASTER_LETTERHEAD.collegeName, 350, sigY + 54, { width: 195 });
                } else {
                    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#4338ca").text("Faculty", 350, sigY + 43);
                    doc.font("Helvetica").fontSize(8).fillColor("#475569").text(senderDesignation && senderDesignation !== "Faculty" ? `${senderDesignation} • Dept. of ${senderDept}` : `Department of ${senderDept}`, 350, sigY + 54);
                    doc.font("Helvetica").fontSize(7.5).fillColor("#64748b").text(MASTER_LETTERHEAD.collegeName, 350, sigY + 65, { width: 195 });
                }
            }

            // Institutional Footer
            drawOfficialFooter(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Generates an official Workshop Summary / Final Report in PDF format.
 * Matches the official institutional format from Incubation Centre Report.docx.
 * @param {Object} reportData
 * @returns {Promise<Buffer>}
 */
function generateWorkshopSummaryPdf(reportData = {}) {
    return new Promise((resolve, reject) => {
        try {
            const {
                title = "Workshop on Emerging Technologies",
                department = "Computer Science & Engineering",
                organizer = "Incubation Centre & Dept of CSE",
                date = new Date().toISOString().split("T")[0],
                time = "11:00 AM – 01:00 PM",
                mode = "Offline",
                venue = "Seminar Hall / Room No. 206, DYPCOEI",
                typeOfActivity = "Entrepreneurship, Innovation & Technical Workshop",
                speakerName = "Distinguished Resource Person",
                speakerDesignation = "Senior Technical Consultant",
                speakerOrganization = "Industry Enterprise",
                facultyCoordinator = "Mr. Swami Panjala",
                hodName = "Dr. Alpana Adsul",
                principalName = "Dr. Suresh Mali",
                objectives = [],
                description = "",
                outcomes = [],
                photos = [],
                stats = {},
                postAssessment = null
            } = reportData;

            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 40, bottom: 45, left: 45, right: 45 },
                bufferPages: true,
                info: {
                    Title: `ACTIVITY_REPORT_${title.replace(/\s+/g, "_")}`,
                    Author: MASTER_LETTERHEAD.collegeName,
                    Subject: `Official Activity Report on ${title}`
                }
            });

            const buffers = [];
            doc.on("data", chunk => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", err => reject(err));

            // PAGE 1: COVER & EVENT DETAILS & OBJECTIVES
            // Border
            doc.rect(38, 32, 519, 775).lineWidth(0.8).strokeColor("#cbd5e1").stroke();

            // Fixed Master Letterhead
            let currentY = drawFixedLetterhead(doc, 42);

            // Report Title Banner (Centered with fill)
            currentY += 6;
            doc.rect(45, currentY, 505, 34).fillAndStroke("#1e1b4b", "#1e1b4b");
            doc.font("Helvetica-Bold")
                .fontSize(10.5)
                .fillColor("#ffffff")
                .text(`ACTIVITY REPORT ON ${title.toUpperCase()}`, 50, currentY + 7, { align: "center", width: 495 });
            doc.font("Helvetica")
                .fontSize(8)
                .fillColor("#c7d2fe")
                .text(`Organized By: ${organizer || `Department of ${department}, DYPCOEI`}`, 50, currentY + 21, { align: "center", width: 495 });

            currentY += 44;

            // Section 1: Event Details Box
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#800000").text("1. EVENT DETAILS", 45, currentY);
            currentY += 14;

            const detailsTableH = 120;
            doc.rect(45, currentY, 505, detailsTableH).fillAndStroke("#f8fafc", "#cbd5e1");

            const col1 = 55;
            const col2 = 300;
            let dY = currentY + 8;

            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Event Title: ", col1, dY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0f172a").text(title, { width: 230, ellipsis: true });

            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Date: ", col2, dY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));

            dY += 14;
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Time: ", col1, dY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(time);

            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Mode & Venue: ", col2, dY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(`${mode} (${venue})`, { width: 230, ellipsis: true });

            dY += 14;
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Type of Activity: ", col1, dY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(typeOfActivity, { width: 230, ellipsis: true });

            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Department: ", col2, dY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(department);

            dY += 14;
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Resource Person: ", col1, dY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0f172a").text(`${speakerName} (${speakerDesignation}, ${speakerOrganization})`, { width: 440, ellipsis: true });

            dY += 14;
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Faculty Coordinator: ", col1, dY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(facultyCoordinator);

            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("• Principal: ", col2, dY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0f172a").text(`${principalName} Sir`);

            currentY += detailsTableH + 16;

            // Section 2: Objectives
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#800000").text("2. OBJECTIVES", 45, currentY);
            currentY += 14;

            const defaultObjectives = [
                `To introduce students to practical skills and modern paradigms in ${title}.`,
                "To promote innovation, critical inquiry, and technical competencies among attendees.",
                "To provide a live platform for interactive engagement with senior industry / academic experts.",
                "To demonstrate real-world case studies and practical implementations.",
                "To align departmental academic delivery with contemporary technological advancements."
            ];

            const activeObjectives = (objectives && objectives.length > 0) ? objectives : defaultObjectives;
            activeObjectives.forEach((obj) => {
                doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b").text(`•  ${obj}`, 55, currentY, { width: 490, lineGap: 2 });
                currentY = doc.y + 4;
            });

            currentY += 10;

            // Section 3: Event Summary
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#800000").text("3. EVENT SUMMARY & PROCEEDINGS", 45, currentY);
            currentY += 14;

            const defaultSummary = `The "${title}" event was successfully conducted on ${new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} at ${venue}. The session commenced with a formal welcome of the distinguished guest ${speakerName} by student coordinators and faculty. The formal inaugural ceremony was followed by lighting of the lamp and opening remarks by Principal ${principalName}. The resource person delivered a comprehensive session enriched with practical demonstrations, answering student queries, and highlighting key career pathways.`;
            const summaryText = description.trim() || defaultSummary;

            doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b").text(summaryText, 45, currentY, { width: 505, align: "justify", lineGap: 2.5 });
            currentY = doc.y + 14;

            // Section 4: Outcomes
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#800000").text("4. OUTCOMES OF THE EVENT", 45, currentY);
            currentY += 14;

            const defaultOutcomes = [
                "Enhanced technical proficiency and conceptual clarity in the subject domain.",
                "Real-time exposure to industry frameworks, tools, and best engineering practices.",
                "Active participation and positive feedback from students and faculty members.",
                "Actionable insights into research and entrepreneurship opportunities."
            ];

            const activeOutcomes = (outcomes && outcomes.length > 0) ? outcomes : defaultOutcomes;
            activeOutcomes.forEach((out) => {
                doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b").text(`✓  ${out}`, 55, currentY, { width: 490, lineGap: 2 });
                currentY = doc.y + 4;
            });

            drawOfficialFooter(doc);

            // PAGE 2: EVENT GLIMPSES / GALLERY & SIGNATURES
            doc.addPage();
            doc.rect(38, 32, 519, 775).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
            currentY = drawFixedLetterhead(doc, 42);

            // Glimpses Header
            currentY += 8;
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#800000").text("5. GLIMPSES & PHOTOGRAPHS", 45, currentY);
            currentY += 14;

            // Render uploaded photos if available
            const validPhotos = (photos || []).filter(p => typeof p === "string" && p.startsWith("data:image"));
            if (validPhotos.length > 0) {
                const imgW = 240;
                const imgH = 135;
                const colGap = 15;
                const rowGap = 20;

                const displayPhotos = validPhotos.slice(0, 4);
                displayPhotos.forEach((pBase64, idx) => {
                    const row = Math.floor(idx / 2);
                    const col = idx % 2;
                    const x = 45 + col * (imgW + colGap);
                    const y = currentY + row * (imgH + rowGap);

                    try {
                        const base64Data = pBase64.replace(/^data:image\/\w+;base64,/, "");
                        const imgBuf = Buffer.from(base64Data, "base64");
                        doc.image(imgBuf, x, y, { width: imgW, height: imgH, fit: [imgW, imgH] });
                        doc.rect(x, y, imgW, imgH).lineWidth(0.5).strokeColor("#94a3b8").stroke();
                        doc.font("Helvetica").fontSize(7.5).fillColor("#475569").text(`Figure ${idx + 1}: Workshop Session & Participant Interaction`, x, y + imgH + 4, { width: imgW, align: "center" });
                    } catch (e) {
                        console.warn("Could not embed workshop photo in PDF:", e.message);
                    }
                });

                currentY += Math.ceil(displayPhotos.length / 2) * (imgH + rowGap) + 15;
            } else {
                doc.rect(45, currentY, 505, 100).fillAndStroke("#f8fafc", "#cbd5e1");
                doc.font("Helvetica").fontSize(9).fillColor("#94a3b8").text("Photographs and session gallery recorded in event repository.", 45, currentY + 45, { align: "center", width: 505 });
                currentY += 120;
            }

            // Post Assessment Summary if available
            if (postAssessment) {
                doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#800000").text("6. PARTICIPANT POST-ASSESSMENT & FEEDBACK", 45, currentY);
                currentY += 12;
                doc.rect(45, currentY, 505, 45).fillAndStroke("#ecfdf5", "#a7f3d0");
                doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#065f46")
                    .text(`Average Overall Rating: ${postAssessment.averageScore || "4.8"}/5.0 • Total Feedback Responses: ${postAssessment.totalResponses || "45+"}`, 55, currentY + 10);
                doc.font("Helvetica").fontSize(8).fillColor("#047857")
                    .text("Evaluation parameters: Content Delivery, Technical Rigor, Objectives Attainment, and Practical Relevance.", 55, currentY + 24);
                currentY += 60;
            }

            // Signatures Section at bottom of page 2 (Exact from paragraph 95-100 of Incubation Centre Report.docx)
            const sigY = 675;
            const sigW = 150;

            // 1. Faculty Coordinator (Mr. Swami Panjala)
            doc.moveTo(45, sigY).lineTo(45 + sigW, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(facultyCoordinator, 45, sigY + 5, { width: sigW, align: "center" });
            doc.font("Helvetica").fontSize(8).fillColor("#64748b").text("Faculty Coordinator", 45, sigY + 17, { width: sigW, align: "center" });
            doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text(department, 45, sigY + 28, { width: sigW, align: "center", ellipsis: true });

            // 2. HOD (Dr. Alpana Adsul)
            doc.moveTo(222, sigY).lineTo(222 + sigW, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(hodName || "Dr. Alpana Adsul", 222, sigY + 5, { width: sigW, align: "center" });
            doc.font("Helvetica").fontSize(8).fillColor("#64748b").text("Vice Principal / CE - HOD", 222, sigY + 17, { width: sigW, align: "center" });
            doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text(`Dept. of ${department}`, 222, sigY + 28, { width: sigW, align: "center" });

            // 3. Principal (Dr. Suresh Mali)
            doc.moveTo(395, sigY).lineTo(395 + sigW, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(principalName, 395, sigY + 5, { width: sigW, align: "center" });
            doc.font("Helvetica").fontSize(8).fillColor("#64748b").text("Principal", 395, sigY + 17, { width: sigW, align: "center" });
            doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text(MASTER_LETTERHEAD.collegeName, 395, sigY + 28, { width: sigW, align: "center", ellipsis: true });

            drawOfficialFooter(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Legacy wrapper for backward compatibility.
 */
function generateLetterPdf(letterData = {}) {
    return generateOfficialLetterPdf(letterData);
}

/**
 * Generates an official Remuneration & Honorarium Report in PDF format.
 * Uses master fixed college letterhead.
 */
function generateRemunerationPdf(data = {}) {
    return new Promise((resolve, reject) => {
        try {
            const {
                voucherNo = `REM/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
                reportDate = new Date().toISOString().split("T")[0],
                departmentName = "Department of Computer Science & Engineering",
                guestName = "Distinguished Resource Person",
                guestDesignation = "Industry Expert",
                guestOrg = "Technical Enterprise",
                contactNumber = "",
                eventTitle = "Guest Lecture Session",
                eventDate = new Date().toISOString().split("T")[0],
                lectureDetails = "Technical Delivery & Hands-on Demonstration",
                lectureHours = 2,
                ratePerHour = 1500,
                totalRemuneration = 3000,
                otherAmount = 0,
                totalPayable = 3000,
                accountHolderName = "",
                bankName = "",
                accountNumber = "",
                ifscCode = "",
                branchName = "",
                panNumber = "",
                organizerName = "Faculty Coordinator",
                hodName = "Head of Department",
                principalName = "Dr. Suresh Mali"
            } = data;

            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 40, bottom: 45, left: 45, right: 45 },
                info: {
                    Title: `Remuneration_Voucher_${guestName.replace(/\s+/g, "_")}`,
                    Author: MASTER_LETTERHEAD.collegeName,
                    Subject: "Official Remuneration Voucher"
                }
            });

            const buffers = [];
            doc.on("data", chunk => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", err => reject(err));

            doc.rect(38, 32, 519, 775).lineWidth(0.8).strokeColor("#cbd5e1").stroke();

            // Fixed Master Letterhead
            let currentY = drawFixedLetterhead(doc, 42);

            // Title Banner
            currentY += 6;
            doc.rect(45, currentY, 505, 24).fillAndStroke("#1e1b4b", "#1e1b4b");
            doc.font("Helvetica-Bold")
                .fontSize(9.5)
                .fillColor("#ffffff")
                .text("OFFICIAL REMUNERATION & HONORARIUM VOUCHER", 45, currentY + 6, { align: "center", width: 505 });

            currentY += 34;

            // Voucher Reference & Date
            doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#334155").text("Voucher No: ", 45, currentY, { continued: true });
            doc.font("Helvetica").text(voucherNo);

            doc.font("Helvetica-Bold").text("Date: ", 430, currentY, { continued: true });
            doc.font("Helvetica").text(reportDate);

            currentY += 16;

            // Lecturer Information Block
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#800000").text("1. LECTURER / RESOURCE PERSON INFORMATION", 45, currentY);
            currentY += 13;

            doc.rect(45, currentY, 505, 68).fillAndStroke("#f8fafc", "#cbd5e1");

            let infoY = currentY + 8;
            const infoCol1 = 55;
            const infoCol2 = 310;

            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("Resource Person Name: ", infoCol1, infoY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0f172a").text(guestName);

            doc.font("Helvetica-Bold").fillColor("#475569").text("Designation: ", infoCol2, infoY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(guestDesignation || "—");

            infoY += 14;
            doc.font("Helvetica-Bold").fillColor("#475569").text("Organization / Affiliation: ", infoCol1, infoY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(guestOrg || "—", { width: 230, ellipsis: true });

            doc.font("Helvetica-Bold").fillColor("#475569").text("Event Date: ", infoCol2, infoY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(eventDate || "—");

            infoY += 14;
            doc.font("Helvetica-Bold").fillColor("#475569").text("Workshop / Event Title: ", infoCol1, infoY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(eventTitle || "—", { width: 230, ellipsis: true });

            doc.font("Helvetica-Bold").fillColor("#475569").text("Work / Session Hours: ", infoCol2, infoY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0284c7").text(`${lectureHours || 0} Hours`);

            currentY += 80;

            // Payment Table
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#800000").text("2. REMUNERATION & HONORARIUM BREAKDOWN", 45, currentY);
            currentY += 13;

            const tblX = 45;
            const col1W = 280;
            const rowH = 17;

            doc.rect(tblX, currentY, 505, rowH).fillAndStroke("#1e1b4b", "#1e1b4b");
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff")
                .text("PARTICULAR / DESCRIPTION", tblX + 12, currentY + 4)
                .text("DETAILS & AMOUNT (INR)", tblX + col1W + 12, currentY + 4);
            currentY += rowH;

            const tableRows = [
                { label: "Resource Person / Lecturer Name", value: guestName },
                { label: "Lecture / Work Hours Delivered", value: `${lectureHours || 0} Hours` },
                { label: "Approved Rate per Hour", value: `INR ${Number(ratePerHour || 0).toLocaleString("en-IN")}` },
                { label: "Total Remuneration (Hours × Rate)", value: `INR ${Number(totalRemuneration || 0).toLocaleString("en-IN")}` },
                { label: "Other Applicable Amount (TA / Conveyance)", value: `INR ${Number(otherAmount || 0).toLocaleString("en-IN")}` },
                { label: "TOTAL PAYABLE AMOUNT", value: `INR ${Number(totalPayable || 0).toLocaleString("en-IN")}`, isTotal: true }
            ];

            tableRows.forEach((r, idx) => {
                const bg = r.isTotal ? "#ecfdf5" : (idx % 2 === 0 ? "#ffffff" : "#f8fafc");
                const border = r.isTotal ? "#059669" : "#e2e8f0";

                doc.rect(tblX, currentY, 505, rowH).fillAndStroke(bg, border);

                doc.font(r.isTotal ? "Helvetica-Bold" : "Helvetica")
                    .fontSize(r.isTotal ? 8.5 : 8)
                    .fillColor(r.isTotal ? "#065f46" : "#334155")
                    .text(r.label, tblX + 12, currentY + 4);

                doc.font(r.isTotal ? "Helvetica-Bold" : "Helvetica")
                    .fontSize(r.isTotal ? 9 : 8)
                    .fillColor(r.isTotal ? "#047857" : "#0f172a")
                    .text(r.value, tblX + col1W + 12, currentY + 4);

                currentY += rowH;
            });

            currentY += 14;

            // Bank Account Details
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#800000").text("3. BANK ACCOUNT DETAILS FOR ELECTRONIC REMITTANCE", 45, currentY);
            currentY += 13;

            doc.rect(tblX, currentY, 505, 78).fillAndStroke("#f8fafc", "#cbd5e1");

            let accY = currentY + 8;
            const accCol1 = 55;
            const accCol2 = 310;

            doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("Account Holder Name: ", accCol1, accY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0f172a").text(accountHolderName || guestName || "—");

            doc.font("Helvetica-Bold").fillColor("#475569").text("Bank Name: ", accCol2, accY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(bankName || "—");

            accY += 14;
            doc.font("Helvetica-Bold").fillColor("#475569").text("Account Number: ", accCol1, accY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0284c7").text(accountNumber || "—");

            doc.font("Helvetica-Bold").fillColor("#475569").text("IFSC Code: ", accCol2, accY, { continued: true });
            doc.font("Helvetica-Bold").fillColor("#0284c7").text(ifscCode || "—");

            accY += 14;
            doc.font("Helvetica-Bold").fillColor("#475569").text("Bank Branch: ", accCol1, accY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(branchName || "—");

            doc.font("Helvetica-Bold").fillColor("#475569").text("PAN / Tax ID: ", accCol2, accY, { continued: true });
            doc.font("Helvetica").fillColor("#0f172a").text(panNumber || "—");

            accY += 14;
            doc.font("Helvetica").fontSize(7).fillColor("#64748b")
                .text("Declaration: Certified that the lecture was duly conducted and payment is recommended for sanction.", 55, accY, { width: 485 });

            // Signatures Area
            const sigY = 665;
            const sigWidth = 150;

            // Signature 1: Organized By Faculty
            doc.moveTo(45, sigY).lineTo(45 + sigWidth, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
            doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text(organizerName, 45, sigY + 5, { width: sigWidth, align: "center" });
            doc.font("Helvetica").fontSize(7.5).fillColor("#64748b").text("Organized By Faculty", 45, sigY + 16, { width: sigWidth, align: "center" });
            doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text("Event Facilitator", 45, sigY + 26, { width: sigWidth, align: "center" });

            // Signature 2: HOD / Vice Principal
            doc.moveTo(222, sigY).lineTo(222 + sigWidth, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
            doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text(hodName || "Dr. Alpana Adsul", 222, sigY + 5, { width: sigWidth, align: "center" });
            doc.font("Helvetica").fontSize(7.5).fillColor("#64748b").text("Vice Principal / CE - HOD", 222, sigY + 16, { width: sigWidth, align: "center" });
            doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text(departmentName, 222, sigY + 26, { width: sigWidth, align: "center", ellipsis: true });

            // Signature 3: Principal
            doc.moveTo(395, sigY).lineTo(395 + sigWidth, sigY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
            doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text(principalName, 395, sigY + 5, { width: sigWidth, align: "center" });
            doc.font("Helvetica").fontSize(7.5).fillColor("#64748b").text("Principal", 395, sigY + 16, { width: sigWidth, align: "center" });
            doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text(MASTER_LETTERHEAD.collegeName, 395, sigY + 26, { width: sigWidth, align: "center", ellipsis: true });

            drawOfficialFooter(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    MASTER_LETTERHEAD,
    generateOfficialLetterPdf,
    generateWorkshopSummaryPdf,
    generateLetterPdf,
    generateRemunerationPdf
};
