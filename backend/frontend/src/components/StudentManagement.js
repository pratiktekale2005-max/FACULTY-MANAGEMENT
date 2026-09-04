import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function StudentManagement({ currentUser, onRefresh }) {
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    // Form inputs
    const [showCsvImporter, setShowCsvImporter] = useState(false);
    const [csvInput, setCsvInput] = useState("");
    
    // New Student manually inputs
    const [newStudent, setNewStudent] = useState({ rollNo: "", name: "", mobileNumber: "", prnNumber: "" });

    // Selected Student editor
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAttr, setStudentAttr] = useState({
        mobileNumber: "",
        prnNumber: "",
        skills: "",
        customKey: "",
        customValue: "",
        customFields: {}
    });

    const loadSubjects = async () => {
        try {
            const data = await api.get("/subjects");
            setSubjects(data.subjects || []);
            if (data.subjects.length > 0 && !selectedSubjectId) {
                setSelectedSubjectId(data.subjects[0]._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadSubjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    useEffect(() => {
        if (selectedSubjectId && subjects.length > 0) {
            const matched = subjects.find(s => s._id === selectedSubjectId);
            if (matched) {
                setStudents(matched.students || []);
            }
        } else {
            setStudents([]);
        }
    }, [selectedSubjectId, subjects]);

    // Handle CSV Import
    const handleCsvImport = async (e) => {
        e.preventDefault();
        if (!csvInput.trim()) return;

        setLoading(true);
        // Parse CSV lines (RollNo, Name, MobileNumber, PRNNumber)
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
                
                // Validate 10 digits
                if (!/^\d{10}$/.test(mob)) {
                    alert(`Invalid mobile number format: ${mob} for ${name} (must be 10 digits numeric) ❌`);
                    setLoading(false);
                    return;
                }

                if (roll && name && mob && prn) {
                    list.push({ rollNo: roll, name, mobileNumber: mob, prnNumber: prn });
                }
            } else {
                formatError = true;
            }
        }

        if (formatError && list.length === 0) {
            alert("CSV format error. Please check that each line follows the format: RollNo,Name,MobileNumber,PRNNumber ❌");
            setLoading(false);
            return;
        }

        try {
            await api.put(`/subjects/${selectedSubjectId}/import-students`, { studentsList: list });
            alert(`Successfully processed and enrolled ${list.length} student records! ✅`);
            setCsvInput("");
            setShowCsvImporter(false);
            loadSubjects();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Error processing import.");
        } finally {
            setLoading(false);
        }
    };

    // Add student manually
    const handleAddStudentManually = async (e) => {
        e.preventDefault();
        if (!newStudent.rollNo || !newStudent.name || !newStudent.mobileNumber || !newStudent.prnNumber) {
            alert("All fields are required! ❌");
            return;
        }

        // Validate mobile number
        if (!/^\d{10}$/.test(newStudent.mobileNumber)) {
            alert("Mobile number must be exactly 10 digits and numeric! ❌");
            return;
        }

        setLoading(true);
        try {
            await api.put(`/subjects/${selectedSubjectId}/import-students`, { studentsList: [newStudent] });
            alert("Student enrolled successfully! ✅");
            setNewStudent({ rollNo: "", name: "", mobileNumber: "", prnNumber: "" });
            loadSubjects();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert(err.message || "Failed to enroll student.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Edit attributes
    const handleOpenEditModal = (std) => {
        setSelectedStudent(std);
        setStudentAttr({
            mobileNumber: std.mobileNumber || "",
            prnNumber: std.prnNumber || "",
            skills: std.skills || "",
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

        try {
            await api.put(`/subjects/${selectedSubjectId}/students/${selectedStudent._id}`, {
                mobileNumber: studentAttr.mobileNumber,
                prnNumber: studentAttr.prnNumber,
                skills: studentAttr.skills,
                customFields: studentAttr.customFields
            });
            alert("Student parameters updated successfully! ✅");
            setSelectedStudent(null);
            loadSubjects();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to save attributes.");
        }
    };

    // Export CSV
    const exportCSV = () => {
        if (students.length === 0) return;
        let content = "PRN Number,Roll No,Name,Mobile Number,Skills\n";
        students.forEach(s => {
            content += `"${s.prnNumber || ""}","${s.rollNo}","${s.name}","${s.mobileNumber || ""}","${s.skills || ""}"\n`;
        });

        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Subject_Students_Roster.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredStudents = students.filter(s => {
        const query = searchQuery.toLowerCase();
        return (
            s.name.toLowerCase().includes(query) || 
            s.rollNo.toLowerCase().includes(query) ||
            (s.prnNumber && s.prnNumber.toLowerCase().includes(query))
        );
    });

    return (
        <div className="bg-[#101622] border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Student Roster Management</h2>
                    <p className="text-xs text-slate-400 mt-1">Configure student enrollments, attributes, and custom fields mapping</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        className="text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none"
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                    >
                        {subjects.map(s => (
                            <option key={s._id} value={s._id}>{s.subjectName} ({s.subjectCode})</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowCsvImporter(!showCsvImporter)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
                    >
                        Import CSV
                    </button>

                    <button
                        onClick={exportCSV}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* CSV Importer Drawer */}
            {showCsvImporter && (
                <div className="bg-slate-955 border border-slate-800 p-5 rounded-xl space-y-4">
                    <div>
                        <strong className="text-xs text-slate-200">Import CSV Roster</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5">Enter students list in comma-separated format. Template: <code className="text-indigo-400">RollNumber,StudentName,MobileNumber,PRNNumber</code> (One per line)</p>
                    </div>
                    <form onSubmit={handleCsvImport} className="space-y-3">
                        <textarea
                            rows={4}
                            className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                            placeholder="e.g.&#10;CS202601,Pratik Tekale,9876543210,PRN202610101&#10;CS202602,John Doe,9999988888,PRN202610102"
                            value={csvInput}
                            onChange={(e) => setCsvInput(e.target.value)}
                            required
                        />
                        <div className="flex justify-end gap-3 text-xs">
                            <button type="button" onClick={() => setShowCsvImporter(false)} className="text-slate-400 hover:text-slate-205 px-3">Cancel</button>
                            <button type="submit" className="px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all font-semibold" disabled={loading}>
                                {loading ? "Importing..." : "Process Import"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                    {/* Search bar */}
                    <input
                        type="text"
                        className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                        placeholder="Search student by name, roll, or PRN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Table roster */}
                    <div className="overflow-x-auto border border-slate-850 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-850 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                                    <th className="py-2.5 px-3">PRN Number</th>
                                    <th className="py-2.5 px-3">Roll No</th>
                                    <th className="py-2.5 px-3">Student Name</th>
                                    <th className="py-2.5 px-3">Mobile Number</th>
                                    <th className="py-2.5 px-3">Skills</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/40 text-slate-300">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-500 italic">No students enrolled in this course roster.</td>
                                    </tr>
                                ) : (
                                    filteredStudents.map(s => (
                                        <tr key={s._id} className="hover:bg-slate-800/10 transition-colors">
                                            <td className="py-2.5 px-3 font-mono text-indigo-400 font-bold">{s.prnNumber}</td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-350">{s.rollNo}</td>
                                            <td className="py-2.5 px-3 font-medium text-slate-200">{s.name}</td>
                                            <td className="py-2.5 px-3 text-slate-400">{s.mobileNumber || "-"}</td>
                                            <td className="py-2.5 px-3 text-slate-400">{s.skills || "-"}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                <button
                                                    onClick={() => handleOpenEditModal(s)}
                                                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                                >
                                                    Configure
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add manually side panel (right) */}
                <div className="bg-slate-950/20 border border-slate-850 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-slate-200">Enlist Student Manually</h3>
                    <form onSubmit={handleAddStudentManually} className="space-y-3.5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">PRN Number *</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="e.g. PRN202610101"
                                value={newStudent.prnNumber}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, prnNumber: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">Student Roll Number *</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="e.g. CS202634"
                                value={newStudent.rollNo}
                                onChange={(prev) => setNewStudent(prev => ({ ...prev, rollNo: prev.target.value }))}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">Student Full Name *</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="e.g. Pratik Tekale"
                                value={newStudent.name}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">Mobile Number *</label>
                            <input
                                type="text"
                                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none"
                                placeholder="e.g. 9876543210"
                                value={newStudent.mobileNumber}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, mobileNumber: e.target.value }))}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
                        >
                            Enroll Student
                        </button>
                    </form>
                </div>
            </div>

            {/* Custom attributes editing modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#101622] border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-150">
                        <div>
                            <strong className="text-xs text-slate-200">Configure Roster Attributes</strong>
                            <p className="text-[10px] text-slate-400 mt-0.5">Customize properties mapping for {selectedStudent.name}</p>
                        </div>

                        <form onSubmit={handleSaveAttributes} className="space-y-4 text-xs">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">PRN Number *</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2"
                                    value={studentAttr.prnNumber}
                                    onChange={(e) => setStudentAttr(prev => ({ ...prev, prnNumber: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Mobile Number *</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2"
                                    value={studentAttr.mobileNumber}
                                    onChange={(e) => setStudentAttr(prev => ({ ...prev, mobileNumber: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Skills</label>
                                <input
                                    type="text"
                                    className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2"
                                    value={studentAttr.skills}
                                    onChange={(e) => setStudentAttr(prev => ({ ...prev, skills: e.target.value }))}
                                    placeholder="e.g. React, Node.js"
                                />
                            </div>

                            {/* Custom Key-Value Attributes Section */}
                            <div className="border-t border-slate-800/60 pt-3 space-y-2">
                                <label className="text-[9px] font-bold text-slate-500 uppercase block">Add Custom Attribute</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="w-1/2 text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
                                        placeholder="Key (e.g. Cert)"
                                        value={studentAttr.customKey}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, customKey: e.target.value }))}
                                    />
                                    <input
                                        type="text"
                                        className="w-1/2 text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
                                        placeholder="Value (e.g. AWS)"
                                        value={studentAttr.customValue}
                                        onChange={(e) => setStudentAttr(prev => ({ ...prev, customValue: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomField}
                                        className="px-3.5 py-1.5 text-xs text-slate-200 bg-slate-800 border border-slate-700/60 rounded-lg"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/40">
                                    {Object.keys(studentAttr.customFields).length === 0 ? (
                                        <span className="text-[9px] text-slate-500 italic">No custom fields added yet.</span>
                                    ) : (
                                        Object.keys(studentAttr.customFields).map(key => (
                                            <span key={key} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-semibold">
                                                {key}: {studentAttr.customFields[key]}
                                                <button
                                                    type="button"
                                                    className="text-rose-450 font-bold ml-1"
                                                    onClick={() => {
                                                        const updated = { ...studentAttr.customFields };
                                                        delete updated[key];
                                                        setStudentAttr(prev => ({ ...prev, customFields: updated }));
                                                    }}
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                                <button type="button" onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-255">Cancel</button>
                                <button type="submit" className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentManagement;
