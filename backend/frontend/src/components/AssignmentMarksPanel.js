import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../services/api";

function AssignmentMarksPanel({ currentUser }) {
    const [classes, setClasses] = useState([]);
    const [selectedClassKey, setSelectedClassKey] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedDivision, setSelectedDivision] = useState("");

    const [maxMarks, setMaxMarks] = useState(10);
    const [studentsMarks, setStudentsMarks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterPendingOnly, setFilterPendingOnly] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // CSV Import State
    const fileInputRef = useRef(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importRows, setImportRows] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [hasOverwrites, setHasOverwrites] = useState(false);
    const [confirmOverwrite, setConfirmOverwrite] = useState(false);
    const [importing, setImporting] = useState(false);

    // Load faculty assigned classes & subjects
    const loadClassOptions = async () => {
        try {
            const res = await api.get("/classes/my-classes");
            const assigned = res.classes || [];
            setClasses(assigned);

            if (assigned.length > 0) {
                const first = assigned[0];
                const key = `${first.department}_${first.year}_${first.division}`;
                setSelectedClassKey(key);
                setSelectedDivision(first.division);
                const subjs = first.assignedSubjects || first.subjects || [];
                if (subjs.length > 0) {
                    setSelectedSubjectId(subjs[0]._id || subjs[0].subjectId);
                }
            }
        } catch (err) {
            console.error("Failed to load assigned classes:", err);
            setErrorMsg("Failed to load your assigned classes ❌");
        }
    };

    useEffect(() => {
        loadClassOptions();
    }, []);

    // When selected class changes, update division and subjects dropdown
    const currentClassObj = useMemo(() => {
        return classes.find(c => `${c.department}_${c.year}_${c.division}` === selectedClassKey) || null;
    }, [classes, selectedClassKey]);

    useEffect(() => {
        if (currentClassObj) {
            setSelectedDivision(currentClassObj.division);
            const subjs = currentClassObj.assignedSubjects || currentClassObj.subjects || [];
            if (subjs.length > 0) {
                const exists = subjs.some(s => (s._id || s.subjectId) === selectedSubjectId);
                if (!exists) {
                    setSelectedSubjectId(subjs[0]._id || subjs[0].subjectId);
                }
            } else {
                setSelectedSubjectId("");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentClassObj]);

    // Fetch marks when subject or division changes
    const fetchMarks = async () => {
        if (!selectedSubjectId || !selectedDivision) return;
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const data = await api.get(`/assignment-marks?subjectId=${selectedSubjectId}&division=${encodeURIComponent(selectedDivision)}`);
            setMaxMarks(10); // Standard institutional maximum: 10 marks per assignment

            const formatted = (data.students || []).map(s => {
                const a1 = s.assignment1 !== null && s.assignment1 !== undefined ? s.assignment1 : "";
                const a1Date = s.assignment1Date || "";

                const a2 = s.assignment2 !== null && s.assignment2 !== undefined ? s.assignment2 : "";
                const a2Date = s.assignment2Date || "";

                const a3 = s.assignment3 !== null && s.assignment3 !== undefined ? s.assignment3 : "";
                const a3Date = s.assignment3Date || "";

                const a4 = s.assignment4 !== null && s.assignment4 !== undefined ? s.assignment4 : "";
                const a4Date = s.assignment4Date || "";

                const a5 = s.assignment5 !== null && s.assignment5 !== undefined ? s.assignment5 : "";
                const a5Date = s.assignment5Date || "";

                const entered = [a1, a2, a3, a4, a5].filter(v => v !== "" && v !== null && v !== undefined);
                const isFullyGraded = entered.length === 5;
                const total = isFullyGraded ? entered.reduce((sum, v) => sum + (Number(v) || 0), 0) : null;

                return {
                    studentId: s.studentId,
                    rollNo: s.rollNo,
                    studentName: s.studentName,
                    prnNumber: s.prnNumber || "",
                    assignment1: a1,
                    assignment1Date: a1Date,
                    assignment2: a2,
                    assignment2Date: a2Date,
                    assignment3: a3,
                    assignment3Date: a3Date,
                    assignment4: a4,
                    assignment4Date: a4Date,
                    assignment5: a5,
                    assignment5Date: a5Date,
                    total,
                    isFullyGraded,
                    evaluatedCount: entered.length
                };
            });

            setStudentsMarks(formatted);
        } catch (err) {
            console.error("Failed to fetch assignment marks:", err);
            setErrorMsg(err.response?.data?.error || "Failed to load assignment marks ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSubjectId && selectedDivision) {
            fetchMarks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSubjectId, selectedDivision]);

    // Handle mark or evaluation date change
    const handleFieldChange = (studentId, field, val) => {
        setStudentsMarks(prev => prev.map(st => {
            if (st.studentId !== studentId) return st;

            const updated = { ...st, [field]: val };

            const parse = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

            const marksArr = [
                parse(updated.assignment1),
                parse(updated.assignment2),
                parse(updated.assignment3),
                parse(updated.assignment4),
                parse(updated.assignment5)
            ];

            const entered = marksArr.filter(v => v !== null && !isNaN(v));
            updated.evaluatedCount = entered.length;
            updated.isFullyGraded = entered.length === 5;
            updated.total = updated.isFullyGraded ? Math.round(entered.reduce((sum, v) => sum + v, 0) * 10) / 10 : null;
            return updated;
        }));
    };

    // Client-side validation before saving (Strictly 10 marks max)
    const validateMarks = () => {
        const maxM = 10;
        for (const st of studentsMarks) {
            const fields = [
                { name: "Assignment 1", val: st.assignment1 },
                { name: "Assignment 2", val: st.assignment2 },
                { name: "Assignment 3", val: st.assignment3 },
                { name: "Assignment 4", val: st.assignment4 },
                { name: "Assignment 5", val: st.assignment5 }
            ];

            for (const f of fields) {
                if (f.val !== "" && f.val !== null && f.val !== undefined) {
                    const num = Number(f.val);
                    if (isNaN(num)) {
                        return `Invalid mark for ${st.studentName} (${f.name}): Must be a valid number`;
                    }
                    if (num < 0) {
                        return `Invalid mark for ${st.studentName} (${f.name}): Marks cannot be negative (< 0)`;
                    }
                    if (num > maxM) {
                        return `Invalid mark for ${st.studentName} (${f.name}): ${num} exceeds maximum marks allowed (10)`;
                    }
                }
            }
        }
        return null;
    };

    // Save marks & evaluation dates to database
    const handleSave = async () => {
        const validationError = validateMarks();
        if (validationError) {
            setErrorMsg(validationError + " ❌");
            return;
        }

        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const payload = {
                subjectId: selectedSubjectId,
                division: selectedDivision,
                maxMarks: 10,
                marks: studentsMarks.map(st => ({
                    studentId: st.studentId,
                    rollNo: st.rollNo,
                    studentName: st.studentName,
                    assignment1: st.assignment1 === "" ? null : Number(st.assignment1),
                    assignment1Date: st.assignment1Date || "",
                    assignment2: st.assignment2 === "" ? null : Number(st.assignment2),
                    assignment2Date: st.assignment2Date || "",
                    assignment3: st.assignment3 === "" ? null : Number(st.assignment3),
                    assignment3Date: st.assignment3Date || "",
                    assignment4: st.assignment4 === "" ? null : Number(st.assignment4),
                    assignment4Date: st.assignment4Date || "",
                    assignment5: st.assignment5 === "" ? null : Number(st.assignment5),
                    assignment5Date: st.assignment5Date || ""
                }))
            };

            const res = await api.post("/assignment-marks", payload);
            setSuccessMsg(res.message || "Assignment marks & evaluation dates saved successfully! ✅");
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            console.error("Save marks error:", err);
            setErrorMsg(err.response?.data?.error || "Failed to save assignment marks ❌");
        } finally {
            setSaving(false);
        }
    };

    // Export CSV with exact 13 columns matching prompt
    const exportCSV = () => {
        if (studentsMarks.length === 0) return;
        const headers = [
            "Roll No.",
            "Student Name",
            "Assignment 1 /10",
            "Assignment 1 Date",
            "Assignment 2 /10",
            "Assignment 2 Date",
            "Assignment 3 /10",
            "Assignment 3 Date",
            "Assignment 4 /10",
            "Assignment 4 Date",
            "Assignment 5 /10",
            "Assignment 5 Date",
            "Total /50"
        ];

        const rows = studentsMarks.map(s => [
            `"${s.rollNo}"`,
            `"${s.studentName}"`,
            s.assignment1 === "" ? "Not Evaluated" : s.assignment1,
            `"${s.assignment1Date || "Not Evaluated"}"`,
            s.assignment2 === "" ? "Not Evaluated" : s.assignment2,
            `"${s.assignment2Date || "Not Evaluated"}"`,
            s.assignment3 === "" ? "Not Evaluated" : s.assignment3,
            `"${s.assignment3Date || "Not Evaluated"}"`,
            s.assignment4 === "" ? "Not Evaluated" : s.assignment4,
            `"${s.assignment4Date || "Not Evaluated"}"`,
            s.assignment5 === "" ? "Not Evaluated" : s.assignment5,
            `"${s.assignment5Date || "Not Evaluated"}"`,
            s.isFullyGraded ? `${s.total} / 50` : `"Incomplete (${s.evaluatedCount || 0}/5)"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Assignment_Marks_${currentClassObj?.department || "Class"}_${selectedDivision}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download CSV Template with exact specified column format pre-populated with student roll numbers
    const downloadTemplate = () => {
        const headers = [
            "Roll No",
            "Student Name",
            "Assignment 1 Marks",
            "Assignment 1 Date",
            "Assignment 2 Marks",
            "Assignment 2 Date",
            "Assignment 3 Marks",
            "Assignment 3 Date",
            "Assignment 4 Marks",
            "Assignment 4 Date",
            "Assignment 5 Marks",
            "Assignment 5 Date"
        ];

        const rows = studentsMarks.map(s => [
            `"${s.rollNo}"`,
            `"${s.studentName}"`,
            "", "", "", "", "", "", "", "", "", ""
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Assignment_Template_${currentClassObj?.department || "Class"}_Div_${selectedDivision}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle CSV File Upload & Pre-Validation
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".csv")) {
            setErrorMsg("Please upload a valid .csv file ❌");
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

                if (lines.length < 2) {
                    setErrorMsg("The CSV file is empty or missing data rows ❌");
                    return;
                }

                // CSV line parser handling quoted text
                const parseLine = (line) => {
                    const res = [];
                    let cur = "";
                    let inQ = false;
                    for (let i = 0; i < line.length; i++) {
                        const c = line[i];
                        if (c === '"') {
                            inQ = !inQ;
                        } else if (c === ',' && !inQ) {
                            res.push(cur.trim());
                            cur = "";
                        } else {
                            cur += c;
                        }
                    }
                    res.push(cur.trim());
                    return res.map(v => v.replace(/^"|"$/g, "").trim());
                };

                const header = parseLine(lines[0]).map(h => h.toLowerCase());

                const rollIdx = header.findIndex(h => h.includes("roll")) !== -1 ? header.findIndex(h => h.includes("roll")) : 0;
                const nameIdx = header.findIndex(h => h.includes("name")) !== -1 ? header.findIndex(h => h.includes("name")) : 1;

                const findMarkIdx = (num) => {
                    const idx = header.findIndex(h => (h.includes(`assignment ${num}`) || h.includes(`assgn ${num}`) || h === `a${num}`) && h.includes("mark"));
                    return idx !== -1 ? idx : (num - 1) * 2 + 2;
                };
                const findDateIdx = (num) => {
                    const idx = header.findIndex(h => (h.includes(`assignment ${num}`) || h.includes(`assgn ${num}`) || h === `a${num}`) && h.includes("date"));
                    return idx !== -1 ? idx : (num - 1) * 2 + 3;
                };

                const studentByRoll = new Map();
                studentsMarks.forEach(s => {
                    if (s.rollNo) studentByRoll.set(s.rollNo.trim().toUpperCase(), s);
                });

                const maxM = 10;
                const parsed = [];
                const errors = [];
                let foundOverwrites = false;

                for (let i = 1; i < lines.length; i++) {
                    const cols = parseLine(lines[i]);
                    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

                    const rowNum = i + 1;
                    const roll = (cols[rollIdx] || "").trim().toUpperCase();
                    const name = (cols[nameIdx] || "").trim();

                    if (!roll) {
                        errors.push(`Row ${rowNum}: Roll Number is missing.`);
                        continue;
                    }

                    const matched = studentByRoll.get(roll);
                    if (!matched) {
                        errors.push(`Row ${rowNum}: Roll No "${roll}" (${name || "Unknown"}) is not enrolled in this class division.`);
                        continue;
                    }

                    // Check existing marks
                    const hasExisting = [matched.assignment1, matched.assignment2, matched.assignment3, matched.assignment4, matched.assignment5]
                        .some(v => v !== "" && v !== null && v !== undefined);
                    if (hasExisting) foundOverwrites = true;

                    let rowErr = null;
                    const rowObj = {
                        rowNum,
                        studentId: matched.studentId,
                        rollNo: matched.rollNo,
                        studentName: matched.studentName,
                        hasExistingMarks: hasExisting,
                        nameMismatch: name && matched.studentName.toLowerCase() !== name.toLowerCase() ? name : null
                    };

                    for (let a = 1; a <= 5; a++) {
                        const mVal = cols[findMarkIdx(a)] || "";
                        const dVal = cols[findDateIdx(a)] || "";

                        if (mVal !== "" && mVal !== "Not Evaluated") {
                            const num = Number(mVal);
                            if (isNaN(num)) {
                                rowErr = `Row ${rowNum} (${roll}): Assignment ${a} mark "${mVal}" is not a valid number.`;
                                break;
                            }
                            if (num < 0 || num > maxM) {
                                rowErr = `Row ${rowNum} (${roll}): Assignment ${a} mark (${num}) must be between 0 and ${maxM}.`;
                                break;
                            }
                            rowObj[`assignment${a}`] = Math.round(num);
                        } else {
                            rowObj[`assignment${a}`] = "";
                        }

                        if (dVal !== "" && dVal !== "Not Evaluated") {
                            const d = new Date(dVal);
                            if (isNaN(d.getTime())) {
                                rowErr = `Row ${rowNum} (${roll}): Assignment ${a} date "${dVal}" is invalid.`;
                                break;
                            }
                            rowObj[`assignment${a}Date`] = dVal.split("T")[0];
                        } else {
                            rowObj[`assignment${a}Date`] = "";
                        }
                    }

                    if (rowErr) {
                        errors.push(rowErr);
                        continue;
                    }

                    parsed.push(rowObj);
                }

                setImportRows(parsed);
                setImportErrors(errors);
                setHasOverwrites(foundOverwrites);
                setConfirmOverwrite(false);
                setShowImportModal(true);
            } catch (readErr) {
                console.error("CSV parse error:", readErr);
                setErrorMsg("Failed to read or parse the CSV file ❌");
            } finally {
                e.target.value = "";
            }
        };
        reader.readAsText(file);
    };

    // Confirm & Save CSV Import
    const handleConfirmImport = async () => {
        if (importRows.length === 0) {
            setErrorMsg("No valid student records to import ❌");
            return;
        }

        if (hasOverwrites && !confirmOverwrite) {
            setErrorMsg("Please check the confirmation box to authorize overwriting existing marks ⚠️");
            return;
        }

        setImporting(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const payload = {
                subjectId: selectedSubjectId,
                division: selectedDivision,
                maxMarks,
                overwriteConfirmed: true,
                rows: importRows.map(r => ({
                    studentId: r.studentId,
                    rollNo: r.rollNo,
                    studentName: r.studentName,
                    assignment1: r.assignment1 !== "" ? r.assignment1 : null,
                    assignment1Date: r.assignment1Date || "",
                    assignment2: r.assignment2 !== "" ? r.assignment2 : null,
                    assignment2Date: r.assignment2Date || "",
                    assignment3: r.assignment3 !== "" ? r.assignment3 : null,
                    assignment3Date: r.assignment3Date || "",
                    assignment4: r.assignment4 !== "" ? r.assignment4 : null,
                    assignment4Date: r.assignment4Date || "",
                    assignment5: r.assignment5 !== "" ? r.assignment5 : null,
                    assignment5Date: r.assignment5Date || ""
                }))
            };

            const res = await api.post("/assignment-marks/import-csv", payload);
            setShowImportModal(false);
            setSuccessMsg(res.message || `Successfully imported assignment records for ${importRows.length} students! ✅`);
            fetchMarks();
            setTimeout(() => setSuccessMsg(""), 6000);
        } catch (err) {
            console.error("Import error:", err);
            setErrorMsg(err.response?.data?.error || err.message || "Failed to import CSV assignment records ❌");
        } finally {
            setImporting(false);
        }
    };

    // Metrics computation
    const metrics = useMemo(() => {
        const total = studentsMarks.length;
        if (total === 0) return { total: 0, fullyGraded: 0, pending: 0, avgTotal: 0 };

        let fullyGraded = 0;
        let sumTotals = 0;

        studentsMarks.forEach(st => {
            const isFull = [st.assignment1, st.assignment2, st.assignment3, st.assignment4, st.assignment5]
                .every(v => v !== "" && v !== null && v !== undefined);
            if (isFull) fullyGraded++;
            sumTotals += (st.total || 0);
        });

        return {
            total,
            fullyGraded,
            pending: total - fullyGraded,
            avgTotal: (sumTotals / total).toFixed(1)
        };
    }, [studentsMarks]);

    // Filter students by search term & pending status
    const filteredStudents = useMemo(() => {
        return studentsMarks.filter(st => {
            const matchesSearch = 
                (st.rollNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (st.studentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (st.prnNumber || "").toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (filterPendingOnly) {
                const isFull = [st.assignment1, st.assignment2, st.assignment3, st.assignment4, st.assignment5]
                    .every(v => v !== "" && v !== null && v !== undefined);
                return !isFull;
            }

            return true;
        });
    }, [studentsMarks, searchTerm, filterPendingOnly]);

    return (
        <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
            {/* Header section with Enter Marks action */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>📝</span> Continuous Assessment Assignment Management
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Evaluate exactly five continuous assessment assignments per student with distinct checking dates and automatic total calculation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Hidden File Input for CSV Upload */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".csv"
                            className="hidden"
                        />

                        {/* Download Template */}
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            disabled={studentsMarks.length === 0}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Download pre-populated CSV template with roll numbers"
                        >
                            <span>📄</span>
                            <span>Download Template</span>
                        </button>

                        {/* Import CSV */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || studentsMarks.length === 0}
                            className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50 border border-emerald-500/30"
                            title="Upload and import assignment marks CSV file"
                        >
                            <span>📥</span>
                            <span>Import CSV</span>
                        </button>

                        {/* Export CSV */}
                        <button
                            type="button"
                            onClick={exportCSV}
                            disabled={studentsMarks.length === 0}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <span>📤</span>
                            <span>Export CSV</span>
                        </button>

                        {/* Save All */}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || loading || studentsMarks.length === 0}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    <span>Saving to Database...</span>
                                </>
                            ) : (
                                <>
                                    <span>💾</span>
                                    <span>Save All Marks</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Class / Subject / Max Marks selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Select Assigned Class *
                        </label>
                        <select
                            value={selectedClassKey}
                            onChange={(e) => setSelectedClassKey(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                        >
                            {classes.length === 0 ? (
                                <option value="">No classes assigned</option>
                            ) : (
                                classes.map(c => (
                                    <option key={`${c.department}_${c.year}_${c.division}`} value={`${c.department}_${c.year}_${c.division}`}>
                                        {c.department} - {c.year} (Div {c.division})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Assigned Course Subject *
                        </label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                        >
                            {!currentClassObj || (currentClassObj.assignedSubjects || currentClassObj.subjects || []).length === 0 ? (
                                <option value="">No subjects found</option>
                            ) : (
                                (currentClassObj.assignedSubjects || currentClassObj.subjects || []).map(s => (
                                    <option key={s._id || s.subjectId} value={s._id || s.subjectId}>
                                        {s.subjectCode} - {s.subjectName}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Division
                        </label>
                        <input
                            type="text"
                            value={selectedDivision}
                            readOnly
                            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-indigo-400 font-semibold cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Evaluation Standard
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value="10 Marks / Assignment"
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-semibold cursor-not-allowed"
                            />
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium bg-slate-800/80 px-2.5 py-2 rounded-xl border border-slate-700">Total / 50</span>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                {successMsg && (
                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center justify-between">
                        <span>{successMsg}</span>
                        <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-white font-bold">✕</button>
                    </div>
                )}
                {errorMsg && (
                    <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between">
                        <span>{errorMsg}</span>
                        <button onClick={() => setErrorMsg("")} className="text-rose-400 hover:text-white font-bold">✕</button>
                    </div>
                )}
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Cohort</p>
                    <p className="text-2xl font-bold text-slate-100 mt-1">{metrics.total}</p>
                    <span className="text-[9px] text-slate-400">Class Division {selectedDivision}</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Fully Graded</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics.fullyGraded}</p>
                    <span className="text-[9px] text-slate-400">All 5 assignments checked</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending Evaluation</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{metrics.pending}</p>
                    <span className="text-[9px] text-slate-400">Has un-evaluated assignments</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Cohort Avg Total</p>
                    <p className="text-2xl font-bold text-indigo-400 mt-1">{metrics.avgTotal} <span className="text-xs text-slate-500">/ {Number(maxMarks) * 5}</span></p>
                    <span className="text-[9px] text-slate-400">Recorded total average</span>
                </div>
            </div>

            {/* Filter and Table Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by Roll No, PRN, or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={filterPendingOnly}
                                onChange={(e) => setFilterPendingOnly(e.target.checked)}
                                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                            />
                            <span>Show Unevaluated Only</span>
                        </label>
                    </div>
                </div>

                {/* Table: Exact 13 column order per Requirement 3:
                    1. Roll No.
                    2. Student Name
                    3. Assignment 1 Marks
                    4. Assignment 1 Evaluation Date
                    5. Assignment 2 Marks
                    6. Assignment 2 Evaluation Date
                    7. Assignment 3 Marks
                    8. Assignment 3 Evaluation Date
                    9. Assignment 4 Marks
                    10. Assignment 4 Evaluation Date
                    11. Assignment 5 Marks
                    12. Assignment 5 Evaluation Date
                    13. Total Marks
                */}
                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Loading student assignment records...
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        {studentsMarks.length === 0 ? "No students found in this class cohort." : "No students match your filter."}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-3 w-20 whitespace-nowrap">Roll No.</th>
                                    <th className="py-3 px-3.5 min-w-[170px] whitespace-nowrap">Student Name</th>
                                    
                                    {/* Assignment 1 */}
                                    <th className="py-3 px-2 text-center w-24 whitespace-nowrap bg-indigo-950/15">Assignment 1 /10</th>
                                    <th className="py-3 px-2 text-center w-32 whitespace-nowrap bg-indigo-950/15">Assignment 1 Date</th>

                                    {/* Assignment 2 */}
                                    <th className="py-3 px-2 text-center w-24 whitespace-nowrap">Assignment 2 /10</th>
                                    <th className="py-3 px-2 text-center w-32 whitespace-nowrap">Assignment 2 Date</th>

                                    {/* Assignment 3 */}
                                    <th className="py-3 px-2 text-center w-24 whitespace-nowrap bg-indigo-950/15">Assignment 3 /10</th>
                                    <th className="py-3 px-2 text-center w-32 whitespace-nowrap bg-indigo-950/15">Assignment 3 Date</th>

                                    {/* Assignment 4 */}
                                    <th className="py-3 px-2 text-center w-24 whitespace-nowrap">Assignment 4 /10</th>
                                    <th className="py-3 px-2 text-center w-32 whitespace-nowrap">Assignment 4 Date</th>

                                    {/* Assignment 5 */}
                                    <th className="py-3 px-2 text-center w-24 whitespace-nowrap bg-indigo-950/15">Assignment 5 /10</th>
                                    <th className="py-3 px-2 text-center w-32 whitespace-nowrap bg-indigo-950/15">Assignment 5 Date</th>

                                    {/* Total Marks */}
                                    <th className="py-3 px-3 text-center w-28 whitespace-nowrap">Total /50</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredStudents.map((st) => {
                                    const maxVal = 10;

                                    return (
                                        <tr key={st.studentId} className="hover:bg-slate-850/40 transition">
                                            {/* 1. Roll No */}
                                            <td className="py-3 px-3 font-mono font-bold text-indigo-400 whitespace-nowrap">
                                                {st.rollNo || "—"}
                                            </td>

                                            {/* 2. Student Name */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <div className="font-semibold text-slate-200">{st.studentName}</div>
                                                {st.prnNumber && (
                                                    <div className="text-[10px] text-slate-500 font-mono">PRN: {st.prnNumber}</div>
                                                )}
                                            </td>

                                            {/* 3. Assignment 1 Marks */}
                                            <td className="py-2 px-2 text-center bg-indigo-950/10">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxVal}
                                                    step="0.5"
                                                    placeholder="Not Eval"
                                                    value={st.assignment1}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment1", e.target.value)}
                                                    className={`w-20 text-center py-1.5 px-1.5 rounded-lg text-xs font-semibold focus:outline-none transition ${
                                                        st.assignment1 === "" 
                                                            ? "bg-slate-950/80 border border-dashed border-amber-500/40 text-amber-300 placeholder-slate-600 focus:border-amber-400" 
                                                            : Number(st.assignment1) > maxVal || Number(st.assignment1) < 0
                                                                ? "bg-rose-500/20 border border-rose-500 text-rose-300"
                                                                : "bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500"
                                                    }`}
                                                />
                                            </td>

                                            {/* 4. Assignment 1 Evaluation Date */}
                                            <td className="py-2 px-2 text-center bg-indigo-950/10">
                                                <input
                                                    type="date"
                                                    value={st.assignment1Date}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment1Date", e.target.value)}
                                                    className="w-28 text-center py-1 px-1.5 rounded-lg text-[11px] bg-slate-950 border border-slate-800 text-slate-300 focus:border-indigo-500 focus:outline-none"
                                                    title={st.assignment1Date ? `Evaluated on ${st.assignment1Date}` : "Not Evaluated"}
                                                />
                                            </td>

                                            {/* 5. Assignment 2 Marks */}
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxVal}
                                                    step="0.5"
                                                    placeholder="Not Eval"
                                                    value={st.assignment2}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment2", e.target.value)}
                                                    className={`w-20 text-center py-1.5 px-1.5 rounded-lg text-xs font-semibold focus:outline-none transition ${
                                                        st.assignment2 === "" 
                                                            ? "bg-slate-950/80 border border-dashed border-amber-500/40 text-amber-300 placeholder-slate-600 focus:border-amber-400" 
                                                            : Number(st.assignment2) > maxVal || Number(st.assignment2) < 0
                                                                ? "bg-rose-500/20 border border-rose-500 text-rose-300"
                                                                : "bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500"
                                                    }`}
                                                />
                                            </td>

                                            {/* 6. Assignment 2 Evaluation Date */}
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="date"
                                                    value={st.assignment2Date}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment2Date", e.target.value)}
                                                    className="w-28 text-center py-1 px-1.5 rounded-lg text-[11px] bg-slate-950 border border-slate-800 text-slate-300 focus:border-indigo-500 focus:outline-none"
                                                    title={st.assignment2Date ? `Evaluated on ${st.assignment2Date}` : "Not Evaluated"}
                                                />
                                            </td>

                                            {/* 7. Assignment 3 Marks */}
                                            <td className="py-2 px-2 text-center bg-indigo-950/10">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxVal}
                                                    step="0.5"
                                                    placeholder="Not Eval"
                                                    value={st.assignment3}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment3", e.target.value)}
                                                    className={`w-20 text-center py-1.5 px-1.5 rounded-lg text-xs font-semibold focus:outline-none transition ${
                                                        st.assignment3 === "" 
                                                            ? "bg-slate-950/80 border border-dashed border-amber-500/40 text-amber-300 placeholder-slate-600 focus:border-amber-400" 
                                                            : Number(st.assignment3) > maxVal || Number(st.assignment3) < 0
                                                                ? "bg-rose-500/20 border border-rose-500 text-rose-300"
                                                                : "bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500"
                                                    }`}
                                                />
                                            </td>

                                            {/* 8. Assignment 3 Evaluation Date */}
                                            <td className="py-2 px-2 text-center bg-indigo-950/10">
                                                <input
                                                    type="date"
                                                    value={st.assignment3Date}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment3Date", e.target.value)}
                                                    className="w-28 text-center py-1 px-1.5 rounded-lg text-[11px] bg-slate-950 border border-slate-800 text-slate-300 focus:border-indigo-500 focus:outline-none"
                                                    title={st.assignment3Date ? `Evaluated on ${st.assignment3Date}` : "Not Evaluated"}
                                                />
                                            </td>

                                            {/* 9. Assignment 4 Marks */}
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxVal}
                                                    step="0.5"
                                                    placeholder="Not Eval"
                                                    value={st.assignment4}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment4", e.target.value)}
                                                    className={`w-20 text-center py-1.5 px-1.5 rounded-lg text-xs font-semibold focus:outline-none transition ${
                                                        st.assignment4 === "" 
                                                            ? "bg-slate-950/80 border border-dashed border-amber-500/40 text-amber-300 placeholder-slate-600 focus:border-amber-400" 
                                                            : Number(st.assignment4) > maxVal || Number(st.assignment4) < 0
                                                                ? "bg-rose-500/20 border border-rose-500 text-rose-300"
                                                                : "bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500"
                                                    }`}
                                                />
                                            </td>

                                            {/* 10. Assignment 4 Evaluation Date */}
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="date"
                                                    value={st.assignment4Date}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment4Date", e.target.value)}
                                                    className="w-28 text-center py-1 px-1.5 rounded-lg text-[11px] bg-slate-950 border border-slate-800 text-slate-300 focus:border-indigo-500 focus:outline-none"
                                                    title={st.assignment4Date ? `Evaluated on ${st.assignment4Date}` : "Not Evaluated"}
                                                />
                                            </td>

                                            {/* 11. Assignment 5 Marks */}
                                            <td className="py-2 px-2 text-center bg-indigo-950/10">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxVal}
                                                    step="0.5"
                                                    placeholder="Not Eval"
                                                    value={st.assignment5}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment5", e.target.value)}
                                                    className={`w-20 text-center py-1.5 px-1.5 rounded-lg text-xs font-semibold focus:outline-none transition ${
                                                        st.assignment5 === "" 
                                                            ? "bg-slate-950/80 border border-dashed border-amber-500/40 text-amber-300 placeholder-slate-600 focus:border-amber-400" 
                                                            : Number(st.assignment5) > maxVal || Number(st.assignment5) < 0
                                                                ? "bg-rose-500/20 border border-rose-500 text-rose-300"
                                                                : "bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500"
                                                    }`}
                                                />
                                            </td>

                                            {/* 12. Assignment 5 Evaluation Date */}
                                            <td className="py-2 px-2 text-center bg-indigo-950/10">
                                                <input
                                                    type="date"
                                                    value={st.assignment5Date}
                                                    onChange={(e) => handleFieldChange(st.studentId, "assignment5Date", e.target.value)}
                                                    className="w-28 text-center py-1 px-1.5 rounded-lg text-[11px] bg-slate-950 border border-slate-800 text-slate-300 focus:border-indigo-500 focus:outline-none"
                                                    title={st.assignment5Date ? `Evaluated on ${st.assignment5Date}` : "Not Evaluated"}
                                                />
                                            </td>

                                            {/* Total /50 */}
                                            <td className="py-3 px-3 text-center">
                                                {st.isFullyGraded ? (
                                                    <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        {st.total} / 50
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20" title="All 5 assignments must be evaluated to compute total /50">
                                                        <span>⚠️</span> Incomplete ({st.evaluatedCount || 0}/5)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CSV IMPORT PREVIEW & OVERWRITE CONFIRMATION MODAL (Requirement 4) */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>📥</span> Import Assignment Marks Preview
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Review the parsed records, validate marks against configured maximum ({maxMarks}), and confirm import.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="text-slate-400 hover:text-white text-base px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs">
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                ✓ Valid Records: {importRows.length}
                            </span>
                            {importErrors.length > 0 && (
                                <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                                    ⚠️ Invalid Rows: {importErrors.length}
                                </span>
                            )}
                            {hasOverwrites && (
                                <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                                    🔄 Existing Records Found
                                </span>
                            )}
                        </div>

                        {/* Error List Alert (if any rows failed validation) */}
                        {importErrors.length > 0 && (
                            <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-xs text-rose-300 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <span>⚠️</span> The following rows contained validation errors and will NOT be imported:
                                </p>
                                <ul className="list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto text-[11px] font-mono text-rose-300/90 pl-1">
                                    {importErrors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Overwrite Confirmation Box (if existing marks found) */}
                        {hasOverwrites && (
                            <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-xl text-xs space-y-2">
                                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                                    <span>⚠️</span> Previously Recorded Marks Detected
                                </p>
                                <p className="text-slate-300 text-[11px]">
                                    Some students in this file already have recorded marks in the database. Importing will update and overwrite their previous marks and evaluation dates.
                                </p>
                                <label className="flex items-center gap-2 pt-1 font-semibold text-amber-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={confirmOverwrite}
                                        onChange={(e) => setConfirmOverwrite(e.target.checked)}
                                        className="rounded bg-slate-950 border-slate-850 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                                    />
                                    <span>I confirm that I want to overwrite existing marks for these students.</span>
                                </label>
                            </div>
                        )}

                        {/* Preview Table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-72">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                                        <th className="py-2.5 px-3">Row</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Roll No.</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Student Name</th>
                                        <th className="py-2.5 px-2 text-center whitespace-nowrap">Assgn 1</th>
                                        <th className="py-2.5 px-2 text-center whitespace-nowrap">Assgn 2</th>
                                        <th className="py-2.5 px-2 text-center whitespace-nowrap">Assgn 3</th>
                                        <th className="py-2.5 px-2 text-center whitespace-nowrap">Assgn 4</th>
                                        <th className="py-2.5 px-2 text-center whitespace-nowrap">Assgn 5</th>
                                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-300">
                                    {importRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                                                No valid student rows to preview.
                                            </td>
                                        </tr>
                                    ) : (
                                        importRows.map((r, idx) => (
                                            <tr key={idx} className="hover:bg-slate-850/40 font-mono text-[11px]">
                                                <td className="py-2 px-3 text-slate-500">{r.rowNum}</td>
                                                <td className="py-2 px-3 font-bold text-indigo-300 whitespace-nowrap">{r.rollNo}</td>
                                                <td className="py-2 px-3 text-slate-200 font-sans font-medium whitespace-nowrap">
                                                    {r.studentName}
                                                    {r.nameMismatch && (
                                                        <span className="block text-[10px] text-amber-400 font-normal">
                                                            (CSV: {r.nameMismatch})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                                    {r.assignment1 !== "" ? `${r.assignment1} (${r.assignment1Date || "-"})` : "—"}
                                                </td>
                                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                                    {r.assignment2 !== "" ? `${r.assignment2} (${r.assignment2Date || "-"})` : "—"}
                                                </td>
                                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                                    {r.assignment3 !== "" ? `${r.assignment3} (${r.assignment3Date || "-"})` : "—"}
                                                </td>
                                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                                    {r.assignment4 !== "" ? `${r.assignment4} (${r.assignment4Date || "-"})` : "—"}
                                                </td>
                                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                                    {r.assignment5 !== "" ? `${r.assignment5} (${r.assignment5Date || "-"})` : "—"}
                                                </td>
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    {r.hasExistingMarks ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-sans">
                                                            Overwrites
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-sans">
                                                            New
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                            <span className="text-slate-500 text-[11px]">
                                Selected Cohort: {currentClassObj?.department || "Class"} (Div {selectedDivision})
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmImport}
                                    disabled={importing || importRows.length === 0 || (hasOverwrites && !confirmOverwrite)}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                                >
                                    {importing ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                            <span>Importing to Database...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>💾</span>
                                            <span>Confirm &amp; Import {importRows.length} Records</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AssignmentMarksPanel;
