const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const emailService = require("../services/emailService");
const nodemailer = require("nodemailer");

console.log("================================================================");
console.log("TESTING FACULTY SENDER AUTHENTICATION ARCHITECTURE");
console.log("================================================================\n");

let passed = 0;
let failed = 0;

async function test(name, fn) {
    
    try {
        await fn();
        console.log(`✅ [PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`❌ [FAIL] ${name}:`, err.message);
        failed++;
    }
}

(async () => {
    // ----------------------------------------------------
    // TEST 1: Unconfigured Faculty MUST Fail and NOT fall back to .env
    // ----------------------------------------------------
    // ----------------------------------------------------
    // TEST 1: Institutional Central Dispatch (No individual password needed)
    // ----------------------------------------------------
    await test("Test 1: Faculty without App Password sends via Institutional Relay with direct Reply-To", async () => {
        const facultyMember = {
            _id: "faculty-101",
            name: "Ashwini Shirke",
            email: "ashwini@college-domain.ac.in",
            emailSettings: { configured: false }
        };

        let capturedTransportConfig = null;
        let capturedMailOptions = null;
        const origCreateTransport = nodemailer.createTransport;
        nodemailer.createTransport = (config) => {
            capturedTransportConfig = config;
            return {
                sendMail: async (opts) => {
                    capturedMailOptions = opts;
                    return { messageId: "msg-inst-1" };
                }
            };
        };

        try {
            const res = await emailService.sendInvitationEmail({
                facultyUser: facultyMember,
                guestEmail: "guest@example.com",
                guestName: "Dr. Speaker",
                eventTitle: "Cloud Computing Workshop",
                organizerName: facultyMember.name,
                senderEmail: facultyMember.email
            });

            assert(capturedTransportConfig, "Transport config must be captured");
            assert.strictEqual(capturedTransportConfig.auth.user, process.env.EMAIL_USER);
            assert.strictEqual(capturedMailOptions.to, "guest@example.com");
            assert.strictEqual(capturedMailOptions.replyTo, "ashwini@college-domain.ac.in", "Reply-To must route to faculty");
            assert(capturedMailOptions.from.includes("Ashwini Shirke"));
            assert.strictEqual(res.mode, "institutional_central_relay");
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    // ----------------------------------------------------
    // TEST 2: Thanking Letter via Institutional Central Relay
    // ----------------------------------------------------
    await test("Test 2: Thanking Letter sends via Institutional Relay with direct Reply-To", async () => {
        const facultyMember = {
            _id: "faculty-101",
            name: "Ashwini Shirke",
            email: "ashwini@college-domain.ac.in",
            emailSettings: null
        };

        let capturedMailOptions = null;
        const origCreateTransport = nodemailer.createTransport;
        nodemailer.createTransport = () => ({
            sendMail: async (opts) => {
                capturedMailOptions = opts;
                return { messageId: "msg-inst-2" };
            }
        });

        try {
            const res = await emailService.sendThankingEmail({
                facultyUser: facultyMember,
                guestEmail: "guest@example.com",
                guestName: "Dr. Speaker",
                eventTitle: "Cloud Computing Workshop",
                organizerName: facultyMember.name,
                senderEmail: facultyMember.email
            });

            assert.strictEqual(capturedMailOptions.to, "guest@example.com");
            assert.strictEqual(capturedMailOptions.replyTo, "ashwini@college-domain.ac.in", "Reply-To must route to faculty");
            assert(capturedMailOptions.from.includes("Ashwini Shirke"));
            assert.strictEqual(res.mode, "institutional_central_relay");
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    // ----------------------------------------------------
    // TEST 3: Configured Faculty A creates transporter authenticated as Faculty A
    // ----------------------------------------------------
    await test("Test 3: Faculty A authenticates with Faculty A's authorized credentials", async () => {
        const facultyA = {
            _id: "faculty-A",
            name: "Ashwini Shirke",
            email: "ashwini@college-domain.ac.in",
            emailSettings: {
                configured: true,
                service: "gmail",
                email: "ashwini@college-domain.ac.in",
                appPassword: "mockAppPasswordFacultyA"
            }
        };

        let capturedTransportConfig = null;
        let capturedMailOptions = null;
        const origCreateTransport = nodemailer.createTransport;

        nodemailer.createTransport = (config) => {
            capturedTransportConfig = config;
            return {
                sendMail: async (opts) => {
                    capturedMailOptions = opts;
                    return { messageId: "msg-faculty-a" };
                }
            };
        };

        try {
            const res = await emailService.sendInvitationEmail({
                facultyUser: facultyA,
                guestEmail: "speaker@industry.com",
                guestName: "Dr. Speaker",
                eventTitle: "Microservices Workshop",
                organizerName: facultyA.name,
                senderEmail: facultyA.email
            });

            // Verify transport authentication
            assert(capturedTransportConfig, "Transport config must be captured");
            assert.strictEqual(
                capturedTransportConfig.auth.user,
                "ashwini@college-domain.ac.in",
                `Transporter auth.user must be ashwini@college-domain.ac.in, got: ${capturedTransportConfig.auth.user}`
            );
            assert.strictEqual(
                capturedTransportConfig.auth.pass,
                "mockAppPasswordFacultyA",
                "Transporter auth.pass must match Faculty A's appPassword"
            );
            assert.notStrictEqual(
                capturedTransportConfig.auth.user,
                process.env.EMAIL_USER,
                "Transporter must NOT be authenticated with .env EMAIL_USER!"
            );

            // Verify message headers
            assert.strictEqual(capturedMailOptions.to, "speaker@industry.com");
            assert(capturedMailOptions.from.includes("ashwini@college-domain.ac.in"));
            assert(capturedMailOptions.from.includes("Ashwini Shirke"));
            assert.strictEqual(capturedMailOptions.replyTo, "ashwini@college-domain.ac.in");
            assert.strictEqual(res.authenticatedAs, "ashwini@college-domain.ac.in");
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    // ----------------------------------------------------
    // TEST 4: Configured Faculty B creates transporter authenticated as Faculty B (Isolation)
    // ----------------------------------------------------
    await test("Test 4: Faculty B authenticates with Faculty B's credentials (Strict Isolation)", async () => {
        const facultyB = {
            _id: "faculty-B",
            name: "Prof. Rahul Patil",
            email: "rahul@college-domain.ac.in",
            emailSettings: {
                configured: true,
                service: "gmail",
                email: "rahul@college-domain.ac.in",
                appPassword: "mockAppPasswordFacultyB"
            }
        };

        let capturedTransportConfig = null;
        let capturedMailOptions = null;
        const origCreateTransport = nodemailer.createTransport;

        nodemailer.createTransport = (config) => {
            capturedTransportConfig = config;
            return {
                sendMail: async (opts) => {
                    capturedMailOptions = opts;
                    return { messageId: "msg-faculty-b" };
                }
            };
        };

        try {
            const res = await emailService.sendThankingEmail({
                facultyUser: facultyB,
                guestEmail: "speaker@industry.com",
                guestName: "Dr. Speaker",
                eventTitle: "Cybersecurity Seminar",
                organizerName: facultyB.name,
                senderEmail: facultyB.email
            });

            // Verify transport authentication
            assert.strictEqual(
                capturedTransportConfig.auth.user,
                "rahul@college-domain.ac.in",
                `Transporter auth.user must be rahul@college-domain.ac.in, got: ${capturedTransportConfig.auth.user}`
            );
            assert.strictEqual(
                capturedTransportConfig.auth.pass,
                "mockAppPasswordFacultyB",
                "Transporter auth.pass must match Faculty B's appPassword"
            );
            assert.notStrictEqual(
                capturedTransportConfig.auth.user,
                "ashwini@college-domain.ac.in",
                "Faculty B must NOT use Faculty A's credentials"
            );
            assert.notStrictEqual(
                capturedTransportConfig.auth.user,
                process.env.EMAIL_USER,
                "Faculty B must NOT use .env EMAIL_USER"
            );

            assert(capturedMailOptions.from.includes("rahul@college-domain.ac.in"));
            assert(capturedMailOptions.from.includes("Prof. Rahul Patil"));
            assert.strictEqual(capturedMailOptions.replyTo, "rahul@college-domain.ac.in");
            assert.strictEqual(res.authenticatedAs, "rahul@college-domain.ac.in");
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    // ----------------------------------------------------
    // TEST 5: System Emails remain intact using .env
    // ----------------------------------------------------
    await test("Test 5: System Emails (OTP & Approval) continue using .env credentials", async () => {
        let otpMailOptions = null;
        let approvalMailOptions = null;
        const origCreateTransport = nodemailer.createTransport;

        nodemailer.createTransport = (config) => {
            return {
                sendMail: async (opts) => {
                    if (opts.subject.includes("Verification") || opts.subject.includes("EduCRM")) otpMailOptions = opts;
                    if (opts.subject.includes("Approved") || opts.subject.includes("Approval")) approvalMailOptions = opts;
                    return { messageId: "msg-system" };
                }
            };
        };

        try {
            await emailService.sendOtpEmail("student@college.edu", "123456", "verification");
            assert(otpMailOptions, "OTP mail options should be captured");
            assert(otpMailOptions.from.includes(process.env.EMAIL_USER), "OTP must be sent from system .env account");

            await emailService.sendWorkshopApprovalEmail({
                facultyEmail: "ashwini@college.edu",
                facultyName: "Ashwini Shirke",
                workshopTitle: "Web Dev Bootcamp"
            });
            assert(approvalMailOptions, "Workshop approval mail options should be captured");
            assert(approvalMailOptions.from.includes(process.env.EMAIL_USER), "Approval notice must be sent from system .env account");
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    // ----------------------------------------------------
    // TEST 6: PDF Attachment handling
    // ----------------------------------------------------
    await test("Test 6: PDF base64 attachment is properly processed", async () => {
        const facultyA = {
            _id: "faculty-A",
            name: "Ashwini Shirke",
            email: "ashwini@college-domain.ac.in",
            emailSettings: {
                configured: true,
                service: "gmail",
                email: "ashwini@college-domain.ac.in",
                appPassword: "mockAppPasswordFacultyA"
            }
        };

        let capturedMailOptions = null;
        const origCreateTransport = nodemailer.createTransport;

        nodemailer.createTransport = () => ({
            sendMail: async (opts) => {
                capturedMailOptions = opts;
                return { messageId: "msg-pdf" };
            }
        });

        try {
            const mockPdfBase64 = "data:application/pdf;base64,JVBERi0xLjQKJUZha2VQZGY=";
            await emailService.sendInvitationEmail({
                facultyUser: facultyA,
                guestEmail: "speaker@industry.com",
                guestName: "Dr. Speaker",
                eventTitle: "Workshop Title",
                organizerName: facultyA.name,
                senderEmail: facultyA.email,
                attachmentBase64: mockPdfBase64
            });

            assert(capturedMailOptions.attachments, "Attachments array must exist");
            assert.strictEqual(capturedMailOptions.attachments.length, 1);
            assert.strictEqual(capturedMailOptions.attachments[0].encoding, "base64");
            assert.strictEqual(capturedMailOptions.attachments[0].content, "JVBERi0xLjQKJUZha2VQZGY=");
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    // ----------------------------------------------------
    // TEST 7: Security - Spoofed senderEmail in payload is ignored
    // ----------------------------------------------------
    await test("Test 7: Security - Spoofed sender identity is rejected/ignored", async () => {
        const legitimateFaculty = {
            _id: "faculty-A",
            name: "Ashwini Shirke",
            email: "ashwini@college-domain.ac.in",
            emailSettings: {
                configured: true,
                service: "gmail",
                email: "ashwini@college-domain.ac.in",
                appPassword: "legitimatePassword123"
            }
        };

        let capturedTransportConfig = null;
        const origCreateTransport = nodemailer.createTransport;
        nodemailer.createTransport = (config) => {
            capturedTransportConfig = config;
            return {
                sendMail: async () => ({ messageId: "msg-legit" })
            };
        };

        try {
            // An attacker modifies the client request trying to send as another professor: "principal@college.ac.in"
            const spoofedPayloadSenderEmail = "principal@college.ac.in";
            
            const res = await emailService.sendInvitationEmail({
                facultyUser: legitimateFaculty, // loaded on backend strictly from req.user._id
                senderEmail: spoofedPayloadSenderEmail,
                guestEmail: "guest@example.com",
                guestName: "Guest",
                eventTitle: "Event",
                organizerName: legitimateFaculty.name
            });

            // Transport authentication MUST authenticate as legitimate faculty, NOT the spoofed address
            assert.strictEqual(
                capturedTransportConfig.auth.user,
                "ashwini@college-domain.ac.in",
                "SMTP transport must authenticate with authenticated user's configured credentials, not spoofed email!"
            );
            assert.strictEqual(res.authenticatedAs, "ashwini@college-domain.ac.in");
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    // ----------------------------------------------------
    // TEST 8: verifyFacultyCredentials helper validation
    // ----------------------------------------------------
    await test("Test 8: verifyFacultyCredentials validates input correctly", async () => {
        let threwOnMissing = false;
        try {
            await emailService.verifyFacultyCredentials({ email: "test@domain.com", appPassword: "" });
        } catch (err) {
            threwOnMissing = true;
        }
        assert(threwOnMissing, "verifyFacultyCredentials must fail if password is empty");
    });

    console.log("\n================================================================");
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================");

    if (failed > 0) {
        process.exit(1);
    }
})();
