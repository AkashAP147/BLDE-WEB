# Changelog for 2026-03-03

## UI/UX Improvements
- About page: 
  - Matched the style and color of the 'Special thanks and courtesy...' line to the 'About the Developer' text.
  - Added extra space above the special thanks line for better separation.
  - Justified all main paragraphs for improved readability.

## Toppers Page
- Added a popup modal for subject-wise results when clicking a topper, with an X icon to close.
- Clicking outside the modal also closes it.
- Added a search filter (by name/USN) after the branch filter.
- Search now filters the table in real-time.
- The rank column now shows the actual rank among all filtered students, not just the search result position.

## TeachersCorner.jsx
- Fixed PDF export: increased the Subject Name column width and added text wrapping to prevent overlap with the Pass % column.

---
Deployed to Firebase after all changes.

---

# Changelog for 2026-03-07

## TeachersCorner.jsx (Excel Export)
- Absent subjects (result `A`) now correctly treated as fail/backlog across all detection conditions (presentSubjectCodes, subjStats, backlogSubjStats, overall stats). Also handles `X` and `NE`.
- Moved "Prev Sem Analysis" sheet to appear just before "Subject Reference" in the exported Excel workbook. New sheet order: Result Analysis → Results → Backlog Subjects → Prev Sem Analysis → Subject Reference.

## Dashboard.jsx
- Previous attempts detection now recognizes `A` (Absent), `X`, and `NE` as fail results, so absent subjects from previous semesters are correctly identified as repeated subjects.
- Fixed failed subject highlight hover: red background no longer turns white/transparent on hover. Uses `!important` to override MUI defaults; hover now shows a faded red (`#f87171`) instead of disappearing.
