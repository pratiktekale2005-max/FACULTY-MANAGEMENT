const nodemailer = require("nodemailer");

const sendOtpEmail = async (userEmail, userName, otpCode) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP Credentials (EMAIL_USER/EMAIL_PASS) are missing in environment variables. Email sending is bypassed locally.");
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">EduCRM Steering Portal</h2>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b; font-weight: 550; text-transform: uppercase; letter-spacing: 0.5px;">Faculty Activity Management System</p>
                </div>
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">Hello ${userName || "User"},</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.5;">To sign in to your EduCRM dashboard account, verify your identity with the security code below:</p>
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 18px; border-radius: 12px; font-size: 28px; font-weight: 800; letter-spacing: 6px; text-align: center; margin: 20px 0; color: #1e1b4b; font-family: monospace;">
                    ${otpCode}
                </div>
                <p style="margin: 20px 0 10px 0; font-size: 13px; color: #e11d48; font-weight: 600; text-align: center;">⚡ This code expires in 5 minutes and is valid for a single-use login attempt only.</p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">If you did not request this login, please ignore this email or contact your administrator.</p>
                    <p style="margin: 5px 0 0 0;">&copy; 2026 EduCRM Academic Institution Hub. All rights reserved.</p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"EduCRM Portal" <${emailUser}>`,
            to: userEmail,
            subject: "EduCRM Login Verification Code",
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Successfully dispatched login code OTP to ${userEmail} 📧`);
        return true;
    } catch (err) {
        console.error("[EMAIL SERVICE] Critical SMTP error while dispatching code:", err);
        throw new Error("SMTP service failed to deliver verification code. Please check server logs 🔌");
    }
};

