import React, { useEffect, useState } from "react";
import { getAttachmentInfo, createBlobUrlFromAttachment, openFileInNewTab, downloadAttachment } from "../utils/attachmentUtils";

/**
 * Universal Modal Document and Image Viewer
 * Renders embedded PDF previews and high-res image viewers with full-size viewing,
 * zoom controls, safe "Open in Browser", and download options.
 */
function DocumentViewerModal({ isOpen, onClose, document: doc }) {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [activeUrl, setActiveUrl] = useState("");

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Convert file to native Blob URL if necessary and reset state on doc change
    useEffect(() => {
        setZoomLevel(1);
        setIframeLoaded(false);
        setLoadError(false);

        if (!doc || !doc.file) {
            setActiveUrl("");
            return;
        }

        const res = createBlobUrlFromAttachment(doc.file);
        setActiveUrl(res.url);

        return () => {
            if (res.isBlob && res.url) {
                URL.revokeObjectURL(res.url);
            }
        };
    }, [doc]);

    if (!isOpen || !doc || !doc.file) return null;

    const fileInfo = getAttachmentInfo(doc.file);
    const title = doc.title || doc.fileName || "Faculty Profile Document";
    const category = doc.type || "Document";

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setZoomLevel(1);

    const handleOpenInNewTab = () => {
        openFileInNewTab(doc.file, title);
    };

    const handleDownload = () => {
        const filename = doc.fileName || title;
        downloadAttachment(doc.file, filename);
    };

    const displayUrl = activeUrl || fileInfo.previewUrl;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-5 animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            fileInfo.isPdf 
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                                : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        }`}>
                            {fileInfo.isPdf ? "📄" : "🖼️"}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-white truncate max-w-md" title={title}>
                                    {title}
                                </h3>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider shrink-0">
                                    {category}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                    fileInfo.isPdf 
                                        ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" 
                                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                }`}>
                                    {fileInfo.formatLabel}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                Verified faculty portfolio attachment
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Image zoom controls */}
                        {fileInfo.isImage && (
                            <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 mr-1 text-slate-300 text-xs">
                                <button
                                    onClick={handleZoomOut}
                                    className="px-2 py-1 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                    title="Zoom Out"
                                >
                                    -
                                </button>
                                <span className="px-1.5 font-mono text-[10px]">{Math.round(zoomLevel * 100)}%</span>
                                <button
                                    onClick={handleZoomIn}
                                    className="px-2 py-1 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                    title="Zoom In"
                                >
                                    +
                                </button>
                                {zoomLevel !== 1 && (
                                    <button
                                        onClick={handleResetZoom}
                                        className="px-2 py-1 text-[10px] hover:text-white hover:bg-slate-800 rounded-lg border-l border-slate-800 transition"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleOpenInNewTab}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:translate-y-0.5 cursor-pointer"
                            title="Open document in a new browser window"
                        >
                            <span>↗</span>
                            <span className="hidden sm:inline">Open in Browser</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownload}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:translate-y-0.5 cursor-pointer"
                            title="Download document to your device"
                        >
                            <span>⬇️</span>
                            <span className="hidden sm:inline">Download</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                            title="Close viewer (Esc)"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body Content Preview */}
                <div className="flex-1 bg-slate-950 p-3 sm:p-4 overflow-auto flex items-center justify-center relative">
                    {/* PDF Viewer */}
                    {fileInfo.isPdf ? (
                        <div className="w-full h-full flex flex-col relative rounded-xl overflow-hidden border border-slate-800 bg-[#1e293b]">
                            {!iframeLoaded && !loadError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 text-slate-400 text-xs gap-2">
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Rendering PDF document...</span>
                                </div>
                            )}

                            {loadError ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                                    <div className="text-4xl">⚠️</div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-200">Embedded Preview Restricted</h4>
                                        <p className="text-xs text-slate-400 max-w-md">
                                            Your browser prevents direct embedded rendering of this PDF format. You can open it in a new window or download it directly.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleOpenInNewTab}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                                        >
                                            ↗ Open in Browser Window
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold"
                                        >
                                            ⬇️ Download PDF
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <object
                                    data={displayUrl}
                                    type={fileInfo.mime || "application/pdf"}
                                    onLoad={() => setIframeLoaded(true)}
                                    onError={() => setLoadError(true)}
                                    className="w-full h-full border-0 rounded-xl"
                                >
                                    <iframe
                                        src={displayUrl}
                                        title={title}
                                        onLoad={() => setIframeLoaded(true)}
                                        onError={() => setLoadError(true)}
                                        className="w-full h-full border-0 rounded-xl"
                                    />
                                </object>
                            )}
                        </div>
                    ) : fileInfo.isImage ? (
                        /* Image Viewer */
                        <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                            <img
                                src={displayUrl}
                                alt={title}
                                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl transition-transform duration-200 border border-slate-800/80 select-none"
                            />
                        </div>
                    ) : (
                        /* Generic File Fallback */
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-3xl flex items-center justify-center">
                                📎
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200">{title}</h4>
                                <p className="text-xs text-slate-400 mt-1 max-w-md">
                                    This file attachment can be opened directly or downloaded to your device.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleOpenInNewTab}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                                >
                                    ↗ Open Document
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold"
                                >
                                    ⬇️ Download File
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Authorized secure attachment view</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                        <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">Esc</kbd> to exit</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DocumentViewerModal;
