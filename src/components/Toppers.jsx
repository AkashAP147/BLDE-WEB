import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
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
  const [toppers, setToppers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semFilter, setSemFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [allSems, setAllSems] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);

  useEffect(() => {
    const studentsRef = ref(db, "students");
    onValue(studentsRef, (snapshot) => {
      const students = snapshot.val() || {};
      // Collect all unique semesters, batches, branches
      const semSet = new Set();
      const batchSet = new Set();
      const branchSet = new Set();
      Object.values(students).forEach(data => {
        if (data.semesters) {
          Object.keys(data.semesters).forEach(sem => semSet.add(sem));
        }
        if (data.batch) batchSet.add(data.batch);
        if (data.branch) branchSet.add(data.branch);
      });
      setAllSems(Array.from(semSet).sort((a, b) => Number(a) - Number(b)));
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
              branch: data.branch,
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
    });
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', py: 6, px: { xs: 0, sm: 0 } }}>
      <Card
        sx={{
          mt: { xs: 2, sm: 4 },
          maxWidth: { xs: '99vw', sm: 800 },
          width: { xs: '99vw', sm: 'auto' },
          mx: 'auto',
          p: { xs: 1, sm: 4 },
          background: '#0f172a',
          border: '1px solid rgba(148,163,184,0.15)',
          boxShadow: '0 8px 32px 0 rgba(36,59,85,0.12)',
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(to right, #292ce4, #0e85bc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 5,
            }}
          >
            Top 10 Toppers
          </Typography>
          {/* Filters */}
          <Box mb={2} display="flex" flexWrap="wrap" gap={2} justifyContent="center">
            {/* Batch Filter */}
            <select
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              style={{ width: 120, padding: 8, borderRadius: 6, marginTop: 4, color: batchFilter ? '#000000' : '#353232' }}
            >
              <option value="" disabled selected hidden>Batch</option>
              {allBatches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {/* Branch Filter (no 'All' option) */}
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              style={{ width: 120, padding: 8, borderRadius: 6, marginTop: 4, color: branchFilter ? '#000000' : '#353232' }}
            >
              <option value="" disabled selected hidden>Branch</option>
              {allBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
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
              {allSems.map(s => (
                <button
                  key={s}
                  onClick={() => setSemFilter(s)}
                  style={{
                    minWidth: 70,
                    fontWeight: 700,
                    borderRadius: 6,
                    background: semFilter === s ? 'linear-gradient(to right, #4f46e5, #0ea5e9)' : '#e0e7ef',
                    color: semFilter === s ? '#fff' : '#23272f',
                    fontSize: 15,
                    padding: '6px 18px',
                    marginRight: 8,
                    border: 'none',
                    boxShadow: semFilter === s ? '0 2px 8px #4f46e522' : 'none',
                    transition: 'all 0.2s',
                    flex: '0 0 auto',
                    outline: semFilter === s ? '2px solid #0ea5e9' : 'none',
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
            <Box sx={{ width: '100%', display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <TableContainer
                component={Paper}
                sx={{
                  background: '#1e293b',
                  borderRadius: 3,
                  width: { xs: 'auto', sm: '100%' },
                  minWidth: { xs: 0, sm: 'auto' },
                  maxWidth: { xs: '100vw', sm: 'none' },
                  overflowX: 'auto',
                  boxShadow: 0,
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 500,
                    width: '100%',
                    margin: { xs: '0 auto', sm: 0 },
                    '& th, & td': {
                      padding: { xs: '4px 6px', sm: '8px 12px' },
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {toppers
                      .filter(s =>
                        (semFilter ? s.sem === semFilter : false) &&
                        (batchFilter ? s.batch === batchFilter : true) &&
                        (branchFilter ? s.branch === branchFilter : true)
                      )
                      .slice(0, 10)
                      .map((s, i) => (
                        <TableRow key={s.usn + s.sem} hover>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.usn}</TableCell>
                          <TableCell>{s.branch}</TableCell>
                          <TableCell>{s.sem}</TableCell>
                          <TableCell>{s.total}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