const sendWelcomeEmail = async (userEmail, userName, userRole, deptName, principalName) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP Credentials (EMAIL_USER/EMAIL_PASS) are missing. Welcome email bypassed locally.");
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">EduCRM Steering Portal</h2>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b; font-weight: 550; text-transform: uppercase; letter-spacing: 0.5px;">Faculty Activity Management System</p>
                </div>
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">Hello ${userName || "User"},</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.5;">Welcome to EduCRM! An account has been created for you by your Principal/Administrator (${principalName || "Admin"}).</p>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569; line-height: 1.5;"><strong>Your Account Registration Details:</strong></p>
                <ul style="font-size: 14px; color: #475569; line-height: 1.5; padding-left: 20px;">
                    <li><strong>Role Designation:</strong> ${userRole}</li>
                    <li><strong>Academic Department:</strong> ${deptName}</li>
                    <li><strong>Authorized Login Email:</strong> ${userEmail}</li>
                </ul>
                <p style="margin: 20px 0 0 0; font-size: 14px; color: #475569; line-height: 1.5;">You can now log in immediately by visiting the EduCRM Portal and requesting a verification OTP using this email address.</p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">&copy; 2026 EduCRM Academic Institution Hub. All rights reserved.</p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"EduCRM Portal" <${emailUser}>`,
            to: userEmail,
            subject: "Welcome to EduCRM - Your Academic Account is Ready",
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Successfully dispatched welcome email to ${userEmail} 📧`);
        return true;
    } catch (err) {
        console.error("[EMAIL SERVICE] SMTP error while dispatching welcome email:", err);
        return false;
    }
};

const sendInvitationEmail = async ({ guestEmail, guestName, eventTitle, eventType, date, time, venue, organizerName, deptName, institutionName, customHtml, attachmentBase64 }) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!guestEmail) {
        throw new Error("Guest email address is required to dispatch invitation ❌");
    }

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP Credentials (EMAIL_USER/EMAIL_PASS) are missing in environment variables. Email logged to console.");
        console.log(`[MOCK EMAIL DISPATCH] Invitation for "${eventTitle}" successfully prepared and addressed to ${guestEmail} (${guestName}).`);
        return { success: true, simulated: true, recipient: guestEmail };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #4f46e5; margin: 0; font-size: 20px; font-weight: bold;">${institutionName || "EduCRM Academic Institution"}</h2>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Department of ${deptName || "Academic Affairs"}</p>
                </div>
                <p style="font-size: 14px; font-weight: bold; color: #1e293b;">To: ${guestName || "Distinguished Resource Person"},</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                    On behalf of the Department of <strong>${deptName || "Engineering"}</strong> at <strong>${institutionName || "our Institution"}</strong>, 
                    we have the honor and privilege to cordially invite you as our distinguished Guest Speaker for the upcoming <strong>${eventType || "Workshop"}</strong>:
                </p>
                <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #1e1b4b; font-size: 16px; font-weight: bold;">${eventTitle}</h3>
                    <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>📅 Date:</strong> ${date || "To be confirmed"}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>⏰ Time:</strong> ${time || "Morning Session"}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>📍 Venue:</strong> ${venue || "Campus Seminar Auditorium"}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>👤 Event Coordinator:</strong> ${organizerName || "Department Faculty"}</p>
                </div>
                <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                    Your esteemed domain expertise will provide invaluable insights to our students and faculty members. We look forward to your valuable presence.
                </p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">Warm regards,<br/><strong>${organizerName || "Head of Department & Event Committee"}</strong><br/>${institutionName || "EduCRM Institutional Hub"}</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"${institutionName || "EduCRM Academic Portal"}" <${emailUser}>`,
            to: guestEmail,
            subject: `Official Academic Invitation: ${eventTitle} (${eventType || "Workshop"})`,
            html: customHtml || defaultHtml,
        };

        if (attachmentBase64) {
            const matches = attachmentBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mailOptions.attachments = [{
                    filename: `Invitation_${(eventTitle || "Letter").replace(/\s+/g, "_")}.pdf`,
                    content: matches[2],
                    encoding: "base64"
                }];
            }
        }

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] Successfully dispatched invitation to ${guestEmail} 📧`);
        return { success: true, recipient: guestEmail };
    } catch (err) {
        console.error("[EMAIL SERVICE] SMTP error while dispatching invitation:", err);
        throw new Error(err.message || "Failed to dispatch invitation email via SMTP ❌");
    }
};

const sendThankingEmail = async ({ guestEmail, guestName, eventTitle, eventType, date, organizerName, deptName, institutionName, customHtml, attachmentBase64 }) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!guestEmail) {
        throw new Error("Guest email address is required to dispatch thanking letter ❌");
    }

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP Credentials (EMAIL_USER/EMAIL_PASS) are missing in environment variables. Email logged to console.");
        console.log(`[MOCK EMAIL DISPATCH] Appreciation letter for "${eventTitle}" successfully prepared and addressed to ${guestEmail} (${guestName}).`);
        return { success: true, simulated: true, recipient: guestEmail };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                <div style="border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #059669; margin: 0; font-size: 20px; font-weight: bold;">Letter of Appreciation & Gratitude</h2>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">${institutionName || "EduCRM Academic Institution"} &bull; Department of ${deptName || "Academic Affairs"}</p>
                </div>
                <p style="font-size: 14px; font-weight: bold; color: #1e293b;">Dear ${guestName || "Distinguished Speaker"},</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                    On behalf of <strong>${institutionName || "our Institution"}</strong> and the Department of <strong>${deptName || "Engineering"}</strong>, 
                    we extend our heartfelt gratitude for graciously delivering the session during our <strong>${eventType || "Workshop"}</strong> on:
                </p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 15px 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #064e3b; font-size: 16px; font-weight: bold;">${eventTitle}</h3>
                    <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>📅 Date of Conduction:</strong> ${date || "Recently Conducted"}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>👤 Facilitated by:</strong> ${organizerName || "Department Faculty"}</p>
                </div>
                <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                    Your profound insights, practical industry illustrations, and engaging interaction received exceptional feedback from all participating faculty and students. 
                    We truly appreciate the time and dedication you shared with our institution and look forward to continued academic collaboration.
                </p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">With sincere regards,<br/><strong>${organizerName || "Department Faculty"} & Principal</strong><br/>${institutionName || "EduCRM Institutional Hub"}</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"${institutionName || "EduCRM Academic Portal"}" <${emailUser}>`,
            to: guestEmail,
            subject: `Letter of Gratitude & Appreciation: ${eventTitle}`,
            html: customHtml || defaultHtml,
        };

        if (attachmentBase64) {
            const matches = attachmentBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mailOptions.attachments = [{
                    filename: `Appreciation_${(eventTitle || "Letter").replace(/\s+/g, "_")}.pdf`,
                    content: matches[2],
                    encoding: "base64"
                }];
            }
        }

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] Successfully dispatched thanking letter to ${guestEmail} 📧`);
        return { success: true, recipient: guestEmail };
    } catch (err) {
        console.error("[EMAIL SERVICE] SMTP error while dispatching thanking letter:", err);
        throw new Error(err.message || "Failed to dispatch appreciation letter via SMTP ❌");
    }
};

module.exports = { sendOtpEmail, sendWelcomeEmail, sendInvitationEmail, sendThankingEmail };
