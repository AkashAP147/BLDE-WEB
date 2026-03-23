import React, { useEffect, useState, useRef, useCallback } from "react";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useLocation } from "react-router-dom";

import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { normalizeStudents } from "../normalizeStudents";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
} from "@mui/material";

export default function Dashboard() {
  const location = useLocation();
  const [students, setStudents] = useState({});
  const [usnInput, setUsnInput] = useState("");
  const [student, setStudent] = useState(null);
  const [selectedSem, setSelectedSem] = useState("");
  // Removed toppers state for dashboard
  // For navigation
  // Only include students of the same college and branch as the current student (if available)
  function getCollegeCodeFromUsn(usn) {
    // College code is the first 3 chars (e.g., 2vs, 1me)
    return usn && usn.length >= 3 ? usn.substring(0, 3).toLowerCase() : '';
  }
  const currentBranch = student ? student.branch : null;
  const currentCollege = student ? getCollegeCodeFromUsn(student.usn) : null;
  // Custom USN sorting: regular USNs, then lateral entry for same batch
  function getBatchFromUsnStr(usn) {
    if (!usn || usn.length < 10) return '';
    const match = usn.match(/^(\d\w\w)(\d{2})([a-z]{2})(\d{3})$/i);
    if (match) {
      const year = match[2];
      const num = parseInt(match[4], 10);
      if (num >= 400) {
        return `20${String(Number(year) - 1).padStart(2, '0')}`;
      } else {
        return `20${year}`;
      }
    }
    return '';
  }
  // Filter by college and branch, then sort: regular USNs (num < 400) ascending, then lateral (num >= 400) for same batch
  let usnList = Object.keys(students);
  if (currentCollege) {
    usnList = usnList.filter(k => getCollegeCodeFromUsn(k) === currentCollege);
  }
  if (currentBranch) {
    usnList = usnList.filter(k => students[k].branch === currentBranch);
  }
  if (student && student.usn) {
    // Get batch for current student
    const batch = getBatchFromUsnStr(student.usn);
    // Partition into regular and lateral for this batch
    const regular = usnList.filter(k => {
      const m = k.match(/^(\d\w\w)(\d{2})([a-z]{2})(\d{3})$/i);
      return m && parseInt(m[4], 10) < 400 && getBatchFromUsnStr(k) === batch;
    }).sort();
    const lateral = usnList.filter(k => {
      const m = k.match(/^(\d\w\w)(\d{2})([a-z]{2})(\d{3})$/i);
      return m && parseInt(m[4], 10) >= 400 && getBatchFromUsnStr(k) === batch;
    }).sort();
    usnList = [...regular, ...lateral];
  }
  const currentIndex = student ? usnList.findIndex(k => k.toLowerCase() === student.usn.toLowerCase()) : -1;

  // Global Latest Result mapping: each subject's original semester and absolute latest result
  const globalLatestResults = (() => {
    if (!student || !student.semesters) return {};
    const map = {};
    const sems = Object.keys(student.semesters).sort((a, b) => Number(a) - Number(b));
    // 1. Find original semester for each subject (by name)
    sems.forEach(sem => {
      Object.values(student.semesters[sem] || {}).forEach(subj => {
        if (!map[subj.subject_name]) {
          map[subj.subject_name] = { originalSem: sem, latestSubj: subj, latestSem: sem };
        }
      });
    });
    // 2. Find absolute latest result for each subject (highest sem index)
    sems.forEach(sem => {
      Object.values(student.semesters[sem] || {}).forEach(subj => {
        if (map[subj.subject_name]) {
          // Compare semester indices
          if (Number(sem) >= Number(map[subj.subject_name].latestSem)) {
            map[subj.subject_name].latestSubj = subj;
            map[subj.subject_name].latestSem = sem;
          }
        }
      });
    });
    return map;
  })();

  // Keyboard navigation handler (left/right for students, up/down for semesters)
  const handleArrowNav = useCallback((e) => {
    if (!student || usnList.length === 0) return;
    // Prevent default scroll for up/down keys when navigating students
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && student) {
      e.preventDefault();
    }
    // Semester navigation (left/right)
    if (student.semesters) {
      const semList = Object.keys(student.semesters);
      const semIdx = selectedSem ? semList.indexOf(selectedSem) : -1;
      if (e.key === 'ArrowLeft' && semList.length > 0) {
        // Previous semester
        const prevIdx = semIdx > 0 ? semIdx - 1 : semList.length - 1;
        setSelectedSem(semList[prevIdx]);
      } else if (e.key === 'ArrowRight' && semList.length > 0) {
        // Next semester
        const nextIdx = semIdx >= 0 && semIdx < semList.length - 1 ? semIdx + 1 : 0;
        setSelectedSem(semList[nextIdx]);
      }
    }
    // Student navigation (up/down)
    if ((e.key === 'ArrowUp' && currentIndex < usnList.length - 1) || (e.key === 'ArrowDown' && currentIndex > 0)) {
      let nextIdx = currentIndex;
      if (e.key === 'ArrowUp' && currentIndex < usnList.length - 1) nextIdx = currentIndex + 1;
      if (e.key === 'ArrowDown' && currentIndex > 0) nextIdx = currentIndex - 1;
      const nextUsn = usnList[nextIdx];
      setStudent({ usn: nextUsn, ...students[nextUsn] });
      setUsnInput(nextUsn);
      // If the next student has the same semester, keep it selected, else show their first available semester
      if (selectedSem && students[nextUsn].semesters && students[nextUsn].semesters[selectedSem]) {
        setSelectedSem(selectedSem);
      } else {
        const semList = students[nextUsn].semesters ? Object.keys(students[nextUsn].semesters) : [];
        setSelectedSem(semList.length > 0 ? semList[0] : "");
      }
      setError("");
    }
  }, [student, usnList, currentIndex, students, selectedSem]);

  useEffect(() => {
    window.addEventListener('keydown', handleArrowNav);
    return () => window.removeEventListener('keydown', handleArrowNav);
  }, [handleArrowNav]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const resultRef = useRef(null);
  const [highlightFail, setHighlightFail] = useState(true);
  const [showSgpaCgpa, setShowSgpaCgpa] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showSubjectCode, setShowSubjectCode] = useState(false);
  const [credits, setCredits] = useState({});
  const [subjectsDb, setSubjectsDb] = useState({}); // subjects collection from Firebase
  const [expandedPrevAttempt, setExpandedPrevAttempt] = useState(null);
  const [expandedMainSubject, setExpandedMainSubject] = useState(null); // subject code of expanded main result row

  useEffect(() => {
    const studentsRef = ref(db, "students");
    return onValue(studentsRef, (snapshot) => {
      setStudents(normalizeStudents(snapshot.val() || {}));
      setLoading(false);
    });
  }, []);

  // Fetch subjects (credits) from Firebase
  useEffect(() => {
    const subjectsRef = ref(db, "subjects");
    return onValue(subjectsRef, (snapshot) => {
      setSubjectsDb(snapshot.val() || {});
    });
  }, []);

  // Read USN from query string and auto-fetch
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const usnParam = params.get("usn");
    if (usnParam && students && Object.keys(students).length > 0) {
      const usnKey = Object.keys(students).find(
        (k) => k.toLowerCase() === usnParam.toLowerCase()
      );
      if (usnKey) {
        setStudent({ usn: usnKey, ...students[usnKey] });
        setUsnInput(usnKey);
        setSelectedSem("");
        setError("");
      } else {
        setStudent(null);
        setError("No student found for this USN.");
      }
    }
    // eslint-disable-next-line
  }, [location.search, students]);

  const handleFetchStudent = () => {
    const usn = usnInput.trim();
    if (!usn) {
      setError("Please enter a USN.");
      return;
    }

    const usnKey = Object.keys(students).find(
      (k) => k.toLowerCase() === usn.toLowerCase()
    );

    if (usnKey) {
      setStudent({ usn: usnKey, ...students[usnKey] });
      setSelectedSem("");
      setError("");
    } else {
      setStudent(null);
      setError("No student found for this USN.");
    }
  };

  // Removed toppers effect for dashboard

  // Helper to display correct USN for lateral entry
  function getDisplayUsn(s) {
    // Lateral entry: usn like 2vs23ci400, batch 2022, join year 2023, 3rd sem
    // For USN ending with 400+, batch = usn year - 1
    if (!s || !s.usn) return '';
    const usn = s.usn;
    if (usn.length >= 10) {
      const match = usn.match(/^(\d\w\w)(\d{2})([a-z]{2})(\d{3})$/i);
      if (match) {
        const prefix = match[1];
        const year = match[2];
        const branch = match[3];
        const num = parseInt(match[4], 10);
        return `${prefix}${year}${branch}${match[4]}`.toUpperCase();
      }
    }
    return usn;
  }

  // Helper to get batch from USN (for lateral entry)
  function getBatchFromUsn(s) {
    if (!s || !s.usn) return s.batch || '';
    const usn = s.usn;
    if (usn.length >= 10) {
      const match = usn.match(/^(\d\w\w)(\d{2})([a-z]{2})(\d{3})$/i);
      if (match) {
        const year = match[2];
        const num = parseInt(match[4], 10);
        // For lateral entry (400+), batch = usn year - 1
        if (num >= 400) {
          return `20${String(Number(year) - 1).padStart(2, '0')}`;
        } else {
          return `20${year}`;
        }
      }
    }
    return s.batch || '';
  }

  // VTU Grade and Grade Point mapping for SGPA/CGPA calculation
  function getGradeAndPoints(subj) {
    const result = (subj.result || '').trim().toUpperCase();
    // Direct grade mapping if result is a known grade letter
    const gradeMap = { 'S': 10, 'O': 10, 'A': 9, 'B': 8, 'C': 7, 'D': 6, 'E': 5 };
    if (gradeMap[result] !== undefined) return { grade: result, points: gradeMap[result] };
    // Fail cases
    const isFail = result === 'F' || result.includes('FAIL') || result === 'AB' || result === 'X' || result === 'NE';
    if (isFail) return { grade: 'F', points: 0 };
    // For 'P' (pass) or unknown — derive grade from marks percentage
    const total = parseInt(subj.total) || 0;
    const maxMarks = total > 100 ? 200 : 100;
    const pct = (total / maxMarks) * 100;
    if (pct >= 90) return { grade: 'S', points: 10 };
    if (pct >= 80) return { grade: 'A', points: 9 };
    if (pct >= 70) return { grade: 'B', points: 8 };
    if (pct >= 60) return { grade: 'C', points: 7 };
    if (pct >= 50) return { grade: 'D', points: 6 };
    if (pct >= 40) return { grade: 'E', points: 4 };
    return { grade: 'F', points: 0 };
  }

  // Handle credit input change for SGPA/CGPA
  function handleCreditChange(sem, code, value) {
    const numVal = value === '' ? '' : (parseInt(value) || 0);
    setCredits(prev => ({
      ...prev,
      [sem]: {
        ...(prev[sem] || {}),
        [code]: numVal
      }
    }));
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 2, sm: 6 },
        px: { xs: 0.5, sm: 0 },
        background: { xs: '#f0f4f8', sm: 'none' },
      }}
    >
      <Card
        sx={{
          mt: { xs: 1, sm: 4 },
          maxWidth: { xs: '100%', sm: 1000 },
          mx: 'auto',
          p: { xs: 1.5, sm: 4 },
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: { xs: 1, sm: '0 4px 24px rgba(0,0,0,0.06)' },
          borderRadius: { xs: 2, sm: 3 },
        }}
      >
        <CardContent sx={{ px: { xs: 0.5, sm: 2 }, py: { xs: 1, sm: 2 } }}>
          {/* Heading */}
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: 800,
              color: '#1e40af',
              mb: { xs: 2, sm: 5 },
              fontSize: { xs: '1.5rem', sm: '2.5rem' },
            }}
          >
            VTU Results Dashboard
          </Typography>

          {/* Search Section */}
          <Grid container spacing={1.5} justifyContent="center" sx={{ mb: { xs: 1, sm: 0 } }}>
            <Grid size={{ xs: 8, sm: 5, md: 4 }}>
              <TextField
                label="Enter USN"
                value={usnInput}
                onChange={(e) => setUsnInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFetchStudent();
                  }
                }}
                size="small"
                fullWidth
                sx={{
                  input: { fontSize: { xs: 14, sm: 16 } },
                  label: { fontSize: { xs: 13, sm: 16 } },
                }}
              />
            </Grid>
            <Grid size={{ xs: 4, sm: 2, md: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleFetchStudent}
                sx={{
                  height: { xs: 38, sm: 56 },
                  fontWeight: 700,
                  fontSize: { xs: 13, sm: 16 },
                  background: 'linear-gradient(to right, #1e40af, #0ea5e9)',
                  '&:hover': {
                    transform: 'scale(1.03)',
                  },
                }}
              >
                Fetch
              </Button>
            </Grid>
          </Grid>

          {/* Error */}
          {error && (
            <Typography align="center" sx={{ color: "#ef4444", mt: 3 }}>
              {error}
            </Typography>
          )}

          {/* Default Message */}
          {!student && !error && (
            <Typography
              align="center"
              sx={{ color: "#64748b", mt: 4 }}
            >
              Enter a valid USN to view student details.
            </Typography>
          )}

          {/* Student Info & Results */}
          {student && (
            <Box mt={5}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontSize: { xs: 17, sm: 22 } }}
              >
                {student.name}
              </Typography>
              <Typography sx={{ color: '#64748b', mb: 2, fontSize: { xs: 13, sm: 16 } }}>
                {student.branch} | Batch {getBatchFromUsn(student)}
              </Typography>
              <Typography sx={{ color: '#1e40af', mb: 1, fontSize: { xs: 13, sm: 15 } }}>
                USN: {getDisplayUsn(student)}
              </Typography>

              {/* Semester Buttons - horizontal sliding window for mobile */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  overflowX: 'auto',
                  flexWrap: { xs: 'nowrap', sm: 'wrap' },
                  gap: { xs: 1, sm: 1.5 },
                  justifyContent: { xs: 'flex-start', sm: 'center' },
                  alignItems: 'center',
                  my: { xs: 1, sm: 2 },
                  pb: 1,
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  mx: { xs: -1, sm: 0 },
                  px: { xs: 1, sm: 0 },
                }}
              >
                {student.semesters &&
                  Object.keys(student.semesters).map((s) => (
                    <Button
                      key={s}
                      variant={selectedSem === s ? 'contained' : 'outlined'}
                      sx={{
                        minWidth: { xs: 70, sm: 100 },
                        fontWeight: 700,
                        borderRadius: 2,
                        background: selectedSem === s ? '#1e40af' : undefined,
                        fontSize: { xs: 12, sm: 16 },
                        px: { xs: 0.5, sm: 2 },
                        py: { xs: 0.2, sm: 1 },
                        boxShadow: selectedSem === s ? 2 : 0,
                        transition: 'all 0.2s',
                        flex: '0 0 auto',
                      }}
                      onClick={() => {
                        setSelectedSem(s);
                        setTimeout(() => {
                          if (resultRef.current) {
                            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                    >
                      Sem {s}
                    </Button>
                  ))}
              </Box>

              {/* Show result table automatically after clicking semester */}
              {selectedSem && (() => {

                // --- Find repeated subjects (by subject_name) in previous semesters ---
                const semList = Object.keys(student.semesters || {});
                const currentSemIdx = semList.indexOf(selectedSem);
                const currentSubjects = Object.values(student.semesters[selectedSem] || {});
                // Collect subject names in current sem
                const currentSubjectNames = currentSubjects.map(s => s.subject_name);
                // Find all previous attempts (failures) for subjects in current sem
                let previousAttemptsRaw = [];
                for (let i = 0; i < currentSemIdx; ++i) {
                  const prevSem = semList[i];
                  const prevSubjects = Object.values(student.semesters[prevSem] || {});
                  prevSubjects.forEach(subj => {
                    // Use _regular_result if available (the regular exam result, not makeup)
                    const resultToCheck = subj._regular_result || subj.result || '';
                    const res = resultToCheck.trim().toUpperCase();
                    const isFail = res === 'F' || res.includes('FAIL') || res === 'A' || res === 'X' || res === 'NE';
                    if (currentSubjectNames.includes(subj.subject_name) && isFail) {
                      previousAttemptsRaw.push({ sem: prevSem, ...subj });
                    }
                  });
                }

                // For each subject in previousAttemptsRaw, find the latest attempt (highest sem) for that subject
                let latestAttemptsMap = {};
                previousAttemptsRaw.forEach(attempt => {
                  const subjName = attempt.subject_name;
                  // Use our pre-calculated global latest result
                  const latest = globalLatestResults[subjName];
                  if (latest) {
                    latestAttemptsMap[subjName] = { sem: latest.latestSem, ...latest.latestSubj };
                  }
                });
                // Remove duplicates (only latest for each subject)
                const previousAttempts = Object.values(latestAttemptsMap);
                return (
                  <>
                    <Box mt={4} ref={resultRef}>
                      <Typography variant="h6" mb={2}>
                        Semester {selectedSem} Results
                      </Typography>

                      {/* Toggle for highlighting failed subjects */}
                      <Box mb={2} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant={highlightFail ? 'contained' : 'outlined'}
                          sx={{ background: highlightFail ? '#1e40af' : undefined, fontWeight: 700, borderRadius: 2 }}
                          onClick={() => setHighlightFail(v => !v)}
                        >
                          {highlightFail ? 'Hide' : 'Show'} Failed Subject Highlight
                        </Button>
                        <Button
                          variant={showSgpaCgpa ? 'contained' : 'outlined'}
                          sx={{ background: showSgpaCgpa ? '#0ea5e9' : undefined, fontWeight: 700, borderRadius: 2 }}
                          onClick={() => {
                            const newVal = !showSgpaCgpa;
                            setShowSgpaCgpa(newVal);
                            // Auto-populate credits from DB when toggling ON
                            if (newVal && student && student.semesters && Object.keys(subjectsDb).length > 0) {
                              const autoCredits = { ...credits };
                              Object.keys(student.semesters).forEach(sem => {
                                if (!autoCredits[sem]) autoCredits[sem] = {};
                                Object.keys(student.semesters[sem] || {}).forEach(code => {
                                  // Only auto-fill if user hasn't already set a value
                                  if (autoCredits[sem][code] === undefined || autoCredits[sem][code] === '') {
                                    const dbSubj = subjectsDb[code] || subjectsDb[code.toUpperCase()] || subjectsDb[code.toLowerCase()];
                                    if (dbSubj && dbSubj.credits) {
                                      autoCredits[sem][code] = parseInt(dbSubj.credits) || 0;
                                    }
                                  }
                                });
                              });
                              setCredits(autoCredits);
                            }
                          }}
                        >
                          {showSgpaCgpa ? 'Hide' : 'Calculate'} SGPA & CGPA
                        </Button>
                        <Button
                          variant={showDates ? 'contained' : 'outlined'}
                          sx={{ background: showDates ? '#7c3aed' : undefined, fontWeight: 700, borderRadius: 2 }}
                          onClick={() => setShowDates(v => !v)}
                        >
                          {showDates ? 'Hide' : 'Show'} Result Dates
                        </Button>
                        <Button
                          variant={showSubjectCode ? 'contained' : 'outlined'}
                          sx={{ background: showSubjectCode ? '#16a34a' : undefined, fontWeight: 700, borderRadius: 2 }}
                          onClick={() => setShowSubjectCode(v => !v)}
                        >
                          {showSubjectCode ? 'Hide' : 'Show'} Subject Code
                        </Button>
                      </Box>

                      {/* Calculate and show percentage (exclude previous attempts, use latest marks after reval if present) */}
                      {(() => {
                        // Only use subjects shown in the main table (not in previousAttempts)
                        const mainSubjects = Object.entries(student.semesters[selectedSem] || {})
                          .filter(([_, subj]) => {
                            return !previousAttempts.some(
                              (prev) => prev.subject_name === subj.subject_name
                            );
                          })
                          .map(([_, subj]) => subj);
                        // Use reval marks if present, otherwise external
                        const totalMarks = mainSubjects.reduce((sum, subj) => {
                          const internal = parseInt(subj.internal) || 0;
                          const ext = subj.rv_result || subj.final_result ? (parseInt(subj.rv_marks || subj.final_marks) || 0) : (parseInt(subj.external) || 0);
                          return sum + internal + ext;
                        }, 0);
                        // Account for subjects with max marks of 200 (e.g., projects)
                        const maxMarks = mainSubjects.reduce((sum, subj) => {
                          // Use reval marks if present, otherwise external
                          const ext = subj.rv_result || subj.final_result ? (parseInt(subj.rv_marks || subj.final_marks) || 0) : (parseInt(subj.external) || 0);
                          const internal = parseInt(subj.internal) || 0;
                          const total = internal + ext;
                          return sum + (total > 100 ? 200 : 100);
                        }, 0);
                        const percent = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : "0.00";
                        return (
                          <Typography variant="subtitle1" sx={{ color: '#1e40af', fontWeight: 700, mb: 2 }}>
                            Percentage: {percent}%
                          </Typography>
                        );
                      })()}

                      <TableContainer
                        component={Paper}
                        sx={{
                          background: '#ffffff',
                          borderRadius: 3,
                          width: '100%',
                          overflowX: 'auto',
                        }}
                      >
                        <Table
                          size="small"
                          sx={{
                            minWidth: 400,
                            width: '100%',
                            '& th, & td': {
                              borderRight: '1px solid #e2e8f0',
                              borderBottom: '1px solid #e2e8f0',
                              fontSize: { xs: 11, sm: 15 },
                              padding: { xs: '5px 2px', sm: '8px 12px' },
                              wordBreak: 'break-word',
                            },
                            '& th:last-child, & td:last-child': {
                              borderRight: 0,
                            },
                          }}
                        >
                          <TableHead>
                            <TableRow>
                              {showSubjectCode && <TableCell>Code</TableCell>}
                              <TableCell>Subject</TableCell>
                              <TableCell>Internal</TableCell>
                              {(() => {
                                const hasReval = Object.values(student.semesters[selectedSem] || {}).some(
                                  (subj) => subj.rv_result || subj.final_result || subj.is_revaluation
                                );
                                return <>
                                  <TableCell>{hasReval ? 'External (Reval)' : 'External'}</TableCell>
                                  <TableCell>{hasReval ? 'Total (Reval)' : 'Total'}</TableCell>
                                  <TableCell>{hasReval ? 'Result (Reval)' : 'Result'}</TableCell>
                                </>;
                              })()}
                              {showDates && <TableCell>Date</TableCell>}
                              {showSgpaCgpa && <TableCell>Credits</TableCell>}
                              {showSgpaCgpa && <TableCell>Grade</TableCell>}
                              {showSgpaCgpa && <TableCell>GP</TableCell>}
                              {showSgpaCgpa && <TableCell>CP</TableCell>}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(
                              student.semesters[selectedSem]
                            )
                              .filter(([_, subj]) => {
                                // Remove from main table if this subject is in previousAttempts (by subject_name)
                                return !previousAttempts.some(
                                  (prev) => prev.subject_name === subj.subject_name
                                );
                              })
                              .map(([code, subj]) => {
                                // Aggregate all attempts for this subject across ALL semesters
                                let allAttempts = [];
                                const allSems = Object.keys(student.semesters || {});
                                allSems.forEach(sem => {
                                  const semSubj = student.semesters[sem]?.[code];
                                  if (semSubj && semSubj._attempts) {
                                    semSubj._attempts.forEach(att => {
                                      allAttempts.push({ ...att, _sem: sem });
                                    });
                                  }
                                });
                                 // Helper to map exam session to a comparable score (Year + Period)
                                 const getSessionScore = (att) => {
                                   const year = parseInt(att.exam_year) || (att.result_date ? parseInt(att.result_date.split('-')[0]) : 0);
                                   let periodWeight = 0;
                                   const name = (att.exam_name || '').toUpperCase();
                                   const month = (att.exam_month || '').toUpperCase();
                                   if (name.includes('SUMMER') || name.includes('SPECIAL')) periodWeight = 3;
                                   else if (month.includes('JUNE') || month.includes('JULY')) periodWeight = 2;
                                   else if (month.includes('DEC') || month.includes('JAN') || month.includes('FEB')) periodWeight = 1;
                                   return year * 10 + periodWeight;
                                 };

                                 // Helper to prioritize results WITHIN the same session
                                 const getTypePriority = (att) => {
                                   const isMakeup = att.exam_type === 'makeup' || (att.is_revaluation && (att.exam_name || '').toUpperCase().includes('MAKEUP'));
                                   if (isMakeup) return att.is_revaluation ? 3 : 2;
                                   return att.is_revaluation ? 1 : 0;
                                 };

                                 // Sort all attempts by Session chronologically, then by Type priority
                                 allAttempts.sort((a, b) => {
                                   const scoreA = getSessionScore(a);
                                   const scoreB = getSessionScore(b);
                                   if (scoreA !== scoreB) return scoreA - scoreB;
                                   const pA = getTypePriority(a);
                                   const pB = getTypePriority(b);
                                   if (pA !== pB) return pA - pB;
                                   return (a.result_date || '').localeCompare(b.result_date || '');
                                 });

                                 // Find the absolute latest attempt for display
                                 const latestAttempt = allAttempts[allAttempts.length - 1] || subj;
                                 
                                 // Determine the display values using the absolute latest attempt
                                 const displayExt = latestAttempt.is_revaluation 
                                   ? (latestAttempt.final_marks || latestAttempt.rv_marks || latestAttempt.external)
                                   : latestAttempt.external;
                                 const displayResult = latestAttempt.is_revaluation 
                                   ? (latestAttempt.final_result || latestAttempt.rv_result || latestAttempt.result)
                                   : latestAttempt.result;
                                 const displayInternal = latestAttempt.internal;
                                 const displayTotal = String((parseInt(displayInternal) || 0) + (parseInt(displayExt) || 0));

                                 const isFail = highlightFail && (displayResult && (displayResult.trim().toUpperCase() === 'F' || displayResult.trim().toLowerCase().includes('fail')));
                                 const displaySubj = { ...subj, external: displayExt, result: displayResult, total: displayTotal, internal: displayInternal };

                                const gp = showSgpaCgpa ? getGradeAndPoints(displaySubj) : null;
                                const creditVal = (credits[selectedSem] && credits[selectedSem][code]) ?? '';
                                const cp = gp && creditVal !== '' ? (parseInt(creditVal) || 0) * gp.points : '';
                                const isExpanded = expandedMainSubject === code;
                                const hasMultipleAttempts = allAttempts.length > 1;
                                return (
                                  <React.Fragment key={code}>
                                    <TableRow
                                      onClick={() => hasMultipleAttempts && setExpandedMainSubject(isExpanded ? null : code)}
                                      sx={{
                                        ...(isFail ? { backgroundColor: '#ef4444 !important' } : {}),
                                        cursor: hasMultipleAttempts ? 'pointer' : 'default',
                                        '&:hover': {
                                          backgroundColor: isFail ? '#f87171 !important' : 'rgba(30,64,175,0.05)',
                                        },
                                      }}
                                    >
                                      {showSubjectCode && (
                                        <TableCell sx={{ fontSize: { xs: 10, sm: 13 }, color: isFail ? '#fff' : '#64748b', fontWeight: isFail ? 700 : 400 }}>
                                          {code}
                                        </TableCell>
                                      )}
                                      <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>
                                        {subj.subject_name}
                                        {hasMultipleAttempts && (
                                          <span style={{ marginLeft: 6, fontSize: 11, color: isFail ? '#fecaca' : '#1e40af', fontWeight: 700 }}>
                                            {isExpanded ? '▲' : '▼'} {allAttempts.length} attempts
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{displaySubj.internal}</TableCell>
                                      {/* External (Reval) */}
                                      <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>
                                        {latestAttempt.is_revaluation ? (
                                          <>
                                            <span style={{ color: '#1e40af', fontWeight: 600 }}>
                                              {latestAttempt.final_marks || latestAttempt.rv_marks || displayExt}
                                            </span>
                                            {latestAttempt.old_marks && (
                                              <span style={{ color: '#64748b', marginLeft: 8, fontSize: 13 }}>
                                                (Old: {latestAttempt.old_marks})
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          displayExt
                                        )}
                                      </TableCell>
                                      {/* Total - use displaySubj for correct makeup/reval total */}
                                      <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>
                                        {(() => {
                                          const total = (parseInt(displayInternal) || 0) + (parseInt(displayExt) || 0);
                                          const oldTotal = latestAttempt.is_revaluation && latestAttempt.old_marks ? ((parseInt(displayInternal) || 0) + (parseInt(latestAttempt.old_marks) || 0)) : null;
                                          return (
                                            <>
                                              <span style={{ color: '#1e40af', fontWeight: 600 }}>{total}</span>
                                              {latestAttempt.is_revaluation && latestAttempt.old_marks && (
                                                <span style={{ color: '#64748b', marginLeft: 8, fontSize: 13 }}>
                                                  (Old: {oldTotal})
                                                </span>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </TableCell>
                                      {/* Result (Reval) - show reval result if available, else result */}
                                      <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>
                                        {latestAttempt.is_revaluation ? (
                                          <>
                                            <span style={{ color: '#1e40af', fontWeight: 600 }}>
                                              {latestAttempt.final_result || latestAttempt.rv_result || displayResult}
                                            </span>
                                            {latestAttempt.old_result && (
                                              <span style={{ color: '#64748b', marginLeft: 8, fontSize: 13 }}>
                                                (Old: {latestAttempt.old_result})
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          displayResult
                                        )}
                                      </TableCell>
                                      {showDates && (
                                        <TableCell sx={{ fontSize: { xs: 10, sm: 13 }, color: '#64748b', ...(isFail ? { color: '#fff' } : {}) }}>
                                          {subj.result_date || '—'}
                                        </TableCell>
                                      )}
                                      {showSgpaCgpa && (
                                        <TableCell sx={isFail ? { color: '#fff' } : {}}>
                                          <TextField
                                            type="number"
                                            size="small"
                                            value={creditVal}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 10)) {
                                                handleCreditChange(selectedSem, code, val);
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ width: 60, input: { textAlign: 'center', fontSize: 13, p: '4px' } }}
                                            inputProps={{ min: 0, max: 10 }}
                                          />
                                        </TableCell>
                                      )}
                                      {showSgpaCgpa && (
                                        <TableCell sx={{ fontWeight: 600, color: gp?.points === 0 ? '#ef4444' : '#1e40af' }}>
                                          {gp?.grade}
                                        </TableCell>
                                      )}
                                      {showSgpaCgpa && (
                                        <TableCell sx={{ fontWeight: 600 }}>{gp?.points}</TableCell>
                                      )}
                                      {showSgpaCgpa && (
                                        <TableCell sx={{ fontWeight: 700 }}>{cp !== '' ? cp : ''}</TableCell>
                                      )}
                                    </TableRow>
                                    {/* Expanded: show all attempts for this subject */}
                                    {isExpanded && allAttempts.map((att, ai) => (
                                      <TableRow key={ai} sx={{ background: '#fef3c7' }}>
                                        {showSubjectCode && <TableCell sx={{ fontSize: { xs: 9, sm: 11 }, color: '#a16207' }}>{code}</TableCell>}
                                        <TableCell sx={{ pl: { xs: 2, sm: 4 }, fontSize: { xs: 10, sm: 12 }, color: '#78350f' }}>
                                          <div style={{ fontWeight: 700, color: '#92400e' }}>Sem {att._sem} • {att.exam_type || 'attempt'}</div>
                                          <div style={{ fontSize: 10, color: '#a16207' }}>{att.exam_name || ''}</div>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: { xs: 10, sm: 12 } }}>{att.internal}</TableCell>
                                        <TableCell sx={{ fontSize: { xs: 10, sm: 12 } }}>{att.external || att.rv_marks || att.old_marks}</TableCell>
                                        <TableCell sx={{ fontSize: { xs: 10, sm: 12 } }}>{att.total || ''}</TableCell>
                                        <TableCell sx={{
                                          fontSize: { xs: 10, sm: 12 }, fontWeight: 700,
                                          color: (att.result || att.rv_result || att.final_result || '').trim().toUpperCase() === 'F' ? '#ef4444' : '#16a34a',
                                        }}>
                                          {att.result || att.rv_result || att.final_result}
                                        </TableCell>
                                        {showDates && (
                                          <TableCell sx={{ fontSize: { xs: 9, sm: 11 }, color: '#a16207' }}>
                                            {att.result_date || '—'}
                                          </TableCell>
                                        )}
                                        {showSgpaCgpa && <TableCell />}
                                        {showSgpaCgpa && <TableCell />}
                                        {showSgpaCgpa && <TableCell />}
                                        {showSgpaCgpa && <TableCell />}
                                      </TableRow>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>


                    </Box>
                    {/* Previous Attempts Section */}
                    {previousAttempts.length > 0 && (
                      <Box mt={6}>
                        <Typography variant="h6" mb={2} sx={{ color: '#e65100' }}>
                          Previous Attempts for Repeated Subjects
                        </Typography>
                        <TableContainer
                          component={Paper}
                          sx={{
                            background: '#ffffff',
                            borderRadius: 3,
                            width: '100%',
                            overflowX: 'auto',
                          }}
                        >
                          <Table
                            size="small"
                            sx={{
                              minWidth: 400,
                              width: '100%',
                              '& th, & td': {
                                borderRight: '1px solid #e2e8f0',
                                borderBottom: '1px solid #e2e8f0',
                                fontSize: { xs: 11, sm: 15 },
                                padding: { xs: '5px 2px', sm: '8px 12px' },
                                wordBreak: 'break-word',
                              },
                              '& th:last-child, & td:last-child': {
                                borderRight: 0,
                              },
                            }}
                          >
                            <TableHead>
                              <TableRow>
                                <TableCell>Semester</TableCell>
                                {showSubjectCode && <TableCell>Code</TableCell>}
                                <TableCell>Subject</TableCell>
                                <TableCell>Internal</TableCell>
                                <TableCell>External</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Result</TableCell>
                                {showDates && <TableCell>Date</TableCell>}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {previousAttempts.map((subj, idx) => {
                                // Show regular result (not makeup) in the main row
                                const regInt = subj._regular_internal || subj.internal;
                                const regExt = subj._regular_external || subj.external;
                                const regTotal = subj._regular_total || subj.total;
                                const regResult = subj._regular_result || subj.result;
                                const isExpanded = expandedPrevAttempt === idx;
                                const attempts = subj._attempts || [];
                                return (
                                  <React.Fragment key={subj.subject_name + subj.sem + idx}>
                                    <TableRow
                                      onClick={() => setExpandedPrevAttempt(isExpanded ? null : idx)}
                                      sx={{
                                        cursor: attempts.length > 1 ? 'pointer' : 'default',
                                        background: isExpanded ? '#fff7ed' : 'inherit',
                                        '&:hover': { backgroundColor: '#fff1e6' },
                                      }}
                                    >
                                      <TableCell>{subj.sem}</TableCell>
                                      {showSubjectCode && (
                                        <TableCell sx={{ fontSize: { xs: 10, sm: 13 }, color: '#64748b' }}>
                                          {subj.subject_code || ''}
                                        </TableCell>
                                      )}
                                      <TableCell>
                                        {subj.subject_name}
                                        {attempts.length > 1 && (
                                          <span style={{ marginLeft: 6, fontSize: 11, color: '#e65100', fontWeight: 700 }}>
                                            {isExpanded ? '▲' : '▼'} {attempts.length} attempts
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>{regInt}</TableCell>
                                      <TableCell>{regExt}</TableCell>
                                      <TableCell>{regTotal}</TableCell>
                                      <TableCell sx={{ color: (regResult || '').trim().toUpperCase() === 'F' ? '#ef4444' : '#16a34a', fontWeight: 700 }}>
                                        {regResult}
                                      </TableCell>
                                      {showDates && (
                                        <TableCell sx={{ fontSize: { xs: 10, sm: 13 }, color: '#64748b' }}>
                                          {subj.result_date || (attempts.length > 0 && attempts[0].result_date) || '—'}
                                        </TableCell>
                                      )}
                                    </TableRow>
                                    {/* Expanded: show all attempts for this subject */}
                                    {isExpanded && attempts.length > 0 && attempts.map((att, ai) => (
                                      <TableRow key={ai} sx={{ background: '#fef3c7' }}>
                                        {showSubjectCode && <TableCell sx={{ fontSize: 11, color: '#a16207' }}>{att.subject_code || ''}</TableCell>}
                                        <TableCell sx={{ pl: 4, fontSize: 11, color: '#92400e' }}>
                                          {att.exam_type || 'attempt'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 11, color: '#78350f' }}>
                                          {att.exam_name || att.subject_name}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 11 }}>{att.internal}</TableCell>
                                        <TableCell sx={{ fontSize: 11 }}>{att.external || att.rv_marks || att.old_marks}</TableCell>
                                        <TableCell sx={{ fontSize: 11 }}>{att.total || ''}</TableCell>
                                        <TableCell sx={{
                                          fontSize: 11, fontWeight: 700,
                                          color: (att.result || att.rv_result || att.final_result || '').trim().toUpperCase() === 'F' ? '#ef4444' : '#16a34a',
                                        }}>
                                          {att.result || att.rv_result || att.final_result}
                                        </TableCell>
                                        {showDates && (
                                          <TableCell sx={{ fontSize: 11, color: '#a16207' }}>
                                            {att.result_date || '—'}
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    {/* SGPA Display relocated below previous attempts */}
                    {showSgpaCgpa && (() => {
                      // For SGPA calculation, only count subjects that ORIGINALLY belong to this semester
                      const semSubjects = Object.entries(globalLatestResults)
                        .filter(([_, data]) => data.originalSem === selectedSem);

                      const semCreds = credits[selectedSem] || {};
                      let totalCP = 0, totalRegCr = 0, totalEarnedCr = 0;
                      semSubjects.forEach(([name, data]) => {
                        // Find original subject code in this semester to look up credits
                        const originalEntry = Object.entries(student.semesters[selectedSem] || {})
                          .find(([_, s]) => s.subject_name === name);
                        const code = originalEntry ? originalEntry[0] : name;

                        const cr = parseInt(semCreds[code]) || 0;
                        const { points } = getGradeAndPoints(data.latestSubj);
                        totalCP += cr * points;
                        totalRegCr += cr;
                        if (points > 0) {
                          totalEarnedCr += cr;
                        }
                      });
                      const sgpa = totalRegCr > 0 ? (totalCP / totalRegCr).toFixed(2) : '—';
                      return (
                        <Box sx={{ mt: 2, p: 2, background: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e40af' }}>
                            SGPA (Sem {selectedSem}): {sgpa}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Credits Earned: {totalEarnedCr} | Total Registered: {totalRegCr}
                          </Typography>
                          {totalRegCr === 0 && (
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              Enter credits for each subject above to calculate SGPA.
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}


                    {/* CGPA Section */}
                    {showSgpaCgpa && student.semesters && (() => {
                      const allSems = Object.keys(student.semesters).sort((a, b) => Number(a) - Number(b));
                      let grandTotalCP = 0, grandTotalEarnedCr = 0;
                      const semRows = allSems.map((sem) => {
                        const semCreds = credits[sem] || {};
                        // Count subjects that ORIGINALLY belong to this semester
                        const semSubjects = Object.entries(globalLatestResults)
                          .filter(([_, data]) => data.originalSem === sem);

                        let semCP = 0, semRegCr = 0, semEarnedCr = 0;
                        semSubjects.forEach(([name, data]) => {
                          // Find original subject code in this semester to look up credits
                          const originalEntry = Object.entries(student.semesters[sem] || {})
                            .find(([_, s]) => s.subject_name === name);
                          const code = originalEntry ? originalEntry[0] : name;

                          const cr = parseInt(semCreds[code]) || 0;
                          const { points } = getGradeAndPoints(data.latestSubj);
                          semCP += cr * points;
                          semRegCr += cr;
                          if (points > 0) {
                            semEarnedCr += cr;
                          }
                        });
                        grandTotalCP += semCP;
                        grandTotalEarnedCr += semEarnedCr;
                        // SGPA for the row uses REGISTERED credits
                        const sgpa = semRegCr > 0 ? (semCP / semRegCr).toFixed(2) : '—';
                        return { sem, semEarnedCr, sgpa, semCP };
                      });
                      // CGPA uses total credits EARNED across all semesters
                      const cgpa = grandTotalEarnedCr > 0 ? (grandTotalCP / grandTotalEarnedCr).toFixed(2) : '—';
                      const hasAnyCredits = grandTotalEarnedCr > 0;
                      return (
                        <Box mt={4}>
                          <Typography variant="h6" mb={2} sx={{ color: '#1e40af', fontWeight: 700 }}>
                            CGPA Calculator
                          </Typography>
                          {!hasAnyCredits && (
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                              Enter credits in each semester's result table to compute CGPA across all semesters.
                            </Typography>
                          )}
                          <TableContainer component={Paper} sx={{ background: '#ffffff', borderRadius: 3, overflowX: 'auto' }}>
                            <Table size="small" sx={{
                              '& th, & td': { borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', fontSize: { xs: 12, sm: 15 }, padding: { xs: '6px 8px', sm: '8px 16px' } },
                              '& th:last-child, & td:last-child': { borderRight: 0 },
                            }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Semester</TableCell>
                                  <TableCell>Total Credits</TableCell>
                                  <TableCell>SGPA</TableCell>
                                  <TableCell>SGPA × Credits</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {semRows.map(r => (
                                  <TableRow key={r.sem} hover sx={{
                                    background: r.sem === selectedSem ? '#eff6ff' : undefined,
                                    '&:hover': { backgroundColor: 'rgba(30,64,175,0.05)' },
                                  }}>
                                    <TableCell sx={{ fontWeight: r.sem === selectedSem ? 700 : 400 }}>Sem {r.sem}</TableCell>
                                    <TableCell>{r.semEarnedCr > 0 ? r.semEarnedCr : '0'}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1e40af' }}>{r.sgpa}</TableCell>
                                    <TableCell>{r.semCP > 0 ? r.semCP.toFixed(0) : '0'}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow sx={{ background: '#f0f4f8' }}>
                                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>{grandTotalEarnedCr > 0 ? grandTotalEarnedCr : '0'}</TableCell>
                                  <TableCell></TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>{grandTotalEarnedCr > 0 ? grandTotalCP.toFixed(0) : '0'}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                          <Box sx={{ mt: 2, p: 2, background: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe', textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e40af' }}>
                              CGPA: {cgpa}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })()}
                  </>
                );
              })()}
            </Box>
          )}
          {/* Navigation Arrows (Down/Up) with modern icons, swapped position */}
          {student && usnList.length > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 8 }}>
              <Button
                variant="contained"
                sx={{ minWidth: 56, minHeight: 56, background: '#1e40af', color: '#fff', fontSize: 32, fontWeight: 700, boxShadow: 2, visibility: currentIndex > 0 ? 'visible' : 'hidden', borderRadius: 2 }}
                onClick={() => {
                  if (currentIndex > 0) {
                    const prevUsn = usnList[currentIndex - 1];
                    setStudent({ usn: prevUsn, ...students[prevUsn] });
                    setUsnInput(prevUsn);
                    if (selectedSem && students[prevUsn].semesters && students[prevUsn].semesters[selectedSem]) {
                      setSelectedSem(selectedSem);
                    } else {
                      const semList = students[prevUsn].semesters ? Object.keys(students[prevUsn].semesters) : [];
                      setSelectedSem(semList.length > 0 ? semList[0] : "");
                    }
                    setError("");
                  }
                }}
                aria-label="Previous Student"
              >
                <ArrowDownwardIcon fontSize="large" />
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                sx={{ minWidth: 56, minHeight: 56, background: '#1e40af', color: '#fff', fontSize: 32, fontWeight: 700, boxShadow: 2, visibility: currentIndex < usnList.length - 1 ? 'visible' : 'hidden', borderRadius: 2 }}
                onClick={() => {
                  if (currentIndex < usnList.length - 1) {
                    const nextUsn = usnList[currentIndex + 1];
                    setStudent({ usn: nextUsn, ...students[nextUsn] });
                    setUsnInput(nextUsn);
                    if (selectedSem && students[nextUsn].semesters && students[nextUsn].semesters[selectedSem]) {
                      setSelectedSem(selectedSem);
                    } else {
                      const semList = students[nextUsn].semesters ? Object.keys(students[nextUsn].semesters) : [];
                      setSelectedSem(semList.length > 0 ? semList[0] : "");
                    }
                    setError("");
                  }
                }}
                aria-label="Next Student"
              >
                <ArrowUpwardIcon fontSize="large" />
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
