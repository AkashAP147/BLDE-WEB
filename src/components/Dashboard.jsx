import React, { useEffect, useState, useRef, useCallback } from "react";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useLocation } from "react-router-dom";

import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
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
  const [credits, setCredits] = useState({}); // { [sem]: { [subjectCode]: creditValue } }

  useEffect(() => {
    const studentsRef = ref(db, "students");
    return onValue(studentsRef, (snapshot) => {
      setStudents(snapshot.val() || {});
      setLoading(false);
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
    if (pct >= 40) return { grade: 'E', points: 5 };
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
            <Grid item xs={8} sm={5} md={4}>
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
            <Grid item xs={4} sm={2} md={2}>
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
                    const isFail = subj.result && (subj.result.trim().toUpperCase() === 'F' || subj.result.trim().toLowerCase().includes('fail'));
                    if (currentSubjectNames.includes(subj.subject_name) && isFail) {
                      previousAttemptsRaw.push({ sem: prevSem, ...subj });
                    }
                  });
                }

                // For each subject in previousAttemptsRaw, find the latest attempt (highest sem) for that subject
                let latestAttemptsMap = {};
                previousAttemptsRaw.forEach(attempt => {
                  const subjName = attempt.subject_name;
                  // Search for the latest attempt for this subject in all later semesters (including current)
                  let latest = attempt;
                  for (let j = currentSemIdx + 1; j < semList.length; ++j) {
                    const nextSem = semList[j];
                    const nextSubjects = Object.values(student.semesters[nextSem] || {});
                    nextSubjects.forEach(subj => {
                      if (subj.subject_name === subjName) {
                        latest = { sem: nextSem, ...subj };
                      }
                    });
                  }
                  // Also check current sem (if subject is present)
                  currentSubjects.forEach(subj => {
                    if (subj.subject_name === subjName) {
                      latest = { sem: selectedSem, ...subj };
                    }
                  });
                  latestAttemptsMap[subjName] = latest;
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
                          onClick={() => setShowSgpaCgpa(v => !v)}
                        >
                          {showSgpaCgpa ? 'Hide' : 'Calculate'} SGPA & CGPA
                        </Button>
                      </Box>

                      {/* Calculate and show percentage (exclude previous attempts) */}
                      {(() => {
                        // Only use subjects shown in the main table (not in previousAttempts)
                        const mainSubjects = Object.entries(student.semesters[selectedSem] || {})
                          .filter(([_, subj]) => {
                            return !previousAttempts.some(
                              (prev) => prev.subject_name === subj.subject_name
                            );
                          })
                          .map(([_, subj]) => subj);
                        const totalMarks = mainSubjects.reduce((sum, subj) => sum + (parseInt(subj.total) || 0), 0);
                        // Account for subjects with max marks of 200 (e.g., projects)
                        const maxMarks = mainSubjects.reduce((sum, subj) => {
                          const marks = parseInt(subj.total) || 0;
                          return sum + (marks > 100 ? 200 : 100);
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
                              <TableCell>Subject</TableCell>
                              <TableCell>Internal</TableCell>
                              <TableCell>External</TableCell>
                              <TableCell>Total</TableCell>
                              <TableCell>Result</TableCell>
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
                                const isFail = highlightFail && (subj.result && (subj.result.trim().toUpperCase() === 'F' || subj.result.trim().toLowerCase().includes('fail')));
                                const gp = showSgpaCgpa ? getGradeAndPoints(subj) : null;
                                const creditVal = (credits[selectedSem] && credits[selectedSem][code]) ?? '';
                                const cp = gp && creditVal !== '' ? (parseInt(creditVal) || 0) * gp.points : '';
                                return (
                                  <TableRow
                                    key={code}
                                    hover
                                    sx={{
                                      ...(isFail ? { backgroundColor: '#ef4444' } : {}),
                                      '&:hover': {
                                          backgroundColor: isFail ? '#dc2626' : 'rgba(30,64,175,0.05)',
                                      },
                                    }}
                                  >
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.subject_name}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.internal}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.external}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.total}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.result}</TableCell>
                                    {showSgpaCgpa && (
                                      <TableCell sx={isFail ? { color: '#fff' } : {}}>
                                        <TextField
                                          type="number"
                                          size="small"
                                          value={creditVal}
                                          onChange={(e) => handleCreditChange(selectedSem, code, e.target.value)}
                                          sx={{ width: 60, input: { textAlign: 'center', fontSize: 13, p: '4px' } }}
                                          inputProps={{ min: 0, max: 20 }}
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
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* SGPA Display */}
                      {showSgpaCgpa && (() => {
                        const mainEntries = Object.entries(student.semesters[selectedSem] || {})
                          .filter(([_, subj]) => !previousAttempts.some(prev => prev.subject_name === subj.subject_name));
                        const semCreds = credits[selectedSem] || {};
                        let totalCP = 0, totalCr = 0;
                        mainEntries.forEach(([code, subj]) => {
                          const cr = parseInt(semCreds[code]) || 0;
                          const { points } = getGradeAndPoints(subj);
                          totalCP += cr * points;
                          totalCr += cr;
                        });
                        const sgpa = totalCr > 0 ? (totalCP / totalCr).toFixed(2) : '—';
                        return (
                          <Box sx={{ mt: 2, p: 2, background: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e40af' }}>
                              SGPA (Sem {selectedSem}): {sgpa}
                            </Typography>
                            {totalCr === 0 && (
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Enter credits for each subject above to calculate SGPA.
                              </Typography>
                            )}
                          </Box>
                        );
                      })()}
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
                                <TableCell>Subject</TableCell>
                                <TableCell>Internal</TableCell>
                                <TableCell>External</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Result</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {previousAttempts.map((subj, idx) => (
                                <TableRow key={subj.subject_name + subj.sem + idx}>
                                  <TableCell>{subj.sem}</TableCell>
                                  <TableCell>{subj.subject_name}</TableCell>
                                  <TableCell>{subj.internal}</TableCell>
                                  <TableCell>{subj.external}</TableCell>
                                  <TableCell>{subj.total}</TableCell>
                                  <TableCell>{subj.result}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    {/* CGPA Section */}
                    {showSgpaCgpa && student.semesters && (() => {
                      const allSems = Object.keys(student.semesters);
                      let grandTotalCP = 0, grandTotalCr = 0;
                      const semRows = allSems.map(sem => {
                        const semCreds = credits[sem] || {};
                        const entries = Object.entries(student.semesters[sem] || {});
                        let semCP = 0, semCr = 0;
                        entries.forEach(([code, subj]) => {
                          const cr = parseInt(semCreds[code]) || 0;
                          const { points } = getGradeAndPoints(subj);
                          semCP += cr * points;
                          semCr += cr;
                        });
                        grandTotalCP += semCP;
                        grandTotalCr += semCr;
                        const sgpa = semCr > 0 ? (semCP / semCr).toFixed(2) : '—';
                        return { sem, semCr, sgpa, semCP };
                      });
                      const cgpa = grandTotalCr > 0 ? (grandTotalCP / grandTotalCr).toFixed(2) : '—';
                      const hasAnyCredits = grandTotalCr > 0;
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
                                    <TableCell>{r.semCr > 0 ? r.semCr : '—'}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1e40af' }}>{r.sgpa}</TableCell>
                                    <TableCell>{r.semCr > 0 ? r.semCP : '—'}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow sx={{ background: '#f0f4f8' }}>
                                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>{grandTotalCr > 0 ? grandTotalCr : '—'}</TableCell>
                                  <TableCell></TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>{grandTotalCr > 0 ? grandTotalCP : '—'}</TableCell>
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
