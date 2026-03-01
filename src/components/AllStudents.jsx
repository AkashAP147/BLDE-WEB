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

// College code dictionary (shortened, add more as needed)
const college_code_dict = {
      "ACHARAYA INSTITUTE OF TECHNOLOGY": "1AY",
      "A.P.S COLLEGE OF ENGINEERING.": "1AP",
      "AMC ENGINEERING COLLEGE": "1AM",
      "AMRUTHA INSTITUTE OF ENGINEERING AND MGMT. SCIENCES": "1AR",
      "ATRIA INSTITUTE OF TECHNOLOGY": "1AT",
      "BENGALURU COLLEGE OF ENGINEERING AND TECHNOLOGY": "1BC",
      "BENGALURU INSTITUTE OF TECHNOLOGY": "1BI",
      "BRINDAVAN COLLEGE OF ENGG": "1BO",
      "C.M.R INSTITUTE OF TECHNOLOGY": "1CR",
      "CAMBRIDGE INSTITUTE OF TECHNOLOGY": "1CD",
      "CHANNA BASAVESHWARA INSTITUTE OF TECHNOLOGY": "1CG",
      "CITY ENGINEERING COLLEGE": "1CE",
      "DON BOSCO INSTITUTE OF TECHNOLOGY": "1DB",
      "DR. T THIMAIAH INSTITUTE OF TECHNOLOGY": "1GV",
      "EAST point COLLEGE OF ENGINEERING AND TECHNOLOGY": "1EP",
      "EAST WEST INSTITUTE OF TECHNOLOGY": "1EW",
      "GHOUSIA COLLEGE OF ENGINEERING": "1GC",
      "GOVERNMENT S.K.S.J.T. INSTITUTE OF TECHNOLOGY": "1SK",
      "GOVERNMENT TOOL ROOM AND TRAINING CENTRE": "1GT",
      "GOVT. ENGINEERING COLLEGE RAMNAGAR": "1GG",
      "HKBK COLLEGE OF ENGINEERING": "1HK",
      "HMS INSTITUTE OF TECHNOLOGY": "1HM",
      "IMPACT COLLEGE OF ENGINEERING": "1IC",
      "JNANA VIKAS INSTITUTE OF TENCNOLOGY": "1JV",
      "JSS ACADEMY OF TECHNICIAL EDUCATION": "1JS",
      "K.S.INSTITUTE OF TECHNOLOGY": "1KS",
      "KALPATARU INSTITUTE OF TECHNOLOGY": "1KI",
      "KNS INSTITUTE OF TECHNOLOGY": "1KN",
      "M.S.ENGINEERING COLLEGE": "1ME",
      "OXFORD COLLEGE OF ENGINEERING": "1OX",
      "R R INSTITUTE OF TECHNOLOGY": "1RI",
      "R.L.JALAPPA INSTITUTE OF TECHNOLOGY": "1RL",
      "RAJARAJESWARI COLLEGE OF ENGINEERING": "1RR",
      "RAJIV GANDHI INSTITUTE OF TECHNOLOGY": "1RG",
      "RNS INSTITUTE OF TECHNOLOGY": "1RN",
      "S.J.C INSTITUTE OF TECHNOLOGY": "1SJ",
      "SAI VIDYA INSTITUTE OF TECHNOLOGY": "1VA",
      "SAMBHRAM INSTITUTE OF TECHNOLOGY": "1ST",
      "SAPTHAGIRI COLLEGE OF ENGINEERING": "1SG",
      "SEA COLLEGE OF ENGINEERING AND TECHNOLOGY": "1SP",
      "SRI SAIRAM COLLEGE OF ENGINEERING": "1SB",
      "SHIRDEVI INSTITUTE OF ENGINEERING AND TECHNOLOGY": "1SV",
      "SIR M. VISVESVARAYA INSTITUTE OF TECHNOLOGY": "1MV",
      "SJB INSTITUTE OF TECHNOLOGY": "1JB",
      "SRI KRISHNA INSTITUTE OF TECHNOLOGY": "1KT",
      "SRI REVANASIDDESHWARA INSTITUTE OF TECHNOLOGY": "1RC",
      "SRI VENKATESHWARA COLLEGE OF ENGINEERING": "1VE",
      "T. JOHN INSTITUTE OF TECHNOLOGY": "1TJ",
      "VEMANA INSTITUTE OF TECHNOLOGY": "1VI",
      "VIVEKANANDA INSTITUTE OF TECHNOLOGY": "1VK",
      "ACHARYS NRV SCHOOL OF ARCHITECTURE": "1AA",
      "ACS COLLEGE OF ENGINEERING": "1AH",
      "AKSHAYA INSTITUTE OF TECHNOLOGY": "1AK",
      "C BYEREGOWDA INSTITUTE OF TECHNOLOGY": "1CK",
      "VIJAYA VITTALA INSTITUTE OF TECHNOLOGY": "1VJ",
      "SHASHIB COLLEGE OF ENGINEERING": "1HS",
      "SAMPOORNA INSTITUTE OF TECHNOLOGY RESEARCH": "1SZ",
      "K.S SCHOOL OF ENGG & MGMT": "1KG",
      "GOPALAN COLLEGE OF ENGINEERING MANAGEMENT": "1GD",
      "BENGALURU TECHNOLOGICAL INSTITUTE": "1BH",
      "JYOTHY INSTITUTE OF TECHNOLOGY": "1JT",
      "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MGMT.": "1DT",
      "CAMBRIDGE INSITUTE OF TECHNOLOGY NORTH CAMPUS BANGALORE": "1AJ",
      "DAYANAND SAGAR SCHOOL OF ARCHITECTURE": "1DC",
      "IMPACT SCHOOL OF ARCHITECTURE": "1IS",
      "R V COLLEGE OF ARCHITECTURE": "1RW",
      "BMS SCHOOL OF ARCHITECTURE": "1BQ",
      "S J B School of Arch. & Planning": "1JA",
      "GOPALAN SCHOOL OF ARCHITECTURE & PLANNING": "1GO",
      "R.R. SCHOOL OF ARCHITECTURE": "1RR",
      "ADITHYA ACADEMY OF ARCHITECTURE & DESGIN": "1AN",
      "BGS SCHOOL OF ARCHITECTURE & PLANNING": "1PC",
      "K S SCHOOL OF ARCHITECTURE": "1KF",
      "EAST WEST COLLEGE OF ENGG": "1EE",
      "SRI VINAYAKA INSTITUTE OF TECHNOLOGY": "1VB",
      "Sir. M. V. School of Architecture": "1IV",
      "Nitte School of Architecture": "1NS",
      "HMS School of Architecture": "1IT",
      "Brindavan College of Architecture": "1IE",
      "BMS College of Architecture": "1CF",
      "OXFORD SCHOOL OF ARCHITECTURE": "1OQ",
      "RNS SCHOOL OF ARCHITECTURE": "1RQ",
      "SRI BASAVESHWAR INSTITUTE OF TECHNOLOGY": "1SW",
      "R V INSTITUTE OF TECHNOLOGY AND MGMT": "1RF",
      "EAST WEST SCHOOL OF ARCHITECTURE": "1WS",
      "BGS College of Engineering & Technology": "1",
      "Aditya College of Engineering & Technology": "1",
      "Akash Institute of Engineering & Technology": "1",
      "Ghousia Institute of Technology for Women": "1",
      "ANJUMAN  INSTITUTE OF TECHNOLOGY & MANAGEMENT": "2AB",
      "BLDEAS COLLEGE OF ENGINEERING": "2BL",
      "GOVT. ENGINEERING COLLEGE HAVERI": "2GO",
      "HIRASUGAR INSTITUTE OF TECHNOLOGY": "2HN",
      "KLE COLLEGE OF ENG. AND TECHNOLOGY CHIKODI": "2KD",
      "KLE INSTITUTE OF TECH HUBLI": "2KE",
      "KLE Dr M. S. SHESHGIRI COLLEGE OF ENGINEERING AND TECHNOLOGY": "2KL",
      "MALIK SANDAL INSTITUTE OF ART AND ARCHITECTURE": "2MB",
      "MARATHA MANDALS ENGINEERING COLLEGE": "2MM",
      "RURAL ENGINEERING COLLEGE, HULKOTI": "2RH",
      "S G BALEKUNDRI INST. OF TECH": "2BU",
      "S.T.J. INSTITUTE OF TECHNOLOGY": "2SR",
      "SECAB INSTITUTE OF ENGINEERING AND TECHNOLOGY": "2SA",
      "SMT. KAMALA AND SRI VENKAPPA M. AGADI COLLEGE OF ENGINEERING AND TECHNOLOGY": "2KA",
      "SRI TONTADARAYA COLLEGE OF ENGINEERING": "2TG",
      "VISHWANATHARAO DESHPANDE INSTITUTE OF TECHNOLOGY, HALIYAL": "2VD",
      "GOVT. ENGINEERING COLLEGE HUVINHADAGALI": "2GB",
      "GOVERNMENT ENGINEERING COLLEGE KARWAR": "2GP",
      "ANGADI INSTITUTE OF TECHNOLOGY AND MGMT.": "2AG",
      "JAIN COLLEGE OF ENGINEERING": "2JI",
      "V S M’S INSTITUTE OF TECHNOLOGY": "2VS",
      "AGM RURAL COLLEGE OF ENGINEERING & TECHNOLOGY": "2AV",
      "GRIJABAI SAIL INSTITUTE OF TECHNOLOGY KARWAR": "2GJ",
      "BILURU GURUBASAVA MAHASWAMIJI INSTITUTE OF TECHNOLOGY": "2LB",
      "BASAVA ENGG SCHOOL OF TECHNOLOGY ZALAKI": "2VL",
      "JAIN COLLEGE OF ENGG HUBBALLI": "2IH",
      "GOVERNMENT ENGINEERING COLLEGE, TALAKAL": "2LG",
      "ANGADI SCHOOL OF ARCHITECTURE BELAGAVI": "2KF",
      "JAIN COLLEGE OF ENGINEERING & RESEARCH BELAGAVI": "2JR",
      "Govt.Engineering College,Ron Road": "2",
      "BASAVAKALYAN ENGINEERING COLLEGE": "3BK",
      "GOVT. ENGINEERING COLLEGE RAICHUR": "3GU",
      "GURU NANAK DEV ENGINEERING COLLEGE": "3GN",
      "K.C.T. ENGINEERING COLLEGE": "3KC",
      "KHAJA BANDA NAWAZ COLLEGE OF ENGINEERING": "3KB",
      "NAVODAYA INSTITUTE OF TECHNOLOGY": "3NA",
      "PROUDADEVARAYA INSTITUTE OF TECHNOLOGY": "3PG",
      "RAO BAHADDUR Y MAHABALESHWARAPPA ENGG COLLEGE": "3VC",
      "BHEEMANNA KHANDRE INSTITUTE OF TECHNOLOGY, BHALKI": "3RB",
      "SLN COLLEGE OF ENGINEERING": "3SL",
      "VEERAPPA NISTY ENGINEERING COLLEGE": "3VN",
      "LINGARAJ APPA ENGINEERING COLLEGE": "3LA",
      "GODUTAI ENGINEERING COLLEGE FOR WOMEN": "3GF",
      "SHETTY INSTITUTE OF TECHNOLOGY": "3TS",
      "GOVERNMENT ENGINEERING COLLEGE,GANGAVATI": "3NG",
      "GOVERNMENT ENGINEERING COLLEGE,BIDAR": "3NG",
      "Poojya Dr. Shivakumar Swamiji School of Architecture Kalaburagi": "3NG",
      "ADICHUNCHANAGIRI INSTITUTE OF TECHNOLOGY": "4AI",
      "ALVAS INST. OF ENGG. AND TECHNOLOGY": "4AL",
      "BAHUBALI COLLEGE OF ENGINEERING": "4BB",
      "BAPUJI INSTITUTE OF ENGINEERING AND TECHNOLOGY": "4BD",
      "BEARYS INSTITUTE OF TECHNOLOGY": "4BP",
      "CANARA ENGINEERING COLLEGE": "4CB",
      "COORG INSTITUTE OF TECHNOLOGY": "4CI",
      "YENEPOYA INSTITUTE OF TECHNOLOGY": "4DM",
      "GM.INSTITUTE OF TECHONOLOGY": "4GM",
      "GOVT. ENGINEERING COLLEGE CHAMARAJANAGARA": "4GE",
      "GOVT. ENGINEERING COLLEGE HASSAN": "4GH",
      "GOVT. ENGINEERING COLLEGE KUSHAL NAGAR": "4GL",
      "GOVT. ENGINEERING COLLEGE MANDYA": "4GK",
      "GOVT. TOOL ROOM AND TRAINING CENTRE": "4GR",
      "GSSS INSTITUTE OF ENGINEERING AND TECHNOLOGY FOR WOMEN": "4GW",
      "JAWAHARLAL NEHRU NATIONAL COLLEGE OF ENGINERING": "4JN",
      "K.V.G. COLLEGE OF ENGINEERING": "4KV",
      "KARAVALI INSTITUTE OF TECHNOLOGY": "4KM",
      "MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE": "4MH",
      "MANGALORE INSTITUTE OF TECHNOLOGY AND ENGINEERING": "4MT",
      "MOODLAKATTE INSTITUTE OF TECHONOLOGY": "4MK",
      "NIE INST. OF TECHNOLOGY": "4NN",
      "P.A.COLLEGE OF ENGINEERING": "4PA",
      "PES INSITUTE OF TECHNOLOGY AND MGMT.": "4PM",
      "RAJEEV INST. OF TECHNOLOGY": "4RA",
      "SHREE DEVI INSTITUTE OF TECHNOLOGY": "4SH",
      "SJM INSTITUTE OF TECHNOLOGY": "4SM",
      "SRI DHARMASTHAL MANJUNATHESHWAR INSTITUTE OF TECHNOLOGY": "4SU",
      "SRI JAYACHAMRAJENDRA COLLEGE OFF ENGG. EVENING": "4JE",
      "SRINIVAS INSTITUTE OF TECHNOLOGY": "4SN",
      "VIDYA VIKAS INSTITUTE OF ENGINEERING AND TECHNOLOGY": "4VM",
      "VIVEKANANDA COLLEGE OF ENGINEERING AND TECHNOLOGY": "4VP",
      "NAVKIS COLLEGE OF ENGINEERING HASSAN": "4YG",
      "SHRI MADHWA VADIRAJA INSTITUTE OF TECHNOLOGY & MANAGEMENT": "4MW",
      "ACADEMY FOR TECHNICAL AND MANAGEMENT EXCELLENCE": "4AD",
      "UBDT ENGINEERING  COLLEGE DAVANAGERE ( Constituent College of VTU )": "4UB",
      "G MADEGOWDA INSTITUTE OF TECHNOLOGY": "4MG",
      "JAIN INSTITUTE OF TECHNOLOGY": "4JD",
      "MANGALORE MARINE COLLEGE & TECHNOLOGY": "4MR",
      "CAUVERY INSTITUTE OF TECHNOLOGY": "4CA",
      "MYSORE SCHOOL OF ARCHITECTURE": "4MA",
      "BEARYS ENVIRONMENT ARCHITECTURE DESIGN SCHOOL MANGALORE": "4ED",
      "MYSORE COLLEGE OF ENGINEERING AND MANAGEMENT": "4MO",
      "MYSURU ROYAL INSTITUTE OF TECHNOLOGY": "4MU",
      "WADIYAR CENTRE FOR ARCHITECTURE": "4CM",
      "Maharaja Institute of Technology": "4MN",
      "A. J. Institute of Engineering": "4JK",
      "GOVERNMENT ENGINEERING COLLEGE,MOSALE HOSAHALLI": "4HG",
    };

