# Change Log - TeachersCorner.jsx (2026-03-01)

## Summary
This document lists all the changes made to the TeachersCorner.jsx component on March 1, 2026, to improve filtering and export features for college, subject, and department-wise analytics.

---

## 1. Subject-wise Pass/Fail Chart
- **Bug Fix:** The subject-wise pass/fail chart now applies the college filter. Only students from the selected college are included in the statistics.
- **Location:** Subject-wise pass/fail calculation logic (bar chart data).

## 2. Department-wise (Branch-wise) Result Chart
- **Enhancement:** The department-wise (branch-wise) result chart now also applies the college filter. Only students from the selected college are included in the department-wise statistics.
- **Location:** Department-wise chart data (deptChartData React.useMemo).

## 3. Export to Excel
- **Previous Changes (for context):**
  - Exported file now includes the selected college name in the filename.
  - Exported data only includes subjects that each student actually has.
  - Subject reference sheet in the export includes both subject code and name.

---

## Summary Table
| Feature/Area                | Change Type | Description                                      |
|----------------------------|-------------|--------------------------------------------------|
| Subject-wise Pass/Fail     | Bug Fix     | College filter now applied                       |
| Department-wise Result     | Enhancement | College filter now applied                       |
| Export to Excel            | Enhancement | College name in filename, subject code in export |

---

**Date:** 2026-03-01
**File:** src/components/TeachersCorner.jsx
