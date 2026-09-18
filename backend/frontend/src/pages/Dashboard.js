import React, { useState, useEffect } from "react";
import GreenBookPanel from "../components/GreenBookPanel";
import ProfilePanel from "../components/ProfilePanel";
import WorkshopsPanel from "../components/WorkshopsPanel";
import ActivitiesPanel from "../components/ActivitiesPanel";
import PapersPanel from "../components/PapersPanel";
import ReportGeneratorPanel from "../components/ReportGeneratorPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";
import StudentManagement from "../components/StudentManagement";
import StudentFeedback from "../components/StudentFeedback";
import InvitationsLetters from "../components/InvitationsLetters";
import HODDashboard from "../components/HODDashboard";
import ApprovalCenter from "../components/ApprovalCenter";
import FacultyPerformance from "../components/FacultyPerformance";
import TasksPanel from "../components/TasksPanel";
import DesignationAssignment from "../components/DesignationAssignment";
import OrganizationSettings from "../components/OrganizationSettings";
import DepartmentManagement from "../components/DepartmentManagement";
import FacultyManagement from "../components/FacultyManagement";
import HODManagement from "../components/HODManagement";
import CertificationsPanel from "../components/CertificationsPanel";
import AssignmentsPanel from "../components/AssignmentsPanel";
import DepartmentFacultyView from "../components/DepartmentFacultyView";
import FacultyDetailedProfile from "../components/FacultyDetailedProfile";
import { api } from "../services/api";

