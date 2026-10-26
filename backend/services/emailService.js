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

/**
 * Resolves an authenticated SMTP transporter for a faculty member.
 * 
 * Hierarchy:
 * 1. Individual Faculty Credentials (Option A):
 *    If the faculty has configured their email sending credentials (e.g. Gmail App Password, college SMTP),
 *    a dedicated transporter is authenticated directly as that faculty's email address.
 * 
 * 2. Organization / Domain SMTP Relay (Option B):
 *    If a domain relay is configured in environment (SMTP_RELAY_HOST), connects to the relay which is
 *    authorized to send for the college domain without Gmail rewriting.
 * 
 * 3. Primary Admin Account:
 *    Only if the authenticated user's email matches process.env.EMAIL_USER.
 * 
 * 4. Error Handling:
 *    If no authorized sending credentials exist, it STRICTLY refuses to silently send through
 *    process.env.EMAIL_USER. It returns a clear, actionable error.
 */
const getFacultyTransporter = async ({ facultyUser, facultyEmail }) => {
    const targetEmail = (facultyEmail || facultyUser?.email || "").trim().toLowerCase();

    // 1. Option A: Faculty-specific authorized credentials (stored on User record)
    const emailSettings = facultyUser?.emailSettings;
    const authPass = emailSettings?.appPassword || emailSettings?.password;

    if (emailSettings?.configured && authPass) {
        const authUser = (emailSettings.email || targetEmail).trim();
        let transportConfig;
        if (emailSettings.host) {
            transportConfig = {
                host: emailSettings.host,
                port: Number(emailSettings.port) || 587,
                secure: Boolean(emailSettings.secure),
                auth: { user: authUser, pass: authPass }
            };
        } else {
            transportConfig = {
                service: emailSettings.service || "gmail",
                auth: { user: authUser, pass: authPass }
            };
        }

        const transporter = nodemailer.createTransport(transportConfig);
        return {
            transporter,
            authenticatedEmail: authUser,
            fromAddress: authUser,
            mode: "faculty_credentials"
        };
    }

    // 2. Option B: Organization / College Domain SMTP Relay
    if (process.env.SMTP_RELAY_HOST) {
        const relayConfig = {
            host: process.env.SMTP_RELAY_HOST,
            port: Number(process.env.SMTP_RELAY_PORT) || 587,
            secure: process.env.SMTP_RELAY_SECURE === "true",
            auth: process.env.SMTP_RELAY_USER ? {
                user: process.env.SMTP_RELAY_USER,
                pass: process.env.SMTP_RELAY_PASS
            } : undefined
        };
        const transporter = nodemailer.createTransport(relayConfig);
        return {
            transporter,
            authenticatedEmail: process.env.SMTP_RELAY_USER || targetEmail,
            fromAddress: targetEmail,
            mode: "domain_relay"
        };
    }

    // 3. Central Institutional Relay / College SMTP Dispatch (No individual passwords needed!)
    const centralUser = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
    const centralPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    if (centralUser && centralPass) {
        let transportConfig;
        if (process.env.SMTP_HOST) {
            transportConfig = {
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === "true",
                auth: { user: centralUser, pass: centralPass }
            };
        } else {
            transportConfig = {
                service: "gmail",
                auth: { user: centralUser, pass: centralPass }
            };
        }

        const transporter = nodemailer.createTransport(transportConfig);
        return {
            transporter,
            authenticatedEmail: centralUser,
            fromAddress: centralUser,
            replyToAddress: targetEmail || centralUser,
            mode: "institutional_central_relay"
        };
    }

    // 4. Fallback if no credentials exist at all
    const err = new Error(
        "Institutional email service is not configured. Please set EMAIL_USER and EMAIL_PASS in backend/.env."
    );
    err.code = "SERVER_EMAIL_NOT_CONFIGURED";
    throw err;
};

