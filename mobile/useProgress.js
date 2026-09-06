/**
 * ExamRoadmap mobile — progress hook.
 * Mirrors the web client's state manager: local-first writes, background sync.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchExam, loadLocalProgress, saveLocalProgress,
  pushProgress, syncProgress
} from './api';

export function blankTopicState() {
  return {
    status: 'not_started',
    completed: false,
    revisions: 0,
    revisionTiers: {},
    stars: 0,
    notes: '',
    pyqDone: false
  };
}

export function isComplete(s) {
  return !!(s && (s.completed || s.status === 'mastered'));
}

export function revisionCount(s) {
  if (!s) return 0;
  const t = s.revisionTiers || {};
  return Math.max(['r1', 'r2', 'r3'].filter(k => t[k]).length, s.revisions || 0);
}

/**
 * Weighted marks estimate: each section contributes in proportion to how much
 * of it is done, so a 100-mark section outweighs a 20-mark one.
 */
export function computeStats(exam, userState) {
  const empty = {
    totalTopics: 0, completedTopics: 0, inProgressTopics: 0,
    highTotal: 0, highCompleted: 0, totalRevisions: 0,
    estimatedMarks: 0, totalMarks: 0, overallPct: 0, units: {}, phases: {}
  };
  if (!exam) return empty;

  const s = { ...empty, totalMarks: exam.totalMarks, units: {}, phases: {} };
  const sections = {};
  exam.sections.forEach(sec => { sections[sec.id] = { total: 0, done: 0, marks: sec.marks }; });

  exam.phases.forEach(ph => {
    let pTotal = 0, pDone = 0;
    ph.units.forEach(u => {
      let uDone = 0;
      const high = u.priority === 'high';
      u.topics.forEach(t => {
        const st = userState[t.id];
        s.totalTopics++; pTotal++;
        if (high) s.highTotal++;
        if (!sections[u.sectionId]) sections[u.sectionId] = { total: 0, done: 0, marks: u.sectionMarks || 0 };
        sections[u.sectionId].total++;
        s.totalRevisions += revisionCount(st);
        if (isComplete(st)) {
          s.completedTopics++; pDone++; uDone++;
          sections[u.sectionId].done++;
          if (high) s.highCompleted++;
        } else if (st && st.status !== 'not_started') {
          s.inProgressTopics++;
        }
      });
      s.units[u.id] = {
        done: uDone,
        total: u.topics.length,
        pct: u.topics.length ? Math.round((uDone / u.topics.length) * 100) : 0
      };
    });
    s.phases[ph.id] = { done: pDone, total: pTotal, pct: pTotal ? Math.round((pDone / pTotal) * 100) : 0 };
  });

  let marks = 0;
  Object.values(sections).forEach(t => {
    marks += (t.total ? t.done / t.total : 0) * t.marks;
  });
  s.estimatedMarks = Math.round(marks);
  s.overallPct = s.totalTopics ? Math.round((s.completedTopics / s.totalTopics) * 100) : 0;
  return s;
}

export function useProgress(examId) {
  const [exam, setExam] = useState(null);
  const [userState, setUserState] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [ex, local] = await Promise.all([
          fetchExam(examId),
          loadLocalProgress(examId)
        ]);
        if (cancelled) return;
        setExam(ex);
        setUserState(local);
        setLoading(false);

        // Reconcile with the cloud once the UI is already usable.
        setSyncing(true);
        const merged = await syncProgress(examId);
        if (!cancelled) setUserState(merged);
      } catch (e) {
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [examId]);

  const persist = useCallback((next) => {
    setUserState(next);
    saveLocalProgress(examId, next);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      pushProgress(examId, next, computeStats(exam, next)).catch(() => {});
    }, 1500);
  }, [examId, exam]);

  const update = useCallback((topicId, patch) => {
    setUserState(prev => {
      const cur = prev[topicId] || blankTopicState();
      const next = { ...prev, [topicId]: { ...cur, ...patch } };
      saveLocalProgress(examId, next);
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        pushProgress(examId, next, computeStats(exam, next)).catch(() => {});
      }, 1500);
      return next;
    });
  }, [examId, exam]);

  const toggleComplete = useCallback((topicId) => {
    setUserState(prev => {
      const cur = prev[topicId] || blankTopicState();
      const completed = !isComplete(cur);
      const next = {
        ...prev,
        [topicId]: {
          ...cur,
          completed,
          status: completed ? 'mastered' : (cur.status === 'mastered' ? 'in_progress' : cur.status)
        }
      };
      saveLocalProgress(examId, next);
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        pushProgress(examId, next, computeStats(exam, next)).catch(() => {});
      }, 1500);
      return next;
    });
  }, [examId, exam]);

  const toggleTier = useCallback((topicId, tierKey) => {
    setUserState(prev => {
      const cur = prev[topicId] || blankTopicState();
      const tiers = { ...(cur.revisionTiers || {}) };
      if (tiers[tierKey]) delete tiers[tierKey];
      else tiers[tierKey] = new Date().toISOString();
      const next = {
        ...prev,
        [topicId]: {
          ...cur,
          revisionTiers: tiers,
          revisions: ['r1', 'r2', 'r3'].filter(k => tiers[k]).length
        }
      };
      saveLocalProgress(examId, next);
      return next;
    });
  }, [examId]);

  const stats = useMemo(() => computeStats(exam, userState), [exam, userState]);

  return { exam, userState, stats, loading, syncing, update, persist, toggleComplete, toggleTier };
}
