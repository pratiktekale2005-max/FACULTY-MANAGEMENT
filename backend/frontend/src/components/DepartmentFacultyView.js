import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function DepartmentFacultyView({ departmentCode, departmentName, onBack, onSelectFaculty }) {
    const [facultyList, setFacultyList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    // Standardized Department Display Name
    const deptFullNames = {
        AIDS: "Artificial Intelligence & Data Science (AIDS)",
        AID: "Artificial Intelligence & Data Science (AIDS)",
        AIML: "Artificial Intelligence & Machine Learning",
        CS: "Computer Science & Engineering"
    };

    const fullTitle = departmentName || deptFullNames[departmentCode] || `${departmentCode} Department`;

    useEffect(() => {
        const loadDepartmentFaculty = async () => {
            try {
                setLoading(true);
                setError("");
                
                // Fetch users
                const userData = await api.get("/users");
                const allUsers = userData.users || [];

                // Filter teaching faculty (Faculty and HOD roles)
                const teachingStaff = allUsers.filter(u => u.role === "Faculty" || u.role === "HOD");

                // Filter by department matching code or name
                const filtered = teachingStaff.filter(u => {
                    const uDeptName = (u.department || u.departmentId?.name || "").toLowerCase();
                    const uDeptCode = (u.departmentId?.code || "").toLowerCase();
                    const targetCode = (departmentCode || "").toLowerCase();

                    if (targetCode === "aid") {
                        return (
                            uDeptCode === "aid" || 
                            uDeptCode === "aids" || 
                            uDeptName.includes("data science") || 
                            uDeptName === "aid" || 
                            uDeptName === "aids" ||
                            uDeptName.includes("artificial intelligence & data science") ||
                            uDeptName.includes("artificial intelligence and data science")
                        );
                    }

                    if (targetCode === "aiml") {
                        return (
                            uDeptCode === "aiml" || 
                            uDeptName.includes("machine learning") || 
                            uDeptName === "aiml" ||
                            uDeptName.includes("artificial intelligence & machine learning") ||
                            uDeptName.includes("artificial intelligence and machine learning")
                        );
                    }

                    if (targetCode === "cs") {
                        return (
                            uDeptCode === "cs" || 
                            uDeptCode === "cse" || 
                            uDeptName.includes("computer science") || 
                            uDeptName === "cs" || 
                            uDeptName === "cse"
                        );
                    }

                    // Fallback exact matching
                    return uDeptCode === targetCode || uDeptName.includes(targetCode);
                });

                setFacultyList(filtered);
            } catch (err) {
                console.error("Failed to load department faculty:", err);
                setError(err.message || "Failed to load faculty directory ❌");
            } finally {
                setLoading(false);
            }
        };

        loadDepartmentFaculty();
    }, [departmentCode]);

    // Client-side search filtering
    const visibleFaculty = facultyList.filter(f => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            (f.name || "").toLowerCase().includes(q) ||
            (f.employeeId || "").toLowerCase().includes(q) ||
            (f.email || "").toLowerCase().includes(q) ||
            (f.designation || "").toLowerCase().includes(q) ||
            (f.phone || "").toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6 text-xs animate-fade-in">
            {/* Header with Navigation and Total Faculty Count */}
            <div className="bg-[#101622] border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:translate-y-0.5"
                    >
                        <span>← Back to Dashboard</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-base font-bold text-slate-100 tracking-tight">
                                {departmentCode} Department
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {departmentCode}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{fullTitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-center shadow-inner">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Faculty</span>
                        <span className="text-xl font-extrabold text-indigo-400">{facultyList.length}</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl">
                    {error}
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="bg-[#101622] border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3 shadow-md">
                <div className="relative w-full max-w-md">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Search faculty by name, employee ID, designation, email..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-[11px] font-semibold transition-all"
                    >
                        Clear Search
                    </button>
                )}
            </div>

            {/* Department Faculty Table */}
            <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Faculty List &bull; {departmentCode}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                        Showing {visibleFaculty.length} of {facultyList.length} faculty
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Faculty Name (Click to View Profile)</th>
                                <th className="py-3 px-4">Designation</th>
                                <th className="py-3 px-4">Mobile No.</th>
                                <th className="py-3 px-4">Email Address</th>
                                <th className="py-3 px-4">Qualification</th>
                                <th className="py-3 px-4">Students</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                                        Loading {departmentCode} faculty directory...
                                    </td>
                                </tr>
                            ) : visibleFaculty.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                                        {facultyList.length === 0 
                                            ? `No faculty members currently registered under ${departmentCode} department.`
                                            : `No faculty members found matching "${search}".`}
                                    </td>
                                </tr>
                            ) : (
                                visibleFaculty.map(f => (
                                    <tr 
                                        key={f._id} 
                                        className="hover:bg-slate-900/60 transition-colors group"
                                    >
                                        <td className="py-3.5 px-4 font-mono text-slate-400 font-medium">
                                            {f.employeeId || "—"}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <button
                                                onClick={() => onSelectFaculty(f)}
                                                className="font-bold text-slate-100 hover:text-indigo-400 flex items-center gap-2 group-hover:underline text-left transition-colors cursor-pointer"
                                                title={`Click to open full profile of ${f.name}`}
                                            >
                                                <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] shrink-0 font-black">
                                                    {f.name ? f.name.charAt(0).toUpperCase() : "👤"}
                                                </span>
                                                <span className="text-indigo-300 group-hover:text-indigo-400 font-bold">{f.name}</span>
                                                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                            </button>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                                            {f.designation || "Assistant Professor"}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-indigo-400 font-semibold">
                                            {f.phone || "—"}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-400">
                                            {f.email}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-400">
                                            {f.qualification || "Postgraduate / PhD"}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="font-bold text-slate-200">
                                                {f.studentStats?.total || 0}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                f.status === "ACTIVE"
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                            }`}>
                                                {f.status || "ACTIVE"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DepartmentFacultyView;
