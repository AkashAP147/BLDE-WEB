import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Card } from "@mui/material";
import { Pie, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

const TeachersCorner = () => {
  // Export filtered results to Excel (now inside component for state access)
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [highlightFail, setHighlightFail] = useState(false);

  const handleExportExcel = (highlight = false) => {
    const semKey = String(sem);
    const filtered = data.filter(
      (s) => (branch ? s.branch === branch : true) && (batch ? String(s.batch) === String(batch) : true) && s.semesters && s.semesters[semKey]
    );
    // Collect all subject codes, short names, and long names for this sem (for consistent columns and reference)
    const subjectMap = {};
    const backlogSubjectMap = {};
    // Only include subject codes that are present for at least one student in the current sem (and not failed in previous sems)
    let presentSubjectCodes = new Set();
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      Object.values(semSubjects).forEach(subj => {
        let code = subj.subject_code || (subj.subject_name ? subj.subject_name.split(' ').map(w => w[0]).join('').toUpperCase() : '');
        // Check if this subject is a backlog subject for this student (failed in previous sems)
        let isBacklog = false;
        if (parseInt(semKey) > 1) {
          Object.entries(s.semesters || {}).forEach(([semNum, subjects]) => {
            if (semNum !== semKey && parseInt(semNum) < parseInt(semKey)) {
              Object.values(subjects || {}).forEach(subjPrev => {
                const res = (subjPrev.result || '').trim().toLowerCase();
                let codePrev = subjPrev.subject_code || (subjPrev.subject_name ? subjPrev.subject_name.split(' ').map(w => w[0]).join('').toUpperCase() : '');
                if ((res === 'f' || res.includes('fail')) && codePrev === code) {
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
    if (parseInt(semKey) > 1) {
      filtered.forEach((s) => {
        // Find failed subjects in previous semesters
        let failedPrev = [];
        let backlogRow = {
          Name: s.name,
          USN: s.usn,
          Branch: s.branch,
          Batch: s.batch,
          Semester: semKey,
        };
        // Collect only the failed subjects for this student
        Object.entries(s.semesters || {}).forEach(([semNum, subjects]) => {
          if (semNum !== semKey && parseInt(semNum) < parseInt(semKey)) {
            Object.values(subjects || {}).forEach(subj => {
              const res = (subj.result || '').trim().toLowerCase();
              if (res === 'f' || res.includes('fail')) {
                let code = subj.subject_code || (subj.subject_name ? subj.subject_name.split(' ').map(w => w[0]).join('').toUpperCase() : '');
                failedPrev.push({
                  code,
                  name: subj.subject_name,
                  sem: semNum,
                  marks: subj.total || '',
                });
                // Ensure backlogSubjectMap is populated for subject reference
                if (!backlogSubjectMap[code]) {
                  backlogSubjectMap[code] = {
                    code,
                    short: code,
                    long: subj.subject_name,
                  };
                }
              }
            });
          }
        });
        if (failedPrev.length > 0) {
          // Only add columns for failed subjects for this student
          failedPrev.forEach(f => {
            backlogRow[`${f.code} (Sem ${f.sem})`] = f.marks;
          });
          backlogRow['Failed Subjects'] = failedPrev.map(f => `${f.code} (Sem ${f.sem})`).join(', ');
          backlogRows.push(backlogRow);
        }
      });
    }
    // Main results
    filtered.forEach((s) => {
      const semSubjects = s.semesters[semKey] || {};
      // Ensure USN is always present, fallback to key if missing
      const usnValue = s.usn || (s.USN ? s.USN : "");
      const row = {
        Name: s.name,
        USN: usnValue,
        Branch: s.branch,
        Batch: s.batch,
        Semester: semKey,
      };
      let totalMarks = 0;
      let subjectCount = 0;
      // Only include main subjects (those present in current sem and not failed in previous sems)
      subjectList.forEach(code => {
        // Always show marks for each subject (including backlog), using latest available attempt
        let latestMarks = '';
        let found = false;
        // Search from highest semester to lowest for latest attempt
        const semKeys = Object.keys(s.semesters || {}).sort((a, b) => parseInt(b) - parseInt(a));
        for (let i = 0; i < semKeys.length; ++i) {
          const semNum = semKeys[i];
          const subjects = Object.values(s.semesters[semNum] || {});
          const subj = subjects.find(x => (x.subject_code || (x.subject_name ? x.subject_name.split(' ').map(w => w[0]).join('').toUpperCase() : '')) === code);
          if (subj && subj.total !== undefined && subj.total !== null && subj.total !== "") {
            latestMarks = subj.total;
            found = true;
            // Only count towards totalMarks/subjectCount if in current semester
            if (semNum === semKey) {
              totalMarks += Number(subj.total);
              subjectCount++;
            }
            break;
          }
        }
        row[code] = found ? latestMarks : 'NA';
      });
      const failedSubjects = Object.values(semSubjects)
        .filter(subj => {
          const res = (subj.result || '').trim().toLowerCase();
          return res === 'f' || res.includes('fail');
        })
        .map(subj => subj.subject_code || (subj.subject_name ? subj.subject_name.split(' ').map(w => w[0]).join('').toUpperCase() : ''));
      row['Result'] = failedSubjects.length > 0 ? 'Fail' : 'Pass';
      row['Percentage'] = subjectCount > 0 ? ((totalMarks / (subjectCount * 100)) * 100).toFixed(2) : '';
      row['Failed Subjects'] = failedSubjects.join(', ');
      rows.push(row);
    });
    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    // Add backlog sheet only if there are failed students in previous sems
    if (backlogRows.length > 0) {
      // Dynamically generate columns for each row, so only the student's failed subjects appear as columns
      // This is achieved by converting each row to an array and using aoa_to_sheet
      const backlogHeaders = [
        'Name', 'USN', 'Branch', 'Batch', 'Semester', 'Failed Subjects'
      ];
      // Find all unique subject columns for all students (for ordering, but only include if present in a row)
      let allSubjectCols = new Set();
      backlogRows.forEach(row => {
        Object.keys(row).forEach(key => {
          if (!backlogHeaders.includes(key) && key !== 'Failed Subjects') {
            allSubjectCols.add(key);
          }
        });
      });
      // But for each row, only include columns that exist for that student
      const aoa = [
        [...backlogHeaders, ...Array.from(allSubjectCols)]
      ];
      backlogRows.forEach(row => {
        const arr = backlogHeaders.map(h => row[h] || '');
        // Only add subject columns for this row if present
        Array.from(allSubjectCols).forEach(subjCol => {
          arr.push(row[subjCol] || '');
        });
        aoa.push(arr);
      });
      const wsBacklog = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, wsBacklog, "Backlog Subjects");
    }
    // Add reference sheet for subject codes
    const refRows = [
      ...subjectList.map(code => ({ Code: code, 'Subject Name': subjectMap[code].long, Type: 'Main' })),
      ...Object.keys(backlogSubjectMap).map(code => ({ Code: code, 'Subject Name': backlogSubjectMap[code].long, Type: 'Backlog' })),
    ];
    const wsRef = XLSX.utils.json_to_sheet(refRows);
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

  useEffect(() => {
    // Fetch all students data
    const studentsRef = ref(db, "students");
    onValue(studentsRef, (snapshot) => {
      const val = snapshot.val() || {};
      // Map each student object to include USN from the key if missing
      const arr = Object.entries(val).map(([usn, s]) => ({ usn: s.usn || usn, ...s }));
      setData(arr);
      // Extract unique batches and branches (sort for dropdown)
      setBatches([...new Set(arr.map((s) => String(s.batch)))].sort());
      setBranches([...new Set(arr.map((s) => s.branch))].sort());
    });
  }, []);

  useEffect(() => {
    // Calculate pass/fail for selected sem, branch, batch
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
        // Match Dashboard logic: fail if any subject is F or contains 'fail' (case-insensitive)
        const hasFail = mainSubjects.some(subj => {
          const res = (subj.result || '').trim().toLowerCase();
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
  }, [sem, branch, batch, data]);

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
      // Only include subjects from the main result table (not previous attempts/backlogs)
      // For each subject in the current semester, check if it is not a backlog
      const semSubjects = Object.values(s.semesters?.[semKey] || {});
      // Find subjects that are not repeated from previous failed attempts
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
      semSubjects.forEach(subj => {
        // Exclude subjects that are repeated from previous failed attempts
        if (!previousAttempts.includes(subj.subject_name)) {
          subjectCount[subj.subject_name] = (subjectCount[subj.subject_name] || 0) + 1;
        }
      });
    });
    // Only include subjects present in at least 20% of filtered students for the selected semester
    // Include all subjects present in the main result table for the selected semester, exclude rare subjects
    const minCount = Math.max(2, Math.floor(filtered.length * 0.2));
    subjectNames = Object.keys(subjectCount).filter(name => subjectCount[name] >= minCount);
    // For each subject, count pass/fail (only for first passing attempt, exclude previous backlog)
    const subjectPassFail = subjectNames.map(name => {
      let pass = 0, fail = 0;
      filtered.forEach(s => {
        const mainSubj = Object.values(s.semesters[semKey] || {}).find(subj => subj.subject_name === name);
        if (mainSubj) {
          const res = (mainSubj.result || '').trim().toLowerCase();
          if (res === 'f' || res.includes('fail')) fail++;
          else if (res) pass++;
        }
      });
      return { name, pass, fail };
    });
    barData = {
      labels: subjectNames,
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

  // Chart feature toggle state
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 6 }}>
      <Card sx={{ p: 4, borderRadius: 4, boxShadow: 3 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Teachers Corner
        </Typography>
        <Box display="flex" gap={2} mb={3}>
          <FormControl fullWidth>
            <InputLabel>Semester</InputLabel>
            <Select value={sem} label="Semester" onChange={(e) => setSem(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <MenuItem key={n} value={n}>
                  Sem {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Branch</InputLabel>
            <Select value={branch} label="Branch" onChange={(e) => setBranch(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
        </Box>
        {/* Chart Feature Toggle Buttons */}
        {/* Chart Feature Toggle Buttons + Export Button */}
        <Box display="flex" justifyContent="center" gap={2} mb={3}>
          <button
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: chartType === 'pie' ? '2px solid #4caf50' : '1px solid #ccc',
              background: chartType === 'pie' ? '#e8f5e9' : '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              color: chartType === 'pie' ? '#256029' : '#222',
            }}
            onClick={() => setChartType('pie')}
          >
            Overall Pass/Fail
          </button>
          <button
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: chartType === 'bar' ? '2px solid #1976d2' : '1px solid #ccc',
              background: chartType === 'bar' ? '#e3f2fd' : '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              color: chartType === 'bar' ? '#0d47a1' : '#222',
            }}
            onClick={() => setChartType('bar')}
          >
            Subject-wise Pass/Fail
          </button>
          <button
            onClick={() => setShowExportDialog(true)}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: '2px solid #1976d2',
              background: '#e3f2fd',
              fontWeight: 700,
              cursor: 'pointer',
              color: '#0d47a1',
            }}
          >
            Export to Excel
          </button>
        </Box>

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
                  style={{ padding: '8px 24px', borderRadius: 8, background: '#1976d2', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
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
                <Typography align="center" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                  Total Students: {totalStudents}
                </Typography>
                <Box>
                  {(passFailStats.pass > 0 || passFailStats.fail > 0) ? (
                    <Pie data={pieData} />
                  ) : (
                    <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
                      No data to display for the selected filters.
                    </Typography>
                  )}
                </Box>
                <Typography align="center" mt={2}>
                  Pass: {passFailStats.pass} | Fail: {passFailStats.fail}
                </Typography>
                <Typography align="center" mt={1} sx={{ fontWeight: 700, color: '#38bdf8' }}>
                  {passFailStats.pass + passFailStats.fail > 0
                    ? `Pass Percentage: ${((passFailStats.pass / (passFailStats.pass + passFailStats.fail)) * 100).toFixed(2)}%`
                    : 'Pass Percentage: N/A'}
                </Typography>
                {/* Debug: Show included and excluded students */}
                {/* ...removed included/excluded students debug section... */}
              </>
            );
          } else if (chartType === 'bar' && subjectNames.length > 0) {
            return (
              <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                <Typography align="center" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                  Total Students: {totalStudents}
                </Typography>
                <Typography variant="h6" align="center" mb={2}>
                  Subject-wise Pass/Fail
                </Typography>
                <Box sx={{ width: 500, height: 500 }}>
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top' } },
                      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                    }}
                    height={500}
                    width={500}
                  />
                </Box>
                {/* Subject-wise Pass/Fail Percentage Table */}
                <Box mt={4} sx={{ width: '100%', maxWidth: 600 }}>
                  <Typography variant="subtitle1" align="center" mb={1} fontWeight={700}>
                    Subject-wise Pass/Fail Percentage
                  </Typography>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#e3e8ee' }}>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>Subject</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>Pass %</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>Fail %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {barData.labels.map((name, idx) => {
                        const pass = barData.datasets[0].data[idx];
                        const fail = barData.datasets[1].data[idx];
                        const total = pass + fail;
                        const passPct = total > 0 ? ((pass / total) * 100).toFixed(2) : 'N/A';
                        const failPct = total > 0 ? ((fail / total) * 100).toFixed(2) : 'N/A';
                        return (
                          <tr key={name}>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}>{name}</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#388e3c', fontWeight: 700 }}>{passPct}%</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#d32f2f', fontWeight: 700 }}>{failPct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
                {/* Debug: Show included and excluded students */}
                <Box mt={3}>
                  <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 700 }}>Included Students ({included.length}):</Typography>
                  <ul style={{ maxHeight: 100, overflowY: 'auto', fontSize: 13, margin: 0, paddingLeft: 20 }}>
                    {included.map(s => <li key={s.usn || s.USN}>{s.name} ({s.usn || s.USN})</li>)}
                  </ul>
                  {excluded.length > 0 && <>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 700, mt: 2 }}>Excluded Students (no data for selected sem):</Typography>
                    <ul style={{ maxHeight: 100, overflowY: 'auto', fontSize: 13, margin: 0, paddingLeft: 20 }}>
                      {excluded.map(s => <li key={s.usn || s.USN}>{s.name} ({s.usn || s.USN})</li>)}
                    </ul>
                  </>}
                </Box>
              </Box>
            );
          }
          return null;
        })()}
      </Card>
      
    </Box>
  );
};

export default TeachersCorner;