export default function AllStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [semester, setSemester] = useState("");
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showStudentStats, setShowStudentStats] = useState(false);
  const [college, setCollege] = useState("");
  const [allColleges, setAllColleges] = useState([]);

  useEffect(() => {
    const studentsRef = ref(db, "students");
    return onValue(studentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setStudents(data);
      // Collect all unique college codes from USN
      const collegeSet = new Set();
      Object.keys(data).forEach(usn => {
        if (usn && usn.length >= 3) {
          collegeSet.add(usn.substring(0, 3).toUpperCase());
        }
      });
      // Map code to name for only available colleges
      const codeToName = {};
      Object.entries(college_code_dict).forEach(([name, code]) => {
        if (collegeSet.has(code)) {
          codeToName[code] = name;
        }
      });
      // If a code is present in data but not in dict, show code as name
      collegeSet.forEach(code => {
        if (!codeToName[code]) codeToName[code] = code;
      });
      // Sort by name
      const sortedColleges = Array.from(collegeSet).map(code => ({ code, name: codeToName[code] })).sort((a, b) => a.name.localeCompare(b.name));
      setAllColleges(sortedColleges);
      setLoading(false);
    });
  }, []);

  // For stats: always use college, branch, batch, search filters, but NOT semester
  const statsBase = React.useMemo(() => {
    let arr = Object.entries(students).map(([usn, data]) => {
      // Add collegeCode property for filtering
      const collegeCode = usn && usn.length >= 3 ? usn.substring(0, 3).toUpperCase() : "";
      return { usn, ...data, collegeCode };
    });
    if (college) arr = arr.filter((s) => s.collegeCode === college);
    if (branch) arr = arr.filter((s) => s.branch_code === branch);
    if (batch) arr = arr.filter((s) => s.batch === batch);
    if (search) arr = arr.filter((s) => s.usn.toLowerCase().includes(search.toLowerCase()) || (s.name && s.name.toLowerCase().includes(search.toLowerCase())));
    return arr;
  }, [students, college, branch, batch, search]);

  const included = statsBase.filter(s => {
    if (!s.semesters || Object.keys(s.semesters).length === 0) return false;
    if (!semester) return true;
    return Object.keys(s.semesters).includes(semester);
  });
  const excluded = statsBase.filter(s => {
    if (!s.semesters || Object.keys(s.semesters).length === 0) return true;
    if (!semester) return false;
    return !Object.keys(s.semesters).includes(semester);
  });

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
    let arr = Object.entries(students).map(([usn, data]) => {
      const collegeCode = usn && usn.length >= 3 ? usn.substring(0, 3).toUpperCase() : "";
      return { usn, ...data, collegeCode };
    });
    if (college) arr = arr.filter((s) => s.collegeCode === college);
    if (branch) arr = arr.filter((s) => s.branch_code === branch);
    if (batch) arr = arr.filter((s) => s.batch === batch);
    if (semester) arr = arr.filter((s) => s.semesters && Object.keys(s.semesters).includes(semester));
    if (search) arr = arr.filter((s) => s.usn.toLowerCase().includes(search.toLowerCase()) || (s.name && s.name.toLowerCase().includes(search.toLowerCase())));
    setFiltered(arr);
  }, [students, college, branch, batch, semester, search]);


  // Branch options filtered by college (and batch if selected), only show branches with results present
  const branchOptions = React.useMemo(() => {
    return Array.from(
      new Set(
        Object.entries(students)
          .filter(([usn, s]) => {
            if (college && usn.substring(0, 3).toUpperCase() !== college) return false;
            if (batch && s.batch !== batch) return false;
            // Only include if student has at least one semester/result
            return s.semesters && Object.keys(s.semesters).length > 0;
          })
          .map(([_, s]) => s.branch_code)
      )
    ).sort();
  }, [students, college, batch]);

  // Batch options filtered by college (and branch if selected), only show batches with results present
  const batchOptions = React.useMemo(() => {
    return Array.from(
      new Set(
        Object.entries(students)
          .filter(([usn, s]) => {
            if (college && usn.substring(0, 3).toUpperCase() !== college) return false;
            if (branch && s.branch_code !== branch) return false;
            // Only include if student has at least one semester/result
            return s.semesters && Object.keys(s.semesters).length > 0;
          })
          .map(([_, s]) => s.batch)
      )
    ).sort();
  }, [students, college, branch]);

  // Semester options filtered by college, batch, and branch, only show semesters with results present
  const semesterOptions = React.useMemo(() => {
    return Array.from(
      new Set(
        Object.entries(students)
          .filter(([usn, s]) => {
            if (college && usn.substring(0, 3).toUpperCase() !== college) return false;
            if (batch && s.batch !== batch) return false;
            if (branch && s.branch_code !== branch) return false;
            return true;
          })
          .flatMap(([_, s]) => s.semesters ? Object.keys(s.semesters) : [])
      )
    ).sort((a, b) => Number(a) - Number(b));
  }, [students, college, batch, branch]);

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
          </Typography>
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
          <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
            <Grid>
              <FormControl fullWidth sx={{ minWidth: 160 }}>
                <InputLabel>College</InputLabel>
                <Select value={college} label="College" onChange={e => { setCollege(e.target.value); setBatch(""); setBranch(""); setSemester(""); }} sx={{ minWidth: 160 }}>
                  <MenuItem value="">All</MenuItem>
                  {allColleges.map(c => (
                    <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>Branch</InputLabel>
                <Select value={branch} label="Branch" onChange={(e) => setBranch(e.target.value)} sx={{ minWidth: 120 }}>
                  <MenuItem value="">All</MenuItem>
                  {branchOptions.map((b) => (
                    <MenuItem key={b} value={b}>{branches.find(x => x.code === b)?.name || b}</MenuItem>
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
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>Semester</InputLabel>
                <Select value={semester} label="Semester" onChange={(e) => setSemester(e.target.value)} sx={{ minWidth: 120 }}>
                  <MenuItem value="">All</MenuItem>
                  {semesterOptions.map((sem) => (
                    <MenuItem key={sem} value={sem}>{sem}</MenuItem>
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
          {/* Student count for current filters */}
          <Box mb={2} display="flex" justifyContent="flex-end">
            <Typography variant="subtitle1" sx={{ color: '#0ea5e9', fontWeight: 700 }}>
              Students found: {filtered.length}
            </Typography>
          </Box>
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
