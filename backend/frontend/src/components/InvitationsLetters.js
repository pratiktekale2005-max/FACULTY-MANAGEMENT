import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function InvitationsLetters({ currentUser }) {
    const isHOD = currentUser?.role === "HOD";
    const isPrincipal = currentUser?.role === "Principal";

    // View tab: "generator" or "audit"
    const [activeTab, setActiveTab] = useState("generator");

    // Template selection
    const [templateType, setTemplateType] = useState(isHOD ? "faculty_appointment" : isPrincipal ? "faculty_appointment" : "invitation");
    const [usersList, setUsersList] = useState([]);
    const [auditLetters, setAuditLetters] = useState([]);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");

    // Action states
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailTargetLetter, setEmailTargetLetter] = useState(null);
    const [targetEmailInput, setTargetEmailInput] = useState("");
    const [feedbackMsg, setFeedbackMsg] = useState(null);
    const [viewDetailModal, setViewDetailModal] = useState(null);

    // ================= OFFICIAL LETTERS REGISTER STATE (Requirement 2) =================
    const [registers, setRegisters] = useState([]);
    const [isLoadingRegister, setIsLoadingRegister] = useState(false);
    const [registerSearch, setRegisterSearch] = useState("");
    const [registerTypeFilter, setRegisterTypeFilter] = useState("all");
    const [registerEntryFilter, setRegisterEntryFilter] = useState("all");
    const [registerDeptFilter, setRegisterDeptFilter] = useState("all");
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
    const [editingRegister, setEditingRegister] = useState(null);
    const [viewRegisterModal, setViewRegisterModal] = useState(null);
    const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);

    const initialRegisterForm = {
        registerTitle: "",
        registerNumber: "",
        letterType: "Inward",
        subject: "",
        senderOrRecipient: "",
        entryType: "Inward",
        letterDate: new Date().toISOString().split("T")[0],
        receivedOrDispatchDate: new Date().toISOString().split("T")[0],
        department: "",
        description: "",
        attachment: "",
        attachmentName: ""
    };
    const [registerForm, setRegisterForm] = useState(initialRegisterForm);

    // Dynamic sender details based on logged-in user (Section 2 & 6)
    const senderName = currentUser?.fullName || currentUser?.name || (isPrincipal ? "Dr. Suresh Mali" : isHOD ? "Dr. Adsul Mam" : "Faculty Member");
    const senderDesignation = isPrincipal 
        ? "Principal" 
        : isHOD 
            ? "Vice Principal / CE - HOD" 
            : "Faculty";
    const senderDept = currentUser?.department || currentUser?.departmentId?.name || "Computer Engineering";
    const senderEmail = currentUser?.email || "";

    // Common Guest Letters State (Invitation, Thanking, Offer, Official Comm)
    const [guestForm, setGuestForm] = useState({
        recipientName: "Dr. Ramesh Kumar",
        recipientDesignation: "Senior AI Architect & Research Lead",
        recipientOrganization: "Tata Consultancy Services (TCS), Pune",
        recipientEmail: "ramesh.kumar@example.com",
        recipientAddress: "Hinjawadi Phase 3, Pune, Maharashtra 411057",
        eventTitle: "Recent Trends in Generative AI & Cloud Architectures",
        eventDate: new Date().toISOString().split("T")[0],
        eventTime: "10:00 AM - 01:00 PM",
        eventVenue: "Sir M. Visvesvaraya Seminar Hall, Varale Campus",
        eventDepartment: senderDept,
        refNo: `DYPCOEI/${(senderDept || "COMP").toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
        letterDate: new Date().toISOString().split("T")[0],
        // Offer letter specifics
        engagementHours: "4 Hours (Interactive Hands-on Session)",
        honorariumAmount: "5000",
        // Signatory option
        signatoryType: "single", // "single" (current user) or "three_party" (Coordinator + HOD + Principal)
        bodyText: ""
    });

    // Faculty Appointment Letter state
    const [facultyForm, setFacultyForm] = useState({
        selectedUserId: "",
        facultyName: "Dr. Sneha Sharma",
        employeeId: "EMP-CS-2026",
        department: senderDept,
        designation: "Assistant Professor",
        joiningDate: new Date().toISOString().split("T")[0],
        refNo: `DYPCOEI/HR/${new Date().getFullYear()}/FAC-APT-${Math.floor(100 + Math.random() * 900)}`,
        letterDate: new Date().toISOString().split("T")[0],
        payScale: "Academic Level 10 (Pay Matrix: ₹57,700 - ₹1,82,400)",
        probationPeriod: "One Year from date of joining",
        reportingAuthority: "Head of the Department & Principal",
        termsText: "You will be responsible for conducting instructional lectures, student mentoring, research projects, curriculum development, and institutional governance assignments as entrusted from time to time.",
        signatoryName: isHOD ? senderName : "Dr. Suresh Mali",
        signatoryDesignation: isHOD ? `Head of Department (${senderDept})` : "Principal & Head of Institution"
    });

    // HOD Appointment Letter state (Principal only)
    const [hodForm, setHodForm] = useState({
        selectedUserId: "",
        hodName: "Dr. Alpana Adsul",
        department: senderDept,
        employeeId: "EMP-HOD-012",
        designation: "Head of the Department & Professor",
        appointmentDate: new Date().toISOString().split("T")[0],
        refNo: `DYPCOEI/ADMIN/${new Date().getFullYear()}/HOD-APT-${Math.floor(100 + Math.random() * 900)}`,
        letterDate: new Date().toISOString().split("T")[0],
        tenure: "3 Years (Subject to institutional review)",
        responsibilitiesText: "As Head of the Department, you shall spearhead academic curriculum delivery, faculty peer reviews, student discipline, research development, NAAC/NBA accreditation portfolios, and departmental administrative steering.",
        allowance: "Special Administrative Allowance as per Institutional Norms",
        signatoryName: "Dr. Suresh Mali",
        signatoryDesignation: "Principal & Member Secretary"
    });

    // Load initial users roster and audit history
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const uData = await api.get("/users");
                const members = uData.users || [];
                setUsersList(members);

                // Auto-fill default faculty
                const defaultFaculty = members.find(u => u.role === "Faculty" && (u.department === senderDept || u.departmentId?.name === senderDept)) 
                    || members.find(u => u.role === "Faculty") 
                    || members[0];

                if (defaultFaculty) {
                    setFacultyForm(prev => ({
                        ...prev,
                        selectedUserId: defaultFaculty._id,
                        facultyName: defaultFaculty.name || defaultFaculty.fullName || prev.facultyName,
                        employeeId: defaultFaculty.employeeId || prev.employeeId,
                        department: defaultFaculty.department || defaultFaculty.departmentId?.name || prev.department,
                        designation: defaultFaculty.designation || prev.designation,
                        joiningDate: defaultFaculty.joiningDate || prev.joiningDate
                    }));
                }

                // Auto-fill default HOD candidate
                const defaultHod = members.find(u => u.role === "HOD") || members[0];
                if (defaultHod) {
                    setHodForm(prev => ({
                        ...prev,
                        selectedUserId: defaultHod._id,
                        hodName: defaultHod.name || defaultHod.fullName || prev.hodName,
                        department: defaultHod.department || defaultHod.departmentId?.name || prev.department,
                        employeeId: defaultHod.employeeId || prev.employeeId,
                        designation: `Head of Department & ${defaultHod.designation || "Professor"}`,
                        appointmentDate: defaultHod.joiningDate || prev.appointmentDate
                    }));
                }
            } catch (err) {
                console.error("Failed to load official letter dependencies:", err);
            }
        };

        loadInitialData();
    }, [senderDept]);

    // Fetch audit history when tab changes
    const fetchAuditHistory = async () => {
        setIsLoadingAudit(true);
        try {
            const res = await api.get("/letters");
            if (res && res.letters) {
                setAuditLetters(res.letters);
            }
        } catch (err) {
            console.error("Failed to fetch official letters audit history:", err);
        } finally {
            setIsLoadingAudit(false);
        }
    };

    useEffect(() => {
        if (activeTab === "audit") {
            fetchAuditHistory();
        } else if (activeTab === "register") {
            fetchRegisters();
        }
    }, [activeTab]);

    // Fetch official letters registers (Requirement 2)
    const fetchRegisters = async () => {
        setIsLoadingRegister(true);
        try {
            const res = await api.get("/letters/register");
            if (res && res.registers) {
                setRegisters(res.registers);
            }
        } catch (err) {
            console.error("Failed to load letters register:", err);
        } finally {
            setIsLoadingRegister(false);
        }
    };

    const handleOpenCreateRegister = () => {
        setEditingRegister(null);
        setRegisterForm({
            ...initialRegisterForm,
            registerNumber: `REG/${(senderDept || "OFFICE").toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
            department: senderDept || "General Administration"
        });
        setRegisterModalOpen(true);
    };

    const handleOpenEditRegister = (reg) => {
        setEditingRegister(reg);
        setRegisterForm({
            registerTitle: reg.registerTitle || "",
            registerNumber: reg.registerNumber || "",
            letterType: reg.letterType || "Inward",
            subject: reg.subject || "",
            senderOrRecipient: reg.senderOrRecipient || "",
            entryType: reg.entryType || "Inward",
            letterDate: reg.letterDate ? new Date(reg.letterDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            receivedOrDispatchDate: reg.receivedOrDispatchDate ? new Date(reg.receivedOrDispatchDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            department: reg.department || senderDept || "General Administration",
            description: reg.description || "",
            attachment: reg.attachment || "",
            attachmentName: reg.attachmentName || ""
        });
        setRegisterModalOpen(true);
    };

    const handleRegisterFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit ❌");
            e.target.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setRegisterForm(prev => ({
                ...prev,
                attachment: reader.result,
                attachmentName: file.name
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveRegister = async (e) => {
        e.preventDefault();
        if (!registerForm.registerTitle.trim() || !registerForm.registerNumber.trim() || !registerForm.subject.trim() || !registerForm.senderOrRecipient.trim()) {
            alert("Please fill in all required fields (Title, Register Number, Subject, Sender/Recipient) ❌");
            return;
        }

        setIsSubmittingRegister(true);
        try {
            if (editingRegister) {
                await api.put(`/letters/register/${editingRegister._id}`, registerForm);
                setFeedbackMsg({
                    type: "success",
                    text: "Official letter register entry updated successfully! ✅"
                });
            } else {
                await api.post("/letters/register", registerForm);
                setFeedbackMsg({
                    type: "success",
                    text: "New official letter register entry saved successfully! ✅"
                });
            }
            setRegisterModalOpen(false);
            fetchRegisters();
        } catch (err) {
            console.error("Save register entry error:", err);
            alert(err.response?.data?.error || err.message || "Failed to save register entry ❌");
        } finally {
            setIsSubmittingRegister(false);
        }
    };

    const handleDeleteRegister = async (id) => {
        if (!window.confirm("Are you sure you want to delete this register record?")) return;
        try {
            await api.delete(`/letters/register/${id}`);
            setFeedbackMsg({
                type: "success",
                text: "Register record deleted successfully! ✅"
            });
            fetchRegisters();
        } catch (err) {
            alert(err.response?.data?.error || err.message || "Failed to delete register record ❌");
        }
    };

    // Update bodyText whenever template or relevant fields change
    useEffect(() => {
        if (templateType === "invitation") {
            setGuestForm(prev => ({
                ...prev,
                bodyText: `It gives us immense pleasure to formally invite you as a distinguished Resource Person / Guest Speaker for our upcoming academic session on "${prev.eventTitle}". Our students and faculty members are eagerly looking forward to your valuable insights and technical expertise.

The session is scheduled to take place on ${prev.eventDate ? new Date(prev.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "the scheduled date"} at ${prev.eventTime} at ${prev.eventVenue}.

We would be deeply honored by your presence and look forward to receiving your kind confirmation.`
            }));
        } else if (templateType === "thanking") {
            setGuestForm(prev => ({
                ...prev,
                bodyText: `On behalf of the Department of ${senderDept} and Dr. D. Y. Patil College of Engineering & Innovation, we express our profound gratitude and appreciation to you for delivering an exceptional session on "${prev.eventTitle}" on ${prev.eventDate ? new Date(prev.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "the scheduled date"}.

The session was exceptionally well received by our students and faculty members. Your insightful discourse, technical rigour, and real-world deployment illustrations provided our scholars with immensely practical perspectives.

We deeply appreciate your valuable time and mentorship, and look forward to sustained academic collaboration in the future.`
            }));
        } else if (templateType === "offer") {
            setGuestForm(prev => ({
                ...prev,
                bodyText: `On behalf of the Governing Board and Academic Directorate of Dr. D. Y. Patil College of Engineering & Innovation, we are pleased to offer you the engagement as an External Resource Person / Workshop Expert for conducting specialized instruction on "${prev.eventTitle}".

Key particulars of the engagement include:
• Duration / Hours: ${prev.engagementHours}
• Remuneration / Honorarium: ₹${prev.honorariumAmount} (inclusive of standard institutional honorarium provisions)
• Department: Department of ${senderDept}

We look forward to confirming your acceptance and successfully conducting this academic program under your leadership.`
            }));
        } else if (templateType === "official_comm") {
            setGuestForm(prev => ({
                ...prev,
                bodyText: `This official letter serves as formal institutional communication regarding "${prev.eventTitle}".

The Department of ${senderDept} hereby intimates all concerned stakeholders regarding the official schedule, deliberations, and compliance guidelines established for this academic program.`
            }));
        }
    }, [templateType, senderDept, guestForm.eventTitle, guestForm.eventDate, guestForm.eventTime, guestForm.eventVenue, guestForm.engagementHours, guestForm.honorariumAmount]);

    // Handle Faculty selection auto-fill
    const handleSelectFaculty = (userId) => {
        const selected = usersList.find(u => u._id === userId);
        if (!selected) return;

        setFacultyForm(prev => ({
            ...prev,
            selectedUserId: userId,
            facultyName: selected.name || selected.fullName || "",
            employeeId: selected.employeeId || "Pending Allocation",
            department: selected.department || selected.departmentId?.name || senderDept,
            designation: selected.designation || "Assistant Professor",
            joiningDate: selected.joiningDate || new Date().toISOString().split("T")[0]
        }));
    };

    // Handle HOD selection auto-fill
    const handleSelectHod = (userId) => {
        const selected = usersList.find(u => u._id === userId);
        if (!selected) return;

        setHodForm(prev => ({
            ...prev,
            selectedUserId: userId,
            hodName: selected.name || selected.fullName || "",
            department: selected.department || selected.departmentId?.name || "Computer Engineering",
            employeeId: selected.employeeId || "EMP-HOD",
            designation: `Head of Department & ${selected.designation || "Professor"}`,
            appointmentDate: selected.joiningDate || new Date().toISOString().split("T")[0]
        }));
    };

    // Generate & Download Official PDF (via Backend PDFKit)
    const handleGenerateAndDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        setFeedbackMsg(null);
        try {
            let payload = {};

            if (templateType === "faculty_appointment") {
                payload = {
                    letterType: "faculty_appointment",
                    refNo: facultyForm.refNo,
                    letterDate: facultyForm.letterDate,
                    subject: `Appointment Order for the Position of ${facultyForm.designation}`,
                    recipient: {
                        name: facultyForm.facultyName,
                        designation: facultyForm.designation,
                        department: facultyForm.department,
                        organization: "Dr. D. Y. Patil College of Engineering & Innovation",
                        employeeId: facultyForm.employeeId
                    },
                    eventDetails: {
                        title: `Faculty Appointment - ${facultyForm.facultyName}`,
                        date: facultyForm.joiningDate,
                        department: facultyForm.department,
                        venue: "Campus"
                    },
                    bodyText: `On behalf of the Governing Board of Dr. D. Y. Patil College of Engineering & Innovation, we are delighted to formally offer and confirm your appointment to the substantive faculty position of ${facultyForm.designation} in the Department of ${facultyForm.department} with effect from ${facultyForm.joiningDate}.\n\nTerms & Particulars:\n• Pay Scale: ${facultyForm.payScale}\n• Probation: ${facultyForm.probationPeriod}\n• Reporting Authority: ${facultyForm.reportingAuthority}\n\n${facultyForm.termsText}`
                };
            } else if (templateType === "hod_appointment") {
                payload = {
                    letterType: "hod_appointment",
                    refNo: hodForm.refNo,
                    letterDate: hodForm.letterDate,
                    subject: `Order of Appointment as Head of the Department (HOD) - ${hodForm.department}`,
                    recipient: {
                        name: hodForm.hodName,
                        designation: hodForm.designation,
                        department: hodForm.department,
                        organization: "Dr. D. Y. Patil College of Engineering & Innovation",
                        employeeId: hodForm.employeeId
                    },
                    eventDetails: {
                        title: `HOD Appointment - ${hodForm.hodName}`,
                        date: hodForm.appointmentDate,
                        department: hodForm.department,
                        venue: "Campus"
                    },
                    bodyText: `In recognition of your exceptional academic credentials, organizational steering, and dedication to institutional growth, the College Directorate is pleased to appoint you as ${hodForm.designation} for the Department of ${hodForm.department}, effective from ${hodForm.appointmentDate}.\n\nLeadership Mandate & Terms:\n• Tenure Duration: ${hodForm.tenure}\n• Administrative Allowance: ${hodForm.allowance}\n• Direct Report: Principal & Director\n\n${hodForm.responsibilitiesText}`
                };
            } else {
                // Guest Letters
                payload = {
                    letterType: templateType,
                    refNo: guestForm.refNo,
                    letterDate: guestForm.letterDate,
                    subject: templateType === "invitation" 
                        ? `Invitation as Guest Speaker / Resource Person for "${guestForm.eventTitle}"`
                        : templateType === "thanking"
                            ? `Letter of Gratitude & Appreciation for "${guestForm.eventTitle}"`
                            : templateType === "offer"
                                ? `Offer & Engagement Letter for "${guestForm.eventTitle}"`
                                : `Official Institutional Communication - "${guestForm.eventTitle}"`,
                    recipient: {
                        name: guestForm.recipientName,
                        designation: guestForm.recipientDesignation,
                        organization: guestForm.recipientOrganization,
                        email: guestForm.recipientEmail,
                        address: guestForm.recipientAddress
                    },
                    eventDetails: {
                        title: guestForm.eventTitle,
                        date: guestForm.eventDate,
                        time: guestForm.eventTime,
                        venue: guestForm.eventVenue,
                        department: guestForm.eventDepartment || senderDept,
                        honorarium: guestForm.honorariumAmount,
                        durationHours: guestForm.engagementHours
                    },
                    bodyText: guestForm.bodyText,
                    signatoryType: guestForm.signatoryType
                };
            }

            const res = await api.post("/letters/generate", payload);

            if (res && res.pdfBase64) {
                // Download file
                const downloadLink = document.createElement("a");
                downloadLink.href = res.pdfBase64;
                downloadLink.download = `Official_${templateType.toUpperCase()}_${(payload.recipient.name || "Document").replace(/\s+/g, "_")}.pdf`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                setFeedbackMsg({
                    type: "success",
                    text: `Official ${templateType.toUpperCase()} letter generated & saved to audit trail successfully! 📄✅`
                });

                // Trigger audit update
                fetchAuditHistory();
            }
        } catch (err) {
            console.error("Failed to generate official letter PDF:", err);
            setFeedbackMsg({
                type: "error",
                text: err.response?.data?.error || err.message || "Failed to generate official PDF letter ❌"
            });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Open Send Email Modal
    const handleOpenEmailModal = () => {
        setTargetEmailInput(guestForm.recipientEmail || "");
        setEmailTargetLetter(null); // will generate fresh
        setEmailModalOpen(true);
    };

    // Send Official Letter Email
    const handleSendOfficialEmail = async () => {
        if (!targetEmailInput || !targetEmailInput.includes("@")) {
            alert("Please enter a valid recipient email address 📧");
            return;
        }

        setIsSendingEmail(true);
        setFeedbackMsg(null);
        try {
            let letterId = emailTargetLetter?._id;

            // If not existing letter, generate first
            if (!letterId) {
                const payload = {
                    letterType: templateType,
                    refNo: guestForm.refNo,
                    letterDate: guestForm.letterDate,
                    subject: templateType === "invitation" 
                        ? `Invitation as Guest Speaker for "${guestForm.eventTitle}"`
                        : `Official Letter for "${guestForm.eventTitle}"`,
                    recipient: {
                        name: guestForm.recipientName,
                        designation: guestForm.recipientDesignation,
                        organization: guestForm.recipientOrganization,
                        email: targetEmailInput,
                        address: guestForm.recipientAddress
                    },
                    eventDetails: {
                        title: guestForm.eventTitle,
                        date: guestForm.eventDate,
                        time: guestForm.eventTime,
                        venue: guestForm.eventVenue,
                        department: guestForm.eventDepartment || senderDept,
                        honorarium: guestForm.honorariumAmount
                    },
                    bodyText: guestForm.bodyText,
                    signatoryType: guestForm.signatoryType
                };

                const genRes = await api.post("/letters/generate", payload);
                letterId = genRes.letter?._id;
            }

            // Dispatch email
            await api.post(`/letters/${letterId}/send`, { recipientEmail: targetEmailInput });

            setEmailModalOpen(false);
            setFeedbackMsg({
                type: "success",
                text: `Official letter successfully dispatched to ${targetEmailInput} with signed PDF attached! 📧✅`
            });

            fetchAuditHistory();
        } catch (err) {
            console.error("Failed to send official letter email:", err);
            setFeedbackMsg({
                type: "error",
                text: err.response?.data?.error || err.message || "Failed to dispatch official letter email ❌"
            });
        } finally {
            setIsSendingEmail(false);
        }
    };

    // Direct Browser Print
    const handlePrint = () => {
        window.print();
    };

    // Filter audit letters
    const filteredAudit = auditLetters.filter(l => {
        const matchesSearch = !searchQuery || 
            (l.refNo && l.refNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (l.recipient?.name && l.recipient.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (l.subject && l.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (l.eventDetails?.title && l.eventDetails.title.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesType = filterType === "all" || l.letterType === filterType;

        return matchesSearch && matchesType;
    });

    return (
        <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl space-y-6 print:p-0 print:border-0 print:bg-transparent">
            {/* Embedded Print Styling */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 14mm;
                    }
                    body, html {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    aside, header, nav, .print\\:hidden, button, select, input, textarea {
                        display: none !important;
                    }
                    .printable-letter-area {
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        display: block !important;
                    }
                    .printable-letter-area * {
                        color: black !important;
                        border-color: #333 !important;
                    }
                }
            `}} />

            {/* Header with Tabs and Actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
                <div>
                    <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>✉️ Global Official Letter &amp; Guest Communication System</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Fixed institutional letterhead, role-based sender authority, PDFKit document generation, and verified audit trail.
                    </p>
                </div>

                {/* Main Tabs */}
                <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                    <button
                        onClick={() => setActiveTab("generator")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === "generator"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        ✍️ Generate Letter
                    </button>
                    <button
                        onClick={() => setActiveTab("audit")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            activeTab === "audit"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <span>📋 Document Audit Trail</span>
                        {auditLetters.length > 0 && (
                            <span className="bg-indigo-900/80 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {auditLetters.length}
                            </span>
                        )}
                    </button>
                    {(isHOD || isPrincipal) && (
                        <button
                            onClick={() => setActiveTab("register")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                activeTab === "register"
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <span>📑 Official Register</span>
                            {registers.length > 0 && (
                                <span className="bg-indigo-900/80 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    {registers.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Feedback notification banner */}
            {feedbackMsg && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between print:hidden ${
                    feedbackMsg.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                    <span>{feedbackMsg.text}</span>
                    <button onClick={() => setFeedbackMsg(null)} className="font-bold ml-3 text-slate-400 hover:text-white">✕</button>
                </div>
            )}

            {/* Authenticated Sender Security Banner (Section 2 & 12) */}
            <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs print:hidden">
                <div className="flex items-center gap-2.5">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-sm border border-indigo-500/20">🏛️</span>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Institutional Signatory</span>
                        <span className="font-bold text-slate-100">
                            {senderName} &bull; <span className="text-indigo-400">{senderDesignation}</span> &bull; {senderDept}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="text-emerald-400">●</span> Anti-Impersonation Active (Bound to Login Credentials)
                </div>
            </div>

            {/* ================= TAB 1: GENERATE OFFICIAL LETTER ================= */}
            {activeTab === "generator" && (
                <div className="space-y-6">
                    {/* Control Bar: Template Selector and Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850 print:hidden">
                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <label className="text-xs font-bold text-slate-400 shrink-0">Official Letter Type:</label>
                            <select
                                className="text-xs text-slate-200 bg-slate-900 border border-slate-750 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full sm:w-auto"
                                value={templateType}
                                onChange={(e) => setTemplateType(e.target.value)}
                            >
                                <option value="invitation">Guest Speaker / Resource Person Invitation</option>
                                <option value="thanking">Official Gratitude &amp; Thanking Letter</option>
                                <option value="official_comm">Official Institutional Communication</option>
                                {(isPrincipal || isHOD) && (
                                    <option value="faculty_appointment">Faculty Appointment Order</option>
                                )}
                                {isPrincipal && (
                                    <option value="hod_appointment">HOD Appointment Order</option>
                                )}
                            </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                onClick={handlePrint}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 active:translate-y-0.5 flex items-center gap-1.5"
                                title="Print Preview"
                            >
                                <span>🖨️ Print</span>
                            </button>

                            {(templateType === "invitation" || templateType === "thanking" || templateType === "official_comm") && (
                                <button
                                    onClick={handleOpenEmailModal}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all active:translate-y-0.5 flex items-center gap-1.5"
                                    title="Send Official Letter by Email"
                                >
                                    <span>✉️ Send Email</span>
                                </button>
                            )}

                            <button
                                onClick={handleGenerateAndDownloadPdf}
                                disabled={isGeneratingPdf}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 active:translate-y-0.5 flex items-center gap-1.5 disabled:opacity-50"
                                title="Generate and Download Official PDF"
                            >
                                <span>{isGeneratingPdf ? "Generating..." : "📥 Download Official PDF"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Split View: Editor Inputs vs Live Master Preview */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start print:grid-cols-1 print:gap-0">
                        {/* Form Inputs Panel (hidden during print) */}
                        <div className="bg-slate-950/30 border border-slate-850 p-5 rounded-2xl space-y-4 print:hidden text-xs">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    Configure {templateType.replace("_", " ").toUpperCase()} Details
                                </h3>
                                <span className="text-[10px] text-indigo-400 font-semibold">Live Synced 🔄</span>
                            </div>

                            {/* GUEST LETTERS FIELDS (invitation, thanking, official_comm) */}
                            {(templateType === "invitation" || templateType === "thanking" || templateType === "official_comm") && (
                                <div className="space-y-3.5">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Recipient Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                            value={guestForm.recipientName}
                                            onChange={(e) => setGuestForm({ ...guestForm, recipientName: e.target.value })}
                                            placeholder="e.g. Dr. Ramesh Kumar"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Designation</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                value={guestForm.recipientDesignation}
                                                onChange={(e) => setGuestForm({ ...guestForm, recipientDesignation: e.target.value })}
                                                placeholder="e.g. Professor / Lead Scientist"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Organization / Institution</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                value={guestForm.recipientOrganization}
                                                onChange={(e) => setGuestForm({ ...guestForm, recipientOrganization: e.target.value })}
                                                placeholder="e.g. IIT Bombay / TCS"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Recipient Email</label>
                                            <input
                                                type="email"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                value={guestForm.recipientEmail}
                                                onChange={(e) => setGuestForm({ ...guestForm, recipientEmail: e.target.value })}
                                                placeholder="guest@example.com"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Reference Number</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                                                value={guestForm.refNo}
                                                onChange={(e) => setGuestForm({ ...guestForm, refNo: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Event / Lecture Theme / Title</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                            value={guestForm.eventTitle}
                                            onChange={(e) => setGuestForm({ ...guestForm, eventTitle: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Event Date</label>
                                            <input
                                                type="date"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                value={guestForm.eventDate}
                                                onChange={(e) => setGuestForm({ ...guestForm, eventDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Session Time</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                value={guestForm.eventTime}
                                                onChange={(e) => setGuestForm({ ...guestForm, eventTime: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Campus Venue</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                            value={guestForm.eventVenue}
                                            onChange={(e) => setGuestForm({ ...guestForm, eventVenue: e.target.value })}
                                        />
                                    </div>
                                    {/* Signatory Mode */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Signatory Structure</label>
                                        <select
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                            value={guestForm.signatoryType}
                                            onChange={(e) => setGuestForm({ ...guestForm, signatoryType: e.target.value })}
                                        >
                                            <option value="single">Single Authority ({senderDesignation}: {senderName})</option>
                                            <option value="three_party">3-Party Signatures (Coordinator + HOD + Principal)</option>
                                        </select>
                                    </div>

                                    {/* Dynamic Letter Body */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Official Letter Body Text</label>
                                        <textarea
                                            rows={5}
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                                            value={guestForm.bodyText}
                                            onChange={(e) => setGuestForm({ ...guestForm, bodyText: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* FACULTY APPOINTMENT FIELDS */}
                            {templateType === "faculty_appointment" && (
                                <div className="space-y-3.5">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-indigo-400 uppercase">Select Faculty Member (Auto-Fill)</label>
                                        <select
                                            className="w-full text-xs text-slate-100 bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                            value={facultyForm.selectedUserId}
                                            onChange={(e) => handleSelectFaculty(e.target.value)}
                                        >
                                            <option value="">-- Choose Faculty Member --</option>
                                            {usersList.filter(u => u.role === "Faculty" || u.role === "HOD").map(u => (
                                                <option key={u._id} value={u._id}>
                                                    {u.name} ({u.employeeId || "No ID"}) &bull; {u.department || u.departmentId?.name || "Dept"}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Faculty Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                            value={facultyForm.facultyName}
                                            onChange={(e) => setFacultyForm({ ...facultyForm, facultyName: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Employee ID</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={facultyForm.employeeId}
                                                onChange={(e) => setFacultyForm({ ...facultyForm, employeeId: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Department</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={facultyForm.department}
                                                onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Designation</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={facultyForm.designation}
                                                onChange={(e) => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Joining Date</label>
                                            <input
                                                type="date"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={facultyForm.joiningDate}
                                                onChange={(e) => setFacultyForm({ ...facultyForm, joiningDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Pay Scale / Band</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                            value={facultyForm.payScale}
                                            onChange={(e) => setFacultyForm({ ...facultyForm, payScale: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Probation Period</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                            value={facultyForm.probationPeriod}
                                            onChange={(e) => setFacultyForm({ ...facultyForm, probationPeriod: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Custom Terms &amp; Responsibilities</label>
                                        <textarea
                                            rows={3}
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none resize-none"
                                            value={facultyForm.termsText}
                                            onChange={(e) => setFacultyForm({ ...facultyForm, termsText: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* HOD APPOINTMENT FIELDS (Principal only) */}
                            {templateType === "hod_appointment" && isPrincipal && (
                                <div className="space-y-3.5">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-amber-400 uppercase">Select HOD Candidate (Auto-Fill)</label>
                                        <select
                                            className="w-full text-xs text-slate-100 bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                                            value={hodForm.selectedUserId}
                                            onChange={(e) => handleSelectHod(e.target.value)}
                                        >
                                            <option value="">-- Choose HOD Candidate --</option>
                                            {usersList.map(u => (
                                                <option key={u._id} value={u._id}>
                                                    {u.name} ({u.role}) &bull; {u.department || u.departmentId?.name || "Dept"}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">HOD Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                            value={hodForm.hodName}
                                            onChange={(e) => setHodForm({ ...hodForm, hodName: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Department</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={hodForm.department}
                                                onChange={(e) => setHodForm({ ...hodForm, department: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Employee ID</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={hodForm.employeeId}
                                                onChange={(e) => setHodForm({ ...hodForm, employeeId: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Appointment Date</label>
                                            <input
                                                type="date"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={hodForm.appointmentDate}
                                                onChange={(e) => setHodForm({ ...hodForm, appointmentDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Tenure Duration</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                                value={hodForm.tenure}
                                                onChange={(e) => setHodForm({ ...hodForm, tenure: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Departmental Mandate &amp; Duties</label>
                                        <textarea
                                            rows={3}
                                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none resize-none"
                                            value={hodForm.responsibilitiesText}
                                            onChange={(e) => setHodForm({ ...hodForm, responsibilitiesText: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* MASTER PRINTABLE DOCUMENT PREVIEW PANE (Section 3: Fixed College Letterhead) */}
                        <div className="xl:col-span-2 bg-white text-slate-900 font-serif border border-slate-200 p-8 sm:p-10 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto min-h-[800px] flex flex-col justify-between print:border-0 print:shadow-none print:p-0 print:m-0 print:text-black printable-letter-area">
                            <div>
                                {/* Master Fixed Institutional Header (Exact official layout) */}
                                <div className="border-b-2 border-[#800000] pb-3 mb-1">
                                    <div className="flex items-center justify-between gap-3">
                                        {/* Left Crest Logo */}
                                        <img 
                                            src="/assets/college_logo.jpeg" 
                                            alt="DYP Crest" 
                                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0" 
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />

                                        {/* Center Official Title */}
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] sm:text-[11px] font-bold text-[#800000] uppercase tracking-wide">
                                                Dr. D. Y. Patil Educational Federation’s
                                            </p>
                                            <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-[#1e1b4b] uppercase leading-tight mt-0.5">
                                                Dr. D. Y. PATIL COLLEGE OF ENGINEERING &amp; INNOVATION
                                            </h1>
                                            <p className="text-[9px] sm:text-[10px] text-slate-700 font-sans font-semibold mt-0.5">
                                                (An Autonomous Institute Affiliated to SPPU)
                                            </p>
                                            <p className="text-[8px] sm:text-[8.5px] text-slate-600 font-sans leading-tight mt-0.5">
                                                Survey No. 27/A/1/2C, Varale Campus, Near Talegaon Railway Station, Tal. Maval, Dist. Pune 410 507, Ph: 020 48522561, 565,566
                                            </p>
                                            <p className="text-[8px] sm:text-[8.5px] text-slate-600 font-sans leading-tight">
                                                Web Site: www.dypcoei.edu.in, Email: principal.dypcoei@dypatilef.com
                                            </p>
                                        </div>

                                        {/* Right NAAC 'A' Grade Seal */}
                                        <img 
                                            src="/assets/naac_logo.jpeg" 
                                            alt="NAAC Seal" 
                                            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0" 
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div className="border-b border-[#1e1b4b] mt-2"></div>
                                </div>

                                {/* Leadership Information Banner */}
                                <div className="flex justify-between items-center text-[9.5px] font-sans font-semibold text-slate-700 border-b border-slate-300 pb-1.5 mb-2">
                                    <div>
                                        <span className="font-bold text-slate-900">Dr. Adsul Mam</span>
                                        <span className="text-slate-600"> | Vice Principal / CE - HOD</span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900">Dr. Suresh Mali</span>
                                        <span className="text-slate-600"> | Principal</span>
                                    </div>
                                </div>

                                {/* Reference and Date Bar */}
                                <div className="mt-4 flex justify-between items-center text-xs font-sans text-slate-700 font-semibold border-b border-slate-200 pb-2">
                                    <p>Ref. No: <span className="font-mono text-slate-900 font-bold">{templateType === "faculty_appointment" ? facultyForm.refNo : templateType === "hod_appointment" ? hodForm.refNo : guestForm.refNo}</span></p>
                                    <p>Date: <span className="text-slate-900 font-bold">{new Date(templateType === "faculty_appointment" ? facultyForm.letterDate : templateType === "hod_appointment" ? hodForm.letterDate : guestForm.letterDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></p>
                                </div>

                                {/* Recipient Section */}
                                {(templateType === "invitation" || templateType === "thanking" || templateType === "official_comm") && (
                                    <div className="mt-5 space-y-4">
                                        <div className="text-xs space-y-0.5 font-sans">
                                            <p className="font-bold text-slate-700">To,</p>
                                            <p className="text-sm font-bold text-slate-900 font-serif">{guestForm.recipientName}</p>
                                            <p className="text-slate-700">{guestForm.recipientDesignation}</p>
                                            <p className="text-slate-700">{guestForm.recipientOrganization}</p>
                                            {guestForm.recipientAddress && <p className="text-slate-500 text-[11px]">{guestForm.recipientAddress}</p>}
                                        </div>

                                        {/* Subject Banner */}
                                        <div className="bg-slate-50 border-l-4 border-[#800000] p-2.5 rounded text-xs font-bold text-slate-900 uppercase font-sans">
                                            Subject: {templateType === "invitation" 
                                                ? `Invitation as Guest Speaker / Resource Person for "${guestForm.eventTitle}"`
                                                : templateType === "thanking"
                                                    ? `Letter of Gratitude & Appreciation for session on "${guestForm.eventTitle}"`
                                                    : `Official Institutional Communication - "${guestForm.eventTitle}"`}
                                        </div>

                                        {/* Salutation & Body */}
                                        <div className="text-[12.5px] leading-relaxed space-y-3 text-justify text-slate-800">
                                            <p className="font-semibold">Respected Sir / Madam,</p>
                                            <div className="whitespace-pre-line">
                                                {guestForm.bodyText}
                                            </div>

                                            {/* Session Details Box */}
                                            {guestForm.eventTitle && (
                                                <table className="w-full text-left text-xs border border-slate-300 font-sans my-3">
                                                    <tbody>
                                                        <tr className="border-b border-slate-200">
                                                            <td className="p-2 bg-slate-100 font-bold w-1/3 text-slate-700">Session Theme / Topic</td>
                                                            <td className="p-2 font-medium text-slate-900">{guestForm.eventTitle}</td>
                                                        </tr>
                                                        <tr className="border-b border-slate-200">
                                                            <td className="p-2 bg-slate-100 font-bold text-slate-700">Scheduled Date &amp; Time</td>
                                                            <td className="p-2 font-medium text-slate-900">{new Date(guestForm.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ({guestForm.eventTime})</td>
                                                        </tr>
                                                        <tr className="border-b border-slate-200">
                                                            <td className="p-2 bg-slate-100 font-bold text-slate-700">Designated Venue</td>
                                                            <td className="p-2 font-medium text-slate-900">{guestForm.eventVenue}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            )}

                                            <p className="pt-1">
                                                {templateType === "invitation" 
                                                    ? "Thank you for your sustained academic stewardship and support."
                                                    : templateType === "thanking"
                                                        ? "We look forward to sustained academic collaboration in our future endeavours."
                                                        : "We look forward to an impactful session under your technical guidance."}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* FACULTY APPOINTMENT PREVIEW */}
                                {templateType === "faculty_appointment" && (
                                    <div className="space-y-4 mt-5">
                                        <div className="text-xs space-y-0.5 border-l-2 border-[#1e1b4b] pl-3 py-1 font-sans">
                                            <p className="font-bold text-slate-500 uppercase text-[9px]">Confidential Appointment Order</p>
                                            <p className="text-sm font-black text-slate-900 font-serif">{facultyForm.facultyName}</p>
                                            <p className="font-medium text-slate-700">Employee ID: <span className="font-bold text-slate-900">{facultyForm.employeeId}</span></p>
                                            <p className="font-medium text-slate-700">Department of {facultyForm.department}</p>
                                        </div>

                                        <div className="bg-slate-50 border-l-4 border-[#1e1b4b] p-2.5 rounded text-xs font-bold text-slate-900 uppercase font-sans">
                                            Subject: Appointment Order for the Position of {facultyForm.designation}
                                        </div>

                                        <div className="text-[12.5px] leading-relaxed space-y-3 text-justify text-slate-800">
                                            <p className="font-semibold">Dear {facultyForm.facultyName},</p>
                                            <p>
                                                On behalf of the Governing Board of <strong>Dr. D. Y. Patil College of Engineering &amp; Innovation</strong>, we are delighted to formally confirm your appointment to the substantive faculty position of <strong>{facultyForm.designation}</strong> in the <strong>Department of {facultyForm.department}</strong> with effect from <strong>{new Date(facultyForm.joiningDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.
                                            </p>

                                            <table className="w-full text-left text-xs border border-slate-300 font-sans my-2">
                                                <tbody>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="p-2 bg-slate-100 font-bold w-1/3 text-slate-700">Designation &amp; Dept</td>
                                                        <td className="p-2 font-medium text-slate-900">{facultyForm.designation} &bull; Dept. of {facultyForm.department}</td>
                                                    </tr>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="p-2 bg-slate-100 font-bold text-slate-700">Pay Scale &amp; Band</td>
                                                        <td className="p-2 font-medium text-slate-900">{facultyForm.payScale}</td>
                                                    </tr>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="p-2 bg-slate-100 font-bold text-slate-700">Effective Date</td>
                                                        <td className="p-2 font-medium text-slate-900">{new Date(facultyForm.joiningDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                                                    </tr>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="p-2 bg-slate-100 font-bold text-slate-700">Probation Period</td>
                                                        <td className="p-2 font-medium text-slate-900">{facultyForm.probationPeriod}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-2 bg-slate-100 font-bold text-slate-700">Reporting Line</td>
                                                        <td className="p-2 font-medium text-slate-900">{facultyForm.reportingAuthority}</td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <p>{facultyForm.termsText}</p>
                                        </div>
                                    </div>
                                )}

                                {/* HOD APPOINTMENT PREVIEW */}
                                {templateType === "hod_appointment" && isPrincipal && (
                                    <div className="space-y-4 mt-5">
                                        <div className="text-xs space-y-0.5 border-l-2 border-amber-600 pl-3 py-1 font-sans">
                                            <p className="font-bold text-amber-700 uppercase text-[9px]">Administrative Appointment Notification</p>
                                            <p className="text-sm font-black text-slate-900 font-serif">{hodForm.hodName}</p>
                                            <p className="font-medium text-slate-700">Employee ID: <span className="font-bold text-slate-900">{hodForm.employeeId}</span></p>
                                            <p className="font-medium text-slate-700">Department of {hodForm.department}</p>
                                        </div>

                                        <div className="bg-amber-50 border-l-4 border-amber-600 p-2.5 rounded text-xs font-bold text-amber-950 uppercase font-sans">
                                            Subject: Order of Appointment as Head of the Department (HOD) - {hodForm.department}
                                        </div>

                                        <div className="text-[12.5px] leading-relaxed space-y-3 text-justify text-slate-800">
                                            <p className="font-semibold">Dear {hodForm.hodName},</p>
                                            <p>
                                                In recognition of your exceptional academic credentials and leadership, the College Directorate is pleased to appoint you as <strong>{hodForm.designation}</strong> for the <strong>Department of {hodForm.department}</strong>, effective from <strong>{new Date(hodForm.appointmentDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.
                                            </p>

                                            <table className="w-full text-left text-xs border border-slate-300 font-sans my-2">
                                                <tbody>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="p-2 bg-slate-100 font-bold w-1/3 text-slate-700">Leadership Mandate</td>
                                                        <td className="p-2 font-medium text-slate-900">Head of the Department (HOD)</td>
                                                    </tr>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="p-2 bg-slate-100 font-bold text-slate-700">Tenure Duration</td>
                                                        <td className="p-2 font-medium text-slate-900">{hodForm.tenure}</td>
                                                    </tr>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="p-2 bg-slate-100 font-bold text-slate-700">Administrative Benefits</td>
                                                        <td className="p-2 font-medium text-slate-900">{hodForm.allowance}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-2 bg-slate-100 font-bold text-slate-700">Direct Report</td>
                                                        <td className="p-2 font-medium text-slate-900">Principal &amp; Member Secretary</td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <p>{hodForm.responsibilitiesText}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Official Signatures Section (Section 8: Dynamic Role-Based Signatures) */}
                            <div className="mt-8 pt-5 border-t border-slate-300 font-sans">
                                {guestForm.signatoryType === "three_party" && templateType !== "faculty_appointment" && templateType !== "hod_appointment" ? (
                                    /* 3-Party Signatures for Institutional Events */
                                    <div className="grid grid-cols-3 gap-4 text-center text-xs">
                                        <div className="space-y-1">
                                            <div className="w-24 h-8 border-b border-dashed border-slate-400 mx-auto mb-1"></div>
                                            <p className="font-bold text-slate-900">{senderName}</p>
                                            <p className="text-[10px] text-slate-600">Faculty</p>
                                            <p className="text-[9px] text-slate-500">Dept. of {senderDept}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="w-24 h-8 border-b border-dashed border-slate-400 mx-auto mb-1"></div>
                                            <p className="font-bold text-slate-900">Dr. Adsul Mam</p>
                                            <p className="text-[10px] text-slate-600">Vice Principal / CE - HOD</p>
                                            <p className="text-[9px] text-slate-500">Dept. of {senderDept}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="w-24 h-8 border-b border-dashed border-slate-400 mx-auto mb-1"></div>
                                            <p className="font-bold text-slate-900">Dr. Suresh Mali</p>
                                            <p className="text-[10px] text-slate-600">Principal</p>
                                            <p className="text-[9px] text-slate-500">DYPCOEI, Pune</p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Single Authority Signatory */
                                    <div className="flex justify-between items-end text-xs">
                                        <div>
                                            <p className="text-slate-600 text-xs mb-4">Regards,</p>
                                            <div className="w-32 h-8 border-b border-dashed border-slate-400 mb-1.5"></div>
                                            <p className="font-bold text-slate-900 text-sm font-serif">
                                                {templateType === "faculty_appointment" 
                                                    ? facultyForm.signatoryName 
                                                    : templateType === "hod_appointment" 
                                                        ? hodForm.signatoryName 
                                                        : senderName}
                                            </p>
                                            <p className="text-[11px] text-[#4338ca] font-semibold mt-0.5">
                                                {templateType === "faculty_appointment" 
                                                    ? facultyForm.signatoryDesignation 
                                                    : templateType === "hod_appointment" 
                                                        ? hodForm.signatoryDesignation 
                                                        : senderDesignation}
                                            </p>
                                            {senderDept && (
                                                <p className="text-[10px] text-slate-600">Department of {senderDept}</p>
                                            )}
                                            <p className="text-[9px] text-slate-500">Dr. D. Y. Patil College of Engineering &amp; Innovation</p>
                                        </div>

                                        {(templateType === "faculty_appointment" || templateType === "hod_appointment") ? (
                                            <div className="text-right">
                                                <div className="w-32 h-8 border-b border-dashed border-slate-400 mb-1.5 ml-auto"></div>
                                                <p className="font-bold text-slate-900 text-xs">Signature of Appointee</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">I accept the terms &amp; conditions</p>
                                                <p className="text-[9px] text-slate-400">Date: _______________</p>
                                            </div>
                                        ) : (
                                            <div className="text-right text-[8.5px] text-slate-400">
                                                * This document is officially authorized and electronically recorded in institutional archives.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= TAB 2: DOCUMENT HISTORY & AUDIT TRAIL (Section 11) ================= */}
            {activeTab === "audit" && (
                <div className="space-y-4">
                    {/* Search and Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                        <div className="flex items-center gap-2 w-full sm:w-80">
                            <span className="text-xs text-slate-500">🔍</span>
                            <input
                                type="text"
                                placeholder="Search by recipient, ref no, or subject..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <select
                                className="text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All Document Types</option>
                                <option value="invitation">Invitation Letters</option>
                                <option value="thanking">Thanking Letters</option>
                                <option value="faculty_appointment">Faculty Appointment</option>
                                <option value="hod_appointment">HOD Appointment</option>
                            </select>

                            <button
                                onClick={fetchAuditHistory}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-all"
                                title="Refresh Audit Trail"
                            >
                                🔄
                            </button>
                        </div>
                    </div>

                    {/* Table of Generated Letters */}
                    <div className="bg-slate-950/30 border border-slate-850 rounded-2xl overflow-hidden">
                        {isLoadingAudit ? (
                            <div className="p-12 text-center text-xs text-slate-400">Loading official document audit trail... ⏳</div>
                        ) : filteredAudit.length === 0 ? (
                            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                                <div className="text-3xl">📭</div>
                                <p className="font-semibold text-slate-400">No official letters recorded yet</p>
                                <p className="text-[11px] text-slate-600">Generated letters will automatically appear here with verifiable audit timestamps.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3.5">Ref No &amp; Date</th>
                                            <th className="p-3.5">Type &amp; Subject</th>
                                            <th className="p-3.5">Recipient Details</th>
                                            <th className="p-3.5">Sender / Authority</th>
                                            <th className="p-3.5">Dispatch Status</th>
                                            <th className="p-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850">
                                        {filteredAudit.map((letter) => {
                                            const isSent = letter.sentStatus === "sent";
                                            return (
                                                <tr key={letter._id} className="hover:bg-slate-900/40 transition-colors">
                                                    <td className="p-3.5">
                                                        <span className="font-mono font-bold text-slate-200 block text-[11px]">{letter.refNo}</span>
                                                        <span className="text-[10px] text-slate-500">{new Date(letter.date || letter.createdAt).toLocaleDateString()}</span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1 ${
                                                            letter.letterType === "invitation" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                                            letter.letterType === "thanking" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                            letter.letterType === "offer" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                            "bg-slate-800 text-slate-300"
                                                        }`}>
                                                            {letter.letterType}
                                                        </span>
                                                        <p className="text-slate-200 font-semibold truncate max-w-xs">{letter.subject || letter.eventDetails?.title || "Official Document"}</p>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <p className="font-bold text-slate-200">{letter.recipient?.name}</p>
                                                        <p className="text-[10px] text-slate-400">{letter.recipient?.designation} &bull; {letter.recipient?.organization}</p>
                                                        {letter.recipient?.email && (
                                                            <p className="text-[9px] text-indigo-400">{letter.recipient.email}</p>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5">
                                                        <p className="font-bold text-slate-200">{letter.sender?.name}</p>
                                                        <p className="text-[10px] text-slate-400">{letter.sender?.role} ({letter.sender?.department})</p>
                                                    </td>
                                                    <td className="p-3.5">
                                                        {isSent ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                                                <span>✉️ Dispatched</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                                <span>⏳ Not Sent</span>
                                                            </span>
                                                        )}
                                                        {letter.sentAt && (
                                                            <span className="text-[9px] text-slate-500 block mt-0.5">
                                                                {new Date(letter.sentAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5 text-right space-x-2">
                                                        {letter.pdfBase64 && (
                                                            <a
                                                                href={letter.pdfBase64}
                                                                download={`Official_${letter.letterType.toUpperCase()}_${(letter.recipient?.name || "Letter").replace(/\s+/g, "_")}.pdf`}
                                                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all inline-block"
                                                                title="Download Stored PDF"
                                                            >
                                                                📥 PDF
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setEmailTargetLetter(letter);
                                                                setTargetEmailInput(letter.recipient?.email || "");
                                                                setEmailModalOpen(true);
                                                            }}
                                                            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all"
                                                            title="Dispatch via Email"
                                                        >
                                                            ✉️ Email
                                                        </button>
                                                        <button
                                                            onClick={() => setViewDetailModal(letter)}
                                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                                                            title="View Details"
                                                        >
                                                            👁️ View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= TAB 3: OFFICIAL LETTERS REGISTER (Requirement 2) ================= */}
            {activeTab === "register" && (isHOD || isPrincipal) && (
                <div className="space-y-4">
                    {/* Header with New Register button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                        <div>
                            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <span>📑 Official Letters Register</span>
                                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                    Permanent Records &amp; Documents
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Track inward and outward official letters, university circulars, government orders, institutional notices, and attachments.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchRegisters}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                                title="Refresh Register"
                            >
                                🔄 Refresh
                            </button>
                            <button
                                onClick={handleOpenCreateRegister}
                                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 text-xs"
                            >
                                <span>➕ New Register</span>
                            </button>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <div>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                placeholder="🔍 Search title, ref no, sender, subject..."
                                value={registerSearch}
                                onChange={(e) => setRegisterSearch(e.target.value)}
                            />
                        </div>

                        <div>
                            <select
                                className="w-full text-xs text-slate-350 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                value={registerEntryFilter}
                                onChange={(e) => setRegisterEntryFilter(e.target.value)}
                            >
                                <option value="all">All Directions (Inward / Outward)</option>
                                <option value="Inward">📥 Inward</option>
                                <option value="Outward">📤 Outward</option>
                                <option value="Internal">🏢 Internal</option>
                            </select>
                        </div>

                        <div>
                            <select
                                className="w-full text-xs text-slate-350 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                value={registerTypeFilter}
                                onChange={(e) => setRegisterTypeFilter(e.target.value)}
                            >
                                <option value="all">All Letter Types</option>
                                <option value="Inward">Inward</option>
                                <option value="Outward">Outward</option>
                                <option value="University Circular">University Circular</option>
                                <option value="Government Order">Government Order</option>
                                <option value="Institutional Notice">Institutional Notice</option>
                                <option value="Official Memo">Official Memo</option>
                                <option value="Faculty Appointment">Faculty Appointment</option>
                                <option value="HOD Appointment">HOD Appointment</option>
                                <option value="MOU &amp; Agreement">MOU &amp; Agreement</option>
                                <option value="General Communication">General Communication</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                            <span>Total Entries: <strong className="text-slate-200">{registers.length}</strong></span>
                            {registerSearch && (
                                <button
                                    onClick={() => {
                                        setRegisterSearch("");
                                        setRegisterTypeFilter("all");
                                        setRegisterEntryFilter("all");
                                        setRegisterDeptFilter("all");
                                    }}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Register Table */}
                    <div className="bg-slate-950/30 border border-slate-850 rounded-2xl overflow-hidden">
                        {isLoadingRegister ? (
                            <div className="p-12 text-center text-xs text-slate-400">Loading official letters register... ⏳</div>
                        ) : registers.filter(r => {
                            const q = registerSearch.toLowerCase();
                            const matchesSearch = !q ||
                                (r.registerTitle && r.registerTitle.toLowerCase().includes(q)) ||
                                (r.registerNumber && r.registerNumber.toLowerCase().includes(q)) ||
                                (r.subject && r.subject.toLowerCase().includes(q)) ||
                                (r.senderOrRecipient && r.senderOrRecipient.toLowerCase().includes(q)) ||
                                (r.department && r.department.toLowerCase().includes(q));

                            const matchesType = registerTypeFilter === "all" || r.letterType === registerTypeFilter;
                            const matchesEntry = registerEntryFilter === "all" || r.entryType === registerEntryFilter;
                            const matchesDept = registerDeptFilter === "all" || r.department === registerDeptFilter;

                            return matchesSearch && matchesType && matchesEntry && matchesDept;
                        }).length === 0 ? (
                            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                                <div className="text-3xl">📑</div>
                                <p className="font-semibold text-slate-400">No register entries found</p>
                                <p className="text-[11px] text-slate-600">Click "+ New Register" above to record a new inward or outward official document.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3.5">Register No &amp; Title</th>
                                            <th className="p-3.5">Direction / Type</th>
                                            <th className="p-3.5">Subject</th>
                                            <th className="p-3.5">Sender / Recipient</th>
                                            <th className="p-3.5">Dates</th>
                                            <th className="p-3.5">Department</th>
                                            <th className="p-3.5 text-center">Attachment</th>
                                            <th className="p-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850">
                                        {registers.filter(r => {
                                            const q = registerSearch.toLowerCase();
                                            const matchesSearch = !q ||
                                                (r.registerTitle && r.registerTitle.toLowerCase().includes(q)) ||
                                                (r.registerNumber && r.registerNumber.toLowerCase().includes(q)) ||
                                                (r.subject && r.subject.toLowerCase().includes(q)) ||
                                                (r.senderOrRecipient && r.senderOrRecipient.toLowerCase().includes(q)) ||
                                                (r.department && r.department.toLowerCase().includes(q));

                                            const matchesType = registerTypeFilter === "all" || r.letterType === registerTypeFilter;
                                            const matchesEntry = registerEntryFilter === "all" || r.entryType === registerEntryFilter;
                                            const matchesDept = registerDeptFilter === "all" || r.department === registerDeptFilter;

                                            return matchesSearch && matchesType && matchesEntry && matchesDept;
                                        }).map((reg) => (
                                            <tr key={reg._id} className="hover:bg-slate-900/40 transition-colors">
                                                <td className="p-3.5">
                                                    <span className="font-mono font-bold text-slate-200 block text-[11px]">{reg.registerNumber}</span>
                                                    <span className="text-[11px] text-slate-350 font-semibold">{reg.registerTitle}</span>
                                                </td>
                                                <td className="p-3.5">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1 ${
                                                        reg.entryType === "Inward" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                        reg.entryType === "Outward" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                    }`}>
                                                        {reg.entryType}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400">{reg.letterType}</p>
                                                </td>
                                                <td className="p-3.5 max-w-xs">
                                                    <p className="text-slate-200 font-semibold truncate" title={reg.subject}>{reg.subject}</p>
                                                    {reg.description && (
                                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{reg.description}</p>
                                                    )}
                                                </td>
                                                <td className="p-3.5">
                                                    <p className="font-semibold text-slate-200">{reg.senderOrRecipient}</p>
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="text-[10px] text-slate-400">
                                                        <span>Letter: {new Date(reg.letterDate).toLocaleDateString()}</span>
                                                        {reg.receivedOrDispatchDate && (
                                                            <span className="block text-slate-500">
                                                                {reg.entryType === "Inward" ? "Received: " : "Dispatch: "}
                                                                {new Date(reg.receivedOrDispatchDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3.5 text-slate-350 text-[11px]">
                                                    {reg.department || "General"}
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    {reg.attachment ? (
                                                        <a
                                                            href={reg.attachment}
                                                            download={reg.attachmentName || "Register_Attachment"}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded text-[10px] font-semibold inline-flex items-center gap-1"
                                                            title={reg.attachmentName || "Download Attachment"}
                                                        >
                                                            📎 Download
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-600 text-[10px]">None</span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                                    <button
                                                        onClick={() => setViewRegisterModal(reg)}
                                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                                                        title="View Details"
                                                    >
                                                        👁️ View
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEditRegister(reg)}
                                                        className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-semibold transition-all"
                                                        title="Edit Entry"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRegister(reg._id)}
                                                        className="p-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg text-xs transition-all"
                                                        title="Delete Entry"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CREATE / EDIT REGISTER MODAL */}
            {registerModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#121826] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                    <span>{editingRegister ? "✏️ Edit Official Register Entry" : "➕ New Official Letters Register"}</span>
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {editingRegister ? `Updating Record: ${editingRegister.registerNumber}` : "Create a new entry in the institutional official letters register"}
                                </p>
                            </div>
                            <button onClick={() => setRegisterModalOpen(false)} className="text-slate-400 hover:text-white text-base">✕</button>
                        </div>

                        <form onSubmit={handleSaveRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-350">
                            {/* Register Title */}
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Register Title / Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Inward Correspondence Register 2026 / UGC Circular Inward"
                                    value={registerForm.registerTitle}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, registerTitle: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* Register Number / Ref Number */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Register / Reference Number <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. REG/CE/2026/1042"
                                    value={registerForm.registerNumber}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, registerNumber: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* Entry Type */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Direction</label>
                                <select
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    value={registerForm.entryType}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, entryType: e.target.value }))}
                                >
                                    <option value="Inward">📥 Inward Letter</option>
                                    <option value="Outward">📤 Outward Letter</option>
                                    <option value="Internal">🏢 Internal Departmental</option>
                                </select>
                            </div>

                            {/* Letter Type */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Letter Type</label>
                                <select
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    value={registerForm.letterType}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, letterType: e.target.value }))}
                                >
                                    <option value="Inward">Inward</option>
                                    <option value="Outward">Outward</option>
                                    <option value="University Circular">University Circular</option>
                                    <option value="Government Order">Government Order</option>
                                    <option value="Institutional Notice">Institutional Notice</option>
                                    <option value="Official Memo">Official Memo</option>
                                    <option value="Faculty Appointment">Faculty Appointment</option>
                                    <option value="HOD Appointment">HOD Appointment</option>
                                    <option value="MOU &amp; Agreement">MOU &amp; Agreement</option>
                                    <option value="General Communication">General Communication</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Department */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Computer Science &amp; Engineering"
                                    value={registerForm.department}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, department: e.target.value }))}
                                />
                            </div>

                            {/* Sender / Recipient */}
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Sender / Recipient <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Savitribai Phule Pune University (SPPU) / Directorate of Technical Education (DTE)"
                                    value={registerForm.senderOrRecipient}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, senderOrRecipient: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* Subject */}
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Subject <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    placeholder="Subject or purpose of the letter..."
                                    value={registerForm.subject}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, subject: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* Letter Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Letter Date <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    value={registerForm.letterDate}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, letterDate: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* Received or Dispatch Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    {registerForm.entryType === "Inward" ? "Received Date" : "Dispatch Date"}
                                </label>
                                <input
                                    type="date"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                                    value={registerForm.receivedOrDispatchDate}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, receivedOrDispatchDate: e.target.value }))}
                                />
                            </div>

                            {/* Description / Remarks */}
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Description / Remarks</label>
                                <textarea
                                    rows={2}
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                    placeholder="Add any administrative notes, references, or action items..."
                                    value={registerForm.description}
                                    onChange={(e) => setRegisterForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>

                            {/* Attachment Upload */}
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Document Attachment (PDF, Doc, Image - max 5MB)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                                        onChange={handleRegisterFileChange}
                                    />
                                    {registerForm.attachmentName && (
                                        <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                                            📎 {registerForm.attachmentName}
                                            <button
                                                type="button"
                                                onClick={() => setRegisterForm(prev => ({ ...prev, attachment: "", attachmentName: "" }))}
                                                className="text-rose-400 hover:text-rose-300 ml-1"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRegisterModalOpen(false)}
                                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingRegister}
                                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    {isSubmittingRegister ? "Saving..." : editingRegister ? "Update Register Entry ✅" : "Save Register Entry 💾"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW REGISTER RECORD MODAL */}
            {viewRegisterModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#121826] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                    {viewRegisterModal.entryType} Letter Record
                                </span>
                                <h3 className="text-sm font-bold text-slate-100 mt-1">{viewRegisterModal.registerTitle}</h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ref No: {viewRegisterModal.registerNumber}</p>
                            </div>
                            <button onClick={() => setViewRegisterModal(null)} className="text-slate-400 hover:text-white text-base">✕</button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Subject</p>
                                    <p className="text-slate-200 font-semibold">{viewRegisterModal.subject}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Letter Type</p>
                                    <p className="text-slate-200 font-semibold">{viewRegisterModal.letterType}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Sender / Recipient</p>
                                    <p className="text-slate-200 font-semibold">{viewRegisterModal.senderOrRecipient}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Department</p>
                                    <p className="text-slate-200 font-semibold">{viewRegisterModal.department || "General Administration"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Letter Date</p>
                                    <p className="text-slate-200">{new Date(viewRegisterModal.letterDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">
                                        {viewRegisterModal.entryType === "Inward" ? "Received Date" : "Dispatch Date"}
                                    </p>
                                    <p className="text-slate-200">
                                        {viewRegisterModal.receivedOrDispatchDate ? new Date(viewRegisterModal.receivedOrDispatchDate).toLocaleDateString() : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Created By</p>
                                    <p className="text-slate-200">{viewRegisterModal.createdByName || "Admin"} ({viewRegisterModal.createdByRole || "Staff"})</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Recorded On</p>
                                    <p className="text-slate-200">{new Date(viewRegisterModal.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            {viewRegisterModal.description && (
                                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Description / Remarks</p>
                                    <p className="text-slate-300 whitespace-pre-line leading-relaxed">{viewRegisterModal.description}</p>
                                </div>
                            )}

                            {viewRegisterModal.attachment && (
                                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📎</span>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-200">{viewRegisterModal.attachmentName || "Attached Document"}</p>
                                            <p className="text-[10px] text-slate-500">Official document attachment</p>
                                        </div>
                                    </div>
                                    <a
                                        href={viewRegisterModal.attachment}
                                        download={viewRegisterModal.attachmentName || "register_document"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-all shadow"
                                    >
                                        📥 Download Document
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                            <button
                                onClick={() => setViewRegisterModal(null)}
                                className="px-4 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SEND EMAIL MODAL */}
            {emailModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#121826] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                <span>✉️ Send Official Letter via Email</span>
                            </h3>
                            <button onClick={() => setEmailModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Sender Identity</p>
                                <p className="text-slate-200 font-semibold">{senderName} ({senderDesignation})</p>
                                <p className="text-[10px] text-indigo-400">From: "{senderName} via Dr. D. Y. Patil College of Eng. &amp; Innovation"</p>
                                <p className="text-[10px] text-slate-400">Reply-To: {senderEmail}</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Recipient Email Address <span className="text-rose-400">*</span></label>
                                <input
                                    type="email"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                    value={targetEmailInput}
                                    onChange={(e) => setTargetEmailInput(e.target.value)}
                                    placeholder="Enter any valid recipient email (speaker, faculty, or external recipient)"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                📌 You can dispatch this official letter to any valid email address. The recipient will receive the official communication on institutional letterhead with the signed PDF document automatically attached.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                            <button
                                onClick={() => setEmailModalOpen(false)}
                                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendOfficialEmail}
                                disabled={isSendingEmail}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <span>{isSendingEmail ? "Dispatching..." : "Send Official Letter 🚀"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {viewDetailModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#121826] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100">{viewDetailModal.subject}</h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {viewDetailModal.refNo}</p>
                            </div>
                            <button onClick={() => setViewDetailModal(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Recipient</p>
                                    <p className="text-slate-200 font-bold">{viewDetailModal.recipient?.name}</p>
                                    <p className="text-slate-400">{viewDetailModal.recipient?.designation} &bull; {viewDetailModal.recipient?.organization}</p>
                                    <p className="text-indigo-400 text-[10px]">{viewDetailModal.recipient?.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Authorized Sender</p>
                                    <p className="text-slate-200 font-bold">{viewDetailModal.sender?.name}</p>
                                    <p className="text-slate-400">{viewDetailModal.sender?.role} &bull; Dept. of {viewDetailModal.sender?.department}</p>
                                    <p className="text-slate-500 text-[10px]">Logged at: {new Date(viewDetailModal.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Body Text</p>
                                <p className="text-slate-300 whitespace-pre-line leading-relaxed">{viewDetailModal.bodyText}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                            {viewDetailModal.pdfBase64 && (
                                <a
                                    href={viewDetailModal.pdfBase64}
                                    download={`Official_${viewDetailModal.letterType.toUpperCase()}_${(viewDetailModal.recipient?.name || "Letter").replace(/\s+/g, "_")}.pdf`}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 inline-block"
                                >
                                    📥 Download Attached PDF
                                </a>
                            )}
                            <button
                                onClick={() => setViewDetailModal(null)}
                                className="px-4 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InvitationsLetters;
