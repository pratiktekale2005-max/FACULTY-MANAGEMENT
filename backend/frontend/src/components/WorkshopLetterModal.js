import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";

export default function WorkshopLetterModal({
    workshop,
    initialType = "invitation", // "invitation" | "thanking"
    initialStep = "generate", // "generate" | "view" | "scan" | "send"
    currentUser,
    onClose,
    onUpdated
}) {
    const [letterType, setLetterType] = useState(initialType);
    const [activeStep, setActiveStep] = useState(initialStep);
    
    // Letter Fields
    const [institutionName, setInstitutionName] = useState("EduCRM Academic Institution of Technology");
    const [departmentName, setDepartmentName] = useState(workshop.department || currentUser?.department || "Department of Computer Science & Engineering");
    const [refNo, setRefNo] = useState(`EDU/${(workshop.department || "DEPT").toUpperCase()}/${new Date().getFullYear()}/${(workshop._id || "001").slice(-4).toUpperCase()}`);
    const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
    const [guestName, setGuestName] = useState(workshop.speakerName || "Distinguished Expert");
    const [guestDesignation, setGuestDesignation] = useState(workshop.guestDesignation || workshop.speakerBio || "Industry Consultant / Senior Professor");
    const [guestOrg, setGuestOrg] = useState(workshop.guestOrganization || workshop.speakerOrganization || "Tech Enterprise / University");
    const [guestEmail, setGuestEmail] = useState(workshop.guestEmail || workshop.speakerContact || "");
    const [eventTitle, setEventTitle] = useState(workshop.title || "Special Academic Session");
    const [eventDate, setEventDate] = useState(workshop.date ? new Date(workshop.date).toISOString().split("T")[0] : "");
    const [eventTime, setEventTime] = useState(workshop.time || "10:00 AM - 01:00 PM");
    const [eventVenue, setEventVenue] = useState(workshop.venue || "Campus Seminar Auditorium");
    const [organizerName, setOrganizerName] = useState(workshop.submittedBy?.name || currentUser?.name || "Event Faculty Coordinator");
    const [principalName, setPrincipalName] = useState("Dr. Academic Principal");
    
    // Custom body text
    const [invitationBody, setInvitationBody] = useState(
        `It gives us immense pleasure to cordially invite you as our distinguished Resource Person / Guest Speaker for the session on "${workshop.title || "the designated topic"}". Your profound industry knowledge and research experience will greatly enrich the technical perspective of our faculty members and students.`
    );
    const [thankingBody, setThankingBody] = useState(
        `On behalf of the Management, Principal, Faculty, and Students, we convey our heartfelt gratitude and sincere appreciation for delivering an enlightening and impactful session on "${workshop.title || "the designated topic"}". Your insights and interactive discourse were highly appreciated by all attendees.`
    );

    // Camera / Scanner state
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraFacing, setCameraFacing] = useState("environment"); // "user" or "environment"
    const [scannedImage, setScannedImage] = useState(
        letterType === "invitation" ? (workshop.scannedInvitation || "") : (workshop.scannedThankingLetter || "")
    );
    const [isSavingScan, setIsSavingScan] = useState(false);

    // Email dispatch state
    const [isSending, setIsSending] = useState(false);
    const [sendSuccessMsg, setSendSuccessMsg] = useState("");
    const [sendErrorMsg, setSendErrorMsg] = useState("");

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // Switch scanned image when letterType changes
    useEffect(() => {
        if (letterType === "invitation") {
            setScannedImage(workshop.scannedInvitation || "");
        } else {
            setScannedImage(workshop.scannedThankingLetter || "");
        }
    }, [letterType, workshop]);

    // Handle Camera Lifecycle
    useEffect(() => {
        if (activeStep === "scan" && cameraActive) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStep, cameraActive, cameraFacing]);

    const startCamera = async () => {
        try {
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop());
            }
            const constraints = {
                video: {
                    facingMode: { ideal: cameraFacing },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            setCameraActive(false);
            alert("Unable to access physical camera. You can upload an image file of the physical signed document instead.");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setScannedImage(dataUrl);
        setCameraActive(false);
        stopCamera();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert("File too large. Maximum size is 10MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setScannedImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveScan = async () => {
        if (!scannedImage) {
            alert("Please take a photo or select an image file first.");
            return;
        }
        setIsSavingScan(true);
        try {
            const endpoint = `/workshops/${workshop._id}/scan`;
            const payload = {
                type: letterType,
                scannedImageBase64: scannedImage
            };
            await api.put(endpoint, payload);
            alert(`✅ Scanned ${letterType === "invitation" ? "Invitation" : "Thanking"} letter saved successfully!`);
            if (onUpdated) onUpdated();
            setActiveStep("send");
        } catch (err) {
            console.error("Failed to save scan:", err);
            alert(err.response?.data?.error || "Failed to save scanned document.");
        } finally {
            setIsSavingScan(false);
        }
    };

    const handleSendEmail = async () => {
        if (!guestEmail || !guestEmail.includes("@")) {
            setSendErrorMsg("Please enter a valid guest speaker email address.");
            return;
        }
        setIsSending(true);
        setSendSuccessMsg("");
        setSendErrorMsg("");

        try {
            const endpoint = letterType === "invitation" 
                ? `/workshops/${workshop._id}/send-invitation` 
                : `/workshops/${workshop._id}/send-thanking`;

            const payload = {
                guestEmail,
                attachmentBase64: scannedImage || undefined
            };

            const res = await api.post(endpoint, payload);
            setSendSuccessMsg(res.message || `Letter dispatched to ${guestEmail} successfully!`);
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error("Failed to dispatch email:", err);
            setSendErrorMsg(err.response?.data?.error || err.message || "Failed to send email. Check SMTP settings.");
        } finally {
            setIsSending(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
                {/* Modal Top Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                            📜
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-lg text-white">Letter Management System</h3>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono">
                                    {workshop.workshopType && workshop.workshopType.toLowerCase().includes("seminar") ? "Seminar" : "Workshop"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate max-w-md">
                                {workshop.title} &bull; Guest: <span className="text-indigo-300 font-medium">{workshop.speakerName}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Letter Type Switcher */}
                        <div className="inline-flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setLetterType("invitation")}
                                className={`px-3 py-1.5 rounded-md transition ${letterType === "invitation" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                            >
                                ✉️ Invitation Letter
                            </button>
                            <button
                                type="button"
                                onClick={() => setLetterType("thanking")}
                                className={`px-3 py-1.5 rounded-md transition ${letterType === "thanking" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                            >
                                🤝 Thanking / Appreciation Letter
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
                            title="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 4-Step Navigation Tabs */}
                <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between">
                    <div className="grid grid-cols-4 gap-2 w-full max-w-2xl">
                        {[
                            { id: "generate", label: "1. Generate", icon: "✍️", desc: "Customize Fields" },
                            { id: "view", label: "2. View Letter", icon: "👁️", desc: "Letterhead Preview" },
                            { id: "scan", label: "3. Scan Copy", icon: "📷", desc: "Camera / Upload" },
                            { id: "send", label: "4. Send Email", icon: "🚀", desc: "Dispatch to Guest" },
                        ].map(step => (
                            <button
                                key={step.id}
                                onClick={() => setActiveStep(step.id)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-left transition border ${
                                    activeStep === step.id
                                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold"
                                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                }`}
                            >
                                <span className="text-base">{step.icon}</span>
                                <div className="leading-tight truncate">
                                    <div className="text-xs font-bold">{step.label}</div>
                                    <div className="text-[10px] opacity-75">{step.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Status Badge */}
                    <div className="hidden sm:flex items-center space-x-2 text-xs">
                        {letterType === "invitation" ? (
                            workshop.invitationSentAt ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700">
                                    Dispatched: {new Date(workshop.invitationSentAt).toLocaleDateString()}
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800">
                                    Not Sent Yet
                                </span>
                            )
                        ) : (
                            workshop.thankingSentAt ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700">
                                    Dispatched: {new Date(workshop.thankingSentAt).toLocaleDateString()}
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800">
                                    Not Sent Yet
                                </span>
                            )
                        )}
                    </div>
                </div>

                {/* Step Contents */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-900/40">
                    {/* STEP 1: GENERATE & CUSTOMIZE */}
                    {activeStep === "generate" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                                <div>
                                    <h4 className="font-bold text-white text-sm">
                                        Customize {letterType === "invitation" ? "Invitation" : "Thanking / Appreciation"} Details
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        These values populate the official college letterhead document and email body.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveStep("view")}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow flex items-center space-x-1.5 transition"
                                >
                                    <span>Preview Letter</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Institution Name</label>
                                    <input
                                        type="text"
                                        value={institutionName}
                                        onChange={(e) => setInstitutionName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={departmentName}
                                        onChange={(e) => setDepartmentName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Reference Number</label>
                                    <input
                                        type="text"
                                        value={refNo}
                                        onChange={(e) => setRefNo(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Letter Issue Date</label>
                                    <input
                                        type="date"
                                        value={letterDate}
                                        onChange={(e) => setLetterDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Guest Resource Person Name</label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Guest Designation</label>
                                    <input
                                        type="text"
                                        value={guestDesignation}
                                        onChange={(e) => setGuestDesignation(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Guest Organization / Affiliation</label>
                                    <input
                                        type="text"
                                        value={guestOrg}
                                        onChange={(e) => setGuestOrg(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Guest Email Address</label>
                                    <input
                                        type="email"
                                        value={guestEmail}
                                        placeholder="speaker@organization.com"
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Event Date</label>
                                    <input
                                        type="text"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Event Time</label>
                                    <input
                                        type="text"
                                        value={eventTime}
                                        onChange={(e) => setEventTime(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Venue / Platform</label>
                                    <input
                                        type="text"
                                        value={eventVenue}
                                        onChange={(e) => setEventVenue(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Event Title / Topic</label>
                                    <input
                                        type="text"
                                        value={eventTitle}
                                        onChange={(e) => setEventTitle(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Principal / Authority Name</label>
                                    <input
                                        type="text"
                                        value={principalName}
                                        onChange={(e) => setPrincipalName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Event Faculty Coordinator</label>
                                    <input
                                        type="text"
                                        value={organizerName}
                                        onChange={(e) => setOrganizerName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Main Letter Body Content
                                </label>
                                {letterType === "invitation" ? (
                                    <textarea
                                        rows={4}
                                        value={invitationBody}
                                        onChange={(e) => setInvitationBody(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                ) : (
                                    <textarea
                                        rows={4}
                                        value={thankingBody}
                                        onChange={(e) => setThankingBody(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: VIEW / PRINT LETTERHEAD */}
                    {activeStep === "view" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                                <div className="flex items-center space-x-2 text-xs text-slate-300">
                                    <span>🖨️</span>
                                    <span>Print-ready Institutional Letterhead format. You can print or save as PDF.</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handlePrint}
                                        className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                                    >
                                        <span>Print / PDF</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveStep("scan")}
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                                    >
                                        <span>Proceed to Scan</span>
                                        <span>&rarr;</span>
                                    </button>
                                </div>
                            </div>

                            {/* Formal Institutional Paper / Letterhead */}
                            <div className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl max-w-3xl mx-auto border border-slate-300 font-serif leading-relaxed text-sm">
                                {/* Header */}
                                <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
                                    <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 font-sans">
                                        {institutionName}
                                    </h1>
                                    <p className="text-xs uppercase font-sans font-semibold text-slate-600 tracking-wide mt-1">
                                        Department of {departmentName}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                                        Accredited by NAAC with 'A+' Grade &bull; Approved by AICTE, New Delhi &bull; Affiliated to University
                                    </p>
                                </div>

                                {/* Reference and Date */}
                                <div className="flex justify-between items-center text-xs font-sans text-slate-700 mb-6">
                                    <div><strong>Ref No:</strong> {refNo}</div>
                                    <div><strong>Date:</strong> {letterDate}</div>
                                </div>

                                {/* Addressee */}
                                <div className="mb-6 text-xs text-slate-800">
                                    <p className="font-bold">To,</p>
                                    <p className="font-bold text-sm">{guestName}</p>
                                    <p>{guestDesignation}</p>
                                    <p>{guestOrg}</p>
                                </div>

                                {/* Subject */}
                                <div className="mb-6 font-sans">
                                    <p className="font-bold text-xs bg-slate-100 p-2 border-l-4 border-slate-900 text-slate-900">
                                        <strong>SUBJECT:</strong>{" "}
                                        {letterType === "invitation"
                                            ? `Invitation as Guest Speaker / Resource Person for "${eventTitle}"`
                                            : `Letter of Gratitude & Appreciation for conducting session on "${eventTitle}"`}
                                    </p>
                                </div>

                                {/* Salutation */}
                                <p className="mb-4 text-xs">Respected Sir / Madam,</p>

                                {/* Body */}
                                <p className="mb-4 text-xs text-justify leading-relaxed">
                                    {letterType === "invitation" ? invitationBody : thankingBody}
                                </p>

                                {letterType === "invitation" && (
                                    <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-xs font-sans">
                                        <div className="font-bold mb-1 text-slate-800">Program Schedule & Details:</div>
                                        <div className="grid grid-cols-2 gap-1 text-slate-700">
                                            <div><strong>Theme / Title:</strong> {eventTitle}</div>
                                            <div><strong>Date:</strong> {eventDate || letterDate}</div>
                                            <div><strong>Time:</strong> {eventTime}</div>
                                            <div><strong>Venue / Hall:</strong> {eventVenue}</div>
                                        </div>
                                    </div>
                                )}

                                <p className="mb-8 text-xs text-justify">
                                    {letterType === "invitation"
                                        ? "We eagerly anticipate your favorable confirmation. Kindly let us know if you require any logistics or AV arrangements."
                                        : "We look forward to sustained collaboration with you in our future academic endeavors."}
                                </p>

                                {/* Signatures */}
                                <div className="pt-8 flex justify-between items-end font-sans text-xs">
                                    <div className="text-center">
                                        <div className="h-10"></div>
                                        <div className="font-bold border-t border-slate-400 pt-1 px-4">{organizerName}</div>
                                        <div className="text-[10px] text-slate-600">Faculty Coordinator</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="h-10"></div>
                                        <div className="font-bold border-t border-slate-400 pt-1 px-4">Head of Department</div>
                                        <div className="text-[10px] text-slate-600">Dept. of {departmentName}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="h-10"></div>
                                        <div className="font-bold border-t border-slate-400 pt-1 px-4">{principalName}</div>
                                        <div className="text-[10px] text-slate-600">Principal</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SCAN / UPLOAD SIGNED DOCUMENT */}
                    {activeStep === "scan" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                                <div>
                                    <h4 className="font-bold text-white text-sm">
                                        Scan / Capture Signed Physical Letter
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        Use your device camera to scan the signed physical copy, or upload a scanned image.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => {
                                            setCameraActive(!cameraActive);
                                        }}
                                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold shadow flex items-center space-x-1.5 transition ${
                                            cameraActive
                                                ? "bg-rose-600 hover:bg-rose-500 text-white"
                                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                        }`}
                                    >
                                        <span>{cameraActive ? "🛑 Stop Camera" : "📷 Start Camera Viewfinder"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Camera Viewfinder Area */}
                            {cameraActive && (
                                <div className="bg-black rounded-2xl p-4 border border-indigo-500/50 shadow-2xl flex flex-col items-center">
                                    <div className="relative w-full max-w-xl aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Scanner viewfinder overlay */}
                                        <div className="absolute inset-6 border-2 border-dashed border-indigo-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                                            <span className="bg-black/60 px-3 py-1 rounded text-[10px] text-indigo-300 font-mono tracking-wider">
                                                ALIGN PHYSICAL DOCUMENT INSIDE FRAME
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4 mt-4">
                                        <button
                                            onClick={() => setCameraFacing(prev => prev === "user" ? "environment" : "user")}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition"
                                        >
                                            🔄 Flip Camera ({cameraFacing})
                                        </button>
                                        <button
                                            onClick={capturePhoto}
                                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-full shadow-lg flex items-center space-x-2 transition"
                                        >
                                            <span>📸 Capture Document</span>
                                        </button>
                                    </div>
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                            )}

                            {/* File Upload Alternative */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-center items-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xl mb-3">
                                        📁
                                    </div>
                                    <h5 className="font-semibold text-sm text-slate-200">Upload Image / Scan File</h5>
                                    <p className="text-xs text-slate-400 mb-4 max-w-xs">
                                        Attach a PNG, JPG, or PDF scan of the officially signed and stamped letter.
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 rounded-lg font-medium transition"
                                    >
                                        Choose File From Computer
                                    </button>
                                </div>

                                {/* Scanned Document Preview & Save */}
                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h5 className="font-semibold text-xs uppercase tracking-wider text-slate-400">
                                                Scanned Document Preview
                                            </h5>
                                            {scannedImage && (
                                                <span className="text-[10px] text-emerald-400 font-mono">
                                                    DOCUMENT READY
                                                </span>
                                            )}
                                        </div>

                                        {scannedImage ? (
                                            <div className="rounded-lg overflow-hidden border border-slate-700 bg-black max-h-48 flex items-center justify-center">
                                                <img
                                                    src={scannedImage}
                                                    alt="Scanned letter"
                                                    className="w-full h-48 object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-48 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs">
                                                No document captured or uploaded yet
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end space-x-2 mt-4">
                                        {scannedImage && (
                                            <button
                                                type="button"
                                                onClick={() => setScannedImage("")}
                                                className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300"
                                            >
                                                Clear Scan
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!scannedImage || isSavingScan}
                                            onClick={handleSaveScan}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition"
                                        >
                                            {isSavingScan ? "Saving..." : "Save Scanned Document"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SEND INVITATION / THANKING TO GUEST EMAIL */}
                    {activeStep === "send" && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">
                                        ✉️
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base">
                                            Send {letterType === "invitation" ? "Invitation" : "Thanking / Appreciation"} to Guest Speaker
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Dispatches official institutional email with letter details and attached scanned copy.
                                        </p>
                                    </div>
                                </div>

                                {sendSuccessMsg && (
                                    <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-600/60 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                                        <span>✅</span>
                                        <span>{sendSuccessMsg}</span>
                                    </div>
                                )}

                                {sendErrorMsg && (
                                    <div className="mb-4 p-3 bg-rose-950/70 border border-rose-600/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                                        <span>⚠️</span>
                                        <span>{sendErrorMsg}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Guest Speaker Email Address <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={guestEmail}
                                            placeholder="Enter guest speaker's active email address"
                                            onChange={(e) => setGuestEmail(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-indigo-300 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-xs space-y-2">
                                        <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                                            Email Payload Summary:
                                        </div>
                                        <div className="text-slate-400">
                                            <span className="text-slate-200 font-medium">To:</span> {guestName} &lt;{guestEmail || "No email specified"}&gt;
                                        </div>
                                        <div className="text-slate-400">
                                            <span className="text-slate-200 font-medium">Subject:</span>{" "}
                                            {letterType === "invitation"
                                                ? `Official Academic Invitation: ${eventTitle} (${workshop.workshopType || "Workshop"})`
                                                : `Letter of Gratitude & Appreciation: ${eventTitle}`}
                                        </div>
                                        <div className="text-slate-400 flex items-center space-x-2">
                                            <span className="text-slate-200 font-medium">Attachment:</span>
                                            {scannedImage ? (
                                                <span className="text-emerald-400 font-mono text-[11px]">📎 Scanned Document Attached</span>
                                            ) : (
                                                <span className="text-slate-500 italic text-[11px]">No scanned attachment (HTML body only)</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            disabled={isSending || !guestEmail}
                                            onClick={handleSendEmail}
                                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/40 text-sm flex items-center justify-center space-x-2 transition"
                                        >
                                            {isSending ? (
                                                <span>⏳ Dispatching Email via SMTP...</span>
                                            ) : (
                                                <>
                                                    <span>🚀 Send {letterType === "invitation" ? "Invitation" : "Thanking"} Email Now</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
                    <div>
                        <span>Current Status: </span>
                        <span className="font-semibold text-slate-200 uppercase">{letterType} Letter Workflow</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
}
