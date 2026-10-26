import React, { useState, useEffect, useRef, useMemo } from "react";
import { api } from "../services/api";

/**
 * Format timestamp into human-readable relative time (Instagram-style)
 */
function formatRelativeTime(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;

    // For older dates, display readable short date
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Infer category, sender role, and destination tab if missing from legacy records
 */
function inferNotificationMetadata(notif) {
    const title = notif.title || "";
    const msg = notif.message || "";
    const combined = `${title} ${msg}`.toLowerCase();

    // 1. Role inference
    let role = notif.senderRole || "";
    if (!role) {
        if (/principal/i.test(combined)) role = "Principal";
        else if (/hod/i.test(combined)) role = "HOD";
        else if (/faculty/i.test(combined)) role = "Faculty";
        else role = "System";
    }

    // 2. Category inference
    let category = notif.category || "";
    if (!category || category === "General") {
        if (/workshop|seminar|fdp|event/i.test(combined)) category = "Workshop";
        else if (/leave/i.test(combined)) category = "Leave";
        else if (/task/i.test(combined)) category = "Task";
        else if (/paper|publication|research/i.test(combined)) category = "Paper";
        else if (/approval|approved|rejected|forwarded/i.test(combined)) category = "Approval";
        else if (/letter|invitation/i.test(combined)) category = "Letter";
        else if (/attendance/i.test(combined)) category = "Attendance";
        else if (/timetable|schedule/i.test(combined)) category = "Timetable";
        else if (/green ?book/i.test(combined)) category = "Green Book";
        else if (/notice|announcement/i.test(combined)) category = "Notice";
        else category = "System";
    }

    // 3. Navigation target tab inference
    let targetTab = notif.targetTab || "";
    if (!targetTab) {
        if (/workshop|seminar|event/i.test(combined)) targetTab = "events";
        else if (/task/i.test(combined)) targetTab = "tasks";
        else if (/leave/i.test(combined)) targetTab = "leave";
        else if (/approval|endorse/i.test(combined)) targetTab = "approvals";
        else if (/letter|invitation/i.test(combined)) targetTab = "invitations";
        else if (/paper|research/i.test(combined)) targetTab = "papers";
        else if (/green ?book/i.test(combined)) targetTab = "greenbook";
        else if (/attendance/i.test(combined)) targetTab = "attendance";
        else if (/timetable|schedule/i.test(combined)) targetTab = "timetable";
        else if (/notice|announcement/i.test(combined)) targetTab = "notices";
    }

    // 4. Role Avatar Icon & Badges
    let roleIcon = "⚙️";
    let roleColor = "bg-slate-700/40 text-slate-300 border-slate-600/40";
    if (role === "Principal") {
        roleIcon = "🏛️";
        roleColor = "bg-amber-500/10 text-amber-500 border-amber-500/30";
    } else if (role === "HOD") {
        roleIcon = "👔";
        roleColor = "bg-purple-500/10 text-purple-500 border-purple-500/30";
    } else if (role === "Faculty") {
        roleIcon = "👨‍🏫";
        roleColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    }

    // 5. Category Icon & Pill styling
    let categoryIcon = "🔔";
    let categoryStyle = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    if (category === "Workshop") {
        categoryIcon = "🎓";
        categoryStyle = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    } else if (category === "Leave") {
        categoryIcon = "🏖️";
        categoryStyle = "bg-rose-500/10 text-rose-500 border-rose-500/20";
    } else if (category === "Task") {
        categoryIcon = "📋";
        categoryStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    } else if (category === "Approval") {
        categoryIcon = "⚖️";
        categoryStyle = "bg-violet-500/10 text-violet-500 border-violet-500/20";
    } else if (category === "Paper") {
        categoryIcon = "📄";
        categoryStyle = "bg-blue-500/10 text-blue-500 border-blue-500/20";
    } else if (category === "Letter") {
        categoryIcon = "✉️";
        categoryStyle = "bg-teal-500/10 text-teal-500 border-teal-500/20";
    } else if (category === "Notice") {
        categoryIcon = "📢";
        categoryStyle = "bg-pink-500/10 text-pink-500 border-pink-500/20";
    }

    return {
        role,
        roleIcon,
        roleColor,
        category,
        categoryIcon,
        categoryStyle,
        targetTab
    };
}

export default function NotificationCenter({
    currentUser,
    notifications = [],
    setNotifications,
    fetchAlerts,
    loading = false,
    error = "",
    setCurrentTab,
    theme = "dark"
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [filterTab, setFilterTab] = useState("all"); // "all" | "unread"
    const dropdownRef = useRef(null);
    const bellBtnRef = useRef(null);

    const unreadList = useMemo(() => {
        return notifications.filter(n => !n.isRead);
    }, [notifications]);

    const unreadCount = unreadList.length;

    // Display string for bell badge: hide if 0, "99+" if >99
    const unreadBadgeText = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

    // Close on outside click or escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (e) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(e.target) &&
                bellBtnRef.current &&
                !bellBtnRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleEscape = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    // Mark individual notification as read & navigate to target module
    const handleNotificationClick = async (notif) => {
        const meta = inferNotificationMetadata(notif);

        // Optimistically mark as read immediately in React state
        if (!notif.isRead) {
            setNotifications(prev =>
                prev.map(item => item._id === notif._id ? { ...item, isRead: true } : item)
            );
            try {
                await api.put(`/notifications/${notif._id}/read`);
            } catch (err) {
                console.error("Failed to mark notification read:", err);
                if (fetchAlerts) fetchAlerts();
            }
        }

        // Navigate to target tab if available
        if (meta.targetTab && typeof setCurrentTab === "function") {
            setCurrentTab(meta.targetTab);
            setIsOpen(false);
        }
    };

    // Mark all notifications as read
    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        if (unreadCount === 0) return;

        // Optimistic UI update
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));

        try {
            await api.put("/notifications/read-all");
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            if (fetchAlerts) fetchAlerts();
        }
    };

    // Filter displayed notifications based on active filter tab
    const displayedNotifications = filterTab === "unread" ? unreadList : notifications;

    return (
        <div className="relative inline-block text-left notif-center-root">
            {/* Notification Bell Button */}
            <button
                ref={bellBtnRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications, no unread"}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm relative cursor-pointer transition-all ${
                    isOpen 
                        ? "bg-indigo-600/20 text-indigo-400 ring-2 ring-indigo-500/40" 
                        : "hover:bg-slate-850 text-slate-300 hover:text-white"
                }`}
                title="Notifications"
            >
                <span className="text-base leading-none select-none">🔔</span>
                {unreadBadgeText && (
                    <span 
                        className="absolute -top-1 -right-1 min-w-[1.2rem] h-[1.2rem] px-1 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black leading-none shadow-md ring-2 ring-slate-900 animate-pulse select-none notif-bell-badge"
                    >
                        {unreadBadgeText}
                    </span>
                )}
            </button>

            {/* Instagram-Style Notification Center Panel */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="dialog"
                    aria-label="Notification Center"
                    className="notif-dropdown absolute right-0 mt-3 w-88 sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-[#101622] border border-slate-800 rounded-2xl shadow-2xl z-50 animate-scale-up overflow-hidden text-left divide-y divide-slate-800/80"
                >
                    {/* Header */}
                    <div className="p-4 bg-slate-900/80 backdrop-blur-md flex items-center justify-between notif-panel-header">
                        <div className="flex items-center gap-2.5">
                            <span className="text-lg leading-none">🔔</span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                    <span>Notifications</span>
                                    {unreadCount > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                            {unreadCount} New
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            All caught up
                                        </span>
                                    )}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Real-time activity updates & departmental alerts
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10 cursor-pointer notif-mark-read-btn"
                                    title="Mark all as read"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors text-sm cursor-pointer"
                                aria-label="Close notifications"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs (All vs Unread) */}
                    <div className="px-4 py-2 bg-slate-950/60 flex items-center gap-2 notif-filter-bar">
                        <button
                            type="button"
                            onClick={() => setFilterTab("all")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                filterTab === "all"
                                    ? "bg-indigo-650 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                            }`}
                        >
                            <span>All</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                                {notifications.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab("unread")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                filterTab === "unread"
                                    ? "bg-indigo-650 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                            }`}
                        >
                            <span>Unread</span>
                            {unreadCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200 font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Notification Cards List */}
                    <div 
                        className="max-h-[420px] overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5 notif-scroll-area"
                        tabIndex={0}
                        aria-label="Notification items"
                    >
                        {loading && notifications.length === 0 ? (
                            <div className="py-8 px-4 text-center space-y-3">
                                <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-slate-400">Loading notifications...</p>
                            </div>
                        ) : error && notifications.length === 0 ? (
                            <div className="py-8 px-4 text-center space-y-2">
                                <p className="text-xs text-rose-400">{error}</p>
                                <button
                                    type="button"
                                    onClick={fetchAlerts}
                                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                    🔄 Retry
                                </button>
                            </div>
                        ) : displayedNotifications.length === 0 ? (
                            <div className="py-12 px-6 text-center space-y-2 notif-empty-state">
                                <div className="text-3xl select-none">
                                    {filterTab === "unread" ? "🎉" : "📭"}
                                </div>
                                <h4 className="text-xs font-bold text-slate-200">
                                    {filterTab === "unread" ? "No unread notifications" : "No notifications yet"}
                                </h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                                    {filterTab === "unread" 
                                        ? "You're all caught up with recent updates and tasks." 
                                        : "When you receive task assignments, approval updates, or institutional notices, they will appear right here in real time."}
                                </p>
                            </div>
                        ) : (
                            displayedNotifications.map((notif) => {
                                const meta = inferNotificationMetadata(notif);
                                const isUnread = !notif.isRead;
                                const timeStr = formatRelativeTime(notif.createdAt);

                                return (
                                    <div
                                        key={notif._id}
                                        onClick={() => handleNotificationClick(notif)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                handleNotificationClick(notif);
                                            }
                                        }}
                                        className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer notif-card ${
                                            isUnread
                                                ? "bg-slate-900 border-indigo-500/40 shadow-sm notif-card-unread hover:bg-slate-850 hover:border-indigo-400"
                                                : "bg-slate-950/40 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800 opacity-80 hover:opacity-100"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Role & Avatar Icon */}
                                            <div 
                                                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 mt-0.5 shadow-sm notif-avatar ${meta.roleColor}`}
                                                title={`From ${meta.role}`}
                                            >
                                                <span>{meta.roleIcon}</span>
                                            </div>

                                            {/* Notification Body */}
                                            <div className="min-w-0 flex-1 space-y-1">
                                                {/* Meta Row: Role / Sender • Category • Timestamp */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200 truncate notif-sender-title">
                                                            {notif.senderName ? `${notif.senderName} (${meta.role})` : meta.role}
                                                        </span>
                                                        <span className="text-slate-600 text-[10px]">•</span>
                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${meta.categoryStyle} notif-category-chip`}>
                                                            {meta.categoryIcon} {meta.category}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 notif-time">
                                                        {timeStr}
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <h4 className={`text-xs font-bold leading-snug notif-title ${
                                                    isUnread ? "text-slate-100" : "text-slate-300"
                                                }`}>
                                                    {notif.title}
                                                </h4>

                                                {/* Full Message */}
                                                <p className="text-[11px] text-slate-300 leading-relaxed break-words notif-message">
                                                    {notif.message}
                                                </p>

                                                {/* Navigation Action Hint (Instagram style) */}
                                                {meta.targetTab && (
                                                    <div className="pt-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors notif-action-link">
                                                        <span>View {meta.category}</span>
                                                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Instagram-style Unread Dot */}
                                            {isUnread && (
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-400/40 shrink-0 mt-1 animate-pulse notif-unread-dot"
                                                    title="Unread notification"
                                                    aria-label="Unread"
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-900/60 text-center notif-footer">
                        <span className="text-[10px] text-slate-400">
                            Real-Time Push Stream Active ⚡
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
