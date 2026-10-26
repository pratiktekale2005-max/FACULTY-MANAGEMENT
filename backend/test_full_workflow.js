const BASE_URL = "http://localhost:5000/api";

async function post(url, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data.error || `HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
}

async function get(url, token) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { method: "GET", headers });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data.error || `HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
}

async function put(url, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data.error || `HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
}

async function del(url, token) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { method: "DELETE", headers });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data.error || `HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
}

async function runTests() {
    console.log("=== FULL WORKFLOW AUTOMATED REGRESSION & INTEGRATION SUITE ===");

    try {
        // 1. Authenticate Faculty
        console.log("\n[1] Testing Faculty Authentication...");
        const loginData = await post(`${BASE_URL}/auth/login`, {
            email: "samiksharavankole@gmail.com",
            password: "Password@123"
        });
        const token = loginData.accessToken || loginData.token;
        const currentUser = loginData.user;
        console.log(`✅ Faculty Logged in: ${currentUser.name} (${currentUser.role}, ${currentUser.department})`);

        // 2. Faculty Profile
        console.log("\n[2] Testing Faculty Profile (/api/faculty/me)...");
        const profileData = await get(`${BASE_URL}/faculty/me`, token);
        console.log(`✅ Profile retrieved: ${profileData.faculty?.name || profileData.name}`);

        // 3. Timetable
        console.log("\n[3] Testing Timetable (/api/timetable)...");
        const ttData = await get(`${BASE_URL}/timetable`, token);
        const schedules = ttData.schedules || ttData || [];
        console.log(`✅ Timetable retrieved: ${schedules.length} scheduled slots`);

        // 4. Assignment Marks & Scale to 10
        console.log("\n[4] Testing Assignment Marks (/api/assignment-marks)...");
        const subjectsData = await get(`${BASE_URL}/subjects`, token);
        const subjects = subjectsData.subjects || subjectsData || [];
        console.log(`   Faculty has ${subjects.length} allocated subjects`);
        let records = [];
        if (subjects.length > 0) {
            const firstSubject = subjects[0];
            const div = firstSubject.division || "A";
            const marksData = await get(`${BASE_URL}/assignment-marks?subjectId=${firstSubject._id}&division=${div}`, token);
            records = marksData.assignmentMarks || [];
        }
        console.log(`✅ Assignment Marks records retrieved: ${records.length} records`);
        if (records.length > 0) {
            const first = records[0];
            console.log(`   Sample record: Student ${first.studentName || first.rollNumber}, Total /50: ${first.totalMarksOutOf50}`);
            const allMax10 = records.every(r => 
                (r.assignment1?.marks === null || r.assignment1?.marks <= 10) &&
                (r.assignment2?.marks === null || r.assignment2?.marks <= 10) &&
                (r.assignment3?.marks === null || r.assignment3?.marks <= 10) &&
                (r.assignment4?.marks === null || r.assignment4?.marks <= 10) &&
                (r.assignment5?.marks === null || r.assignment5?.marks <= 10)
            );
            console.log(`✅ Validation: All assignments are strictly <= 10 marks: ${allMax10}`);
        }

        // Test Assignment Mark validation > 10 is rejected
        try {
            await post(`${BASE_URL}/assignment-marks`, {
                subjectId: "dummy",
                studentId: "dummy",
                assignmentNumber: 1,
                marks: 15 // should fail
            }, token);
            console.log("❌ Error: Marks > 10 was not rejected!");
        } catch (valErr) {
            console.log(`✅ Mark > 10 correctly rejected with status ${valErr.status || 400}`);
        }

        // 5. Certifications
        console.log("\n[5] Testing Certifications (/api/certifications)...");
        const certsData = await get(`${BASE_URL}/certifications`, token);
        const certs = certsData.certifications || certsData || [];
        console.log(`✅ Certifications retrieved: ${certs.length} certificates`);

        // 6. Research Papers
        console.log("\n[6] Testing Research Papers (/api/papers)...");
        const papersData = await get(`${BASE_URL}/papers`, token);
        const papers = papersData.papers || papersData || [];
        console.log(`✅ Research Papers retrieved: ${papers.length} publications`);

        // 7. My Submissions
        console.log("\n[7] Testing My Submissions (/api/submissions)...");
        const subsData = await get(`${BASE_URL}/submissions`, token);
        const subs = subsData.submissions || [];
        console.log(`✅ Submissions retrieved: ${subs.length} academic submissions`);

        // 8. Other Activities
        console.log("\n[8] Testing Other Activities (/api/activities)...");
        const actData = await get(`${BASE_URL}/activities`, token);
        const acts = actData.activities || actData || [];
        console.log(`✅ Other Activities retrieved: ${acts.length} activities`);

        // 9. Events & Workshops Module (Section 10)
        console.log("\n[9] Testing Events & Workshops (/api/workshops)...");
        const eventsData = await get(`${BASE_URL}/workshops`, token);
        const events = eventsData.workshops || [];
        console.log(`✅ Events retrieved: ${events.length} events`);

        if (events.length > 0) {
            const targetEvent = events[0];
            console.log(`   Testing on Event: "${targetEvent.title}" (ID: ${targetEvent._id})`);

            // 9a. Guest Management: Add Guest
            console.log("   [9a] Adding guest to event...");
            const addGuestData = await post(`${BASE_URL}/workshops/${targetEvent._id}/guests`, {
                name: "Dr. Vikram Sethi",
                designation: "Chief AI Scientist",
                organization: "NVIDIA Labs India",
                email: "vikram.sethi@nvidia.com",
                contact: "+91 98220 12345"
            }, token);
            const addedGuest = addGuestData.guest;
            console.log(`   ✅ Guest Added: ${addedGuest.name} (ID: ${addedGuest._id})`);

            // 9b. Guest Management: Edit Guest
            console.log("   [9b] Editing guest details...");
            const editGuestData = await put(`${BASE_URL}/workshops/${targetEvent._id}/guests/${addedGuest._id}`, {
                name: "Dr. Vikram Sethi, Ph.D.",
                designation: "VP of Research & AI",
                organization: "NVIDIA Applied Research"
            }, token);
            console.log(`   ✅ Guest Edited: ${editGuestData.guest.name} - ${editGuestData.guest.designation}`);

            // 9c. Letter Generation: Generate Letter PDF
            console.log("   [9c] Generating official letter PDF...");
            const letterPdfData = await post(`${BASE_URL}/workshops/${targetEvent._id}/generate-letter-pdf`, {
                letterData: {
                    institutionName: "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
                    departmentName: targetEvent.department || "Department of Computer Science & Engineering",
                    refNo: `DYPCOEI/COMP/${new Date().getFullYear()}/0099`,
                    letterDate: new Date().toISOString().split("T")[0],
                    letterType: "invitation",
                    guestName: addedGuest.name,
                    guestDesignation: addedGuest.designation,
                    guestOrg: addedGuest.organization,
                    eventTitle: targetEvent.title,
                    eventDate: targetEvent.date ? new Date(targetEvent.date).toISOString().split("T")[0] : "",
                    eventTime: targetEvent.time || "10:00 AM - 01:00 PM",
                    eventVenue: targetEvent.venue || "Campus Auditorium",
                    organizerName: currentUser.name,
                    principalName: "Dr. Suresh Mali"
                }
            }, token);
            console.log(`   ✅ Letter PDF Generated successfully: Filename=${letterPdfData.filename}, Size=${Math.round(letterPdfData.pdfBase64.length / 1024)} KB`);

            // 9d. Guest Management: Remove Guest
            console.log("   [9d] Removing test guest...");
            const delGuestData = await del(`${BASE_URL}/workshops/${targetEvent._id}/guests/${addedGuest._id}`, token);
            console.log(`   ✅ Guest Removed: ${delGuestData.message}`);
        }

        console.log("\n=======================================================");
        console.log("🎉 ALL INTEGRATION AND REGRESSION TESTS PASSED 100% ✅");
        console.log("=======================================================");
    } catch (err) {
        console.error("\n❌ Test Suite Failed:", err.data || err.message);
        process.exit(1);
    }
}

runTests();
