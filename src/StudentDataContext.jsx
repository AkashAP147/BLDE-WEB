import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from './firebase';
import { ref, get, query, orderByKey, startAt, endAt } from 'firebase/database';
import { normalizeStudents } from './normalizeStudents';
import {
  getCachedStudents, setCachedStudents,
  getCachedBranches, setCachedBranches,
  getCachedSubjects, setCachedSubjects,
  getLastSynced, isCacheValid, clearCache
} from './studentCache';

const StudentDataContext = createContext(null);

/**
 * Provider that loads data from IndexedDB cache first, 
 * falls back to Firebase if cache is empty/expired.
 * Provides syncNow() for manual refresh.
 */
export function StudentDataProvider({ children }) {
  const [students, setStudents] = useState({});
  const [dbBranches, setDbBranches] = useState({});
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncProgress, setSyncProgress] = useState(''); // progress message
  const initialLoadDone = useRef(false);

  // Load from cache or Firebase on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Check cache validity
        const valid = await isCacheValid();

        if (valid) {
          // Load from cache
          setSyncProgress('Loading from cache...');
          const [cachedStudents, cachedBranches, cachedSubjects, lastSync] = await Promise.all([
            getCachedStudents(),
            getCachedBranches(),
            getCachedSubjects(),
            getLastSynced(),
          ]);

          if (!cancelled && cachedStudents) {
            setStudents(cachedStudents);
            setDbBranches(cachedBranches || {});
            setSubjects(cachedSubjects || {});
            setLastSyncedAt(lastSync);
            setLoading(false);
            setSyncProgress('');
            initialLoadDone.current = true;
            return;
          }
        }

        // 2. Cache miss or expired — fetch from Firebase
        if (!cancelled) {
          await fetchFromFirebase(cancelled);
        }
      } catch (err) {
        console.error('StudentDataProvider init error:', err);
        // Fallback: try Firebase directly
        if (!cancelled) {
          await fetchFromFirebase(cancelled);
        }
      }
    }

    async function fetchFromFirebase(cancelled) {
      setSyncProgress('Fetching from database...');
      try {
        // Fetch branches
        setSyncProgress('Syncing branches...');
        const branchesSnap = await get(ref(db, 'settings/branches'));
        const branchesData = branchesSnap.val() || {};
        if (!cancelled) setDbBranches(branchesData);

        // Fetch subjects
        setSyncProgress('Syncing subjects...');
        const subjectsSnap = await get(ref(db, 'subjects'));
        const subjectsData = subjectsSnap.val() || {};
        if (!cancelled) setSubjects(subjectsData);

        // Fetch students in chunks by first letters
        setSyncProgress('Syncing students...');
        const studentsQuery = query(
          ref(db, 'students'),
          orderByKey(),
          startAt('2bl'),
          endAt('2bl\uf8ff')
        );
        const studentsSnap = await get(studentsQuery);
        const rawStudents = studentsSnap.val() || {};
        const normalized = normalizeStudents(rawStudents);

        if (!cancelled) {
          setStudents(normalized);
          setLoading(false);
          setSyncProgress('Saving to cache...');

          // Save everything to IndexedDB
          await Promise.all([
            setCachedStudents(normalized),
            setCachedBranches(branchesData),
            setCachedSubjects(subjectsData),
          ]);

          const now = Date.now();
          setLastSyncedAt(now);
          setSyncProgress('');
          initialLoadDone.current = true;
        }
      } catch (err) {
        console.error('Firebase fetch error:', err);
        if (!cancelled) {
          setLoading(false);
          setSyncProgress('Sync failed. Check your connection.');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Manual sync function (called from Sync button)
  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress('Syncing branches...');

    try {
      // 1. Branches
      const branchesSnap = await get(ref(db, 'settings/branches'));
      const branchesData = branchesSnap.val() || {};
      setDbBranches(branchesData);

      // 2. Subjects
      setSyncProgress('Syncing subjects...');
      const subjectsSnap = await get(ref(db, 'subjects'));
      const subjectsData = subjectsSnap.val() || {};
      setSubjects(subjectsData);

      // 3. Students
      setSyncProgress('Syncing students...');
      const studentsQuery = query(
        ref(db, 'students'),
        orderByKey(),
        startAt('2bl'),
        endAt('2bl\uf8ff')
      );
      const studentsSnap = await get(studentsQuery);
      const rawStudents = studentsSnap.val() || {};
      const normalized = normalizeStudents(rawStudents);
      setStudents(normalized);

      // 4. Save to cache
      setSyncProgress('Saving to cache...');
      await Promise.all([
        setCachedStudents(normalized),
        setCachedBranches(branchesData),
        setCachedSubjects(subjectsData),
      ]);

      const now = Date.now();
      setLastSyncedAt(now);
      setSyncProgress('Sync complete!');

      // Clear progress after 2 seconds
      setTimeout(() => setSyncProgress(''), 2000);
    } catch (err) {
      console.error('Sync error:', err);
      setSyncProgress('Sync failed. Check your connection.');
      setTimeout(() => setSyncProgress(''), 3000);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  // Clear cache and re-fetch
  const clearAndSync = useCallback(async () => {
    await clearCache();
    setStudents({});
    setDbBranches({});
    setSubjects({});
    setLastSyncedAt(null);
    setLoading(true);
    await syncNow();
    setLoading(false);
  }, [syncNow]);

  const value = {
    students,
    dbBranches,
    subjects,
    loading,
    syncing,
    lastSyncedAt,
    syncProgress,
    syncNow,
    clearAndSync,
  };

  return (
    <StudentDataContext.Provider value={value}>
      {children}
    </StudentDataContext.Provider>
  );
}

/**
 * Hook to consume student data from the cache/context.
 */
export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) {
    throw new Error('useStudentData must be used within a StudentDataProvider');
  }
  return ctx;
}
