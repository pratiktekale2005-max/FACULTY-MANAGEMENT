// Utility functions for safe attachment normalization, type detection, viewing, and downloading

export const getApiOrigin = () => {
    if (typeof window === "undefined") return "http://localhost:5000";
    const host = window.location.hostname || "localhost";
    return `http://${host}:5000`;
};

/**
 * Normalizes any attachment source string into a safe, full URL or valid Data URL.
 * Supports:
 * - Data URLs (data:application/pdf;base64, data:image/...)
 * - Raw Base64 strings without data: prefix (JVBERi..., iVBORw..., /9j/..., NCiW...)
 * - Absolute URLs (http://, https://, blob:)
 * - Relative upload paths (/uploads/..., uploads/...)
 */
export const normalizeAttachmentUrl = (fileString) => {
    if (!fileString || typeof fileString !== "string") return "";
    const trimmed = fileString.trim();
    if (!trimmed) return "";

    // 1. Already a valid Data URL
    if (trimmed.startsWith("data:")) {
        // Strip out carriage returns or newlines that might be nested inside data URL
        const commaIdx = trimmed.indexOf(",");
        if (commaIdx !== -1) {
            const header = trimmed.slice(0, commaIdx + 1);
            const payload = trimmed.slice(commaIdx + 1).replace(/\s/g, "");
            return `${header}${payload}`;
        }
        return trimmed;
    }

    // 2. Absolute URLs
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("blob:")) {
        return trimmed;
    }

    // 3. Raw Base64 detection
    const clean = trimmed.replace(/\s/g, "");

    if (clean.startsWith("JVBER")) {
        // Standard PDF magic number in Base64
        return `data:application/pdf;base64,${clean}`;
    }
    if (clean.startsWith("/9j/")) {
        // JPEG magic number
        return `data:image/jpeg;base64,${clean}`;
    }
    if (clean.startsWith("iVBORw")) {
        // PNG magic number
        return `data:image/png;base64,${clean}`;
    }
    if (clean.startsWith("R0lGOD")) {
        // GIF magic number
        return `data:image/gif;base64,${clean}`;
    }
    if (clean.startsWith("UklGR")) {
        // WEBP magic number
        return `data:image/webp;base64,${clean}`;
    }

    // Check if raw base64 string decodes to PDF magic bytes (%PDF) or image signatures
    try {
        if (clean.length > 40 && /^[A-Za-z0-9+/=]+$/.test(clean.slice(0, 100))) {
            const sample = atob(clean.slice(0, 60));
            if (sample.includes("%PDF")) {
                return `data:application/pdf;base64,${clean}`;
            }
            if (sample.startsWith("\xFF\xD8\xFF")) {
                return `data:image/jpeg;base64,${clean}`;
            }
            if (sample.startsWith("\x89PNG")) {
                return `data:image/png;base64,${clean}`;
            }
        }
    } catch (e) {
        // Ignore base64 decoding errors for file paths
    }

    // 4. Relative paths
    const origin = getApiOrigin();
    if (trimmed.startsWith("/")) {
        return `${origin}${trimmed}`;
    }
    return `${origin}/${trimmed}`;
};

/**
 * Analyzes an attachment string and returns its format classification and safe preview URL.
 */
export const getAttachmentInfo = (fileString) => {
    if (!fileString || typeof fileString !== "string" || !fileString.trim()) {
        return {
            isValid: false,
            isPdf: false,
            isImage: false,
            mime: "",
            previewUrl: "",
            extension: "bin",
            formatLabel: "Unknown"
        };
    }

    const previewUrl = normalizeAttachmentUrl(fileString);
    let mime = "";
    let isPdf = false;
    let isImage = false;
    let extension = "bin";
    let formatLabel = "Document";

    if (previewUrl.startsWith("data:")) {
        const match = previewUrl.match(/^data:([^;,]+)[;,]/);
        if (match) {
            mime = match[1].toLowerCase();
        }
        if (mime.includes("pdf")) {
            isPdf = true;
            extension = "pdf";
            formatLabel = "PDF Document";
        } else if (mime.startsWith("image/")) {
            isImage = true;
            extension = mime.split("/")[1] || "png";
            if (extension === "jpeg") extension = "jpg";
            formatLabel = `Image (${extension.toUpperCase()})`;
        }
    } else {
        const lower = previewUrl.toLowerCase();
        if (lower.endsWith(".pdf") || lower.includes(".pdf?")) {
            isPdf = true;
            mime = "application/pdf";
            extension = "pdf";
            formatLabel = "PDF Document";
        } else if (lower.match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/)) {
            isImage = true;
            mime = "image/jpeg";
            const extMatch = lower.match(/\.(png|jpe?g|webp|gif|svg)/);
            extension = extMatch ? extMatch[1] : "jpg";
            if (extension === "jpeg") extension = "jpg";
            formatLabel = `Image (${extension.toUpperCase()})`;
        }
    }

    // If still undetermined, check if previewUrl or data contains typical PDF content
    if (!isPdf && !isImage && previewUrl.includes("application/pdf")) {
        isPdf = true;
        mime = "application/pdf";
        extension = "pdf";
        formatLabel = "PDF Document";
    }

    return {
        isValid: isPdf || isImage || previewUrl.length > 30,
        isPdf,
        isImage,
        mime: mime || (isPdf ? "application/pdf" : isImage ? "image/jpeg" : "application/octet-stream"),
        previewUrl,
        extension,
        formatLabel
    };
};

