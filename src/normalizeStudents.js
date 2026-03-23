/**
 * Normalize students data from the new DB structure to the old structure
 * that all components expect.
 *
 * NEW structure:
 *   students/{usn}/semesters = ARRAY [null, {subjectCode: {attempts: {...}}}, ...]
 *   Each attempt: { internal, external, total, result, subject_name, exam_type, result_date, is_revaluation, ... }
 *
 * OLD structure (expected by components):
 *   students/{usn}/semesters = OBJECT { "1": {subjectCode: {internal, external, total, result, subject_name, rv_marks, rv_result, old_marks, old_result, ...}}, ... }
 */
export function normalizeStudents(rawStudents) {
  if (!rawStudents || typeof rawStudents !== 'object') return {};

  const normalized = {};

  for (const [usn, studentData] of Object.entries(rawStudents)) {
    if (!studentData) continue;

    const student = { ...studentData };

    // If semesters is already an object with string keys (old format), pass through
    if (student.semesters && !Array.isArray(student.semesters) && typeof student.semesters === 'object') {
      // Check if it's already in old format (subjects don't have "attempts" key)
      const firstSemKey = Object.keys(student.semesters)[0];
      if (firstSemKey) {
        const firstSem = student.semesters[firstSemKey];
        const firstSubjKey = Object.keys(firstSem || {})[0];
        if (firstSubjKey && firstSem[firstSubjKey] && !firstSem[firstSubjKey].attempts) {
          // Already old format, pass through
          normalized[usn] = student;
          continue;
        }
      }
    }

    // Convert semesters array (or object) to the old format
    if (student.semesters) {
      const newSemesters = {};

      if (Array.isArray(student.semesters)) {
        // Array format: index = semester number, index 0 is null
        student.semesters.forEach((semData, index) => {
          if (!semData || index === 0) return; // skip null / index 0
          const semKey = String(index);
          newSemesters[semKey] = normalizeOneSemester(semData);
        });
      } else if (typeof student.semesters === 'object') {
        // Object format with attempts inside subjects
        for (const [semKey, semData] of Object.entries(student.semesters)) {
          if (!semData) continue;
          newSemesters[semKey] = normalizeOneSemester(semData);
        }
      }

      student.semesters = newSemesters;
    }

    normalized[usn] = student;
  }

  return normalized;
}

/**
 * Normalize one semester's subjects from {subjectCode: {attempts: {...}}} to flat format.
 */
function normalizeOneSemester(semData) {
  const result = {};

  for (const [subjectCode, subjectData] of Object.entries(semData)) {
    if (!subjectData) continue;

    // If there's no "attempts" key, it's already in old format
    if (!subjectData.attempts) {
      result[subjectCode] = subjectData;
      continue;
    }

    const attempts = subjectData.attempts;
    const attemptList = Object.values(attempts);

    if (attemptList.length === 0) continue;

    // Helper to map exam session to a comparable score (Year + Period)
    const getSessionScore = (att) => {
      const year = parseInt(att.exam_year) || (att.result_date ? parseInt(att.result_date.split('-')[0]) : 0);
      let periodWeight = 0;
      const name = (att.exam_name || '').toUpperCase();
      const month = (att.exam_month || '').toUpperCase();
      
      if (name.includes('SUMMER') || name.includes('SPECIAL')) periodWeight = 3;
      else if (month.includes('JUNE') || month.includes('JULY')) periodWeight = 2;
      else if (month.includes('DEC') || month.includes('JAN') || month.includes('FEB')) periodWeight = 1;
      
      return year * 10 + periodWeight;
    };

    // Helper to prioritize results WITHIN the same session
    const getTypePriority = (att) => {
      const isMakeup = att.exam_type === 'makeup' || (att.is_revaluation && (att.exam_name || '').toUpperCase().includes('MAKEUP'));
      if (isMakeup) return att.is_revaluation ? 3 : 2;
      return att.is_revaluation ? 1 : 0;
    };

    // Sort attempts by Session chronologically, then by Type priority
    attemptList.sort((a, b) => {
      const scoreA = getSessionScore(a);
      const scoreB = getSessionScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      
      const pA = getTypePriority(a);
      const pB = getTypePriority(b);
      if (pA !== pB) return pA - pB;
      
      return (a.result_date || '').localeCompare(b.result_date || '');
    });

    // Determine primary and reval attempts based on the sorted list
    const latestAttempt = attemptList[attemptList.length - 1];
    const revalAttempt = [...attemptList].reverse().find(a => a.is_revaluation === true);
    
    // For backward compatibility (SGPA/CGPA etc), still identify specialized types
    const regularAttempt = attemptList.find(a => a.exam_type === 'regular' && !a.is_revaluation);
    const makeupAttempt = attemptList.find(a => a.exam_type === 'makeup' && !a.is_revaluation);
    const primaryAttempt = latestAttempt;

    // Build the flat subject object the old code expects
    const flatSubject = {
      subject_name: primaryAttempt.subject_name || (revalAttempt && revalAttempt.subject_name) || '',
      internal: primaryAttempt.internal,
      external: primaryAttempt.external,
      total: primaryAttempt.total,
      result: primaryAttempt.result,
      result_date: primaryAttempt.result_date || (revalAttempt && revalAttempt.result_date) || '',
    };

    // Always store the REGULAR attempt's result separately
    // (Dashboard's Previous Attempts detection needs the regular exam result to detect failures)
    if (regularAttempt) {
      flatSubject._regular_result = regularAttempt.result;
      flatSubject._regular_external = regularAttempt.external;
      flatSubject._regular_total = regularAttempt.total;
      flatSubject._regular_internal = regularAttempt.internal;
    }

    // If there's a makeup attempt alongside a regular, store makeup info too
    if (makeupAttempt && regularAttempt) {
      flatSubject.makeup_marks = makeupAttempt.external;
      flatSubject.makeup_result = makeupAttempt.result;
      flatSubject.makeup_total = makeupAttempt.total;
    }

    // If there's a revaluation attempt, copy its info
    if (revalAttempt) {
      // Copy reval fields directly from the reval attempt (DB already has them)
      if (revalAttempt.rv_marks !== undefined) flatSubject.rv_marks = revalAttempt.rv_marks;
      if (revalAttempt.rv_result !== undefined) flatSubject.rv_result = revalAttempt.rv_result;
      if (revalAttempt.old_marks !== undefined) flatSubject.old_marks = revalAttempt.old_marks;
      if (revalAttempt.old_result !== undefined) flatSubject.old_result = revalAttempt.old_result;
      if (revalAttempt.final_marks !== undefined) flatSubject.final_marks = revalAttempt.final_marks;
      if (revalAttempt.final_result !== undefined) flatSubject.final_result = revalAttempt.final_result;

      // ONLY treat the whole subject as "in revaluation mode" if the latest attempt IS a revaluation
      if (primaryAttempt.is_revaluation) {
        flatSubject.is_revaluation = true;
        flatSubject.external = revalAttempt.final_marks || revalAttempt.rv_marks || flatSubject.external;
        flatSubject.result = revalAttempt.final_result || revalAttempt.rv_result || flatSubject.result;
        flatSubject.total = String(
          (parseInt(revalAttempt.internal || flatSubject.internal) || 0) +
          (parseInt(revalAttempt.final_marks || revalAttempt.rv_marks || flatSubject.external) || 0)
        );
      }
    }

    // Store all attempts for any component that wants detailed access
    flatSubject._attempts = attemptList;

    result[subjectCode] = flatSubject;
  }

  return result;
}

export default normalizeStudents;