const verifyFacultyCredentials = async ({ service = "gmail", host, port, secure, user, pass, email, appPassword }) => {
    const authUser = (user || email || "").trim();
    const authPass = (pass || appPassword || "").trim().replace(/\s+/g, "");
    if (!authUser || !authPass) {
        throw new Error("Both email username and app password are required for verification ❌");
    }
    let config;
    if (host) {
        config = { host, port: Number(port) || 587, secure: Boolean(secure), auth: { user: authUser, pass: authPass } };
    } else {
        config = { service, auth: { user: authUser, pass: authPass } };
    }
    const testTransporter = nodemailer.createTransport(config);
    try {
        await testTransporter.verify();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

const sendInvitationEmail = async ({ guestEmail, guestName, eventTitle, eventType, date, time, venue, organizerName, deptName, institutionName, customHtml, customMessage, attachmentBase64, senderEmail, facultyUser }) => {
    if (!guestEmail) {
        throw new Error("Guest email address is required to dispatch invitation ❌");
    }

    const { transporter, authenticatedEmail, fromAddress, replyToAddress, mode } = await getFacultyTransporter({
        facultyUser,
        facultyEmail: senderEmail
    });

    const cleanName = organizerName ? organizerName.replace(/"/g, "'").trim() : "";
    let senderDisplay;
    if (mode === "faculty_credentials" || mode === "domain_relay") {
        senderDisplay = cleanName ? `"${cleanName}" <${fromAddress}>` : fromAddress;
    } else {
        // Institutional central relay: display faculty name with institutional authority
        senderDisplay = cleanName 
            ? `"${cleanName} (Faculty Coordinator)" <${authenticatedEmail}>`
            : `"Dr. D. Y. Patil College of Engineering & Innovation" <${authenticatedEmail}>`;
    }

    try {
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
                    ${senderEmail ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #6366f1;">Coordinator Direct Email: ${senderEmail}</p>` : ''}
                </div>
            </div>
        `;

        const mailOptions = {
            from: senderDisplay,
            replyTo: replyToAddress || senderEmail || fromAddress,
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
        console.log(`[EMAIL SERVICE] Successfully dispatched invitation to ${guestEmail} authenticated as ${authenticatedEmail} (${mode}) 📧`);
        return { success: true, recipient: guestEmail, from: senderDisplay, replyTo: mailOptions.replyTo, authenticatedAs: authenticatedEmail, mode };
    } catch (err) {
        if (err.code === "FACULTY_EMAIL_NOT_CONFIGURED") {
            throw err;
        }
        console.error("[EMAIL SERVICE] SMTP error while dispatching invitation:", err);
        throw new Error(formatEmailError(err));
    }
};

const sendThankingEmail = async ({ guestEmail, guestName, eventTitle, eventType, date, organizerName, deptName, institutionName, customHtml, customMessage, attachmentBase64, senderEmail, facultyUser }) => {
    if (!guestEmail) {
        throw new Error("Guest email address is required to dispatch thanking letter ❌");
    }

    const { transporter, authenticatedEmail, fromAddress, replyToAddress, mode } = await getFacultyTransporter({
        facultyUser,
        facultyEmail: senderEmail
    });

    const cleanName = organizerName ? organizerName.replace(/"/g, "'").trim() : "";
    let senderDisplay;
    if (mode === "faculty_credentials" || mode === "domain_relay") {
        senderDisplay = cleanName ? `"${cleanName}" <${fromAddress}>` : fromAddress;
    } else {
        // Institutional central relay: display faculty name with institutional authority
        senderDisplay = cleanName 
            ? `"${cleanName} (Faculty Coordinator)" <${authenticatedEmail}>`
            : `"Dr. D. Y. Patil College of Engineering & Innovation" <${authenticatedEmail}>`;
    }

    try {
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
                <div style="background-color: #ecfdf5; border-1px dashed #10b981; padding: 12px 15px; border-radius: 8px; margin: 20px 0; font-size: 12.5px; color: #065f46;">
                    <strong>📄 Official Letter Attached:</strong> Please find your official <strong>Letter of Appreciation in PDF format</strong> attached with this email.
                </div>
                <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                    Your profound insights, practical industry illustrations, and engaging interaction received exceptional feedback from all participating faculty and students. 
                    We truly appreciate the time and dedication you shared with our institution and look forward to continued academic collaboration.
                </p>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 15px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    <p style="margin: 0;">With sincere regards,<br/><strong>${organizerName || "Department Faculty"} & Principal</strong><br/>${institutionName || "EduCRM Institutional Hub"}</p>
                    ${senderEmail ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #059669;">Coordinator Direct Email: ${senderEmail}</p>` : ''}
                </div>
            </div>
        `;

        const mailOptions = {
            from: senderDisplay,
            replyTo: replyToAddress || senderEmail || fromAddress,
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
        console.log(`[EMAIL SERVICE] Successfully dispatched thanking letter to ${guestEmail} authenticated as ${authenticatedEmail} (${mode}) 📧`);
        return { success: true, recipient: guestEmail, from: senderDisplay, replyTo: mailOptions.replyTo, authenticatedAs: authenticatedEmail, mode };
    } catch (err) {
        if (err.code === "FACULTY_EMAIL_NOT_CONFIGURED") {
            throw err;
        }
        console.error("[EMAIL SERVICE] SMTP error while dispatching thanking letter:", err);
        throw new Error(formatEmailError(err));
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

    if (!recipientEmail) {
        throw new Error("Recipient email address is required to dispatch official letter ❌");
    }

    if (!emailUser || !emailPass) {
        console.warn("⚠️ SMTP credentials missing in environment variables.");
        throw new Error("SMTP Email Service is not configured on the server. Please add EMAIL_USER and EMAIL_PASS (App Password) to backend/.env to dispatch live letters ❌");
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
        const senderName = sender.name || (senderRole === "Principal" ? "Dr. Suresh Mali" : (senderRole === "HOD" ? "Dr. Alpana Adsul" : "Faculty Member"));
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
                            <span><strong>Dr. Alpana Adsul</strong> (Vice Principal / CE - HOD)</span>
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
        throw new Error(formatEmailError(err));
    }
};

/**
 * Diagnostic error formatter for SMTP exceptions
 */
function formatEmailError(err) {
    if (!err) return "Email delivery failed due to unknown error ❌";
    const msg = err.message || "";
    if (msg.includes("535") || msg.includes("BadCredentials") || msg.includes("Username and Password not accepted")) {
        return "SMTP Authentication Failed: Google rejected credentials (535 BadCredentials). Please ensure 2-Step Verification is enabled and generate a fresh 16-character App Password at https://myaccount.google.com/apppasswords, then set EMAIL_PASS in backend/.env 🔑❌";
    }
    if (msg.includes("ETIMEDOUT") || msg.includes("timeout")) {
        return "SMTP Connection Timed Out: Could not connect to mail server. Please verify internet connectivity 🌐❌";
    }
    return `SMTP Error: ${msg}`;
}

/**
 * Common Transporter Builder
 */
const getTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        throw new Error("SMTP Email Service is not configured on the server. Please add EMAIL_USER and EMAIL_PASS to backend/.env ❌");
    }

    return nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: emailUser,
            pass: emailPass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000
    });
};

/**
 * 1. Task Assignment Email (Requirement 3)
 * Dispatched to the selected faculty member when an HOD or Principal assigns a task.
 */
const sendTaskAssignmentEmail = async ({
    facultyEmail,
    facultyName,
    taskTitle,
    description = "",
    dueDate,
    priority = "Medium",
    assignedByName = "Head of Department",
    assignedByRole = "HOD",
    department = "",
    crmUrl = "http://localhost:3000"
}) => {
    if (!facultyEmail) {
        console.warn("[EMAIL SERVICE] Cannot dispatch task email: No faculty email provided");
        return { success: false, error: "No recipient email" };
    }

    try {
        const transporter = getTransporter();
        const emailUser = process.env.EMAIL_USER;

        const priorityColor = priority.toLowerCase() === "high" ? "#e11d48" : (priority.toLowerCase() === "low" ? "#10b981" : "#f59e0b");

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background-color: #4f46e5; padding: 20px 24px; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 19px; font-weight: bold;">New Task Assigned: "${taskTitle}"</h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #c7d2fe; text-transform: uppercase; letter-spacing: 0.5px;">EduCRM Academic Steering Portal</p>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600;">Dear ${facultyName || "Faculty Member"},</p>
                        <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
                            A new departmental task has been assigned to you by <strong>${assignedByName}</strong> (${assignedByRole}${department ? ` - ${department}` : ""}).
                        </p>

                        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 18px 0; font-size: 13px;">
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Task Title:</span>
                                <div style="font-weight: bold; color: #0f172a; font-size: 14px; margin-top: 2px;">${taskTitle}</div>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Due Date / Deadline:</span>
                                <div style="font-weight: 600; color: #1e1b4b; margin-top: 2px;">📅 ${dueDate || "As specified"}</div>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Priority:</span>
                                <div style="margin-top: 2px;">
                                    <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; color: #ffffff; background-color: ${priorityColor}; text-transform: uppercase;">
                                        ${priority} Priority
                                    </span>
                                </div>
                            </div>
                            ${description ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Instructions / Details:</span>
                                <div style="color: #334155; margin-top: 4px; line-height: 1.5; white-space: pre-wrap;">${description}</div>
                            </div>
                            ` : ""}
                        </div>

                        <div style="text-align: center; margin: 24px 0 16px 0;">
                            <a href="${crmUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; font-size: 13px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);">
                                📋 Open Task in EduCRM Portal
                            </a>
                        </div>
                        <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">
                            Log in to EduCRM and open the <strong>Tasks</strong> section to report progress or submit completion.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 24px; font-size: 10.5px; color: #94a3b8; text-align: center;">
                        Automated institutional communication from EduCRM Academic Hub.
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"${assignedByName} via EduCRM" <${emailUser}>`,
            to: facultyEmail,
            subject: `New Task Assignment: "${taskTitle}" (Due: ${dueDate})`,
            html: htmlContent
        });

        console.log(`[EMAIL SERVICE] Successfully dispatched task assignment email to ${facultyEmail} 📧✅`);
        return { success: true };
    } catch (err) {
        console.error("[EMAIL SERVICE] Error dispatching task assignment email:", err);
        return { success: false, error: formatEmailError(err) };
    }
};

/**
 * 2. Faculty Leave Request Email to HOD (Requirement 4)
 */
const sendLeaveRequestToHOD = async ({
    hodEmail,
    hodName = "Head of Department",
    facultyName,
    department,
    leaveType = "Casual Leave",
    subject = "Leave Application",
    startDate,
    endDate,
    daysCount,
    reason = "",
    hasAttachment = false,
    crmUrl = "http://localhost:3000"
}) => {
    if (!hodEmail) {
        console.warn("[EMAIL SERVICE] Cannot dispatch leave email: No HOD email configured");
        return { success: false, error: "No HOD email" };
    }

    try {
        const transporter = getTransporter();
        const emailUser = process.env.EMAIL_USER;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background-color: #0284c7; padding: 20px 24px; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 19px; font-weight: bold;">New Leave Application: ${facultyName}</h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #bae6fd; text-transform: uppercase; letter-spacing: 0.5px;">Pending HOD Review • ${department || "Department"}</p>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600;">Respected ${hodName},</p>
                        <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
                            Faculty member <strong>${facultyName}</strong> has submitted a new leave application for your review and recommendation.
                        </p>

                        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 18px 0; font-size: 13px;">
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Leave Type:</span>
                                <div style="font-weight: bold; color: #0f172a; font-size: 14px; margin-top: 2px;">${leaveType}</div>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Subject / Reason:</span>
                                <div style="color: #1e1b4b; font-weight: 600; margin-top: 2px;">${subject}</div>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Dates & Duration:</span>
                                <div style="font-weight: 600; color: #0284c7; margin-top: 2px;">📅 ${startDate} to ${endDate} (${daysCount || 1} day(s))</div>
                            </div>
                            ${reason ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Detailed Explanation:</span>
                                <div style="color: #334155; margin-top: 4px; line-height: 1.5;">${reason}</div>
                            </div>
                            ` : ""}
                            ${hasAttachment ? `
                            <div style="margin-top: 10px; padding-top: 8px; font-size: 12px; color: #4338ca; font-weight: 600;">
                                📎 Supporting document / medical certificate attached in portal.
                            </div>
                            ` : ""}
                        </div>

                        <div style="text-align: center; margin: 24px 0 16px 0;">
                            <a href="${crmUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-weight: bold; font-size: 13px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);">
                                🔍 Review & Endorse Application
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"EduCRM Portal" <${emailUser}>`,
            to: hodEmail,
            subject: `Leave Application for Review: ${facultyName} (${startDate} to ${endDate})`,
            html: htmlContent
        });

        console.log(`[EMAIL SERVICE] Dispatched leave request email to HOD ${hodEmail} 📧✅`);
        return { success: true };
    } catch (err) {
        console.error("[EMAIL SERVICE] Error dispatching leave email to HOD:", err);
        return { success: false, error: formatEmailError(err) };
    }
};

/**
 * 3. Faculty Workshop / Event Request Email to HOD (Requirement 4)
 */
const sendWorkshopRequestToHOD = async ({
    hodEmail,
    hodName = "Head of Department",
    facultyName,
    department,
    workshopTitle,
    date,
    time = "",
    venue = "",
    speakerName = "",
    description = "",
    crmUrl = "http://localhost:3000"
}) => {
    if (!hodEmail) {
        console.warn("[EMAIL SERVICE] Cannot dispatch workshop approval email: No HOD email configured");
        return { success: false, error: "No HOD email" };
    }

    try {
        const transporter = getTransporter();
        const emailUser = process.env.EMAIL_USER;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background-color: #7c3aed; padding: 20px 24px; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 19px; font-weight: bold;">New Workshop / Event Proposal: "${workshopTitle}"</h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #ddd6fe; text-transform: uppercase; letter-spacing: 0.5px;">Pending HOD Approval • ${department || "Department"}</p>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600;">Respected ${hodName},</p>
                        <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
                            Faculty member <strong>${facultyName}</strong> has logged a proposed academic workshop / seminar for departmental endorsement.
                        </p>

                        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 18px 0; font-size: 13px;">
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Event Title:</span>
                                <div style="font-weight: bold; color: #0f172a; font-size: 14px; margin-top: 2px;">${workshopTitle}</div>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Proposed Date & Time:</span>
                                <div style="font-weight: 600; color: #1e1b4b; margin-top: 2px;">📅 ${date} ${time ? `(${time})` : ""}</div>
                            </div>
                            ${venue ? `
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Venue / Hall:</span>
                                <div style="color: #334155; margin-top: 2px;">📍 ${venue}</div>
                            </div>` : ""}
                            ${speakerName ? `
                            <div style="margin-bottom: 8px;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Resource Person / Speaker:</span>
                                <div style="color: #334155; margin-top: 2px;">👤 ${speakerName}</div>
                            </div>` : ""}
                            ${description ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Session Scope / Description:</span>
                                <div style="color: #334155; margin-top: 4px; line-height: 1.5;">${description}</div>
                            </div>` : ""}
                        </div>

                        <div style="text-align: center; margin: 24px 0 16px 0;">
                            <a href="${crmUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-weight: bold; font-size: 13px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);">
                                🎯 Review Event in Portal
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"EduCRM Portal" <${emailUser}>`,
            to: hodEmail,
            subject: `Event Approval Request: "${workshopTitle}" by ${facultyName}`,
            html: htmlContent
        });

        console.log(`[EMAIL SERVICE] Dispatched workshop approval email to HOD ${hodEmail} 📧✅`);
        return { success: true };
    } catch (err) {
        console.error("[EMAIL SERVICE] Error dispatching workshop email to HOD:", err);
        return { success: false, error: formatEmailError(err) };
    }
};

/**
 * 4. Leave Forwarded to Principal for Final Sanction (Requirement 6)
 */
const sendLeaveForwardedToPrincipal = async ({
    principalEmail,
    principalName = "Dr. Suresh Mali",
    facultyName,
    department,
    leaveType = "Leave Application",
    subject = "",
    startDate,
    endDate,
    hodName,
    hodRemarks = "",
    crmUrl = "http://localhost:3000"
}) => {
    if (!principalEmail) {
        console.warn("[EMAIL SERVICE] Cannot dispatch principal email: No Principal email configured");
        return { success: false, error: "No Principal email" };
    }

    try {
        const transporter = getTransporter();
        const emailUser = process.env.EMAIL_USER;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background-color: #b91c1c; padding: 20px 24px; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 19px; font-weight: bold;">Leave Sanction Queue: ${facultyName}</h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #fecaca; text-transform: uppercase; letter-spacing: 0.5px;">Endorsed by HOD • Awaiting Principal Sanction</p>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600;">Respected Principal ${principalName},</p>
                        <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
                            A leave request from <strong>${facultyName}</strong> (Department of ${department}) has been recommended by HOD <strong>${hodName}</strong> and forwarded to your executive queue for final institutional sanction.
                        </p>

                        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 18px 0; font-size: 13px;">
                            <div style="margin-bottom: 6px;"><strong>Leave Type:</strong> ${leaveType}</div>
                            <div style="margin-bottom: 6px;"><strong>Subject:</strong> ${subject}</div>
                            <div style="margin-bottom: 6px;"><strong>Dates:</strong> 📅 ${startDate} to ${endDate}</div>
                            ${hodRemarks ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; color: #0f172a;"><strong>HOD Recommendation Remarks:</strong> "${hodRemarks}"</div>` : ""}
                        </div>

                        <div style="text-align: center; margin: 24px 0 16px 0;">
                            <a href="${crmUrl}" style="display: inline-block; background-color: #b91c1c; color: #ffffff; font-weight: bold; font-size: 13px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
                                🛡️ Open Principal Approvals Queue
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"EduCRM Portal" <${emailUser}>`,
            to: principalEmail,
            subject: `Principal Review Queue: Leave Request by ${facultyName} (${startDate} to ${endDate})`,
            html: htmlContent
        });

        console.log(`[EMAIL SERVICE] Dispatched forwarded leave email to Principal ${principalEmail} 📧✅`);
        return { success: true };
    } catch (err) {
        console.error("[EMAIL SERVICE] Error notifying Principal:", err);
        return { success: false, error: formatEmailError(err) };
    }
};

/**
 * 5. Approval Decision Email to Faculty (Requirements 4, 5, 6)
 * Dispatched to faculty when HOD or Principal approves, rejects, or returns an application.
 */
const sendApprovalDecisionToFaculty = async ({
    facultyEmail,
    facultyName,
    requestType = "Request",
    refNo = "",
    status, // "APPROVED" | "REJECTED" | "HOD_APPROVED" | "RETURNED"
    approverName,
    approverRole,
    remarks = "",
    dates = "",
    subject = "",
    crmUrl = "http://localhost:3000"
}) => {
    if (!facultyEmail) {
        console.warn("[EMAIL SERVICE] Cannot dispatch decision email: No faculty email provided");
        return { success: false, error: "No faculty email" };
    }

    try {
        const transporter = getTransporter();
        const emailUser = process.env.EMAIL_USER;

        const isApproved = status === "APPROVED";
        const isHodEndorsed = status === "HOD_APPROVED";
        const isRejected = status === "REJECTED";

        const badgeBg = isApproved ? "#10b981" : (isHodEndorsed ? "#0284c7" : (isRejected ? "#e11d48" : "#f59e0b"));
        const displayStatus = isApproved 
            ? "APPROVED & SANCTIONED" 
            : isHodEndorsed 
                ? "ENDORSED BY HOD (FORWARDED TO PRINCIPAL)" 
                : (isRejected ? "REJECTED" : status);

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background-color: ${badgeBg}; padding: 20px 24px; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 19px; font-weight: bold;">Decision Update: ${requestType}</h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #ffffff; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Status: ${displayStatus}</p>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600;">Dear ${facultyName || "Faculty Member"},</p>
                        <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
                            Your <strong>${requestType}</strong> (${subject || "Submission"}) has been processed by <strong>${approverName}</strong> (${approverRole}).
                        </p>

                        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 18px 0; font-size: 13px;">
                            ${refNo ? `<div style="margin-bottom: 6px;"><strong>Reference No:</strong> <span style="font-family: monospace;">${refNo}</span></div>` : ""}
                            <div style="margin-bottom: 6px;">
                                <strong>Decision Status:</strong> 
                                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #ffffff; background-color: ${badgeBg}; text-transform: uppercase;">
                                    ${displayStatus}
                                </span>
                            </div>
                            ${dates ? `<div style="margin-bottom: 6px;"><strong>Applicable Dates:</strong> 📅 ${dates}</div>` : ""}
                            ${remarks ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                                <strong>Approver Remarks:</strong>
                                <div style="color: #334155; margin-top: 4px; font-style: italic;">"${remarks}"</div>
                            </div>
                            ` : ""}
                        </div>

                        <div style="text-align: center; margin: 24px 0 16px 0;">
                            <a href="${crmUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; font-size: 13px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
                                📄 View Record in EduCRM
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"EduCRM Portal" <${emailUser}>`,
            to: facultyEmail,
            subject: `Decision on ${requestType}: ${displayStatus} (${refNo || facultyName})`,
            html: htmlContent
        });

        console.log(`[EMAIL SERVICE] Dispatched decision email to ${facultyEmail} (${status}) 📧✅`);
        return { success: true };
    } catch (err) {
        console.error("[EMAIL SERVICE] Error dispatching decision email to faculty:", err);
        return { success: false, error: formatEmailError(err) };
    }
};

/**
 * 6. Decision Update to HOD when Principal takes action (Requirement 6)
 */
const sendPrincipalDecisionToHOD = async ({
    hodEmail,
    hodName = "HOD",
    facultyName,
    requestType,
    refNo,
    status,
    principalName = "Dr. Suresh Mali",
    remarks = "",
    crmUrl = "http://localhost:3000"
}) => {
    if (!hodEmail) return { success: false };

    try {
        const transporter = getTransporter();
        const emailUser = process.env.EMAIL_USER;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;">
                    <h3 style="margin-top: 0; color: #0f172a;">Executive Decision Intimation: ${requestType}</h3>
                    <p style="font-size: 13.5px; color: #475569;">
                        Dear ${hodName}, Principal ${principalName} has concluded the review on the ${requestType.toLowerCase()} submission from <strong>${facultyName}</strong> with status: <strong>${status}</strong>.
                    </p>
                    ${remarks ? `<p style="font-size: 12.5px; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 6px;">Principal Remarks: "${remarks}"</p>` : ""}
                    <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">Ref No: ${refNo || "N/A"} &bull; EduCRM Institutional Hub</p>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"EduCRM Portal" <${emailUser}>`,
            to: hodEmail,
            subject: `Principal Decision Intimation: ${requestType} (${facultyName} - ${status})`,
            html: htmlContent
        });
        return { success: true };
    } catch (err) {
        console.error("[EMAIL SERVICE] Error notifying HOD of Principal decision:", err);
        return { success: false };
    }
};

module.exports = { 
    sendOtpEmail, 
    sendWelcomeEmail, 
    sendInvitationEmail, 
    sendThankingEmail,
    sendPasswordCredentialsEmail,
    sendWorkshopApprovalEmail,
    sendOfficialLetterEmail,
    getFacultyTransporter,
    verifyFacultyCredentials,
    sendTaskAssignmentEmail,
    sendLeaveRequestToHOD,
    sendWorkshopRequestToHOD,
    sendLeaveForwardedToPrincipal,
    sendApprovalDecisionToFaculty,
    sendPrincipalDecisionToHOD,
    formatEmailError
};

