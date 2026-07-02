// Helper to get marks/result based on revalMode
function getSubjectMarks(subj, revalMode) {
  // User's structure: rv_marks, rv_result, old_marks, old_result, final_marks, final_result
  if (revalMode === 'after') {
    // Prefer rv_marks/rv_result, fallback to final_marks/final_result, else old_marks/old_result
    if (subj.rv_marks !== undefined && subj.rv_marks !== null && subj.rv_marks !== "") {
      return {
        marks: Number(subj.rv_marks),
        result: subj.rv_result || subj.final_result || subj.result,
      };
    }
    if (subj.final_marks !== undefined && subj.final_marks !== null && subj.final_marks !== "") {
      return {
        marks: Number(subj.final_marks),
        result: subj.final_result || subj.result,
      };
    }
    // fallback to old if nothing else
    if (subj.old_marks !== undefined && subj.old_marks !== null && subj.old_marks !== "") {
      return {
        marks: Number(subj.old_marks),
        result: subj.old_result || subj.result,
      };
    }
  } else {
    // Before reval: prefer old_marks/old_result, fallback to final_marks/final_result, else rv_marks/rv_result
    if (subj.old_marks !== undefined && subj.old_marks !== null && subj.old_marks !== "") {
      return {
        marks: Number(subj.old_marks),
        result: subj.old_result || subj.result,
      };
    }
    if (subj.final_marks !== undefined && subj.final_marks !== null && subj.final_marks !== "") {
      return {
        marks: Number(subj.final_marks),
        result: subj.final_result || subj.result,
      };
    }
    if (subj.rv_marks !== undefined && subj.rv_marks !== null && subj.rv_marks !== "") {
      return {
        marks: Number(subj.rv_marks),
        result: subj.rv_result || subj.result,
      };
    }
  }
  // fallback: try total/result or 0
  return {
    marks: Number(subj.total) || 0,
    result: subj.result,
  };
}
import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Card, CircularProgress } from "@mui/material";
import { Pie, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { normalizeStudents } from "../normalizeStudents";
import jsPDF from "jspdf";

const TeachersCorner = () => {
    // Toggle for before/after reval
    const [revalMode, setRevalMode] = useState('after'); // 'before' or 'after'
  // Chart refs for PDF export
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);
  const deptChartRef = useRef(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Export filtered results to Excel (now inside component for state access)
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [highlightFail, setHighlightFail] = useState(false);

  // PDF chart export selection dialog state
  const [showPdfExportDialog, setShowPdfExportDialog] = useState(false);
  const [pdfChartSelections, setPdfChartSelections] = useState({
    pie: true,
    bar: true,
    dept: false,
  });

  const handleExportExcel = (highlight = false) => {
    const semKey = String(sem);
    const filtered = data.filter(
      (s) =>
        (branch ? s.branch === branch : true) &&
        (batch ? String(s.batch) === String(batch) : true) &&
        s.semesters && s.semesters[semKey]
    );
    // Collect all subject codes, short names, and long names for this sem (for consistent columns and reference)
    const subjectMap = {};
    const backlogSubjectMap = {};
    // Only include subject codes that are present for at least one student in the current sem (and not failed in previous sems)
    let presentSubjectCodes = new Set();
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      Object.entries(semSubjects).forEach(([code, subj]) => {
        // code is the subject code (e.g., BCS401)
        // Check if this subject is a backlog subject for this student (failed in previous sems)
        let isBacklog = false;
        if (parseInt(semKey) > 1) {
          Object.entries(s.semesters || {}).forEach(([semNum, subjects]) => {
            if (semNum !== semKey && parseInt(semNum) < parseInt(semKey)) {
              Object.entries(subjects || {}).forEach(([codePrev, subjPrev]) => {
                const res = (subjPrev.result || '').trim().toLowerCase();
                if ((res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne') && codePrev === code) {
                  isBacklog = true;
                }
              });
            }
          });
        }
        if (!isBacklog) {
          presentSubjectCodes.add(code);
          if (!subjectMap[code]) {
            subjectMap[code] = {
              code,
              short: code,
              long: subj.subject_name,
            };
          }
        }
      });
    });
    const subjectList = Array.from(presentSubjectCodes);
    // No backlogSubjectMap or backlogSubjectList used for main sheet headings
    let rows = [];
    let backlogRows = [];
    // Only create backlog for sem > 1
    // New clean structure: one row per student per backlog subject
    if (parseInt(semKey) > 1) {
      let srNo = 1;
      filtered.forEach((s) => {
        // Find backlog subjects: codes in current sem that are NOT main subjects (i.e., they appeared as failures in a previous sem)
        const currentSemSubjects = s.semesters[semKey] || {};
        const backlogEntries = [];
        Object.entries(currentSemSubjects).forEach(([code, subj]) => {
          if (presentSubjectCodes.has(code)) return; // skip main subjects
          // This is a backlog subject — only show current sem result
          backlogEntries.push({
            code,
            name: subj.subject_name || '',
            currentMarks: subj.total || '',
            currentResult: subj.result || '',
          });
          if (!backlogSubjectMap[code]) {
            backlogSubjectMap[code] = {
              code,
              short: code,
              long: subj.subject_name,
            };
          }
        });
        if (backlogEntries.length > 0) {
          backlogEntries.forEach((f, idx) => {
            backlogRows.push({
              'Sr.No': idx === 0 ? srNo : '',
              'Name': idx === 0 ? s.name : '',
              'USN': idx === 0 ? s.usn : '',
              'Branch': idx === 0 ? s.branch : '',
              'Batch': idx === 0 ? s.batch : '',
              'Total Backlogs': idx === 0 ? backlogEntries.length : '',
              'Subject Code': f.code,
              'Subject Name': f.name,
              [`Sem ${semKey} Marks`]: f.currentMarks,
              [`Sem ${semKey} Result`]: f.currentResult,
            });
          });
          srNo++;
        }
      });
    }
    // Main results — only include main subjects (not backlog from previous semesters)
    filtered.forEach((s) => {
      const semSubjects = s.semesters[semKey] || {};
      const usnValue = s.usn || (s.USN ? s.USN : "");
      const row = {
        Name: s.name,
        USN: usnValue,
        Branch: s.branch,
        Batch: s.batch,
        Semester: semKey,
      };
      let totalMarks = 0;
      let maxMarksSum = 0;
      // Only include main subjects (present in presentSubjectCodes), skip backlog columns
      Object.entries(semSubjects).forEach(([code, subj]) => {
        if (!presentSubjectCodes.has(code)) return; // skip backlog subjects
        // Use the same logic as marks sheet for total: internal + rv_marks/old_marks/external
        let internal = subj.internal !== undefined ? subj.internal : (subj.internal_marks !== undefined ? subj.internal_marks : '');
        let external = '';
        let total = '';
        if (revalMode === 'after') {
          external = subj.rv_marks !== undefined && subj.rv_marks !== '' ? subj.rv_marks : (subj.external !== undefined ? subj.external : (subj.external_marks !== undefined ? subj.external_marks : ''));
          if (subj.rv_marks !== undefined && subj.rv_marks !== '') {
            total = (Number(internal || 0) + Number(subj.rv_marks || 0)).toString();
          } else {
            total = (Number(internal || 0) + Number(external || 0)).toString();
          }
        } else {
          external = subj.old_marks !== undefined && subj.old_marks !== '' ? subj.old_marks : (subj.external !== undefined ? subj.external : (subj.external_marks !== undefined ? subj.external_marks : ''));
          if (subj.old_marks !== undefined && subj.old_marks !== '') {
            total = (Number(internal || 0) + Number(subj.old_marks || 0)).toString();
          } else {
            total = (Number(internal || 0) + Number(external || 0)).toString();
          }
        }
        row[code] = total;
        const marks = Number(total);
        if (!isNaN(marks) && total !== '' && total !== null && total !== undefined) {
          totalMarks += marks;
          const subjMaxMarks = marks > 100 ? 200 : 100;
          maxMarksSum += subjMaxMarks;
        }
      });
      // Failed subjects — only consider main subjects
      const failedSubjects = Object.entries(semSubjects)
        .filter(([code, subj]) => {
          if (!presentSubjectCodes.has(code)) return false;
          const { result } = getSubjectMarks(subj, revalMode);
          const res = (result || '').trim().toLowerCase();
          return res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne';
        })
        .map(([code]) => code);
      row['Result'] = failedSubjects.length > 0 ? 'Fail' : 'Pass';
      row['Percentage'] = maxMarksSum > 0 ? ((totalMarks / maxMarksSum) * 100).toFixed(2) : '';
      row['Failed Subjects'] = failedSubjects.join(', ');
      rows.push(row);
    });
    // === New: Sheet with internal, external, and total marks for each subject (formatted with subject code as header, then Internal/External/Total below) ===
    const marksSheetAoa = [];
    // First header row: Name, USN, Branch, Batch, then subject name + code (merged for 3 columns each), then Result, Percentage
    const firstHeader = ['Name', 'USN', 'Branch', 'Batch'];
    subjectList.forEach(code => {
      const subjName = (subjectMap[code] && subjectMap[code].long) ? subjectMap[code].long : '';
      firstHeader.push(`${subjName} (${code})`, '', '');
    });
    firstHeader.push('Result', 'Percentage');
    marksSheetAoa.push(firstHeader);
    // Second header row: '', '', '', '', Internal, External, Total, ..., '', ''
    const secondHeader = ['', '', '', ''];
    subjectList.forEach(() => {
      secondHeader.push('Internal', 'External', 'Total');
    });
    secondHeader.push('', '');
    marksSheetAoa.push(secondHeader);
    // Data rows
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      const row = [s.name, s.usn || s.USN || '', s.branch, s.batch];
      let totalMarks = 0;
      let maxMarksSum = 0;
      let failedSubjects = [];
      subjectList.forEach(code => {
        const subj = semSubjects[code] || {};
        let internal = subj.internal !== undefined ? subj.internal : (subj.internal_marks !== undefined ? subj.internal_marks : '');
        let external = '';
        let total = '';
        let isFail = false;
        if (revalMode === 'after') {
          external = subj.rv_marks !== undefined && subj.rv_marks !== '' ? subj.rv_marks : (subj.external !== undefined ? subj.external : (subj.external_marks !== undefined ? subj.external_marks : ''));
          if (subj.rv_marks !== undefined && subj.rv_marks !== '') {
            total = (Number(internal || 0) + Number(subj.rv_marks || 0)).toString();
          } else {
            total = (Number(internal || 0) + Number(external || 0)).toString();
          }
          // Use result field for fail
          const res = (subj.rv_result || subj.final_result || subj.result || '').trim().toLowerCase();
          if (res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne') isFail = true;
        } else {
          external = subj.old_marks !== undefined && subj.old_marks !== '' ? subj.old_marks : (subj.external !== undefined ? subj.external : (subj.external_marks !== undefined ? subj.external_marks : ''));
          if (subj.old_marks !== undefined && subj.old_marks !== '') {
            total = (Number(internal || 0) + Number(subj.old_marks || 0)).toString();
          } else {
            total = (Number(internal || 0) + Number(external || 0)).toString();
          }
          // If internal > 50, do not consider external for fail
          let intNum = Number(internal);
          let extNum = Number(subj.old_marks !== undefined && subj.old_marks !== '' ? subj.old_marks : external);
          if (isNaN(intNum)) intNum = 0;
          if (isNaN(extNum)) extNum = 0;
          const res = (subj.old_result || subj.result || '').trim().toLowerCase();
          if (intNum > 50) {
            if (res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne') isFail = true;
          } else {
            if (res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne' || extNum < 18) isFail = true;
          }
        }
        row.push(internal);
        row.push(external);
        row.push(total);
        // For result/percentage
        const marks = Number(total);
        if (!isNaN(marks) && total !== '' && total !== null && total !== undefined) {
          totalMarks += marks;
          const subjMaxMarks = marks > 100 ? 200 : 100;
          maxMarksSum += subjMaxMarks;
        }
        if (isFail) failedSubjects.push(code);
      });
      // Result: Fail if any failed subject, else Pass
      row.push(failedSubjects.length > 0 ? 'Fail' : 'Pass');
      // Percentage
      row.push(maxMarksSum > 0 ? ((totalMarks / maxMarksSum) * 100).toFixed(2) : '');
      marksSheetAoa.push(row);
    });
    const wsMarks = XLSX.utils.aoa_to_sheet(marksSheetAoa);
    // Center align subject headers (first and second row for subject columns)
    const startCol = 4; // first 4 columns are Name, USN, Branch, Batch
    for (let i = 0; i < subjectList.length; ++i) {
      const colBase = startCol + i * 3;
      // First header row (subject name + code)
      if (!wsMarks['!merges']) wsMarks['!merges'] = [];
      wsMarks['!merges'].push({ s: { r: 0, c: colBase }, e: { r: 0, c: colBase + 2 } });
      for (let c = colBase; c <= colBase + 2; ++c) {
        const cell1 = wsMarks[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell1) cell1.s = { alignment: { horizontal: 'center', vertical: 'center' }, font: { bold: true } };
        const cell2 = wsMarks[XLSX.utils.encode_cell({ r: 1, c })];
        if (cell2) cell2.s = { alignment: { horizontal: 'center', vertical: 'center' } };
      }
    }
    // Create worksheet (workbook created later to control sheet order)
    const ws = XLSX.utils.json_to_sheet(rows);
    // Add backlog sheet only if there are failed students in previous sems
    let wsBacklog = null;
    if (backlogRows.length > 0) {
      // Clean flat structure: one row per student per backlog subject
      wsBacklog = XLSX.utils.json_to_sheet(backlogRows);
      // Set column widths for readability
      wsBacklog['!cols'] = [
        { wch: 6 },  // Sr.No
        { wch: 25 }, // Name
        { wch: 16 }, // USN
        { wch: 12 }, // Branch
        { wch: 8 },  // Batch
        { wch: 14 }, // Total Backlogs
        { wch: 16 }, // Subject Code
        { wch: 40 }, // Subject Name
        { wch: 14 }, // Current Sem Marks
        { wch: 14 }, // Current Sem Result
      ];
    }
    // Add reference sheet for subject codes (with subject code column)
    const refRows = [
      ...subjectList.map(code => ({
        Code: code,
        'Subject Code': code,
        'Subject Name': (subjectMap[code] && subjectMap[code].long) ? subjectMap[code].long : '',
        Type: 'Main'
      })),
      ...Object.keys(backlogSubjectMap).map(code => ({
        Code: code,
        'Subject Code': code,
        'Subject Name': (backlogSubjectMap[code] && backlogSubjectMap[code].long) ? backlogSubjectMap[code].long : '',
        Type: 'Backlog'
      })),
    ];
    const wsRef = XLSX.utils.json_to_sheet(refRows);
    // === Result Analysis Sheet (structured like university report) ===
    // College name fixed to BLDE
    let collegeName = 'BLDEAS COLLEGE OF ENGINEERING';

    // Compute overall summary stats (only for main subjects, excluding backlog)
    let totalStudentsCount = filtered.length;
    let fcdCount = 0, fcCount = 0, scCount = 0, failCount = 0, passCount = 0;
    const studentPercentages = [];
    // First pass: determine max marks per subject code (if any student scored >100, max is 200)
    const subjectMaxMarksMap = {};
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      Object.entries(semSubjects).forEach(([code, subj]) => {
        const marks = Number(subj.total);
        if (!isNaN(marks) && marks > (subjectMaxMarksMap[code] || 0)) {
          subjectMaxMarksMap[code] = marks;
        }
      });
    });
    // For each subject: if any student's total > 100, max is 200; else 100
    Object.keys(subjectMaxMarksMap).forEach(code => {
      subjectMaxMarksMap[code] = subjectMaxMarksMap[code] > 100 ? 200 : 100;
    });
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      // Only consider main subjects (not backlog) for overall stats
      const subjects = Object.entries(semSubjects).filter(([code]) => presentSubjectCodes.has(code));
      let totalM = 0, maxMarksSum = 0, hasFail = false;
      subjects.forEach(([code, subj]) => {
        const { marks, result } = getSubjectMarks(subj, revalMode);
        if (!isNaN(marks) && marks !== '' && marks !== null && marks !== undefined) {
          totalM += marks;
          maxMarksSum += (subjectMaxMarksMap[code] || 100);
        }
        const res = (result || '').trim().toLowerCase();
        if (res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne') hasFail = true;
      });
      const pct = maxMarksSum > 0 ? (totalM / maxMarksSum) * 100 : 0;
      studentPercentages.push({ name: s.name, usn: s.usn, pct, hasFail });
      if (hasFail) {
        failCount++;
      } else {
        passCount++;
        if (pct >= 70) fcdCount++;
        else if (pct >= 60) fcCount++;
        else if (pct >= 50) scCount++;
      }
    });
    const overallPassPct = totalStudentsCount > 0 ? ((passCount / totalStudentsCount) * 100).toFixed(2) : 0;

    // Compute subject-wise stats for MAIN subjects only (use subjectMaxMarksMap for percentage-based FCD/FC/SC)
    const subjStats = {};
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      Object.entries(semSubjects).forEach(([code, subj]) => {
        // Only include main subjects (not backlog from previous semesters)
        if (!presentSubjectCodes.has(code)) return;
        if (!subjStats[code]) {
          subjStats[code] = { name: subj.subject_name || code, total: 0, fcd: 0, fc: 0, sc: 0, failed: 0, passed: 0, maxMarks: subjectMaxMarksMap[code] || 100 };
        }
        subjStats[code].total++;
        const { marks, result } = getSubjectMarks(subj, revalMode);
        const maxM = subjectMaxMarksMap[code] || 100;
        const res = (result || '').trim().toLowerCase();
        if (res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne') {
          subjStats[code].failed++;
        } else {
          subjStats[code].passed++;
          if (!isNaN(marks)) {
            // Calculate percentage-equivalent for this subject
            const pct = (marks / maxM) * 100;
            if (pct >= 70) subjStats[code].fcd++;
            else if (pct >= 60) subjStats[code].fc++;
            else if (pct >= 50) subjStats[code].sc++;
          }
        }
      });
    });

    // Compute subject-wise stats for BACKLOG (previous sem) subjects separately
    const backlogSubjStats = {};
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      Object.entries(semSubjects).forEach(([code, subj]) => {
        // Only include backlog subjects (not main subjects)
        if (presentSubjectCodes.has(code)) return;
        if (!backlogSubjStats[code]) {
          backlogSubjStats[code] = { name: subj.subject_name || code, total: 0, fcd: 0, fc: 0, sc: 0, failed: 0, passed: 0, maxMarks: subjectMaxMarksMap[code] || 100 };
        }
        backlogSubjStats[code].total++;
        const marks = Number(subj.total);
        const maxM = subjectMaxMarksMap[code] || 100;
        const res = (subj.result || '').trim().toLowerCase();
        if (res === 'f' || res.includes('fail') || res === 'a' || res === 'x' || res === 'ne') {
          backlogSubjStats[code].failed++;
        } else {
          backlogSubjStats[code].passed++;
          if (!isNaN(marks)) {
            const pct = (marks / maxM) * 100;
            if (pct >= 70) backlogSubjStats[code].fcd++;
            else if (pct >= 60) backlogSubjStats[code].fc++;
            else if (pct >= 50) backlogSubjStats[code].sc++;
          }
        }
      });
    });

    // Top 3 students (by percentage, only passed)
    const toppers = studentPercentages
      .filter(s => !s.hasFail)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);

    // Build the AOA (array of arrays) for the sheet
    const analysisAoa = [];
    analysisAoa.push([collegeName]);
    analysisAoa.push(['UNIVERSITY EXAM RESULT ANALYSIS']);
    analysisAoa.push([`B.E. SEMESTER ${semKey} HELD IN ${new Date().getFullYear()}`, '', '', `${branch || 'All Branches'}`, '', `Batch: ${batch || 'All'}`]);
    analysisAoa.push([]);
    // Summary table
    analysisAoa.push(['Sr. No.', 'Particulars', 'Total']);
    analysisAoa.push([1, 'Total Students', totalStudentsCount]);
    analysisAoa.push([2, 'Students with FCD (>=70%)', fcdCount]);
    analysisAoa.push([3, 'Students with FC (60-69%)', fcCount]);
    analysisAoa.push([4, 'Students with SC (50-59%)', scCount]);
    analysisAoa.push([5, 'Failed Students', failCount]);
    analysisAoa.push([6, 'Passed Students', passCount]);
    analysisAoa.push([7, 'Overall Passing %', overallPassPct + '%']);
    analysisAoa.push([]);
    // Subject-wise report
    analysisAoa.push(['INDIVIDUAL SUBJECT REPORT']);
    analysisAoa.push(['Sr.No', 'Subject Code', 'Subject Name', 'Total Students', 'Total FCD', 'Total FC', 'Total SC', 'Total Failed', 'Total Passed', 'Passing %']);
    let subjSrNo = 1;
    Object.entries(subjStats).forEach(([code, stats]) => {
      const passPct = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : '0';
      analysisAoa.push([subjSrNo++, code, stats.name, stats.total, stats.fcd, stats.fc, stats.sc, stats.failed, stats.passed, passPct + '%']);
    });
    analysisAoa.push([]);
    // Toppers
    if (toppers.length > 0) {
      const rankLabels = ['FIRST RANK', 'SECOND RANK', 'THIRD RANK'];
      const topperStr = toppers.map((t, i) => `${i + 1}) ${rankLabels[i]}: ${t.name} (${t.pct.toFixed(2)}%)`).join('    ');
      analysisAoa.push(['TOPPERS:', topperStr]);
    }

    const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisAoa);
    // Set column widths for readability
    wsAnalysis['!cols'] = [
      { wch: 8 }, { wch: 16 }, { wch: 40 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    // === Previous Sem Subject Analysis Sheet (for backlog subjects) ===
    let wsPrevSemAnalysis = null;
    if (Object.keys(backlogSubjStats).length > 0) {
      const prevSemAoa = [];
      prevSemAoa.push([collegeName]);
      prevSemAoa.push(['PREVIOUS SEMESTER SUBJECT ANALYSIS']);
      prevSemAoa.push([`Students appearing in Semester ${semKey} with backlog subjects`, '', '', `${branch || 'All Branches'}`, '', `Batch: ${batch || 'All'}`]);
      prevSemAoa.push([]);
      prevSemAoa.push(['Sr.No', 'Subject Code', 'Subject Name', 'Total Students', 'Total FCD', 'Total FC', 'Total SC', 'Total Failed', 'Total Passed', 'Passing %']);
      let prevSrNo = 1;
      Object.entries(backlogSubjStats).forEach(([code, stats]) => {
        const passPct = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : '0';
        prevSemAoa.push([prevSrNo++, code, stats.name, stats.total, stats.fcd, stats.fc, stats.sc, stats.failed, stats.passed, passPct + '%']);
      });
      wsPrevSemAnalysis = XLSX.utils.aoa_to_sheet(prevSemAoa);
      wsPrevSemAnalysis['!cols'] = [
        { wch: 8 }, { wch: 16 }, { wch: 40 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
      ];
    }

    // Create workbook and append sheets in desired order: Result Analysis, Results, Marks Sheet, Backlog, Prev Sem Analysis, Reference
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAnalysis, "Result Analysis");
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.utils.book_append_sheet(wb, wsMarks, "Marks Sheet");
    if (wsBacklog) {
      XLSX.utils.book_append_sheet(wb, wsBacklog, "Backlog Subjects");
    }
    if (wsPrevSemAnalysis) {
      XLSX.utils.book_append_sheet(wb, wsPrevSemAnalysis, "Prev Sem Analysis");
    }
    XLSX.utils.book_append_sheet(wb, wsRef, "Subject Reference");

    // Download file
    XLSX.writeFile(wb, `results_sem${semKey}_${branch || 'all'}_${batch || 'all'}.xlsx`);
  };
  const [sem, setSem] = useState(1);
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [data, setData] = useState([]);
  const [passFailStats, setPassFailStats] = useState({ pass: 0, fail: 0 });
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const studentsRef = ref(db, "students");
    onValue(studentsRef, (snapshot) => {
      const val = normalizeStudents(snapshot.val() || {});
      const arr = Object.values(val);
      setData(arr);
      // Extract unique batches and branches
      setBatches([...new Set(arr.map((s) => String(s.batch)))].sort());
      setBranches([...new Set(arr.map((s) => s.branch))].sort());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    // Calculate pass/fail for selected sem, branch, batch, college, and revalMode
    const semKey = String(sem);
    const filtered = data.filter(
      (s) =>
        (branch ? s.branch === branch : true) &&
        (batch ? String(s.batch) === String(batch) : true) &&
        s.semesters && s.semesters[semKey]
    );
    let pass = 0,
      fail = 0;
    filtered.forEach((s) => {
      // For each student, only consider the main attempt for each subject (exclude previous failed attempts)
      const semList = Object.keys(s.semesters || {});
      const currentSemIdx = semList.indexOf(semKey);
      const currentSubjects = Object.values(s.semesters[semKey] || {});
      const currentSubjectNames = currentSubjects.map(subj => subj.subject_name);
      let previousAttempts = [];
      for (let i = 0; i < currentSemIdx; ++i) {
        const prevSem = semList[i];
        const prevSubjects = Object.values(s.semesters[prevSem] || {});
        prevSubjects.forEach(subj => {
          const isFail = subj.result && (subj.result.trim().toUpperCase() === 'F' || subj.result.trim().toLowerCase().includes('fail'));
          if (currentSubjectNames.includes(subj.subject_name) && isFail) {
            previousAttempts.push({ sem: prevSem, ...subj });
          }
        });
      }
      // Only use subjects not in previousAttempts
      const mainSubjects = Object.entries(s.semesters[semKey] || {})
        .filter(([_, subj]) => {
          return !previousAttempts.some(
            (prev) => prev.subject_name === subj.subject_name
          );
        })
        .map(([_, subj]) => subj);
      if (mainSubjects.length > 0) {
        // Use revalMode for result
        const hasFail = mainSubjects.some(subj => {
          const { result } = getSubjectMarks(subj, revalMode);
          const res = (result || '').trim().toLowerCase();
          return res === 'f' || res.includes('fail');
        });
        if (hasFail) {
          fail++;
        } else {
          pass++;
        }
      }
    });
    setPassFailStats({ pass, fail });
  }, [sem, branch, batch, data, revalMode]);

  const pieData = {
    labels: ["Pass", "Fail"],
    datasets: [
      {
        data: [passFailStats.pass, passFailStats.fail],
        backgroundColor: ["#4caf50", "#f44336"],
      },
    ],
  };

  // Subject-wise pass/fail calculation (must be after hooks)
  // This must be inside the component, after all hooks, so 'sem' is defined
  let subjectNames = [];
  let barData = null;
  let subjectShortMap = {};
  let subjectCodeMap = {};
  {
    const semKey = String(sem);
    const filtered = data.filter(
      (s) =>
        (branch ? s.branch === branch : true) &&
        (batch ? String(s.batch) === String(batch) : true) &&
        s.semesters && s.semesters[semKey]
    );
    // Only include subjects that are present in the current semester for the selected branch
    const subjectCount = {};
    filtered.forEach(s => {
      const semSubjects = Object.values(s.semesters?.[semKey] || {});
      const semList = Object.keys(s.semesters || {});
      const currentSemIdx = semList.indexOf(semKey);
      let previousAttempts = [];
      for (let i = 0; i < currentSemIdx; ++i) {
        const prevSem = semList[i];
        const prevSubjects = Object.values(s.semesters[prevSem] || {});
        prevSubjects.forEach(subj => {
          const isFail = subj.result && (subj.result.trim().toUpperCase() === 'F' || subj.result.trim().toLowerCase().includes('fail'));
          if (semSubjects.some(sj => sj.subject_name === subj.subject_name) && isFail) {
            previousAttempts.push(subj.subject_name);
          }
        });
      }
      Object.entries(s.semesters?.[semKey] || {}).forEach(([code, subj]) => {
        if (!previousAttempts.includes(subj.subject_name)) {
          subjectCount[subj.subject_name] = (subjectCount[subj.subject_name] || 0) + 1;
          // Track subject code (DB key) for each subject name
          if (subj.subject_name && !subjectCodeMap[subj.subject_name]) {
            subjectCodeMap[subj.subject_name] = code;
          }
          // Build short name map: prefer subject_code, else abbreviation
          if (subj.subject_name && !subjectShortMap[subj.subject_name]) {
            if (subj.subject_code) {
              subjectShortMap[subj.subject_name] = subj.subject_code;
            } else {
              // Abbreviation: first letter of each word, up to 6 chars
              subjectShortMap[subj.subject_name] = subj.subject_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,6);
            }
          }
        }
      });
    });
    const minCount = Math.max(2, Math.floor(filtered.length * 0.2));
    subjectNames = Object.keys(subjectCount).filter(name => subjectCount[name] >= minCount);
    const subjectPassFail = subjectNames.map(name => {
      let pass = 0, fail = 0;
      filtered.forEach(s => {
        const mainSubj = Object.values(s.semesters[semKey] || {}).find(subj => subj.subject_name === name);
        if (mainSubj) {
          const { result } = getSubjectMarks(mainSubj, revalMode);
          const res = (result || '').trim().toLowerCase();
          if (res === 'f' || res.includes('fail')) fail++;
          else if (res) pass++;
        }
      });
      return { name, pass, fail };
    });
    barData = {
      labels: subjectNames.map(name => subjectShortMap[name] || name),
      datasets: [
        {
          label: 'Pass',
          data: subjectPassFail.map(s => s.pass),
          backgroundColor: '#4caf50',
        },
        {
          label: 'Fail',
          data: subjectPassFail.map(s => s.fail),
          backgroundColor: '#f44336',
        },
      ],
    };
  }

  // Export selected charts to PDF (renders charts off-screen so all are captured)
  const handleExportChartsPDF = async (selections) => {
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentTop = 30;
      const chartMaxW = pageW - margin * 2;
      const chartMaxH = pageH - contentTop - 20;

      // Fixed college name for BLDE
      let collegeName = 'BLDEAS COLLEGE OF ENGINEERING';
      const headerText = `${collegeName} | Sem ${sem} | ${branch || 'All Branches'} | Batch: ${batch || 'All'}`;

      // Helper: render a chart to a temporary canvas and return image data
      const renderChartToImage = (type, chartData, chartOptions = {}, width = 800, height = 500, chartPlugins = []) => {
        return new Promise((resolve) => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          // Fill white background (prevents transparency turning black)
          const ctx = tempCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          const tempChart = new Chart(ctx, {
            type,
            data: JSON.parse(JSON.stringify(chartData)),
            options: {
              ...chartOptions,
              responsive: false,
              animation: false,
              devicePixelRatio: 1,
            },
            plugins: chartPlugins,
          });
          // Wait a frame for rendering
          requestAnimationFrame(() => {
            const imgData = tempCanvas.toDataURL('image/png');
            tempChart.destroy();
            resolve(imgData);
          });
        });
      };

      // Helper: add header + title to current page
      const addPageHeader = (title) => {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(headerText, pageW / 2, 10, { align: 'center' });
        pdf.setFontSize(16);
        pdf.setTextColor(33, 33, 33);
        pdf.text(title, pageW / 2, 22, { align: 'center' });
      };

      // Helper: add chart image centered on page
      const addChartImage = (imgData, canvasW, canvasH) => {
        const ratio = Math.min(chartMaxW / canvasW, chartMaxH / canvasH);
        const imgW = canvasW * ratio;
        const imgH = canvasH * ratio;
        const x = (pageW - imgW) / 2;
        pdf.addImage(imgData, 'PNG', x, contentTop, imgW, imgH, undefined, 'FAST');
        return contentTop + imgH;
      };

      let isFirstPage = true;

      // ===== Pie Chart (Overall Pass/Fail) =====
      if (selections.pie) {
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        addPageHeader('Overall Pass/Fail');
        const pieImg = await renderChartToImage('pie', pieData, {
          plugins: { legend: { position: 'bottom', labels: { font: { size: 16 } } } },
        }, 600, 500);
        addChartImage(pieImg, 600, 500);
        // Stats text
        pdf.setFontSize(13);
        pdf.setTextColor(33, 33, 33);
        pdf.text(`Pass: ${passFailStats.pass}  |  Fail: ${passFailStats.fail}`, pageW / 2, pageH - 18, { align: 'center' });
        const passPctVal = (passFailStats.pass + passFailStats.fail) > 0
          ? ((passFailStats.pass / (passFailStats.pass + passFailStats.fail)) * 100).toFixed(2) + '%'
          : 'N/A';
        pdf.setFontSize(13);
        pdf.setTextColor(56, 142, 60);
        pdf.text(`Pass Percentage: ${passPctVal}`, pageW / 2, pageH - 10, { align: 'center' });
      }

      // ===== Subject-wise Bar Chart =====
      if (selections.bar && barData && subjectNames.length > 0) {
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        addPageHeader('Subject-wise Pass/Fail');
        const barImg = await renderChartToImage('bar', barData, {
          plugins: { legend: { position: 'top', labels: { font: { size: 14 } } } },
          scales: {
            x: { stacked: true, ticks: { font: { size: 11 } } },
            y: { stacked: true, beginAtZero: true, ticks: { font: { size: 11 } } },
          },
        }, 900, 500);
        addChartImage(barImg, 900, 500);

        // ===== Subject-wise Table =====
        pdf.addPage();
        addPageHeader('Subject-wise Pass/Fail Percentage');
        // Adjusted column widths to prevent overlap
        const cols = ['Subject Code', 'Subject Name', 'Pass %', 'Fail %', '# Pass', '# Fail'];
        // Increase Subject Name width, slightly reduce others
        const colWidths = [28, 110, 22, 22, 18, 18];
        const tableW = colWidths.reduce((a, b) => a + b, 0);
        const tableStartX = (pageW - tableW) / 2;
        let tableY = contentTop + 5;
        const rowH = 8;

        // Table header
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        let hx = tableStartX;
        cols.forEach((col, i) => {
          pdf.setFillColor(66, 66, 66);
          pdf.rect(hx, tableY, colWidths[i], rowH, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.text(col, hx + 3, tableY + 6);
          hx += colWidths[i];
        });
        tableY += rowH;
        pdf.setFont(undefined, 'normal');

        const lineH = 4; // height per line of text in mm
        const cellPadTop = 3; // top padding inside cell
        const cellPadBot = 2; // bottom padding inside cell

        barData.labels.forEach((shortName, idx) => {
          const name = subjectNames[idx];
          const pass = barData.datasets[0].data[idx];
          const fail = barData.datasets[1].data[idx];
          const total = pass + fail;
          const pPct = total > 0 ? ((pass / total) * 100).toFixed(1) + '%' : 'N/A';
          const fPct = total > 0 ? ((fail / total) * 100).toFixed(1) + '%' : 'N/A';
          const rowData = [subjectCodeMap[name] || shortName, name, pPct, fPct, String(pass), String(fail)];

          // Pre-calculate wrapped lines for subject name to determine dynamic row height
          const nameLines = pdf.splitTextToSize(String(name), colWidths[1] - 6);
          const dynamicRowH = Math.max(rowH, cellPadTop + nameLines.length * lineH + cellPadBot);

          if (tableY + dynamicRowH > pageH - 15) {
            pdf.addPage();
            addPageHeader('Subject-wise Pass/Fail Percentage (contd.)');
            tableY = contentTop + 5;
            // Re-draw header
            pdf.setFont(undefined, 'bold');
            let hx2 = tableStartX;
            cols.forEach((col, i) => {
              pdf.setFillColor(66, 66, 66);
              pdf.rect(hx2, tableY, colWidths[i], rowH, 'F');
              pdf.setTextColor(255, 255, 255);
              pdf.text(col, hx2 + 3, tableY + 6);
              hx2 += colWidths[i];
            });
            tableY += rowH;
            pdf.setFont(undefined, 'normal');
          }

          // Alternating row bg
          if (idx % 2 === 0) {
            pdf.setFillColor(245, 247, 250);
            pdf.rect(tableStartX, tableY, tableW, dynamicRowH, 'F');
          }
          // Draw row border
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(tableStartX, tableY, tableW, dynamicRowH, 'S');

          // Vertical center offset for single-line cells in a taller row
          const singleLineY = tableY + (dynamicRowH + lineH) / 2;

          let rx = tableStartX;
          rowData.forEach((cell, i) => {
            if (i === 2) pdf.setTextColor(56, 142, 60);
            else if (i === 3) pdf.setTextColor(211, 47, 47);
            else if (i === 4) pdf.setTextColor(56, 142, 60);
            else if (i === 5) pdf.setTextColor(211, 47, 47);
            else pdf.setTextColor(33, 33, 33);
            if (i === 1) {
              // Render wrapped subject name lines
              nameLines.forEach((line, li) => {
                pdf.text(line, rx + 3, tableY + cellPadTop + (li + 1) * lineH);
              });
            } else {
              pdf.text(String(cell).substring(0, 45), rx + 3, singleLineY);
            }
            rx += colWidths[i];
          });
          tableY += dynamicRowH;
        });
      }

      // ===== Department-wise Bar Chart (optional) =====
      if (selections.dept) {
      if (!isFirstPage) pdf.addPage();
      isFirstPage = false;
      addPageHeader('Department-wise Result Data');
      // Plugin to draw data labels on each bar
      const deptBarLabelsPlugin = {
        id: 'deptBarLabelsPdf',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, dsIndex) => {
            const meta = chart.getDatasetMeta(dsIndex);
            if (!meta.hidden) {
              meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value === 0 || value === undefined) return;
                const isPassingPct = dataset.label === 'Passing%';
                const label = isPassingPct ? `${value}%` : String(value);
                ctx.save();
                ctx.fillStyle = '#222';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(label, bar.x, bar.y - 3);
                ctx.restore();
              });
            }
          });
        }
      };
      const deptImg = await renderChartToImage('bar', deptChartData, {
        plugins: { legend: { position: 'top', labels: { font: { size: 14 } } } },
        scales: {
          x: { ticks: { font: { size: 12 } } },
          y: { beginAtZero: true, title: { display: true, text: 'Count / %' }, ticks: { font: { size: 11 } } },
        },
      }, 900, 500, [deptBarLabelsPlugin]);
      addChartImage(deptImg, 900, 500);
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Note: "FCD" = First Class with Distinction (>=70%)', pageW / 2, pageH - 8, { align: 'center' });
      }

      // File name
      let collegeLabel = 'BLDE';
      pdf.save(`charts_sem${sem}_${collegeLabel}_${branch || 'all'}_${batch || 'all'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Chart feature toggle state
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar' or 'dept'

  // --- Chart Loading and network state logic ---
  const [chartLoading, setChartLoading] = React.useState(false);
  const [networkStatus, setNetworkStatus] = React.useState(navigator.onLine);
  const loadingTimeout = React.useRef(null);

  React.useEffect(() => {
    function handleOnline() { setNetworkStatus(true); }
    function handleOffline() { setNetworkStatus(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (chartType === 'pie') {
      setChartLoading(true);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      // If data loads within 2s, chartLoading will be set to false below
      loadingTimeout.current = setTimeout(() => {
        setChartLoading(false);
      }, 2000); // 2 seconds for slow network
    } else {
      setChartLoading(false);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    }
    // eslint-disable-next-line
  }, [chartType, passFailStats.pass, passFailStats.fail]);

  React.useEffect(() => {
    // If data is available, stop loading
    if (chartType === 'pie' && (passFailStats.pass > 0 || passFailStats.fail > 0)) {
      setChartLoading(false);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    }
  }, [passFailStats, chartType]);
  // Department-wise (branch-wise) result chart data
  // Only for current semester, all branches, all batches
  const deptChartData = React.useMemo(() => {
    const semKey = String(sem);
    // Group students by branch, filter by batch
    const branchMap = {};
    let totalAppeared = 0, totalPassed = 0, totalFCD = 0;
    // Helper to get short name from branch name
    function getShortBranchName(name) {
      if (!name) return 'Unknown';
      // Use first letters of each word, or first 3 letters if single word
      const words = name.split(' ');
      if (words.length === 1) return name.slice(0, 3).toUpperCase();
      return words.map(w => w[0].toUpperCase()).join('');
    }
    data.forEach(s => {
      if (batch && String(s.batch) !== String(batch)) return;
      if (!s.semesters || !s.semesters[semKey]) return;
      const branchName = s.branch || 'Unknown';
      const branchShort = getShortBranchName(branchName);
      if (!branchMap[branchShort]) {
        branchMap[branchShort] = { appeared: 0, passed: 0, fcd: 0 };
      }
      branchMap[branchShort].appeared++;
      totalAppeared++;
      // Count pass/fail for this student in this sem (fail if any subject is F/fail)
      const semSubjects = Object.values(s.semesters[semKey] || {});
      const hasFail = semSubjects.some(subj => {
        const { result } = getSubjectMarks(subj, revalMode);
        const res = (result || '').trim().toLowerCase();
        return res === 'f' || res.includes('fail');
      });
      if (!hasFail) {
        branchMap[branchShort].passed++;
        totalPassed++;
        // FCD: overall percentage for this sem >= 70 (account for 200-mark subjects)
        let totalMarks = 0;
        let maxMarksSum = 0;
        semSubjects.forEach(subj => {
          const { total } = getSubjectMarks(subj, revalMode);
          const marks = Number(total);
          if (!isNaN(marks)) {
            totalMarks += marks;
            // If marks > 100, subject is out of 200
            maxMarksSum += (marks > 100 ? 200 : 100);
          }
        });
        const percentage = maxMarksSum > 0 ? (totalMarks / maxMarksSum) * 100 : 0;
        if (percentage >= 70) {
          branchMap[branchShort].fcd++;
          totalFCD++;
        }
      }
    });
    // Prepare chart data arrays
    const branchShortNames = Object.keys(branchMap).sort();
    const appearedArr = branchShortNames.map(b => branchMap[b].appeared);
    const passedArr = branchShortNames.map(b => branchMap[b].passed);
    const fcdArr = branchShortNames.map(b => branchMap[b].fcd);
    const passingPctArr = branchShortNames.map(b => branchMap[b].appeared > 0 ? Math.round((branchMap[b].passed / branchMap[b].appeared) * 100) : 0);
    // Add total column
    branchShortNames.push('Total');
    appearedArr.push(totalAppeared);
    passedArr.push(totalPassed);
    fcdArr.push(totalFCD);
    passingPctArr.push(totalAppeared > 0 ? Math.round((totalPassed / totalAppeared) * 100) : 0);
    return {
      labels: branchShortNames,
      datasets: [
        {
          label: 'Appeared',
          data: appearedArr,
          backgroundColor: '#0f172a', // Navy
        },
        {
          label: 'Passed',
          data: passedArr,
          backgroundColor: '#0d9488', // Teal
        },
        {
          label: 'FCD',
          data: fcdArr,
          backgroundColor: '#7c3aed', // Purple
        },
        {
          label: 'Passing%',
          data: passingPctArr,
          backgroundColor: '#f59e0b', // Amber
        },
      ],
    };
  }, [data, sem, batch, revalMode]);

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 6 }}>
      {loading ? (
        <Card sx={{ p: 4, borderRadius: 4, boxShadow: 3 }}>
          <Box p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
            <CircularProgress size={60} thickness={5} sx={{ color: '#1e40af', mb: 3 }} />
            <Typography variant="h6" sx={{ color: '#1e40af', mt: 2 }}>
              Loading Teachers Corner...
            </Typography>
          </Box>
        </Card>
      ) : (
      <Card sx={{ p: 4, borderRadius: 4, boxShadow: 3 }}>
        <Box display="flex" justifyContent="flex-end" alignItems="center" mb={1}>
          <button
            style={{
              padding: '6px 24px',
              borderRadius: 8,
              border: '2px solid #1e40af',
              background: revalMode === 'after' ? '#1e40af' : '#ffffff',
              color: revalMode === 'after' ? '#fff' : '#1e40af',
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 160,
              transition: 'all 0.2s',
            }}
            onClick={() => setRevalMode(revalMode === 'after' ? 'before' : 'after')}
            title={revalMode === 'after' ? 'Click to view before reval' : 'Click to view after reval'}
          >
            {revalMode === 'after' ? 'After Reval (ON)' : 'After Reval (OFF)'}
          </button>
        </Box>
        <Typography variant="h4" align="center" gutterBottom>
          Teachers Corner
        </Typography>
        <Box display="flex" gap={2} mb={3}>

          <FormControl fullWidth>
            <InputLabel>Batch</InputLabel>
            <Select value={batch} label="Batch" onChange={(e) => setBatch(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {batches.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {chartType !== 'dept' && (
            <FormControl fullWidth>
              <InputLabel>Branch</InputLabel>
              <Select value={branch} label="Branch" onChange={(e) => setBranch(e.target.value)}>
                {chartType !== 'bar' && <MenuItem value="">All</MenuItem>}
                {branches.map((b) => (
                  <MenuItem key={b} value={b}>
                    {b}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth>
            <InputLabel>Semester</InputLabel>
            <Select value={sem} label="Semester" onChange={(e) => setSem(Number(e.target.value))}>
              {Array.from(
                new Set(
                  data
                    .filter(s =>
                      (batch ? String(s.batch) === String(batch) : true) &&
                      (branch ? s.branch === branch : true)
                    )
                    .flatMap(s => Object.keys(s.semesters || {}))
                )
              )
                .map(Number)
                .filter(n => Number.isInteger(n) && n >= 1 && n <= 8)
                .sort((a, b) => a - b)
                .map(n => (
                  <MenuItem key={n} value={n}>
                    Sem {n}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>
        {/* Chart Feature Toggle Buttons + Export Button (scrollable on mobile) */}
        <Box
          display="flex"
          justifyContent={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
          mb={3}
          sx={{
            overflowX: { xs: 'auto', sm: 'visible' },
            WebkitOverflowScrolling: { xs: 'touch', sm: 'auto' },
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            // Hide scrollbar for mobile (optional, for better UX)
            '&::-webkit-scrollbar': { display: { xs: 'none', sm: 'block' } },
            msOverflowStyle: { xs: 'none', sm: 'auto' },
            scrollbarWidth: { xs: 'none', sm: 'auto' },
            // Add a subtle scroll indicator line below on mobile
            borderBottom: { xs: '2px solid #bdbdbd', sm: 'none' },
            boxShadow: { xs: '0 2px 4px -2px #bdbdbd', sm: 'none' },
          }}
        >
          {/* Define a common width for all buttons */}
          {(() => {
            const buttonWidth = 220;
            const activeStyle = (isActive) => ({
              padding: '8px 24px',
              borderRadius: 8,
              border: isActive ? '2px solid #1e40af' : '1px solid #cbd5e1',
              background: isActive ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' : '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              color: isActive ? '#ffffff' : '#475569',
              boxShadow: isActive ? '0 4px 12px rgba(15,23,42,0.2)' : 'none',
              minWidth: buttonWidth,
              maxWidth: buttonWidth,
              width: buttonWidth,
              marginRight: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            });
            return <>
              <button
                style={activeStyle(chartType === 'pie')}
                onClick={() => setChartType('pie')}
              >
                Overall Pass/Fail
              </button>
              <button
                style={activeStyle(chartType === 'bar')}
                onClick={() => setChartType('bar')}
              >
                Subject-wise Pass/Fail
              </button>
              <button
                style={activeStyle(chartType === 'dept')}
                onClick={() => setChartType('dept')}
              >
                Department-wise Result
              </button>
              <button
                onClick={() => setShowExportDialog(true)}
                style={{
                  padding: '8px 24px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', // Teal variant for distinct action
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#ffffff',
                  border: 'none',
                  minWidth: buttonWidth,
                  maxWidth: buttonWidth,
                  width: buttonWidth,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(13,148,136,0.2)',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Export to Excel
              </button>
              <button
                onClick={() => setShowPdfExportDialog(true)}
                disabled={exportingPdf}
                style={{
                  padding: '8px 24px',
                  background: exportingPdf ? '#e2e8f0' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', // Purple variant for distinct action
                  fontWeight: 700,
                  cursor: exportingPdf ? 'not-allowed' : 'pointer',
                  color: '#ffffff',
                  border: 'none',
                  minWidth: buttonWidth,
                  maxWidth: buttonWidth,
                  width: buttonWidth,
                  whiteSpace: 'nowrap',
                  boxShadow: exportingPdf ? 'none' : '0 4px 12px rgba(124,58,237,0.2)',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => !exportingPdf && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !exportingPdf && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {exportingPdf ? 'Exporting...' : 'Export Charts PDF'}
              </button>
            </>;
          })()}
        </Box>

        {/* PDF Chart Export Selection Dialog */}
        {showPdfExportDialog && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 2px 16px #0002', minWidth: 340 }}>
              <h3 style={{ marginBottom: 16 }}>Select Charts to Export</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={pdfChartSelections.pie} onChange={e => setPdfChartSelections(prev => ({ ...prev, pie: e.target.checked }))} />
                  Overall Pass/Fail (Pie Chart)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={pdfChartSelections.bar} onChange={e => setPdfChartSelections(prev => ({ ...prev, bar: e.target.checked }))} />
                  Subject-wise Pass/Fail (Bar Chart + Table)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={pdfChartSelections.dept} onChange={e => setPdfChartSelections(prev => ({ ...prev, dept: e.target.checked }))} />
                  Department-wise Result
                </label>
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button
                  style={{ padding: '8px 24px', borderRadius: 8, background: '#e0e7ef', color: '#222', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowPdfExportDialog(false)}
                >
                  Cancel
                </button>
                <button
                  style={{ padding: '8px 24px', borderRadius: 8, background: '#1e40af', color: '#fff', fontWeight: 700, border: 'none', cursor: pdfChartSelections.pie || pdfChartSelections.bar || pdfChartSelections.dept ? 'pointer' : 'not-allowed', opacity: pdfChartSelections.pie || pdfChartSelections.bar || pdfChartSelections.dept ? 1 : 0.5 }}
                  disabled={!pdfChartSelections.pie && !pdfChartSelections.bar && !pdfChartSelections.dept}
                  onClick={() => { setShowPdfExportDialog(false); handleExportChartsPDF(pdfChartSelections); }}
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Dialog */}
        {showExportDialog && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 2px 16px #0002', minWidth: 320 }}>
              <h3 style={{ marginBottom: 16 }}>Export Results to Excel</h3>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button
                  style={{ padding: '8px 24px', borderRadius: 8, background: '#e0e7ef', color: '#222', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowExportDialog(false)}
                >
                  Cancel
                </button>
                <button
                  style={{ padding: '8px 24px', borderRadius: 8, background: '#1e40af', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  onClick={() => { setShowExportDialog(false); setTimeout(() => handleExportExcel(false), 100); }}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conditionally Render Chart Feature */}
        {/* Calculate total students for selected sem and branch */}
        {(() => {
          // --- End loading/network logic ---
          const semKey = String(sem);
          const included = data.filter(
            (s) => (branch ? s.branch === branch : true) && (batch ? String(s.batch) === String(batch) : true) && s.semesters && s.semesters[semKey]
          );
          const excluded = data.filter(
            (s) => (branch ? s.branch === branch : true) && (batch ? String(s.batch) === String(batch) : true) && (!s.semesters || !s.semesters[semKey])
          );
          const totalStudents = included.length;
          if (chartType === 'pie') {
            return (
              <>
                <Typography align="center" sx={{ fontWeight: 700, color: '#1e40af', mb: 1 }}>
                  Total Students: {totalStudents}
                </Typography>
                <Box>
                  {!networkStatus ? (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ mt: 4 }}>
                      <div className="loading-spinner" style={{ marginBottom: 12 }}>
                        <svg width="48" height="48" viewBox="0 0 50 50">
                          <circle cx="25" cy="25" r="20" fill="none" stroke="#1e40af" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                          </circle>
                        </svg>
                      </div>
                      <Typography align="center" color="text.secondary">No internet connection. Please check your network.</Typography>
                    </Box>
                  ) : chartLoading ? (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ mt: 4 }}>
                      <div className="loading-spinner" style={{ marginBottom: 12 }}>
                        <svg width="48" height="48" viewBox="0 0 50 50">
                          <circle cx="25" cy="25" r="20" fill="none" stroke="#1e40af" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                          </circle>
                        </svg>
                      </div>
                      <Typography align="center" color="text.secondary">Loading data, please wait...</Typography>
                    </Box>
                  ) : (passFailStats.pass > 0 || passFailStats.fail > 0) ? (
                    <Pie ref={pieChartRef} data={pieData} />
                  ) : (
                    <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
                      No data to display for the selected filters.
                    </Typography>
                  )}
                </Box>
                <Typography align="center" mt={2}>
                  Pass: {passFailStats.pass} | Fail: {passFailStats.fail}
                </Typography>
                <Typography align="center" mt={1} sx={{ fontWeight: 700, color: '#1e40af' }}>
                  {passFailStats.pass + passFailStats.fail > 0
                    ? `Pass Percentage: ${((passFailStats.pass / (passFailStats.pass + passFailStats.fail)) * 100).toFixed(2)}%`
                    : 'Pass Percentage: N/A'}
                </Typography>
              </>
            );
          } else if (chartType === 'dept') {
            // Department-wise result chart (like the image)
            return (
              <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                <Typography align="center" sx={{ fontWeight: 700, color: '#1e40af', mb: 1, fontSize: 22 }}>
                  Department-wise Result Data
                </Typography>
                <Box
                  sx={{
                    width: { xs: 320, sm: 500 },
                    height: { xs: 220, sm: 400 },
                  }}
                >
                  <Bar
                    ref={deptChartRef}
                    data={deptChartData}
                    plugins={[{
                      id: 'deptBarLabels',
                      afterDatasetsDraw(chart) {
                        const { ctx } = chart;
                        chart.data.datasets.forEach((dataset, dsIndex) => {
                          const meta = chart.getDatasetMeta(dsIndex);
                          if (!meta.hidden) {
                            meta.data.forEach((bar, index) => {
                              const value = dataset.data[index];
                              if (value === 0 || value === undefined) return;
                              const isPassingPct = dataset.label === 'Passing%';
                              const label = isPassingPct ? `${value}%` : String(value);
                              const isMobile = window.innerWidth <= 600;
                              ctx.save();
                              ctx.fillStyle = '#222';
                              ctx.font = `bold ${isMobile ? 8 : 11}px sans-serif`;
                              ctx.textAlign = 'center';
                              ctx.textBaseline = 'bottom';
                              ctx.fillText(label, bar.x, bar.y - 2);
                              ctx.restore();
                            });
                          }
                        });
                      }
                    }]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            font: {
                              size: 10,
                            },
                            ...((window.innerWidth <= 600) ? { font: { size: 10 } } : {}),
                          },
                        },
                        tooltip: {
                          bodyFont: { size: window.innerWidth <= 600 ? 10 : 12 },
                          titleFont: { size: window.innerWidth <= 600 ? 11 : 14 },
                        },
                      },
                      scales: {
                        x: {
                          stacked: false,
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                            maxRotation: 45,
                            minRotation: 0,
                          },
                        },
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'Count / %' },
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                          },
                        },
                      },
                      barPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                      categoryPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                    }}
                    height={window.innerWidth <= 600 ? 220 : 400}
                    width={window.innerWidth <= 600 ? 320 : 700}
                  />
                </Box>
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Note: "FCD" = First Class with Distinction (all subjects ≥ 70)
                  </Typography>
                </Box>
              </Box>
            );
          } else if (chartType === 'bar') {
            if (!branch) {
              return (
                <Box mt={4} display="flex" flexDirection="column" alignItems="center">
                  <Typography align="center" color="text.secondary" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Please select a branch to view subject-wise pass/fail statistics.
                  </Typography>
                </Box>
              );
            }
            if (subjectNames.length === 0) return null;
            return (
              <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                <Typography align="center" sx={{ fontWeight: 700, color: '#1e40af', mb: 1 }}>
                  Total Students: {totalStudents}
                </Typography>
                <Typography variant="h6" align="center" mb={2}>
                  Subject-wise Pass/Fail
                </Typography>
                <Box
                  sx={{
                    width: { xs: 320, sm: 500 },
                    height: { xs: 280, sm: 500 },
                  }}
                >
                  <Bar
                    ref={barChartRef}
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            font: {
                              size: 10,
                            },
                            // Reduce legend font size on mobile
                            ...((window.innerWidth <= 600) ? { font: { size: 10 } } : {}),
                          },
                        },
                        tooltip: {
                          callbacks: {
                            title: function(context) {
                              const idx = context[0].dataIndex;
                              return subjectNames[idx] || '';
                            }
                          },
                          bodyFont: { size: window.innerWidth <= 600 ? 10 : 12 },
                          titleFont: { size: window.innerWidth <= 600 ? 11 : 14 },
                        },
                      },
                      scales: {
                        x: {
                          stacked: true,
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                            maxRotation: 45,
                            minRotation: 0,
                          },
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                          },
                        },
                      },
                      barPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                      categoryPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                    }}
                    height={window.innerWidth <= 600 ? 280 : 500}
                    width={window.innerWidth <= 600 ? 320 : 500}
                  />
                </Box>
                {/* Subject-wise Pass/Fail Percentage Table */}
                <Box mt={4} sx={{ width: '100%', maxWidth: 600, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Typography variant="subtitle1" align="center" mb={1} fontWeight={700}>
                    Subject-wise Pass/Fail Percentage
                  </Typography>
                  <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#e3e8ee' }}>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>Subject Code</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>Subject</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>Pass %</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>Fail %</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}># Pass</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}># Fail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {barData.labels.map((shortName, idx) => {
                        const name = subjectNames[idx];
                        const pass = barData.datasets[0].data[idx];
                        const fail = barData.datasets[1].data[idx];
                        const total = pass + fail;
                        const passPct = total > 0 ? ((pass / total) * 100).toFixed(2) : 'N/A';
                        const failPct = total > 0 ? ((fail / total) * 100).toFixed(2) : 'N/A';
                        return (
                          <tr key={shortName} title={name}>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}>{subjectCodeMap[name] || shortName}</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}>{name}</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#388e3c', fontWeight: 700 }}>{passPct}%</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#d32f2f', fontWeight: 700 }}>{failPct}%</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#388e3c', fontWeight: 700 }}>{pass}</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#d32f2f', fontWeight: 700 }}>{fail}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
              </Box>
            );
          }
          return null;
        })()}
      </Card>
      )}
    </Box>
  );
};

export default TeachersCorner;
