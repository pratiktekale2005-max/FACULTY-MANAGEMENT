import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function StudentManagement({ currentUser, onRefresh }) {
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("all");
    const [allDepartmentStudents, setAllDepartmentStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    // Form inputs
    const [showCsvImporter, setShowCsvImporter] = useState(false);
    const [csvInput, setCsvInput] = useState("");
    
    // New Student manual inputs
    const [newStudent, setNewStudent] = useState({ 
        rollNo: "", 
        name: "", 
        email: "",
        mobileNumber: "", 
        prnNumber: "",
        address: "",
        gender: "Male",
        year: "SE",
        division: "A",
        subjectId: ""
    });

    // Selected Student editor
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAttr, setStudentAttr] = useState({
        mobileNumber: "",
        prnNumber: "",
        skills: "",
        gender: "Male",
        year: "SE",
        division: "A",
        customKey: "",
        customValue: "",
        customFields: {}
    });

    // Load department students (Faculty + HOD combined)
    const loadDepartmentData = async () => {
        setLoading(true);
        try {
            const data = await api.get("/subjects/department-students");
            if (data && data.students) {
                setAllDepartmentStudents(data.students);
            }
            if (data && data.subjects) {
                setSubjects(data.subjects);
                if (data.subjects.length > 0 && !newStudent.subjectId) {
                    setNewStudent(prev => ({ ...prev, subjectId: data.subjects[0]._id }));
                }
            }
        } catch (err) {
            console.error("Failed to load department student details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDepartmentData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Handle CSV Import
    const handleCsvImport = async (e) => {
        e.preventDefault();
        if (!csvInput.trim()) return;

        const targetSubject = selectedSubjectId !== "all" 
            ? selectedSubjectId 
            : (subjects[0]?._id || "");

        if (!targetSubject) {
            alert("Please create or select an academic subject before importing students ❌");
            return;
        }

        setLoading(true);
        // Parse CSV lines (RollNo, Name, MobileNumber, PRNNumber, Gender, Division, Year)
        const lines = csvInput.split("\n");
        const list = [];
        let formatError = false;

        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(",");
            if (parts.length >= 4) {
                const roll = parts[0].trim();
                const name = parts[1].trim();
                const mob = parts[2].trim();
                const prn = parts[3].trim();
                const gender = parts[4] ? parts[4].trim() : "Male";
                const div = parts[5] ? parts[5].trim() : "A";
                const yr = parts[6] ? parts[6].trim() : "SE";
                
                // Validate 10 digits
                if (!/^\d{10}$/.test(mob)) {
                    alert(`Invalid mobile number format: ${mob} for ${name} (must be 10 digits numeric) ❌`);
                    setLoading(false);
                    return;
                }

                if (roll && name && mob && prn) {
                    list.push({ 
                        rollNo: roll, 
                        name, 
                        mobileNumber: mob, 
                        prnNumber: prn,
                        gender,
                        division: div,
                        year: yr
                    });
                }
            } else {
                formatError = true;
            }
        }

        if (formatError && list.length === 0) {
            alert("CSV format error. Template: RollNumber,StudentName,MobileNumber,PRNNumber,[Gender],[Division],[Year] ❌");
            setLoading(false);
            return;
        }

        try {
            await api.put(`/subjects/${targetSubject}/import-students`, { studentsList: list });
            alert(`Successfully processed and enrolled ${list.length} student records! ✅`);
            setCsvInput("");
            setShowCsvImporter(false);
            loadDepartmentData();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || err.message || "Error processing import ❌");
        } finally {
            setLoading(false);
        }
    };

    // Add student manually
    const handleAddStudentManually = async (e) => {
        e.preventDefault();
        const targetSubject = newStudent.subjectId || (selectedSubjectId !== "all" ? selectedSubjectId : (subjects[0]?._id || ""));

        if (!targetSubject) {
            alert("Please select or assign a course subject to enroll this student into! ❌");
            return;
        }

        if (!newStudent.rollNo || !newStudent.name || !newStudent.mobileNumber || !newStudent.prnNumber) {
            alert("All required fields must be completed! ❌");
            return;
        }

        // Validate mobile number
        if (!/^\d{10}$/.test(newStudent.mobileNumber)) {
            alert("Mobile number must be exactly 10 digits and numeric! ❌");
            return;
        }

        setLoading(true);
        try {
            await api.put(`/subjects/${targetSubject}/import-students`, { 
                studentsList: [{
                    rollNo: newStudent.rollNo,
                    name: newStudent.name,
                    email: newStudent.email || `${newStudent.rollNo.toLowerCase()}@dypcoei.edu.in`,
                    mobileNumber: newStudent.mobileNumber,
                    prnNumber: newStudent.prnNumber,
                    address: newStudent.address || "Pune, Maharashtra",
                    gender: newStudent.gender,
                    year: newStudent.year,
                    division: newStudent.division
                }] 
            });

            alert(`Student "${newStudent.name}" enrolled successfully! ✅`);
            setNewStudent(prev => ({ 
                ...prev, 
                rollNo: "", 
                name: "", 
                email: "",
                mobileNumber: "", 
                prnNumber: "",
                address: ""
            }));
            loadDepartmentData();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || err.message || "Failed to enroll student ❌");
        } finally {
            setLoading(false);
        }
    };

    // Edit attributes
    // eslint-disable-next-line no-unused-vars
    const handleOpenEditModal = (std) => {
        setSelectedStudent(std);
        setStudentAttr({
            mobileNumber: std.mobileNumber || "",
            prnNumber: std.prnNumber || "",
            skills: std.skills || "",
            gender: std.gender || "Male",
            year: std.year || "SE",
            division: std.division || "A",
            customKey: "",
            customValue: "",
            customFields: std.customFields ? (std.customFields instanceof Map ? Object.fromEntries(std.customFields) : std.customFields) : {}
        });
    };

    const handleAddCustomField = () => {
        if (!studentAttr.customKey.trim() || !studentAttr.customValue.trim()) return;
        setStudentAttr(prev => ({
            ...prev,
            customFields: {
                ...prev.customFields,
                [prev.customKey.trim()]: prev.customValue.trim()
            },
            customKey: "",
            customValue: ""
        }));
    };

    const handleSaveAttributes = async (e) => {
        e.preventDefault();
        if (!/^\d{10}$/.test(studentAttr.mobileNumber)) {
            alert("Mobile number must be exactly 10 digits and numeric! ❌");
            return;
        }
        if (!studentAttr.prnNumber.trim()) {
            alert("PRN Number is required! ❌");
            return;
        }

        const targetSubject = selectedStudent.subjectId || (subjects[0]?._id || "");

        try {
            await api.put(`/subjects/${targetSubject}/students/${selectedStudent._id}`, {
                mobileNumber: studentAttr.mobileNumber,
                prnNumber: studentAttr.prnNumber,
                skills: studentAttr.skills,
                gender: studentAttr.gender,
                year: studentAttr.year,
                division: studentAttr.division,
                customFields: studentAttr.customFields
            });
            alert("Student details updated successfully! ✅");
            setSelectedStudent(null);
            loadDepartmentData();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save student details.");
        }
    };

    // Export CSV
    const exportCSV = () => {
        if (filteredStudents.length === 0) return;
        let content = "Roll No,PRN No,Name,Email,Phone No,Address,Department,Year of Study,Division,Gender\n";
        filteredStudents.forEach(s => {
            content += `"${s.rollNo || ""}","${s.prnNumber || ""}","${s.name || ""}","${s.email || ""}","${s.mobileNumber || ""}","${(s.address || "").replace(/"/g, '""')}","${s.department || currentUser.department || ""}","${s.year || ""}","${s.division || ""}","${s.gender || "Male"}"\n`;
        });

        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Student_Details_${currentUser.department || "Dept"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter students by selected subject and search query
    const filteredStudents = allDepartmentStudents.filter(s => {
        // Subject filter
        if (selectedSubjectId !== "all") {
            const matchesSubject = s.subjectId === selectedSubjectId || 
                (s.allSubjects && s.allSubjects.some(sub => sub.id === selectedSubjectId));
            if (!matchesSubject) return false;
        }

        // Search filter
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        return (
            (s.name && s.name.toLowerCase().includes(query)) || 
            (s.rollNo && s.rollNo.toLowerCase().includes(query)) ||
            (s.prnNumber && s.prnNumber.toLowerCase().includes(query)) ||
            (s.division && s.division.toLowerCase().includes(query)) ||
            (s.department && s.department.toLowerCase().includes(query)) ||
            (s.addedBy && s.addedBy.toLowerCase().includes(query))
        );
    });

    return (
        <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>👥 Student Details</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Unified directory of all student records added by Faculty members and HOD &bull; Department of {currentUser.department || "Academic Department"}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Subject Filter Dropdown */}
                    <select
                        className="text-xs text-slate-200 bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                    >
                        <option value="all">All Department Students (Faculty + HOD)</option>
                        {subjects.map(s => (
                            <option key={s._id} value={s._id}>
                                {s.subjectName} ({s.subjectCode}) &bull; {s.ownerName}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowCsvImporter(!showCsvImporter)}
                        className="px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
                    >
                        📥 Import CSV
                    </button>

                    <button
                        onClick={exportCSV}
                        className="px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
                    >
                        📤 Export CSV
                    </button>

                    <button
                        onClick={loadDepartmentData}
                        className="p-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition-all"
                        title="Refresh Student Details"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* CSV Importer Drawer */}
            {showCsvImporter && (
                <div className="bg-slate-950/80 border border-indigo-500/30 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <strong className="text-xs text-slate-200">Import Student Records (CSV)</strong>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Format: <code className="text-indigo-400 font-mono">RollNo,StudentName,MobileNumber,PRNNumber,[Gender],[Division],[Year]</code> (One student per line)
                            </p>
                        </div>
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold">
                            Enrolls into {subjects.find(s => s._id === selectedSubjectId)?.subjectName || subjects[0]?.subjectName || "Subject"}
                        </span>
                    </div>
                    <form onSubmit={handleCsvImport} className="space-y-3">
                        <textarea
                            rows={4}
                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                            placeholder="e.g.&#10;CS202601,Pratik Tekale,9876543210,PRN202610101,Male,A,SE&#10;CS202602,Sneha Sharma,9999988888,PRN202610102,Female,A,SE"
                            value={csvInput}
                            onChange={(e) => setCsvInput(e.target.value)}
                            required
                        />
                        <div className="flex justify-end gap-3 text-xs">
                            <button type="button" onClick={() => setShowCsvImporter(false)} className="text-slate-400 hover:text-slate-200 px-3">Cancel</button>
                            <button type="submit" className="px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all font-semibold" disabled={loading}>
                                {loading ? "Importing..." : "Process Import"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Main Content Grid: Combined Table + Add Manually Side Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                    {/* Search & Stats Bar */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500"
                                placeholder="Search by student name, roll no, PRN, division, or added by..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
                        </div>
                        <span className="text-[11px] text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-850 shrink-0 font-medium">
                            Showing <strong className="text-slate-200">{filteredStudents.length}</strong> Students
                        </span>
                    </div>

                    {/* Table of Students (Exact 10 columns per Requirement 6: Roll No. | PRN No. | Name | Email | Phone No. | Address | Department | Year of Study | Division | Gender) */}
                    <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-950/20 shadow-inner">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/80">
                                    <th className="py-3 px-3 whitespace-nowrap">Roll No.</th>
                                    <th className="py-3 px-3 whitespace-nowrap">PRN No.</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Name</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Email</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Phone No.</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Address</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Department</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Year of Study</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Division</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Gender</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/50 text-slate-300">
                                {loading && filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-10 text-center text-slate-400 italic">
                                            Loading student details... ⏳
                                        </td>
                                    </tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-10 text-center text-slate-500 italic space-y-1">
                                            <p className="text-sm font-semibold text-slate-400">No student records found</p>
                                            <p className="text-[11px] text-slate-600">Students added by Faculty or HOD in this department will appear here automatically.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map(s => {
                                        return (
                                            <tr key={s._id || s.prnNumber} className="hover:bg-slate-900/40 transition-colors">
                                                <td className="py-3 px-3 font-semibold text-indigo-300 font-mono whitespace-nowrap">
                                                    {s.rollNo}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                                                    {s.prnNumber || "-"}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-slate-100 whitespace-nowrap">
                                                    {s.name}
                                                </td>
                                                <td className="py-3 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                                                    {s.email || "-"}
                                                </td>
                                                <td className="py-3 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                                                    {s.mobileNumber || "-"}
                                                </td>
                                                <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={s.address}>
                                                    {s.address || "-"}
                                                </td>
                                                <td className="py-3 px-3 text-slate-300 text-[11px] whitespace-nowrap">
                                                    {s.department || currentUser.department || "Academic Dept"}
                                                </td>
                                                <td className="py-3 px-3 font-medium text-slate-300 text-[11px] whitespace-nowrap">
                                                    {s.year || "SE"}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-slate-200 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">
                                                        {s.division || "-"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                                                    {s.gender || "Male"}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add Student Manually Side Form */}
                <div className="bg-slate-950/30 border border-slate-850 p-5 rounded-2xl space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Enlist Student Manually</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Adds student record stamped with your authenticated login credentials</p>
                    </div>

                    <form onSubmit={handleAddStudentManually} className="space-y-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Target Course Subject *</label>
                            <select
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
                                value={newStudent.subjectId}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, subjectId: e.target.value }))}
                                required
                            >
                                {subjects.map(s => (
                                    <option key={s._id} value={s._id}>{s.subjectName} ({s.subjectCode})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Student Full Name *</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                placeholder="e.g. Ramesh Kulkarni"
                                value={newStudent.name}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Roll No. *</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. CS202615"
                                    value={newStudent.rollNo}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, rollNo: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">PRN Number *</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                                    placeholder="PRN2026101"
                                    value={newStudent.prnNumber}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, prnNumber: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Gender</label>
                                <select
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 focus:outline-none"
                                    value={newStudent.gender}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, gender: e.target.value }))}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Year</label>
                                <select
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 focus:outline-none"
                                    value={newStudent.year}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, year: e.target.value }))}
                                >
                                    <option value="FE">FE (1st)</option>
                                    <option value="SE">SE (2nd)</option>
                                    <option value="TE">TE (3rd)</option>
                                    <option value="BE">BE (4th)</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Division</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 focus:outline-none text-center font-bold"
                                    placeholder="A"
                                    value={newStudent.division}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, division: e.target.value.toUpperCase() }))}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Mobile Number (10 Digits) *</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                placeholder="9876543210"
                                value={newStudent.mobileNumber}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, mobileNumber: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Email Address</label>
                            <input
                                type="email"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                                placeholder="student@dypcoei.edu.in"
                                value={newStudent.email}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Residential Address</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                placeholder="e.g. Nigdi, Pune"
                                value={newStudent.address}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, address: e.target.value }))}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/30 active:translate-y-0.5 disabled:opacity-50"
                        >
                            {loading ? "Enrolling..." : "+ Enlist Student Record"}
                        </button>
                    </form>
                </div>
            </div>

            {/* EDIT STUDENT CONFIGURATION MODAL */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#121826] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-100">{selectedStudent.name}</h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Roll No: {selectedStudent.rollNo} &bull; {selectedStudent.department || currentUser.department}
                                </p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSaveAttributes} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">PRN Number</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                                        value={studentAttr.prnNumber}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, prnNumber: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                        value={studentAttr.mobileNumber}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, mobileNumber: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Gender</label>
                                    <select
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 focus:outline-none"
                                        value={studentAttr.gender}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, gender: e.target.value }))}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Year</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 focus:outline-none"
                                        value={studentAttr.year}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, year: e.target.value }))}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Division</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 focus:outline-none uppercase text-center font-bold"
                                        value={studentAttr.division}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, division: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Skills &amp; Technical Competencies</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Python, Machine Learning, React"
                                    value={studentAttr.skills}
                                    onChange={(e) => setStudentAttr(prev => ({ ...prev, skills: e.target.value }))}
                                />
                            </div>

                            {/* Custom Fields */}
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block">Custom Attributes</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Attribute Name"
                                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                                        value={studentAttr.customKey}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, customKey: e.target.value }))}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Value"
                                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                                        value={studentAttr.customValue}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, customValue: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomField}
                                        className="px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold"
                                    >
                                        +
                                    </button>
                                </div>
                                {Object.keys(studentAttr.customFields).length > 0 && (
                                    <div className="space-y-1 pt-1">
                                        {Object.entries(studentAttr.customFields).map(([k, v]) => (
                                            <div key={k} className="flex justify-between items-center text-[11px] bg-slate-950/60 px-2 py-1 rounded">
                                                <span className="text-slate-400 font-semibold">{k}:</span>
                                                <span className="text-slate-200">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStudent(null)}
                                    className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md"
                                >
                                    Save Changes ✅
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentManagement;
