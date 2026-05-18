const DB_NAME = 'calorie_tracker';
const DB_VERSION = 2;
const STORE_ENTRIES = 'food_entries';
const STORE_PANTRY = 'pantry';
const STORE_EXERCISE = 'daily_exercise';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_ENTRIES)) {
        const s = d.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
        s.createIndex('date', 'date', { unique: false });
        s.createIndex('datetime', 'datetime', { unique: false });
      }
      if (!d.objectStoreNames.contains(STORE_PANTRY)) {
        const s = d.createObjectStore(STORE_PANTRY, { keyPath: 'id' });
        s.createIndex('name', 'name', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!d.objectStoreNames.contains(STORE_EXERCISE)) {
        d.createObjectStore(STORE_EXERCISE, { keyPath: 'date' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

// ====== Food Entries ======
async function saveEntry(entry) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_ENTRIES, 'readwrite');
    const req = tx.objectStore(STORE_ENTRIES).put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getEntriesByDate(dateStr) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_ENTRIES, 'readonly');
    const req = tx.objectStore(STORE_ENTRIES).index('date').getAll(dateStr);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getEntriesByDateRange(fromDate, toDate) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_ENTRIES, 'readonly');
    const range = IDBKeyRange.bound(fromDate, toDate);
    const req = tx.objectStore(STORE_ENTRIES).index('date').getAll(range);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteEntry(id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_ENTRIES, 'readwrite');
    const req = tx.objectStore(STORE_ENTRIES).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ====== Pantry ======
async function savePantryItem(item) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_PANTRY, 'readwrite');
    const req = tx.objectStore(STORE_PANTRY).put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getAllPantryItems() {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_PANTRY, 'readonly');
    const req = tx.objectStore(STORE_PANTRY).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    req.onerror = () => reject(req.error);
  });
}

async function deletePantryItem(id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_PANTRY, 'readwrite');
    const req = tx.objectStore(STORE_PANTRY).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function findPantryByName(name) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_PANTRY, 'readonly');
    const req = tx.objectStore(STORE_PANTRY).index('name').getAll(name);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ====== Daily Exercise Calories ======
async function saveExercise(dateStr, kcal) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_EXERCISE, 'readwrite');
    const req = tx.objectStore(STORE_EXERCISE).put({ date: dateStr, exercise_kcal: kcal });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getExercise(dateStr) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_EXERCISE, 'readonly');
    const req = tx.objectStore(STORE_EXERCISE).get(dateStr);
    req.onsuccess = () => resolve(req.result?.exercise_kcal || 0);
    req.onerror = () => reject(req.error);
  });
}

// ====== User Profile (localStorage) ======
const PROFILE_KEY = 'user_profile';

function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : getDefaultProfile();
  } catch {
    return getDefaultProfile();
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function getDefaultProfile() {
  return {
    gender: 'male',
    height_cm: 170,
    weight_kg: 65,
    age: 25,
    goal: 'balanced',
    activity_level: 'moderate',
  };
}
