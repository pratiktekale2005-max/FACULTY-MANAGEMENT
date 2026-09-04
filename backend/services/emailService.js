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

module.exports = { sendOtpEmail, sendWelcomeEmail };