function Dashboard({ currentUser, onLogout }) {
    const [currentTab, setCurrentTab] = useState("overview");
    const [selectedDepartment, setSelectedDepartment] = useState(null); // { code: "AID", name: "..." }
    const [selectedFacultyProfile, setSelectedFacultyProfile] = useState(null); // faculty object or ID
    const [theme, setTheme] = useState("dark");
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [branding, setBranding] = useState(null);
    
    // Core data triggers for children components
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    // Sync theme preferences and sidebar collapse preferences
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "dark";
        setTheme(savedTheme);
        if (savedTheme === "light") {
            document.documentElement.classList.add("light-theme");
        } else {
            document.documentElement.classList.remove("light-theme");
        }

        const collapsed = localStorage.getItem("sidebar_collapsed") === "true";
        setIsSidebarCollapsed(collapsed);
    }, []);

    // Guard: Prevent unauthorized access to restricted sections (KPIs, Official Letters)
    useEffect(() => {
        if (!currentUser) return;
        if (currentUser.role === "Faculty" && (currentTab === "kpis" || currentTab === "invitations")) {
            setCurrentTab("overview");
        }
        if (currentUser.role !== "Principal" && currentUser.role !== "HOD" && currentTab === "invitations") {
            setCurrentTab("overview");
        }
    }, [currentUser, currentTab]);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
        if (nextTheme === "light") {
            document.documentElement.classList.add("light-theme");
        } else {
            document.documentElement.classList.remove("light-theme");
        }
    };

    const toggleSidebarCollapse = () => {
        const nextVal = !isSidebarCollapsed;
        setIsSidebarCollapsed(nextVal);
        localStorage.setItem("sidebar_collapsed", nextVal.toString());
    };

    // Load institution branding
    const loadBranding = async () => {
        try {
            const data = await api.get("/organizations/my-org");
            if (data.organization) {
                setBranding(data.organization);
                document.documentElement.style.setProperty('--accent-purple', data.organization.settings?.branding?.primaryColor || '#8b5cf6');
                document.documentElement.style.setProperty('--accent-blue', data.organization.settings?.branding?.secondaryColor || '#3b82f6');
            }
        } catch (err) {
            console.error("Failed to load institution branding:", err);
        }
    };

    useEffect(() => {
        loadBranding();
    }, []);

    // Fetch notifications from real backend DB
    const fetchAlerts = async () => {
        try {
            const data = await api.get("/notifications");
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error("Notifications fetch error:", err);
        }
    };

    useEffect(() => {
        fetchAlerts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const getTabTitle = () => {
        if (currentTab === "overview") {
            if (selectedFacultyProfile) {
                return `${selectedFacultyProfile.name || "Faculty"} - Detailed Profile`;
            }
            if (selectedDepartment) {
                return `${selectedDepartment.code} Department - Faculty Directory`;
            }
            return "Dashboard";
        }
        switch (currentTab) {
            case "overview": return "Dashboard";
            case "faculty": return "Faculty Directory & Portfolios";
            case "faculty-performance": return "Faculty Performance Scorecard";
            case "tasks": return "Assign & Track Tasks";
            case "greenbook": return "Green Book (Academic Tracker)";
            case "workshops": return currentUser.role === "Principal" || currentUser.role === "HOD" ? "Workshop Approvals Queue" : "My Workshops & Seminars";
            case "approvals": return currentUser.role === "Principal" || currentUser.role === "HOD" ? "Approvals Center Queue" : "My Submission Approvals";
            case "activities": return "Other Activities Portfolio";
            case "papers": return "Research Papers & Publications";
            case "kpis": return "KPI Goals & Targets Tracker";
            case "reports": return "Academic Profile Report Generator";
            case "profile": return "My Academic Profile";
            case "students": return "Student Roster Management";
            case "feedback": return "Student Course Evaluations";
            case "invitations": return currentUser.role === "HOD" ? "Department Appointment Letters" : "Official Letters & Templates";
            case "users": return "Designation Assignment";
            case "settings": return "Institution Profile Settings";
            case "departments": return "Department Registry Management";
            case "faculty-mgmt": return "All Faculty";
            case "hod-mgmt": return "Department Leadership (HODs)";
            case "certifications": return "My Certifications Portfolio";
            case "assignments": return "Subject Assignments Management";
            default: return "Dashboard";
        }
    };

    const renderNavButton = (tab, icon, label) => {
        const isActive = currentTab === tab;
        return (
            <button
                onClick={() => { 
                    setCurrentTab(tab); 
                    setSelectedDepartment(null);
                    setSelectedFacultyProfile(null);
                    setIsMobileSidebarOpen(false); 
                }}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} text-xs font-semibold rounded-xl transition-all text-left ${
                    isActive 
                        ? "bg-indigo-650 text-white shadow-lg shadow-indigo-650/15" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                }`}
                title={label}
            >
                <span className="text-sm shrink-0">{icon}</span>
                {!isSidebarCollapsed && <span className="truncate">{label}</span>}
            </button>
        );
    };

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div 
                    onClick={() => setIsMobileSidebarOpen(false)} 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
                />
            )}

            {/* ================= SIDEBAR NAVIGATION ================= */}
            <aside className={`fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between z-50 transform transition-all duration-300 lg:translate-x-0 ${
                isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } ${isSidebarCollapsed ? "w-16" : "w-64"} lg:static lg:h-screen shrink-0`}>
                
                <div className="overflow-y-auto flex-1 min-h-0">
                    {/* Brand & User Identity Header */}
                    <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            {branding && branding.logo ? (
                                <div className="w-8 h-8 border border-slate-850 rounded bg-slate-950 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={branding.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            ) : (
                                <span className="text-xl shrink-0">🎓</span>
                            )}
                            {!isSidebarCollapsed && (
                                <div className="min-w-0">
                                    <h1 className="font-bold text-xs tracking-tight text-slate-100 uppercase truncate">
                                        {branding ? branding.shortName : "EduCRM"}
                                    </h1>
                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest truncate">
                                        {branding && branding.settings?.branding?.motto ? branding.settings.branding.motto : "Faculty Activity Management"}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {!isSidebarCollapsed && (
                            <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl space-y-1.5 animate-fade-in">
                                <div className="font-bold text-slate-200 text-[11px] truncate">{currentUser.fullName || currentUser.name}</div>
                                <div className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider truncate">{currentUser.designation || currentUser.role}</div>
                                {currentUser.role !== "Principal" && (
                                    <div className="text-[9px] text-slate-500 font-medium truncate">{currentUser.department}</div>
                                )}
                                {currentUser.role === "Principal" && (
                                    <div className="text-[9px] text-slate-500 font-medium truncate">Administration</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Items */}
                    <nav className="p-3 space-y-4">
                        {currentUser.role === "HOD" ? (
                            <>
                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Main</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("overview", "📊", "Dashboard")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Department</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("faculty", "👥", "Faculty Directory")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Performance</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("faculty-performance", "📈", "Faculty Performance")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Approvals</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("approvals", "🔔", "Pending Approvals")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Tasks</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("tasks", "📋", "Assign Tasks")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Academic Activities</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("workshops", "🎤", "Workshops")}
                                        {renderNavButton("papers", "📝", "Research")}
                                        {renderNavButton("activities", "🎯", "Faculty Activities")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Official Documents</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("invitations", "✉️", "Official Letters")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Reports & Profile</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("reports", "📄", "Department Report")}
                                        {renderNavButton("profile", "👤", "Profile")}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Main</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("overview", "📊", "Dashboard")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Academic Control</p>}
                                    <div className="space-y-1">
                                        {currentUser.role === "Principal" && renderNavButton("faculty", "👥", "Faculty Directory")}
                                        {renderNavButton("greenbook", "📖", "Green Book Tracker")}
                                        {renderNavButton("workshops", "🎤", currentUser.role === "Principal" ? "Workshop Approvals" : "Workshops & Seminars")}
                                        {renderNavButton("approvals", "🔔", currentUser.role === "Principal" ? "Approvals Queue" : "My Submissions")}
                                        {currentUser.role === "Faculty" && renderNavButton("activities", "🎯", "Other Activities")}
                                        {renderNavButton("students", "👥", "Student Roster")}
                                        {renderNavButton("feedback", "⭐", "Survey Feedbacks")}
                                        {currentUser.role === "Principal" && renderNavButton("invitations", "✉️", "Official Letters")}
                                    </div>
                                </div>

                                <div>
                                    {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Profile & Publications</p>}
                                    <div className="space-y-1">
                                        {renderNavButton("papers", "📝", "Research Papers")}
                                        {currentUser.role === "Faculty" && renderNavButton("certifications", "🏅", "Certifications")}
                                        {currentUser.role === "Faculty" && renderNavButton("assignments", "📚", "Assignments")}
                                        {renderNavButton("reports", "📄", "Report Generator")}
                                        {renderNavButton("profile", "👤", "My Profile")}
                                    </div>
                                </div>

                                {currentUser.role === "Principal" && (
                                    <div>
                                        {!isSidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Administration</p>}
                                        <div className="space-y-1">
                                            {renderNavButton("departments", "🏢", "Departments")}
                                            {renderNavButton("faculty-mgmt", "👥", "All Faculty")}
                                            {renderNavButton("users", "🎖️", "Designation Assignment")}
                                            {renderNavButton("settings", "⚙️", "College Settings")}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </nav>
                </div>

                {/* Sidebar Footer User Card */}
                <div className={`p-4 border-t border-slate-800/80 bg-slate-950/20 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} gap-3 shrink-0`}>
                    {!isSidebarCollapsed && (
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                        </div>
                    )}
                    <button 
                        onClick={onLogout}
                        className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"
                        title="Logout"
                    >
                        🚪
                    </button>
                </div>
            </aside>

            {/* ================= MAIN VIEWPORT CONTAINER ================= */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                
                {/* Top Navbar */}
                <header className="h-16 border-b border-slate-850 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
                            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                        >
                            🍔
                        </button>
                        <button 
                            onClick={toggleSidebarCollapse} 
                            className="hidden lg:block p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                            title="Toggle Sidebar Collapse"
                        >
                            {isSidebarCollapsed ? "▶" : "◀"}
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-slate-100 tracking-tight leading-none">{getTabTitle()}</h1>
                            <p className="text-[10px] text-slate-400 mt-1.5 hidden sm:block">
                                Institution: {branding ? branding.name : "EduCRM"} &bull; Role: {currentUser.role}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        
                        {/* Global Search bar */}
                        <div className="hidden md:flex items-center bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-1.5 w-56 text-slate-200 transition-all focus-within:border-indigo-500">
                            <span className="text-xs text-slate-500 mr-2">🔍</span>
                            <input 
                                type="text" 
                                placeholder="Search repository..." 
                                className="bg-transparent border-0 outline-none text-[10px] text-slate-200 w-full placeholder-slate-600 p-0 focus:ring-0"
                                onClick={() => alert("Quick Navigation Search: To search specific files, rosters, activities, research, or approvals, click into the respective tab categories in the sidebar. 🔎")}
                            />
                        </div>

                        {/* Theme Toggle Button */}
                        <button 
                            onClick={toggleTheme}
                            className="p-2 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-250 transition-all text-xs font-semibold"
                            title="Toggle Light/Dark Theme"
                        >
                            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
                        </button>

                        {/* Notification Bell Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2.5 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-200 transition-all text-xs relative"
                            >
                                🔔
                                {notifications.filter(n => !n.isRead).length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-505 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none shadow">
                                        {notifications.filter(n => !n.isRead).length}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl z-50 animate-scale-up text-left space-y-3">
                                    <h4 className="text-xs font-bold text-slate-350 border-b border-slate-800 pb-2 flex items-center justify-between">
                                        <span>System Notification Alerts</span>
                                        <div className="flex items-center gap-2">
                                            {notifications.some(n => !n.isRead) && (
                                                <button 
                                                    onClick={async () => {
                                                        try {
                                                            await api.put("/notifications/read-all");
                                                            fetchAlerts();
                                                        } catch (e) {
                                                            console.error("Mark read all failed:", e);
                                                        }
                                                    }}
                                                    className="text-[9px] font-semibold text-indigo-400 hover:text-indigo-300"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                            <span className="text-[9px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                {notifications.filter(n => !n.isRead).length} New
                                            </span>
                                        </div>
                                    </h4>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {notifications.length === 0 ? (
                                            <p className="text-slate-500 text-[11px] italic py-4 text-center">No notifications found.</p>
                                        ) : (
                                            notifications.map((n) => (
                                                <div 
                                                    key={n._id} 
                                                    onClick={async () => {
                                                        if (!n.isRead) {
                                                            try {
                                                                await api.put(`/notifications/${n._id}/read`);
                                                                fetchAlerts();
                                                            } catch (e) {
                                                                console.error("Mark read failed:", e);
                                                            }
                                                        }
                                                    }}
                                                    className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                                                        n.isRead 
                                                            ? "bg-slate-950/40 border-slate-900/60 opacity-60" 
                                                            : "bg-slate-950 border-slate-850 hover:bg-slate-900/60"
                                                    }`}
                                                >
                                                    <span className="text-xs mt-0.5">
                                                        {n.type === "warning" ? "⚠️" : n.type === "deadline" ? "⏰" : n.type === "approval" ? "🔔" : "ℹ️"}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] font-bold text-slate-200 leading-snug">{n.title}</p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </header>

                {/* Main Content Area scroll window */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {selectedFacultyProfile ? (
                        <FacultyDetailedProfile 
                            facultyId={selectedFacultyProfile._id || selectedFacultyProfile.id || selectedFacultyProfile} 
                            facultyData={typeof selectedFacultyProfile === "object" ? selectedFacultyProfile : null} 
                            departmentName={selectedFacultyProfile.department || selectedDepartment?.name || selectedDepartment?.code} 
                            onBack={() => setSelectedFacultyProfile(null)} 
                            currentUser={currentUser} 
                        />
                    ) : (
                        <>
                            {/* OVERVIEW DASHBOARD VIEW */}
                            {currentTab === "overview" && (
                                currentUser.role === "HOD" ? (
                                    <HODDashboard currentUser={currentUser} onSelectFaculty={(fac) => setSelectedFacultyProfile(fac)} />
                                ) : selectedDepartment ? (
                                    <DepartmentFacultyView 
                                        departmentCode={selectedDepartment.code} 
                                        departmentName={selectedDepartment.name} 
                                        onBack={() => setSelectedDepartment(null)} 
                                        onSelectFaculty={(fac) => setSelectedFacultyProfile(fac)} 
                                        currentUser={currentUser} 
                                    />
                                ) : (
                                    <AnalyticsPanel 
                                        currentUser={currentUser} 
                                        setCurrentTab={setCurrentTab} 
                                        onSelectDepartment={(code, name) => {
                                            setSelectedDepartment({ code, name });
                                            setSelectedFacultyProfile(null);
                                        }}
                                        refreshTrigger={refreshTrigger}
                                    />
                                )
                            )}

                            {/* FACULTY DIRECTORY VIEW */}
                            {currentTab === "faculty" && (currentUser.role === "Principal" || currentUser.role === "HOD") && (
                                <ProfilePanel 
                                    currentUser={currentUser} 
                                    roleFilter={currentUser.role} 
                                    refreshTrigger={refreshTrigger}
                                    onRefresh={triggerRefresh}
                                />
                            )}

                            {/* ACADEMIC GREEN BOOK VIEW */}
                            {currentTab === "greenbook" && (
                                <GreenBookPanel 
                                    currentUser={currentUser} 
                                    refreshTrigger={refreshTrigger} 
                                    onRefresh={triggerRefresh}
                                    onSelectFaculty={(fac) => setSelectedFacultyProfile(fac)}
                                />
                            )}

                            {/* WORKSHOPS VIEW */}
                            {currentTab === "workshops" && (
                                <WorkshopsPanel 
                                    currentUser={currentUser} 
                                    refreshTrigger={refreshTrigger} 
                                    onRefresh={triggerRefresh}
                                    onSelectFaculty={(fac) => setSelectedFacultyProfile(fac)}
                                />
                            )}

                            {/* OTHER ACTIVITIES VIEW */}
                            {currentTab === "activities" && (currentUser.role === "Faculty" || currentUser.role === "HOD") && (
                                <ActivitiesPanel 
                                    currentUser={currentUser} 
                                    refreshTrigger={refreshTrigger} 
                                    onRefresh={triggerRefresh}
                                />
                            )}

                            {/* RESEARCH PAPERS VIEW */}
                            {currentTab === "papers" && (
                                <PapersPanel 
                                    currentUser={currentUser} 
                                    refreshTrigger={refreshTrigger} 
                                    onRefresh={triggerRefresh}
                                />
                            )}

                            {/* APPROVALS CENTER VIEW */}
                            {currentTab === "approvals" && (
                                <ApprovalCenter 
                                    currentUser={currentUser} 
                                />
                            )}

                            {/* FACULTY PERFORMANCE SCOREBOARD VIEW */}
                            {currentTab === "faculty-performance" && (
                                <FacultyPerformance 
                                    currentUser={currentUser} 
                                />
                            )}

                            {/* TASKS VIEW */}
                            {currentTab === "tasks" && (
                                <TasksPanel 
                                    currentUser={currentUser} 
                                />
                            )}

                            {/* DESIGNATION ASSIGNMENT VIEW */}
                            {currentTab === "users" && currentUser.role === "Principal" && (
                                <DesignationAssignment 
                                    currentUser={currentUser} 
                                    onRefresh={triggerRefresh}
                                    onSelectFaculty={(fac) => setSelectedFacultyProfile(fac)}
                                />
                            )}

                            {/* DEPARTMENT MANAGEMENT VIEW */}
                            {currentTab === "departments" && currentUser.role === "Principal" && (
                                <DepartmentManagement 
                                    currentUser={currentUser} 
                                    onRefresh={triggerRefresh}
                                />
                            )}

                            {/* FACULTY MANAGEMENT VIEW */}
                            {currentTab === "faculty-mgmt" && currentUser.role === "Principal" && (
                                <FacultyManagement 
                                    currentUser={currentUser} 
                                    onRefresh={triggerRefresh}
                                    onSelectFaculty={(fac) => setSelectedFacultyProfile(fac)}
                                />
                            )}

                            {/* HOD MANAGEMENT VIEW */}
                            {currentTab === "hod-mgmt" && currentUser.role === "Principal" && (
                                <HODManagement 
                                    currentUser={currentUser} 
                                    onRefresh={triggerRefresh}
                                />
                            )}

                            {/* REPORT GENERATOR VIEW */}
                            {currentTab === "reports" && (
                                <ReportGeneratorPanel 
                                    currentUser={currentUser} 
                                    refreshTrigger={refreshTrigger} 
                                />
                            )}

                            {/* PROFILE VIEW */}
                            {currentTab === "profile" && (
                                <ProfilePanel 
                                    currentUser={currentUser} 
                                    roleFilter={currentUser.role === "HOD" ? "Faculty" : currentUser.role} 
                                    refreshTrigger={refreshTrigger}
                                    onRefresh={triggerRefresh}
                                />
                            )}

                            {/* STUDENT MANAGEMENT VIEW */}
                            {currentTab === "students" && (
                                <StudentManagement 
                                    currentUser={currentUser} 
                                    onRefresh={triggerRefresh}
                                />
                            )}

                            {/* STUDENT FEEDBACK VIEW */}
                            {currentTab === "feedback" && (
                                <StudentFeedback 
                                    currentUser={currentUser} 
                                />
                            )}

                            {/* INVITATION & LETTERS VIEW */}
                            {currentTab === "invitations" && (currentUser.role === "Principal" || currentUser.role === "HOD") && (
                                <InvitationsLetters currentUser={currentUser} />
                            )}

                            {/* COLLEGE SETTINGS VIEW */}
                            {currentTab === "settings" && currentUser.role === "Principal" && (
                                <OrganizationSettings 
                                    currentUser={currentUser} 
                                />
                            )}

                            {/* CERTIFICATIONS PORTFOLIO VIEW */}
                            {currentTab === "certifications" && currentUser.role === "Faculty" && (
                                <CertificationsPanel 
                                    currentUser={currentUser} 
                                />
                            )}

                            {/* SUBJECT ASSIGNMENTS VIEW */}
                            {currentTab === "assignments" && currentUser.role === "Faculty" && (
                                <AssignmentsPanel 
                                    currentUser={currentUser} 
                                />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Dashboard;
