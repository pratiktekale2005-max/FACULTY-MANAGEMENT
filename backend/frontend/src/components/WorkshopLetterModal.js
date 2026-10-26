import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { api } from "../services/api";

export default function WorkshopLetterModal({
    workshop,
    workshopsList = [],
    initialType = "invitation", // "invitation" | "thanking"
    initialStep = "generate", // "generate" | "view" | "scan" | "send"
    currentUser,
    onClose,
    onUpdated
}) {
    const [letterType, setLetterType] = useState(() => {
        if (currentUser?.role === "Faculty" && initialType === "official") return "invitation";
        return initialType;
    });
    const [activeStep, setActiveStep] = useState(() => {
        if (currentUser?.role === "Principal") return "view";
        return initialStep;
    });
    const [currentWorkshop, setCurrentWorkshop] = useState(workshop || (workshopsList && workshopsList[0]) || {});

    // Institutional Letter Fields (Fixed Official Format)
    const [institutionName, setInstitutionName] = useState("Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION");
    const [departmentName, setDepartmentName] = useState(currentWorkshop?.department || currentUser?.department || "Department of Computer Science & Engineering");
    const [refNo, setRefNo] = useState(`DYPCOEI/${(currentWorkshop?.department || currentUser?.department || "DEPT").toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${(currentWorkshop?._id || "001").toString().slice(-4).toUpperCase()}`);
    const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
    const [guestName, setGuestName] = useState(currentWorkshop?.speakerName || "Distinguished Expert");
    const [guestDesignation, setGuestDesignation] = useState(currentWorkshop?.guestDesignation || currentWorkshop?.speakerBio || "Industry Consultant / Senior Professor");
    const [guestOrg, setGuestOrg] = useState(currentWorkshop?.guestOrganization || currentWorkshop?.speakerOrganization || "Tech Enterprise / University");
    const [guestEmail, setGuestEmail] = useState(currentWorkshop?.guestEmail || currentWorkshop?.speakerContact || "");
    const [eventTitle, setEventTitle] = useState(currentWorkshop?.title || "Special Academic Session");
    const [eventDate, setEventDate] = useState(currentWorkshop?.date ? new Date(currentWorkshop.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    const [eventTime, setEventTime] = useState(currentWorkshop?.time || "10:00 AM - 01:00 PM");
    const [eventVenue, setEventVenue] = useState(currentWorkshop?.venue || "Campus Seminar Auditorium");
    const [organizerName, setOrganizerName] = useState(currentWorkshop?.submittedBy?.name || currentUser?.name || "Event Faculty Coordinator");
    const [principalName, setPrincipalName] = useState("Dr. Suresh Mali");
    const [signatoryStyle, setSignatoryStyle] = useState("role_sender"); // "role_sender" | "three_party"
    
    // Custom body text
    const [officialBody, setOfficialBody] = useState(
        `This is an official communication on behalf of Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION regarding "${currentWorkshop?.title || "the designated institutional academic session"}". This document is officially issued for academic records, institutional authorization, and administrative documentation.`
    );
    const [invitationBody, setInvitationBody] = useState(
        `On behalf of Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION, it gives us immense pleasure to cordially invite you as our distinguished Resource Person / Guest Speaker for the session on "${currentWorkshop?.title || "the designated topic"}". Your profound industry knowledge and research experience will greatly enrich the technical perspective of our faculty members and students.`
    );
    const [thankingBody, setThankingBody] = useState(
        `On behalf of Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION, we convey our heartfelt gratitude and sincere appreciation for delivering an enlightening and impactful session on "${currentWorkshop?.title || "the designated topic"}". Your insights and interactive discourse were highly appreciated by all attendees.`
    );

    // Switch workshop helper
    const handleSwitchWorkshop = (selectedId) => {
        const found = workshopsList.find(w => String(w._id) === String(selectedId));
        if (found) {
            setCurrentWorkshop(found);
            setDepartmentName(found.department || currentUser?.department || "Department of Computer Science & Engineering");
            setRefNo(`DYPCOEI/${(found.department || currentUser?.department || "DEPT").toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${(found._id || "001").toString().slice(-4).toUpperCase()}`);
            setGuestName(found.speakerName || "Distinguished Expert");
            setGuestDesignation(found.guestDesignation || found.speakerBio || "Industry Consultant / Senior Professor");
            setGuestOrg(found.guestOrganization || found.speakerOrganization || "Tech Enterprise / University");
            setGuestEmail(found.guestEmail || found.speakerContact || "");
            setEventTitle(found.title || "Special Academic Session");
            setEventDate(found.date ? new Date(found.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
            setEventTime(found.time || "10:00 AM - 01:00 PM");
            setEventVenue(found.venue || "Campus Seminar Auditorium");
            setOrganizerName(found.submittedBy?.name || currentUser?.name || "Event Faculty Coordinator");
            setOfficialBody(`This is an official communication on behalf of Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION regarding "${found.title || "the designated institutional academic session"}". This document is officially issued for academic records, institutional authorization, and administrative documentation.`);
            setInvitationBody(`It gives us immense pleasure to cordially invite you as our distinguished Resource Person / Guest Speaker for the session on "${found.title || "the designated topic"}". Your profound industry knowledge and research experience will greatly enrich the technical perspective of our faculty members and students.`);
            setThankingBody(`On behalf of the Management, Principal, Faculty, and Students, we convey our heartfelt gratitude and sincere appreciation for delivering an enlightening and impactful session on "${found.title || "the designated topic"}". Your insights and interactive discourse were highly appreciated by all attendees.`);
            setScannedImage(
                letterType === "official"
                    ? (found.scannedOfficialLetter || "")
                    : letterType === "invitation"
                    ? (found.scannedInvitation || "")
                    : (found.scannedThankingLetter || "")
            );
        }
    };

    // Camera / Scanner state
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraFacing, setCameraFacing] = useState("environment"); // "user" or "environment"
    const [scannedImage, setScannedImage] = useState(
        letterType === "official"
            ? (currentWorkshop?.scannedOfficialLetter || "")
            : letterType === "invitation"
            ? (currentWorkshop?.scannedInvitation || "")
            : (currentWorkshop?.scannedThankingLetter || "")
    );
    const [isSavingScan, setIsSavingScan] = useState(false);

    // Email dispatch state
    const [isSending, setIsSending] = useState(false);
    const [sendSuccessMsg, setSendSuccessMsg] = useState("");
    const [sendErrorMsg, setSendErrorMsg] = useState("");

    // Faculty email sender configuration state
    const [facultyEmailConfig, setFacultyEmailConfig] = useState(null);
    const [showQuickEmailConfig, setShowQuickEmailConfig] = useState(false);
    const [quickAppPassword, setQuickAppPassword] = useState("");
    const [showQuickPasswordText, setShowQuickPasswordText] = useState(false);
    const [isSavingQuickConfig, setIsSavingQuickConfig] = useState(false);
    const [quickConfigError, setQuickConfigError] = useState("");
    
    // Extra Feature: Attach Created Letter in PDF format
    const [attachCreatedPdf, setAttachCreatedPdf] = useState(true);
    const [customMessage, setCustomMessage] = useState(
        letterType === "official"
            ? "Please find attached our official institutional letter issued by Dr. D. Y. Patil College of Engineering & Innovation."
            : letterType === "invitation"
            ? "We look forward to hosting you for this prestigious academic lecture. Please find our official signed letter attached in PDF format."
            : "Thank you for the enlightening session. Please find attached our official letter of appreciation."
    );
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const modalBodyRef = useRef(null);

    // Fetch faculty email configuration status on load
    useEffect(() => {
        if (currentUser) {
            api.get("/faculty/me/email-settings")
                .then(res => {
                    setFacultyEmailConfig(res);
                    if (!res?.configured) {
                        setShowQuickEmailConfig(true);
                    }
                })
                .catch(() => {
                    setFacultyEmailConfig({ configured: false });
                    setShowQuickEmailConfig(true);
                });
        }
    }, [currentUser]);

    // Prevent background scrolling and support Escape key
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                if (onClose) onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // Instantly scroll modal content to top when step or letter type changes
    useEffect(() => {
        if (modalBodyRef.current) {
            modalBodyRef.current.scrollTop = 0;
        }
    }, [activeStep, letterType]);

    // Update default message when letterType changes
    useEffect(() => {
        setCustomMessage(
            letterType === "official"
                ? "Please find attached our official institutional letter issued by Dr. D. Y. Patil College of Engineering & Innovation."
                : letterType === "invitation"
                ? "We look forward to hosting you for this prestigious academic lecture. Please find our official signed letter attached in PDF format."
                : "Thank you for the enlightening session. Please find attached our official letter of appreciation."
        );
    }, [letterType]);

    // Switch scanned image when letterType changes
    useEffect(() => {
        if (letterType === "official") {
            setScannedImage(currentWorkshop?.scannedOfficialLetter || "");
        } else if (letterType === "invitation") {
            setScannedImage(currentWorkshop?.scannedInvitation || "");
        } else {
            setScannedImage(currentWorkshop?.scannedThankingLetter || "");
        }
    }, [letterType, currentWorkshop]);

    // Preview or Download the Generated PDF Letterhead
    const handleDownloadOrPreviewPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const payload = {
                letterData: {
                    institutionName,
                    departmentName,
                    refNo,
                    letterDate,
                    letterType,
                    guestName,
                    guestDesignation,
                    guestOrg,
                    eventTitle,
                    eventDate,
                    eventTime,
                    eventVenue,
                    bodyText: letterType === "official" ? officialBody : letterType === "invitation" ? invitationBody : thankingBody,
                    organizerName,
                    principalName
                }
            };
            const res = await api.post(`/workshops/${currentWorkshop?._id || "draft"}/generate-letter-pdf`, payload);
            if (res.pdfBase64) {
                const link = document.createElement("a");
                link.href = res.pdfBase64;
                link.download = res.filename || `${letterType}_letter.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error("PDF download failed:", err);
            alert("Failed to generate PDF letter. Please try again.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

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
            const endpoint = `/workshops/${currentWorkshop?._id || "draft"}/scan`;
            const payload = {
                type: letterType,
                scannedImageBase64: scannedImage
            };
            await api.put(endpoint, payload);
            alert(`✅ Scanned ${letterType === "official" ? "Official" : letterType === "invitation" ? "Invitation" : "Thanking"} letter saved successfully!`);
            if (onUpdated) onUpdated();
            setActiveStep("send");
        } catch (err) {
            console.error("Failed to save scan:", err);
            alert(err.response?.data?.error || "Failed to save scanned document.");
        } finally {
            setIsSavingScan(false);
        }
    };

    // Download official PDF generated by backend with fixed master letterhead
    const [downloadingOfficialPdf, setDownloadingOfficialPdf] = useState(false);

    const handleDownloadOfficialPdf = async () => {
        setDownloadingOfficialPdf(true);
        try {
            const payload = {
                letterData: {
                    institutionName: "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
                    departmentName,
                    refNo,
                    letterDate,
                    letterType,
                    guestName,
                    guestDesignation,
                    guestOrg,
                    eventTitle,
                    eventDate,
                    eventTime,
                    eventVenue,
                    bodyText: letterType === "official" ? officialBody : (letterType === "invitation" ? invitationBody : thankingBody),
                    organizerName,
                    principalName,
                    signatoryType: signatoryStyle === "three_party" ? "three_party" : "single"
                }
            };
            const res = await api.post(`/workshops/${currentWorkshop?._id || "draft"}/generate-letter-pdf`, payload);
            if (res.pdfBase64) {
                const link = document.createElement("a");
                link.href = res.pdfBase64;
                link.download = res.filename || `Official_${letterType.toUpperCase()}_${(eventTitle || "Letter").replace(/\s+/g, "_")}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error("PDF download error:", err);
            alert("Failed to generate and download official letter PDF ❌");
        } finally {
            setDownloadingOfficialPdf(false);
        }
    };

    const handleSendEmail = async () => {
        if (!guestEmail || !guestEmail.includes("@")) {
            setSendErrorMsg("Please enter a valid recipient email address.");
            return;
        }
        setIsSending(true);
        setSendSuccessMsg("");
        setSendErrorMsg("");

        try {
            const endpoint = letterType === "official"
                ? `/workshops/${currentWorkshop?._id || "draft"}/send-official`
                : letterType === "invitation" 
                ? `/workshops/${currentWorkshop?._id || "draft"}/send-invitation` 
                : `/workshops/${currentWorkshop?._id || "draft"}/send-thanking`;

            const payload = {
                guestEmail,
                recipientEmail: guestEmail,
                senderEmail: currentUser?.email,
                senderName: currentUser?.name,
                customMessage,
                attachGeneratedPdf: attachCreatedPdf,
                attachmentBase64: scannedImage || undefined,
                letterData: {
                    institutionName,
                    departmentName,
                    refNo,
                    letterDate,
                    letterType,
                    guestName,
                    guestDesignation,
                    guestOrg,
                    eventTitle,
                    eventDate,
                    eventTime,
                    eventVenue,
                    bodyText: letterType === "official" ? officialBody : (letterType === "invitation" ? invitationBody : thankingBody),
                    organizerName,
                    principalName
                }
            };

            const res = await api.post(endpoint, payload);
            setSendSuccessMsg(res.message || `Official letter (PDF format) dispatched to ${guestEmail} successfully!`);
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error("Failed to dispatch email:", err);
            const errorMsg = err.response?.data?.error || err.message || "Failed to send email. Check SMTP settings.";
            setSendErrorMsg(errorMsg);
            if (errorMsg.toLowerCase().includes("not configured for sending emails") || errorMsg.toLowerCase().includes("please configure")) {
                setShowQuickEmailConfig(true);
            }
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveQuickConfig = async (e) => {
        if (e) e.preventDefault();
        if (!quickAppPassword || !quickAppPassword.trim()) {
            setQuickConfigError("Please enter your 16-character Google App Password.");
            return;
        }
        setIsSavingQuickConfig(true);
        setQuickConfigError("");
        try {
            const res = await api.put("/faculty/me/email-settings", {
                service: "gmail",
                email: currentUser?.email,
                appPassword: quickAppPassword.trim().replace(/\s+/g, ""),
                configured: true
            });
            setFacultyEmailConfig(res.emailSettings || { configured: true, email: currentUser?.email });
            setShowQuickEmailConfig(false);
            setQuickAppPassword("");
            setSendErrorMsg("");
            setSendSuccessMsg("Authorized college email credentials saved and verified! ✅ You can now dispatch your letter.");
        } catch (err) {
            console.error("Save quick email config error:", err);
            setQuickConfigError(err.response?.data?.error || err.message || "Failed to verify credentials. Please check your App Password.");
        } finally {
            setIsSavingQuickConfig(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const modalContent = (
        <div 
            className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-hidden"
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) {
                    onClose();
                }
            }}
        >
            <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[90vh] max-h-[92vh] overflow-hidden text-slate-100 my-auto">
                {/* Modal Top Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                            📜
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-lg text-white">Letter Management System</h3>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono">
                                    {currentWorkshop?.workshopType && currentWorkshop.workshopType.toLowerCase().includes("seminar") ? "Seminar" : "Workshop"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-slate-400 truncate max-w-sm">
                                    {currentWorkshop?.title || "Academic Event"} &bull; Guest: <span className="text-indigo-300 font-medium">{currentWorkshop?.speakerName || "Guest Expert"}</span>
                                </p>
                                {workshopsList && workshopsList.length > 1 && (
                                    <select
                                        value={currentWorkshop?._id}
                                        onChange={(e) => handleSwitchWorkshop(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 text-[11px] text-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold ml-2 max-w-[180px] truncate"
                                        title="Switch Event"
                                    >
                                        {workshopsList.map(w => (
                                            <option key={w._id} value={w._id} className="bg-slate-900 text-slate-200">
                                                {w.title} ({w.speakerName || "Speaker"})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Letter Type Switcher */}
                        <div className="inline-flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-semibold">
                            {currentUser?.role !== "Faculty" && (
                                <button
                                    type="button"
                                    onClick={() => setLetterType("official")}
                                    className={`px-3 py-1.5 rounded-md transition ${letterType === "official" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                                >
                                    🏛️ Official Letter
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setLetterType("invitation")}
                                className={`px-3 py-1.5 rounded-md transition ${letterType === "invitation" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                            >
                                ✉️ Invitation
                            </button>
                            <button
                                type="button"
                                onClick={() => setLetterType("thanking")}
                                className={`px-3 py-1.5 rounded-md transition ${letterType === "thanking" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                            >
                                🤝 Thanking
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
                <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between shrink-0">
                    <div className={`grid ${currentUser?.role === "Principal" ? "grid-cols-1" : "grid-cols-4"} gap-2 w-full max-w-2xl`}>
                        {(currentUser?.role === "Principal"
                            ? [{ id: "view", label: "View Official Document", icon: "👁️", desc: "Letterhead Preview & Download" }]
                            : [
                                { id: "generate", label: "1. Generate", icon: "✍️", desc: "Customize Fields" },
                                { id: "view", label: "2. View Letter", icon: "👁️", desc: "Letterhead Preview" },
                                { id: "scan", label: "3. Scan Copy", icon: "📷", desc: "Camera / Upload" },
                                { id: "send", label: "4. Send Email", icon: "🚀", desc: "Dispatch Email" },
                            ]
                        ).map(step => (
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
                        {letterType === "official" ? (
                            workshop.officialLetterSentAt ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700">
                                    Dispatched: {new Date(workshop.officialLetterSentAt).toLocaleDateString()}
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800">
                                    Not Sent Yet
                                </span>
                            )
                        ) : letterType === "invitation" ? (
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
                <div ref={modalBodyRef} className="p-6 overflow-y-auto flex-1 bg-slate-900/40">
                    {/* STEP 1: GENERATE & CUSTOMIZE */}
                    {activeStep === "generate" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                                <div>
                                    <h4 className="font-bold text-white text-sm">
                                        Customize {letterType === "official" ? "Official Letter" : letterType === "invitation" ? "Invitation" : "Thanking / Appreciation"} Details
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
                                {letterType === "official" ? (
                                    <textarea
                                        rows={4}
                                        value={officialBody}
                                        onChange={(e) => setOfficialBody(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                ) : letterType === "invitation" ? (
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
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                                <div className="flex items-center space-x-2 text-xs text-slate-300">
                                    <span>🖨️</span>
                                    <span>Fixed Master Institutional Letterhead Format • DYPCOEI</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleDownloadOfficialPdf}
                                        disabled={downloadingOfficialPdf}
                                        className="px-3.5 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1 shadow"
                                    >
                                        <span>{downloadingOfficialPdf ? "⏳ Generating..." : "📥 Download Official PDF"}</span>
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                                    >
                                        <span>Print</span>
                                    </button>
                                    {currentUser?.role !== "Principal" && (
                                        <button
                                            onClick={() => setActiveStep("scan")}
                                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                                        >
                                            <span>Proceed to Scan</span>
                                            <span>&rarr;</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Signatory Mode Switcher */}
                            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-bold">Authorized Sender Identity:</span>
                                    <span className="text-indigo-400 font-semibold">{currentUser?.name} ({currentUser?.role})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Signature Style:</span>
                                    <button
                                        type="button"
                                        onClick={() => setSignatoryStyle("role_sender")}
                                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${signatoryStyle === "role_sender" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}
                                    >
                                        Role Authority
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignatoryStyle("three_party")}
                                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${signatoryStyle === "three_party" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}
                                    >
                                        3-Party Signatures
                                    </button>
                                </div>
                            </div>

                            {/* Formal Master Institutional Paper / Letterhead */}
                            <div className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl max-w-3xl mx-auto border border-slate-300 font-serif leading-relaxed text-sm">
                                {/* Fixed Master College Letterhead Header */}
                                <div className="border-b-2 border-[#800000] pb-3 mb-5 flex items-center justify-between gap-4 font-sans text-center">
                                    <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/assets/college_logo.jpeg"
                                            alt="DYP Crest Logo"
                                            className="w-12 h-12 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-[#800000] tracking-wide uppercase">
                                            Dr. D. Y. Patil Educational Federation’s
                                        </p>
                                        <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-[#1e1b4b] leading-tight mt-0.5">
                                            Dr. D. Y. PATIL COLLEGE OF ENGINEERING &amp; INNOVATION
                                        </h1>
                                        <p className="text-[9.5px] font-bold text-slate-700 mt-0.5">
                                            (An Autonomous Institute Affiliated to SPPU)
                                        </p>
                                        <p className="text-[8px] text-slate-500 leading-tight mt-0.5">
                                            Survey No. 27/A/1/2C, Varale Campus, Near Talegaon Railway Station, Tal. Maval, Dist. Pune 410 507, Ph: 020 48522561, 565,566
                                        </p>
                                        <p className="text-[8px] text-slate-500 leading-tight">
                                            Web Site: www.dypcoei.edu.in • Email: principal.dypcoei@dypatilef.com
                                        </p>
                                        <p className="text-[10px] font-bold text-indigo-900 uppercase mt-1">
                                            Department of {departmentName}
                                        </p>
                                    </div>
                                    <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                                        <img
                                            src="/assets/naac_logo.jpeg"
                                            alt="NAAC A Seal"
                                            className="w-12 h-12 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                </div>

                                {/* Leadership Information Banner */}
                                <div className="flex justify-between items-center text-[9px] font-sans font-semibold text-slate-700 border-b border-slate-300 pb-1.5 mb-4">
                                    <div>
                                        <span className="font-bold text-slate-900">Dr. Alpana Adsul</span>
                                        <span className="text-slate-600"> | Vice Principal / CE - HOD</span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900">Dr. Suresh Mali</span>
                                        <span className="text-slate-600"> | Principal</span>
                                    </div>
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
                                        {letterType === "official"
                                            ? `Official Institutional Communication regarding "${eventTitle}"`
                                            : letterType === "invitation"
                                            ? `Invitation as Guest Speaker / Resource Person for "${eventTitle}"`
                                            : `Letter of Gratitude & Appreciation for conducting session on "${eventTitle}"`}
                                    </p>
                                </div>

                                {/* Salutation */}
                                <p className="mb-4 text-xs">Respected Sir / Madam,</p>

                                {/* Body */}
                                <p className="mb-4 text-xs text-justify leading-relaxed">
                                    {letterType === "official" ? officialBody : letterType === "invitation" ? invitationBody : thankingBody}
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
                                    {letterType === "official"
                                        ? "This letter is issued under the authority of Dr. D. Y. Patil College of Engineering & Innovation for official records and compliance."
                                        : letterType === "invitation"
                                        ? "We eagerly anticipate your favorable confirmation. Kindly let us know if you require any logistics or AV arrangements."
                                        : "We look forward to sustained collaboration with you in our future academic endeavors."}
                                </p>

                                {/* Role-Based Signatures Section (Section 8) */}
                                {signatoryStyle === "role_sender" ? (
                                    <div className="pt-8 flex justify-end font-sans text-xs">
                                        <div className="text-left min-w-[200px]">
                                            <p className="text-slate-600 mb-6">Regards,</p>
                                            <div className="border-t border-slate-400 pt-1">
                                                <p className="font-bold text-sm text-slate-900">{currentUser?.name || organizerName}</p>
                                                <p className="text-slate-700 font-medium">
                                                    {currentUser?.role === "Principal"
                                                        ? "Principal"
                                                        : currentUser?.role === "HOD"
                                                        ? "Vice Principal / CE - HOD"
                                                        : "Faculty"}
                                                </p>
                                                {currentUser?.department && (
                                                    <p className="text-slate-600 text-[11px]">Department of {currentUser?.department}</p>
                                                )}
                                                <p className="text-slate-500 text-[10px] font-sans">Dr. D. Y. PATIL COLLEGE OF ENGINEERING &amp; INNOVATION</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-8 flex justify-between items-end font-sans text-xs">
                                        <div className="text-center">
                                            <div className="h-10"></div>
                                            <div className="font-bold border-t border-slate-400 pt-1 px-4">{organizerName}</div>
                                            <div className="text-[10px] text-slate-600">Faculty</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="h-10"></div>
                                            <div className="font-bold border-t border-slate-400 pt-1 px-4">Dr. Alpana Adsul</div>
                                            <div className="text-[10px] text-slate-600">Vice Principal / CE - HOD</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="h-10"></div>
                                            <div className="font-bold border-t border-slate-400 pt-1 px-4">{principalName || "Dr. Suresh Mali"}</div>
                                            <div className="text-[10px] text-slate-600">Principal</div>
                                        </div>
                                    </div>
                                )}
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

                    {/* STEP 4: SEND OFFICIAL / INVITATION / THANKING LETTER */}
                    {activeStep === "send" && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">
                                        ✉️
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base">
                                            Send {letterType === "official" ? "Official" : letterType === "invitation" ? "Invitation" : "Thanking / Appreciation"} Letter
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Dispatches official institutional email with letter details and attached PDF document to any valid recipient email address.
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

                                {/* Warning banner if email is not configured yet */}
                                {!sendErrorMsg && facultyEmailConfig && !facultyEmailConfig.configured && (
                                    <div className="mb-4 p-3.5 bg-rose-950/80 border border-rose-600/80 rounded-xl text-rose-200 text-xs flex items-start space-x-2.5">
                                        <span className="text-base leading-none">⚠️</span>
                                        <div>
                                            <p className="font-semibold text-rose-200">
                                                This faculty account is not configured for sending emails. Please configure the authorized college email account.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* Sender Identity Card */}
                                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Logged-in Sender Identity</p>
                                                <p className="text-slate-100 font-bold text-sm">
                                                    {currentUser?.name || organizerName} ({currentUser?.role === "Principal" ? "Principal" : currentUser?.role === "HOD" ? "Vice Principal / CE - HOD" : "Faculty"})
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Account email: <span className="text-indigo-300 font-mono">{currentUser?.email || "Registered Account Email"}</span>
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                {facultyEmailConfig?.configured ? (
                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-950/80 text-emerald-300 border-emerald-700/60 flex items-center gap-1">
                                                        <span>🛡️</span> Sender Ready
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQuickEmailConfig(!showQuickEmailConfig)}
                                                        className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-950/90 text-amber-300 border-amber-600/70 flex items-center gap-1 hover:bg-amber-900/80 transition cursor-pointer shadow"
                                                    >
                                                        <span>⚠️</span> Sender Setup Required
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowQuickEmailConfig(!showQuickEmailConfig)}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                                                >
                                                    {showQuickEmailConfig ? "Close Setup" : (facultyEmailConfig?.configured ? "Update App Password" : "Configure Credentials")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Email / Google App Password Setup Form */}
                                    {showQuickEmailConfig && (
                                        <div className="bg-[#131b2e] border border-indigo-500/60 rounded-xl p-4 shadow-2xl space-y-3.5 relative animate-in fade-in duration-200">
                                            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                                                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                                                    <span className="text-sm">🔐</span> Authorized College Email Credentials
                                                </h5>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowQuickEmailConfig(false)}
                                                    className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-slate-800 transition"
                                                    title="Close setup"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                To prevent emails from showing "via college admin", enter your 16-character <strong>Google App Password</strong> for <strong className="text-indigo-300 font-mono">{currentUser?.email || "your account"}</strong>.
                                            </p>

                                            {quickConfigError && (
                                                <div className="p-2.5 bg-rose-950/80 border border-rose-500/70 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                                                    <span>⚠️</span>
                                                    <span>{quickConfigError}</span>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                                    Google App Password (16 characters) <span className="text-rose-400">*</span>
                                                </label>
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type={showQuickPasswordText ? "text" : "password"}
                                                            autoComplete="off"
                                                            value={quickAppPassword}
                                                            onChange={(e) => setQuickAppPassword(e.target.value)}
                                                            placeholder="e.g. abcd efgh ijkl mnop"
                                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-indigo-300 font-mono tracking-wider focus:outline-none focus:border-indigo-500 pr-16"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowQuickPasswordText(!showQuickPasswordText)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-1"
                                                        >
                                                            {showQuickPasswordText ? "Hide" : "Show"}
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveQuickConfig}
                                                        disabled={isSavingQuickConfig || !quickAppPassword.trim()}
                                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 shrink-0"
                                                    >
                                                        {isSavingQuickConfig ? (
                                                            <>
                                                                <span className="inline-block animate-spin">⏳</span>
                                                                <span>Verifying...</span>
                                                            </>
                                                        ) : (
                                                            <span>Verify &amp; Save</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-slate-400">
                                                Visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-medium">myaccount.google.com/apppasswords</a> to create an App Password. Never use your main Gmail password.
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Recipient Email Address <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={guestEmail}
                                            placeholder="Enter recipient's valid email address (workshop speaker/guest or any authorized recipient)"
                                            onChange={(e) => setGuestEmail(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-indigo-300 focus:outline-none focus:border-indigo-500"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            You can send this letter to any valid email address, including workshop guests or external recipients.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Personalized Message for Recipient <span className="text-slate-400 text-[10px]">(Received in email message)</span>
                                        </label>
                                        <textarea
                                            rows="2"
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            placeholder="Enter a message that the recipient will receive..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                                        />
                                    </div>

                                    {/* EXTRA FEATURE: ATTACH CREATED LETTER IN PDF FORMAT */}
                                    <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-xl p-4 space-y-3 shadow-inner">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    id="attachPdfCheckbox"
                                                    checked={attachCreatedPdf}
                                                    onChange={(e) => setAttachCreatedPdf(e.target.checked)}
                                                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <label htmlFor="attachPdfCheckbox" className="font-bold text-xs text-white cursor-pointer select-none">
                                                    📄 Attach Created Letter in PDF Format to Email
                                                </label>
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                                PDF Feature Active
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                                            When enabled, the recipient will receive an official institutional email message with the customized <strong>{letterType === "official" ? "Official Letter" : letterType === "invitation" ? "Invitation" : "Appreciation"} Letter attached as an official PDF document</strong>.
                                        </p>

                                        <div className="flex items-center justify-between pt-1 pl-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-emerald-400 font-mono">
                                                    {attachCreatedPdf ? "✓ PDF Attachment Included" : "⚠️ PDF Attachment Excluded"}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleDownloadOrPreviewPdf}
                                                disabled={isGeneratingPdf}
                                                className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                                                title="Preview or save the official PDF letterhead directly"
                                            >
                                                <span>{isGeneratingPdf ? "⏳ Generating..." : "📥 Download / Preview PDF Letter"}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Email Payload Summary */}
                                    <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-xs space-y-2">
                                        <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                                            Email Payload & Letter Dispatch Summary:
                                        </div>
                                        <div className="text-slate-400">
                                            <span className="text-slate-200 font-medium">Recipient:</span> {guestName} &lt;{guestEmail || "No email specified"}&gt;
                                        </div>
                                        <div className="text-slate-400">
                                            <span className="text-slate-200 font-medium">Subject:</span>{" "}
                                            {letterType === "official"
                                                ? `Official Institutional Communication: ${eventTitle}`
                                                : letterType === "invitation"
                                                ? `Official Academic Invitation: ${eventTitle} (${workshop.workshopType || "Workshop"})`
                                                : `Letter of Gratitude & Appreciation: ${eventTitle}`}
                                        </div>
                                        <div className="text-slate-400">
                                            <span className="text-slate-200 font-medium">Message Body:</span>{" "}
                                            <span className="italic text-slate-300">"{customMessage || "Standard institutional greeting"}"</span>
                                        </div>
                                        <div className="text-slate-400 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-850">
                                            <span className="text-slate-200 font-medium">Attachments:</span>
                                            {attachCreatedPdf && (
                                                <span className="text-indigo-300 font-mono text-[10px] bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/60">
                                                    📄 Official Created Letter (PDF)
                                                </span>
                                            )}
                                            {scannedImage && (
                                                <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                                                    📎 Scanned Physical Copy
                                                </span>
                                            )}
                                            {!attachCreatedPdf && !scannedImage && (
                                                <span className="text-slate-500 italic text-[11px]">No attachments (Text email only)</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            disabled={isSending || !guestEmail}
                                            onClick={handleSendEmail}
                                            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-650 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/40 text-sm flex items-center justify-center space-x-2 transition"
                                        >
                                            {isSending ? (
                                                <span>⏳ Dispatching Email Message & PDF Letter...</span>
                                            ) : (
                                                <>
                                                    <span>🚀 Send {letterType === "official" ? "Official" : letterType === "invitation" ? "Invitation" : "Thanking"} Email with PDF Letter Now</span>
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
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
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

    return ReactDOM.createPortal(modalContent, document.body);
}
