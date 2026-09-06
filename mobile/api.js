/**
 * ExamRoadmap mobile — API client.
 * Drop this into an Expo project; it targets the same backend as the web app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3005';

const TOKEN_KEY = 'examroadmap_token';
const USER_KEY = 'examroadmap_user';
const progressKey = examId => `examroadmap_progress_${examId}`;
const roadmapKey = examId => `examroadmap_roadmap_${examId}`;

/* ---------------- token ---------------- */

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  await AsyncStorage.removeItem(USER_KEY).catch(() => {});
}

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed: ${res.status}`);
  return data;
}

/* ---------------- auth ---------------- */

export async function register(name, username, password) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, username, password })
  });
  await setToken(data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function login(username, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  await setToken(data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function me() {
  return request('/api/auth/me');
}

/* ---------------- exams ---------------- */

export async function fetchCatalog() {
  try {
    const data = await request('/api/exams');
    await AsyncStorage.setItem('examroadmap_catalog', JSON.stringify(data));
    return data;
  } catch (e) {
    // Roadmap content is static, so a cached copy is safe to serve offline.
    const cached = await AsyncStorage.getItem('examroadmap_catalog');
    if (cached) return JSON.parse(cached);
    throw e;
  }
}

export async function fetchExam(examId) {
  try {
    const data = await request(`/api/exams?examId=${encodeURIComponent(examId)}`);
    await AsyncStorage.setItem(roadmapKey(examId), JSON.stringify(data.exam));
    return data.exam;
  } catch (e) {
    const cached = await AsyncStorage.getItem(roadmapKey(examId));
    if (cached) return JSON.parse(cached);
    throw e;
  }
}

/* ---------------- progress ---------------- */

export async function loadLocalProgress(examId) {
  const raw = await AsyncStorage.getItem(progressKey(examId));
  return raw ? JSON.parse(raw) : {};
}

export async function saveLocalProgress(examId, userState) {
  await AsyncStorage.setItem(progressKey(examId), JSON.stringify(userState));
}

export async function pushProgress(examId, userState, stats) {
  return request('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ examId, userState, stats })
  });
}

export async function pullProgress(examId) {
  return request(`/api/progress?examId=${encodeURIComponent(examId)}`);
}

export async function pullAllProgress() {
  return request('/api/progress?all=1');
}

/**
 * Same conflict rule as the web client: per topic, the richer record wins and
 * notes are never dropped. Keep this in step with mergeProgress in src/state.js.
 */
export function mergeProgress(local = {}, remote = {}) {
  const score = s => {
    if (!s) return -1;
    const tiers = s.revisionTiers || {};
    const revs = Math.max(['r1', 'r2', 'r3'].filter(k => tiers[k]).length, s.revisions || 0);
    return (s.completed || s.status === 'mastered' ? 100 : 0) +
      revs * 5 + (s.stars || 0) + (s.notes && s.notes.trim() ? 3 : 0) +
      (s.status && s.status !== 'not_started' ? 1 : 0);
  };

  const out = {};
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[id], r = remote[id];
    if (!l) { out[id] = r; continue; }
    if (!r) { out[id] = l; continue; }
    const winner = score(r) > score(l) ? r : l;
    const loser = winner === r ? l : r;
    out[id] = { ...winner };
    if ((!out[id].notes || !out[id].notes.trim()) && loser.notes && loser.notes.trim()) {
      out[id].notes = loser.notes;
    }
  }
  return out;
}

export async function syncProgress(examId) {
  const local = await loadLocalProgress(examId);
  try {
    const remote = await pullProgress(examId);
    const merged = mergeProgress(local, remote.userState || {});
    await saveLocalProgress(examId, merged);
    await pushProgress(examId, merged);
    return merged;
  } catch {
    // Offline: local state stands until the next successful sync.
    return local;
  }
}
