import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function InvitationsLetters({ currentUser }) {
    const isHOD = currentUser?.role === "HOD";
    const isPrincipal = currentUser?.role === "Principal";

    // HOD defaults to Faculty Appointment letter; Principal defaults to Invitation
    const [templateType, setTemplateType] = useState(isHOD ? "faculty_appointment" : "invitation");
    const [usersList, setUsersList] = useState([]);
    const [branding, setBranding] = useState(null);

    // Keep template selection restricted if role is HOD
    useEffect(() => {
        if (isHOD && templateType !== "faculty_appointment" && templateType !== "hod_appointment") {
            setTemplateType("faculty_appointment");
        }
    }, [isHOD, templateType]);

    // Common/Invitation/Thank You form state
    const [form, setForm] = useState({
        speakerName: "Dr. Ramesh Kumar",
        speakerDesignation: "Professor & Head of AI Research",
        speakerOrganization: "IIT Bombay",
        topicName: "Scaling NextJS Deployments on Cloud Architectures",
        eventDate: new Date().toISOString().split("T")[0],
        eventTime: "10:00 AM - 01:00 PM",
        eventVenue: "Sir M. Visvesvaraya Seminar Hall",
        signatoryName: "Dr. Sandeep Pathak",
        signatoryDesignation: "Dean of Academic Affairs"
    });

    // Faculty Appointment Letter state
    const [facultyForm, setFacultyForm] = useState({
        selectedUserId: "",
        facultyName: "Dr. Sneha Sharma",
        employeeId: "EMP-CS-2026",
        department: currentUser?.department || "Computer Science",
        designation: "Assistant Professor",
        joiningDate: new Date().toISOString().split("T")[0],
        refNo: "EDU/HR/2026/FAC-APT-042",
        letterDate: new Date().toISOString().split("T")[0],
        payScale: "Academic Level 10 (Pay Matrix: ₹57,700 - ₹1,82,400)",
        probationPeriod: "One Year from date of joining",
        reportingAuthority: "Head of the Department & Principal",
        termsText: "You will be responsible for conducting instructional lectures, student mentoring, research projects, curriculum development, and institutional governance assignments as entrusted from time to time.",
        signatoryName: isHOD ? (currentUser?.fullName || currentUser?.name || "Head of Department") : "Dr. S. K. Kulkarni",
        signatoryDesignation: isHOD ? `Head of Department (${currentUser?.department || "Academic"})` : "Principal & Head of Institution"
    });

    // HOD Appointment Letter state
    const [hodForm, setHodForm] = useState({
        selectedUserId: "",
        hodName: "Dr. Aasha Laxman Tekale",
        department: currentUser?.department || "Computer Science",
        employeeId: "EMP-HOD-012",
        designation: "Head of the Department & Professor",
        appointmentDate: new Date().toISOString().split("T")[0],
        refNo: "EDU/ADMIN/2026/HOD-APT-008",
        letterDate: new Date().toISOString().split("T")[0],
        tenure: "3 Years (Subject to institutional review)",
        responsibilitiesText: "As Head of the Department, you shall spearhead academic curriculum delivery, faculty peer reviews, student discipline, research development, NAAC/NBA accreditation portfolios, and departmental administrative steering.",
        allowance: "Special Administrative Allowance as per Institutional Norms",
        signatoryName: "Dr. S. K. Kulkarni",
        signatoryDesignation: "Principal & Member Secretary"
    });

    // Load branding and user roster
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Load institutional branding
                const orgData = await api.get("/organizations/my-org");
                if (orgData && orgData.organization) {
                    setBranding(orgData.organization);
                }

                // 2. Load users to populate auto-fill dropdowns
                const uData = await api.get("/users");
                const members = uData.users || [];
                setUsersList(members);

                // Auto-fill defaults if users exist
                const deptName = currentUser?.department || currentUser?.departmentId?.name;
                const defaultFaculty = (deptName 
                    ? members.find(u => u.role === "Faculty" && (u.department === deptName || u.departmentId?.name === deptName))
                    : null) || members.find(u => u.role === "Faculty") || members[0];

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

                const defaultHod = members.find(u => u.role === "HOD") || members.find(u => u.role === "Principal") || members[0];
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
    }, [currentUser]);

    // Handle Faculty selection auto-fill
    const handleSelectFaculty = (userId) => {
        const selected = usersList.find(u => u._id === userId);
        if (!selected) return;

        setFacultyForm(prev => ({
            ...prev,
            selectedUserId: userId,
            facultyName: selected.name || selected.fullName || "",
            employeeId: selected.employeeId || "Pending Allocation",
            department: selected.department || selected.departmentId?.name || "General Department",
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
            department: selected.department || selected.departmentId?.name || "Academic Department",
            employeeId: selected.employeeId || "EMP-HOD",
            designation: `Head of Department & ${selected.designation || "Professor"}`,
            appointmentDate: selected.joiningDate || new Date().toISOString().split("T")[0]
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    // Access Guard: Block non-leadership users (such as Faculty or Student)
    if (currentUser && currentUser.role !== "Principal" && currentUser.role !== "HOD") {
        return (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-8 rounded-2xl text-center space-y-3">
                <div className="text-4xl">🚫</div>
                <h2 className="text-base font-bold uppercase tracking-wider">Access Restricted</h2>
                <p className="text-xs text-slate-400">Official letters and appointment orders are restricted to Institutional Leadership (Principal & HOD).</p>
            </div>
        );
    }

    // Derived institution branding details
    const institutionName = branding?.name || "Vidyalankar Institute of Technology";
    const affiliationText = branding?.settings?.branding?.motto || "Approved by AICTE, Affiliated to University of Mumbai & Accredited by NAAC";
    const institutionAddress = branding?.settings?.branding?.footer || "Institutional Campus, Academic Block, Mumbai 400037";

    return (
        <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl space-y-6 print:p-0 print:border-0 print:bg-transparent">
            {/* Embedded Print Styling */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 15mm;
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
                        page-break-inside: avoid;
                    }
                    .printable-letter-area * {
                        color: black !important;
                        border-color: #333 !important;
                    }
                }
            `}} />

            {/* Control Bar (hidden during print) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                        {isHOD ? "Department Appointment Letters & Orders" : "Official Institutional Document Generators"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {isHOD 
                            ? "Configure, edit, preview, print, and export official appointment letters with PDF download" 
                            : "Generate official invitation, thank-you, and formal appointment letters with PDF print export"}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        className="text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                    >
                        {isPrincipal && (
                            <>
                                <option value="invitation">Invitation Letter</option>
                                <option value="thank_you">Thank You Letter</option>
                            </>
                        )}
                        <option value="faculty_appointment">Faculty Appointment Letter</option>
                        <option value="hod_appointment">HOD Appointment Letter</option>
                    </select>

                    <button
                        onClick={handlePrint}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 active:translate-y-0.5 flex items-center gap-1.5"
                        title="Print official letter"
                    >
                        <span>Print 🖨️</span>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:translate-y-0.5 flex items-center gap-1.5"
                        title="Save or Download PDF"
                    >
                        <span>PDF Download 📥</span>
                    </button>
                </div>
            </div>

            {/* Split view: Inputs Form vs Printable Document Preview */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start print:grid-cols-1 print:gap-0">
                
                {/* Inputs Form Panel (hidden during print) */}
                <div className="bg-slate-950/20 border border-slate-850 p-5 rounded-2xl space-y-4 print:hidden text-xs">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {templateType === "invitation" && "Configure Guest Invitation"}
                        {templateType === "thank_you" && "Configure Appreciation Letter"}
                        {templateType === "faculty_appointment" && "Configure Faculty Appointment"}
                        {templateType === "hod_appointment" && "Configure HOD Appointment"}
                    </h3>
                    
                    {/* ================= INVITATION & THANK YOU FORM FIELDS ================= */}
                    {(templateType === "invitation" || templateType === "thank_you") && (
                        <div className="space-y-3.5">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Speaker Name</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={form.speakerName}
                                    onChange={(e) => setForm({ ...form, speakerName: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Speaker Designation</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={form.speakerDesignation}
                                    onChange={(e) => setForm({ ...form, speakerDesignation: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Speaker Organization</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={form.speakerOrganization}
                                    onChange={(e) => setForm({ ...form, speakerOrganization: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Topic / Outline Name</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={form.topicName}
                                    onChange={(e) => setForm({ ...form, topicName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Event Date</label>
                                    <input
                                        type="date"
                                        className="w-full text-xs text-slate-250 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={form.eventDate}
                                        onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Event Time</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={form.eventTime}
                                        onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Event Venue</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={form.eventVenue}
                                    onChange={(e) => setForm({ ...form, eventVenue: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Signatory Name</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={form.signatoryName}
                                    onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Signatory Designation</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={form.signatoryDesignation}
                                    onChange={(e) => setForm({ ...form, signatoryDesignation: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* ================= FACULTY APPOINTMENT FORM FIELDS ================= */}
                    {templateType === "faculty_appointment" && (
                        <div className="space-y-3.5">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-indigo-400 uppercase">Select Existing Faculty (Auto-Fill)</label>
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

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Reference No.</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={facultyForm.refNo}
                                        onChange={(e) => setFacultyForm({ ...facultyForm, refNo: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Letter Date</label>
                                    <input
                                        type="date"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={facultyForm.letterDate}
                                        onChange={(e) => setFacultyForm({ ...facultyForm, letterDate: e.target.value })}
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
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Reporting Line</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={facultyForm.reportingAuthority}
                                    onChange={(e) => setFacultyForm({ ...facultyForm, reportingAuthority: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Custom Terms & Responsibilities</label>
                                <textarea
                                    rows={3}
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none resize-none"
                                    value={facultyForm.termsText}
                                    onChange={(e) => setFacultyForm({ ...facultyForm, termsText: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Signatory Name</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={facultyForm.signatoryName}
                                        onChange={(e) => setFacultyForm({ ...facultyForm, signatoryName: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Signatory Designation</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={facultyForm.signatoryDesignation}
                                        onChange={(e) => setFacultyForm({ ...facultyForm, signatoryDesignation: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================= HOD APPOINTMENT FORM FIELDS ================= */}
                    {templateType === "hod_appointment" && (
                        <div className="space-y-3.5">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-amber-400 uppercase">Select HOD / Professor (Auto-Fill)</label>
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
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Designation</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={hodForm.designation}
                                        onChange={(e) => setHodForm({ ...hodForm, designation: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Appointment Date</label>
                                    <input
                                        type="date"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={hodForm.appointmentDate}
                                        onChange={(e) => setHodForm({ ...hodForm, appointmentDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Reference No.</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={hodForm.refNo}
                                        onChange={(e) => setHodForm({ ...hodForm, refNo: e.target.value })}
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
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Allowances / Governance Terms</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                    value={hodForm.allowance}
                                    onChange={(e) => setHodForm({ ...hodForm, allowance: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Departmental Mandate & Duties</label>
                                <textarea
                                    rows={3}
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none resize-none"
                                    value={hodForm.responsibilitiesText}
                                    onChange={(e) => setHodForm({ ...hodForm, responsibilitiesText: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Signatory Name</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={hodForm.signatoryName}
                                        onChange={(e) => setHodForm({ ...hodForm, signatoryName: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Signatory Designation</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                                        value={hodForm.signatoryDesignation}
                                        onChange={(e) => setHodForm({ ...hodForm, signatoryDesignation: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Printable Document Preview Pane */}
                <div className="xl:col-span-2 bg-white text-slate-900 font-serif border border-slate-200 p-10 rounded-2xl shadow-xl w-full max-w-4xl mx-auto min-h-[750px] flex flex-col justify-between print:border-0 print:shadow-none print:p-0 print:m-0 print:text-black printable-letter-area">
                    
                    <div>
                        {/* Institutional Letterhead Header */}
                        <div className="border-b-2 border-slate-900 pb-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {branding?.logo && (
                                    <img src={branding.logo} alt="Logo" className="w-14 h-14 object-contain shrink-0" />
                                )}
                                <div>
                                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">
                                        {institutionName}
                                    </h1>
                                    <p className="text-[10px] text-slate-600 font-sans font-bold tracking-wider mt-1.5">
                                        {affiliationText}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-500 font-sans shrink-0">
                                <p>{institutionAddress}</p>
                                <p className="font-semibold text-slate-700">Office of the Principal & Director</p>
                            </div>
                        </div>

                        {/* ================= INVITATION / THANK YOU PREVIEW ================= */}
                        {(templateType === "invitation" || templateType === "thank_you") && (
                            <div className="space-y-6">
                                {/* Date and Subject */}
                                <div className="mt-8 text-xs space-y-4">
                                    <div className="flex justify-between">
                                        <p className="font-semibold">Ref: {branding?.shortName || "INST"}/ACAD/2026/GUEST-LECTURE</p>
                                        <p className="font-semibold">Date: {new Date(form.eventDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                                    </div>

                                    <div className="font-semibold space-y-0.5">
                                        <p>To,</p>
                                        <p className="text-sm font-bold text-slate-900">{form.speakerName}</p>
                                        <p>{form.speakerDesignation}</p>
                                        <p>{form.speakerOrganization}</p>
                                    </div>

                                    <div className="pt-2">
                                        <strong className="underline uppercase tracking-wide text-xs">
                                            Subject: {templateType === "invitation" ? "Invitation as Guest Speaker" : "Letter of Gratitude & Appreciation"}
                                        </strong>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="text-[13px] leading-relaxed space-y-4 text-justify">
                                    {templateType === "invitation" ? (
                                        <>
                                            <p>Dear {form.speakerName},</p>
                                            <p>
                                                It gives us immense pleasure to invite you as a distinguished guest speaker for our upcoming academic expert seminar on 
                                                <strong> "{form.topicName}"</strong>. Our students and faculty members are keenly anticipating your insights, 
                                                and we believe your deep expertise and technical steering at {form.speakerOrganization} will provide profound pedagogical value.
                                            </p>
                                            <p>
                                                The seminar session has been scheduled to take place on <strong>{new Date(form.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong> at 
                                                <strong> {form.eventTime}</strong>. The venue designated for the session is <strong>{form.eventVenue}</strong>.
                                            </p>
                                            <p>
                                                We look forward to confirming your availability and warmly hosting you on our campus. Thank you for your continued mentorship.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p>Dear {form.speakerName},</p>
                                            <p>
                                                On behalf of the academic department at {institutionName}, we express our profound gratitude and appreciation to you 
                                                for delivering an exceptional guest lecture session on <strong>"{form.topicName}"</strong> on 
                                                <strong> {new Date(form.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>.
                                            </p>
                                            <p>
                                                The session was exceptionally well received by our enrolled engineering students and faculty. Your insightful discourse, technical rigour, and real-world deployment illustrations provided our scholars with immensely practical perspectives.
                                            </p>
                                            <p>
                                                We deeply appreciate you taking the time out of your busy schedule to interact with our students. We look forward to working together on future collaborative academic endeavours.
                                            </p>
                                        </>
                                    )}
                                    <p className="pt-2">With high regards,</p>
                                </div>
                            </div>
                        )}

                        {/* ================= FACULTY APPOINTMENT PREVIEW ================= */}
                        {templateType === "faculty_appointment" && (
                            <div className="space-y-5 mt-6">
                                <div className="flex justify-between text-xs font-semibold text-slate-700">
                                    <p>Ref: <span className="font-bold text-slate-900">{facultyForm.refNo}</span></p>
                                    <p>Date: <span className="font-bold text-slate-900">{new Date(facultyForm.letterDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></p>
                                </div>

                                <div className="text-xs space-y-0.5 border-l-2 border-slate-900 pl-3 py-1">
                                    <p className="font-bold text-slate-500 uppercase text-[9px]">Confidential / Formal Offer</p>
                                    <p className="text-sm font-black text-slate-900">{facultyForm.facultyName}</p>
                                    <p className="font-medium text-slate-700">Employee ID: <span className="font-bold text-slate-900">{facultyForm.employeeId}</span></p>
                                    <p className="font-medium text-slate-700">Department of {facultyForm.department}</p>
                                </div>

                                <div className="pt-1">
                                    <div className="bg-slate-50 border border-slate-200 p-2 rounded text-xs font-bold text-slate-900 uppercase">
                                        Subject: Appointment Order for the Position of {facultyForm.designation}
                                    </div>
                                </div>

                                <div className="text-[12.5px] leading-relaxed space-y-3.5 text-justify text-slate-800">
                                    <p>Dear {facultyForm.facultyName},</p>
                                    <p>
                                        On behalf of the Governing Board of <strong>{institutionName}</strong>, we are delighted to formally offer and confirm your appointment to the substantive faculty position of <strong>{facultyForm.designation}</strong> in the <strong>Department of {facultyForm.department}</strong> with effect from <strong>{new Date(facultyForm.joiningDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.
                                    </p>
                                    <p>
                                        This appointment is governed under the rules, guidelines, and service regulations framed by AICTE, University affiliation statutes, and the institutional management. Key particulars of your appointment are outlined below:
                                    </p>

                                    {/* Appointment particulars table */}
                                    <table className="w-full text-left text-xs border border-slate-300 font-sans my-2">
                                        <tbody>
                                            <tr className="border-b border-slate-200">
                                                <td className="p-2 bg-slate-100 font-bold w-1/3 text-slate-700">Designation & Department</td>
                                                <td className="p-2 font-medium text-slate-900">{facultyForm.designation} &bull; Dept. of {facultyForm.department}</td>
                                            </tr>
                                            <tr className="border-b border-slate-200">
                                                <td className="p-2 bg-slate-100 font-bold text-slate-700">Pay Scale & Entitlements</td>
                                                <td className="p-2 font-medium text-slate-900">{facultyForm.payScale}</td>
                                            </tr>
                                            <tr className="border-b border-slate-200">
                                                <td className="p-2 bg-slate-100 font-bold text-slate-700">Effective Date of Joining</td>
                                                <td className="p-2 font-medium text-slate-900">{new Date(facultyForm.joiningDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                                            </tr>
                                            <tr className="border-b border-slate-200">
                                                <td className="p-2 bg-slate-100 font-bold text-slate-700">Probationary Period</td>
                                                <td className="p-2 font-medium text-slate-900">{facultyForm.probationPeriod}</td>
                                            </tr>
                                            <tr>
                                                <td className="p-2 bg-slate-100 font-bold text-slate-700">Primary Reporting Line</td>
                                                <td className="p-2 font-medium text-slate-900">{facultyForm.reportingAuthority}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <p>
                                        {facultyForm.termsText}
                                    </p>
                                    <p>
                                        We welcome you into the academic fraternity of our institution and trust your pedagogy and academic excellence will enrich our institutional mission.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ================= HOD APPOINTMENT PREVIEW ================= */}
                        {templateType === "hod_appointment" && (
                            <div className="space-y-5 mt-6">
                                <div className="flex justify-between text-xs font-semibold text-slate-700">
                                    <p>Ref: <span className="font-bold text-slate-900">{hodForm.refNo}</span></p>
                                    <p>Date: <span className="font-bold text-slate-900">{new Date(hodForm.letterDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></p>
                                </div>

                                <div className="text-xs space-y-0.5 border-l-2 border-amber-600 pl-3 py-1">
                                    <p className="font-bold text-amber-700 uppercase text-[9px]">Administrative Appointment Notification</p>
                                    <p className="text-sm font-black text-slate-900">{hodForm.hodName}</p>
                                    <p className="font-medium text-slate-700">Employee ID: <span className="font-bold text-slate-900">{hodForm.employeeId}</span></p>
                                    <p className="font-medium text-slate-700">Department of {hodForm.department}</p>
                                </div>

                                <div className="pt-1">
                                    <div className="bg-amber-50 border border-amber-200 p-2 rounded text-xs font-bold text-amber-950 uppercase">
                                        Subject: Order of Appointment as Head of the Department (HOD) - {hodForm.department}
                                    </div>
                                </div>

                                <div className="text-[12.5px] leading-relaxed space-y-3.5 text-justify text-slate-800">
                                    <p>Dear {hodForm.hodName},</p>
                                    <p>
                                        In recognition of your exceptional academic credentials, organizational steering, and dedication to institutional growth, the College Directorate is pleased to appoint you as <strong>{hodForm.designation}</strong> for the <strong>Department of {hodForm.department}</strong>, effective from <strong>{new Date(hodForm.appointmentDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.
                                    </p>

                                    {/* HOD Terms Table */}
                                    <table className="w-full text-left text-xs border border-slate-300 font-sans my-2">
                                        <tbody>
                                            <tr className="border-b border-slate-200">
                                                <td className="p-2 bg-slate-100 font-bold w-1/3 text-slate-700">Leadership Mandate</td>
                                                <td className="p-2 font-medium text-slate-900">Head of the Department (HOD)</td>
                                            </tr>
                                            <tr className="border-b border-slate-200">
                                                <td className="p-2 bg-slate-100 font-bold text-slate-700">Academic Department</td>
                                                <td className="p-2 font-medium text-slate-900">{hodForm.department}</td>
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
                                                <td className="p-2 bg-slate-100 font-bold text-slate-700">Direct Report Authority</td>
                                                <td className="p-2 font-medium text-slate-900">Principal & Director of Institution</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <p>
                                        {hodForm.responsibilitiesText}
                                    </p>
                                    <p>
                                        We extend our warmest congratulations on this leadership appointment and trust that your stewardship will elevate the department to newer heights of educational and research distinction.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Signatures */}
                    <div className="mt-10 pt-6 border-t border-slate-200 flex justify-between items-end text-xs print:mt-12">
                        {/* Principal / Signatory Authority */}
                        <div>
                            <div className="w-32 h-10 border-b border-dashed border-slate-400 mb-2"></div>
                            <p className="font-bold text-slate-900 text-sm">
                                {templateType === "faculty_appointment" ? facultyForm.signatoryName : templateType === "hod_appointment" ? hodForm.signatoryName : form.signatoryName}
                            </p>
                            <p className="text-[10px] text-slate-600 font-sans mt-0.5">
                                {templateType === "faculty_appointment" ? facultyForm.signatoryDesignation : templateType === "hod_appointment" ? hodForm.signatoryDesignation : form.signatoryDesignation}
                            </p>
                            <p className="text-[9px] text-slate-500 font-sans">{institutionName}</p>
                        </div>

                        {/* Candidate Acceptance (for appointment letters) */}
                        {(templateType === "faculty_appointment" || templateType === "hod_appointment") ? (
                            <div className="text-right">
                                <div className="w-32 h-10 border-b border-dashed border-slate-400 mb-2 ml-auto"></div>
                                <p className="font-bold text-slate-900 text-xs">Signature of Appointee</p>
                                <p className="text-[10px] text-slate-500 font-sans mt-0.5">I accept the terms & conditions</p>
                                <p className="text-[9px] text-slate-400 font-sans">Date: _______________</p>
                            </div>
                        ) : (
                            <div className="text-right font-sans text-[8px] text-slate-400">
                                * This official document is electronically verified by the institutional authority.
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}

export default InvitationsLetters;
