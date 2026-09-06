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
    timerPrefix: 'examroadmap_timer_',
    userProfile: 'examroadmap_user_profile',
    appLang: 'examroadmap_app_lang',
    onboardingDone: 'examroadmap_onboarding_done'
  };

  var State = {
    KEYS: KEYS,
    LEGACY_EXAM_ID: LEGACY_EXAM_ID,

    catalog: null,        // { categories, exams }
    exam: null,           // full roadmap of the active exam
    activeExamId: null,
    userState: {},        // progress for the ACTIVE exam only
    profile: null,        // onboarding profile: goal, medium, schedule

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

    // Guests never get progress restored from localStorage: exploring the
    // syllabus should always start from a clean, unmarked preview.
    if (!State.authToken) {
      State.userState = {};
      return State.userState;
    }

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

  /**
   * Persist the active exam's progress. Guests are stopped here rather than
   * upstream so every call site — checkbox, drawer, notes — gets the same
   * "sign in to save" gate for free instead of re-checking auth itself.
   */
  State.saveProgress = function (skipCloud) {
    if (!State.authToken) {
      State.emit('auth:required');
      return false;
    }
    safeSet(State.progressKey(), JSON.stringify(State.userState));
    State.emit('progress:changed');
    if (!skipCloud) State.queueCloudSync();
    return true;
  };

  /* ---------------- active exam ---------------- */

  State.getSavedActiveExamId = function () {
    // An explicit switch wins; otherwise honour the exam chosen during onboarding.
    var explicit = safeGet(KEYS.activeExam);
    if (explicit) return explicit;
    var p = State.profile || State.loadProfile();
    if (p && p.targetExamId) return p.targetExamId;
    return LEGACY_EXAM_ID;
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
   * Check for live roadmap changes on the server and hot-update without losing progress.
   */
  State.checkForRoadmapUpdate = async function (examId) {
    var id = examId || State.activeExamId;
    if (!id || !State.exam) return false;

    try {
      var res = await fetch('/api/exams?examId=' + encodeURIComponent(id) + '&_t=' + Date.now(), {
        cache: 'no-cache'
      });
      if (!res.ok) return false;
      var data = await res.json();
      var freshExam = data && data.exam;
      if (!freshExam || freshExam.id !== id) return false;

      var currentStr = JSON.stringify(State.exam);
      var freshStr = JSON.stringify(freshExam);

      if (currentStr !== freshStr) {
        console.log('[state] Roadmap update detected for ' + id + ', hot-updating UI...');
        State.exam = freshExam;
        State.emit('exam:updated', freshExam);
        State.emit('exam:changed', freshExam);
        return true;
      }
    } catch (e) {
      // Offline or network error - continue silently with existing state
    }
    return false;
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

    // Non-blocking background re-validation to catch updates made while cached
    setTimeout(function () {
      State.checkForRoadmapUpdate(examId);
    }, 1500);

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

  /* ---------------- user profile (onboarding) ---------------- */

  var MEDIUMS = ['en', 'hi', 'bilingual'];

  State.blankProfile = function () {
    return {
      name: '',
      appLanguage: (global.I18n && I18n.DEFAULT_LANG) || 'en',
      targetExamId: null,
      examMedium: 'en',
      targetDate: null,
      dailyHours: 4,
      dailyPomodoros: 4,
      prepLevel: 'beginner',
      targetScore: null,
      onboardingDone: false,
      createdAt: null,
      updatedAt: null
    };
  };

  /**
   * Read the saved profile, backfilling any field added after it was written
   * so an older profile never renders the goal banner with undefined values.
   */
  State.loadProfile = function () {
    var raw = safeGet(KEYS.userProfile);
    var p;
    try {
      p = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Could not parse saved profile:', e);
      p = null;
    }
    if (!p || typeof p !== 'object') {
      State.profile = null;
      return null;
    }

    var base = State.blankProfile();
    Object.keys(base).forEach(function (k) {
      if (p[k] === undefined) p[k] = base[k];
    });
    if (MEDIUMS.indexOf(p.examMedium) === -1) p.examMedium = 'en';
    if (typeof p.dailyHours !== 'number' || p.dailyHours <= 0) p.dailyHours = base.dailyHours;
    if (typeof p.dailyPomodoros !== 'number' || p.dailyPomodoros <= 0) p.dailyPomodoros = base.dailyPomodoros;

    State.profile = p;
    return p;
  };

  State.saveProfile = function (patch) {
    var p = State.profile || State.loadProfile() || State.blankProfile();
    if (patch) Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
    if (!p.createdAt) p.createdAt = new Date().toISOString();
    p.updatedAt = new Date().toISOString();

    State.profile = p;
    safeSet(KEYS.userProfile, JSON.stringify(p));
    if (p.onboardingDone) safeSet(KEYS.onboardingDone, '1');
    State.emit('profile:changed', p);
    return p;
  };

  State.hasOnboarded = function () {
    if (safeGet(KEYS.onboardingDone) === '1') return true;
    var p = State.profile || State.loadProfile();
    return !!(p && p.onboardingDone);
  };

  State.getProfile = function () {
    return State.profile || State.loadProfile();
  };

  /** Whole days from today until the target exam date; null when unset. */
  State.daysUntilExam = function () {
    var p = State.getProfile();
    if (!p || !p.targetDate) return null;
    var target = new Date(p.targetDate + 'T00:00:00');
    if (isNaN(target.getTime())) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  };

  /**
   * Derived study plan used by the strategy preview and the goal banner.
   * Phase split follows 80/20: a shorter runway pushes more of the time into
   * the high-yield phase rather than pretending full coverage is possible.
   */
  State.studyPlan = function (exam) {
    var p = State.getProfile() || State.blankProfile();
    var ex = exam || State.exam;
    var days = State.daysUntilExam();
    if (days == null || days < 1) days = 90;

    var hours = p.dailyHours || 4;
    var totalHours = days * hours;
    var totalTopics = 0;
    if (ex && ex.phases) {
      ex.phases.forEach(function (ph) {
        ph.units.forEach(function (u) { totalTopics += (u.topics || []).length; });
      });
    }

    var weeks = Math.max(1, Math.round(days / 7));
    var tight = days < 45;
    var split = tight ? [0.25, 0.55, 0.20] : [0.35, 0.40, 0.25];

    return {
      days: days,
      dailyHours: hours,
      totalHours: totalHours,
      totalTopics: totalTopics,
      topicsPerWeek: totalTopics ? Math.max(1, Math.ceil(totalTopics / weeks)) : 0,
      dailyPomodoros: p.dailyPomodoros || 4,
      focusMinutes: (p.dailyPomodoros || 4) * 25,
      tight: tight,
      phaseDays: [
        Math.max(1, Math.round(days * split[0])),
        Math.max(1, Math.round(days * split[1])),
        Math.max(1, Math.round(days * split[2]))
      ]
    };
  };

  /* ---------------- cloud sync ---------------- */

  /**
   * Read the cached identity so the header renders signed-in immediately on
   * reload. Supabase then confirms (or revokes) it via onAuthStateChange —
   * this cache exists only to avoid a "Local mode" flash on every load.
   */
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
    safeSet(KEYS.authToken, token || '');
    safeSet(KEYS.userInfo, JSON.stringify(user || null));
    State.emit('auth:changed');
  };

  /**
   * Drop the cached identity. `purge` defaults to true (an explicit sign-out
   * should always scrub the shared device); pass false for defensive paths
   * where the SDK is merely unavailable/offline and the session may still be
   * valid once connectivity returns — there, wiping local progress would
   * destroy edits that were never confirmed to reach the cloud.
   */
  State.clearAuth = function (purge) {
    State.authToken = null;
    State.currentUser = null;
    try {
      localStorage.removeItem(KEYS.authToken);
      localStorage.removeItem(KEYS.userInfo);
    } catch (e) { }
    if (purge !== false) {
      State.purgeLocalProgress();
      State.userState = {};
    }
    State.emit('auth:changed');
  };

  /**
   * Wipe every cached exam's progress from localStorage. Run on sign-out so a
   * shared device never leaks one student's marks into the next guest preview.
   */
  State.purgeLocalProgress = function () {
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(KEYS.progressPrefix) === 0) toRemove.push(key);
      }
      toRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { }
  };

  /* ---------------- Supabase session binding ---------------- */

  /**
   * Hand session management to Supabase.
   *
   * The listener is the single source of truth for who is signed in: it fires
   * once on load with the restored session, again after an OAuth redirect, and
   * on every silent token refresh — so `State.authToken` is always a live
   * access token rather than something we have to renew ourselves.
   */
  State.initSupabaseAuth = function () {
    var SB = global.SupabaseAuth;
    if (!SB || !SB.isReady()) {
      // Unconfigured or offline: drop any stale cached identity so the UI
      // honestly reports signed-out instead of pretending to be synced, but
      // never touch local progress here — the session may simply be
      // unreachable right now, not actually over.
      if (State.authToken) State.clearAuth(false);
      State.emit('auth:changed');
      return false;
    }

    State._unsubscribeAuth = SB.onAuthStateChange(function (event, session, user) {
      if (event === 'SIGNED_OUT' || !session) {
        var wasSignedIn = !!State.authToken;
        State.clearAuth();
        if (wasSignedIn && event === 'SIGNED_OUT') State.emit('auth:signedOut');
        return;
      }

      var isNewLogin = State.currentUser === null ||
        !State.currentUser ||
        State.currentUser.id !== (user && user.id);

      State.setAuth(session.access_token, user);

      // A fresh login (or a returning OAuth redirect) should pull whatever the
      // student did on their other devices. A token refresh should not.
      if (event === 'SIGNED_IN' || isNewLogin) {
        // The guest preview ran with an empty userState (nothing was ever
        // persisted); now that we have a token, load this user's local cache
        // for this exam before reconciling it against the cloud.
        if (State.activeExamId) {
          State.loadProgress(State.activeExamId);
          State.emit('progress:replaced');
          State.fetchCloudProgress(State.activeExamId);
        }
        State.emit('auth:signedIn', user);
      }
    });

    return true;
  };

  /** Name of the progress table, defaulting if the config module is absent. */
  function progressTable() {
    return (global.SupabaseConfig && global.SupabaseConfig.progressTable) || 'user_progress';
  }

  /** Whether cloud sync can actually be used right now. */
  State.cloudReady = function () {
    return !!(global.SupabaseAuth && global.SupabaseAuth.isReady());
  };

  State.queueCloudSync = function () {
    if (!State.authToken || !State.cloudReady()) { State.emit('sync:changed'); return; }
    State.isSyncing = true;
    State.emit('sync:changed');
    if (State._syncTimer) clearTimeout(State._syncTimer);
    State._syncTimer = setTimeout(function () {
      State.pushCloudProgress(false);
    }, 1500);
  };

  /**
   * Upsert this exam's progress straight into Supabase.
   *
   * RLS on `user_progress` scopes the write to the signed-in user, so the
   * browser can own this round-trip with no API layer in between. The unique
   * (user_id, exam_id) constraint makes the upsert idempotent.
   */
  State.pushCloudProgress = async function (showToast) {
    if (!State.authToken || !State.activeExamId) return;

    var SB = global.SupabaseAuth;
    var sb = SB && SB.raw();
    if (!sb) return;

    var userId = State.currentUser && State.currentUser.id;
    if (!userId) return;

    State.isSyncing = true;
    State.emit('sync:changed');

    var examId = State.activeExamId;
    var now = new Date().toISOString();

    try {
      var result = await sb
        .from(progressTable())
        .upsert({
          user_id: userId,
          exam_id: examId,
          user_state: State.userState,
          stats: State.summaryForCloud(),
          timer: State.timerSnapshot ? State.timerSnapshot() : {},
          last_updated: now
        }, { onConflict: 'user_id,exam_id' })
        .select('last_updated')
        .single();

      if (result.error) {
        // A revoked or expired session is the one failure worth surfacing:
        // everything else is transient and the next edit will retry.
        if (isAuthError(result.error)) {
          State.clearAuth();
          State.emit('sync:expired');
          return;
        }
        throw new Error(result.error.message || 'sync failed');
      }

      State.lastSyncedAt = (result.data && result.data.last_updated) || now;
      if (showToast) State.emit('sync:success');
    } catch (err) {
      console.warn('Background sync warning:', err.message);
      if (showToast) State.emit('sync:failed', err.message);
    } finally {
      State.isSyncing = false;
      State.emit('sync:changed');
    }
  };

  /** Postgrest/GoTrue signals an invalid JWT by code or by message. */
  function isAuthError(error) {
    if (!error) return false;
    var code = String(error.code || '');
    var msg = String(error.message || '').toLowerCase();
    return code === '401' || code === 'PGRST301' || code === '42501' ||
      msg.indexOf('jwt') !== -1 || msg.indexOf('token') !== -1 ||
      msg.indexOf('not authorized') !== -1;
  }

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

    var SB = global.SupabaseAuth;
    var sb = SB && SB.raw();
    if (!sb) return;

    var userId = State.currentUser && State.currentUser.id;
    if (!userId) return;

    var id = examId || State.activeExamId;
    State.isSyncing = true;
    State.emit('sync:changed');

    try {
      // maybeSingle() returns null rather than erroring on a first-ever login,
      // when this user has no row for this exam yet.
      var result = await sb
        .from(progressTable())
        .select('user_state, timer, last_updated')
        .eq('user_id', userId)
        .eq('exam_id', id)
        .maybeSingle();

      if (result.error) {
        if (isAuthError(result.error)) { State.clearAuth(); return; }
        throw new Error(result.error.message || 'fetch failed');
      }
      if (id !== State.activeExamId) return; // user switched away mid-flight

      var row = result.data;
      var remote = (row && row.user_state) || {};
      if (Object.keys(remote).length > 0) {
        State.userState = State.mergeProgress(State.userState, remote);
        safeSet(State.progressKey(id), JSON.stringify(State.userState));
        State.lastSyncedAt = (row && row.last_updated) || new Date().toISOString();
        if (row && row.timer && State.restoreTimer) State.restoreTimer(row.timer);
        State.emit('progress:replaced');
        State.emit('sync:pulled');
      } else if (Object.keys(State.userState).length > 0) {
        // Nothing in the cloud but work on this device: seed the cloud from it.
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

  /**
   * Confirm the cached identity against Supabase's stored session.
   * Offline, the cached token is kept as-is — being unable to reach the network
   * is not evidence that a session has expired.
   */
  State.verifyAuth = async function () {
    var SB = global.SupabaseAuth;
    if (!SB || !SB.isReady()) return false;

    try {
      var session = await SB.getSession();
      if (!session) {
        if (State.authToken) State.clearAuth();
        return false;
      }
      State.setAuth(session.access_token, SB.shapeUser(session.user));
      return true;
    } catch (e) {
      return false;
    }
  };

  /** Sign out of Supabase and clear every trace of the session locally. */
  State.signOut = async function () {
    var SB = global.SupabaseAuth;
    if (SB && SB.isReady()) {
      try { await SB.signOut(); } catch (e) { }
    }
    State.clearAuth();
  };

  global.State = State;
})(window);
