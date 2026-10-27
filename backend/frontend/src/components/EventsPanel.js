import React, { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import WorkshopLetterModal from "./WorkshopLetterModal";
import { openFileInNewTab, downloadAttachment } from "../utils/attachmentUtils";

function EventsPanel({ currentUser }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDept, setSelectedDept] = useState("All");
    const [dateFilter, setDateFilter] = useState("All"); // "All" | "Upcoming" | "Past"

    // Notifications
    const [msg, setMsg] = useState("");
    const [errMsg, setErrMsg] = useState("");

    // Details Modal state
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState("overview"); // "overview" | "guests" | "letters" | "email"

    // Add Event Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        department: currentUser?.department || "Computer Science & Engineering",
        speakerName: "",
        speakerBio: "",
        speakerOrganization: "",
        guestDesignation: "",
        guestOrganization: "",
        guestEmail: "",
        workshopType: "Workshop",
        photosBase64: []
    });

    // Photo Gallery & Lightbox state
    const [enlargedPhoto, setEnlargedPhoto] = useState(null);
    const [uploadingGalleryPhotos, setUploadingGalleryPhotos] = useState(false);

    // Edit Event Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [updatingEvent, setUpdatingEvent] = useState(false);

    // Guest Management Sub-modal state
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [editingGuestId, setEditingGuestId] = useState(null); // null if adding new guest
    const [guestForm, setGuestForm] = useState({
        name: "",
        designation: "",
        organization: "",
        email: "",
        contact: ""
    });
    const [savingGuest, setSavingGuest] = useState(false);

    // Letter Modal config for WorkshopLetterModal integration
    const [letterModalConfig, setLetterModalConfig] = useState({
        isOpen: false,
        workshop: null,
        initialType: "invitation",
        initialStep: "generate"
    });

    // Selected Guest for Letters & Email workflow
    const [selectedGuestId, setSelectedGuestId] = useState("");

    // Email dispatch workflow state
    const [emailType, setEmailType] = useState("invitation"); // "invitation" | "thanking"
    const [customRecipientEmail, setCustomRecipientEmail] = useState("");
    const [customSubject, setCustomSubject] = useState("");
    const [customMessage, setCustomMessage] = useState("");
    const [attachPdf, setAttachPdf] = useState(true);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailResult, setEmailResult] = useState(null);

    // File scan upload state
    const [uploadingScan, setUploadingScan] = useState(false);

    // Load events from backend
    const loadEvents = async () => {
        setLoading(true);
        try {
            const data = await api.get("/workshops");
            if (data && data.workshops) {
                setEvents(data.workshops);
            }
        } catch (err) {
            console.error("Failed to load events:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    // Refresh single selected event from backend
    const refreshSelectedEvent = async (eventId) => {
        const idToFetch = eventId || selectedEvent?._id;
        if (!idToFetch) return;
        try {
            const res = await api.get(`/workshops/${idToFetch}`);
            if (res && res.workshop) {
                setSelectedEvent(res.workshop);
            }
        } catch (err) {
            console.error("Failed to refresh event:", err);
        }
    };

    // Keep selectedGuestId synced when selectedEvent changes
    useEffect(() => {
        if (selectedEvent) {
            const guestsList = selectedEvent.guests && selectedEvent.guests.length > 0
                ? selectedEvent.guests
                : [{
                      _id: selectedEvent._id,
                      name: selectedEvent.speakerName || "Distinguished Expert",
                      email: selectedEvent.guestEmail || "",
                      designation: selectedEvent.guestDesignation || selectedEvent.speakerBio || "",
                      organization: selectedEvent.guestOrganization || selectedEvent.speakerOrganization || ""
                  }];
            
            const firstGuest = guestsList[0];
            setSelectedGuestId(firstGuest?._id?.toString() || "");
            setCustomRecipientEmail(firstGuest?.email || selectedEvent.guestEmail || "");
            setCustomSubject(
                emailType === "invitation"
                    ? `Official Invitation: ${selectedEvent.title} - Dr. D. Y. Patil College of Engineering`
                    : `Letter of Gratitude & Appreciation: ${selectedEvent.title} - Dr. D. Y. Patil College of Engineering`
            );
            setCustomMessage(
                emailType === "invitation"
                    ? `Dear ${firstGuest?.name || "Distinguished Expert"},\n\nWe cordially invite you as our Resource Person / Expert Speaker for "${selectedEvent.title}" scheduled on ${selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : "the scheduled date"} at ${selectedEvent.venue || "Campus Auditorium"}.\n\nPlease find attached the official invitation letter in PDF format.`
                    : `Dear ${firstGuest?.name || "Distinguished Expert"},\n\nOn behalf of our institution, we extend our heartfelt gratitude for your engaging and insightful session on "${selectedEvent.title}".\n\nPlease find attached our official letter of appreciation.`
            );
            setEmailResult(null);
        }
    }, [selectedEvent, emailType]);

    // Update email fields when user switches guest in dropdown
    const handleSelectGuestForEmail = (guestId) => {
        setSelectedGuestId(guestId);
        if (!selectedEvent) return;

        const guestsList = selectedEvent.guests && selectedEvent.guests.length > 0
            ? selectedEvent.guests
            : [{
                  _id: selectedEvent._id,
                  name: selectedEvent.speakerName || "Distinguished Expert",
                  email: selectedEvent.guestEmail || "",
                  designation: selectedEvent.guestDesignation || selectedEvent.speakerBio || "",
                  organization: selectedEvent.guestOrganization || selectedEvent.speakerOrganization || ""
              }];

        const found = guestsList.find(g => String(g._id) === String(guestId));
        if (found) {
            setCustomRecipientEmail(found.email || "");
            setCustomMessage(
                emailType === "invitation"
                    ? `Dear ${found.name || "Distinguished Expert"},\n\nWe cordially invite you as our Resource Person / Expert Speaker for "${selectedEvent.title}" scheduled on ${selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : "the scheduled date"} at ${selectedEvent.venue || "Campus Auditorium"}.\n\nPlease find attached the official invitation letter in PDF format.`
                    : `Dear ${found.name || "Distinguished Expert"},\n\nOn behalf of our institution, we extend our heartfelt gratitude for your engaging and insightful session on "${selectedEvent.title}".\n\nPlease find attached our official letter of appreciation.`
            );
        }
    };

    // Unique departments for filter
    const departments = useMemo(() => {
        const set = new Set(events.map(e => e.department).filter(Boolean));
        return ["All", ...Array.from(set)];
    }, [events]);

    // Filter events
    const filteredEvents = useMemo(() => {
        const today = new Date().toISOString().split("T")[0];

        return events.filter(ev => {
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = ev.title && ev.title.toLowerCase().includes(q);
                const matchOrganizer = ev.submittedBy?.name && ev.submittedBy.name.toLowerCase().includes(q);
                const matchDept = ev.department && ev.department.toLowerCase().includes(q);
                const matchGuest = ev.speakerName && ev.speakerName.toLowerCase().includes(q);
                if (!matchName && !matchOrganizer && !matchDept && !matchGuest) return false;
            }

            // Department filter
            if (selectedDept !== "All" && ev.department !== selectedDept) {
                return false;
            }

            // Date filter
            if (dateFilter === "Upcoming" && ev.date && ev.date < today) {
                return false;
            }
            if (dateFilter === "Past" && ev.date && ev.date >= today) {
                return false;
            }

            return true;
        });
    }, [events, searchQuery, selectedDept, dateFilter]);

    // Create Event
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.date || !form.time.trim()) {
            setErrMsg("Please provide Event Name, Date, and Time! ❌");
            return;
        }

        setSubmitting(true);
        setErrMsg("");
        setMsg("");

        try {
            await api.post("/workshops", {
                ...form,
                photosBase64: form.photosBase64 || [],
                speakerName: form.speakerName || "Guest Faculty / Speaker"
            });
            setMsg("Event registered successfully! ✅");
            setShowAddModal(false);
            setForm({
                title: "",
                description: "",
                date: "",
                time: "",
                venue: "",
                department: currentUser?.department || "Computer Science & Engineering",
                speakerName: "",
                speakerBio: "",
                speakerOrganization: "",
                guestDesignation: "",
                guestOrganization: "",
                guestEmail: "",
                workshopType: "Workshop",
                photosBase64: []
            });
            await loadEvents();
            setTimeout(() => setMsg(""), 5000);
        } catch (err) {
            console.error("Register event error:", err);
            setErrMsg(err.response?.data?.error || err.message || "Failed to register event ❌");
        } finally {
            setSubmitting(false);
        }
    };

    // Open Edit Event Modal
    const handleOpenEditModal = (ev) => {
        setEditForm({
            id: ev._id,
            title: ev.title || "",
            description: ev.description || "",
            date: ev.date ? new Date(ev.date).toISOString().split("T")[0] : "",
            time: ev.time || "",
            venue: ev.venue || "",
            department: ev.department || currentUser?.department || "Computer Science & Engineering",
            speakerName: ev.speakerName || "",
            speakerBio: ev.speakerBio || "",
            speakerOrganization: ev.speakerOrganization || "",
            guestDesignation: ev.guestDesignation || "",
            guestOrganization: ev.guestOrganization || "",
            guestEmail: ev.guestEmail || "",
            workshopType: ev.workshopType || "Workshop",
            photosBase64: ev.photos || []
        });
        setShowEditModal(true);
    };

    // Save Edited Event
    const handleSaveEditEvent = async (e) => {
        e.preventDefault();
        if (!editForm.title.trim() || !editForm.date || !editForm.time.trim()) {
            alert("Title, Date, and Time are required! ❌");
            return;
        }

        setUpdatingEvent(true);
        try {
            const res = await api.put(`/workshops/${editForm.id}`, {
                ...editForm,
                photosBase64: editForm.photosBase64 || []
            });
            setMsg("Event updated successfully! ✅");
            setShowEditModal(false);
            await loadEvents();
            if (res && res.workshop) {
                setSelectedEvent(res.workshop);
            } else {
                await refreshSelectedEvent(editForm.id);
            }
            setTimeout(() => setMsg(""), 5000);
        } catch (err) {
            console.error("Update event error:", err);
            alert(err.response?.data?.error || err.message || "Failed to update event ❌");
        } finally {
            setUpdatingEvent(false);
        }
    };

    // Delete Event with Confirmation
    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone. 🗑️")) {
            return;
        }

        try {
            await api.delete(`/workshops/${eventId}`);
            setMsg("Event deleted successfully! 🗑️✅");
            setSelectedEvent(null);
            await loadEvents();
            setTimeout(() => setMsg(""), 5000);
        } catch (err) {
            console.error("Delete event error:", err);
            alert(err.response?.data?.error || err.message || "Failed to delete event ❌");
        }
    };

    // Photo Management Helpers
    const handlePhotoFileChange = (e, isEdit = false) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const maxSizeBytes = 5 * 1024 * 1024;
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

        files.forEach(file => {
            if (!validTypes.includes(file.type.toLowerCase())) {
                alert(`"${file.name}" is not a supported format. Please upload JPG, PNG, or WEBP images.`);
                return;
            }
            if (file.size > maxSizeBytes) {
                alert(`"${file.name}" exceeds 5MB size limit.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result;
                if (isEdit) {
                    setEditForm(prev => ({
                        ...prev,
                        photosBase64: [...(prev.photosBase64 || []), base64]
                    }));
                } else {
                    setForm(prev => ({
                        ...prev,
                        photosBase64: [...(prev.photosBase64 || []), base64]
                    }));
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const handleRemoveSelectedPhoto = (index, isEdit = false) => {
        if (isEdit) {
            setEditForm(prev => ({
                ...prev,
                photosBase64: (prev.photosBase64 || []).filter((_, i) => i !== index)
            }));
        } else {
            setForm(prev => ({
                ...prev,
                photosBase64: (prev.photosBase64 || []).filter((_, i) => i !== index)
            }));
        }
    };

    // Direct Gallery upload in Details Modal
    const handleUploadGalleryPhotos = async (filesList) => {
        const files = Array.from(filesList || []);
        if (files.length === 0 || !selectedEvent) return;

        const maxSizeBytes = 5 * 1024 * 1024;
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

        const pendingPromises = files.map(file => {
            return new Promise((resolve, reject) => {
                if (!validTypes.includes(file.type.toLowerCase())) {
                    alert(`"${file.name}" is not a supported image format (JPG, PNG, WEBP).`);
                    return resolve(null);
                }
                if (file.size > maxSizeBytes) {
                    alert(`"${file.name}" exceeds the 5MB size limit.`);
                    return resolve(null);
                }
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
            });
        });

        try {
            setUploadingGalleryPhotos(true);
            const base64Results = await Promise.all(pendingPromises);
            const validBase64 = base64Results.filter(Boolean);
            if (validBase64.length === 0) return;

            const res = await api.post(`/workshops/${selectedEvent._id}/photos`, {
                photosBase64: validBase64
            });

            setMsg(res.message || "Event photos uploaded successfully! 📸✅");
            await refreshSelectedEvent(selectedEvent._id);
            await loadEvents();
            setTimeout(() => setMsg(""), 4000);
        } catch (err) {
            console.error("Upload gallery photos error:", err);
            alert(err.response?.data?.error || err.message || "Failed to upload photos ❌");
        } finally {
            setUploadingGalleryPhotos(false);
        }
    };

    const handleDeleteGalleryPhoto = async (photoIndex) => {
        if (!selectedEvent) return;
        if (!window.confirm("Are you sure you want to delete this event photo? 🗑️")) return;

        try {
            const res = await api.delete(`/workshops/${selectedEvent._id}/photos/${photoIndex}`);
            setMsg(res.message || "Photo deleted successfully! 🗑️✅");
            await refreshSelectedEvent(selectedEvent._id);
            await loadEvents();
            setTimeout(() => setMsg(""), 4000);
        } catch (err) {
            console.error("Delete gallery photo error:", err);
            alert(err.response?.data?.error || err.message || "Failed to delete photo ❌");
        }
    };

    // HOD & Principal Event Approval Action
    const handleApproveEvent = async (eventId) => {
        try {
            await api.put(`/workshops/${eventId}`, {
                status: "verified",
                approvedBy: currentUser._id,
                approvedByName: currentUser.name,
                approvedAt: new Date()
            });
            setMsg("Event successfully approved! ✅");
            await refreshSelectedEvent(eventId);
            await loadEvents();
            setTimeout(() => setMsg(""), 4000);
        } catch (err) {
            console.error("Approve event error:", err);
            alert(err.response?.data?.error || err.message || "Failed to approve event ❌");
        }
    };

    // Save Guest (Add or Edit)
    const handleSaveGuest = async (e) => {
        e.preventDefault();
        if (!guestForm.name.trim()) {
            alert("Guest name is required! ❌");
            return;
        }
        if (!selectedEvent) return;

        setSavingGuest(true);
        try {
            if (editingGuestId) {
                // Edit guest
                await api.put(`/workshops/${selectedEvent._id}/guests/${editingGuestId}`, guestForm);
                setMsg("Guest details updated successfully! ✅");
            } else {
                // Add guest
                await api.post(`/workshops/${selectedEvent._id}/guests`, guestForm);
                setMsg("Guest added successfully! ➕✅");
            }
            setShowGuestModal(false);
            setGuestForm({ name: "", designation: "", organization: "", email: "", contact: "" });
            setEditingGuestId(null);
            await refreshSelectedEvent();
            await loadEvents();
            setTimeout(() => setMsg(""), 4000);
        } catch (err) {
            console.error("Guest save error:", err);
            alert(err.response?.data?.error || err.message || "Failed to save guest ❌");
        } finally {
            setSavingGuest(false);
        }
    };

    // Remove Guest with Confirmation
    const handleRemoveGuest = async (guestId) => {
        if (!window.confirm("Are you sure you want to remove this guest from the event guest list? 🗑️")) {
            return;
        }
        try {
            await api.delete(`/workshops/${selectedEvent._id}/guests/${guestId}`);
            setMsg("Guest removed successfully! 🗑️✅");
            await refreshSelectedEvent();
            await loadEvents();
            setTimeout(() => setMsg(""), 4000);
        } catch (err) {
            console.error("Remove guest error:", err);
            alert(err.response?.data?.error || err.message || "Failed to remove guest ❌");
        }
    };

    // Open Letter Modal helper
    const openLetterModalForGuest = (letterType, step = "generate") => {
        if (!selectedEvent) return;

        // Build guest info
        const guestsList = selectedEvent.guests && selectedEvent.guests.length > 0
            ? selectedEvent.guests
            : [{
                  _id: selectedEvent._id,
                  name: selectedEvent.speakerName || "Distinguished Expert",
                  email: selectedEvent.guestEmail || "",
                  designation: selectedEvent.guestDesignation || selectedEvent.speakerBio || "",
                  organization: selectedEvent.guestOrganization || selectedEvent.speakerOrganization || ""
              }];

        const currentGuest = guestsList.find(g => String(g._id) === String(selectedGuestId)) || guestsList[0];

        const augmentedWorkshop = {
            ...selectedEvent,
            speakerName: currentGuest?.name || selectedEvent.speakerName,
            guestDesignation: currentGuest?.designation || selectedEvent.guestDesignation,
            guestOrganization: currentGuest?.organization || selectedEvent.guestOrganization,
            guestEmail: currentGuest?.email || selectedEvent.guestEmail,
            speakerBio: currentGuest?.designation || selectedEvent.speakerBio,
            speakerOrganization: currentGuest?.organization || selectedEvent.speakerOrganization
        };

        setLetterModalConfig({
            isOpen: true,
            workshop: augmentedWorkshop,
            initialType: letterType,
            initialStep: step
        });
    };

    // Download PDF directly from backend
    const handleDownloadLetterPdf = async (type) => {
        if (!selectedEvent) return;

        const guestsList = selectedEvent.guests && selectedEvent.guests.length > 0
            ? selectedEvent.guests
            : [{
                  _id: selectedEvent._id,
                  name: selectedEvent.speakerName || "Distinguished Expert",
                  email: selectedEvent.guestEmail || "",
                  designation: selectedEvent.guestDesignation || selectedEvent.speakerBio || "",
                  organization: selectedEvent.guestOrganization || selectedEvent.speakerOrganization || ""
              }];

        const currentGuest = guestsList.find(g => String(g._id) === String(selectedGuestId)) || guestsList[0];

        try {
            const payload = {
                letterData: {
                    institutionName: "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
                    departmentName: selectedEvent.department || currentUser?.department || "Department of Computer Science & Engineering",
                    refNo: `DYPCOEI/${(selectedEvent.department || "DEPT").toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${selectedEvent._id.toString().slice(-4).toUpperCase()}`,
                    letterDate: new Date().toISOString().split("T")[0],
                    letterType: type,
                    guestName: currentGuest?.name || selectedEvent.speakerName || "Distinguished Expert",
                    guestDesignation: currentGuest?.designation || selectedEvent.guestDesignation || selectedEvent.speakerBio || "Industry Consultant",
                    guestOrg: currentGuest?.organization || selectedEvent.guestOrganization || selectedEvent.speakerOrganization || "Enterprise / University",
                    eventTitle: selectedEvent.title || "Academic Event",
                    eventDate: selectedEvent.date ? new Date(selectedEvent.date).toISOString().split("T")[0] : "",
                    eventTime: selectedEvent.time || "10:00 AM - 01:00 PM",
                    eventVenue: selectedEvent.venue || "Campus Auditorium",
                    organizerName: selectedEvent.submittedBy?.name || currentUser?.name || "Event Faculty Coordinator",
                    principalName: "Dr. Suresh Mali"
                }
            };
            const res = await api.post(`/workshops/${selectedEvent._id}/generate-letter-pdf`, payload);
            if (res && res.pdfBase64) {
                const link = document.createElement("a");
                link.href = res.pdfBase64;
                link.download = res.filename || `${type.toUpperCase()}_LETTER_${(selectedEvent.title || "Event").replace(/\s+/g, "_")}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error("PDF download error:", err);
            alert("Failed to download letter PDF ❌");
        }
    };

    // Upload scanned signed letter
    const handleUploadScan = async (e, type) => {
        const file = e.target.files?.[0];
        if (!file || !selectedEvent) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large! Maximum limit is 10MB.");
            return;
        }

        setUploadingScan(true);
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await api.put(`/workshops/${selectedEvent._id}/scan`, {
                    type,
                    scannedImageBase64: reader.result
                });
                alert(`Scanned ${type === "invitation" ? "Invitation" : "Thanking"} letter uploaded and saved successfully! ✅`);
                await refreshSelectedEvent();
                await loadEvents();
            } catch (err) {
                console.error("Scan upload error:", err);
                alert(err.response?.data?.error || "Failed to upload scanned letter ❌");
            } finally {
                setUploadingScan(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // Dispatch Email (Send Invitation or Send Thanks)
    const handleDispatchEmail = async (e) => {
        e.preventDefault();
        if (!customRecipientEmail || !customRecipientEmail.includes("@")) {
            alert("Please provide a valid recipient email address! ❌");
            return;
        }
        if (!selectedEvent) return;

        setSendingEmail(true);
        setEmailResult(null);

        const guestsList = selectedEvent.guests && selectedEvent.guests.length > 0
            ? selectedEvent.guests
            : [{
                  _id: selectedEvent._id,
                  name: selectedEvent.speakerName || "Distinguished Expert",
                  email: selectedEvent.guestEmail || "",
                  designation: selectedEvent.guestDesignation || selectedEvent.speakerBio || "",
                  organization: selectedEvent.guestOrganization || selectedEvent.speakerOrganization || ""
              }];

        const currentGuest = guestsList.find(g => String(g._id) === String(selectedGuestId)) || guestsList[0];

        try {
            const endpoint = emailType === "invitation"
                ? `/workshops/${selectedEvent._id}/send-invitation`
                : `/workshops/${selectedEvent._id}/send-thanking`;

            const payload = {
                guestId: currentGuest?._id,
                recipientEmail: customRecipientEmail.trim(),
                guestEmail: customRecipientEmail.trim(),
                guestName: currentGuest?.name,
                customMessage: customMessage.trim(),
                attachGeneratedPdf: attachPdf,
                letterData: {
                    institutionName: "Dr. D. Y. PATIL COLLEGE OF ENGINEERING & INNOVATION",
                    departmentName: selectedEvent.department || currentUser?.department,
                    refNo: `DYPCOEI/${(selectedEvent.department || "DEPT").toUpperCase().slice(0, 4)}/${new Date().getFullYear()}/${selectedEvent._id.toString().slice(-4).toUpperCase()}`,
                    letterDate: new Date().toISOString().split("T")[0],
                    letterType: emailType,
                    guestName: currentGuest?.name || selectedEvent.speakerName || "Distinguished Expert",
                    guestDesignation: currentGuest?.designation || selectedEvent.guestDesignation || selectedEvent.speakerBio || "Expert",
                    guestOrg: currentGuest?.organization || selectedEvent.guestOrganization || selectedEvent.speakerOrganization || "Enterprise",
                    eventTitle: selectedEvent.title,
                    eventDate: selectedEvent.date ? new Date(selectedEvent.date).toISOString().split("T")[0] : "",
                    eventTime: selectedEvent.time,
                    eventVenue: selectedEvent.venue,
                    organizerName: selectedEvent.submittedBy?.name || currentUser?.name || "Faculty Coordinator",
                    principalName: "Dr. Suresh Mali"
                }
            };

            const res = await api.post(endpoint, payload);
            setEmailResult({
                success: true,
                message: res.message || `Official ${emailType} email dispatched successfully to ${customRecipientEmail}! 📧📄✅`
            });
            await refreshSelectedEvent();
            await loadEvents();
        } catch (err) {
            console.error("Email dispatch error:", err);
            setEmailResult({
                success: false,
                message: err.response?.data?.error || err.message || "Failed to dispatch email. Please verify SMTP credentials."
            });
        } finally {
            setSendingEmail(false);
        }
    };

    // Event guests helper for selectedEvent
    const currentGuestsList = useMemo(() => {
        if (!selectedEvent) return [];
        if (selectedEvent.guests && selectedEvent.guests.length > 0) {
            return selectedEvent.guests;
        }
        return [{
            _id: selectedEvent._id,
            name: selectedEvent.speakerName || "Guest Speaker",
            designation: selectedEvent.guestDesignation || selectedEvent.speakerBio || "Resource Person",
            organization: selectedEvent.guestOrganization || selectedEvent.speakerOrganization || "Enterprise / University",
            email: selectedEvent.guestEmail || "",
            contact: selectedEvent.speakerContact || "",
            invitationStatus: selectedEvent.invitationSentAt ? "Sent" : "Pending",
            thankingStatus: selectedEvent.thankingSentAt ? "Sent" : "Pending"
        }];
    }, [selectedEvent]);

    return (
        <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
            {/* WorkshopLetterModal integration */}
            {letterModalConfig.isOpen && letterModalConfig.workshop && (
                <WorkshopLetterModal
                    workshop={letterModalConfig.workshop}
                    workshopsList={events}
                    initialType={letterModalConfig.initialType}
                    initialStep={letterModalConfig.initialStep}
                    currentUser={currentUser}
                    onClose={() => setLetterModalConfig({ isOpen: false, workshop: null, initialType: "invitation", initialStep: "generate" })}
                    onUpdated={async () => {
                        await loadEvents();
                        if (selectedEvent) {
                            await refreshSelectedEvent();
                        }
                    }}
                />
            )}

            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🎯</span> Academic Events &amp; Workshops
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Compact directory of departmental seminars, workshops, and campus academic events. Click any event to inspect full details, manage guests, generate letters, and send emails.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadEvents}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="Refresh events list"
                    >
                        🔄 Refresh
                    </button>
                    <button
                        onClick={() => { setShowAddModal(true); setErrMsg(""); }}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                        <span>➕</span> Register Event
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {msg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center justify-between">
                    <span>{msg}</span>
                    <button onClick={() => setMsg("")} className="font-bold cursor-pointer">✕</button>
                </div>
            )}
            {errMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between">
                    <span>{errMsg}</span>
                    <button onClick={() => setErrMsg("")} className="font-bold cursor-pointer">✕</button>
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by event name, department, organizer, guest..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dept:</label>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                        >
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        {["All", "Upcoming", "Past"].map(f => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setDateFilter(f)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    dateFilter === f
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* COMPACT EVENT LISTING (Section 10.A: Compact cards displaying Event Name, Event Date, small View Details action) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <span>📋</span> Events Directory
                    </h3>
                    <span className="text-[11px] text-slate-500">
                        Showing {filteredEvents.length} of {events.length} event{events.length === 1 ? "" : "s"}
                    </span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Loading events directory...
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        No events found matching your filter. Click &quot;Register Event&quot; to schedule a new academic event.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filteredEvents.map((ev) => {
                            const dateStr = ev.date
                                ? new Date(ev.date).toLocaleDateString(undefined, {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric"
                                  })
                                : "Date to be announced";

                            return (
                                <div
                                    key={ev._id}
                                    onClick={() => {
                                        setSelectedEvent(ev);
                                        setActiveDetailTab("overview");
                                    }}
                                    className="bg-slate-950/70 hover:bg-slate-850/70 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group shadow-sm hover:shadow-indigo-500/5"
                                >
                                    <div>
                                        {/* Event Photo Thumbnail (if uploaded) */}
                                        {ev.photos && ev.photos.length > 0 && (
                                            <div className="h-36 w-full rounded-lg overflow-hidden bg-slate-900 mb-2.5 relative group-hover:opacity-95 transition-opacity">
                                                <img src={ev.photos[0]} alt={ev.title} className="w-full h-full object-cover" />
                                                <span className="absolute bottom-1.5 right-1.5 bg-slate-950/85 backdrop-blur-sm text-[10px] font-bold text-slate-200 px-2 py-0.5 rounded-md border border-slate-700 shadow">
                                                    📸 {ev.photos.length} Photo{ev.photos.length > 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        )}

                                        {/* Event Name (Primary text) */}
                                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                                            {ev.title}
                                        </h4>

                                        {/* Event Date (Secondary text) */}
                                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
                                            <span>📅</span>
                                            <span>{dateStr}</span>
                                        </p>
                                    </div>

                                    {/* Action: Small "View Details" button & Organizer */}
                                    <div className="pt-2.5 border-t border-slate-850/80 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                            👤 {ev.submittedBy?.name || currentUser?.name || "Organized By Faculty"}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEvent(ev);
                                                setActiveDetailTab("overview");
                                            }}
                                            className="px-2.5 py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>View Details</span>
                                            <span>→</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ================= COMPLETE EVENT DETAILS MODAL (Section 10.B to 10.H) ================= */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-scale-up my-auto max-h-[92vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-slate-800 pb-4 shrink-0">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                                        {selectedEvent.workshopType || "Academic Event"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        selectedEvent.status === "verified" || selectedEvent.status === "approved"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    }`}>
                                        {selectedEvent.status === "verified" ? "Approved" : selectedEvent.status || "Pending"}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white leading-snug">
                                    {selectedEvent.title}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2">
                                {(currentUser.role === "HOD" || currentUser.role === "Principal") && 
                                 selectedEvent.status !== "verified" && selectedEvent.status !== "approved" && (
                                    <button
                                        onClick={() => handleApproveEvent(selectedEvent._id)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow"
                                        title="Approve this Event"
                                    >
                                        <span>✓</span> Approve Event
                                    </button>
                                )}
                                <button
                                    onClick={() => handleOpenEditModal(selectedEvent)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                    title="Edit Event"
                                >
                                    <span>✏️</span> Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteEvent(selectedEvent._id)}
                                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                    title="Delete Event"
                                >
                                    <span>🗑️</span> Delete
                                </button>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="text-slate-400 hover:text-white text-base px-2 py-1 cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Navigation Tabs within Details Modal */}
                        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 shrink-0 overflow-x-auto text-xs">
                            <button
                                onClick={() => setActiveDetailTab("overview")}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                    activeDetailTab === "overview"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                                }`}
                            >
                                <span>📋</span> Event Overview
                            </button>
                            <button
                                onClick={() => setActiveDetailTab("guests")}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                    activeDetailTab === "guests"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                                }`}
                            >
                                <span>👥</span> Guest Management ({currentGuestsList.length})
                            </button>
                            <button
                                onClick={() => setActiveDetailTab("letters")}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                    activeDetailTab === "letters"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                                }`}
                            >
                                <span>📄</span> Official Letters
                            </button>
                            <button
                                onClick={() => setActiveDetailTab("photos")}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                    activeDetailTab === "photos"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                                }`}
                            >
                                <span>📸</span> Event Photos ({selectedEvent.photos?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveDetailTab("email")}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                    activeDetailTab === "email"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                                }`}
                            >
                                <span>📧</span> Email Invitations
                            </button>
                        </div>

                        {/* Modal Body Tab Content */}
                        <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                            {/* TAB 1: OVERVIEW */}
                            {activeDetailTab === "overview" && (
                                <div className="space-y-4">
                                    {/* Key Meta Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Event Date</span>
                                            <p className="text-slate-200 font-mono mt-0.5">
                                                📅 {selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "To be announced"}
                                            </p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Timing</span>
                                            <p className="text-slate-200 font-mono mt-0.5">⏰ {selectedEvent.time || "10:00 AM - 01:00 PM"}</p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Venue</span>
                                            <p className="text-slate-200 mt-0.5">📍 {selectedEvent.venue || "Campus Auditorium"}</p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Department</span>
                                            <p className="text-slate-200 mt-0.5">🏛️ {selectedEvent.department || "Engineering & Innovation"}</p>
                                        </div>

                                        {/* Organized By (Requirement 10.G: Rename "Logged By" to "Organized By") */}
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Organized By</span>
                                            <p className="text-indigo-300 font-bold mt-0.5">
                                                👤 {selectedEvent.submittedBy?.name || currentUser?.name || "Faculty Coordinator"}
                                            </p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Approval Status</span>
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                                                selectedEvent.status === "approved" || selectedEvent.status === "verified"
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                            }`}>
                                                {selectedEvent.status === "verified" ? "Approved" : selectedEvent.status || "Pending"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {selectedEvent.description && (
                                        <div className="space-y-1.5">
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Event Description</h4>
                                            <p className="text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 whitespace-pre-line">
                                                {selectedEvent.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Primary Resource Person / Speaker */}
                                    {(selectedEvent.speakerName || selectedEvent.speakerOrganization) && (
                                        <div className="space-y-1.5">
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                Primary Guest Speaker / Resource Person
                                            </h4>
                                            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 flex items-start gap-3">
                                                <span className="text-2xl">🎙️</span>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-100">{selectedEvent.speakerName}</p>
                                                    {selectedEvent.speakerOrganization && (
                                                        <p className="text-slate-400 mt-0.5">{selectedEvent.speakerOrganization}</p>
                                                    )}
                                                    {selectedEvent.speakerBio && (
                                                        <p className="text-slate-500 text-[11px] mt-1 italic">{selectedEvent.speakerBio}</p>
                                                    )}
                                                    {selectedEvent.guestEmail && (
                                                        <p className="text-indigo-400 text-[11px] mt-1">✉️ {selectedEvent.guestEmail}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Event Coordinators */}
                                    {selectedEvent.coordinators && selectedEvent.coordinators.length > 0 && (
                                        <div className="space-y-1.5">
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Event Coordinators</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedEvent.coordinators.map((c, idx) => (
                                                    <span key={idx} className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 text-xs">
                                                        👤 {c.name || c} {c.department ? `(${c.department})` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Supporting Documents & Photographs */}
                                    {(selectedEvent.speakerResumePath || (selectedEvent.photos && selectedEvent.photos.length > 0)) && (
                                        <div className="space-y-2">
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                Supporting Documents &amp; Photographs
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedEvent.speakerResumePath && (
                                                    <a
                                                        href={selectedEvent.speakerResumePath}
                                                        download="Resource_Person_Profile.pdf"
                                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                                                    >
                                                        <span>📄</span> Speaker CV / Document
                                                    </a>
                                                )}
                                            </div>

                                            {/* Photo gallery preview */}
                                            {selectedEvent.photos && selectedEvent.photos.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-slate-300">
                                                            📸 Documented Photos ({selectedEvent.photos.length})
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveDetailTab("photos")}
                                                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                                                        >
                                                            Open Full Gallery →
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {selectedEvent.photos.slice(0, 4).map((photo, idx) => (
                                                            <div 
                                                                key={idx}
                                                                onClick={() => setEnlargedPhoto(photo)}
                                                                className="h-24 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer hover:border-indigo-500 transition relative group"
                                                            >
                                                                <img
                                                                    src={photo}
                                                                    alt={`Event photograph ${idx + 1}`}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Signed Official Letters Preview (if uploaded) */}
                                    {(selectedEvent.scannedInvitation || selectedEvent.scannedThankingLetter) && (
                                        <div className="space-y-2">
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                Uploaded Signed Letter Scans
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedEvent.scannedInvitation && (
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openFileInNewTab(selectedEvent.scannedInvitation, `${selectedEvent.title} - Signed Invitation Letter`)}
                                                            className="px-3 py-1.5 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-900 transition cursor-pointer"
                                                        >
                                                            <span>📜</span> View Signed Invitation Scan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadAttachment(selectedEvent.scannedInvitation, `${selectedEvent.title.replace(/\s+/g, "_")}_Invitation.pdf`)}
                                                            className="p-1.5 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 hover:text-white rounded-lg text-xs transition cursor-pointer"
                                                            title="Download file"
                                                        >
                                                            <span>⬇️</span>
                                                        </button>
                                                    </div>
                                                )}
                                                {selectedEvent.scannedThankingLetter && (
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openFileInNewTab(selectedEvent.scannedThankingLetter, `${selectedEvent.title} - Signed Thanking Letter`)}
                                                            className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-900 transition cursor-pointer"
                                                        >
                                                            <span>🤝</span> View Signed Thanking Letter Scan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadAttachment(selectedEvent.scannedThankingLetter, `${selectedEvent.title.replace(/\s+/g, "_")}_Thanking.pdf`)}
                                                            className="p-1.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:text-white rounded-lg text-xs transition cursor-pointer"
                                                            title="Download file"
                                                        >
                                                            <span>⬇️</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: PHOTOS GALLERY */}
                            {activeDetailTab === "photos" && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                        <div>
                                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>📸</span> Event Photographs Gallery
                                            </h4>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Documented photos of session conduction, audience, and campus activities. ({selectedEvent.photos?.length || 0} photo{selectedEvent.photos?.length === 1 ? "" : "s"})
                                            </p>
                                        </div>
                                        <div>
                                            <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md">
                                                <span>➕</span>
                                                <span>{uploadingGalleryPhotos ? "Uploading..." : "Upload Photos"}</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                                    className="hidden"
                                                    disabled={uploadingGalleryPhotos}
                                                    onChange={(e) => {
                                                        handleUploadGalleryPhotos(e.target.files);
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {selectedEvent.photos && selectedEvent.photos.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {selectedEvent.photos.map((photo, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="group relative h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 hover:border-indigo-500 transition-all shadow"
                                                >
                                                    <img 
                                                        src={photo} 
                                                        alt={`Event documentation ${idx + 1}`} 
                                                        className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                                                        onClick={() => setEnlargedPhoto(photo)}
                                                    />
                                                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEnlargedPhoto(photo);
                                                            }}
                                                            className="p-1.5 bg-slate-900/90 text-white rounded-lg hover:bg-indigo-600 transition cursor-pointer"
                                                            title="Inspect Full Resolution"
                                                        >
                                                            🔍
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteGalleryPhoto(idx);
                                                            }}
                                                            className="p-1.5 bg-rose-900/90 text-rose-200 rounded-lg hover:bg-rose-600 transition cursor-pointer"
                                                            title="Delete Photo"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                                            <span className="text-3xl block mb-2">📸</span>
                                            <p className="text-slate-300 font-bold mb-1">No Event Photographs Uploaded Yet</p>
                                            <p className="text-slate-500 text-[11px] max-w-sm mx-auto mb-4">
                                                Upload documented event photos to showcase session activities and generate visual reports. Allowed formats: JPG, JPEG, PNG, WEBP (up to 5MB each).
                                            </p>
                                            <label className="inline-flex px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl text-xs font-bold transition items-center gap-2 cursor-pointer border border-slate-700">
                                                <span>📁 Select Photos from Computer</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        handleUploadGalleryPhotos(e.target.files);
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: GUEST MANAGEMENT (Section 10.D) */}
                            {activeDetailTab === "guests" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Event Guest List</h4>
                                            <p className="text-[11px] text-slate-400">
                                                Manage invited speakers, industry delegates, and academic resource persons.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingGuestId(null);
                                                setGuestForm({ name: "", designation: "", organization: "", email: "", contact: "" });
                                                setShowGuestModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <span>➕</span> Add Guest
                                        </button>
                                    </div>

                                    {/* Guests Table */}
                                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                                                    <th className="p-3">Guest Name</th>
                                                    <th className="p-3">Designation &amp; Organization</th>
                                                    <th className="p-3">Email &amp; Contact</th>
                                                    <th className="p-3">Invitation</th>
                                                    <th className="p-3">Thanking</th>
                                                    <th className="p-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-850">
                                                {currentGuestsList.map((guest, idx) => (
                                                    <tr key={guest._id || idx} className="hover:bg-slate-900/40 transition">
                                                        <td className="p-3 font-bold text-slate-200">
                                                            👤 {guest.name}
                                                        </td>
                                                        <td className="p-3 text-slate-400">
                                                            <div>{guest.designation || "Resource Person"}</div>
                                                            <div className="text-[11px] text-slate-500">{guest.organization}</div>
                                                        </td>
                                                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                                                            <div>{guest.email || <span className="text-slate-600 italic">No email</span>}</div>
                                                            {guest.contact && <div className="text-slate-500">📞 {guest.contact}</div>}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                guest.invitationStatus === "Sent"
                                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                    : "bg-slate-800 text-slate-400"
                                                            }`}>
                                                                {guest.invitationStatus || "Pending"}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                guest.thankingStatus === "Sent"
                                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                    : "bg-slate-800 text-slate-400"
                                                            }`}>
                                                                {guest.thankingStatus || "Pending"}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingGuestId(guest._id);
                                                                        setGuestForm({
                                                                            name: guest.name || "",
                                                                            designation: guest.designation || "",
                                                                            organization: guest.organization || "",
                                                                            email: guest.email || "",
                                                                            contact: guest.contact || ""
                                                                        });
                                                                        setShowGuestModal(true);
                                                                    }}
                                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold transition cursor-pointer"
                                                                    title="Edit Guest Details"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveGuest(guest._id)}
                                                                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[10px] font-semibold transition cursor-pointer"
                                                                    title="Remove Guest"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: LETTER GENERATION & ACTIONS (Section 10.E) */}
                            {activeDetailTab === "letters" && (
                                <div className="space-y-4">
                                    {/* Guest Selector for Letter Generation */}
                                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-300">Target Guest:</span>
                                            <select
                                                value={selectedGuestId}
                                                onChange={(e) => handleSelectGuestForEmail(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                                            >
                                                {currentGuestsList.map(g => (
                                                    <option key={g._id} value={g._id}>
                                                        {g.name} ({g.organization || g.designation || "Guest"})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            Letters generated will be customized with the selected guest&apos;s details.
                                        </span>
                                    </div>

                                    {/* 2-Card Layout: Invitation Letter & Thank-You Letter */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* INVITATION LETTER CARD */}
                                        <div className="bg-slate-950/60 border border-indigo-900/40 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                                                    <span>✉️</span> Official Invitation Letter
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    selectedEvent.invitationSentAt
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-slate-800 text-slate-400"
                                                }`}>
                                                    {selectedEvent.invitationSentAt ? "Dispatched ✓" : "Pending"}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-slate-400">
                                                Generate, inspect, or download an official letter of invitation with institutional letterhead and dynamic signatory details.
                                            </p>

                                            <div className="space-y-2 pt-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => openLetterModalForGuest("invitation", "generate")}
                                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                                    >
                                                        <span>✍️</span> Generate / Edit
                                                    </button>
                                                    <button
                                                        onClick={() => openLetterModalForGuest("invitation", "view")}
                                                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <span>👁️</span> Preview
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleDownloadLetterPdf("invitation")}
                                                        className="px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <span>📥</span> Download PDF
                                                    </button>
                                                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer">
                                                        <span>📷</span> {uploadingScan ? "Uploading..." : "Upload Scan"}
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleUploadScan(e, "invitation")}
                                                            disabled={uploadingScan}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* THANK-YOU LETTER CARD */}
                                        <div className="bg-slate-950/60 border border-emerald-900/40 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                                                    <span>🤝</span> Letter of Appreciation / Thanks
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    selectedEvent.thankingSentAt
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-slate-800 text-slate-400"
                                                }`}>
                                                    {selectedEvent.thankingSentAt ? "Dispatched ✓" : "Pending"}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-slate-400">
                                                Issue formal institutional gratitude to the expert speaker following the successful conclusion of the session.
                                            </p>

                                            <div className="space-y-2 pt-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => openLetterModalForGuest("thanking", "generate")}
                                                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                                    >
                                                        <span>✍️</span> Generate / Edit
                                                    </button>
                                                    <button
                                                        onClick={() => openLetterModalForGuest("thanking", "view")}
                                                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <span>👁️</span> Preview
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleDownloadLetterPdf("thanking")}
                                                        className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <span>📥</span> Download PDF
                                                    </button>
                                                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer">
                                                        <span>📷</span> {uploadingScan ? "Uploading..." : "Upload Scan"}
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleUploadScan(e, "thanking")}
                                                            disabled={uploadingScan}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: SEND INVITATION / THANKING BY EMAIL (Section 10.F) */}
                            {activeDetailTab === "email" && (
                                <form onSubmit={handleDispatchEmail} className="space-y-4">
                                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3.5">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-white">Email Dispatch Console</h4>
                                                <p className="text-[11px] text-slate-400">
                                                    Send official invitations or appreciation letters directly via configured college SMTP mail service.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEmailType("invitation")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                        emailType === "invitation"
                                                            ? "bg-indigo-600 text-white shadow-sm"
                                                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                                                    }`}
                                                >
                                                    ✉️ Invitation Email
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEmailType("thanking")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                        emailType === "thanking"
                                                            ? "bg-emerald-600 text-white shadow-sm"
                                                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                                                    }`}
                                                >
                                                    🤝 Thanking Email
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status result notification */}
                                        {emailResult && (
                                            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                                                emailResult.success
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                            }`}>
                                                <span>{emailResult.message}</span>
                                                <button type="button" onClick={() => setEmailResult(null)} className="font-bold">✕</button>
                                            </div>
                                        )}

                                        {/* Guest Selector */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                    Select Guest from List *
                                                </label>
                                                <select
                                                    value={selectedGuestId}
                                                    onChange={(e) => handleSelectGuestForEmail(e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                                                >
                                                    {currentGuestsList.map(g => (
                                                        <option key={g._id} value={g._id}>
                                                            {g.name} — {g.email || "No email"}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                    Recipient Email Address *
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={customRecipientEmail}
                                                    onChange={(e) => setCustomRecipientEmail(e.target.value)}
                                                    placeholder="guest.speaker@organization.com"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                                                />
                                            </div>
                                        </div>

                                        {/* Subject Line */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Email Subject Line *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={customSubject}
                                                onChange={(e) => setCustomSubject(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        {/* Message Body */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Message Body Preview
                                            </label>
                                            <textarea
                                                rows="4"
                                                value={customMessage}
                                                onChange={(e) => setCustomMessage(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono text-xs"
                                            />
                                        </div>

                                        {/* Attachment checkbox */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <input
                                                type="checkbox"
                                                id="attachPdfCheck"
                                                checked={attachPdf}
                                                onChange={(e) => setAttachPdf(e.target.checked)}
                                                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                                            />
                                            <label htmlFor="attachPdfCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                                                📄 Attach Official {emailType === "invitation" ? "Invitation" : "Thanking"} Letter PDF (Auto-generated with college letterhead)
                                            </label>
                                        </div>

                                        {/* Send button */}
                                        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
                                            <button
                                                type="submit"
                                                disabled={sendingEmail || !customRecipientEmail}
                                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                                            >
                                                {sendingEmail ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Dispatching via SMTP...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>🚀</span>
                                                        <span>Dispatch Official {emailType === "invitation" ? "Invitation" : "Thanking"} Email</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end pt-3 border-t border-slate-800 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedEvent(null)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= REGISTER EVENT MODAL ================= */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>🎯</span> Register Campus Event
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Event Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., National Seminar on Advanced Generative AI"
                                    value={form.title}
                                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Event Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.date}
                                        onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Time / Duration *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="10:00 AM - 01:00 PM"
                                        value={form.time}
                                        onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Venue
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Seminar Auditorium Hall A"
                                        value={form.venue}
                                        onChange={(e) => setForm(prev => ({ ...prev, venue: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={form.department}
                                        onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Guest Speaker / Resource Person
                                </label>
                                <input
                                    type="text"
                                    placeholder="Speaker or Resource Person Name"
                                    value={form.speakerName}
                                    onChange={(e) => setForm(prev => ({ ...prev, speakerName: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Speaker Organization
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enterprise or Institute"
                                        value={form.speakerOrganization}
                                        onChange={(e) => setForm(prev => ({ ...prev, speakerOrganization: e.target.value, guestOrganization: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Speaker Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="speaker@org.com"
                                        value={form.guestEmail}
                                        onChange={(e) => setForm(prev => ({ ...prev, guestEmail: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Event Description
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Brief overview of event topics, target audience, and academic goals..."
                                    value={form.description}
                                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            {/* Event Photos Upload */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    📸 Event Photos (Optional, multiple allowed, max 5MB each)
                                </label>
                                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 bg-slate-950/60 text-center">
                                    <input
                                        type="file"
                                        id="addEventPhotoInput"
                                        multiple
                                        accept="image/jpeg,image/png,image/webp,image/jpg"
                                        className="hidden"
                                        onChange={(e) => handlePhotoFileChange(e, false)}
                                    />
                                    <label htmlFor="addEventPhotoInput" className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold flex items-center justify-center gap-2">
                                        <span>📷 Choose Photos</span>
                                        <span className="text-slate-500 text-[10px]">(JPG, PNG, WEBP)</span>
                                    </label>
                                </div>
                                {form.photosBase64 && form.photosBase64.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {form.photosBase64.map((photo, pIdx) => (
                                            <div key={pIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 group">
                                                <img src={photo} alt={`Preview ${pIdx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSelectedPhoto(pIdx, false)}
                                                    className="absolute top-0 right-0 bg-rose-600 hover:bg-rose-500 text-white w-5 h-5 flex items-center justify-center text-[10px] rounded-bl font-bold cursor-pointer"
                                                    title="Remove photo"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                                >
                                    {submitting ? "Registering..." : "Register Event"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= EDIT EVENT MODAL ================= */}
            {showEditModal && editForm && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>✏️</span> Edit Event Details
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleSaveEditEvent} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Event Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Event Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={editForm.date}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Time / Duration *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.time}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Venue
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.venue}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, venue: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.department}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Event Description
                                </label>
                                <textarea
                                    rows="3"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            {/* Event Photos Edit / Upload */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    📸 Event Photos (Current & New, max 5MB each)
                                </label>
                                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 bg-slate-950/60 text-center">
                                    <input
                                        type="file"
                                        id="editEventPhotoInput"
                                        multiple
                                        accept="image/jpeg,image/png,image/webp,image/jpg"
                                        className="hidden"
                                        onChange={(e) => handlePhotoFileChange(e, true)}
                                    />
                                    <label htmlFor="editEventPhotoInput" className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold flex items-center justify-center gap-2">
                                        <span>📷 Choose More Photos</span>
                                        <span className="text-slate-500 text-[10px]">(JPG, PNG, WEBP)</span>
                                    </label>
                                </div>
                                {editForm.photosBase64 && editForm.photosBase64.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {editForm.photosBase64.map((photo, pIdx) => (
                                            <div key={pIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 group">
                                                <img src={photo} alt={`Preview ${pIdx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSelectedPhoto(pIdx, true)}
                                                    className="absolute top-0 right-0 bg-rose-600 hover:bg-rose-500 text-white w-5 h-5 flex items-center justify-center text-[10px] rounded-bl font-bold cursor-pointer"
                                                    title="Remove photo"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingEvent}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                                >
                                    {updatingEvent ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= GUEST SUB-MODAL (ADD / EDIT) ================= */}
            {showGuestModal && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>👤</span> {editingGuestId ? "Edit Guest Details" : "Add Guest to Event"}
                            </h3>
                            <button onClick={() => setShowGuestModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleSaveGuest} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Guest Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Dr. Rajesh Sharma"
                                    value={guestForm.name}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Designation
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Principal Architect"
                                        value={guestForm.designation}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, designation: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Organization
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Google AI / IIT"
                                        value={guestForm.organization}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, organization: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    placeholder="rajesh.sharma@example.com"
                                    value={guestForm.email}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Contact / Mobile Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="+91 98765 43210"
                                    value={guestForm.contact}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, contact: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowGuestModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingGuest}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                                >
                                    {savingGuest ? "Saving..." : (editingGuestId ? "Update Guest" : "Add Guest")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Enlarged Photo Lightbox Modal */}
            {enlargedPhoto && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setEnlargedPhoto(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setEnlargedPhoto(null)}
                            className="absolute -top-10 right-0 text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-lg cursor-pointer"
                        >
                            ✕ Close
                        </button>
                        <img
                            src={enlargedPhoto}
                            alt="Enlarged Event Moment"
                            className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-slate-700"
                        />
                        <div className="mt-2 text-slate-300 text-xs font-medium bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800">
                            Click anywhere outside or click Close to dismiss
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EventsPanel;