/**
 * Creates a native Blob URL from an attachment string.
 * This is critical for Chromium browsers, which block embedding 'data:' URIs in <iframe>.
 * Returns { url: string, isBlob: boolean, info: object }
 */
export const createBlobUrlFromAttachment = (fileString) => {
    const info = getAttachmentInfo(fileString);
    if (!info.isValid || !info.previewUrl) {
        return { url: "", isBlob: false, info };
    }

    // Direct HTTP, HTTPS, or existing Blob URL
    if (info.previewUrl.startsWith("http://") || info.previewUrl.startsWith("https://") || info.previewUrl.startsWith("blob:")) {
        return { url: info.previewUrl, isBlob: false, info };
    }

    // Convert Data URL to a native typed Blob URL
    if (info.previewUrl.startsWith("data:")) {
        try {
            const parts = info.previewUrl.split(",");
            if (parts.length >= 2) {
                const cleanBase64 = parts[1].replace(/\s/g, "");
                const byteCharacters = atob(cleanBase64);
                const byteNumbers = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const blob = new Blob([byteNumbers], { type: info.mime || (info.isPdf ? "application/pdf" : "image/jpeg") });
                const blobUrl = URL.createObjectURL(blob);
                return { url: blobUrl, isBlob: true, info };
            }
        } catch (err) {
            console.warn("Blob conversion failed, returning previewUrl:", err);
        }
    }

    return { url: info.previewUrl, isBlob: false, info };
};

/**
 * Safely opens a file in a new browser tab.
 * Avoids Chrome/Edge top-level navigation blocks for "data: URLs" by converting to a native Blob URL.
 */
export const openFileInNewTab = (fileString, title = "Document Preview") => {
    if (!fileString) return;
    const { url, isBlob, info } = createBlobUrlFromAttachment(fileString);
    if (!url) return;

    if (isBlob) {
        const win = window.open(url, "_blank");
        if (!win) {
            downloadAttachment(fileString, `${title.replace(/\s+/g, "_")}.${info.extension || "pdf"}`);
        } else {
            // Revoke after 2 minutes to free memory
            setTimeout(() => URL.revokeObjectURL(url), 120000);
        }
        return;
    }

    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
    }

    // Fallback download if popup or format fails
    downloadAttachment(fileString, `${title.replace(/\s+/g, "_")}.${info.extension || "pdf"}`);
};

/**
 * Downloads an attachment with a clean, formatted filename and correct extension.
 */
