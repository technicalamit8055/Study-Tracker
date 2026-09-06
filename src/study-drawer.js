/**
 * ExamRoadmap - Topic Study Drawer
 *
 * Per-topic study panel: status, 3-tier spaced repetition, confidence stars,
 * PYQ checkbox, personal notes and a YouTube lecture launcher.
 */
(function (global) {
  'use strict';

  var StudyDrawer = { currentTopicId: null };

  // Spaced repetition schedule: review at 24 hours, 7 days, then 30 days.
  var TIERS = [
    { key: 'r1', label: 'रिवीजन 1', when: '24 घंटे बाद', days: 1 },
    { key: 'r2', label: 'रिवीजन 2', when: '7 दिन बाद', days: 7 },
    { key: 'r3', label: 'रिवीजन 3', when: '30 दिन बाद', days: 30 }
  ];

  var STATUSES = [
    { v: 'not_started', t: 'शुरू नहीं (Not Started)' },
    { v: 'in_progress', t: 'अध्ययन जारी (Reading)' },
    { v: 'notes_done', t: 'नोट्स तैयार (Notes Done)' },
    { v: 'mcqs_done', t: 'MCQs अभ्यास (MCQs Solved)' },
    { v: 'mastered', t: 'कंठस्थ / पूर्ण (Mastered)' }
  ];

  function esc(s) { return Roadmap.esc(s); }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function daysSince(iso) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  /**
   * The next tier is "due" once enough days have passed since the previous one.
   */
  function dueState(st) {
    var tiers = st.revisionTiers || {};
    for (var i = 0; i < TIERS.length; i++) {
      var t = TIERS[i];
      if (!tiers[t.key]) {
        if (i === 0) {
          return State.isTopicComplete(st)
            ? { key: t.key, due: true, msg: 'पहला रिवीजन अब करें' }
            : { key: t.key, due: false, msg: 'पहले टॉपिक पूरा करें' };
        }
        var prev = tiers[TIERS[i - 1].key];
        var gap = daysSince(prev);
        var need = t.days - TIERS[i - 1].days;
        if (gap !== null && gap >= need) {
          return { key: t.key, due: true, msg: t.label + ' अब देय है' };
        }
        return { key: t.key, due: false, msg: t.label + ' — ' + Math.max(0, need - (gap || 0)) + ' दिन शेष' };
      }
    }
    return { key: null, due: false, msg: '🎉 तीनों रिवीजन पूर्ण!' };
  }

  StudyDrawer.open = function (topicId) {
    var found = State.findTopic(topicId);
    if (!found) return;
    StudyDrawer.currentTopicId = topicId;
    StudyDrawer.render();
    var el = document.getElementById('studyDrawer');
    if (el) {
      el.classList.add('open');
      document.body.classList.add('drawer-open');
    }
  };

  StudyDrawer.close = function () {
    var el = document.getElementById('studyDrawer');
    if (el) el.classList.remove('open');
    document.body.classList.remove('drawer-open');
    StudyDrawer.currentTopicId = null;
  };

  StudyDrawer.render = function () {
    var id = StudyDrawer.currentTopicId;
    if (!id) return;
    var found = State.findTopic(id);
    if (!found) return;

    var unit = found.unit, topic = found.topic;
    var st = State.getTopicState(id);
    var due = dueState(st);
    var tiers = st.revisionTiers || {};

    var body = document.getElementById('studyDrawerBody');
    if (!body) return;

    var tiersHtml = TIERS.map(function (t) {
      var doneAt = tiers[t.key];
      var isDue = due.key === t.key && due.due;
      return '' +
        '<button class="rev-tier ' + (doneAt ? 'done' : '') + ' ' + (isDue ? 'due' : '') + '" ' +
          'onclick="StudyDrawer.toggleTier(\'' + t.key + '\')" ' +
          'title="' + (doneAt ? 'पूर्ण ' + fmtDate(doneAt) + ' — हटाने हेतु क्लिक करें' : t.when) + '">' +
          '<span class="rev-tier-check">' + (doneAt ? '✓' : '○') + '</span>' +
          '<span class="rev-tier-label">' + t.label + '</span>' +
          '<span class="rev-tier-when">' + (doneAt ? fmtDate(doneAt) : t.when) + '</span>' +
        '</button>';
    }).join('');

    var starsHtml = [1, 2, 3, 4, 5].map(function (n) {
      return '<button class="star-btn ' + (n <= (st.stars || 0) ? 'active' : '') + '" ' +
        'onclick="StudyDrawer.setStars(' + n + ')" aria-label="' + n + ' स्टार">★</button>';
    }).join('');

    var statusHtml = STATUSES.map(function (s) {
      return '<option value="' + s.v + '"' + (st.status === s.v ? ' selected' : '') + '>' + s.t + '</option>';
    }).join('');

    body.innerHTML = '' +
      '<div class="sd-breadcrumb">' + esc(unit.unitNum) + ' • ' + esc(unit.sectionName) + '</div>' +
      '<h3 class="sd-topic-title">' + esc(topic.text) + '</h3>' +
      '<div class="sd-unit-line">' + esc(unit.title) + ' · <strong>🎯 ' + esc(unit.estMarks) + '</strong></div>' +

      (unit.pyqFocus ? '<div class="sd-pyq">💡 <strong>PYQ फोकस:</strong> ' + esc(unit.pyqFocus) + '</div>' : '') +

      '<div class="sd-section">' +
        '<label class="sd-label">प्रगति स्थिति (Status)</label>' +
        '<select class="sd-select" onchange="StudyDrawer.setStatus(this.value)">' + statusHtml + '</select>' +
        '<label class="sd-check-row">' +
          '<input type="checkbox" ' + (State.isTopicComplete(st) ? 'checked' : '') + ' onchange="StudyDrawer.setComplete(this.checked)">' +
          '<span>यह टॉपिक पूर्ण है (Mark as completed)</span>' +
        '</label>' +
      '</div>' +

      '<div class="sd-section">' +
        '<label class="sd-label">🔁 स्पेस्ड रिपिटीशन (3-Tier Revision)</label>' +
        '<div class="rev-tier-grid">' + tiersHtml + '</div>' +
        '<div class="rev-due-msg ' + (due.due ? 'due' : '') + '">' + esc(due.msg) + '</div>' +
      '</div>' +

      '<div class="sd-section">' +
        '<label class="sd-label">⭐ कॉन्फिडेंस रेटिंग</label>' +
        '<div class="confidence-stars sd-stars">' + starsHtml +
          (st.stars ? '<button class="star-clear" onclick="StudyDrawer.setStars(0)" title="रेटिंग हटाएं">✕</button>' : '') +
        '</div>' +
      '</div>' +

      '<div class="sd-section">' +
        '<label class="sd-check-row">' +
          '<input type="checkbox" ' + (st.pyqDone ? 'checked' : '') + ' onchange="StudyDrawer.setPyq(this.checked)">' +
          '<span>📝 इस टॉपिक के PYQ हल कर लिए हैं</span>' +
        '</label>' +
      '</div>' +

      '<div class="sd-section">' +
        '<label class="sd-label">🗒 व्यक्तिगत नोट्स</label>' +
        '<textarea class="sd-notes" id="sdNotes" placeholder="महत्वपूर्ण सूत्र, परिभाषाएं, PYQ बिंदु..." ' +
          'oninput="StudyDrawer.setNotes(this.value)">' + esc(st.notes || '') + '</textarea>' +
        '<div class="sd-notes-hint" id="sdNotesHint">स्वतः सहेजा जाता है</div>' +
      '</div>' +

      '<div class="sd-actions">' +
        '<a class="sd-yt-btn" target="_blank" rel="noopener noreferrer" href="' + Roadmap.youtubeUrl(unit, topic.text) + '">' +
          '<svg class="yt-icon" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' +
          'YouTube लेक्चर खोजें' +
        '</a>' +
        '<button class="sd-timer-btn" onclick="StudyDrawer.startFocus()">⏱ इस टॉपिक पर फोकस टाइमर</button>' +
      '</div>';
  };

  /* ---------------- mutations ---------------- */

  function withTopic(fn) {
    var id = StudyDrawer.currentTopicId;
    if (!id) return;
    fn(State.getTopicState(id), id);
    State.saveProgress();
    Roadmap.refreshTopicRow(id);
  }

  StudyDrawer.setStatus = function (value) {
    withTopic(function (st) {
      st.status = value;
      if (value === 'mastered') st.completed = true;
      else if (st.completed && value !== 'mastered') st.completed = false;
    });
    StudyDrawer.render();
  };

  StudyDrawer.setComplete = function (checked) {
    withTopic(function (st) {
      st.completed = checked;
      if (checked) {
        if (st.status === 'not_started') st.status = 'mastered';
      } else if (st.status === 'mastered') {
        st.status = 'in_progress';
      }
    });
    StudyDrawer.render();
  };

  StudyDrawer.toggleTier = function (tierKey) {
    withTopic(function (st) {
      if (!st.revisionTiers) st.revisionTiers = {};
      if (st.revisionTiers[tierKey]) {
        delete st.revisionTiers[tierKey];
      } else {
        st.revisionTiers[tierKey] = new Date().toISOString();
      }
      // Keep the flat counter aligned for older views and cloud stats.
      st.revisions = ['r1', 'r2', 'r3'].filter(function (k) { return !!st.revisionTiers[k]; }).length;
    });
    StudyDrawer.render();
    if (global.showToast) showToast('🔁 रिवीजन अपडेट हुआ', 'info');
  };

  StudyDrawer.setStars = function (n) {
    withTopic(function (st) { st.stars = n; });
    StudyDrawer.render();
  };

  StudyDrawer.setPyq = function (checked) {
    withTopic(function (st) { st.pyqDone = checked; });
    StudyDrawer.render();
  };

  var notesTimer = null;
  StudyDrawer.setNotes = function (text) {
    var id = StudyDrawer.currentTopicId;
    if (!id) return;
    State.getTopicState(id).notes = text;
    var hint = document.getElementById('sdNotesHint');
    if (hint) hint.innerText = 'सहेजा जा रहा है…';
    if (notesTimer) clearTimeout(notesTimer);
    notesTimer = setTimeout(function () {
      State.saveProgress();
      Roadmap.refreshTopicRow(id);
      if (hint) hint.innerText = '✓ सहेजा गया';
    }, 500);
  };

  StudyDrawer.startFocus = function () {
    var found = State.findTopic(StudyDrawer.currentTopicId);
    if (found && global.Timer) {
      Timer.setFocusTopic(found.topic.text);
      Timer.start();
      if (global.showToast) showToast('⏱ फोकस सेशन शुरू: ' + found.topic.text, 'success');
    }
    StudyDrawer.close();
  };

  global.StudyDrawer = StudyDrawer;
})(window);
