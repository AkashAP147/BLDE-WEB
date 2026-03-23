import React, { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { normalizeStudents } from "../normalizeStudents";
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { Pie } from "react-chartjs-2";
import jsPDF from "jspdf";
import { Chart, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showPdfExportDialog, setShowPdfExportDialog] = useState(false);
  const [pdfChartSelections, setPdfChartSelections] = useState({ pie: true, bar: true, dept: true });

  useEffect(() => {
    const studentsRef = ref(db, "students");
    return onValue(studentsRef, (snapshot) => {
      const data = normalizeStudents(snapshot.val() || {});
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

  // Consolidated PDF export: all branches in one PDF
  const handleExportConsolidatedPDF = async (selections) => {
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentTop = 30;
      const chartMaxW = pageW - margin * 2;
      const chartMaxH = pageH - contentTop - 20;

      // Get college display name
      let collegeName = 'All Colleges';
      if (college) {
        const cName = Object.entries(college_code_dict).find(([, code]) => code === college);
        collegeName = cName ? cName[0] : college;
      }

      // Build data array from students object
      const allData = Object.entries(students).map(([usn, s]) => {
        const collegeCode = usn && usn.length >= 3 ? usn.substring(0, 3).toUpperCase() : '';
        return { usn: s.usn || usn, ...s, collegeCode };
      });

      // Apply college, batch, semester filters
      const baseFiltered = allData.filter(s => {
        if (college && s.collegeCode !== college) return false;
        if (batch && String(s.batch) !== String(batch)) return false;
        if (semester && !(s.semesters && Object.keys(s.semesters).includes(semester))) return false;
        if (!s.semesters || Object.keys(s.semesters).length === 0) return false;
        return true;
      });

      // Get all semesters present in filtered data
      const allSemesters = [...new Set(baseFiltered.flatMap(s => Object.keys(s.semesters || {})))]
        .map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 8).sort((a, b) => a - b);
      const semKey = semester || (allSemesters.length > 0 ? String(allSemesters[allSemesters.length - 1]) : '1');

      // Get all unique branches
      const allBranches = [...new Set(baseFiltered.map(s => s.branch).filter(Boolean))].sort();

      // Helper: render a chart to image
      const renderChartToImage = (type, chartData, chartOptions = {}, width = 800, height = 500, chartPlugins = []) => {
        return new Promise((resolve) => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const ctx = tempCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          const tempChart = new Chart(ctx, {
            type,
            data: JSON.parse(JSON.stringify(chartData)),
            options: { ...chartOptions, responsive: false, animation: false, devicePixelRatio: 1 },
            plugins: chartPlugins,
          });
          requestAnimationFrame(() => {
            const imgData = tempCanvas.toDataURL('image/png');
            tempChart.destroy();
            resolve(imgData);
          });
        });
      };

      // Helper: add header
      const addPageHeader = (title, headerText) => {
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

      // Helper: compute pass/fail for a set of students in a given semester
      const computePassFail = (studentsArr, semK) => {
        let pass = 0, fail = 0;
        studentsArr.forEach(s => {
          if (!s.semesters || !s.semesters[semK]) return;
          const semSubjects = Object.values(s.semesters[semK] || {});
          const semList = Object.keys(s.semesters || {});
          const currentSemIdx = semList.indexOf(semK);
          const currentSubjectNames = semSubjects.map(subj => subj.subject_name);
          let previousAttempts = [];
          for (let i = 0; i < currentSemIdx; ++i) {
            const prevSem = semList[i];
            Object.values(s.semesters[prevSem] || {}).forEach(subj => {
              const isFail = subj.result && (subj.result.trim().toUpperCase() === 'F' || subj.result.trim().toLowerCase().includes('fail'));
              if (currentSubjectNames.includes(subj.subject_name) && isFail) {
                previousAttempts.push(subj.subject_name);
              }
            });
          }
          const mainSubjects = Object.values(s.semesters[semK] || {}).filter(subj => !previousAttempts.includes(subj.subject_name));
          if (mainSubjects.length > 0) {
            const hasFail = mainSubjects.some(subj => {
              const res = (subj.result || '').trim().toLowerCase();
              return res === 'f' || res.includes('fail');
            });
            if (hasFail) fail++; else pass++;
          }
        });
        return { pass, fail };
      };

      // Helper: compute subject-wise pass/fail for a set of students
      const computeSubjectWise = (studentsArr, semK) => {
        const subjectCount = {};
        const subjectShortMap = {};
        const subjectCodeMap = {};
        const filtered = studentsArr.filter(s => s.semesters && s.semesters[semK]);
        filtered.forEach(s => {
          const semSubjects = Object.values(s.semesters?.[semK] || {});
          const semList = Object.keys(s.semesters || {});
          const currentSemIdx = semList.indexOf(semK);
          let previousAttempts = [];
          for (let i = 0; i < currentSemIdx; ++i) {
            const prevSem = semList[i];
            Object.values(s.semesters[prevSem] || {}).forEach(subj => {
              const isFail = subj.result && (subj.result.trim().toUpperCase() === 'F' || subj.result.trim().toLowerCase().includes('fail'));
              if (semSubjects.some(sj => sj.subject_name === subj.subject_name) && isFail) {
                previousAttempts.push(subj.subject_name);
              }
            });
          }
          Object.entries(s.semesters?.[semK] || {}).forEach(([code, subj]) => {
            if (!previousAttempts.includes(subj.subject_name)) {
              subjectCount[subj.subject_name] = (subjectCount[subj.subject_name] || 0) + 1;
              if (subj.subject_name && !subjectCodeMap[subj.subject_name]) subjectCodeMap[subj.subject_name] = code;
              if (subj.subject_name && !subjectShortMap[subj.subject_name]) {
                subjectShortMap[subj.subject_name] = subj.subject_code || subj.subject_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 6);
              }
            }
          });
        });
        const minCount = Math.max(2, Math.floor(filtered.length * 0.2));
        const subjectNames = Object.keys(subjectCount).filter(name => subjectCount[name] >= minCount);
        const subjectPassFail = subjectNames.map(name => {
          let pass = 0, fail = 0;
          filtered.forEach(s => {
            const mainSubj = Object.values(s.semesters[semK] || {}).find(subj => subj.subject_name === name);
            if (mainSubj) {
              const res = (mainSubj.result || '').trim().toLowerCase();
              if (res === 'f' || res.includes('fail')) fail++; else if (res) pass++;
            }
          });
          return { name, pass, fail };
        });
        return { subjectNames, subjectPassFail, subjectShortMap, subjectCodeMap };
      };

      let isFirstPage = true;

      // ===== Per-branch charts =====
      for (const branchName of allBranches) {
        const branchStudents = baseFiltered.filter(s => s.branch === branchName);
        const branchFiltered = branchStudents.filter(s => s.semesters && s.semesters[semKey]);
        if (branchFiltered.length === 0) continue;

        const headerText = `${collegeName} | Sem ${semKey} | ${branchName} | Batch: ${batch || 'All'}`;

        // --- Pie Chart ---
        if (selections.pie) {
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;
          const { pass, fail } = computePassFail(branchFiltered, semKey);
          addPageHeader(`Overall Pass/Fail — ${branchName}`, headerText);
          const branchPieData = {
            labels: ['Pass', 'Fail'],
            datasets: [{ data: [pass, fail], backgroundColor: ['#4caf50', '#f44336'] }],
          };
          const pieImg = await renderChartToImage('pie', branchPieData, {
            plugins: { legend: { position: 'bottom', labels: { font: { size: 16 } } } },
          }, 600, 500);
          addChartImage(pieImg, 600, 500);
          pdf.setFontSize(13);
          pdf.setTextColor(33, 33, 33);
          pdf.text(`Pass: ${pass}  |  Fail: ${fail}`, pageW / 2, pageH - 18, { align: 'center' });
          const pctVal = (pass + fail) > 0 ? ((pass / (pass + fail)) * 100).toFixed(2) + '%' : 'N/A';
          pdf.setFontSize(13);
          pdf.setTextColor(56, 142, 60);
          pdf.text(`Pass Percentage: ${pctVal}`, pageW / 2, pageH - 10, { align: 'center' });
        }

        // --- Subject-wise Bar Chart + Table ---
        if (selections.bar) {
          const { subjectNames: sNames, subjectPassFail: sPF, subjectShortMap: sSM, subjectCodeMap: sCM } = computeSubjectWise(branchStudents, semKey);
          if (sNames.length > 0) {
            if (!isFirstPage) pdf.addPage();
            isFirstPage = false;
            addPageHeader(`Subject-wise Pass/Fail — ${branchName}`, headerText);
            const branchBarData = {
              labels: sNames.map(name => sSM[name] || name),
              datasets: [
                { label: 'Pass', data: sPF.map(s => s.pass), backgroundColor: '#4caf50' },
                { label: 'Fail', data: sPF.map(s => s.fail), backgroundColor: '#f44336' },
              ],
            };
            const barImg = await renderChartToImage('bar', branchBarData, {
              plugins: { legend: { position: 'top', labels: { font: { size: 14 } } } },
              scales: {
                x: { stacked: true, ticks: { font: { size: 11 } } },
                y: { stacked: true, beginAtZero: true, ticks: { font: { size: 11 } } },
              },
            }, 900, 500);
            addChartImage(barImg, 900, 500);

            // --- Subject-wise Table ---
            pdf.addPage();
            addPageHeader(`Subject-wise Pass/Fail % — ${branchName}`, headerText);
            const cols = ['Subject Code', 'Subject Name', 'Pass %', 'Fail %', '# Pass', '# Fail'];
            const colWidths = [28, 110, 22, 22, 18, 18];
            const tableW = colWidths.reduce((a, b) => a + b, 0);
            const tableStartX = (pageW - tableW) / 2;
            let tableY = contentTop + 5;
            const rowH = 8;
            const lineH = 4;
            const cellPadTop = 3;
            const cellPadBot = 2;

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

            sPF.forEach((subj, idx) => {
              const name = subj.name;
              const total = subj.pass + subj.fail;
              const pPct = total > 0 ? ((subj.pass / total) * 100).toFixed(1) + '%' : 'N/A';
              const fPct = total > 0 ? ((subj.fail / total) * 100).toFixed(1) + '%' : 'N/A';
              const rowData = [sCM[name] || sSM[name] || '', name, pPct, fPct, String(subj.pass), String(subj.fail)];

              const nameLines = pdf.splitTextToSize(String(name), colWidths[1] - 6);
              const dynamicRowH = Math.max(rowH, cellPadTop + nameLines.length * lineH + cellPadBot);

              if (tableY + dynamicRowH > pageH - 15) {
                pdf.addPage();
                addPageHeader(`Subject-wise Pass/Fail % — ${branchName} (contd.)`, headerText);
                tableY = contentTop + 5;
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

              if (idx % 2 === 0) {
                pdf.setFillColor(245, 247, 250);
                pdf.rect(tableStartX, tableY, tableW, dynamicRowH, 'F');
              }
              pdf.setDrawColor(200, 200, 200);
              pdf.rect(tableStartX, tableY, tableW, dynamicRowH, 'S');

              const singleLineY = tableY + (dynamicRowH + lineH) / 2;
              let rx = tableStartX;
              rowData.forEach((cell, i) => {
                if (i === 2) pdf.setTextColor(56, 142, 60);
                else if (i === 3) pdf.setTextColor(211, 47, 47);
                else if (i === 4) pdf.setTextColor(56, 142, 60);
                else if (i === 5) pdf.setTextColor(211, 47, 47);
                else pdf.setTextColor(33, 33, 33);
                if (i === 1) {
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
        }
      }

      // ===== Department-wise summary chart (all branches combined) =====
      if (selections.dept) {
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        const summaryHeader = `${collegeName} | Sem ${semKey} | All Branches | Batch: ${batch || 'All'}`;
        addPageHeader('Department-wise Result Summary', summaryHeader);

        const branchMap = {};
        let totalAppeared = 0, totalPassed = 0, totalFCD = 0;
        function getShortBranchName(name) {
          if (!name) return 'Unknown';
          const words = name.split(' ');
          if (words.length === 1) return name.slice(0, 3).toUpperCase();
          return words.map(w => w[0].toUpperCase()).join('');
        }
        baseFiltered.forEach(s => {
          if (!s.semesters || !s.semesters[semKey]) return;
          const bName = s.branch || 'Unknown';
          const bShort = getShortBranchName(bName);
          if (!branchMap[bShort]) branchMap[bShort] = { appeared: 0, passed: 0, fcd: 0 };
          branchMap[bShort].appeared++;
          totalAppeared++;
          const semSubjects = Object.values(s.semesters[semKey] || {});
          const hasFail = semSubjects.some(subj => {
            const res = (subj.result || '').trim().toLowerCase();
            return res === 'f' || res.includes('fail');
          });
          if (!hasFail) {
            branchMap[bShort].passed++;
            totalPassed++;
            let totalMarks = 0, maxMarksSum = 0;
            semSubjects.forEach(subj => {
              const marks = Number(subj.total);
              if (!isNaN(marks)) { totalMarks += marks; maxMarksSum += (marks > 100 ? 200 : 100); }
            });
            if (maxMarksSum > 0 && (totalMarks / maxMarksSum) * 100 >= 70) { branchMap[bShort].fcd++; totalFCD++; }
          }
        });
        const bShortNames = Object.keys(branchMap).sort();
        bShortNames.push('Total');
        const appearedArr = bShortNames.map(b => b === 'Total' ? totalAppeared : branchMap[b].appeared);
        const passedArr = bShortNames.map(b => b === 'Total' ? totalPassed : branchMap[b].passed);
        const fcdArr = bShortNames.map(b => b === 'Total' ? totalFCD : branchMap[b].fcd);
        const passingPctArr = bShortNames.map(b => {
          const app = b === 'Total' ? totalAppeared : branchMap[b].appeared;
          const psd = b === 'Total' ? totalPassed : branchMap[b].passed;
          return app > 0 ? Math.round((psd / app) * 100) : 0;
        });
        const deptChartData = {
          labels: bShortNames,
          datasets: [
            { label: 'Appeared', data: appearedArr, backgroundColor: '#1976d2' },
            { label: 'Passed', data: passedArr, backgroundColor: '#d32f2f' },
            { label: 'FCD', data: fcdArr, backgroundColor: '#388e3c' },
            { label: 'Passing%', data: passingPctArr, backgroundColor: '#7c4dff' },
          ],
        };
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
                  const label = dataset.label === 'Passing%' ? `${value}%` : String(value);
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

      // Save
      let collegeLabel = 'all';
      if (college) {
        const cName = Object.entries(college_code_dict).find(([, code]) => code === college);
        if (cName) collegeLabel = cName[0].replace(/[^a-zA-Z0-9]/g, '_');
        else collegeLabel = college;
      }
      pdf.save(`consolidated_charts_sem${semKey}_${collegeLabel}_${batch || 'all'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <Box p={2} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress size={60} thickness={5} sx={{ color: '#1e40af', mb: 3 }} />
        <Typography variant="h6" sx={{ color: '#1e40af', mt: 2 }}>
          Loading students...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Card sx={{ maxWidth: 1200, margin: '32px auto', borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', background: '#ffffff' }}>
        <CardContent>
          <Typography variant="h3" gutterBottom sx={{ color: '#1e40af', fontWeight: 900, letterSpacing: '-2px', mb: 2, textAlign: 'center' }}>
            Admin Corner
          </Typography>
          {/* Admin Stats Feature Button */}
          <Box display="flex" justifyContent="center" gap={2} mb={2}>
            <Button variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: 3 }} onClick={() => setShowStudentStats(true)}>
              Show Excluded Students
            </Button>
            <Button
              variant="contained"
              sx={{ fontWeight: 700, borderRadius: 3, background: '#1e40af' }}
              onClick={() => setShowPdfExportDialog(true)}
              disabled={exportingPdf}
            >
              {exportingPdf ? 'Exporting...' : 'Export All Charts PDF'}
            </Button>
          </Box>
          {/* PDF Export Dialog */}
          <Dialog open={showPdfExportDialog} onClose={() => setShowPdfExportDialog(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Export Consolidated Charts PDF</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>Select chart types to include for every branch:</Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={pdfChartSelections.pie} onChange={e => setPdfChartSelections(prev => ({ ...prev, pie: e.target.checked }))} />
                  Overall Pass/Fail (Pie Chart per Branch)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={pdfChartSelections.bar} onChange={e => setPdfChartSelections(prev => ({ ...prev, bar: e.target.checked }))} />
                  Subject-wise Pass/Fail (Bar Chart + Table per Branch)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={pdfChartSelections.dept} onChange={e => setPdfChartSelections(prev => ({ ...prev, dept: e.target.checked }))} />
                  Department-wise Summary (All Branches Combined)
                </label>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowPdfExportDialog(false)} color="inherit">Cancel</Button>
              <Button
                variant="contained"
                disabled={!pdfChartSelections.pie && !pdfChartSelections.bar && !pdfChartSelections.dept}
                onClick={() => { setShowPdfExportDialog(false); handleExportConsolidatedPDF(pdfChartSelections); }}
                sx={{ background: '#1e40af' }}
              >
                Export PDF
              </Button>
            </DialogActions>
          </Dialog>
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
            <Typography variant="subtitle1" sx={{ color: '#1e40af', fontWeight: 700 }}>
              Students found: {filtered.length}
            </Typography>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
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
                      <div style={{ color: '#94a3b8', fontSize: '1.5rem', marginTop: 8 }}>Try changing your filter or check your database.</div>
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
                          style={{ padding: '4px 12px', borderRadius: 6, background: '#1e40af', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
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
