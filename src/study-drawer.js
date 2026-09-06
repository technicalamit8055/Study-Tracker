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
    { key: 'r1', labelKey: 'sd.rev1', whenKey: 'sd.after24h', days: 1 },
    { key: 'r2', labelKey: 'sd.rev2', whenKey: 'sd.after7d', days: 7 },
    { key: 'r3', labelKey: 'sd.rev3', whenKey: 'sd.after30d', days: 30 }
  ];

  var STATUS_VALUES = ['not_started', 'in_progress', 'notes_done', 'mcqs_done', 'mastered'];

  function esc(s) { return Roadmap.esc(s); }

  function fmtDate(iso) {
    return I18n.formatDate(iso);
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
      var tier = TIERS[i];
      if (!tiers[tier.key]) {
        if (i === 0) {
          return State.isTopicComplete(st)
            ? { key: tier.key, due: true, msg: I18n.t('sd.firstRevNow') }
            : { key: tier.key, due: false, msg: I18n.t('sd.completeFirst') };
        }
        var prev = tiers[TIERS[i - 1].key];
        var gap = daysSince(prev);
        var need = tier.days - TIERS[i - 1].days;
        if (gap !== null && gap >= need) {
          return { key: tier.key, due: true, msg: I18n.t('sd.revDueNow', { label: I18n.t(tier.labelKey) }) };
        }
        return { key: tier.key, due: false, msg: I18n.t('sd.revDaysLeft', { label: I18n.t(tier.labelKey), n: Math.max(0, need - (gap || 0)) }) };
      }
    }
    return { key: null, due: false, msg: I18n.t('sd.allRevsDone') };
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

    var tiersHtml = TIERS.map(function (tier) {
      var doneAt = tiers[tier.key];
      var isDue = due.key === tier.key && due.due;
      var when = I18n.t(tier.whenKey);
      return '' +
        '<button class="rev-tier ' + (doneAt ? 'done' : '') + ' ' + (isDue ? 'due' : '') + '" ' +
        'onclick="StudyDrawer.toggleTier(\'' + tier.key + '\')" ' +
        'title="' + esc(doneAt ? I18n.t('sd.doneOn', { date: fmtDate(doneAt) }) : when) + '">' +
        '<span class="rev-tier-check">' + (doneAt ? '✓' : '○') + '</span>' +
        '<span class="rev-tier-label">' + esc(I18n.t(tier.labelKey)) + '</span>' +
        '<span class="rev-tier-when">' + esc(doneAt ? fmtDate(doneAt) : when) + '</span>' +
        '</button>';
    }).join('');

    var starsHtml = [1, 2, 3, 4, 5].map(function (n) {
      return '<button class="star-btn ' + (n <= (st.stars || 0) ? 'active' : '') + '" ' +
        'onclick="StudyDrawer.setStars(' + n + ')" aria-label="' + esc(I18n.t('sd.starAria', { n: n })) + '">★</button>';
    }).join('');

    var statusHtml = STATUS_VALUES.map(function (v) {
      return '<option value="' + v + '"' + (st.status === v ? ' selected' : '') + '>' +
        esc(I18n.t('sd.status.' + v)) + '</option>';
    }).join('');

    body.innerHTML = '' +
      '<div class="sd-breadcrumb">' + esc(unit.unitNum) + ' • ' + esc(unit.sectionName) + '</div>' +
      '<h3 class="sd-topic-title">' + esc(topic.text) + '</h3>' +
      '<div class="sd-unit-line">' + esc(unit.title) + ' · <strong>🎯 ' + esc(unit.estMarks) + '</strong></div>' +

      (unit.pyqFocus ? '<div class="sd-pyq">💡 <strong>' + esc(I18n.t('sd.pyqFocus')) + ':</strong> ' + esc(unit.pyqFocus) + '</div>' : '') +

      '<div class="sd-section">' +
      '<label class="sd-label">' + esc(I18n.t('sd.status')) + '</label>' +
      '<select class="sd-select" onchange="StudyDrawer.setStatus(this.value)">' + statusHtml + '</select>' +
      '<label class="sd-check-row">' +
      '<input type="checkbox" ' + (State.isTopicComplete(st) ? 'checked' : '') + ' onchange="StudyDrawer.setComplete(this.checked)">' +
      '<span>' + esc(I18n.t('sd.markComplete')) + '</span>' +
      '</label>' +
      '</div>' +

      '<div class="sd-section">' +
      '<label class="sd-label">' + esc(I18n.t('sd.spacedRep')) + '</label>' +
      '<div class="rev-tier-grid">' + tiersHtml + '</div>' +
      '<div class="rev-due-msg ' + (due.due ? 'due' : '') + '">' + esc(due.msg) + '</div>' +
      '</div>' +

      '<div class="sd-section">' +
      '<label class="sd-label">' + esc(I18n.t('sd.confidenceRating')) + '</label>' +
      '<div class="confidence-stars sd-stars">' + starsHtml +
      (st.stars ? '<button class="star-clear" onclick="StudyDrawer.setStars(0)" title="' + esc(I18n.t('sd.clearRating')) + '">✕</button>' : '') +
      '</div>' +
      '</div>' +

      '<div class="sd-section">' +
      '<label class="sd-check-row">' +
      '<input type="checkbox" ' + (st.pyqDone ? 'checked' : '') + ' onchange="StudyDrawer.setPyq(this.checked)">' +
      '<span>' + esc(I18n.t('sd.pyqDone')) + '</span>' +
      '</label>' +
      '</div>' +

      '<div class="sd-section">' +
      '<label class="sd-label">' + esc(I18n.t('sd.notes')) + '</label>' +
      '<textarea class="sd-notes" id="sdNotes" placeholder="' + esc(I18n.t('sd.notesPh')) + '" ' +
      'oninput="StudyDrawer.setNotes(this.value)">' + esc(st.notes || '') + '</textarea>' +
      '<div class="sd-notes-hint" id="sdNotesHint">' + esc(I18n.t('sd.notesAuto')) + '</div>' +
      '</div>' +

      '<div class="sd-actions">' +
      '<a class="sd-yt-btn" target="_blank" rel="noopener noreferrer" href="' + Roadmap.youtubeUrl(unit, topic.text) + '">' +
      '<svg class="yt-icon" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' +
      esc(I18n.t('sd.ytSearch')) +
      '</a>' +
      '<button class="sd-timer-btn" onclick="StudyDrawer.startFocus()">' + esc(I18n.t('sd.focusTimer')) + '</button>' +
      '</div>';
  };

  /* ---------------- mutations ---------------- */

  function withTopic(fn) {
    var id = StudyDrawer.currentTopicId;
    if (!id) return;
    if (!State.authToken) { State.emit('auth:required'); return; }
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
    if (global.showToast) showToast(I18n.t('sd.revUpdated'), 'info');
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
    if (!State.authToken) {
      // Never destroy what was just typed — whether this is a guest who was
      // never signed in, or a session that expired mid-note, the textarea
      // keeps showing their text; only persistence is blocked.
      State.emit('auth:required');
      return;
    }
    State.getTopicState(id).notes = text;
    var hint = document.getElementById('sdNotesHint');
    if (hint) hint.innerText = I18n.t('sd.notesSaving');
    if (notesTimer) clearTimeout(notesTimer);
    notesTimer = setTimeout(function () {
      State.saveProgress();
      Roadmap.refreshTopicRow(id);
      if (hint) hint.innerText = I18n.t('sd.notesSaved');
    }, 500);
  };

  StudyDrawer.startFocus = function () {
    if (!State.authToken) { State.emit('auth:required'); return; }
    var found = State.findTopic(StudyDrawer.currentTopicId);
    if (found && global.Timer) {
      Timer.setFocusTopic(found.topic.text);
      Timer.start();
      if (global.showToast) showToast(I18n.t('timer.focusStarted', { topic: found.topic.text }), 'success');
    }
    StudyDrawer.close();
  };

  global.StudyDrawer = StudyDrawer;
})(window);
