import React, { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { Pie } from "react-chartjs-2";

const branches = [
  { code: "CI", name: "Artificial Intelligence & Machine Learning" },
  { code: "CS", name: "Computer Science" },
  { code: "EC", name: "Electronics & Communication" },
  { code: "CV", name: "Civil Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
];

export default function AllStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showStudentStats, setShowStudentStats] = useState(false);

  useEffect(() => {
    const studentsRef = ref(db, "students");
    return onValue(studentsRef, (snapshot) => {
      setStudents(snapshot.val() || {});
      setLoading(false);
    });
  }, []);

  // Included/Excluded students for current filter (for stats feature)
  const included = filtered.filter(s => s.semesters && Object.keys(s.semesters).length > 0);
  const excluded = filtered.filter(s => !s.semesters || Object.keys(s.semesters).length === 0);

  // Pie chart data for included/excluded
  const pieData = {
    labels: ["Included", "Excluded"],
    datasets: [
      {
        data: [included.length, excluded.length],
        backgroundColor: ["#1976d2", "#d32f2f"],
      },
    ],
  };

  useEffect(() => {
    let arr = Object.entries(students).map(([usn, data]) => ({ usn, ...data }));
    if (branch) arr = arr.filter((s) => s.branch_code === branch);
    if (batch) arr = arr.filter((s) => s.batch === batch);
    if (search) arr = arr.filter((s) => s.usn.toLowerCase().includes(search.toLowerCase()) || (s.name && s.name.toLowerCase().includes(search.toLowerCase())));
    setFiltered(arr);
  }, [students, branch, batch, search]);

  const batchOptions = Array.from(new Set(Object.values(students).map((s) => s.batch))).sort();

  if (loading) {
    return (
      <Box p={2} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress size={60} thickness={5} sx={{ color: '#4f46e5', mb: 3 }} />
        <Typography variant="h6" sx={{ color: '#4f46e5', mt: 2 }}>
          Loading students...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Card sx={{ maxWidth: 1200, margin: '32px auto', borderRadius: 6, boxShadow: '0 6px 32px 0 #b2ebf299', background: 'rgba(255,255,255,0.95)' }}>
        <CardContent>
          <Typography variant="h3" gutterBottom sx={{ color: '#4f46e5', fontWeight: 900, letterSpacing: '-2px', mb: 2, textAlign: 'center' }}>
            Admin Corner
          {/* Admin Stats Feature Button */}
          <Box display="flex" justifyContent="center" mb={2}>
            <Button variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: 3 }} onClick={() => setShowStudentStats(true)}>
              Show Excluded Students
            </Button>
          </Box>
          {/* Student Stats Dialog */}
          <Dialog open={showStudentStats} onClose={() => setShowStudentStats(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Excluded Students (No Data)</DialogTitle>
            <DialogContent>
              {excluded.length > 0 ? (
                <>
                  <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 700, mt: 1 }}>Excluded Students ({excluded.length}):</Typography>
                  <ul style={{ maxHeight: 200, overflowY: 'auto', fontSize: 13, margin: 0, paddingLeft: 20 }}>
                    {excluded.map(s => <li key={s.usn}>{s.name} ({s.usn})</li>)}
                  </ul>
                </>
              ) : (
                <Typography sx={{ color: '#1976d2', mt: 2 }}>No excluded students for the current filter.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowStudentStats(false)} color="primary" variant="contained">Close</Button>
            </DialogActions>
          </Dialog>
          </Typography>
          <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
            <Grid>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>Branch</InputLabel>
                <Select value={branch} label="Branch" onChange={(e) => setBranch(e.target.value)} sx={{ minWidth: 120 }}>
                  <MenuItem value="">All</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.code} value={b.code}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>Batch</InputLabel>
                <Select value={batch} label="Batch" onChange={(e) => setBatch(e.target.value)} sx={{ minWidth: 120 }}>
                  <MenuItem value="">All</MenuItem>
                  {batchOptions.map((b) => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid>
              <TextField
                label="Search USN/Name"
                value={search}
                onChange={e => setSearch(e.target.value)}
                variant="outlined"
                fullWidth
              />
            </Grid>
          </Grid>
          <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 2px 12px 0 #b2ebf266' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>USN</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Semesters</TableCell>
                  <TableCell>Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" style={{ color: '#64748b', fontSize: '1.1rem', padding: '32px 0' }}>
                      <div>No students found for the selected filters.</div>
                      <div style={{ color: '#b2ebf2', fontSize: '1.5rem', marginTop: 8 }}>Try changing your filter or check your database.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.usn}>
                      <TableCell>{s.usn}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell style={{ minWidth: 120, paddingLeft: 24, paddingRight: 24 }}>{s.batch}</TableCell>
                      <TableCell style={{ minWidth: 120, paddingLeft: 24, paddingRight: 24 }}>{s.branch}</TableCell>
                      <TableCell>{s.semesters ? Object.keys(s.semesters).join(", ") : "-"}</TableCell>
                      <TableCell>
                        <button
                          style={{ padding: '4px 12px', borderRadius: 6, background: '#0ea5e9', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                          onClick={() => navigate(`/?usn=${encodeURIComponent(s.usn)}`)}
                        >
                          View Result
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
    
  );
}
