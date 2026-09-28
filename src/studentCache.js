/**
 * StudentCache - IndexedDB-based persistent cache for student data.
 * 
 * Stores: students (normalized), branches, subjects, and metadata (lastSynced).
 * Auto-expires after 30 days. Manual sync via syncNow().
 */

const DB_NAME = 'blde_student_cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getItem(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function setItem(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function removeItem(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- Public API ---

export async function getCachedStudents() {
  try {
    return (await getItem('students')) || null;
  } catch {
    return null;
  }
}

export async function setCachedStudents(data) {
  await setItem('students', data);
  await setItem('lastSynced', Date.now());
}

export async function getCachedBranches() {
  try {
    return (await getItem('branches')) || null;
  } catch {
    return null;
  }
}

export async function setCachedBranches(data) {
  await setItem('branches', data);
}

export async function getCachedSubjects() {
  try {
    return (await getItem('subjects')) || null;
  } catch {
    return null;
  }
}

export async function setCachedSubjects(data) {
  await setItem('subjects', data);
}

export async function getLastSynced() {
  try {
    return (await getItem('lastSynced')) || null;
  } catch {
    return null;
  }
}

export async function isCacheValid() {
  const lastSynced = await getLastSynced();
  if (!lastSynced) return false;
  return (Date.now() - lastSynced) < CACHE_MAX_AGE_MS;
}

export async function clearCache() {
  try {
    await removeItem('students');
    await removeItem('branches');
    await removeItem('subjects');
    await removeItem('lastSynced');
  } catch {
    // Silently fail
  }
}
