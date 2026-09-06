/**
 * ExamRoadmap - Central State Manager
 *
 * Owns the active exam, the per-exam user progress, and cloud sync.
 * Progress is namespaced per exam so switching roadmaps never mixes data:
 *   localStorage["examroadmap_progress_<examId>"] = { [topicId]: TopicState }
 */
(function (global) {
  'use strict';

  var LEGACY_STORAGE_KEYS = [
    'bihar_stet_2026_psychology_tracker_v2',
    'bihar_stet_2026_psychology_tracker_v1'
  ];
  var LEGACY_EXAM_ID = 'bihar-stet-psychology';

  var KEYS = {
    progressPrefix: 'examroadmap_progress_',
    activeExam: 'examroadmap_active_exam',
    authToken: 'stet_auth_token',
    userInfo: 'stet_user_info',
    theme: 'stet_theme',
    timerPrefix: 'examroadmap_timer_'
  };

  var State = {
    KEYS: KEYS,
    LEGACY_EXAM_ID: LEGACY_EXAM_ID,

    catalog: null,        // { categories, exams }
    exam: null,           // full roadmap of the active exam
    activeExamId: null,
    userState: {},        // progress for the ACTIVE exam only

    authToken: null,
    currentUser: null,
    isSyncing: false,
    lastSyncedAt: null,
    _syncTimer: null,
    _listeners: {}
  };

  /* ---------------- events ---------------- */

  State.on = function (evt, fn) {
    (State._listeners[evt] = State._listeners[evt] || []).push(fn);
  };

  State.emit = function (evt, payload) {
    (State._listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('listener error for ' + evt, e); }
    });
  };

  /* ---------------- storage helpers ---------------- */

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  State.progressKey = function (examId) {
    return KEYS.progressPrefix + (examId || State.activeExamId);
  };

  /* ---------------- topic state ---------------- */

  State.blankTopicState = function () {
    return {
      status: 'not_started', // not_started | in_progress | notes_done | mcqs_done | mastered
      completed: false,
      revisions: 0,          // legacy counter, kept in sync with the 3-tier tracker
      revisionTiers: {},     // { r1: ISO date, r2: ..., r3: ... }
      stars: 0,
      notes: '',
      pyqDone: false
    };
  };

  State.getTopicState = function (id) {
    if (!State.userState[id]) {
      State.userState[id] = State.blankTopicState();
    } else {
      // Backfill fields added after a user's data was first written.
      var s = State.userState[id];
      if (!s.revisionTiers) s.revisionTiers = {};
      if (typeof s.pyqDone !== 'boolean') s.pyqDone = false;
      if (typeof s.revisions !== 'number') s.revisions = 0;
      if (typeof s.stars !== 'number') s.stars = 0;
      if (typeof s.notes !== 'string') s.notes = '';
    }
    return State.userState[id];
  };

  /* ---------------- load / save progress ---------------- */

  State.loadProgress = function (examId) {
    var id = examId || State.activeExamId;
    var raw = safeGet(State.progressKey(id));

    // First run on this exam: adopt progress from the old single-exam app.
    if (!raw && id === LEGACY_EXAM_ID) {
      for (var i = 0; i < LEGACY_STORAGE_KEYS.length; i++) {
        var legacy = safeGet(LEGACY_STORAGE_KEYS[i]);
        if (legacy) { raw = legacy; break; }
      }
    }

    try {
      State.userState = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Could not parse saved progress:', e);
      State.userState = {};
    }
    if (!State.userState || typeof State.userState !== 'object') State.userState = {};
    return State.userState;
  };

  State.saveProgress = function (skipCloud) {
    safeSet(State.progressKey(), JSON.stringify(State.userState));
    State.emit('progress:changed');
    if (!skipCloud) State.queueCloudSync();
  };

  /* ---------------- active exam ---------------- */

  State.getSavedActiveExamId = function () {
    return safeGet(KEYS.activeExam) || LEGACY_EXAM_ID;
  };

  State.setActiveExamId = function (examId) {
    State.activeExamId = examId;
    safeSet(KEYS.activeExam, examId);
  };

  /* ---------------- fetching ---------------- */

  State.fetchCatalog = async function () {
    if (State.catalog) return State.catalog;
    try {
      var res = await fetch('/api/exams');
      if (!res.ok) throw new Error('catalog request failed: ' + res.status);
      State.catalog = await res.json();
    } catch (e) {
      // Offline or API unavailable: fall back to the bundled catalog file
      // so the exam switcher still works from the service-worker cache.
      var r2 = await fetch('/data/exams-catalog.json');
      State.catalog = await r2.json();
    }
    return State.catalog;
  };

  State.fetchExam = async function (examId) {
    try {
      var res = await fetch('/api/exams?examId=' + encodeURIComponent(examId));
      if (!res.ok) throw new Error('exam request failed: ' + res.status);
      var data = await res.json();
      return data.exam;
    } catch (e) {
      var entry = null;
      if (State.catalog && State.catalog.exams) {
        entry = State.catalog.exams.find(function (x) { return x.id === examId; });
      }
      var file = (entry && entry.file) || (examId + '.json');
      var r2 = await fetch('/data/exams/' + file);
      if (!r2.ok) throw new Error('Roadmap unavailable offline: ' + examId);
      return await r2.json();
    }
  };

  /**
   * Load an exam roadmap and its progress, and make it active.
   */
  State.activateExam = async function (examId) {
    var exam = await State.fetchExam(examId);
    State.exam = exam;
    State.setActiveExamId(examId);
    State.loadProgress(examId);
    State.emit('exam:changed', exam);

    // Pull this exam's cloud progress in the background if signed in.
    if (State.authToken) {
      State.fetchCloudProgress(examId);
    }
    return exam;
  };

  /* ---------------- derived roadmap helpers ---------------- */

  State.allUnits = function (exam) {
    var ex = exam || State.exam;
    if (!ex) return [];
    var out = [];
    ex.phases.forEach(function (ph) {
      ph.units.forEach(function (u) {
        out.push(u);
      });
    });
    return out;
  };

  State.findUnit = function (unitId) {
    return State.allUnits().find(function (u) { return u.id === unitId; }) || null;
  };

  State.findTopic = function (topicId) {
    var units = State.allUnits();
    for (var i = 0; i < units.length; i++) {
      var t = units[i].topics.find(function (x) { return x.id === topicId; });
      if (t) return { unit: units[i], topic: t };
    }
    return null;
  };

  State.isTopicComplete = function (st) {
    return !!(st.completed || st.status === 'mastered');
  };

  /**
   * Aggregate progress for the active exam.
   * Estimated marks are weighted by each section's mark value, so completing
   * a 100-mark section counts far more than a 20-mark one.
   */
  State.computeStats = function () {
    var ex = State.exam;
    var empty = {
      totalTopics: 0, completedTopics: 0, inProgressTopics: 0,
      highTotal: 0, highCompleted: 0, totalRevisions: 0,
      estimatedMarks: 0, totalMarks: 0, overallPct: 0,
      phases: {}, units: {}, sections: {}
    };
    if (!ex) return empty;

    var s = empty;
    s.totalMarks = ex.totalMarks;

    // Per-section topic tallies drive the weighted marks estimate.
    var sectionTally = {};
    ex.sections.forEach(function (sec) {
      sectionTally[sec.id] = { total: 0, done: 0, marks: sec.marks, name: sec.name };
    });

    ex.phases.forEach(function (ph) {
      var pTotal = 0, pDone = 0;

      ph.units.forEach(function (u) {
        var uTotal = u.topics.length, uDone = 0, uProgress = 0, uRevs = 0, uStars = 0;
        var isHigh = u.priority === 'high';

        u.topics.forEach(function (t) {
          var st = State.getTopicState(t.id);
          s.totalTopics++;
          pTotal++;
          if (isHigh) s.highTotal++;
          if (!sectionTally[u.sectionId]) {
            sectionTally[u.sectionId] = { total: 0, done: 0, marks: u.sectionMarks || 0, name: u.sectionName };
          }
          sectionTally[u.sectionId].total++;

          var revs = State.revisionCount(st);
          uRevs += revs;
          s.totalRevisions += revs;
          uStars += st.stars || 0;

          if (State.isTopicComplete(st)) {
            s.completedTopics++; pDone++; uDone++;
            sectionTally[u.sectionId].done++;
            if (isHigh) s.highCompleted++;
          } else if (st.status !== 'not_started') {
            s.inProgressTopics++; uProgress++;
          }
        });

        s.units[u.id] = {
          total: uTotal,
          done: uDone,
          inProgress: uProgress,
          revisions: uRevs,
          avgStars: uTotal ? (uStars / uTotal) : 0,
          pct: uTotal ? Math.round((uDone / uTotal) * 100) : 0,
          status: uDone === 0 ? 'not_started' : (uDone === uTotal ? 'completed' : 'in_progress')
        };
      });

      s.phases[ph.id] = {
        total: pTotal,
        done: pDone,
        pct: pTotal ? Math.round((pDone / pTotal) * 100) : 0
      };
    });

    var marks = 0;
    Object.keys(sectionTally).forEach(function (secId) {
      var t = sectionTally[secId];
      var ratio = t.total > 0 ? (t.done / t.total) : 0;
      marks += ratio * t.marks;
      s.sections[secId] = {
        total: t.total, done: t.done, marks: t.marks, name: t.name,
        pct: Math.round(ratio * 100)
      };
    });

    s.estimatedMarks = Math.round(marks);
    s.overallPct = s.totalTopics ? Math.round((s.completedTopics / s.totalTopics) * 100) : 0;
    return s;
  };

  State.revisionCount = function (st) {
    if (!st) return 0;
    var tiers = st.revisionTiers || {};
    var n = ['r1', 'r2', 'r3'].filter(function (k) { return !!tiers[k]; }).length;
    // Older data only had the plain counter; trust whichever is larger.
    return Math.max(n, st.revisions || 0);
  };

  /* ---------------- cloud sync ---------------- */

  State.loadAuth = function () {
    State.authToken = safeGet(KEYS.authToken);
    try {
      State.currentUser = JSON.parse(safeGet(KEYS.userInfo) || 'null');
    } catch (e) {
      State.currentUser = null;
    }
  };

  State.setAuth = function (token, user) {
    State.authToken = token;
    State.currentUser = user;
    safeSet(KEYS.authToken, token);
    safeSet(KEYS.userInfo, JSON.stringify(user));
    State.emit('auth:changed');
  };

  State.clearAuth = function () {
    State.authToken = null;
    State.currentUser = null;
    try {
      localStorage.removeItem(KEYS.authToken);
      localStorage.removeItem(KEYS.userInfo);
    } catch (e) {}
    State.emit('auth:changed');
  };

  State.queueCloudSync = function () {
    if (!State.authToken) { State.emit('sync:changed'); return; }
    State.isSyncing = true;
    State.emit('sync:changed');
    if (State._syncTimer) clearTimeout(State._syncTimer);
    State._syncTimer = setTimeout(function () {
      State.pushCloudProgress(false);
    }, 1500);
  };

  State.pushCloudProgress = async function (showToast) {
    if (!State.authToken || !State.activeExamId) return;
    State.isSyncing = true;
    State.emit('sync:changed');

    try {
      var res = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + State.authToken
        },
        body: JSON.stringify({
          examId: State.activeExamId,
          userState: State.userState,
          stats: State.summaryForCloud(),
          timer: State.timerSnapshot ? State.timerSnapshot() : {}
        })
      });

      if (res.status === 401) {
        State.clearAuth();
        State.emit('sync:expired');
        return;
      }

      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'sync failed');

      State.lastSyncedAt = data.lastUpdated || new Date().toISOString();
      if (showToast) State.emit('sync:success');
    } catch (err) {
      console.warn('Background sync warning:', err.message);
      if (showToast) State.emit('sync:failed', err.message);
    } finally {
      State.isSyncing = false;
      State.emit('sync:changed');
    }
  };

  State.summaryForCloud = function () {
    var s = State.computeStats();
    return {
      completedTopics: s.completedTopics,
      totalTopics: s.totalTopics,
      overallPct: s.overallPct,
      estimatedMarks: s.estimatedMarks,
      totalMarks: s.totalMarks
    };
  };

  /**
   * Merge this exam's cloud progress into local state.
   * Per topic the richer record wins, so studying offline on one device
   * does not silently erase work synced from another.
   */
  State.fetchCloudProgress = async function (examId) {
    if (!State.authToken) return;
    var id = examId || State.activeExamId;
    State.isSyncing = true;
    State.emit('sync:changed');

    try {
      var res = await fetch('/api/progress?examId=' + encodeURIComponent(id), {
        headers: { 'Authorization': 'Bearer ' + State.authToken }
      });
      if (res.status === 401) { State.clearAuth(); return; }

      var data = await res.json();
      if (id !== State.activeExamId) return; // user switched away mid-flight

      var remote = (data && data.userState) || {};
      if (Object.keys(remote).length > 0) {
        State.userState = State.mergeProgress(State.userState, remote);
        safeSet(State.progressKey(id), JSON.stringify(State.userState));
        State.lastSyncedAt = data.lastUpdated || new Date().toISOString();
        if (data.timer && State.restoreTimer) State.restoreTimer(data.timer);
        State.emit('progress:replaced');
        State.emit('sync:pulled');
      } else if (Object.keys(State.userState).length > 0) {
        await State.pushCloudProgress(false);
      }
    } catch (err) {
      console.warn('Could not fetch cloud progress:', err.message);
    } finally {
      State.isSyncing = false;
      State.emit('sync:changed');
    }
  };

  function score(st) {
    if (!st) return -1;
    return (State.isTopicComplete(st) ? 100 : 0) +
      State.revisionCount(st) * 5 +
      (st.stars || 0) +
      ((st.notes && st.notes.trim()) ? 3 : 0) +
      (st.status && st.status !== 'not_started' ? 1 : 0);
  }

  State.mergeProgress = function (local, remote) {
    var out = {};
    var ids = {};
    Object.keys(local || {}).forEach(function (k) { ids[k] = true; });
    Object.keys(remote || {}).forEach(function (k) { ids[k] = true; });

    Object.keys(ids).forEach(function (id) {
      var l = local[id], r = remote[id];
      if (!l) { out[id] = r; return; }
      if (!r) { out[id] = l; return; }
      var winner = score(r) > score(l) ? r : l;
      var loser = winner === r ? l : r;
      // Never drop notes that exist on only one side.
      out[id] = Object.assign({}, winner);
      if ((!out[id].notes || !out[id].notes.trim()) && loser.notes && loser.notes.trim()) {
        out[id].notes = loser.notes;
      }
    });
    return out;
  };

  State.verifyAuth = async function () {
    if (!State.authToken) return false;
    try {
      var res = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + State.authToken }
      });
      if (!res.ok) { State.clearAuth(); return false; }
      var data = await res.json();
      State.currentUser = data.user;
      safeSet(KEYS.userInfo, JSON.stringify(data.user));
      State.emit('auth:changed');
      return true;
    } catch (e) {
      // Offline: keep the token, we simply cannot verify right now.
      return false;
    }
  };

  global.State = State;
})(window);
