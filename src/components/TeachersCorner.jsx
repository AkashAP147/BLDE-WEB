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
      (s) =>
        (!college || s.collegeCode === college) &&
        (branch ? s.branch === branch : true) &&
        (batch ? String(s.batch) === String(batch) : true) &&
        s.semesters && s.semesters[semKey]
    );
    // Collect all subject codes, short names, and long names for this sem (for consistent columns and reference)
    const subjectMap = {};
    const backlogSubjectMap = {};
    // Only include subject codes that are present for at least one student in the current sem (and not failed in previous sems)
    let presentSubjectCodes = new Set();
    filtered.forEach(s => {
      const semSubjects = s.semesters[semKey] || {};
      Object.entries(semSubjects).forEach(([code, subj]) => {
        // code is the subject code (e.g., BCS401)
        // Check if this subject is a backlog subject for this student (failed in previous sems)
        let isBacklog = false;
        if (parseInt(semKey) > 1) {
          Object.entries(s.semesters || {}).forEach(([semNum, subjects]) => {
            if (semNum !== semKey && parseInt(semNum) < parseInt(semKey)) {
              Object.entries(subjects || {}).forEach(([codePrev, subjPrev]) => {
                const res = (subjPrev.result || '').trim().toLowerCase();
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
        // ...existing code...
        // (no change to backlogRows logic)
        let failedPrev = [];
        let backlogRow = {
          Name: s.name,
          USN: s.usn,
          Branch: s.branch,
          Batch: s.batch,
          Semester: semKey,
        };
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
      // Only include subjects this student actually has in this semester
      Object.entries(semSubjects).forEach(([code, subj]) => {
        // Always show marks for each subject (including backlog), using latest available attempt
        let latestMarks = '';
        let found = false;
        // Search from highest semester to lowest for latest attempt
        const semKeys = Object.keys(s.semesters || {}).sort((a, b) => parseInt(b) - parseInt(a));
        for (let i = 0; i < semKeys.length; ++i) {
          const semNum = semKeys[i];
          const subjects = s.semesters[semNum] || {};
          const subjFound = subjects[code];
          if (subjFound && subjFound.total !== undefined && subjFound.total !== null && subjFound.total !== "") {
            latestMarks = subjFound.total;
            found = true;
            // Only count towards totalMarks/subjectCount if in current semester
            if (semNum === semKey) {
              totalMarks += Number(subjFound.total);
              subjectCount++;
            }
            break;
          }
        }
        row[code] = found ? latestMarks : 'NA';
      });
      const failedSubjects = Object.entries(semSubjects)
        .filter(([code, subj]) => {
          const res = (subj.result || '').trim().toLowerCase();
          return res === 'f' || res.includes('fail');
        })
        .map(([code, subj]) => code);
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
    // Add reference sheet for subject codes (with subject code column)
    const refRows = [
      ...subjectList.map(code => ({
        Code: code,
        'Subject Code': code,
        'Subject Name': (subjectMap[code] && subjectMap[code].long) ? subjectMap[code].long : '',
        Type: 'Main'
      })),
      ...Object.keys(backlogSubjectMap).map(code => ({
        Code: code,
        'Subject Code': code,
        'Subject Name': (backlogSubjectMap[code] && backlogSubjectMap[code].long) ? backlogSubjectMap[code].long : '',
        Type: 'Backlog'
      })),
    ];
    const wsRef = XLSX.utils.json_to_sheet(refRows);
    XLSX.utils.book_append_sheet(wb, wsRef, "Subject Reference");
    // Download file
    // Add college name or code to the file name
    let collegeLabel = 'all';
    if (college) {
      // Try to get the college name from allColleges, fallback to code
      const found = allColleges.find(c => c.code === college);
      if (found && found.name) {
        // Replace spaces and special chars with underscores for filename safety
        collegeLabel = found.name.replace(/[^a-zA-Z0-9]/g, '_');
      } else {
        collegeLabel = college;
      }
    }
    XLSX.writeFile(wb, `results_sem${semKey}_${collegeLabel}_${branch || 'all'}_${batch || 'all'}.xlsx`);
  };
  const [sem, setSem] = useState(1);
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [college, setCollege] = useState("");
  const [allColleges, setAllColleges] = useState([]);
  const [data, setData] = useState([]);
  const [passFailStats, setPassFailStats] = useState({ pass: 0, fail: 0 });
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);

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

  useEffect(() => {
    // Fetch all students data
    const studentsRef = ref(db, "students");
    onValue(studentsRef, (snapshot) => {
      const val = snapshot.val() || {};
      // Map each student object to include USN from the key if missing, and add collegeCode
      const arr = Object.entries(val).map(([usn, s]) => {
        const collegeCode = usn && usn.length >= 3 ? usn.substring(0, 3).toUpperCase() : "";
        return { usn: s.usn || usn, ...s, collegeCode };
      });
      setData(arr);
      // Extract unique college codes from USN
      const collegeSet = new Set();
      Object.keys(val).forEach(usn => {
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
      // Extract unique batches and branches (sort for dropdown, filtered by college)
      setBatches([...new Set(arr.filter(s => !college || s.collegeCode === college).map((s) => String(s.batch)))].sort());
      setBranches([...new Set(arr.filter(s => !college || s.collegeCode === college).map((s) => s.branch))].sort());
    });
  }, [college]);

  useEffect(() => {
    // Calculate pass/fail for selected sem, branch, batch, college
    const semKey = String(sem);
    const filtered = data.filter(
      (s) =>
        (!college || s.collegeCode === college) &&
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
  }, [sem, branch, batch, college, data]);

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
  let subjectShortMap = {};
  {
    const semKey = String(sem);
    // FIX: Add college filter here
    const filtered = data.filter(
      (s) =>
        (!college || s.collegeCode === college) &&
        (branch ? s.branch === branch : true) &&
        (batch ? String(s.batch) === String(batch) : true) &&
        s.semesters && s.semesters[semKey]
    );
    // Only include subjects that are present in the current semester for the selected branch
    const subjectCount = {};
    filtered.forEach(s => {
      const semSubjects = Object.values(s.semesters?.[semKey] || {});
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
        if (!previousAttempts.includes(subj.subject_name)) {
          subjectCount[subj.subject_name] = (subjectCount[subj.subject_name] || 0) + 1;
          // Build short name map: prefer subject_code, else abbreviation
          if (subj.subject_name && !subjectShortMap[subj.subject_name]) {
            if (subj.subject_code) {
              subjectShortMap[subj.subject_name] = subj.subject_code;
            } else {
              // Abbreviation: first letter of each word, up to 6 chars
              subjectShortMap[subj.subject_name] = subj.subject_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,6);
            }
          }
        }
      });
    });
    const minCount = Math.max(2, Math.floor(filtered.length * 0.2));
    subjectNames = Object.keys(subjectCount).filter(name => subjectCount[name] >= minCount);
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
      labels: subjectNames.map(name => subjectShortMap[name] || name),
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
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar' or 'dept'

  // Department-wise (branch-wise) result chart data
  // Only for current semester, all branches, all batches
  const deptChartData = React.useMemo(() => {
    const semKey = String(sem);
    // Group students by branch, filter by batch and college if selected
    const branchMap = {};
    let totalAppeared = 0, totalPassed = 0, totalFCD = 0;
    // Helper to get short name from branch name
    function getShortBranchName(name) {
      if (!name) return 'Unknown';
      // Use first letters of each word, or first 3 letters if single word
      const words = name.split(' ');
      if (words.length === 1) return name.slice(0, 3).toUpperCase();
      return words.map(w => w[0].toUpperCase()).join('');
    }
    data.forEach(s => {
      if (college && s.collegeCode !== college) return;
      if (batch && String(s.batch) !== String(batch)) return;
      if (!s.semesters || !s.semesters[semKey]) return;
      const branchName = s.branch || 'Unknown';
      const branchShort = getShortBranchName(branchName);
      if (!branchMap[branchShort]) {
        branchMap[branchShort] = { appeared: 0, passed: 0, fcd: 0 };
      }
      branchMap[branchShort].appeared++;
      totalAppeared++;
      // Count pass/fail for this student in this sem (fail if any subject is F/fail)
      const semSubjects = Object.values(s.semesters[semKey] || {});
      const hasFail = semSubjects.some(subj => {
        const res = (subj.result || '').trim().toLowerCase();
        return res === 'f' || res.includes('fail');
      });
      if (!hasFail) {
        branchMap[branchShort].passed++;
        totalPassed++;
        // FCD: overall percentage for this sem >= 70
        let totalMarks = 0;
        let subjectCount = 0;
        semSubjects.forEach(subj => {
          const marks = Number(subj.total);
          if (!isNaN(marks)) {
            totalMarks += marks;
            subjectCount++;
          }
        });
        const percentage = subjectCount > 0 ? (totalMarks / (subjectCount * 100)) * 100 : 0;
        if (percentage >= 70) {
          branchMap[branchShort].fcd++;
          totalFCD++;
        }
      }
    });
    // Prepare chart data arrays
    const branchShortNames = Object.keys(branchMap).sort();
    const appearedArr = branchShortNames.map(b => branchMap[b].appeared);
    const passedArr = branchShortNames.map(b => branchMap[b].passed);
    const fcdArr = branchShortNames.map(b => branchMap[b].fcd);
    const passingPctArr = branchShortNames.map(b => branchMap[b].appeared > 0 ? Math.round((branchMap[b].passed / branchMap[b].appeared) * 100) : 0);
    // Add total column
    branchShortNames.push('Total');
    appearedArr.push(totalAppeared);
    passedArr.push(totalPassed);
    fcdArr.push(totalFCD);
    passingPctArr.push(totalAppeared > 0 ? Math.round((totalPassed / totalAppeared) * 100) : 0);
    return {
      labels: branchShortNames,
      datasets: [
        {
          label: 'Appeared',
          data: appearedArr,
          backgroundColor: '#1976d2', // blue
        },
        {
          label: 'Passed',
          data: passedArr,
          backgroundColor: '#d32f2f', // red
        },
        {
          label: 'FCD',
          data: fcdArr,
          backgroundColor: '#388e3c', // green
        },
        {
          label: 'Passing%',
          data: passingPctArr,
          backgroundColor: '#7c4dff', // purple
        },
      ],
    };
  }, [data, sem, batch, college]);

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 6 }}>
      <Card sx={{ p: 4, borderRadius: 4, boxShadow: 3 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Teachers Corner
        </Typography>
        <Box display="flex" gap={2} mb={3}>
          <FormControl fullWidth>
            <InputLabel>College</InputLabel>
            <Select value={college} label="College" onChange={e => { setCollege(e.target.value); setBatch(""); setBranch(""); }}>
              <MenuItem value="">All</MenuItem>
              {allColleges.map(c => (
                <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
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
          {chartType !== 'dept' && (
            <FormControl fullWidth>
              <InputLabel>Branch</InputLabel>
              <Select value={branch} label="Branch" onChange={(e) => setBranch(e.target.value)}>
                {chartType !== 'bar' && <MenuItem value="">All</MenuItem>}
                {branches.map((b) => (
                  <MenuItem key={b} value={b}>
                    {b}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth>
            <InputLabel>Semester</InputLabel>
            <Select value={sem} label="Semester" onChange={(e) => setSem(Number(e.target.value))}>
              {Array.from(
                new Set(
                  data
                    .filter(s =>
                      (!college || s.collegeCode === college) &&
                      (batch ? String(s.batch) === String(batch) : true) &&
                      (branch ? s.branch === branch : true)
                    )
                    .flatMap(s => Object.keys(s.semesters || {}))
                )
              )
                .map(Number)
                .filter(n => Number.isInteger(n) && n >= 1 && n <= 8)
                .sort((a, b) => a - b)
                .map(n => (
                  <MenuItem key={n} value={n}>
                    Sem {n}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>
        {/* Chart Feature Toggle Buttons + Export Button (scrollable on mobile) */}
        <Box
          display="flex"
          justifyContent={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
          mb={3}
          sx={{
            overflowX: { xs: 'auto', sm: 'visible' },
            WebkitOverflowScrolling: { xs: 'touch', sm: 'auto' },
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            // Hide scrollbar for mobile (optional, for better UX)
            '&::-webkit-scrollbar': { display: { xs: 'none', sm: 'block' } },
            msOverflowStyle: { xs: 'none', sm: 'auto' },
            scrollbarWidth: { xs: 'none', sm: 'auto' },
            // Add a subtle scroll indicator line below on mobile
            borderBottom: { xs: '2px solid #bdbdbd', sm: 'none' },
            boxShadow: { xs: '0 2px 4px -2px #bdbdbd', sm: 'none' },
          }}
        >
          {/* Define a common width for all buttons */}
          {(() => {
            const buttonWidth = 220;
            return <>
              <button
                style={{
                  padding: '8px 24px',
                  borderRadius: 8,
                  border: chartType === 'pie' ? '2px solid #4caf50' : '1px solid #ccc',
                  background: chartType === 'pie' ? '#e8f5e9' : '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: chartType === 'pie' ? '#256029' : '#222',
                  minWidth: buttonWidth,
                  maxWidth: buttonWidth,
                  width: buttonWidth,
                  marginRight: 8,
                  whiteSpace: 'nowrap',
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
                  minWidth: buttonWidth,
                  maxWidth: buttonWidth,
                  width: buttonWidth,
                  marginRight: 8,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setChartType('bar')}
              >
                Subject-wise Pass/Fail
              </button>
              <button
                style={{
                  padding: '8px 24px',
                  borderRadius: 8,
                  border: chartType === 'dept' ? '2px solid #7c4dff' : '1px solid #ccc',
                  background: chartType === 'dept' ? '#ede7f6' : '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: chartType === 'dept' ? '#7c4dff' : '#222',
                  minWidth: buttonWidth,
                  maxWidth: buttonWidth,
                  width: buttonWidth,
                  marginRight: 8,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setChartType('dept')}
              >
                Department-wise Result
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
                  minWidth: buttonWidth,
                  maxWidth: buttonWidth,
                  width: buttonWidth,
                  whiteSpace: 'nowrap',
                }}
              >
                Export to Excel
              </button>
            </>;
          })()}
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
          // --- Loading and network state logic ---
          const [loading, setLoading] = React.useState(false);
          const [networkStatus, setNetworkStatus] = React.useState(navigator.onLine);
          const loadingTimeout = React.useRef(null);

          React.useEffect(() => {
            function handleOnline() { setNetworkStatus(true); }
            function handleOffline() { setNetworkStatus(false); }
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            return () => {
              window.removeEventListener('online', handleOnline);
              window.removeEventListener('offline', handleOffline);
            };
          }, []);

          React.useEffect(() => {
            if (chartType === 'pie') {
              setLoading(true);
              if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
              // If data loads within 2s, loading will be set to false below
              loadingTimeout.current = setTimeout(() => {
                setLoading(false);
              }, 2000); // 2 seconds for slow network
            } else {
              setLoading(false);
              if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
            }
            // eslint-disable-next-line
          }, [chartType, passFailStats.pass, passFailStats.fail]);

          React.useEffect(() => {
            // If data is available, stop loading
            if (chartType === 'pie' && (passFailStats.pass > 0 || passFailStats.fail > 0)) {
              setLoading(false);
              if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
            }
          }, [passFailStats, chartType]);

          // --- End loading/network logic ---
          const semKey = String(sem);
          const included = data.filter(
            (s) => (!college || s.collegeCode === college) && (branch ? s.branch === branch : true) && (batch ? String(s.batch) === String(batch) : true) && s.semesters && s.semesters[semKey]
          );
          const excluded = data.filter(
            (s) => (!college || s.collegeCode === college) && (branch ? s.branch === branch : true) && (batch ? String(s.batch) === String(batch) : true) && (!s.semesters || !s.semesters[semKey])
          );
          const totalStudents = included.length;
          if (chartType === 'pie') {
            return (
              <>
                <Typography align="center" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                  Total Students: {totalStudents}
                </Typography>
                <Box>
                  {!networkStatus ? (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ mt: 4 }}>
                      <div className="loading-spinner" style={{ marginBottom: 12 }}>
                        <svg width="48" height="48" viewBox="0 0 50 50">
                          <circle cx="25" cy="25" r="20" fill="none" stroke="#1976d2" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                          </circle>
                        </svg>
                      </div>
                      <Typography align="center" color="text.secondary">No internet connection. Please check your network.</Typography>
                    </Box>
                  ) : loading ? (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ mt: 4 }}>
                      <div className="loading-spinner" style={{ marginBottom: 12 }}>
                        <svg width="48" height="48" viewBox="0 0 50 50">
                          <circle cx="25" cy="25" r="20" fill="none" stroke="#1976d2" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                          </circle>
                        </svg>
                      </div>
                      <Typography align="center" color="text.secondary">Loading data, please wait...</Typography>
                    </Box>
                  ) : (passFailStats.pass > 0 || passFailStats.fail > 0) ? (
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
              </>
            );
          } else if (chartType === 'dept') {
            // Department-wise result chart (like the image)
            return (
              <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                <Typography align="center" sx={{ fontWeight: 700, color: '#7c4dff', mb: 1, fontSize: 22 }}>
                  Department-wise Result Data
                </Typography>
                <Box
                  sx={{
                    width: { xs: 320, sm: 500 },
                    height: { xs: 220, sm: 400 },
                  }}
                >
                  <Bar
                    data={deptChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            font: {
                              size: 10,
                            },
                            ...((window.innerWidth <= 600) ? { font: { size: 10 } } : {}),
                          },
                        },
                        tooltip: {
                          bodyFont: { size: window.innerWidth <= 600 ? 10 : 12 },
                          titleFont: { size: window.innerWidth <= 600 ? 11 : 14 },
                        },
                      },
                      scales: {
                        x: {
                          stacked: false,
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                            maxRotation: 45,
                            minRotation: 0,
                          },
                        },
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'Count / %' },
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                          },
                        },
                      },
                      barPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                      categoryPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                    }}
                    height={window.innerWidth <= 600 ? 220 : 400}
                    width={window.innerWidth <= 600 ? 320 : 700}
                  />
                </Box>
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Note: "FCD" = First Class with Distinction (all subjects ≥ 70)
                  </Typography>
                </Box>
              </Box>
            );
          } else if (chartType === 'bar') {
            if (!branch) {
              return (
                <Box mt={4} display="flex" flexDirection="column" alignItems="center">
                  <Typography align="center" color="text.secondary" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Please select a branch to view subject-wise pass/fail statistics.
                  </Typography>
                </Box>
              );
            }
            if (subjectNames.length === 0) return null;
            return (
              <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                <Typography align="center" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                  Total Students: {totalStudents}
                </Typography>
                <Typography variant="h6" align="center" mb={2}>
                  Subject-wise Pass/Fail
                </Typography>
                <Box
                  sx={{
                    width: { xs: 320, sm: 500 },
                    height: { xs: 280, sm: 500 },
                  }}
                >
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            font: {
                              size: 10,
                            },
                            // Reduce legend font size on mobile
                            ...((window.innerWidth <= 600) ? { font: { size: 10 } } : {}),
                          },
                        },
                        tooltip: {
                          callbacks: {
                            title: function(context) {
                              const idx = context[0].dataIndex;
                              return subjectNames[idx] || '';
                            }
                          },
                          bodyFont: { size: window.innerWidth <= 600 ? 10 : 12 },
                          titleFont: { size: window.innerWidth <= 600 ? 11 : 14 },
                        },
                      },
                      scales: {
                        x: {
                          stacked: true,
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                            maxRotation: 45,
                            minRotation: 0,
                          },
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          ticks: {
                            font: {
                              size: window.innerWidth <= 600 ? 9 : 12,
                            },
                          },
                        },
                      },
                      barPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                      categoryPercentage: window.innerWidth <= 600 ? 0.6 : 0.7,
                    }}
                    height={window.innerWidth <= 600 ? 280 : 500}
                    width={window.innerWidth <= 600 ? 320 : 500}
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
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}># Pass</th>
                        <th style={{ padding: 8, border: '1px solid #cbd5e1' }}># Fail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {barData.labels.map((shortName, idx) => {
                        const name = subjectNames[idx];
                        const pass = barData.datasets[0].data[idx];
                        const fail = barData.datasets[1].data[idx];
                        const total = pass + fail;
                        const passPct = total > 0 ? ((pass / total) * 100).toFixed(2) : 'N/A';
                        const failPct = total > 0 ? ((fail / total) * 100).toFixed(2) : 'N/A';
                        return (
                          <tr key={shortName} title={name}>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}>{shortName}</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#388e3c', fontWeight: 700 }}>{passPct}%</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#d32f2f', fontWeight: 700 }}>{failPct}%</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#388e3c', fontWeight: 700 }}>{pass}</td>
                            <td style={{ padding: 8, border: '1px solid #cbd5e1', color: '#d32f2f', fontWeight: 700 }}>{fail}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
