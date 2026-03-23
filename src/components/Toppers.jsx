import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
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
  const [toppers, setToppers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semFilter, setSemFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [allSems, setAllSems] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [allColleges, setAllColleges] = useState([]);
  const [expandedUsn, setExpandedUsn] = useState(null); // track which topper row is expanded
  const [searchQuery, setSearchQuery] = useState(""); // search by name or USN

  useEffect(() => {
    // College code dictionary (shortened for brevity, use your full list)
    const college_code_dict = {
    //Bengaluru
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
    //Belagavi
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
    //Kalaburagi
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
    //Mysuru
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
    const studentsRef = ref(db, "students");
    onValue(studentsRef, (snapshot) => {
      const students = normalizeStudents(snapshot.val() || {});
      // Collect all unique semesters, batches, branches, colleges
      const semSet = new Set();
      const batchSet = new Set();
      const branchSet = new Set();
      const collegeSet = new Set();
      Object.entries(students).forEach(([usn, data]) => {
        if (data.semesters) {
          Object.keys(data.semesters).forEach(sem => semSet.add(sem));
        }
        if (data.batch) batchSet.add(data.batch);
        if (data.branch) branchSet.add(data.branch);
        // College code is first 3 chars of usn (case-insensitive)
        if (usn && usn.length >= 3) {
          collegeSet.add(usn.substring(0, 3).toUpperCase());
        }
      });
      // Filter semSet based on selected college, batch, branch
      let filteredSemSet = new Set();
      Object.entries(students).forEach(([usn, data]) => {
        // College code is first 3 chars of usn
        let collegeCode = usn && usn.length >= 3 ? usn.substring(0, 3).toUpperCase() : "";
        if (
          (!collegeFilter || collegeCode === collegeFilter) &&
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
            // Add college code for filtering
            let collegeCode = usn && usn.length >= 3 ? usn.substring(0, 3).toUpperCase() : "";
            allToppers.push({
              usn,
              name: data.name,
              branch: data.branch,
              batch: data.batch,
              sem,
              total,
              collegeCode,
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
    // Listen to students DB for percentage calculation
    const studentsRef = ref(db, "students");
    return onValue(studentsRef, (snapshot) => {
      setStudentsMap(normalizeStudents(snapshot.val() || {}));
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: 800,
              color: '#1e40af',
              mb: 5,
            }}
          >
            Toppers
          </Typography>
          {/* Filters */}
          <Box mb={2} display="flex" flexWrap="wrap" gap={2} justifyContent="center">
            {/* College Filter */}
            <select
              value={collegeFilter}
              onChange={e => {
                setCollegeFilter(e.target.value);
                setBatchFilter("");
                setBranchFilter("");
                setSemFilter("");
              }}
              style={{ width: 180, padding: 8, borderRadius: 6, marginTop: 4, color: collegeFilter ? '#000000' : '#353232' }}
            >
              <option value="" disabled hidden>College</option>
              {allColleges.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            {/* Batch Filter (filtered by college) */}
            <select
              value={batchFilter}
              onChange={e => {
                setBatchFilter(e.target.value);
                setBranchFilter("");
                setSemFilter("");
              }}
              style={{ width: 120, padding: 8, borderRadius: 6, marginTop: 4, color: batchFilter ? '#000000' : '#353232' }}
            >
              <option value="" disabled hidden>Batch</option>
              {Array.from(
                new Set(
                  toppers
                    .filter(s => (collegeFilter ? s.collegeCode === collegeFilter : true))
                    .map(s => s.batch)
                )
              )
                .sort()
                .map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
            </select>
            {/* Branch Filter (filtered by college and batch) */}
            <select
              value={branchFilter}
              onChange={e => {
                setBranchFilter(e.target.value);
                setSemFilter("");
              }}
              style={{ width: 120, padding: 8, borderRadius: 6, marginTop: 4, color: branchFilter ? '#000000' : '#353232' }}
            >
              <option value="" disabled hidden>Branch</option>
              {Array.from(
                new Set(
                  toppers
                    .filter(s =>
                      (collegeFilter ? s.collegeCode === collegeFilter : true) &&
                      (batchFilter ? s.batch === batchFilter : true)
                    )
                    .map(s => s.branch)
                    .filter(b => b && b !== "undefined" && b !== "null")
                )
              )
                .sort()
                .map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
            </select>
            {/* Search Filter */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Name / USN"
              style={{ width: 180, padding: 8, borderRadius: 6, marginTop: 4, border: '1px solid #cbd5e1', outline: 'none', color: '#000' }}
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
                      (collegeFilter ? s.collegeCode === collegeFilter : true) &&
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
                      minWidth: 70,
                      fontWeight: 700,
                      borderRadius: 6,
                      background: semFilter === s ? '#1e40af' : '#f1f5f9',
                      color: semFilter === s ? '#fff' : '#475569',
                      fontSize: 15,
                      padding: '6px 18px',
                      marginRight: 8,
                      border: 'none',
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
            <Box sx={{ width: '100%', display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <TableContainer
                component={Paper}
                sx={{
                  background: '#ffffff',
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
                          (branchFilter ? s.branch === branchFilter : true) &&
                          (collegeFilter ? s.collegeCode === collegeFilter : true)
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
                            <TableCell>{s.branch}</TableCell>
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
                  background: 'rgba(0,0,0,0.45)', zIndex: 1300,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: '#fff', borderRadius: 16, padding: '24px 20px 20px',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxWidth: 700, width: '95vw',
                    maxHeight: '85vh', overflowY: 'auto', position: 'relative',
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
                    <TableContainer component={Paper} sx={{ boxShadow: 0, borderRadius: 2 }}>
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
