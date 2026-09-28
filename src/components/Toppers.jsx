import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useStudentData } from "../StudentDataContext";
import { ref, onValue, query, orderByKey, startAt, endAt } from "firebase/database";
import { normalizeStudents } from "../normalizeStudents";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
} from "@mui/material";

export default function Toppers() {
  const { students: cachedStudents, dbBranches } = useStudentData();
  const [toppers, setToppers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semFilter, setSemFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [allSems, setAllSems] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [expandedUsn, setExpandedUsn] = useState(null); // track which topper row is expanded
  const [searchQuery, setSearchQuery] = useState(""); // search by name or USN
  // dbBranches now comes from context

  useEffect(() => {
    if (!cachedStudents || Object.keys(cachedStudents).length === 0) return;
    {
      const students = cachedStudents;
      // Collect all unique semesters, batches, branches
      const semSet = new Set();
      const batchSet = new Set();
      const branchSet = new Set();
      Object.entries(students).forEach(([usn, data]) => {
        if (data.semesters) {
          Object.keys(data.semesters).forEach(sem => semSet.add(sem));
        }
        if (data.batch) batchSet.add(data.batch);
        if (data.branch) branchSet.add(data.branch);
      });
      // Filter semSet based on selected batch, branch
      let filteredSemSet = new Set();
      Object.entries(students).forEach(([usn, data]) => {
        if (
          (!batchFilter || data.batch === batchFilter) &&
          (!branchFilter || data.branch === branchFilter)
        ) {
          if (data.semesters) {
            Object.keys(data.semesters).forEach(sem => filteredSemSet.add(sem));
          }
        }
      });
      setAllSems(Array.from(filteredSemSet).sort((a, b) => Number(a) - Number(b)));
      setAllBatches(Array.from(batchSet).sort());
      setAllBranches(Array.from(branchSet).sort());

      // Flatten all semesters for all students
      let allToppers = [];
      Object.entries(students).forEach(([usn, data]) => {
        if (data.semesters) {
          const semList = Object.keys(data.semesters);
          Object.entries(data.semesters).forEach(([sem, subjects]) => {
            // Find previous failed attempts for this student/sem
            const currentSemIdx = semList.indexOf(sem);
            const currentSubjects = Object.values(subjects || {});
            const currentSubjectNames = currentSubjects.map(sub => sub.subject_name);
            let previousAttempts = [];
            for (let i = 0; i < currentSemIdx; ++i) {
              const prevSem = semList[i];
              const prevSubjects = Object.values(data.semesters[prevSem] || {});
              prevSubjects.forEach(subj => {
                const isFail = subj.result && (subj.result.trim().toUpperCase() === 'F' || subj.result.trim().toLowerCase().includes('fail'));
                if (currentSubjectNames.includes(subj.subject_name) && isFail) {
                  previousAttempts.push({ sem: prevSem, ...subj });
                }
              });
            }
            // Only use subjects not in previousAttempts
            const mainSubjects = Object.entries(subjects || {})
              .filter(([_, subj]) => {
                return !previousAttempts.some(
                  (prev) => prev.subject_name === subj.subject_name
                );
              })
              .map(([_, subj]) => subj);
            let total = mainSubjects.reduce(
              (sum, subj) => sum + (parseInt(subj.total) || 0),
              0
            );
            allToppers.push({
              usn,
              name: data.name,
              branch: data.branch_code || data.branch,
              batch: data.batch,
              sem,
              total,
            });
          });
        }
      });
      // Sort by total marks descending
      allToppers.sort((a, b) => b.total - a.total);
      setToppers(allToppers);
      setLoading(false);
    }
  }, [cachedStudents]);

  // Helper to calculate percentage like Dashboard (total/maxMarks for all subjects)
  const getPercentage = (topper, studentsMap) => {
    // Find the student in the DB (if available)
    // If not available, fallback to 800
    let maxMarks = 800;
    if (studentsMap && topper && topper.usn && topper.sem) {
      const student = studentsMap[topper.usn];
      if (student && student.semesters && student.semesters[topper.sem]) {
        const subjects = Object.values(student.semesters[topper.sem] || {});
        maxMarks = subjects.reduce((sum, subj) => {
          // If total > 100, treat as 200 marks subject (e.g., project)
          const t = parseInt(subj.total) || 0;
          return sum + (t > 100 ? 200 : 100);
        }, 0);
      }
    }
    if (!topper.total || isNaN(topper.total) || !maxMarks) return "-";
    return ((topper.total / maxMarks) * 100).toFixed(2);
  };

  // Store studentsMap for percentage calculation
  const [studentsMap, setStudentsMap] = useState({});

  useEffect(() => {
    if (cachedStudents && Object.keys(cachedStudents).length > 0) {
      setStudentsMap(cachedStudents);
    }
  }, [cachedStudents]);

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 1, sm: 6 }, px: { xs: 0.5, sm: 0 } }}>
      <Card
        sx={{
          mt: { xs: 0.5, sm: 4 },
          maxWidth: { xs: '100%', sm: 800 },
          width: { xs: '100%', sm: 'auto' },
          mx: 'auto',
          p: { xs: 0.5, sm: 4 },
          background: '#ffffff',
          border: { xs: 'none', sm: '1px solid #e2e8f0' },
          boxShadow: { xs: 'none', sm: '0 4px 24px rgba(0,0,0,0.06)' },
          borderRadius: { xs: 1, sm: 3 },
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: 800,
              color: '#1e40af',
              mb: { xs: 2, sm: 5 },
              fontSize: { xs: '1.4rem', sm: '2.125rem' },
            }}
          >
            Toppers
          </Typography>
          {/* Filters */}
          <Box mb={2} display="flex" flexWrap="wrap" gap={{ xs: 1, sm: 2 }} justifyContent="center" sx={{ px: { xs: 0.5, sm: 0 } }}>
            {/* Batch Filter */}
            <select
              value={batchFilter}
              onChange={e => {
                setBatchFilter(e.target.value);
                setBranchFilter("");
                setSemFilter("");
              }}
              style={{ width: 'auto', minWidth: 80, maxWidth: 130, flex: '1 1 auto', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, color: batchFilter ? '#000000' : '#353232', background: '#fff' }}
            >
              <option value="" disabled hidden>Batch</option>
              {Array.from(
                new Set(
                  toppers
                    .map(s => s.batch)
                )
              )
                .sort()
                .map(b => (
                  <option key={b} value={b}>{dbBranches[b?.toUpperCase()] || b}</option>
                ))}
            </select>
            {/* Branch Filter (filtered by batch) */}
            <select
              value={branchFilter}
              onChange={e => {
                setBranchFilter(e.target.value);
                setSemFilter("");
              }}
              style={{ width: 'auto', minWidth: 80, maxWidth: 150, flex: '1 1 auto', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, color: branchFilter ? '#000000' : '#353232', background: '#fff' }}
            >
              <option value="" disabled hidden>Branch</option>
              {Array.from(
                new Set(
                  toppers
                    .filter(s =>
                      (batchFilter ? s.batch === batchFilter : true)
                    )
                    .map(s => s.branch)
                    .filter(b => b && b !== "undefined" && b !== "null" && b.toLowerCase() !== "unknown")
                )
              )
                .sort()
                .map(b => (
                  <option key={b} value={b}>{dbBranches[b?.toUpperCase()] || b}</option>
                ))}
            </select>
            {/* Search Filter */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Name / USN"
              style={{ width: 'auto', minWidth: 100, flex: '1 1 auto', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', color: '#000', fontSize: 13, background: '#fff' }}
            />
          </Box>
          {/* Semester Filter - horizontal sliding window, mobile fix */}
          <Box mb={3} sx={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            px: { xs: 1, sm: 0 },
            pb: 1,
          }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                minWidth: 'max-content',
                gap: { xs: 1, sm: 1.5 },
                justifyContent: { xs: 'flex-start', sm: 'center' },
                alignItems: 'center',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {Array.from(
                new Set(
                  toppers
                    .filter(s =>
                      (batchFilter ? s.batch === batchFilter : true) &&
                      (branchFilter ? s.branch === branchFilter : true)
                    )
                    .map(s => s.sem)
                    .filter(s => {
                      const n = Number(s);
                      return Number.isInteger(n) && n >= 1 && n <= 8;
                    })
                )
              )
                .sort((a, b) => Number(a) - Number(b))
                .map(s => (
                  <button
                    key={s}
                    onClick={() => setSemFilter(s)}
                    style={{
                      minWidth: 56,
                      fontWeight: 700,
                      borderRadius: 8,
                      background: semFilter === s ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' : '#f1f5f9',
                      color: semFilter === s ? '#fff' : '#475569',
                      fontSize: 13,
                      padding: '6px 12px',
                      marginRight: 6,
                      border: semFilter === s ? 'none' : '1px solid #e2e8f0',
                      boxShadow: semFilter === s ? '0 2px 8px rgba(30,64,175,0.15)' : 'none',
                      transition: 'all 0.2s',
                      flex: '0 0 auto',
                      outline: semFilter === s ? '2px solid #1e40af' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Sem {s}
                  </button>
                ))}
            </Box>
          </Box>
          {loading ? (
            <Typography align="center">Loading...</Typography>
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <TableContainer
                component={Paper}
                sx={{
                  background: '#ffffff',
                  borderRadius: 3,
                  width: '100%',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  boxShadow: 0,
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 440,
                    width: '100%',
                    '& th, & td': {
                      padding: { xs: '5px 4px', sm: '8px 12px' },
                      fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>USN</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell>Semester</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      // First get the full ranked list (without search filter) to assign real ranks
                      const rankedList = toppers
                        .filter(s =>
                          (semFilter ? s.sem === semFilter : false) &&
                          (batchFilter ? s.batch === batchFilter : true) &&
                          (branchFilter ? s.branch === branchFilter : true)
                        )
                        .map((s, i) => ({ ...s, rank: i + 1 }));
                      // Then apply search filter for display, keeping original rank
                      return rankedList
                        .filter(s =>
                          searchQuery
                            ? (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (s.usn && s.usn.toLowerCase().includes(searchQuery.toLowerCase()))
                            : true
                        )
                        .map(s => (
                          <TableRow
                            key={s.usn + s.sem}
                            hover
                            onClick={() => setExpandedUsn(s.usn + '_' + s.sem)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>{s.rank}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.usn}</TableCell>
                            <TableCell>{dbBranches[s.branch?.toUpperCase()] || s.branch}</TableCell>
                            <TableCell>{s.sem}</TableCell>
                            <TableCell>{s.total}</TableCell>
                            <TableCell>{getPercentage(s, studentsMap)}%</TableCell>
                          </TableRow>
                        ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          {/* Popup Modal for Subject-wise Results */}
          {expandedUsn && (() => {
            const parts = expandedUsn.split('_');
            const usn = parts.slice(0, -1).join('_');
            const sem = parts[parts.length - 1];
            const student = studentsMap && studentsMap[usn];
            const semSubjects = student && student.semesters && student.semesters[sem]
              ? Object.entries(student.semesters[sem])
              : [];
            const name = student?.name || usn;
            return (
              <div
                onClick={() => setExpandedUsn(null)}
                style={{
                  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                  background: 'rgba(0,0,0,0.5)', zIndex: 1300,
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px 12px 28px',
                    boxShadow: '0 -4px 40px rgba(0,0,0,0.18)', maxWidth: 700, width: '100%',
                    maxHeight: '80vh', overflowY: 'auto', position: 'relative',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {/* Close X button */}
                  <button
                    onClick={() => setExpandedUsn(null)}
                    style={{
                      position: 'absolute', top: 10, right: 14,
                      background: 'none', border: 'none', fontSize: 26, fontWeight: 700,
                      color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: '2px 6px',
                      borderRadius: 6, transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#d32f2f'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e40af', mb: 0.5 }}>
                    {name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                    USN: {usn} &nbsp;|&nbsp; Semester {sem}
                  </Typography>
                  {semSubjects.length > 0 ? (
                    <TableContainer component={Paper} sx={{ boxShadow: 0, borderRadius: 2, overflowX: 'auto' }}>
                      <Table size="small" sx={{ '& th, & td': { padding: { xs: '4px 6px', sm: '6px 12px' } } }}>
                        <TableHead>
                          <TableRow sx={{ background: '#1e40af' }}>
                            <TableCell sx={{ fontWeight: 700, color: '#fff' }}>Subject Code</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#fff' }}>Subject Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#fff' }}>Internal</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#fff' }}>External</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#fff' }}>Total</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#fff' }}>Result</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {semSubjects.map(([code, subj]) => {
                            const res = (subj.result || '').trim().toUpperCase();
                            const isFail = res === 'F' || res.includes('FAIL');
                            return (
                              <TableRow key={code} sx={{ '&:nth-of-type(even)': { background: '#f8fafc' } }}>
                                <TableCell>{code}</TableCell>
                                <TableCell>{subj.subject_name || '-'}</TableCell>
                                <TableCell>{subj.internal ?? '-'}</TableCell>
                                <TableCell>{subj.external ?? '-'}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{subj.total ?? '-'}</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: isFail ? '#d32f2f' : '#388e3c' }}>
                                  {isFail ? 'Fail' : 'Pass'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No subject data available.</Typography>
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </Box>
  );
}