export const downloadAttachment = (fileString, defaultFilename = "document") => {
    if (!fileString) return;
    const { url, isBlob, info } = createBlobUrlFromAttachment(fileString);
    if (!url) return;

    let cleanName = defaultFilename.trim().replace(/[/\\?%*:|"<>]/g, "_");
    if (!cleanName.includes(".")) {
        cleanName = `${cleanName}.${info.extension || "pdf"}`;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (isBlob) {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
};

/**
 * Extracts and unifies all attachments for any profile record:
 * - Workshops and Seminars
 * - Research Papers / Publications
 * - Certifications and FDPs
 * - Academic / Other Activities
 *
 * Returns an array of normalized attachment objects:
 * [
 *   {
 *     id: string,
 *     label: string,
 *     file: string,
 *     info: object,
 *     fileName: string,
 *     isImage: boolean,
 *     isPdf: boolean
 *   }
 * ]
 */
export const extractRecordAttachments = (record, category = "Document") => {
    if (!record || typeof record !== "object") return [];

    const attachments = [];
    const seenFiles = new Set();

    const addAttachment = (fileString, label, baseFileName) => {
        if (!fileString || typeof fileString !== "string" || !fileString.trim()) return;
        const normalized = normalizeAttachmentUrl(fileString);
        if (!normalized || seenFiles.has(normalized)) return;
        seenFiles.add(normalized);

        const info = getAttachmentInfo(normalized);
        if (!info.isValid) return;

        const cleanBase = (baseFileName || record.title || record.activityName || "attachment")
            .trim()
            .replace(/[/\\?%*:|"<>]/g, "_");

        attachments.push({
            id: `${label.toLowerCase().replace(/\s+/g, "-")}-${attachments.length + 1}`,
            label,
            category,
            file: normalized,
            info,
            fileName: `${cleanBase}_${label.replace(/\s+/g, "_")}.${info.extension}`,
            isPdf: info.isPdf,
            isImage: info.isImage,
            formatLabel: info.formatLabel
        });
    };

    const recordTitle = record.title || record.activityName || record.subjectName || "Record";

    // 1. Specific Named Document Fields by Record Category
    if (category.toLowerCase().includes("workshop") || category.toLowerCase().includes("seminar")) {
        if (record.scannedInvitation) {
            addAttachment(record.scannedInvitation, "Invitation Letter", `${recordTitle}_Invitation`);
        }
        if (record.scannedThankingLetter) {
            addAttachment(record.scannedThankingLetter, "Thanking Letter", `${recordTitle}_Thanking`);
        }
        if (record.scannedOfficialLetter || record.officialLetterDoc) {
            addAttachment(record.scannedOfficialLetter || record.officialLetterDoc, "Official Letter", `${recordTitle}_Official`);
        }
        if (record.speakerResumePath || record.speakerResumeBase64 || record.resumeDoc) {
            addAttachment(record.speakerResumePath || record.speakerResumeBase64 || record.resumeDoc, "Speaker CV / Resume", `${recordTitle}_Speaker_CV`);
        }
        if (record.certificate || record.certificateBase64 || record.certificateFile) {
            addAttachment(record.certificate || record.certificateBase64 || record.certificateFile, "Participation Certificate", `${recordTitle}_Certificate`);
        }
        if (record.documentPath) {
            addAttachment(record.documentPath, "Event Document", `${recordTitle}_Document`);
        }
    } else if (category.toLowerCase().includes("paper") || category.toLowerCase().includes("publication")) {
        if (record.fileBase64 || record.filePath || record.file) {
            addAttachment(record.fileBase64 || record.filePath || record.file, "Publication PDF", `${recordTitle}_Full_Paper`);
        }
        if (record.certificateBase64 || record.certificatePath || record.certificate || record.certificateFile) {
            addAttachment(record.certificateBase64 || record.certificatePath || record.certificate || record.certificateFile, "Publication Certificate / Proof", `${recordTitle}_Proof`);
        }
        if (record.documentPath) {
            addAttachment(record.documentPath, "Paper Document", `${recordTitle}_Document`);
        }
    } else if (category.toLowerCase().includes("certif")) {
        if (record.certificateFile || record.certificateBase64 || record.certificate || record.filePath || record.file) {
            addAttachment(record.certificateFile || record.certificateBase64 || record.certificate || record.filePath || record.file, "Certificate", `${recordTitle}_Certificate`);
        }
        if (record.documentPath) {
            addAttachment(record.documentPath, "Certification Document", `${recordTitle}_Document`);
        }
    } else if (category.toLowerCase().includes("activit")) {
        if (record.documentPath || record.documentBase64 || record.filePath) {
            addAttachment(record.documentPath || record.documentBase64 || record.filePath, "Supporting Document", `${recordTitle}_Document`);
        }
        if (record.certificateFile || record.certificate) {
            addAttachment(record.certificateFile || record.certificate, "Activity Certificate", `${recordTitle}_Certificate`);
        }
    }

    // 2. Generic Attachments Array
    if (Array.isArray(record.attachments)) {
        record.attachments.forEach((att, idx) => {
            if (typeof att === "string") {
                addAttachment(att, `Attachment #${idx + 1}`, `${recordTitle}_Att_${idx + 1}`);
            } else if (att && typeof att === "object" && (att.url || att.path || att.file)) {
                addAttachment(att.url || att.path || att.file, att.name || `Attachment #${idx + 1}`, `${recordTitle}_Att_${idx + 1}`);
            }
        });
    }

    // 3. Photos / Images Array
    if (Array.isArray(record.photos)) {
        record.photos.forEach((photo, idx) => {
            if (typeof photo === "string") {
                addAttachment(photo, `Photograph #${idx + 1}`, `${recordTitle}_Photo_${idx + 1}`);
            }
        });
    } else if (typeof record.photos === "string" && record.photos.trim()) {
        addAttachment(record.photos, "Event Photograph", `${recordTitle}_Photo_1`);
    }

    return attachments;
};
