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

const sendWelcomeEmail = async (userEmail, userName, userRole, deptName, principalName, password = null) => {
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

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Welcome to EduCRM</title>
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #f1f5f9; font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; color: #1e293b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <div style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
        <div style="background-color: #4f46e5; padding: 22px 20px; text-align: left;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">EduCRM Steering Portal</h2>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #c7d2fe; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Faculty Activity Management System</p>
        </div>
        <div style="padding: 24px 20px;">
            <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0f172a;">Hello ${userName || "Faculty Member"},</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">Welcome to EduCRM! An institutional account has been created for you by your Principal / Administrator (${principalName || "Admin"}).</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 18px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">📋 Your Account Details</div>
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">Role Designation:</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${userRole}</div>
                </div>
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">Academic Department:</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${deptName}</div>
                </div>
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">Authorized Login Email / Username:</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; word-break: break-all; font-family: monospace;">${userEmail}</div>
                </div>
                ${password ? `
                <div>
                    <div style="font-size: 11px; font-weight: 600; color: #4338ca; margin-bottom: 4px;">Assigned Login Password:</div>
                    <div style="display: inline-block; background-color: #e0e7ff; color: #3730a3; font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 800; padding: 4px 10px; border-radius: 6px; border: 1px dashed #6366f1; word-break: break-all;">${password}</div>
                </div>` : ''}
            </div>

            <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">You can now sign in to the EduCRM Portal using your email address and assigned password.</p>

            <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 14px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                <p style="margin: 0;">&copy; 2026 EduCRM Academic Institution Hub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

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

const sendPasswordCredentialsEmail = async ({
    userEmail,
    userName,
    userRole,
    deptName,
    password,
    isReset = false,
    actorName,
    institutionName
}) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!userEmail) {
        console.warn("⚠️ Recipient email missing in sendPasswordCredentialsEmail");
        return false;
    }

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP Credentials (EMAIL_USER/EMAIL_PASS) are missing in environment variables. Email logged to console.");
        console.log(`[MOCK EMAIL DISPATCH] Password credentials for "${userEmail}" (${userName}): Username = "${userEmail}", Password = "${password}"`);
        return { success: true, simulated: true, recipient: userEmail };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const subject = isReset 
            ? `EduCRM - Password Updated for ${userName || userEmail}`
            : `EduCRM - Official Account Credentials for ${userName || userEmail}`;

        const greetingAction = isReset
            ? `Your account login password has been newly set and updated by your Principal / Administrator (${actorName || "Principal / Admin"}).`
            : `Your official institutional account has been created by your Principal / Administrator (${actorName || "Principal / Admin"}). Below are your official login credentials.`;

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${subject}</title>
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #f1f5f9; font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; color: #1e293b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <div style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <div style="background-color: #4f46e5; padding: 22px 20px; text-align: left;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">${institutionName || "EduCRM Steering Portal"}</h2>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #c7d2fe; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Faculty Activity Management System &bull; Account Security</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px 20px;">
            <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">Hello ${userName || "Faculty Member"},</p>
            <p style="margin: 0 0 18px 0; font-size: 14px; color: #475569; line-height: 1.6;">${greetingAction}</p>

            <!-- Mobile-Friendly Stacked Credentials Card -->
            <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px 16px; margin: 20px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">🔑 Your Login Credentials</div>

                <!-- Username / Email Field -->
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; text-transform: uppercase;">Registered Username / Email:</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; word-break: break-all; font-family: monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${userEmail}</div>
                </div>

                <!-- Setted Password Field -->
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 11px; font-weight: 600; color: #4338ca; margin-bottom: 3px; text-transform: uppercase;">Setted Password:</div>
                    <div style="display: inline-block; background-color: #e0e7ff; color: #3730a3; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 800; padding: 6px 14px; border-radius: 6px; border: 1.5px dashed #6366f1; letter-spacing: 0.5px; word-break: break-all;">${password}</div>
                </div>

                ${userRole || deptName ? `
                <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    ${userRole ? `<div style="margin-bottom: 4px;"><strong>Role:</strong> <span style="color: #334155;">${userRole}</span></div>` : ''}
                    ${deptName ? `<div><strong>Department:</strong> <span style="color: #334155;">${deptName}</span></div>` : ''}
                </div>` : ''}
            </div>

            <!-- Login Instructions -->
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin: 16px 0;">
                <div style="font-size: 12px; color: #92400e; font-weight: 700; margin-bottom: 2px;">💡 How to Sign In:</div>
                <div style="font-size: 12px; color: #78350f; line-height: 1.5;">Visit the EduCRM portal, enter your <strong>Username (${userEmail})</strong> and the <strong>Setted Password</strong> shown above to sign in.</div>
            </div>

            <!-- Security Note -->
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 14px; border-radius: 6px; margin: 16px 0;">
                <div style="font-size: 12px; color: #991b1b; font-weight: 700; margin-bottom: 2px;">🔒 Security Note:</div>
                <div style="font-size: 12px; color: #b91c1c; line-height: 1.5;">Please keep your credentials safe and do not share your password with unauthorized individuals.</div>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #f1f5f9; margin-top: 22px; padding-top: 14px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                <p style="margin: 0;">Authorized by <strong>${actorName || "Principal / Administrator"}</strong> &bull; ${institutionName || "EduCRM Academic Portal"}</p>
                <p style="margin: 3px 0 0 0;">&copy; 2026 EduCRM Academic Institution Hub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

        await transporter.sendMail({
            from: `"${institutionName || "EduCRM Portal"}" <${emailUser}>`,
            to: userEmail,
            subject: subject,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Successfully dispatched password credentials email to ${userEmail} 📧`);
        return true;
    } catch (err) {
        console.error("[EMAIL SERVICE] SMTP error while dispatching password credentials email:", err);
        return false;
    }
};

const sendInvitationEmail = async ({ guestEmail, guestName, eventTitle, eventType, date, time, venue, organizerName, deptName, institutionName, customHtml, customMessage, attachmentBase64, senderEmail }) => {
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
                ${customMessage ? `
                <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 6px; margin: 15px 0; font-size: 13.5px; color: #334155; line-height: 1.5;">
                    <p style="margin: 0; font-weight: 500;"><strong>Message from Institutional Authority:</strong></p>
                    <p style="margin: 5px 0 0 0; font-style: italic;">"${customMessage}"</p>
                </div>` : ''}
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
                <div style="background-color: #eef2ff; border: 1px dashed #6366f1; padding: 12px 15px; border-radius: 8px; margin: 20px 0; font-size: 12.5px; color: #3730a3;">
                    <strong>📄 Official Letter Attached:</strong> Please find your official signed & stamped <strong>Invitation Letter in PDF format</strong> attached to this email.
                </div>
                <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                    Your esteemed domain expertise will provide invaluable insights to our students and faculty members. We look forward to your valuable presence.
                </p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">Warm regards,<br/><strong>${organizerName || "Head of Department & Event Committee"}</strong><br/>${institutionName || "EduCRM Institutional Hub"}</p>
                    ${senderEmail ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #6366f1;">Sender Email: ${senderEmail}</p>` : ''}
                </div>
            </div>
        `;

        const mailOptions = {
            from: organizerName ? `"${organizerName} via ${institutionName || "EduCRM Portal"}" <${emailUser}>` : `"${institutionName || "EduCRM Academic Portal"}" <${emailUser}>`,
            replyTo: senderEmail || emailUser,
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

const sendThankingEmail = async ({ guestEmail, guestName, eventTitle, eventType, date, organizerName, deptName, institutionName, customHtml, customMessage, attachmentBase64, senderEmail }) => {
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
                ${customMessage ? `
                <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin: 15px 0; font-size: 13.5px; color: #334155; line-height: 1.5;">
                    <p style="margin: 0; font-weight: 500;"><strong>Message from Institutional Leadership:</strong></p>
                    <p style="margin: 5px 0 0 0; font-style: italic;">"${customMessage}"</p>
                </div>` : ''}
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                    On behalf of <strong>${institutionName || "our Institution"}</strong> and the Department of <strong>${deptName || "Engineering"}</strong>, 
                    we extend our heartfelt gratitude for graciously delivering the session during our <strong>${eventType || "Workshop"}</strong> on:
                </p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 15px 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #064e3b; font-size: 16px; font-weight: bold;">${eventTitle}</h3>
                    <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>📅 Date of Conduction:</strong> ${date || "Recently Conducted"}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>👤 Facilitated by:</strong> ${organizerName || "Department Faculty"}</p>
                </div>
                <div style="background-color: #ecfdf5; border: 1px dashed #10b981; padding: 12px 15px; border-radius: 8px; margin: 20px 0; font-size: 12.5px; color: #065f46;">
                    <strong>📄 Official Letter Attached:</strong> Please find your official <strong>Letter of Appreciation in PDF format</strong> attached with this email.
                </div>
                <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                    Your profound insights, practical industry illustrations, and engaging interaction received exceptional feedback from all participating faculty and students. 
                    We truly appreciate the time and dedication you shared with our institution and look forward to continued academic collaboration.
                </p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">With sincere regards,<br/><strong>${organizerName || "Department Faculty"} & Principal</strong><br/>${institutionName || "EduCRM Institutional Hub"}</p>
                    ${senderEmail ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #059669;">Sender Email: ${senderEmail}</p>` : ''}
                </div>
            </div>
        `;

        const mailOptions = {
            from: organizerName ? `"${organizerName} via ${institutionName || "EduCRM Portal"}" <${emailUser}>` : `"${institutionName || "EduCRM Academic Portal"}" <${emailUser}>`,
            replyTo: senderEmail || emailUser,
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

/**
 * Sends a notification email to the faculty member when their submitted workshop is approved by the HOD.
 */
const sendWorkshopApprovalEmail = async ({
    facultyEmail,
    facultyName,
    workshopTitle,
    workshopDate,
    time = "",
    venue = "",
    speakerName = "",
    hodName = "Head of the Department",
    departmentName = "Department",
    approvalDate = new Date(),
    institutionName = "EduCRM Academic Institution"
}) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP Credentials missing. Workshop approval email bypassed locally.");
        return false;
    }

    if (!facultyEmail) {
        console.warn("⚠️ Faculty email missing for workshop approval notification.");
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

        const formattedDate = workshopDate ? new Date(workshopDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Scheduled Date";
        const formattedApprovalDate = approvalDate ? new Date(approvalDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString();

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #4f46e5; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">${institutionName}</h2>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Workshop & Seminar Approval Notification</p>
                </div>
                
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #0f172a;">Dear ${facultyName || "Faculty Member"},</p>
                <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #334155; line-height: 1.5;">
                    We are pleased to inform you that your proposed workshop/seminar has been reviewed and officially <strong style="color: #059669;">APPROVED</strong> by your Head of Department.
                </p>

                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #059669; letter-spacing: 0.5px;">Approved Workshop</div>
                    <h3 style="margin: 5px 0 10px 0; color: #064e3b; font-size: 16px; font-weight: bold;">${workshopTitle}</h3>
                    <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>📅 Event Date:</strong> ${formattedDate} ${time ? `(${time})` : ""}</p>
                    ${venue ? `<p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>📍 Venue / Platform:</strong> ${venue}</p>` : ""}
                    ${speakerName ? `<p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>🎤 Resource Person / Speaker:</strong> ${speakerName}</p>` : ""}
                    <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>🏛️ Department:</strong> ${departmentName}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #059669;"><strong>✓ Approved By:</strong> <strong>${hodName}</strong> (HOD)</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #4b5563;"><strong>🕒 Date of Approval:</strong> ${formattedApprovalDate}</p>
                </div>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 12.5px; color: #475569; line-height: 1.5;">
                    <strong>Next Steps:</strong>
                    <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                        <li>Generate and dispatch the official <strong>Invitation Letter</strong> to the guest speaker.</li>
                        <li>Upload <strong>Event Gallery Photos</strong> and documentation upon session completion.</li>
                        <li>Submit <strong>Post Assessment & Ratings</strong> and log guest <strong>Remuneration Details</strong>.</li>
                    </ul>
                </div>

                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">Department of ${departmentName} • ${institutionName}</p>
                    <p style="margin: 3px 0 0 0;">This is an automated notification from the EduCRM Steering System.</p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"${institutionName || "EduCRM Academic Portal"}" <${emailUser}>`,
            to: facultyEmail,
            subject: `Workshop Approved: "${workshopTitle}" by ${hodName} (HOD)`,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Successfully dispatched workshop approval email to ${facultyEmail} 📧✅`);
        return true;
    } catch (err) {
        console.error("[EMAIL SERVICE] Error dispatching workshop approval email:", err);
        return false;
    }
};

/**
 * Dispatches an official institutional letter by email on behalf of the initiating authority (Faculty / HOD / Principal).
 */
const sendOfficialLetterEmail = async ({
    recipientEmail,
    recipientName = "Distinguished Guest",
    subject = "Official Institutional Communication",
    letterType = "invitation",
    refNo = "",
    letterDate = new Date().toISOString().split("T")[0],
    bodyText = "",
    eventDetails = {},
    sender = {},
    attachmentBase64 = null
}) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP credentials missing. Official letter email simulated locally.");
        return { success: true, simulated: true };
    }

    if (!recipientEmail) {
        throw new Error("Recipient email address is required to dispatch official letter ❌");
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        const senderRole = sender.role || "Faculty";
        const senderName = sender.name || (senderRole === "Principal" ? "Dr. Suresh Mali" : (senderRole === "HOD" ? "Dr. Adsul Mam" : "Faculty Member"));
        const senderDesignation = senderRole === "Faculty"
            ? "Faculty"
            : senderRole === "HOD"
                ? "Vice Principal / CE - HOD"
                : (senderRole === "Principal" ? "Principal" : (sender.designation || "Faculty"));
        const senderDept = sender.department || "";
        const senderEmail = sender.email || emailUser;
        const institutionName = "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION";

        const formattedDate = new Date(letterDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            </head>
            <body style="margin: 0; padding: 16px 8px; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
                <div style="max-width: 620px; width: 100%; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    
                    <!-- Fixed Institutional Master Letterhead Header -->
                    <div style="background-color: #ffffff; border-bottom: 2px solid #800000; padding: 18px 24px; text-align: center;">
                        <p style="margin: 0; font-size: 11px; font-weight: 700; color: #800000; text-transform: uppercase; letter-spacing: 0.5px;">Dr. D. Y. Patil Educational Federation’s</p>
                        <h1 style="margin: 3px 0 2px 0; font-size: 15px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.3px;">Dr. D. Y. PATIL COLLEGE OF ENGINEERING &amp; INNOVATION</h1>
                        <p style="margin: 0; font-size: 10px; font-weight: 600; color: #475569;">(An Autonomous Institute Affiliated to SPPU • NAAC 'A' Grade Accredited)</p>
                        <p style="margin: 3px 0 0 0; font-size: 9px; color: #64748b;">Varale Campus, Talegaon, Pune • Ph: 020 48522561 • www.dypcoei.edu.in</p>
                        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0; font-size: 9.5px; color: #1e1b4b; display: flex; justify-content: space-between;">
                            <span><strong>Dr. Adsul Mam</strong> (Vice Principal / CE - HOD)</span>
                            <span style="float: right;"><strong>Dr. Suresh Mali</strong> (Principal)</span>
                            <div style="clear: both;"></div>
                        </div>
                    </div>

                    <!-- Reference Bar -->
                    <div style="background-color: #f1f5f9; padding: 8px 24px; font-size: 11px; font-family: monospace; color: #475569; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
                        <span><strong>Ref No:</strong> ${refNo || "DYPCOEI/OFFICIAL/2026"}</span>
                        <span style="float: right;"><strong>Date:</strong> ${formattedDate}</span>
                        <div style="clear: both;"></div>
                    </div>

                    <!-- Email Body -->
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">To,</p>
                        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e1b4b;">${recipientName}</p>
                        <p style="margin: 16px 0 12px 0; font-size: 14px; font-weight: 700; color: #1e1b4b; background-color: #f8fafc; padding: 10px 14px; border-left: 3px solid #800000; border-radius: 4px;">
                            ${subject}
                        </p>

                        <p style="margin: 16px 0 12px 0; font-size: 13.5px; line-height: 1.6; color: #334155;">
                            Dear Respected Sir / Madam,
                        </p>

                        <div style="font-size: 13.5px; line-height: 1.6; color: #334155; margin-bottom: 18px;">
                            ${bodyText.replace(/\n/g, "<br>")}
                        </div>

                        ${eventDetails.title ? `
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 12.5px;">
                            <div style="font-weight: 700; color: #1e1b4b; margin-bottom: 8px; text-transform: uppercase; font-size: 11px;">📅 Session Logistics &amp; Schedule</div>
                            <div style="margin-bottom: 4px;"><strong>Theme / Title:</strong> ${eventDetails.title}</div>
                            <div style="margin-bottom: 4px;"><strong>Date &amp; Time:</strong> ${eventDetails.date || formattedDate} ${eventDetails.time ? `(${eventDetails.time})` : ""}</div>
                            <div style="margin-bottom: 4px;"><strong>Mode &amp; Venue:</strong> ${eventDetails.mode || "Offline"} (${eventDetails.venue || "Campus Seminar Hall"})</div>
                        </div>
                        ` : ""}

                        <p style="margin: 18px 0 24px 0; font-size: 13px; color: #475569; font-style: italic;">
                            📌 Please find the officially signed institutional document attached to this email in PDF format.
                        </p>

                        <!-- Formal Signatory Section (Section 8) -->
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px;">
                            <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">Regards,</p>
                            <p style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">${senderName}</p>
                            <p style="margin: 2px 0; font-size: 12.5px; font-weight: 600; color: #4338ca;">${senderDesignation}</p>
                            ${senderDept ? `<p style="margin: 2px 0; font-size: 12px; color: #475569;">Department of ${senderDept}</p>` : ""}
                            <p style="margin: 2px 0; font-size: 11px; color: #64748b;">${institutionName}</p>
                            ${senderEmail ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #0284c7;">Email: ${senderEmail}</p>` : ""}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 24px; font-size: 10px; color: #94a3b8; text-align: center;">
                        This official communication was issued on behalf of ${institutionName}.
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"${senderName} via ${institutionName}" <${emailUser}>`,
            replyTo: senderEmail || emailUser,
            to: recipientEmail,
            subject: subject,
            html: htmlContent
        };

        if (attachmentBase64) {
            const matches = attachmentBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mailOptions.attachments = [{
                    filename: `Official_${letterType.toUpperCase()}_${(eventDetails.title || recipientName || "Communication").replace(/\s+/g, "_")}.pdf`,
                    content: matches[2],
                    encoding: "base64"
                }];
            }
        }

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] Official letter email successfully dispatched to ${recipientEmail} on behalf of ${senderName} 📧✅`);
        return { success: true, recipient: recipientEmail };
    } catch (err) {
        console.error("[EMAIL SERVICE] Error dispatching official letter email:", err);
        throw new Error(err.message || "Failed to dispatch official letter via SMTP ❌");
    }
};

module.exports = { 
    sendOtpEmail, 
    sendWelcomeEmail, 
    sendInvitationEmail, 
    sendThankingEmail,
    sendPasswordCredentialsEmail,
    sendWorkshopApprovalEmail,
    sendOfficialLetterEmail
};

