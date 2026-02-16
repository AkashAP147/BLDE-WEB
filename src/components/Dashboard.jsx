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
  // Only include students of the same branch as the current student (if available)
  const currentBranch = student ? student.branch : null;
  const usnList = currentBranch
    ? Object.keys(students).filter(k => students[k].branch === currentBranch)
    : Object.keys(students);
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 2, sm: 6 },
        px: { xs: 0.5, sm: 0 },
        background: { xs: '#0f172a', sm: 'none' },
      }}
    >
      <Card
        sx={{
          mt: { xs: 1, sm: 4 },
          maxWidth: { xs: '100%', sm: 1000 },
          mx: 'auto',
          p: { xs: 1.5, sm: 4 },
          background: '#0f172a',
          border: '1px solid rgba(148,163,184,0.15)',
          boxShadow: { xs: 1, sm: '0 8px 32px 0 rgba(36,59,85,0.12)' },
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
              background: 'linear-gradient(to right, #292ce4, #0e85bc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
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
                  background: 'linear-gradient(to right, #4f46e5, #0ea5e9)',
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
              sx={{ color: "#94a3b8", mt: 4 }}
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
              <Typography sx={{ color: '#94a3b8', mb: 2, fontSize: { xs: 13, sm: 16 } }}>
                {student.branch} | Batch {student.batch}
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
                        background: selectedSem === s ? 'linear-gradient(to right, #4f46e5, #0ea5e9)' : undefined,
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
                      <Box mb={2}>
                        <Button
                          variant={highlightFail ? 'contained' : 'outlined'}
                          sx={{ background: highlightFail ? 'linear-gradient(to right, #4f46e5, #0ea5e9)' : undefined, fontWeight: 700, borderRadius: 2 }}
                          onClick={() => setHighlightFail(v => !v)}
                        >
                          {highlightFail ? 'Hide' : 'Show'} Failed Subject Highlight
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
                        const maxMarks = mainSubjects.length * 100; // Assuming each subject is out of 100
                        const percent = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : "0.00";
                        return (
                          <Typography variant="subtitle1" sx={{ color: '#38bdf8', fontWeight: 700, mb: 2 }}>
                            Percentage: {percent}%
                          </Typography>
                        );
                      })()}

                      <TableContainer
                        component={Paper}
                        sx={{
                          background: '#1e293b',
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
                              borderRight: '1px solid #334155',
                              borderBottom: '1px solid #334155',
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
                                return (
                                  <TableRow
                                    key={code}
                                    hover
                                    sx={{
                                      ...(isFail ? { backgroundColor: '#ef4444' } : {}),
                                      '&:hover': {
                                        backgroundColor: isFail ? '#dc2626' : 'rgba(99,102,241,0.08)',
                                      },
                                    }}
                                  >
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.subject_name}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.internal}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.external}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.total}</TableCell>
                                    <TableCell sx={isFail ? { color: '#fff', fontWeight: 700 } : {}}>{subj.result}</TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                    {/* Previous Attempts Section */}
                    {previousAttempts.length > 0 && (
                      <Box mt={6}>
                        <Typography variant="h6" mb={2} sx={{ color: '#f59e42' }}>
                          Previous Attempts for Repeated Subjects
                        </Typography>
                        <TableContainer
                          component={Paper}
                          sx={{
                            background: '#1e293b',
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
                                borderRight: '1px solid #334155',
                                borderBottom: '1px solid #334155',
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
                sx={{ minWidth: 56, minHeight: 56, background: 'linear-gradient(to right, #4f46e5, #0ea5e9)', color: '#fff', fontSize: 32, fontWeight: 700, boxShadow: 2, visibility: currentIndex > 0 ? 'visible' : 'hidden', borderRadius: 2 }}
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
                sx={{ minWidth: 56, minHeight: 56, background: 'linear-gradient(to right, #4f46e5, #0ea5e9)', color: '#fff', fontSize: 32, fontWeight: 700, boxShadow: 2, visibility: currentIndex < usnList.length - 1 ? 'visible' : 'hidden', borderRadius: 2 }}
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
